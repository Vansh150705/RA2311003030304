# Stage 1

## Priority Inbox — Notification System Design

---

## Overview

The Priority Inbox feature surfaces the **top N most important unread notifications** from the campus notification platform. It combines a *type-based weight* with a *recency score* to produce a single composite priority score for each notification, then efficiently extracts the top-N results using a bounded max-heap.

---

## Scoring Model

Each notification is assigned a **composite score**:

```
score = type_weight × 1000 + recency_score
```

### Type Weight

| Type      | Weight |
|-----------|--------|
| Placement | 3      |
| Result    | 2      |
| Event     | 1      |

The multiplier of **1000** ensures that type always dominates recency — a Placement notification will always outrank an Event notification regardless of timestamps — while still allowing recency to break ties within the same type bucket.

### Recency Score

```
recency_score = max(1.0 − age_seconds / RECENCY_WINDOW, 0.0)   ∈ [0, 1]
```

`RECENCY_WINDOW` is set to **7 days (604 800 s)** by default.  
A notification sent *right now* scores 1.0; one sent a week ago scores 0.0.

### Example

| ID (prefix) | Type      | Age     | Type Weight | Recency | Score   |
|-------------|-----------|---------|-------------|---------|---------|
| d146095a    | Result    | 3 min   | 2           | ≈ 1.00  | 2001.00 |
| b283218f    | Placement | 5 days  | 3           | ≈ 0.29  | 3000.29 |
| 81589ada    | Event     | 1 day   | 1           | ≈ 0.86  | 1000.86 |

The Placement notification wins even though it is older, because its type weight (3 000) overwhelms the recency difference.

---

## Algorithm: Bounded Max-Heap

### Why a Heap?

A naïve approach sorts all M notifications and takes the first N — **O(M log M)** time.  
Using a **min-heap of fixed size N** achieves **O(M log N)** time and **O(N)** space.

When M is large (thousands of notifications) and N is small (10–20), this is significantly faster and critical for real-time / streaming scenarios where new notifications arrive continuously.

### Streaming Behaviour

The heap naturally supports **incremental updates**:

```
for each incoming notification:
    score = compute_score(notification)
    if heap.size < N:
        heap.push(notification)
    elif score > heap.root.score:      # root = current worst in top-N
        heap.replace_root(notification)
```

The heap root is always the **lowest-priority item** currently in the top-N set. A new notification only displaces it if it scores higher. This means the algorithm can run as a long-lived process consuming a notification stream without ever growing beyond O(N) memory.

### Complexity Summary

| Operation          | Time Complexity | Space Complexity |
|--------------------|-----------------|------------------|
| Process M notifs   | O(M log N)      | O(N)             |
| Extract sorted top-N | O(N log N)    | O(N)             |

---

## Handling Continuous Notification Streams

The campus platform notes that *"new notifications will keep coming in"*. The bounded heap design handles this elegantly:

1. **New notification arrives** → compute score → compare with heap root.
2. If it beats the current worst top-N entry, evict and replace in **O(log N)**.
3. The sorted top-N can be read out at any time in **O(N log N)**.

For a production deployment, this algorithm would run inside a worker that subscribes to a WebSocket or message queue (e.g. Kafka, Redis Streams), maintaining the heap in memory and pushing updated top-N lists to clients via Server-Sent Events or WebSocket broadcasts.

---

## API Integration

- **Endpoint**: `GET http://20.207.122.201/evaluation-service/notifications`
- **Auth**: Pre-authorised bearer token (injected via `NOTIFICATION_API_TOKEN` env var)
- **Response**: JSON `{ "notifications": [...] }` — no database storage required.

---

## Configuration

| Variable                | Default                          | Description                        |
|-------------------------|----------------------------------|------------------------------------|
| `NOTIFICATION_API_URL`  | `http://20.207.122.201/...`      | API base URL                       |
| `NOTIFICATION_API_TOKEN`| `pre-authorised`                 | Bearer token for protected route   |

Run the script with an optional positional argument to control N:

```bash
python priority_inbox.py          # default: top 10
python priority_inbox.py 15       # top 15
python priority_inbox.py 20       # top 20
```

---

## Logging

All logging uses Python's standard `logging` module (no `print` / `console.log`).  
Log levels used:

| Level   | When                                              |
|---------|---------------------------------------------------|
| INFO    | Fetch started/completed, result count             |
| DEBUG   | Per-notification score breakdown, heap operations |
| WARNING | Unparseable timestamps, n ≤ 0                     |
| ERROR   | Network / API failures                            |

Set `LOG_LEVEL=DEBUG` to see full per-notification scoring detail.

---

## Project Structure

```
notification_app_be/
├── priority_inbox.py      # Stage 1: priority scoring & heap algorithm
└── requirements.txt       # Python dependencies (requests)

notification_app_fe/
├── src/
│   ├── app/
│   │   ├── page.tsx               # All Notifications page
│   │   ├── layout.tsx             # Root layout + providers
│   │   ├── priority/
│   │   │   └── page.tsx           # Priority Inbox page
│   │   └── components/
│   │       ├── NotificationCard.tsx
│   │       ├── PriorityInbox.tsx
│   │       ├── FilterBar.tsx
│   │       └── Navbar.tsx
│   └── lib/
│       └── api.ts                 # API client + scoring logic
├── next.config.js
└── package.json
```

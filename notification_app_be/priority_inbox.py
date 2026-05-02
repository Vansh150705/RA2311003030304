"""
Stage 1: Priority Inbox for Campus Notifications
================================================
Fetches notifications from the API and returns the top N most important
unread notifications based on:
  - Weight: Placement (3) > Result (2) > Event (1)
  - Recency: More recent notifications score higher

Uses a max-heap (via heapq) to maintain top-N efficiently as new
notifications arrive, without re-sorting the full list each time.

Logging: All logging is performed via log_middleware.py which POSTs
to the Affordmed Log API. No print() or Python logging module used.
"""

import heapq
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import requests
from log_middleware import Log


API_BASE_URL = os.getenv(
    "NOTIFICATION_API_URL",
    "http://20.207.122.201/evaluation-service/notifications",
)
API_TOKEN = os.getenv("NOTIFICATION_API_TOKEN", "")

TYPE_WEIGHT: dict[str, int] = {"Placement": 3, "Result": 2, "Event": 1}
DEFAULT_WEIGHT = 0
RECENCY_WINDOW_SECONDS = 7 * 24 * 3600




@dataclass(order=True)
class ScoredNotification:
    neg_score: float
    notification: dict = field(compare=False)

    @property
    def score(self) -> float:
        return -self.neg_score



def _parse_timestamp(ts: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        Log("backend", "warn", "utils", f"Could not parse timestamp: {ts!r}")
        return None


def compute_score(notification: dict, now: datetime) -> float:
    n_type = notification.get("Type", "")
    type_weight = TYPE_WEIGHT.get(n_type, DEFAULT_WEIGHT)
    ts = _parse_timestamp(notification.get("Timestamp", ""))
    if ts:
        age_seconds = max((now - ts).total_seconds(), 0)
        recency_score = max(1.0 - age_seconds / RECENCY_WINDOW_SECONDS, 0.0)
    else:
        recency_score = 0.0
    score = type_weight * 1000 + recency_score
    Log("backend", "debug", "service",
        f"Scored id={notification.get('ID','?')[:8]} type={n_type} weight={type_weight} recency={recency_score:.4f} total={score:.4f}")
    return score




def fetch_notifications() -> list[dict]:
    headers = {"Authorization": f"Bearer {API_TOKEN}"}
    Log("backend", "info", "service", f"Fetching notifications from {API_BASE_URL}")
    try:
        response = requests.get(API_BASE_URL, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        notifications = data.get("notifications", [])
        Log("backend", "info", "service", f"Successfully fetched {len(notifications)} notifications")
        return notifications
    except requests.exceptions.HTTPError as exc:
        Log("backend", "error", "handler", f"HTTP error fetching notifications: {exc}")
        raise
    except requests.exceptions.ConnectionError as exc:
        Log("backend", "fatal", "handler", f"Connection error — could not reach notification API: {exc}")
        raise
    except requests.exceptions.Timeout:
        Log("backend", "error", "handler", "Request to notification API timed out after 10s")
        raise
    except requests.exceptions.RequestException as exc:
        Log("backend", "fatal", "handler", f"Unexpected error fetching notifications: {exc}")
        raise




def get_top_n_notifications(notifications: list[dict], n: int) -> list[dict]:
    if n <= 0:
        Log("backend", "warn", "service", f"Requested n={n} — returning empty list")
        return []

    Log("backend", "info", "service",
        f"Computing top-{n} from {len(notifications)} notifications using bounded heap")

    now = datetime.now()
    heap: list[ScoredNotification] = []
    evictions = 0

    for notif in notifications:
        score = compute_score(notif, now)
        scored = ScoredNotification(neg_score=-score, notification=notif)
        if len(heap) < n:
            heapq.heappush(heap, scored)
        elif score > heap[0].score:
            evicted = heapq.heapreplace(heap, scored)
            evictions += 1
            Log("backend", "debug", "service",
                f"Heap evicted id={evicted.notification.get('ID','?')[:8]} "
                f"for id={notif.get('ID','?')[:8]}")

    top_n = sorted(heap, key=lambda s: s.score, reverse=True)

    if top_n:
        Log("backend", "info", "service",
            f"Top-{n} computed. {evictions} evictions. Best: {top_n[0].score:.4f} "
            f"({top_n[0].notification.get('Type')} — {top_n[0].notification.get('Message')})")

    return [s.notification for s in top_n]



def display_notifications(notifications: list[dict], n: int) -> None:
    print(f"\n{'=' * 60}")
    print(f"  PRIORITY INBOX  — Top {n} Notifications")
    print(f"{'=' * 60}")
    if not notifications:
        print("  (no notifications to display)")
    else:
        icons = {"Placement": "💼", "Result": "📊", "Event": "🎉"}
        for rank, notif in enumerate(notifications, start=1):
            icon = icons.get(notif.get("Type", ""), "🔔")
            print(f"\n  #{rank:02d}  {icon}  [{notif.get('Type', 'Unknown')}]  {notif.get('Message', '—')}")
            print(f"        ID : {notif.get('ID', '—')}")
            print(f"        At : {notif.get('Timestamp', '—')}")
    print(f"\n{'=' * 60}\n")



def main() -> None:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    Log("backend", "info", "service", f"Priority Inbox starting — requesting top {n} notifications")
    notifications = fetch_notifications()
    top_n = get_top_n_notifications(notifications, n)
    display_notifications(top_n, n)
    Log("backend", "info", "service", f"Priority Inbox completed — displayed {len(top_n)} notifications")


if __name__ == "__main__":
    main()

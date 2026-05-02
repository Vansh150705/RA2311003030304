# Logging Middleware

A reusable logging package for the Campus Notifications platform. Exposes a `Log(stack, level, package, message)` function that posts structured log entries to the Affordmed Test Server log API.

## Setup

### 1. Install dependencies

```bash
cd logging_middleware
npm install
```

### 2. Set environment variables

Create a `.env` file in your project root (or export these in your shell):

```env
LOG_ACCESS_TOKEN=<your_bearer_token_from_auth_api>
LOG_API_URL=http://20.207.122.201/evaluation-service/logs
```

Get your bearer token by calling the `/evaluation-service/auth` endpoint with your `clientID` and `clientSecret`.

## Usage

### Direct import

```typescript
import { Log } from "../logging_middleware";

// Backend example
await Log("backend", "info", "service", "Fetching top-N priority notifications");
await Log("backend", "error", "handler", "Received string, expected bool");
await Log("backend", "fatal", "db", "Critical database connection failure");

// Frontend example
await Log("frontend", "info", "page", "All notifications page mounted");
await Log("frontend", "error", "api", "Failed to reach notifications endpoint");
```

### Using the Logger convenience wrapper

```typescript
import { Logger } from "../logging_middleware";

await Logger.info("backend", "service", "Priority inbox computed successfully");
await Logger.warn("frontend", "component", "NotificationCard received null ID");
await Logger.error("backend", "route", "Unhandled route error");
```

## Allowed Values

### Stack
| Value | Use for |
|-------|---------|
| `backend` | Server-side / Python / Node backend code |
| `frontend` | React / Next.js frontend code |

### Level
`debug` · `info` · `warn` · `error` · `fatal`

### Package — Backend only
`cache` · `controller` · `cron_job` · `db` · `domain` · `handler` · `repository` · `route` · `service`

### Package — Frontend only
`api` · `component` · `hook` · `page` · `state` · `style`

### Package — Both
`auth` · `config` · `middleware` · `utils`

## API Reference

### `Log(stack, level, pkg, message): Promise<string | null>`

Posts a log entry to the Test Server. Returns the `logID` string on success, or `null` on failure. **Never throws** — logging failures are handled gracefully so they never crash the calling application.

### `Logger`

Convenience object with methods: `Logger.debug()`, `Logger.info()`, `Logger.warn()`, `Logger.error()`, `Logger.fatal()` — each takes `(stack, pkg, message)`.

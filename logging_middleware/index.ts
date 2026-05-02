declare var process: any;

export type Stack = "backend" | "frontend";

export type Level = "debug" | "info" | "warn" | "error" | "fatal";

export type BackendPackage =
  | "cache"
  | "controller"
  | "cron_job"
  | "db"
  | "domain"
  | "handler"
  | "repository"
  | "route"
  | "service";

export type FrontendPackage = "api" | "component" | "hook" | "page" | "state" | "style";

export type SharedPackage = "auth" | "config" | "middleware" | "utils";

export type Package = BackendPackage | FrontendPackage | SharedPackage;

const VALID_STACKS: Stack[] = ["backend", "frontend"];

const VALID_LEVELS: Level[] = ["debug", "info", "warn", "error", "fatal"];

const VALID_BACKEND_PACKAGES: BackendPackage[] = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
];

const VALID_FRONTEND_PACKAGES: FrontendPackage[] = [
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
];

const VALID_SHARED_PACKAGES: SharedPackage[] = ["auth", "config", "middleware", "utils"];

const VALID_PACKAGES: Package[] = [
  ...VALID_BACKEND_PACKAGES,
  ...VALID_FRONTEND_PACKAGES,
  ...VALID_SHARED_PACKAGES,
];

function validateArgs(
  stack: string,
  level: string,
  pkg: string,
  message: string
): void {
  if (!VALID_STACKS.includes(stack as Stack)) {
    throw new Error(
      `[LogMiddleware] Invalid stack "${stack}". Must be one of: ${VALID_STACKS.join(", ")}`
    );
  }

  if (!VALID_LEVELS.includes(level as Level)) {
    throw new Error(
      `[LogMiddleware] Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(", ")}`
    );
  }

  if (!VALID_PACKAGES.includes(pkg as Package)) {
    throw new Error(
      `[LogMiddleware] Invalid package "${pkg}". Must be one of: ${VALID_PACKAGES.join(", ")}`
    );
  }

  if (
    stack === "backend" &&
    VALID_FRONTEND_PACKAGES.includes(pkg as FrontendPackage)
  ) {
    throw new Error(
      `[LogMiddleware] Package "${pkg}" is frontend-only and cannot be used with stack "backend".`
    );
  }

  if (
    stack === "frontend" &&
    VALID_BACKEND_PACKAGES.includes(pkg as BackendPackage)
  ) {
    throw new Error(
      `[LogMiddleware] Package "${pkg}" is backend-only and cannot be used with stack "frontend".`
    );
  }

  if (!message || message.trim().length === 0) {
    throw new Error("[LogMiddleware] Message must not be empty.");
  }
}


interface LogMiddlewareConfig {
  apiUrl: string;
  accessToken: string; 
}

function getConfig(): LogMiddlewareConfig {
  const apiUrl =
    process.env.LOG_API_URL ||
    "http://20.207.122.201/evaluation-service/logs";

  const accessToken = process.env.LOG_ACCESS_TOKEN || "";

  if (!accessToken) {
 
    console.warn(
      "[LogMiddleware] LOG_ACCESS_TOKEN is not set. Log API calls will fail authentication."
    );
  }

  return { apiUrl, accessToken };
}


interface LogPayload {
  stack: string;
  level: string;
  package: string;
  message: string;
}

interface LogResponse {
  logID: string;
  message: string;
}


export async function Log(
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<string | null> {
  
  try {
    validateArgs(stack, level, pkg, message);
  } catch (validationError) {
    console.error((validationError as Error).message);
    return null;
  }

  const config = getConfig();

  const payload: LogPayload = {
    stack,
    level,
    package: pkg,
    message,
  };

  
  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.warn(
        `[LogMiddleware] Log API responded with ${response.status}: ${errorText}`
      );
      return null;
    }

    const data: LogResponse = await response.json();
    return data.logID;
  } catch (networkError) {
   
    console.warn(
      `[LogMiddleware] Failed to reach log API: ${(networkError as Error).message}`
    );
    return null;
  }
}


export const Logger = {
  debug: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "debug", pkg, message),

  info: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "info", pkg, message),

  warn: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "warn", pkg, message),

  error: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "error", pkg, message),

  fatal: (stack: Stack, pkg: Package, message: string) =>
    Log(stack, "fatal", pkg, message),
};

export default Log;

export const getCurrentTimestamp = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = Math.floor(now.getMilliseconds() / 10)
    .toString()
    .padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${milliseconds}`;
};

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ICONS: Record<LogLevel, string> = {
  DEBUG: "🔍",
  INFO: "ℹ️",
  WARN: "⚠️",
  ERROR: "❌",
};

type NodeProcessEnv = {
  NODE_ENV?: string;
};

type NodeProcessLike = {
  env?: NodeProcessEnv;
};

const log = (level: LogLevel, module: string, message: string, ...args: unknown[]) => {
  const nodeEnv = (globalThis as { process?: NodeProcessLike }).process?.env?.NODE_ENV;
  if (level === "DEBUG" && nodeEnv === "production") return;
  const out = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  out(`${getCurrentTimestamp()} ${LEVEL_ICONS[level]} [${level}] - ${module} - ${message}`, ...args);
};

export const logger = {
  debug: (module: string, message: string, ...args: unknown[]) => log("DEBUG", module, message, ...args),
  info: (module: string, message: string, ...args: unknown[]) => log("INFO", module, message, ...args),
  warn: (module: string, message: string, ...args: unknown[]) => log("WARN", module, message, ...args),
  error: (module: string, message: string, ...args: unknown[]) => log("ERROR", module, message, ...args),
};

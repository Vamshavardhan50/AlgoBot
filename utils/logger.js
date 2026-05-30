function format(level, args) {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] [${level}]`, ...args);
}

export const logger = {
  info: (...args) => format("INFO", args),
  warn: (...args) => format("WARN", args),
  error: (...args) => format("ERROR", args),
};

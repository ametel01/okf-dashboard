import type { LogEntry } from "./okf-types";

export function parseLogEntries(body: string): LogEntry[] {
  const lines = body.split(/\r?\n/u);
  const entries: LogEntry[] = [];
  let currentDate = "";
  for (let index = 0; index < lines.length; index += 1) {
    const date = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/u.exec(lines[index]);
    if (date) {
      currentDate = date[1];
      continue;
    }
    const item = /^\s*[-*]\s+(.+)$/u.exec(lines[index]);
    if (item && currentDate) {
      entries.push({ date: currentDate, text: item[1].trim(), line: index + 1 });
    }
  }
  return entries;
}

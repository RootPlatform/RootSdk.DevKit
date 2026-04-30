// Formatting helpers used across views. Keep small; no date library.

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatRelative(ms: number): string {
  const delta = ms - Date.now();
  const abs = Math.abs(delta);
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (abs < minute) return RTF.format(Math.round(delta / 1000), "second");
  if (abs < hour) return RTF.format(Math.round(delta / minute), "minute");
  if (abs < day) return RTF.format(Math.round(delta / hour), "hour");
  return RTF.format(Math.round(delta / day), "day");
}

export function formatAbsolute(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function formatHourLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
  });
}

export function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

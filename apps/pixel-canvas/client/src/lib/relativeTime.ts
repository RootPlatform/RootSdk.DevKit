// Small relative-time formatter. Used in the ActionPanel to render
// "placed 3 min ago" — we don't import Intl.RelativeTimeFormat because
// the polyfill chain pulls in non-trivial weight for what's a single
// label per pixel selection.
//
// Returns strings like:
//   "just now"        for < 30 s
//   "30s ago"
//   "3 min ago"
//   "2 h ago"
//   "1 day ago" / "5 days ago"
//
// The seconds / minutes / hours buckets use unit abbreviations that don't
// pluralize. Days is the only spelled-out unit and needs the singular at
// 1 — without the branch it'd read "1 days ago".
//
// `now` defaults to Date.now() but is overridable for testing.
export function formatRelativeTime(
  pastMs: number,
  now: number = Date.now(),
): string {
  const diffMs = Math.max(0, now - pastMs);
  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.floor(hr / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

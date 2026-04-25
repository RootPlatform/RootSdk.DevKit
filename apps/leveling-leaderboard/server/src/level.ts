// ============================================================================
// level — DESIGN.md Appendix → XP and levels formulas.
//   level = floor(sqrt(totalXp / curve))
//   level N starts at N² × curve
//   progressToNextLevel = (totalXp - startXp) / (endXp - startXp) in [0, 1]
// ============================================================================

export function computeLevel(totalXp: number, curve: number): number {
  if (totalXp <= 0) return 0;
  return Math.floor(Math.sqrt(totalXp / curve));
}

export function levelStartXp(level: number, curve: number): number {
  return level * level * curve;
}

export function progressToNextLevel(totalXp: number, curve: number): number {
  const lvl = computeLevel(totalXp, curve);
  const start = levelStartXp(lvl, curve);
  const end = levelStartXp(lvl + 1, curve);
  if (end === start) return 0;
  const p = (totalXp - start) / (end - start);
  return Math.max(0, Math.min(1, p));
}

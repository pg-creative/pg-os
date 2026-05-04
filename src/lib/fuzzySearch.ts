/**
 * fuzzySearch.ts — lightweight fuzzy scoring for the Command Palette.
 * Returns a score in [0, 1]. Higher = better match. 0 = no match.
 */

export function score(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;

  const queryTokens = q.split(/\s+/).filter(Boolean);
  const targetWords = t.split(/[\s\-_/.:]+/).filter(Boolean);

  let total = 0;
  const N = queryTokens.length;

  // Token overlap: +0.4/N for each query token that appears as substring in target
  for (const qt of queryTokens) {
    if (t.includes(qt)) {
      total += 0.4 / N;
    }
  }

  // Prefix bonus: +0.3 if any query token prefix-matches a word in target
  let prefixBonus = false;
  outer: for (const qt of queryTokens) {
    for (const tw of targetWords) {
      if (tw.startsWith(qt)) {
        prefixBonus = true;
        break outer;
      }
    }
  }
  if (prefixBonus) total += 0.3;

  // Initials bonus: +0.2 if query (no spaces) matches the initials of target words
  const initials = targetWords.map((w) => w[0] ?? "").join("");
  const qNoSpace = queryTokens.join("");
  if (initials.includes(qNoSpace)) {
    total += 0.2;
  }

  return Math.min(total, 1.0);
}

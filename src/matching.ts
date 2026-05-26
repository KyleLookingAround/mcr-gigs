import type { Gig, MatchKind } from "./types";

/** Normalise an artist/event string for comparison: lowercase, strip accents
 *  and punctuation, collapse whitespace. */
export function normName(s: string): string {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining accents
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-phrase containment: does normalised `needle` appear as whole tokens
 *  within any of the haystacks? Names shorter than 2 chars are ignored as too
 *  noisy to match reliably. */
function phraseHit(needle: string, haystacks: string[]): boolean {
  if (needle.length < 2) return false;
  const padded = " " + needle + " ";
  for (const h of haystacks) {
    if ((" " + h + " ").includes(padded)) return true;
  }
  return false;
}

/** Decide whether a gig matches one of your artists ("you"), a similar artist
 *  ("similar"), or neither. Matches against the gig's structured lineup when
 *  present, falling back to the event title. */
export function computeMatch(gig: Gig, top: Set<string>, similar: Set<string>): MatchKind {
  if (top.size === 0 && similar.size === 0) return null;
  const hay = gig.artistsNorm;
  for (const a of top) if (phraseHit(a, hay)) return "you";
  for (const a of similar) if (phraseHit(a, hay)) return "similar";
  return null;
}

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
 *  ("similar"), or neither. The lineup (structured artists + event title) is the
 *  reliable signal. Your own artists also match when named only in the gig's
 *  free-text description — catching support slots and multi-act bills — but the
 *  larger, noisier "similar" set is kept to the lineup to avoid false positives
 *  from marketing copy ("in the spirit of …"). */
export function computeMatch(gig: Gig, top: Set<string>, similar: Set<string>): MatchKind {
  if (top.size === 0 && similar.size === 0) return null;
  const lineup = gig.artistsNorm;
  const withDesc = gig.description ? [...lineup, normName(gig.description)] : lineup;
  for (const a of top) if (phraseHit(a, withDesc)) return "you";
  for (const a of similar) if (phraseHit(a, lineup)) return "similar";
  return null;
}

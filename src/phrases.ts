// Manchester flavour. Pure data + lookups so they can be unit-tested; the DOM
// side (toasts, the bee shower, the console hello) lives in eggs.ts.

/** Shown while gigs are loading, in place of a plain "Fetching gigs…". */
export const LOADING_PHRASES = [
  "Sortin' yer gigs…",
  "Hang on, our kid…",
  "Diggin' through Manny…",
  "Roadies are loadin' in…",
  "Soundcheck in progress…",
  "Mad fer it…",
] as const;

/** Shown when filters hide everything (but gigs did load). */
export const EMPTY_PHRASES = [
  "Nowt on with these filters.",
  "Dry round here — loosen 'em up.",
  "Nothing doing, our kid.",
  "Quieter than the Arndale at 6am.",
] as const;

/** Cycled through the masthead tag when it's clicked. */
export const MASTHEAD_PHRASES = [
  "Mad fer it 🐝",
  "Top one, sorted.",
  "Dead good, this.",
  "Boss. Proper boss.",
  "Buzzin'.",
  "Our kid.",
] as const;

/**
 * Pick from a list. Deterministic when given an index (keeps tests + the
 * masthead cycle stable); otherwise random.
 */
export function pickPhrase(
  list: readonly string[],
  i: number = Math.floor(Math.random() * list.length),
): string {
  return list[((i % list.length) + list.length) % list.length];
}

/** Nods to Manchester's music legends, keyed by a lowercase search term. */
export const LEGENDS: Record<string, string> = {
  oasis: "Definitely Maybe. Mad fer it. 🐝",
  "stone roses": "I wanna be adored.",
  "the stone roses": "I wanna be adored.",
  "joy division": "Love will tear us apart. Again.",
  "new order": "Blue Monday — every Monday.",
  "the smiths": "There is a light that never goes out.",
  morrissey: "Heaven knows we're miserable now.",
  "johnny marr": "How soon is now?",
  "happy mondays": "Step on. Twistin' my melon, man.",
  "the fall": "Mark E. Smith says behave.",
  buzzcocks: "Ever fallen in love?",
  james: "Sit down next to me.",
  elbow: "One day like this a year'd see me right.",
  doves: "There goes the fear.",
  "the 1975": "It's not living if it's not with you.",
  "inspiral carpets": "This is how it feels.",
  "the charlatans": "The only one I know.",
  "the chemical brothers": "Block rockin' beats.",
};

/**
 * If a search query mentions a Manchester legend, return the nod. Matches the
 * most specific (longest) key first so "the stone roses" beats a bare key.
 */
export function matchLegend(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const keys = Object.keys(LEGENDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (q.includes(key)) return LEGENDS[key];
  }
  return null;
}

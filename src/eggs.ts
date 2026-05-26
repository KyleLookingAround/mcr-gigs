// The fun, DOM-touching half of the Manchester flavour. Pure phrase data and
// lookups live in phrases.ts (and are unit-tested there).
import { MASTHEAD_PHRASES, pickPhrase, matchLegend } from "./phrases";

let toastTimer: number | undefined;

/** Brief paper-stock note in the bottom corner. Re-uses one element. */
export function showToast(msg: string, ms = 3200): void {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove("show"), ms);
}

/** A drift of Manchester worker bees down the page. */
function beeShower(): void {
  for (let i = 0; i < 14; i++) {
    const bee = document.createElement("span");
    bee.className = "bee";
    bee.textContent = "🐝";
    bee.style.left = Math.random() * 100 + "vw";
    bee.style.animationDuration = 3 + Math.random() * 2 + "s";
    bee.style.animationDelay = Math.random() * 1.5 + "s";
    bee.style.fontSize = 18 + Math.random() * 22 + "px";
    document.body.appendChild(bee);
    window.setTimeout(() => bee.remove(), 6000);
  }
}

/** ↑ ↑ ↓ ↓ ← → ← → B A — unlocks the bees. */
function bindKonami(): void {
  const seq = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let pos = 0;
  window.addEventListener("keydown", (e) => {
    // Don't capture keystrokes while the user is typing in a field.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === seq[pos] ? pos + 1 : key === seq[0] ? 1 : 0;
    if (pos === seq.length) {
      pos = 0;
      beeShower();
      showToast("🐝 Madchester unlocked — top one, sorted.");
    }
  });
}

let lastLegend: string | null = null;

/** Called as the user types in the search box; nods to matched legends once. */
export function maybeLegendToast(query: string): void {
  const nod = matchLegend(query);
  if (nod && nod !== lastLegend) showToast(nod);
  lastLegend = nod;
}

function bindMasthead(): void {
  const tag = document.getElementById("mast-no");
  if (!tag) return;
  let i = 0;
  tag.addEventListener("click", () => showToast(pickPhrase(MASTHEAD_PHRASES, i++)));
}

function sayHello(): void {
  // A little hello for anyone poking around the console.
  console.log(
    "%c🐝 MCR GIGS %cMad fer it. Worker bees welcome.\nLooking under the hood? Try the Konami code.",
    "font-weight:700;color:#c8341c",
    "color:#1a1714",
  );
}

export function initEasterEggs(): void {
  sayHello();
  bindKonami();
  bindMasthead();
}

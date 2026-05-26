const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function stripHtml(s: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  return (tmp.textContent || tmp.innerText || "").trim();
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

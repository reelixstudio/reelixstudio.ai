// Beta waitlist (#s6) on reelixstudio.ai. Every word, question and the AI prompt come from the Room
// (GET room.reelixstudio.ai/api/waitlist/form, one list in room/src/data/welcome.ts), so a new question is one row there.
// One question per screen; or copy the prompt into your own AI, paste its REELIX WAITLIST block, and check each answer.
const API = (location.hostname === "localhost" && new URLSearchParams(location.search).get("wlapi")) || "https://room.reelixstudio.ai/api/waitlist"; // ?wlapi= only for local testing
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); for (const k of Object.keys(props)) if (k.startsWith("aria-")) e.setAttribute(k, props[k]); e.append(...kids.filter((k) => k !== null && k !== undefined && k !== false)); return e; };
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const box = $("#wl");

let F; // the form, from the Room
try { const r = await fetch(`${API}/form`); if (!r.ok) throw 0; F = await r.json(); }
catch { box.replaceChildren(el("p", { className: "msg", textContent: "The waitlist didn't load. Email hi@reelixstudio.ai and we'll add you." })); throw 0; }

// words on the page (nav, heading, lead, fine print)
const pick = (path) => path.split(".").reduce((o, k) => o?.[k], F);
document.querySelectorAll("[data-w]").forEach((n) => { const v = pick(n.dataset.w); if (typeof v === "string") n.textContent = v; });
$("#wllead").replaceChildren(...F.lead.map((t) => el("span", { textContent: t })), el("span", { className: "hint", textContent: F.hint }));
$("#wlfine").replaceChildren(F.fine + " ", el("a", { href: F.signin_url, textContent: F.nav.signin }));

// --- state ---
const Q = F.questions, total = F.total;
const S = { i: 0, answers: Object.fromEntries(Q.map((q) => [q.id, ""])), email: "", consent: false, via: "typed", sending: false };

// --- header: "1 of N", progress, Copy prompt, ? ---
const count = el("span"), bar = el("i"), copy = el("button", { type: "button", className: "gh", textContent: F.copy_prompt });
const qtip = el("button", { type: "button", className: "qtip", textContent: "?", "aria-label": F.tip });
const pre = el("pre", { textContent: F.prompt_text, hidden: true });
const see = el("a", { textContent: F.see_prompt, role: "button", tabIndex: 0 });
const tip = el("div", { className: "tipbox", hidden: true }, el("div", { textContent: F.tip }), see, pre);
see.onclick = () => { pre.hidden = !pre.hidden; };
let pinned = false;
qtip.onmouseenter = () => { tip.hidden = false; };
qtip.onmouseleave = () => { if (!pinned) setTimeout(() => { if (!pinned && !tip.matches(":hover")) tip.hidden = true; }, 200); };
tip.onmouseleave = () => { if (!pinned) tip.hidden = true; };
qtip.onclick = () => { pinned = !pinned; tip.hidden = !pinned; };
document.addEventListener("click", (e) => { if (pinned && !tip.contains(e.target) && e.target !== qtip) { pinned = false; tip.hidden = true; } });
copy.onclick = async () => {
  try { await navigator.clipboard.writeText(F.prompt_text); copy.textContent = F.copied; }
  catch { pre.hidden = false; tip.hidden = false; pinned = true; }
  setTimeout(() => { copy.textContent = F.copy_prompt; }, 2500);
};
const head = el("div", { className: "qh" }, count, el("span", { className: "pr" }, bar), copy, qtip);

// --- body (one screen at a time) ---
const body = el("div"), msg = el("div", { className: "msg", role: "status" });
const back = el("button", { type: "button", className: "back", textContent: F.back });
const next = el("button", { type: "button", className: "btn" });
const hp = el("input", { type: "text", name: "website", tabIndex: -1, autocomplete: "off", "aria-hidden": "true" }); // honeypot
const nav = el("div", { className: "nv" }, back, next);

// --- paste your AI's answer ---
const ps = el("textarea", { className: "ps", placeholder: [F.format.head, ...F.format.keys.map((k) => `${k}: …`)].join("\n"), "aria-label": F.paste_label });
const paste = el("div", { className: "dr" }, F.paste_label + " ", el("small", { textContent: "· " + F.paste_sub }), ps);
ps.addEventListener("input", () => {
  const got = parse(ps.value);
  const n = Object.keys(got).length;
  if (!ps.value.trim()) { msg.textContent = ""; return; }
  if (!n) { msg.className = "msg"; msg.textContent = F.paste_none; return; }
  Object.assign(S.answers, got); S.via = "ai";
  S.i = Q.findIndex((q) => got[q.id] !== undefined); if (S.i < 0) S.i = 0;
  draw(); msg.className = "msg ok"; msg.textContent = fill(F.paste_ok, { n });
});
/** Same rules as the Room's parser: find the head line, read known `id:` lines, a wrapped line joins the one above. */
function parse(text) {
  const lines = String(text).replace(/\r/g, "").split("\n"), keys = F.format.keys, headKey = F.format.head.replace(/\s/g, "");
  const at = lines.findIndex((l) => l.replace(/[*_`#>\s]/g, "").toUpperCase() === headKey);
  if (at < 0) return {};
  const out = {}; let cur = null;
  for (const raw of lines.slice(at + 1)) {
    const l = raw.replace(/^[\s*_`>-]+/, ""), m = /^([a-z][a-z0-9_]*)\s*:\s*(.*)$/i.exec(l);
    if (m && keys.includes(m[1].toLowerCase())) { cur = m[1].toLowerCase(); out[cur] = m[2].trim(); continue; }
    if (m || !l.trim()) { cur = null; continue; }
    if (cur && !/^```/.test(l)) out[cur] = (out[cur] + " " + l.trim()).trim();
  }
  for (const k of Object.keys(out)) { out[k] = out[k].replace(/^["“]|["”]$/g, "").trim(); if (!out[k] || out[k] === "…") delete out[k]; }
  return out;
}

function draw() {
  const last = S.i === Q.length;
  count.textContent = fill(F.of, { n: S.i + 1, total });
  bar.style.width = `${Math.round(((S.i + 1) / total) * 100)}%`;
  back.disabled = S.i === 0;
  if (!last) {
    const q = Q[S.i];
    const ta = el("textarea", { placeholder: q.placeholder, value: S.answers[q.id], "aria-label": q.label });
    ta.oninput = () => { S.answers[q.id] = ta.value; };
    ta.onkeydown = (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next.click(); };
    body.replaceChildren(el("div", { className: "q", textContent: q.label }), ta);
    next.textContent = F.next;
    paste.hidden = false;
  } else {
    const em = el("input", { type: "email", placeholder: F.email.placeholder, value: S.email, autocomplete: "email", "aria-label": F.email.label });
    em.oninput = () => { S.email = em.value; };
    em.onkeydown = (e) => { if (e.key === "Enter") next.click(); };
    const cb = el("input", { type: "checkbox", checked: S.consent }); cb.onchange = () => { S.consent = cb.checked; };
    body.replaceChildren(el("div", { className: "q", textContent: F.email.label }), em, el("label", { className: "cons" }, cb, el("span", { textContent: F.consent })), hp);
    next.textContent = F.join;
    paste.hidden = true;
  }
}
back.onclick = () => { if (S.i > 0) { S.i--; msg.textContent = ""; draw(); } };
next.onclick = async () => {
  if (S.i < Q.length) { S.i++; msg.textContent = ""; draw(); body.querySelector("textarea,input")?.focus(); return; }
  if (S.sending) return; // rough hands: one send at a time
  const email = S.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.className = "msg"; msg.textContent = F.need_email; return; }
  S.sending = true; next.disabled = true; next.textContent = F.sending; msg.textContent = "";
  try {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, answers: S.answers, consent: S.consent, via: S.via, website: hp.value || undefined }) });
    if (r.status === 429) throw new Error(F.slow_down);
    if (!r.ok) throw new Error(F.failed);
    const d = await r.json();
    box.replaceChildren(el("div", { className: "done" }, el("b", { textContent: "✓" }), d.done || F.done));
  } catch (e) {
    msg.className = "msg"; msg.textContent = e.message && e.message !== "Failed to fetch" ? e.message : F.failed;
    S.sending = false; next.disabled = false; next.textContent = F.join;
  }
};

box.replaceChildren(head, tip, body, nav, msg, paste);
draw();

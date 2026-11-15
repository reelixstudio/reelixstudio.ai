// Beta waitlist (#s6) on reelixstudio.ai, v2 playful (Design SPEC-playful, Danney's go 2026-11-15).
// Every word, the questions, the AI prompt, the line count and your seat come from the Room
// (room.reelixstudio.ai/api/waitlist/form, one list in room/src/data/welcome.ts). Nothing here is typed in.
// Departure board → the line (anonymous circles, + you?) → a ticket: stops, one question per stop, Copy AI prompt /
// Paste answer / ?, round ← → buttons, a seat stub. Done: BOARDED, your initial joins the line, a Last Train frame.
const API = (location.hostname === "localhost" && new URLSearchParams(location.search).get("wlapi")) || "https://room.reelixstudio.ai/api/waitlist"; // ?wlapi= only for local testing
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of Object.keys(props)) if (k.startsWith("aria-")) e.setAttribute(k, props[k]);
  e.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
  return e;
};
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ticket = $("#wl");

let F;
try { const r = await fetch(`${API}/form`); if (!r.ok) throw 0; F = await r.json(); }
catch { ticket.replaceChildren(el("p", { className: "msg", textContent: "The waitlist didn't load. Email hi@reelixstudio.ai and we'll add you." })); throw 0; }

const pick = (path) => path.split(".").reduce((o, k) => o?.[k], F);
document.querySelectorAll("[data-w]").forEach((n) => { const v = pick(n.dataset.w); if (typeof v === "string") n.textContent = v; });

// ---------- departure board ----------
const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function flipRow(text, cls) { // one tile row per word, so a narrow phone can wrap between words
  const out = el("div", { className: "col", "aria-hidden": "true" });
  text.split(" ").forEach((w) => { const f = el("div", { className: "flip" + (cls ? " " + cls : "") }); for (const ch of w) f.append(el("span", { textContent: ch })); out.append(f); });
  return out;
}
function settle(col, text) { // flip each tile through a few letters, then land (skipped under reduced motion)
  const tiles = [...col.querySelectorAll("span")], target = text.replace(/ /g, "");
  if (still) return;
  tiles.forEach((t, i) => {
    let n = 4 + (i % 5);
    const tick = () => { if (n-- <= 0) { t.textContent = target[i]; return; } t.textContent = LET[(Math.random() * 26) | 0]; setTimeout(tick, 55); };
    tick();
  });
}
const dep = $("#wldep");
const dest = flipRow(F.board.dest), stat = flipRow(F.board.status, "st");
const statWrap = el("div", { className: "col" }, stat, el("i", { className: "blink" }));
dep.replaceChildren(el("div", { className: "dcol" }, el("span", { className: "h", textContent: F.board.dest_label }), dest), el("div", { className: "dcol" }, el("span", { className: "h", textContent: F.board.status_label }), statWrap));
dep.setAttribute("aria-label", `${F.board.dest_label}: ${F.board.dest}. ${F.board.status_label}: ${F.board.status}.`);
if (!still) {
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { settle(dest, F.board.dest); settle(stat, F.board.status); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(dep);
}

// ---------- the line ----------
let count = Number(F.count) || 0;
function drawLine(me) {
  const q = $("#wlq"), n = count, show = Math.min(n - (me ? 1 : 0), 7);
  q.replaceChildren(...[...Array.from({ length: Math.max(0, show) }, () => el("span", { className: "p" })),
    n - (me ? 1 : 0) > 7 ? el("span", { className: "more", textContent: fill(F.more, { n: n - (me ? 1 : 0) - 7 }) }) : null,
    me ? el("span", { className: "you me", textContent: me }) : el("span", { className: "you", textContent: F.you })].filter(Boolean));
  $("#wlcap").replaceChildren(el("b", { textContent: String(n) }), " " + F.count_label);
}
drawLine(null);

// ---------- the ticket ----------
const Q = F.questions, STOPS = [...Q.map((q) => q.stop || q.id), F.email_stop];
const S = { i: 0, answers: Object.fromEntries(Q.map((q) => [q.id, ""])), email: "", consent: false, via: "typed", sending: false };

const stops = el("div", { className: "stops", "aria-hidden": "true" }), stopn = el("div", { className: "stopn" });
const copy = el("button", { type: "button", className: "t", textContent: F.copy_short });
const pasteBtn = el("button", { type: "button", className: "t", textContent: F.paste_open, "aria-expanded": "false" });
const qt = el("button", { type: "button", className: "qt", textContent: "?", "aria-label": F.tip });
const pre = el("pre", { textContent: F.prompt_text, hidden: true });
const see = el("a", { textContent: F.see_prompt, role: "button", tabIndex: 0 });
const tip = el("div", { className: "tipbox", hidden: true, role: "tooltip" }, el("div", { textContent: F.tip }), see, pre);
const tools = el("div", { className: "tools" }, copy, pasteBtn, qt, tip);
see.onclick = () => { pre.hidden = !pre.hidden; };
let pinned = false;
qt.onmouseenter = () => { tip.hidden = false; };
qt.onmouseleave = () => setTimeout(() => { if (!pinned && !tip.matches(":hover")) tip.hidden = true; }, 200);
tip.onmouseleave = () => { if (!pinned) tip.hidden = true; };
qt.onclick = () => { pinned = !pinned; tip.hidden = !pinned; };
document.addEventListener("click", (e) => { if (pinned && !tip.contains(e.target) && e.target !== qt) { pinned = false; tip.hidden = true; } });
copy.onclick = async () => {
  try { await navigator.clipboard.writeText(F.prompt_text); copy.textContent = F.copied; }
  catch { pre.hidden = false; tip.hidden = false; pinned = true; }
  setTimeout(() => { copy.textContent = F.copy_short; }, 2500);
};

const ps = el("textarea", { className: "ps", hidden: true, placeholder: [F.format.head, ...F.format.keys.map((k) => `${k}: …`)].join("\n"), "aria-label": F.paste_label });
pasteBtn.onclick = () => { ps.hidden = !ps.hidden; pasteBtn.setAttribute("aria-expanded", String(!ps.hidden)); if (!ps.hidden) ps.focus(); };
const body = el("div"), msg = el("div", { className: "msg", role: "status" });
const back = el("button", { type: "button", className: "ib", textContent: "←", "aria-label": F.back_label });
const next = el("button", { type: "button", className: "ib go", textContent: "→", "aria-label": F.next_label });
const hp = el("input", { type: "text", name: "website", tabIndex: -1, autocomplete: "off", className: "hp", "aria-hidden": "true" }); // honeypot
const main = el("div", { className: "main" }, stops, stopn, tools, body, ps, el("div", { className: "nv" }, back, next), msg);
const seat = el("div", { className: "num" });
const stub = el("div", { className: "stub" }, el("div", {}, el("div", { className: "wl-lbl", textContent: F.seat_label }), seat), el("div", {}, el("div", { className: "bar" }), el("div", { className: "wl-lbl", textContent: F.stub_brand })));
const setSeat = (n) => { seat.textContent = "#" + n; };
setSeat(count + 1);

ps.addEventListener("input", () => {
  if (!ps.value.trim()) { msg.textContent = ""; return; }
  const got = parse(ps.value), n = Object.keys(got).length;
  if (!n) { msg.className = "msg"; msg.textContent = F.paste_none; return; }
  Object.assign(S.answers, got); S.via = "ai";
  S.i = Math.max(0, Q.findIndex((q) => got[q.id] !== undefined));
  draw(); msg.className = "msg ok"; msg.textContent = fill(F.paste_ok, { n });
});
/** Same rules as the Room's parser (room/src/waitlist.ts). */
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
  stops.replaceChildren(...STOPS.flatMap((_, k) => [k ? el("b", { className: k <= S.i ? "dn" : "" }) : null, el("i", { className: k < S.i ? "dn" : k === S.i ? "on" : "" })].filter(Boolean)));
  stopn.replaceChildren(...STOPS.map((s, k) => el("span", { className: k === S.i ? "on" : "", textContent: s })));
  back.disabled = S.i === 0;
  if (!last) {
    const q = Q[S.i];
    const ta = el("textarea", { placeholder: F.hint_placeholder, value: S.answers[q.id], "aria-label": q.label });
    ta.oninput = () => { S.answers[q.id] = ta.value; };
    ta.onkeydown = (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next.click(); };
    body.replaceChildren(el("div", { className: "q", textContent: q.label }), ta);
    next.setAttribute("aria-label", F.next_label);
  } else {
    const em = el("input", { type: "email", placeholder: F.email.placeholder, value: S.email, autocomplete: "email", "aria-label": F.email.label });
    em.oninput = () => { S.email = em.value; };
    em.onkeydown = (e) => { if (e.key === "Enter") next.click(); };
    const cb = el("input", { type: "checkbox", checked: S.consent }); cb.onchange = () => { S.consent = cb.checked; };
    body.replaceChildren(el("div", { className: "q", textContent: F.email.label }), em, el("label", { className: "cons" }, cb, el("span", { textContent: F.consent })), hp);
    next.setAttribute("aria-label", F.send_label);
  }
}
back.onclick = () => { if (S.i > 0) { S.i--; msg.textContent = ""; draw(); } };
next.onclick = async () => {
  if (S.i < Q.length) { S.i++; msg.textContent = ""; draw(); body.querySelector("textarea,input")?.focus(); return; }
  if (S.sending) return; // rough hands: one send at a time
  const email = S.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.className = "msg"; msg.textContent = F.need_email; return; }
  S.sending = true; next.setAttribute("aria-busy", "true"); msg.className = "msg"; msg.textContent = F.sending;
  try {
    const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, answers: S.answers, consent: S.consent, via: S.via, website: hp.value || undefined }) });
    if (r.status === 429) throw new Error(F.slow_down);
    if (!r.ok) throw new Error(F.failed);
    const d = await r.json();
    done(email, d);
  } catch (e) {
    msg.textContent = e.message && e.message !== "Failed to fetch" ? e.message : F.failed;
    S.sending = false; next.removeAttribute("aria-busy");
  }
};

function done(email, d) {
  if (Number.isFinite(d.count)) count = d.count; else count += 1;
  setSeat(Number.isFinite(d.seat) ? d.seat : count);
  $("#wltitle").textContent = F.title_done;
  drawLine(email.trim()[0].toUpperCase());
  const st = flipRow(F.board.status_done, "st");
  statWrap.replaceChildren(st, el("i", { className: "blink" })); settle(st, F.board.status_done);
  dep.setAttribute("aria-label", `${F.board.dest_label}: ${F.board.dest}. ${F.board.status_label}: ${F.board.status_done}.`);
  ticket.classList.add("is-done");
  main.replaceChildren(el("img", { className: "shot", src: F.done_image, alt: F.done_image_alt }));
  stub.append(el("span", { className: "stamp", textContent: F.board.status_done }));
  const line = $("#wldone"); line.textContent = "✉ " + F.done_line; line.hidden = false;
}

ticket.replaceChildren(main, stub);
draw();

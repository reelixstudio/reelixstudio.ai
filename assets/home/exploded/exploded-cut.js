/* ============================================================
   EXPLODED CUT — reusable scroll-driven Three.js hero
   A film assembles → explodes into labeled component layers →
   parts swap out on scroll → recompresses into a new film.
   All content comes from a config object (see config.js).

   Usage:  new ExplodedCut(rootElement, window.STUDIO_CONFIG)
   ============================================================ */

import * as THREE from 'three';

const PLANE_W = 6.4, PLANE_H = 3.6;   // 16:9 film plane, world units
const RAIL = 9.5;                     // how far swapped parts slide on the x rail
const TEX_W = 1024, TEX_H = 576;

const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const seg = (p, a, b) => smooth((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- canvas texture factories ---------- */

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  return { c, x: c.getContext('2d') };
}

function frameBorder(x, color, w = 4) {
  x.strokeStyle = color;
  x.lineWidth = w;
  x.strokeRect(w / 2, w / 2, TEX_W - w, TEX_H - w);
}

function partTag(x, text, color) {
  x.font = '500 26px "IBM Plex Mono", monospace';
  x.fillStyle = color;
  x.textAlign = 'left';
  x.textBaseline = 'top';
  x.fillText(text, 28, 24);
}

function texFromCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function gradeTexture(tint, lut, isSwap) {
  const { c, x } = makeCanvas();
  const g = x.createLinearGradient(0, 0, TEX_W, TEX_H);
  g.addColorStop(0, tint + 'aa');
  g.addColorStop(1, tint + '22');
  x.fillStyle = g;
  x.fillRect(0, 0, TEX_W, TEX_H);
  frameBorder(x, isSwap ? '#ffb454' : 'rgba(233,237,244,.85)');
  partTag(x, lut, isSwap ? '#ffb454' : 'rgba(233,237,244,.9)');
  if (isSwap) {
    x.font = '500 26px "IBM Plex Mono", monospace';
    x.textAlign = 'right';
    x.fillStyle = '#ffb454';
    x.fillText('● NEW PART', TEX_W - 28, 24);
  }
  return texFromCanvas(c);
}

function storyTexture(text, isSwap) {
  const { c, x } = makeCanvas();
  x.fillStyle = 'rgba(9,14,26,.94)';
  x.fillRect(0, 0, TEX_W, TEX_H);
  frameBorder(x, isSwap ? '#ffb454' : 'rgba(233,237,244,.85)');
  partTag(x, isSwap ? '● NEW PART' : 'LOGLINE', isSwap ? '#ffb454' : 'rgba(233,237,244,.6)');
  x.font = '600 58px Archivo, sans-serif';
  x.fillStyle = isSwap ? '#ffb454' : '#e9edf4';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  // simple word wrap
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (x.measureText(test).width > TEX_W - 160) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  const lh = 72, y0 = TEX_H / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => x.fillText(l, TEX_W / 2, y0 + i * lh));
  return texFromCanvas(c);
}

/* animated layers redraw each frame */
function motionLayer() {
  const { c, x } = makeCanvas();
  const tex = texFromCanvas(c);
  const streaks = [];
  for (let i = 0; i < 16; i++) {
    streaks.push({ y: 40 + Math.random() * (TEX_H - 80), len: 90 + Math.random() * 260, sp: 60 + Math.random() * 220, off: Math.random() * TEX_W });
  }
  function draw(t) {
    x.clearRect(0, 0, TEX_W, TEX_H);
    frameBorder(x, 'rgba(233,237,244,.85)');
    partTag(x, 'VECTORS', 'rgba(233,237,244,.9)');
    x.lineWidth = 3;
    for (const s of streaks) {
      const sx = (s.off + t * s.sp) % (TEX_W + s.len) - s.len;
      const g = x.createLinearGradient(sx, 0, sx + s.len, 0);
      g.addColorStop(0, 'rgba(233,237,244,0)');
      g.addColorStop(1, 'rgba(233,237,244,.8)');
      x.strokeStyle = g;
      x.beginPath();
      x.moveTo(sx, s.y);
      x.lineTo(sx + s.len, s.y);
      x.stroke();
      x.fillStyle = 'rgba(233,237,244,.9)';
      x.beginPath();
      x.moveTo(sx + s.len, s.y - 6);
      x.lineTo(sx + s.len + 12, s.y);
      x.lineTo(sx + s.len, s.y + 6);
      x.fill();
    }
    tex.needsUpdate = true;
  }
  draw(0);
  return { tex, draw };
}

function soundLayer() {
  const { c, x } = makeCanvas();
  const tex = texFromCanvas(c);
  const N = 96;
  function draw(t) {
    x.clearRect(0, 0, TEX_W, TEX_H);
    frameBorder(x, 'rgba(233,237,244,.85)');
    partTag(x, 'WAVEFORM', 'rgba(233,237,244,.9)');
    const bw = (TEX_W - 120) / N;
    x.fillStyle = 'rgba(233,237,244,.85)';
    for (let i = 0; i < N; i++) {
      const h = (Math.sin(i * 0.55 + t * 2.4) * 0.5 + 0.5) * (Math.sin(i * 0.13 + t) * 0.5 + 0.5) * (TEX_H * 0.42) + 8;
      x.fillRect(60 + i * bw, TEX_H / 2 - h / 2, bw * 0.55, h);
    }
    tex.needsUpdate = true;
  }
  draw(0);
  return { tex, draw };
}

/* recipe card — what stands in for a film we don't ship
   (two-vault rule: store the recipe, never the footage) */
function recipeTexture(recipe) {
  const { c, x } = makeCanvas();
  x.fillStyle = 'rgba(9,14,26,.96)';
  x.fillRect(0, 0, TEX_W, TEX_H);
  frameBorder(x, 'rgba(233,237,244,.85)');
  partTag(x, 'RECIPE CARD', 'rgba(233,237,244,.6)');
  x.textAlign = 'left';
  x.textBaseline = 'top';
  x.font = '800 54px Archivo, sans-serif';
  x.fillStyle = '#e9edf4';
  x.fillText(recipe.title, 64, 92);
  x.font = '500 26px "IBM Plex Mono", monospace';
  x.fillStyle = 'rgba(233,237,244,.6)';
  x.fillText(recipe.sub, 64, 164);
  x.fillStyle = '#e9edf4';
  (recipe.stats || []).forEach((s, i) => x.fillText('· ' + s, 64, 232 + i * 46));
  x.fillStyle = '#ffb454';
  if (recipe.note) x.fillText(recipe.note, 64, 232 + (recipe.stats || []).length * 46 + 24);
  if (recipe.linkText) x.fillText(recipe.linkText, 64, TEX_H - 66);
  return texFromCanvas(c);
}

/* video element + texture, with a drawn fallback if the file fails.
   If `recipe` is given, the fallback is the film's recipe card. */
function videoTexture(src, label, recipe) {
  const v = document.createElement('video');
  v.src = src;
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.preload = 'auto';
  const tex = new THREE.VideoTexture(v);
  tex.colorSpace = THREE.SRGBColorSpace;
  const holder = { video: v, tex, failed: false };
  v.addEventListener('error', () => {
    holder.failed = true;
    if (recipe) holder.tex = recipeTexture(recipe);
    else {
      const { c, x } = makeCanvas();
      const g = x.createLinearGradient(0, 0, TEX_W, TEX_H);
      g.addColorStop(0, '#31517e'); g.addColorStop(1, '#6e4a7d');
      x.fillStyle = g; x.fillRect(0, 0, TEX_W, TEX_H);
      partTag(x, label + ' (video missing — check config.js)', '#e9edf4');
      holder.tex = texFromCanvas(c);
    }
    if (holder.onFallback) holder.onFallback(holder.tex);
  });
  return holder;
}

/* ---------- the hero ---------- */

export class ExplodedCut {
  constructor(root, cfg) {
    this.cfg = cfg;
    this.root = root;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.progress = 0;
    this.target = 0;
    this.time = 0;
    this.visible = true;
    this.buildDOM();
    this.buildScene();
    this.bind();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  /* -- DOM skeleton: tall scroll body + sticky stage + UI overlay -- */
  buildDOM() {
    const c = this.cfg;
    this.root.classList.add('ec-root');
    this.root.innerHTML =
      '<div class="ec-scroll" style="height:' + (c.scrollLength * 100) + 'vh">' +
        '<div class="ec-sticky">' +
          '<div class="ec-stage"></div>' +
          '<div class="ec-ui">' +
            '<div class="ec-brand">' + c.brand + '<span>' + c.subBrand + '</span></div>' +
            '<div class="ec-labels"></div>' +
            '<div class="ec-hint">' + c.hint + '</div>' +
            '<div class="ec-finale">' +
              '<h2>' + c.finale.headline + '</h2>' +
              '<p>' + c.finale.tagline + '</p>' +
              '<a class="rs-btn rs-btn-volt lp-cta" href="' + c.finale.cta.href + '">' + c.finale.cta.text + '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    this.scrollEl = this.root.querySelector('.ec-scroll');
    this.stage = this.root.querySelector('.ec-stage');
    this.labelsEl = this.root.querySelector('.ec-labels');
    this.hintEl = this.root.querySelector('.ec-hint');
    this.finaleEl = this.root.querySelector('.ec-finale');
  }

  buildScene() {
    const c = this.cfg;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.stage.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this.filmA = videoTexture(c.filmA.src, c.filmA.label, c.filmA.recipe);
    this.filmB = videoTexture(c.filmB.src, c.filmB.label, c.filmB.recipe);

    this.animated = [];   // {draw}
    this.layers = [];     // {cfg, group, meshA, meshB?, crossMesh?, labelEl, anchor}
    const n = c.layers.length;

    c.layers.forEach((L, i) => {
      const group = new THREE.Group();
      this.rig.add(group);
      const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H);

      let matA, meshB = null, crossMesh = null;

      if (L.type === 'video') {
        matA = new THREE.MeshBasicMaterial({ map: this.filmA.tex, toneMapped: false });
        this.filmA.onFallback = t => { matA.map = t; matA.needsUpdate = true; };
        const matX = new THREE.MeshBasicMaterial({ map: this.filmB.tex, transparent: true, opacity: 0, toneMapped: false });
        this.filmB.onFallback = t => { matX.map = t; matX.needsUpdate = true; };
        crossMesh = new THREE.Mesh(geo, matX);
        crossMesh.position.z = 0.002;
        crossMesh.renderOrder = i + 0.5;
        group.add(crossMesh);
      } else if (L.type === 'grade') {
        matA = new THREE.MeshBasicMaterial({ map: gradeTexture(L.tint, L.lut, false), transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
      } else if (L.type === 'motion') {
        const m = motionLayer();
        this.animated.push(m);
        matA = new THREE.MeshBasicMaterial({ map: m.tex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
      } else if (L.type === 'sound') {
        const s = soundLayer();
        this.animated.push(s);
        matA = new THREE.MeshBasicMaterial({ map: s.tex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
      } else { // story (an addIn layer has no A-side text — its slot starts empty)
        matA = new THREE.MeshBasicMaterial({ map: storyTexture(L.text || '', false), transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
      }

      const meshA = new THREE.Mesh(geo, matA);
      meshA.renderOrder = i;
      group.add(meshA);

      if (L.swap) {
        let tex;
        if (L.type === 'grade') tex = gradeTexture(L.swap.tint, L.swap.lut, true);
        else tex = storyTexture(L.swap.text, true);
        const matB = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });
        meshB = new THREE.Mesh(geo, matB);
        meshB.position.x = -RAIL;
        meshB.renderOrder = i;
        group.add(meshB);
      }

      const labelEl = document.createElement('div');
      labelEl.className = 'ec-label';
      labelEl.innerHTML = '<i></i><b>' + L.part + ' — ' + L.name + '</b>' +
        (L.swap ? '<em>' + L.swap.note + '</em>' : '');
      this.labelsEl.appendChild(labelEl);

      this.layers.push({ cfg: L, i, group, meshA, meshB, crossMesh, labelEl, anchor: new THREE.Vector3() });
    });
    this.n = n;
    this.resize();
  }

  bind() {
    addEventListener('resize', () => this.resize());
    addEventListener('scroll', () => this.readScroll(), { passive: true });
    const tryPlay = () => {
      this.filmA.video.play().catch(() => {});
      this.filmB.video.play().catch(() => {});
    };
    tryPlay();
    addEventListener('pointerdown', tryPlay, { once: true });
    new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
    }).observe(this.root);
    this.readScroll();
  }

  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // pull the camera back on narrow screens so the exploded stack still fits
    const halfW = 4.6;
    this.camera.position.z = Math.max(8.6, halfW / (Math.tan(THREE.MathUtils.degToRad(20)) * this.camera.aspect));
    this.camera.updateProjectionMatrix();
  }

  readScroll() {
    const r = this.scrollEl.getBoundingClientRect();
    const total = r.height - innerHeight;
    this.target = clamp01(-r.top / total);
  }

  update(p, t) {
    const T = this.cfg.timeline;

    // explode amount: rises through explode window, falls through recompress
    const e = seg(p, T.explodeStart, T.explodeEnd) * (1 - seg(p, T.recompressStart, T.recompressEnd));

    this.rig.rotation.x = -1.0 * e;
    this.rig.rotation.z = -0.52 * e;
    this.rig.position.y = 0.35 * e;
    const sc = 1 - 0.16 * e;
    this.rig.scale.setScalar(sc);

    const gap = lerp(0.02, 1.06, e);
    const mid = (this.n - 1) / 2;

    // label window: on after explode completes, off before recompress
    const labelOn = seg(p, T.explodeEnd - 0.07, T.explodeEnd) * (1 - seg(p, T.recompressStart - 0.04, T.recompressStart + 0.02));

    for (const L of this.layers) {
      L.group.position.z = (L.i - mid) * gap;
      const baseOp = L.cfg.type === 'grade' ? 0.8 * e : 0.95 * e;

      // swap animation, if this layer has one scheduled
      const sw = T.swaps.find(s => s.layer === L.cfg.id);
      let s = 0;
      if (sw && L.meshB) {
        s = seg(p, sw.at, sw.at + sw.span);
        L.meshA.position.x = s * RAIL;
        L.meshB.position.x = -RAIL * (1 - s);
        L.meshB.material.opacity = (L.cfg.type === 'grade' ? 0.85 : 0.97) * e * s;
      }
      if (L.cfg.type === 'video') {
        if (L.crossMesh) {
          const cp = seg(p, T.footageCross[0], T.footageCross[1]);
          L.crossMesh.material.opacity = cp;
        }
      } else {
        // an addIn layer has nothing on the A side — its slot stays empty
        L.meshA.material.opacity = L.cfg.addIn ? 0 : baseOp * (1 - s);
      }

      // project the label anchor to screen
      const el = L.labelEl;
      let lop = labelOn * (0.55 + 0.45 * Math.min(1, e * 2));
      if (L.cfg.addIn) lop *= s;   // label arrives with the new part
      if (lop < 0.02) { el.style.opacity = 0; }
      else {
        L.anchor.set(PLANE_W / 2 + 0.25, 0, 0);
        L.group.localToWorld(L.anchor);
        L.anchor.project(this.camera);
        const w = this.stage.clientWidth, h = this.stage.clientHeight;
        el.style.opacity = lop;
        el.style.transform = 'translate(' + ((L.anchor.x * 0.5 + 0.5) * w) + 'px,' + ((-L.anchor.y * 0.5 + 0.5) * h) + 'px) translateY(-50%)';
      }
      el.classList.toggle('is-swapped', s > 0.85);
    }

    this.hintEl.style.opacity = 1 - seg(p, 0.015, 0.06);
    const fin = seg(p, T.recompressEnd, Math.min(0.99, T.recompressEnd + 0.05));
    this.finaleEl.style.opacity = fin;
    this.finaleEl.style.pointerEvents = fin > 0.5 ? 'auto' : 'none';
  }

  tick(now) {
    requestAnimationFrame(this.tick);
    if (!this.visible) return;
    this.time = now / 1000;
    this.progress = this.reduced ? this.target : lerp(this.progress, this.target, 0.11);
    for (const a of this.animated) a.draw(this.time);
    this.update(this.progress, this.time);
    this.renderer.render(this.scene, this.camera);
  }
}

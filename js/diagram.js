/*
 * Quantum Bomb Tester — the interferometer bench (canvas renderer + photon animation).
 *
 * Visual rule: before detection the photon is drawn as two faint AMPLITUDE
 * waves (never as two half-sized photons). Only a detector click shows a whole
 * gold photon carrying the full energy hf.
 */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Sprites, Physics, Settings } = window.QBT;

  const W = 640;
  const H = 360;
  const INK = '#1b282d';
  const MIST = '#b9cbc9';
  const SAGE = '#749593';
  const GOLD = '#fec837';
  const CORAL = '#fd9978';
  const SLATE = '#525162';
  const RED = '#e8615a';
  const FONT = '"Pixelify Sans", "Courier New", monospace';

  const PATHS = {
    in: [[88, 292], [160, 292]],
    upper: [[160, 292], [160, 112], [480, 112]],
    lower: [[160, 292], [480, 292], [480, 112]],
    toD1: [[480, 112], [562, 112]],
    toD2: [[480, 112], [480, 58]],
  };
  const SPEC = { x: 480, y: 204 };
  const SPEC_FRAC = (320 + (292 - 204)) / 500;
  const PHASE_X = 300;
  const SLOT_POS = {
    cross: { x: 480, y: 112 },
    upper: { x: 330, y: 112 },
    lower: { x: 330, y: 292 },
  };

  let canvas, ctx;
  let running = false;
  let st = null;
  let anim = null;
  const flashes = {};
  let hoverSlot = null;
  let slotCb = null;

  function defaults() {
    return {
      bs2: true,
      slots: null, // ['cross','upper','lower'] when the player must place BS2
      phaseDeg: 0,
      showPhase: false,
      specimen: 'none', // none | slot | visible | hidden | damaged | revealEmpty | revealPresent
      overlay: false,
      labels: { d1: 'D1 bright', d2: 'D2 dark' },
      counts: { d1: 0, d2: 0, absorbed: 0 },
    };
  }

  function init(cv) {
    canvas = cv;
    ctx = cv.getContext('2d');
    st = defaults();
    cv.addEventListener('click', (e) => {
      const p = toLocal(e);
      const s = slotAt(p.x, p.y);
      if (s && slotCb) slotCb(s);
    });
    cv.addEventListener('mousemove', (e) => {
      const p = toLocal(e);
      hoverSlot = slotAt(p.x, p.y);
      cv.style.cursor = hoverSlot ? 'pointer' : 'default';
    });
  }
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function slotAt(x, y) {
    if (!st.slots) return null;
    for (const id of st.slots) {
      const p = SLOT_POS[id];
      if (Math.abs(x - p.x) < 26 && Math.abs(y - p.y) < 26) return id;
    }
    return null;
  }

  function set(patch) {
    st = Object.assign(st || defaults(), patch);
  }
  function reset(patch) {
    st = Object.assign(defaults(), patch || {});
    anim = null;
  }
  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
  }
  function loop(t) {
    if (!running) return;
    draw(t);
    requestAnimationFrame(loop);
  }

  // ---------- drawing helpers ----------
  const px = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  function txt(s, x, y, color, size, align) {
    ctx.font = `${size || 15}px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(s, x + 2, y + 2);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(s, x, y);
  }
  function frameRect(x, y, w, h, fill, line) {
    px(x - 4, y - 4, w + 8, h + 8, INK);
    px(x, y, w, h, line || MIST);
    px(x + 4, y + 4, w - 8, h - 8, fill);
  }
  function dashed(points, color, gap) {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      for (let d = 0; d < len; d += gap || 10) {
        const x = x1 + ((x2 - x1) * d) / len;
        const y = y1 + ((y2 - y1) * d) / len;
        px(x - 2, y - 2, 4, 4, color);
      }
    }
  }
  function along(points, f) {
    let total = 0;
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const l = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
      segs.push(l);
      total += l;
    }
    let d = Math.max(0, Math.min(1, f)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const k = segs[i] ? d / segs[i] : 0;
        return { x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k, dx: (x2 - x1) / segs[i], dy: (y2 - y1) / segs[i] };
      }
      d -= segs[i];
    }
    return { x: points[0][0], y: points[0][1], dx: 1, dy: 0 };
  }

  function drawSplitter(x, y, ghost) {
    if (ghost) {
      ctx.globalAlpha = 0.5;
    }
    px(x - 16, y - 16, 32, 32, INK);
    px(x - 13, y - 13, 26, 26, 'rgba(185,203,201,0.55)');
    for (let i = 0; i < 7; i++) px(x - 14 + i * 4, y + 10 - i * 4, 4, 4, '#fff');
    ctx.globalAlpha = 1;
  }
  function drawMirror(x, y, backing) {
    for (let i = 0; i < 9; i++) {
      const bx = x - 18 + i * 4;
      const by = y + 14 - i * 4;
      px(bx + backing * 4, by - backing * 4, 6, 6, SLATE);
      px(bx, by, 6, 6, MIST);
    }
    px(x - 2, y - 2, 4, 4, '#fff');
  }
  function drawDetector(id, x, y, facing, label, count) {
    const lit = flashes[id] && performance.now() - flashes[id] < 650;
    if (lit) {
      const a = 1 - (performance.now() - flashes[id]) / 650;
      ctx.globalAlpha = 0.35 * a;
      px(x - 34, y - 34, 68, 68, GOLD);
      ctx.globalAlpha = 1;
    }
    frameRect(x - 20, y - 20, 40, 40, SLATE, lit ? GOLD : MIST);
    // lens facing the incoming beam
    if (facing === 'left') px(x - 24, y - 6, 6, 12, MIST);
    if (facing === 'down') px(x - 6, y + 18, 12, 6, MIST);
    px(x - 8, y - 8, 16, 16, lit ? GOLD : '#2b2b35');
    if (lit) px(x - 4, y - 4, 8, 8, '#fff');
    return { label, count };
  }

  function drawSpecimen() {
    const s = st.specimen;
    const { x, y } = SPEC;
    const hit = flashes.spec && performance.now() - flashes.spec < 700;
    if (s === 'none') return;
    if (s === 'slot') {
      ctx.globalAlpha = 0.5;
      dashed([[x - 18, y - 18], [x + 18, y - 18], [x + 18, y + 18], [x - 18, y + 18], [x - 18, y - 18]], MIST, 8);
      ctx.globalAlpha = 1;
      return;
    }
    if (hit) {
      ctx.globalAlpha = 0.45 * (1 - (performance.now() - flashes.spec) / 700);
      px(x - 34, y - 34, 68, 68, RED);
      ctx.globalAlpha = 1;
    }
    if (s === 'visible' || s === 'revealPresent') {
      px(x - 22, y + 14, 44, 8, SLATE);
      Sprites.drawIcon(ctx, 'specimen', x - 16, y - 18, 4);
      txt(s === 'revealPresent' ? 'specimen (intact)' : 'specimen', x + 28, y, CORAL, 14);
    } else if (s === 'damaged') {
      px(x - 22, y + 14, 44, 8, SLATE);
      Sprites.drawIcon(ctx, 'damage', x - 16, y - 18, 4);
      txt('damaged!', x + 28, y, RED, 14);
    } else if (s === 'hidden') {
      frameRect(x - 22, y - 22, 44, 44, SLATE, SAGE);
      for (let i = 0; i < 4; i++) px(x - 18 + i * 10, y - 18, 4, 36, '#46455a');
      txt('?', x, y + 1, GOLD, 26, 'center');
      txt('sealed holder', x + 30, y, MIST, 14);
    } else if (s === 'revealEmpty') {
      ctx.globalAlpha = 0.7;
      dashed([[x - 20, y - 20], [x + 20, y - 20], [x + 20, y + 20], [x - 20, y + 20], [x - 20, y - 20]], MIST, 8);
      ctx.globalAlpha = 1;
      txt('empty', x + 28, y, MIST, 14);
    }
  }

  function drawPhasor(cx, cy, r, amp, color, title, sub) {
    ctx.strokeStyle = 'rgba(185,203,201,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    px(cx - 1, cy - r, 2, 2 * r, 'rgba(185,203,201,0.25)');
    px(cx - r, cy - 1, 2 * r, 2, 'rgba(185,203,201,0.25)');
    const len = Physics.abs(amp) * r;
    if (len > 0.5) arrow(cx, cy, cx + amp.re * r, cy - amp.im * r, color);
    else px(cx - 3, cy - 3, 6, 6, color);
    if (title) txt(title, cx, cy - r - 12, color, 13, 'center');
    if (sub) txt(sub, cx, cy + r + 12, '#fff', 13, 'center');
  }
  function arrow(x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = (width || 4) + 3;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    const h = 9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * h, y2 - Math.sin(a - 0.5) * h);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * h, y2 - Math.sin(a + 0.5) * h);
    ctx.closePath();
    ctx.fill();
  }

  function drawOverlay() {
    const visibleSpecimen = st.specimen === 'visible';
    if (st.specimen === 'hidden') {
      txt('Amplitudes hidden: the holder is sealed', 320, 214, MIST, 14, 'center');
      return;
    }
    const a = Physics.analyse({ bs2: st.bs2, phaseDeg: st.phaseDeg, specimen: visibleSpecimen });
    const pct = (p) => Math.round(p * 100) + '%';
    drawPhasor(320, 64, 30, a.upper, GOLD, 'upper path', '|a|² = ' + Physics.abs2(a.upper).toFixed(2));
    drawPhasor(380, 226, 30, a.lower, CORAL, 'lower path', '|a|² = ' + Physics.abs2(a.lower).toFixed(2));
    if (visibleSpecimen) txt('absorbed: ' + pct(a.P.absorbed), SPEC.x, SPEC.y + 42, RED, 13, 'center');
    drawPhasor(590, 292, 26, a.d1, '#fff', 'to D1', 'P = ' + pct(a.P.d1));
    drawPhasor(404, 40, 26, a.d2, '#fff', '', 'P(D2) = ' + pct(a.P.d2));
  }

  function drawPacket(p, alpha, t, label) {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = Math.min(1, 0.25 + alpha);
    const perp = { x: -p.dy, y: p.dx };
    for (let k = -4; k <= 4; k++) {
      const off = Math.sin(k * 1.1 - t * 0.02) * 6;
      const x = p.x - p.dx * k * 4 + perp.x * off;
      const y = p.y - p.dy * k * 4 + perp.y * off;
      px(x - 3, y - 3, 6, 6, MIST);
    }
    ctx.globalAlpha = 1;
    if (label) txt(label, p.x + perp.x * 18, p.y + perp.y * 18 - 4, MIST, 12, 'center');
  }
  function drawPhoton(x, y, t) {
    const g = 0.35 + 0.2 * Math.sin(t * 0.03);
    ctx.globalAlpha = g;
    px(x - 14, y - 14, 28, 28, GOLD);
    ctx.globalAlpha = 1;
    Sprites.drawIcon(ctx, 'photon', x - 8, y - 8, 2);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // bench backdrop
    px(0, 0, W, H, '#30474e');
    for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? 0 : 24; x < W; x += 48) px(x, y, 24, 24, '#344c53');

    // beam paths (possible routes)
    const pathCol = 'rgba(116,149,147,0.9)';
    dashed(PATHS.in, pathCol);
    dashed(PATHS.upper, pathCol);
    dashed(PATHS.lower, pathCol);
    dashed(PATHS.toD1, pathCol);
    dashed(PATHS.toD2, pathCol);

    // source
    frameRect(24, 272, 64, 40, SLATE);
    px(80, 284, 8, 16, CORAL);
    px(36, 284, 24, 16, '#2b2b35');
    px(40, 288, 8, 8, CORAL);
    txt('photon source', 58, 334, MIST, 14, 'center');
    txt('one photon at a time', 70, 350, SAGE, 12, 'center');

    drawSplitter(160, 292);
    txt('BS1', 136, 318, MIST, 14, 'center');
    drawMirror(160, 112, -1);
    drawMirror(480, 292, 1);

    if (st.bs2) {
      drawSplitter(480, 112);
      txt('BS2', 512, 140, MIST, 14, 'center');
    }
    if (st.slots) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.006);
      st.slots.forEach((id) => {
        const p = SLOT_POS[id];
        ctx.globalAlpha = hoverSlot === id ? 1 : 0.45 + 0.4 * pulse;
        const c = hoverSlot === id ? GOLD : MIST;
        [[-18, -18], [10, -18], [-18, 10], [10, 10]].forEach(([dx, dy]) => {
          px(p.x + dx, p.y + dy, 8, 3, c);
          px(p.x + dx + (dx < 0 ? 0 : 5), p.y + dy, 3, 8, c);
        });
        px(p.x - 6, p.y - 1, 12, 3, c);
        px(p.x - 1, p.y - 6, 3, 12, c);
        ctx.globalAlpha = 1;
      });
    }

    if (st.showPhase) {
      px(PHASE_X - 8, 268, 16, 48, INK);
      px(PHASE_X - 5, 271, 10, 42, 'rgba(254,200,55,0.55)');
      px(PHASE_X - 3, 273, 3, 38, 'rgba(255,255,255,0.6)');
      txt('φ = ' + st.phaseDeg + '°', PHASE_X, 254, GOLD, 15, 'center');
      txt('phase shifter', PHASE_X, 330, SAGE, 12, 'center');
    }

    drawSpecimen();

    drawDetector('d1', 584, 112, 'left');
    drawDetector('d2', 480, 36, 'down');
    txt(st.labels.d1, 584, 150, '#fff', 14, 'center');
    txt('× ' + st.counts.d1, 584, 168, GOLD, 15, 'center');
    txt(st.labels.d2, 512, 26, '#fff', 14, 'left');
    txt('× ' + st.counts.d2, 512, 46, GOLD, 15, 'left');
    txt('upper path', 240, 98, SAGE, 13, 'center');
    txt('lower path', 240, 278, SAGE, 13, 'center');

    if (st.overlay && !anim) drawOverlay();
    if (anim) stepAnim(t);
  }

  // ---------- photon animation ----------
  function speedFactor() {
    const s = Settings.get().animSpeed;
    return s === 'slow' ? 1.6 : s === 'fast' ? 0.55 : 1;
  }

  /**
   * Animate one photon. outcome: 'd1' | 'd2' | 'absorbed'.
   * analysis: Physics.analyse(...) result for the TRUE configuration.
   * opts.hidden: holder is sealed — never show amplitude information that would leak its contents.
   */
  function animate(outcome, analysis, opts) {
    const o = opts || {};
    let k = speedFactor() * (o.fast ? 0.32 : 1);
    if (Settings.get().reducedMotion) k = 0.0001;
    const T0 = 420 * k;
    const T1 = 820 * k;
    const T2 = 380 * k;
    return new Promise((resolve) => {
      anim = { outcome, a: analysis, o, t0: performance.now(), T0, T1, T2, resolve, done: false, clicked: false };
      if (k < 0.01) finishAnim();
    });
  }
  function finishAnim() {
    if (!anim) return;
    const a = anim;
    if (!a.clicked) {
      a.clicked = true;
      if (a.outcome === 'absorbed') flashes.spec = performance.now();
      else flashes[a.outcome] = performance.now();
      if (a.o.onClick) a.o.onClick();
    }
    anim = null;
    a.resolve();
  }
  function stepAnim(t) {
    const a = anim;
    const el = performance.now() - a.t0;
    const label = !a.o.fast;
    if (el < a.T0) {
      const p = along(PATHS.in, el / a.T0);
      drawPhoton(p.x, p.y, t);
      return;
    }
    const e1 = el - a.T0;
    const specPresent = a.a.specimen;
    const absorbed = a.outcome === 'absorbed';
    if (e1 < a.T1) {
      const f = e1 / a.T1;
      if (absorbed && f >= SPEC_FRAC) {
        // amplitude collapses: the whole photon is absorbed at the specimen
        if (!a.clicked) {
          a.clicked = true;
          flashes.spec = performance.now();
          a.absorbAt = performance.now();
          if (a.o.onClick) a.o.onClick();
        }
      }
      if (a.absorbAt) {
        drawPhoton(SPEC.x, SPEC.y, t);
        if (performance.now() - a.absorbAt > 450 * Math.max(0.4, a.T1 / 820)) finishAnim();
        return;
      }
      drawPacket(along(PATHS.upper, f), 0.7, t, label ? 'amplitude' : null);
      const lowerF = specPresent || a.o.hidden ? Math.min(f, SPEC_FRAC - 0.05) : f;
      if (!(a.o.hidden && f > SPEC_FRAC - 0.05)) drawPacket(along(PATHS.lower, lowerF), specPresent && f > SPEC_FRAC - 0.05 ? 0.2 : 0.7, t, label ? 'amplitude' : null);
      return;
    }
    const e2 = e1 - a.T1;
    if (e2 < a.T2) {
      const f = e2 / a.T2;
      let w1 = 0.5;
      let w2 = 0.5;
      if (!a.o.hidden) {
        const s = a.a.P.d1 + a.a.P.d2 || 1;
        w1 = a.a.P.d1 / s;
        w2 = a.a.P.d2 / s;
      }
      if (w1 > 0) drawPacket(along(PATHS.toD1, f), w1 * 0.8, t);
      if (w2 > 0) drawPacket(along(PATHS.toD2, f), w2 * 0.8, t);
      return;
    }
    if (!a.clicked) {
      a.clicked = true;
      flashes[a.outcome] = performance.now();
      if (a.o.onClick) a.o.onClick();
    }
    const pos = a.outcome === 'd1' ? { x: 584, y: 112 } : { x: 480, y: 36 };
    const e3 = e2 - a.T2;
    drawPhoton(pos.x, pos.y, t);
    if (!a.o.fast) txt('click! 1 whole photon (E = hf)', pos.x - 10, pos.y + (a.outcome === 'd1' ? 40 : 34), GOLD, 13, 'right');
    if (e3 > (a.o.fast ? 120 : 520) * Math.max(0.5, speedFactor())) finishAnim();
  }

  window.QBT.Diagram = {
    init,
    set,
    reset,
    start,
    stop,
    animate,
    get: () => st,
    onSlot: (fn) => (slotCb = fn),
    flash: (id) => (flashes[id] = performance.now()),
    W,
    H,
  };
})();

/*
 * Quantum Bomb Tester — "Amplitude Explorer" modal.
 * Tabs: the two paths (with amplitude bars), amplitude graphs, how the
 * amplitudes combine at BS2 (optional), and why an amplitude is not half a photon.
 */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Physics, UI, Sprites, Audio } = window.QBT;

  const INK = '#1b282d';
  const MIST = '#b9cbc9';
  const SAGE = '#749593';
  const GOLD = '#fec837';
  const CORAL = '#fd9978';
  const RED = '#e8615a';
  const FONT = '"Pixelify Sans", "Courier New", monospace';
  const CW = 760;
  const CH = 300;

  const TABS = {
    paths: { label: 'Two paths' },
    graphs: { label: 'Amplitude graphs' },
    combine: { label: 'Combining at BS2' },
    halves: { label: 'Not half-photons!' },
  };

  function txt(ctx, s, x, y, color, size, align) {
    ctx.font = `${size || 15}px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(s, x + 2, y + 2);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(s, x, y);
  }
  function arrow(ctx, x1, y1, x2, y2, color, w) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) {
      ctx.fillStyle = color;
      ctx.fillRect(x1 - 3, y1 - 3, 6, 6);
      return;
    }
    ctx.lineCap = 'square';
    ctx.strokeStyle = INK;
    ctx.lineWidth = (w || 4) + 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3);
    ctx.lineTo(x2 - Math.cos(a - 0.5) * 11, y2 - Math.sin(a - 0.5) * 11);
    ctx.lineTo(x2 - Math.cos(a + 0.5) * 11, y2 - Math.sin(a + 0.5) * 11);
    ctx.closePath();
    ctx.fill();
  }
  function dottedCircle(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(185,203,201,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const pct = (p) => Math.round(p * 100) + '%';
  const fmt = (c) => {
    const re = Math.abs(c.re) < 1e-9 ? 0 : c.re;
    const im = Math.abs(c.im) < 1e-9 ? 0 : c.im;
    if (!re && !im) return '0';
    const r = re ? re.toFixed(2) : '';
    const i = im ? (im > 0 && re ? '+' : '') + im.toFixed(2) + 'i' : '';
    return r + i;
  };

  // ---------- tab renderers ----------
  function drawPaths(ctx, a, s, t) {
    // schematic
    const X0 = 70;
    const X1 = 330;
    const Y0 = 60;
    const Y1 = 230;
    ctx.fillStyle = 'rgba(116,149,147,0.8)';
    const dash = (x1, y1, x2, y2, c) => {
      const L = Math.hypot(x2 - x1, y2 - y1);
      ctx.fillStyle = c;
      for (let d = 0; d < L; d += 10) ctx.fillRect(x1 + ((x2 - x1) * d) / L - 2, y1 + ((y2 - y1) * d) / L - 2, 4, 4);
    };
    dash(20, Y1, X0, Y1, SAGE);
    dash(X0, Y1, X0, Y0, GOLD);
    dash(X0, Y0, X1, Y0, GOLD);
    dash(X0, Y1, X1, Y1, CORAL);
    dash(X1, Y1, X1, s.block ? 150 : Y0, CORAL);
    dash(X1, Y0, X1 + 50, Y0, SAGE);
    dash(X1, Y0, X1, Y0 - 40, SAGE);
    [[X0, Y1], [X1, Y0]].forEach(([x, y]) => {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 13, y - 13, 26, 26);
      ctx.fillStyle = 'rgba(185,203,201,0.6)';
      ctx.fillRect(x - 10, y - 10, 20, 20);
    });
    txt(ctx, 'BS1', X0 - 24, Y1 + 24, MIST, 14);
    txt(ctx, 'BS2', X1 + 14, Y0 + 24, MIST, 14);
    txt(ctx, 'D1', X1 + 56, Y0, '#fff', 14);
    txt(ctx, 'D2', X1 + 6, Y0 - 48, '#fff', 14);
    if (s.block) {
      Sprites.drawIcon(ctx, 'specimen', X1 - 12, 136, 3);
      txt(ctx, 'blocked', X1 + 18, 150, RED, 13);
    }
    ctx.fillStyle = 'rgba(254,200,55,0.6)';
    ctx.fillRect(196, Y1 - 18, 10, 36);
    txt(ctx, 'φ = ' + s.phase + '°', 201, Y1 + 32, GOLD, 13, 'center');
    // phasors on each path
    const R = 34;
    dottedCircle(ctx, 200, 120, R);
    arrow(ctx, 200, 120, 200 + a.upper.re * R * 1.4, 120 - a.upper.im * R * 1.4, GOLD);
    txt(ctx, 'upper amplitude', 200, 72, GOLD, 13, 'center');
    txt(ctx, fmt(a.upper), 200, 168, GOLD, 13, 'center');
    dottedCircle(ctx, 268, 170, R * 0.8);
    arrow(ctx, 268, 170, 268 + a.lower.re * R * 1.1, 170 - a.lower.im * R * 1.1, CORAL);
    txt(ctx, 'lower', 268, 270, CORAL, 13, 'center');
    txt(ctx, fmt(a.lower), 268, 284, CORAL, 13, 'center');

    // bar chart
    const bars = [
      { label: 'upper\n|a|²', v: Physics.abs2(a.upper), c: GOLD },
      { label: 'lower\n|a|²', v: Physics.abs2(a.lower), c: CORAL },
      { label: 'P(D1)', v: a.P.d1, c: '#fff' },
      { label: 'P(D2)', v: a.P.d2, c: '#fff' },
      { label: 'P(abs.)', v: a.P.absorbed, c: RED },
    ];
    const bx = 420;
    const by = 240;
    const bh = 170;
    ctx.fillStyle = 'rgba(185,203,201,0.3)';
    ctx.fillRect(bx - 10, by, 340, 3);
    txt(ctx, 'after BS1', bx + 40, 50, SAGE, 13, 'center');
    txt(ctx, 'outcomes', bx + 230, 50, SAGE, 13, 'center');
    bars.forEach((b, i) => {
      const x = bx + i * 66 + (i >= 2 ? 20 : 0);
      const h = Math.round(b.v * bh);
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, by - h - 2, 40, h + 2);
      ctx.fillStyle = b.c;
      ctx.fillRect(x, by - h, 36, h);
      txt(ctx, pct(b.v), x + 18, by - h - 14, b.c, 13, 'center');
      b.label.split('\n').forEach((ln, k) => txt(ctx, ln, x + 18, by + 16 + k * 15, MIST, 12, 'center'));
    });
  }

  function drawGraphs(ctx, a, s, t) {
    const panels = [
      { x: 10, title: 'Arriving at D1', c: a.contrib.d1, P: a.P.d1 },
      { x: 390, title: 'Arriving at D2', c: a.contrib.d2, P: a.P.d2 },
    ];
    const w = 360;
    const cy = 150;
    const A = 70; // pixels per unit amplitude
    panels.forEach((p) => {
      ctx.fillStyle = 'rgba(27,40,45,0.35)';
      ctx.fillRect(p.x, 20, w, 260);
      txt(ctx, p.title, p.x + 12, 36, '#fff', 15);
      txt(ctx, 'P = |sum|² = ' + p.P.toFixed(2), p.x + w - 12, 36, GOLD, 15, 'right');
      ctx.fillStyle = 'rgba(185,203,201,0.25)';
      ctx.fillRect(p.x + 10, cy, w - 20, 2);
      const sum = Physics.add(p.c[0], p.c[1]);
      const waves = [
        { c: p.c[0], col: GOLD, lw: 3 },
        { c: p.c[1], col: CORAL, lw: 3 },
        { c: sum, col: '#fff', lw: 5 },
      ];
      waves.forEach((wv) => {
        const amp = Physics.abs(wv.c);
        const ph = Physics.arg(wv.c);
        ctx.strokeStyle = wv.col;
        ctx.lineWidth = wv.lw;
        ctx.beginPath();
        for (let i = 0; i <= w - 20; i += 3) {
          const th = (i / (w - 20)) * 4 * Math.PI - t * 0.002;
          const y = cy - amp * A * Math.cos(th + ph);
          if (i === 0) ctx.moveTo(p.x + 10 + i, y);
          else ctx.lineTo(p.x + 10 + i, y);
        }
        ctx.stroke();
      });
      txt(ctx, p.title.includes('D1') ? '— A(RT), upper' : '— A(RR), upper', p.x + 12, 252, GOLD, 13);
      txt(ctx, p.title.includes('D1') ? '— A(TR), lower' : '— A(TT), lower', p.x + 130, 252, CORAL, 13);
      txt(ctx, '— sum', p.x + 250, 252, '#fff', 13);
      if (p.P < 0.005) txt(ctx, 'cancel: flat line', p.x + w / 2, cy - 30, '#fff', 14, 'center');
    });
  }

  function drawCombine(ctx, a, s) {
    const panels = [
      { cx: 190, title: 'To D1 (bright)', c: a.contrib.d1, P: a.P.d1, notes: ['A(RT): reflect, mirror, transmit', 'A(TR): transmit, φ, mirror, reflect'] },
      { cx: 570, title: 'To D2 (dark)', c: a.contrib.d2, P: a.P.d2, notes: ['A(RR): reflect, mirror, reflect', 'A(TT): transmit, φ, mirror, transmit'] },
    ];
    const R = 110;
    panels.forEach((p) => {
      const ox = p.cx;
      const oy = 160;
      dottedCircle(ctx, ox, oy, R);
      dottedCircle(ctx, ox, oy, R / 2);
      txt(ctx, p.title, ox, 24, '#fff', 16, 'center');
      const [c1, c2] = p.c;
      const x1 = ox + c1.re * R;
      const y1 = oy - c1.im * R;
      const x2 = x1 + c2.re * R;
      const y2 = y1 - c2.im * R;
      arrow(ctx, ox, oy, x2, y2, '#fff', 6);
      arrow(ctx, ox, oy, x1, y1, GOLD, 4);
      arrow(ctx, x1, y1, x2, y2, CORAL, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox - 3, oy - 3, 6, 6);
      txt(ctx, p.notes[0], ox, 244, GOLD, 13, 'center');
      txt(ctx, p.notes[1], ox, 262, CORAL, 13, 'center');
      txt(ctx, 'resultant² = P = ' + p.P.toFixed(2), ox, 284, '#fff', 14, 'center');
    });
    txt(ctx, 'outer ring: length 1', 380, 160, SAGE, 12, 'center');
  }

  function drawHalves(ctx, a, s, t) {
    const scene = (x0, wrong) => {
      ctx.fillStyle = 'rgba(27,40,45,0.35)';
      ctx.fillRect(x0, 10, 360, 280);
      txt(ctx, wrong ? '✗ Wrong picture: split energy' : '✓ Amplitude picture', x0 + 180, 30, wrong ? RED : '#9bd48a', 16, 'center');
      const bx = x0 + 80;
      const by = 200;
      ctx.fillStyle = INK;
      ctx.fillRect(bx - 13, by - 13, 26, 26);
      ctx.fillStyle = 'rgba(185,203,201,0.6)';
      ctx.fillRect(bx - 10, by - 10, 20, 20);
      // detectors
      const dA = { x: bx + 200, y: by };
      const dB = { x: bx, y: by - 130 };
      const f = (t % 2400) / 2400;
      const pick = [0, 1, 0, 0, 1, 1, 0, 1][Math.floor(t / 2400) % 8]; // which detector clicks this cycle
      [dA, dB].forEach((d, i) => {
        let lit = 0;
        if (wrong) lit = f > 0.55 ? 0.45 : 0;
        else lit = f > 0.55 && i === pick ? 1 : 0;
        ctx.fillStyle = INK;
        ctx.fillRect(d.x - 18, d.y - 18, 36, 36);
        ctx.fillStyle = '#525162';
        ctx.fillRect(d.x - 14, d.y - 14, 28, 28);
        ctx.globalAlpha = lit ? lit : 1;
        ctx.fillStyle = lit ? GOLD : '#2b2b35';
        ctx.fillRect(d.x - 7, d.y - 7, 14, 14);
        ctx.globalAlpha = 1;
      });
      // incoming photon
      if (f < 0.25) Sprites.drawIcon(ctx, 'photon', x0 + 10 + f * 4 * 60 - 8, by - 8, 2);
      else if (f < 0.55) {
        const g = (f - 0.25) / 0.3;
        const pA = { x: bx + g * 180, y: by };
        const pB = { x: bx, y: by - g * 112 };
        if (wrong) {
          Sprites.drawIcon(ctx, 'photon', pA.x - 4, pA.y - 4, 1);
          Sprites.drawIcon(ctx, 'photon', pB.x - 4, pB.y - 4, 1);
          txt(ctx, 'hf/2', pA.x, pA.y + 18, GOLD, 12, 'center');
          txt(ctx, 'hf/2', pB.x + 24, pB.y, GOLD, 12, 'left');
        } else {
          [pA, pB].forEach((p, i) => {
            for (let k = -3; k <= 3; k++) {
              const off = Math.sin(k + t * 0.02) * 5;
              ctx.fillStyle = 'rgba(185,203,201,0.8)';
              if (i === 0) ctx.fillRect(p.x - k * 4 - 2, p.y + off - 2, 4, 4);
              else ctx.fillRect(p.x + off - 2, p.y + k * 4 - 2, 4, 4);
            }
          });
          txt(ctx, 'amplitude (no energy)', bx + 100, by + 28, MIST, 12, 'center');
        }
      } else {
        if (wrong) {
          txt(ctx, 'both detectors: half-energy blips', x0 + 180, 262, RED, 13, 'center');
          txt(ctx, 'NEVER observed', x0 + 180, 280, RED, 14, 'center');
        } else {
          const d = pick === 0 ? dA : dB;
          Sprites.drawIcon(ctx, 'photon', d.x + (pick ? 24 : -8), d.y - (pick ? 8 : 30), 2);
          txt(ctx, 'one detector, full energy hf', x0 + 180, 262, '#9bd48a', 13, 'center');
          txt(ctx, 'what experiments see', x0 + 180, 280, '#9bd48a', 14, 'center');
        }
      }
    };
    scene(10, true);
    scene(390, false);
  }

  const TEXT = {
    paths: (a, s) => `
      <p>BS1 acts like the matrix M = (1/√2)(1 i; i 1). The photon leaves in a <b class="hl">superposition</b> of both paths:
      (|0⟩ + i|1⟩)/√2, with |0⟩ = lower (transmitted) and |1⟩ = upper (reflected, picks up the factor i).</p>
      <p>Each coefficient is a <b class="hl">probability amplitude</b>, a complex number you can picture as an <b>arrow</b>.
      Its <b>length²</b> is a probability (here |1/√2|² = |i/√2|² = ½) and its <b>direction</b> is the phase.</p>
      <p>Each path has |a|² = 0.50. That means a <i>50% chance of finding the photon there if you looked</i>, not half a photon travelling each way.
      ${s.block ? 'The specimen absorbs the lower path: that 50% becomes the absorption probability, and nothing continues past it.' : ''}</p>`,
    graphs: (a, s) => `
      <p>These graphs plot the <b class="hl">probability amplitudes</b> arriving at each detector, one from each path, drawn as waves.
      They are not the energy of half a photon. To get a probability, <b>add the two waves first, then square the size of the sum</b>.</p>
      <p class="muted">Same maths as classical waves (lecture 3b): adding A₁ sin(kx − ωt + φ₁) and A₂ sin(kx − ωt + φ₂) gives
      A₁² + A₂² + 2A₁A₂ cos(φ₁ − φ₂). Only the phase difference matters. The difference here: the waves are amplitudes for ONE photon.</p>
      <p>${a.P.d2 < 0.005 && !s.block ? 'At D2 the two waves are exactly out of step and cancel: D2 stays dark.' : s.block ? 'With the lower path blocked only one wave arrives. There is nothing to cancel against, so both detectors get 25%.' : 'Try the phase slider and watch the waves slide in and out of step.'}</p>`,
    combine: (a, s) => `
      <p><b>Rules (lecture 3b):</b> transmission multiplies by √T = 1/√2, reflection by i√R = i/√2 (a quarter-turn), and each mirror by i. The phase shifter turns the lower arrow by φ.
      Multiply along a path, add the paths that end in the same place, square at the end.</p>
      <p>At BS2, place the two arrows head-to-tail (<span class="hl">upper</span> then <span class="hl2">lower</span>).
      The white resultant’s length squared is the probability.</p>
      <p>At φ = 0°: A(RT) = A(TR) = −½, so P(D1) = |−½ − ½|² = 1. A(RR) = −i/2 and A(TT) = +i/2, so P(D2) = 0.
      Classically we would add probabilities instead (¼ + ¼ = ½ for each detector); the quantum cross term makes one port 1 and the other 0.
      ${s.block ? 'With the lower path blocked, the coral arrow is gone: only the gold one arrives, giving ¼ at each detector.' : s.phase % 360 ? `At φ = ${s.phase}° the coral arrow is turned, so neither detector gets perfect adding or cancelling.` : ''}</p>`,
    halves: () => `
      <p><b>An amplitude is not a piece of the photon.</b> A photon’s energy E = hf is never split.
      If the photon really split into two half-energy pieces, both detectors would register a half-sized blip every time.</p>
      <p>Experiments see the opposite: exactly <b>one</b> detector clicks, always with the <b>full</b> energy hf
      (Grangier, Roger &amp; Aspect, 1986). The amplitudes only decide the <i>probability</i> of where the whole photon turns up.</p>
      <p>Light <b>travels as a wave</b> (exploring both paths and interfering with itself) but <b>arrives as a particle</b>, delivering all its energy at once.
      The photon is not interfering with another photon: each photon interferes with itself.</p>`,
  };

  /**
   * open({ tab, phaseDeg, block, lockPhase, lockBlock, guided:[tab ids] })
   * Resolves when the player closes it (or finishes the guided tour).
   */
  function open(opts) {
    const o = opts || {};
    const s = { tab: o.tab || 'paths', phase: o.phaseDeg || 0, block: !!o.block };
    const guided = o.guided || null;
    const tabs = guided ? Object.keys(TABS).filter((k) => guided.includes(k) || k === 'combine') : Object.keys(TABS);
    let raf = null;

    const root = document.createElement('div');
    root.className = 'explainer';
    root.innerHTML = `
      <div class="tabs" role="tablist">${tabs
        .map((k) => `<button type="button" role="tab" class="tab" data-tab="${k}">${TABS[k].label}${k === 'combine' && guided ? ' <small>(optional)</small>' : ''}</button>`)
        .join('')}</div>
      <div class="ex-controls">
        <label class="phase-ctl">Phase shift φ <input type="range" min="0" max="360" step="15" value="${s.phase}"> <b class="phase-val">${s.phase}°</b></label>
        <label class="check"><input type="checkbox" ${s.block ? 'checked' : ''}> <span class="box"></span> Specimen blocks lower path</label>
      </div>
      <canvas class="ex-canvas" width="${CW}" height="${CH}"></canvas>
      <div class="ex-text"></div>
      <div class="ex-nav"></div>`;
    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const range = root.querySelector('input[type=range]');
    const check = root.querySelector('input[type=checkbox]');
    const textEl = root.querySelector('.ex-text');
    const nav = root.querySelector('.ex-nav');
    if (o.lockPhase) range.disabled = true;
    if (o.lockBlock) check.disabled = true;

    range.addEventListener('input', () => {
      s.phase = +range.value;
      root.querySelector('.phase-val').textContent = s.phase + '°';
      renderText();
    });
    check.addEventListener('change', () => {
      s.block = check.checked;
      renderText();
    });
    root.querySelectorAll('.tab').forEach((b) =>
      b.addEventListener('click', () => {
        Audio.play('click');
        s.tab = b.dataset.tab;
        renderTabs();
      })
    );

    function analysis() {
      return Physics.analyse({ bs2: true, phaseDeg: s.phase, specimen: s.block });
    }
    function renderText() {
      textEl.innerHTML = TEXT[s.tab](analysis(), s);
    }
    function renderTabs() {
      root.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === s.tab));
      root.querySelector('.ex-controls').classList.toggle('hidden', s.tab === 'halves');
      renderText();
      renderNav();
    }
    let closeFn = null;
    function renderNav() {
      nav.innerHTML = '';
      if (!guided) return;
      const idx = guided.indexOf(s.tab);
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn';
      const last = idx === guided.length - 1;
      next.textContent = idx < 0 ? 'Back to the tour ▶' : last ? 'Got it ✓' : 'Next ▶';
      next.addEventListener('click', () => {
        Audio.play('select');
        if (last) closeFn(true);
        else {
          s.tab = guided[idx < 0 ? 0 : idx + 1];
          renderTabs();
        }
      });
      const step = document.createElement('span');
      step.className = 'muted';
      step.textContent = idx >= 0 ? `Step ${idx + 1} of ${guided.length}` : 'Optional extra';
      nav.appendChild(step);
      nav.appendChild(next);
    }
    function frame(t) {
      if (!cv.isConnected) return;
      ctx.clearRect(0, 0, CW, CH);
      ctx.fillStyle = '#30474e';
      ctx.fillRect(0, 0, CW, CH);
      const a = analysis();
      if (s.tab === 'paths') drawPaths(ctx, a, s, t);
      else if (s.tab === 'graphs') drawGraphs(ctx, a, s, t);
      else if (s.tab === 'combine') drawCombine(ctx, a, s, t);
      else drawHalves(ctx, a, s, t);
      raf = requestAnimationFrame(frame);
    }

    return UI.modal({
      title: 'Amplitude Explorer',
      body: root,
      wide: true,
      closable: true,
      buttons: guided ? [] : [{ label: 'Close', value: true }],
      onOpen: (box, close) => {
        closeFn = close;
        renderTabs();
        raf = requestAnimationFrame(frame);
      },
      onClose: () => cancelAnimationFrame(raf),
    });
  }

  window.QBT.Explainer = { open };
})();

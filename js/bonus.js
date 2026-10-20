/*
 * Quantum Bomb Tester — Bonus lab: "Beat the 1/3 limit".
 * Tune the beamsplitter reflectivity and see how the safe-detection efficiency
 * r/(1+r) rises towards 1/2, at the cost of needing more photons per answer.
 */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Physics, UI, Audio, Save } = window.QBT;

  const INK = '#1b282d';
  const MIST = '#b9cbc9';
  const SAGE = '#749593';
  const GOLD = '#fec837';
  const CORAL = '#fd9978';
  const RED = '#e8615a';
  const FONT = '"Pixelify Sans", "Courier New", monospace';
  const CW = 760;
  const CH = 260;

  function txt(ctx, s, x, y, color, size, align) {
    ctx.font = `${size || 14}px ${FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(s, x + 2, y + 2);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(s, x, y);
  }
  const pct = (p) => Math.round(p * 100) + '%';

  function draw(ctx, r) {
    const tu = Physics.tunable(r);
    ctx.fillStyle = '#30474e';
    ctx.fillRect(0, 0, CW, CH);

    // left: outcome bars with the specimen present (and the empty reference)
    txt(ctx, 'Specimen present: outcome per photon', 20, 20, '#fff', 15);
    const bars = [
      { label: 'D1 bright', v: tu.present.d1, c: GOLD },
      { label: 'D2 dark', v: tu.present.d2, c: CORAL },
      { label: 'absorbed', v: tu.present.absorbed, c: RED },
    ];
    const by = 210;
    const bh = 150;
    bars.forEach((b, i) => {
      const x = 40 + i * 100;
      const h = Math.round(b.v * bh);
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, by - h - 2, 52, h + 2);
      ctx.fillStyle = b.c;
      ctx.fillRect(x, by - h, 48, h);
      txt(ctx, pct(b.v), x + 24, by - h - 12, b.c, 14, 'center');
      txt(ctx, b.label, x + 24, by + 16, MIST, 13, 'center');
    });
    txt(ctx, `Empty holder: D1 ${pct(tu.empty.d1)}, D2 ${pct(tu.empty.d2)} (still perfectly dark)`, 20, 246, SAGE, 13);

    // right: efficiency curve
    const gx = 400;
    const gy = 30;
    const gw = 330;
    const gh = 180;
    txt(ctx, 'Safe-detection efficiency r / (1 + r)', gx, 20, '#fff', 15);
    ctx.fillStyle = 'rgba(27,40,45,0.4)';
    ctx.fillRect(gx, gy + 10, gw, gh);
    const yOf = (e) => gy + 10 + gh - (e / 0.6) * gh;
    [[1 / 3, '1/3 (balanced)'], [0.5, '1/2 (limit)']].forEach(([e, l]) => {
      ctx.fillStyle = 'rgba(185,203,201,0.5)';
      for (let x = gx; x < gx + gw; x += 8) ctx.fillRect(x, yOf(e), 4, 2);
      txt(ctx, l, gx + gw - 4, yOf(e) - 9, MIST, 12, 'right');
    });
    ctx.fillStyle = GOLD;
    for (let i = 0; i <= gw; i += 2) {
      const rr = i / gw;
      ctx.fillRect(gx + i, Math.round(yOf(rr / (1 + rr))), 3, 3);
    }
    const mx = gx + r * gw;
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - 1, gy + 10, 2, gh);
    ctx.fillRect(mx - 5, yOf(tu.efficiency) - 5, 10, 10);
    txt(ctx, pct(tu.efficiency), mx - 10, yOf(tu.efficiency) + 16, '#fff', 14, 'right');
    txt(ctx, 'r = 0', gx, gy + gh + 24, MIST, 12);
    txt(ctx, 'r = 1', gx + gw, gy + gh + 24, MIST, 12, 'right');
    txt(ctx, 'BS1 reflectivity r', gx + gw / 2, gy + gh + 24, MIST, 12, 'center');
  }

  /** Simulate N present specimens, firing until a dark click or an absorption. */
  function simulate(r, N) {
    const tu = Physics.tunable(r);
    let safe = 0;
    let damaged = 0;
    let undecided = 0;
    let photons = 0;
    for (let i = 0; i < N; i++) {
      let k = 0;
      for (;;) {
        k++;
        const o = Physics.sample(tu.present);
        if (o === 'd2') {
          safe++;
          break;
        }
        if (o === 'absorbed') {
          damaged++;
          break;
        }
        if (k >= 500) {
          undecided++;
          break;
        }
      }
      photons += k;
    }
    return { safe, damaged, undecided, mean: photons / N };
  }

  const QUESTION = {
    q: 'Why not simply set r as close to 1 as possible?',
    options: [
      'Then almost every photon gives an inconclusive bright click: you need ever more photons, and the efficiency still never quite reaches 50%',
      'At r = 1 the dark detector stops being dark, so the test breaks completely',
      'There is no catch. r = 1 gives 100% safe detection',
    ],
    answer: 0,
    explain:
      'The efficiency r/(1 + r) only approaches ½, while the expected photons per conclusive answer, 1/(1 − r²), blows up. Going beyond ½ needs a new design: the quantum Zeno scheme proposed by Kwiat et al. (1995) and demonstrated with high efficiency in 1999.',
  };

  function open() {
    let r = 0.5;
    const root = document.createElement('div');
    root.className = 'explainer bonus';
    root.innerHTML = `
      <p>In the main game the beamsplitters are 50:50, so a present specimen is found safely only <b class="hl">1 time in 3</b>.
      Can we do better? Change BS1’s reflectivity r. BS2 is set to the mirror image, so D2 stays perfectly dark when the holder is empty.</p>
      <div class="ex-controls">
        <label class="phase-ctl">BS1 reflectivity r <input type="range" min="0.05" max="0.95" step="0.05" value="0.5"> <b class="phase-val">0.50</b></label>
      </div>
      <canvas class="ex-canvas" width="${CW}" height="${CH}"></canvas>
      <div class="bonus-stats"></div>
      <div class="bonus-run"><button type="button" class="btn small">Run 1000 present specimens</button><span class="muted small">Fires until a dark click or an absorption (simulated with the predicted probabilities).</span></div>
      <div class="bonus-out"></div>
      <div class="bonus-q"><b>${QUESTION.q}</b>${QUESTION.options
        .map((o, i) => `<button type="button" class="choice" data-i="${i}"><span class="key">${i + 1}</span><span>${o}</span></button>`)
        .join('')}<div class="bonus-fb"></div></div>
      <p class="muted small">Assumptions: ideal lossless beamsplitters, perfect detectors and a perfectly absorbing specimen (see Notebook → Lab manual).
      Sources: Elitzur &amp; Vaidman (1993); Kwiat et al., PRL 74, 4763 (1995); Kwiat et al., PRL 83, 4725 (1999).</p>`;
    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const range = root.querySelector('input');
    const stats = root.querySelector('.bonus-stats');
    const out = root.querySelector('.bonus-out');
    const render = () => {
      const tu = Physics.tunable(r);
      root.querySelector('.phase-val').textContent = r.toFixed(2);
      draw(ctx, r);
      stats.innerHTML = `Safe-detection efficiency: <b class="hl">${(tu.efficiency * 100).toFixed(1)}%</b> · expected photons per conclusive answer: <b class="hl">${tu.photonsPerConclusive.toFixed(2)}</b>`;
    };
    range.addEventListener('input', () => {
      r = +range.value;
      out.innerHTML = '';
      render();
    });
    root.querySelector('.bonus-run .btn').addEventListener('click', () => {
      Audio.play('emit');
      const s = simulate(r, 1000);
      out.innerHTML = `Result for r = ${r.toFixed(2)}: <b style="color:var(--green)">${s.safe} found intact</b>, <b style="color:var(--red)">${s.damaged} damaged</b>${s.undecided ? `, ${s.undecided} still undecided after 500 photons` : ''}; ${s.mean.toFixed(2)} photons per specimen on average.
        <span class="muted">Prediction: ${(Physics.tunable(r).efficiency * 1000).toFixed(0)} intact. The small difference is random scatter, as in Level 1.</span>`;
    });
    root.querySelectorAll('.bonus-q .choice').forEach((b) =>
      b.addEventListener('click', () => {
        const ok = +b.dataset.i === QUESTION.answer;
        Audio.play(ok ? 'good' : 'bad');
        root.querySelectorAll('.bonus-q .choice').forEach((c) => c.classList.toggle('picked', c === b));
        root.querySelector('.bonus-fb').innerHTML = `<p><b>${ok ? '✓ Correct.' : '✗ Not quite.'}</b> ${QUESTION.explain}</p>`;
        const s = Save.get();
        if (s) {
          s.bonus = { answered: true, correct: ok, at: Date.now() };
          Save.commit();
        }
      })
    );
    return UI.modal({
      title: 'Bonus lab: beat the 1/3 limit',
      body: root,
      wide: true,
      buttons: [{ label: 'Close' }],
      onOpen: () => render(),
    });
  }

  window.QBT.Bonus = { open, simulate };
})();

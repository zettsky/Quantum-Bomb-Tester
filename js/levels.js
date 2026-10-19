/*
 * Quantum Bomb Tester — the five levels, the final Vault challenge and scoring.
 *
 * Scoring philosophy: outcomes are random, so the game never grades luck.
 *  - Understanding points: predictions (judged against the quantum prediction,
 *    not the random result), conclusions + reasons (judged against the evidence
 *    actually observed), and the post-level check questions.
 *  - Safe detections and specimen damage are tracked separately.
 */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Physics, UI, Chat, Audio, Sprites, Diagram, Explainer, Content, Save, Settings } = window.QBT;

  const $ = (id) => document.getElementById(id);
  const say = (lines, o) => UI.say(lines, o);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // =====================================================================
  // Lab: the experiment controller behind the bench UI
  // =====================================================================
  const Lab = {
    cfg: null,
    counts: { d1: 0, d2: 0, absorbed: 0 },
    log: [],
    roundLog: [],
    since: { n: 0, d1: 0, d2: 0 },
    allowed: { one: false, ten: false, conclude: false },
    waiter: null,
    busy: false,
    budget: null,
    holders: null,

    setup(o) {
      this.cfg = Object.assign(
        { bs2: true, phaseDeg: 0, showPhase: false, phaseEditable: false, specimen: 'none', present: false, damaged: false, labels: { d1: 'D1 bright', d2: 'D2 dark' }, overlayAllowed: false, absorbRow: false },
        o
      );
      this.counts = { d1: 0, d2: 0, absorbed: 0 };
      this.log = [];
      this.roundLog = [];
      this.since = { n: 0, d1: 0, d2: 0 };
      this.allowed = { one: false, ten: false, conclude: false };
      this.waiter = null;
      this.busy = false;
      this.budget = null;
      this.holders = null;
      this.overlay = false;
      Diagram.reset({
        bs2: this.cfg.bs2,
        phaseDeg: this.cfg.phaseDeg,
        showPhase: this.cfg.showPhase,
        specimen: this.specimenVisual(),
        labels: this.cfg.labels,
        counts: this.counts,
      });
      $('phase-row').classList.toggle('hidden', !this.cfg.showPhase);
      $('phase-range').value = this.cfg.phaseDeg;
      $('btn-overlay').classList.toggle('hidden', !this.cfg.overlayAllowed);
      $('btn-overlay').classList.remove('on');
      $('btn-explain').classList.toggle('hidden', !this.cfg.overlayAllowed);
      this.objective('');
      this.renderPhase();
      this.renderTally();
      this.updateControls();
    },
    specimenVisual() {
      const c = this.cfg;
      if (c.specimen === 'none') return 'none';
      if (c.specimen === 'slot') return 'slot';
      if (c.damaged) return 'damaged';
      if (c.specimen === 'dummy') return 'visible';
      if (c.specimen === 'hidden') return 'hidden';
      return 'none';
    },
    analysis() {
      const c = this.cfg;
      const present = (c.specimen === 'dummy' || (c.specimen === 'hidden' && c.present)) && !c.damaged;
      return Physics.analyse({ bs2: c.bs2, phaseDeg: c.phaseDeg, specimen: present });
    },
    total() {
      return this.counts.d1 + this.counts.d2 + this.counts.absorbed;
    },
    resetCounts() {
      this.counts = { d1: 0, d2: 0, absorbed: 0 };
      this.roundLog = [];
      this.since = { n: 0, d1: 0, d2: 0 };
      Diagram.set({ counts: this.counts });
      this.renderTally();
    },
    allow(a) {
      this.allowed = Object.assign({ one: false, ten: false, conclude: false }, a);
      this.updateControls();
    },
    objective(html, progress) {
      const el = $('objective');
      el.innerHTML = html ? `<div class="obj-label">${Sprites.icon('star')} Objective</div><div>${html}</div>${progress ? `<div class="obj-progress">${progress}</div>` : ''}` : '';
      el.classList.toggle('hidden', !html);
      this._obj = html;
    },
    setPhase(v) {
      this.cfg.phaseDeg = v;
      this.since = { n: 0, d1: 0, d2: 0 };
      Diagram.set({ phaseDeg: v });
      $('phase-val').textContent = v + '°';
      this.renderPhase();
      this.renderTally();
      if (this.waiter && this.waiter.kind === 'phase') this.waiter.check();
      if (this.waiter && this.waiter.kind === 'fire') this.waiter.check();
    },

    // ---------- waiting primitives (all abortable) ----------
    waitFire(pred, opts) {
      const o = opts || {};
      return UI.track((resolve, entry) => {
        const w = {
          kind: 'fire',
          entry,
          fired: 0,
          progress: o.progress,
          hint: o.hint,
          check: () => {
            if (pred()) {
              this.waiter = null;
              resolve();
              return true;
            }
            this.showProgress();
            return false;
          },
        };
        this.waiter = w;
        entry.cleanup = () => {
          if (this.waiter === w) this.waiter = null;
          this.updateControls();
        };
        this.showProgress();
        this.updateControls();
      });
    },
    showProgress() {
      const w = this.waiter;
      if (w && w.progress && this._obj) this.objective(this._obj, w.progress());
    },
    waitAction() {
      return UI.track((resolve, entry) => {
        const w = { kind: 'action', entry, resolve: (v) => { this.waiter = null; resolve(v); } };
        this.waiter = w;
        entry.cleanup = () => {
          if (this.waiter === w) this.waiter = null;
          this.updateControls();
        };
        this.updateControls();
      });
    },
    waitSlot(slots) {
      return UI.track((resolve, entry) => {
        const w = { kind: 'slot', entry };
        this.waiter = w;
        Diagram.set({ slots });
        Diagram.onSlot((id) => {
          if (this.waiter !== w) return;
          this.waiter = null;
          Diagram.set({ slots: null });
          resolve(id);
        });
        entry.cleanup = () => {
          if (this.waiter === w) this.waiter = null;
          Diagram.set({ slots: null });
          this.updateControls();
        };
        this.updateControls();
      });
    },
    waitPhase(pred) {
      return UI.track((resolve, entry) => {
        const w = {
          kind: 'phase',
          entry,
          check: () => {
            if (pred(this.cfg.phaseDeg)) {
              this.waiter = null;
              resolve();
            }
          },
        };
        this.waiter = w;
        entry.cleanup = () => {
          if (this.waiter === w) this.waiter = null;
          this.updateControls();
        };
        this.updateControls();
        w.check();
      });
    },

    // ---------- firing ----------
    async fire(n) {
      if (this.busy || !this.waiter || (this.waiter.kind !== 'fire' && this.waiter.kind !== 'action')) return;
      this.busy = true;
      this.updateControls();
      Audio.play('emit');
      for (let i = 0; i < n; i++) {
        const a = this.analysis();
        const outcome = Physics.sample(a.P);
        await Diagram.animate(outcome, a, {
          hidden: this.cfg.specimen === 'hidden',
          fast: n > 1,
          onClick: () => Audio.play(outcome === 'absorbed' ? 'absorb' : outcome),
        });
        this.record(outcome);
        if (this.budget) {
          this.budget.left--;
          this.renderTally();
        }
        const w = this.waiter;
        if (!w) break;
        if (w.kind === 'action') {
          this.busy = false;
          w.resolve({ type: 'fire', outcome });
          this.updateControls();
          return;
        }
        w.fired++;
        if (w.check()) break;
        if (w.hint && w.fired === w.hint.after) UI.toast(Sprites.icon('chat') + ' ' + w.hint.text, 5000);
        if (outcome === 'absorbed' && this.cfg.specimen !== 'dummy') break;
      }
      this.busy = false;
      this.updateControls();
    },
    record(outcome) {
      this.counts[outcome]++;
      this.log.push(outcome);
      this.roundLog.push(outcome);
      this.since.n++;
      if (outcome !== 'absorbed') this.since[outcome]++;
      if (outcome === 'absorbed') {
        if (this.cfg.specimen === 'dummy') {
          Diagram.set({ specimen: 'damaged' });
          setTimeout(() => {
            if (this.cfg.specimen === 'dummy') Diagram.set({ specimen: 'visible' });
          }, 900);
        } else {
          this.cfg.damaged = true;
          Diagram.set({ specimen: 'damaged' });
        }
        if (!Settings.get().reducedMotion) {
          const f = $('level-frame');
          f.classList.remove('shake');
          void f.offsetWidth;
          f.classList.add('shake');
        }
      }
      Diagram.set({ counts: this.counts });
      this.renderTally();
    },

    updateControls() {
      const w = this.waiter;
      const firing = w && (w.kind === 'fire' || w.kind === 'action') && !this.busy;
      const noBudget = this.budget && this.budget.left <= 0;
      $('fire1').disabled = !(firing && this.allowed.one) || noBudget;
      $('fire10').disabled = !(firing && this.allowed.ten) || noBudget;
      $('fire10').classList.toggle('hidden', !this.allowed.ten && !(w && w.kind === 'fire' && this.allowed.ten));
      $('btn-conclude').classList.toggle('hidden', !this.allowed.conclude && !(w && w.kind === 'action'));
      $('btn-conclude').disabled = !(w && w.kind === 'action' && this.allowed.conclude && !this.busy);
      $('phase-range').disabled = !(this.cfg && this.cfg.phaseEditable) || this.busy;
      $('controls').classList.toggle('waiting', !!firing);
    },

    // ---------- side panel ----------
    renderPhase() {
      const cv = $('phase-graph');
      if (!cv || !this.cfg) return;
      const ctx = cv.getContext('2d');
      const w = cv.width;
      const h = cv.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#2f454b';
      ctx.fillRect(0, 0, w, h);
      const plot = (fn, col) => {
        ctx.fillStyle = col;
        for (let x = 0; x < w; x += 2) {
          const deg = (x / w) * 360;
          const y = h - 14 - fn((deg * Math.PI) / 180) * (h - 24);
          ctx.fillRect(x, Math.round(y), 3, 3);
        }
      };
      plot((p) => Math.cos(p / 2) ** 2, '#fec837');
      plot((p) => Math.sin(p / 2) ** 2, '#fd9978');
      const mx = (this.cfg.phaseDeg / 360) * w;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.min(w - 2, Math.round(mx)), 4, 2, h - 14);
      ctx.font = '11px "Pixelify Sans", monospace';
      ctx.fillStyle = '#b9cbc9';
      ctx.fillText('0°', 2, h - 2);
      ctx.fillText('180°', w / 2 - 12, h - 2);
      ctx.fillText('360°', w - 28, h - 2);
    },
    renderTally() {
      const el = $('tally');
      if (!this.cfg) return;
      const c = this.counts;
      const N = this.total();
      const hidden = this.cfg.specimen === 'hidden';
      const a = this.analysis();
      const showExp = Settings.get().showExpected && !hidden;
      const rows = [
        { key: 'd1', ico: 'bright', label: this.cfg.labels.d1, p: a.P.d1 },
        { key: 'd2', ico: 'dark', label: this.cfg.labels.d2, p: a.P.d2 },
      ];
      if (this.cfg.specimen !== 'none' || this.cfg.absorbRow) rows.push({ key: 'absorbed', ico: 'absorbed', label: 'Absorbed', p: a.P.absorbed });
      let html = '';
      if (this.holders) {
        html += `<div class="holders">${this.holders
          .map(
            (hd, i) =>
              `<div class="slot ${hd.current ? 'current' : ''}" title="Holder ${i + 1}">${hd.result ? Sprites.icon(hd.result) : `<span>${i + 1}</span>`}</div>`
          )
          .join('')}</div>`;
      }
      if (this.budget) {
        html += `<div class="budget">${Sprites.icon('photon')} Photons left: <b>${this.budget.left}</b> / ${this.budget.max}</div>`;
      }
      html += `<div class="tally-title">Detector counts <span class="muted">(${N} photon${N === 1 ? '' : 's'})</span></div>`;
      rows.forEach((r) => {
        const frac = N ? c[r.key] / N : 0;
        html += `<div class="bar-row">
          <span class="bar-lbl">${Sprites.icon(r.ico)}${r.label}</span>
          <div class="bar"><div class="fill ${r.key}" style="width:${(frac * 100).toFixed(1)}%"></div>${showExp && N ? `<div class="exp" style="left:${(r.p * 100).toFixed(1)}%" title="predicted ${Math.round(r.p * 100)}%"></div>` : ''}</div>
          <b class="bar-n">${c[r.key]}</b></div>`;
      });
      if (showExp && N) html += `<div class="muted small">▼ white marks = predicted share</div>`;
      if (hidden) html += `<div class="muted small">Predictions hidden: the holder is sealed.</div>`;
      const recent = this.log.slice(-24);
      html += `<div class="tally-title">Photon log</div><div class="log-grid">`;
      for (let i = 0; i < 24; i++) html += `<div class="slot">${recent[i] ? Sprites.icon(recent[i] === 'd1' ? 'bright' : recent[i] === 'd2' ? 'dark' : 'absorbed') : ''}</div>`;
      html += '</div>';
      el.innerHTML = html;
    },
  };

  // =====================================================================
  // Run bookkeeping and teaching primitives
  // =====================================================================
  function makeRun(id) {
    return {
      id,
      earned: 0,
      possible: 0,
      pre: [],
      post: [],
      detections: 0,
      damage: 0,
      present: 0,
      correctVerdicts: 0,
      verdicts: 0,
      notes: [],
      seen: {},
      award(points, possible, label) {
        this.possible += possible;
        this.earned += points;
        if (points > 0) UI.pop(`+${points} ${label || 'understanding'}`, 'good');
        renderStats(this);
      },
    };
  }
  function renderStats(run) {
    $('lvl-stats').innerHTML = `
      <span title="Understanding points (reasoning, predictions, check questions)">${Sprites.icon('star')} ${run.earned}<small>/${run.possible}</small></span>
      <span title="Safe detections: specimen found with no absorption">${Sprites.icon('eye')} ${run.detections}</span>
      <span title="Specimens damaged (tracked separately)" class="${run.damage ? 'bad' : ''}">${Sprites.icon('damage')} ${run.damage}</span>`;
  }

  const TAG = {
    predict: { text: 'PREDICT', cls: 'tag-predict' },
    conclude: { text: 'CONCLUDE', cls: 'tag-conclude' },
    why: { text: 'EXPLAIN WHY', cls: 'tag-why' },
    good: (pts) => ({ text: `✓ Correct${pts ? ' +' + pts : ''}`, cls: 'tag-good' }),
    bad: { text: '✗ Not quite', cls: 'tag-bad' },
  };

  /** Ask for a prediction now; it is scored after the experiment runs. */
  async function predict(o) {
    const r = await UI.choose({ prompt: o.prompt, options: o.options, tag: TAG.predict });
    return { correct: r.index === o.answer, choice: o.options[r.index], answer: o.options[o.answer], explain: o.explain };
  }
  /** Compare a prediction with the quantum prediction (not with luck). */
  async function checkPrediction(run, p, observed) {
    run.award(p.correct ? 10 : 0, 10, 'prediction');
    Audio.play(p.correct ? 'good' : 'bad');
    const lines = [observed];
    if (p.correct) lines.push(`You predicted: “${p.choice}”. **That matches quantum theory.** ${p.explain}`);
    else lines.push(`You predicted: “${p.choice}”. Quantum theory predicts: **${p.answer}**. ${p.explain}`);
    await say(lines, { tag: p.correct ? TAG.good(10) : TAG.bad });
  }

  /**
   * Conclusion + reason. Judged against the evidence, never the hidden truth.
   * Returns { conclusionCorrect, reasonCorrect }.
   */
  async function conclude(run, o) {
    const c = await UI.choose({ prompt: o.prompt, options: o.options, tag: o.tag || TAG.conclude });
    const r = await UI.choose({
      prompt: o.whyPrompt || `You chose “${o.options[c.index]}”. Why? Pick the best reason.`,
      options: o.reasons,
      tag: TAG.why,
      note: true,
    });
    const okC = c.index === o.answer;
    const okR = r.index === o.reasonAnswer;
    const pts = (okC ? 15 : 0) + (okR ? 10 : 0);
    run.award(pts, 25, 'reasoning');
    if (r.note) run.notes.push({ level: run.id, question: o.prompt.replace(/\*\*/g, ''), answer: o.options[c.index], note: r.note });
    Audio.play(okC && okR ? 'good' : 'bad');
    let head;
    if (okC && okR) head = '**Excellent reasoning!**';
    else if (okC) head = `Right conclusion, but the best reason is: **${o.reasons[o.reasonAnswer]}**.`;
    else head = `The evidence supports: **${o.options[o.answer]}**.`;
    await say([`${head} ${o.explain || ''}`], { tag: okC && okR ? TAG.good(pts) : okC ? { text: `Partly right +${pts}`, cls: 'tag-predict' } : TAG.bad });
    return { conclusionCorrect: okC, reasonCorrect: okR };
  }

  /** Three questions before (baseline, no feedback) and after (scored, with feedback). */
  async function quiz(run, phase) {
    const qs = Content.quizzes[run.id];
    if (phase === 'pre')
      await say(['**Warm-up:** three quick questions about what you think right now. No score and no feedback yet. We’ll ask them again at the end to see what changed.']);
    else await say(['**Check-up:** the same three questions again. These count towards your understanding score.']);
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const order = shuffle(q.options.map((_, j) => j));
      const r = await UI.choose({
        prompt: q.q,
        options: order.map((j) => q.options[j]),
        tag: { text: `${phase === 'pre' ? 'WARM-UP' : 'CHECK'} ${i + 1}/${qs.length}`, cls: phase === 'pre' ? 'tag-pre' : 'tag-post' },
      });
      const ok = order[r.index] === q.answer;
      run[phase].push(ok);
      if (phase === 'post') {
        run.award(ok ? 10 : 0, 10, 'check');
        Audio.play(ok ? 'good' : 'bad');
        await say([ok ? q.explain : `The answer is: **${q.options[q.answer]}**. ${q.explain}`], { tag: ok ? TAG.good(10) : TAG.bad });
      }
    }
  }

  // =====================================================================
  // Levels
  // =====================================================================
  async function level1(run) {
    Lab.setup({ bs2: false, labels: { d1: 'Detector A', d2: 'Detector B' } });
    await say([
      'Welcome to **bench 1**! This device fires **one photon at a time** at a 50:50 beam splitter, BS1.',
      'Each output path leads to its own detector, A or B. A detector either clicks with a whole photon, or stays silent.',
    ]);
    await quiz(run, 'pre');
    const p1 = await predict({
      prompt: 'You will send ONE photon. What will happen?',
      options: ['Both detectors click, each with half the energy', 'Exactly one detector clicks, but we can’t know which in advance', 'Detector A always clicks', 'Nothing. One photon is too little to detect'],
      answer: 1,
      explain: 'One photon gives one whole click at one detector. Which detector is random; only the probability (50%) can be predicted.',
    });
    Lab.allow({ one: true });
    Lab.objective('Send <b>one</b> photon: press <b>Send 1 photon</b> (or F).');
    await Lab.waitFire(() => Lab.total() >= 1);
    await checkPrediction(run, p1, `Detector ${Lab.log[0] === 'd1' ? 'A' : 'B'} clicked with **one whole photon**. The other stayed silent.`);
    await say([
      'Notice that the photon is never shared. Every photon gives exactly **one** click: light **arrives as a particle**, delivering all its energy hf at once.',
      'The beamsplitter is like a coin toss for each photon: P(T) = P(R) = 0.5, and P(T) + P(R) = 1 because the photon must leave somewhere.',
      'A note on honesty: this computer isn’t quantum. It rolls ordinary pseudo-random dice using the probabilities quantum mechanics **predicts**. What you’re here to learn is those predictions.',
    ]);
    const p2 = await predict({
      prompt: 'Now you’ll send 20 more photons. What will the counts look like?',
      options: ['Exactly 10 and 10', 'Roughly equal (like 8 and 12) but rarely exactly 10 and 10', 'All 20 at the same detector', 'Impossible to say anything at all'],
      answer: 1,
      explain: 'Each photon has a 50% chance at each detector, so the counts land near half each but fluctuate, typically by about ±2 for 20 photons.',
    });
    Lab.allow({ one: true, ten: true });
    const start = Lab.total();
    Lab.objective('Send at least <b>20 more</b> photons. <b>Send 10</b> speeds things up.');
    await Lab.waitFire(() => Lab.total() >= start + 20, { progress: () => `${Math.min(20, Lab.total() - start)} / 20 photons` });
    const A = Lab.counts.d1;
    const B = Lab.counts.d2;
    const N = A + B;
    const sd = Physics.binomial(N, 0.5).sd;
    await checkPrediction(run, p2, `Totals: A = **${A}**, B = **${B}** out of ${N}. The prediction is ${(N / 2).toFixed(1)} each, give or take about ${sd.toFixed(1)}.`);
    Lab.allow({});
    await conclude(run, {
      prompt: 'What do your results tell you about single photons?',
      options: [
        'The beam splitter is faulty, because the counts weren’t exactly equal',
        'Each photon’s outcome is random, but the 50% probability shows up over many trials',
        'Photons split in half and both halves were counted',
        'Detector A is more sensitive than detector B',
      ],
      answer: 1,
      reasons: [
        'Single outcomes can’t be predicted, but the fractions settle near 0.5 as the trials pile up',
        'Every click carried half of the photon’s energy',
        'The counts came out exactly equal',
      ],
      reasonAnswer: 0,
      explain: 'A probability is a long-run fraction. You measure it by repeating the same experiment many times.',
    });
    await quiz(run, 'post');
  }

  async function level2(run) {
    Lab.setup({ bs2: false, labels: { d1: 'D1', d2: 'D2' } });
    await say([
      '**Bench 2.** Mirrors now bend both paths back so they **cross** before reaching detectors D1 and D2.',
      'Your challenge: make **every** photon arrive at the **same** detector.',
    ]);
    await quiz(run, 'pre');
    await say(['First, try it with **no** second beam splitter. Send a few photons.']);
    Lab.allow({ one: true, ten: true });
    Lab.objective('Send at least <b>6</b> photons.');
    await Lab.waitFire(() => Lab.total() >= 6, { progress: () => `${Math.min(6, Lab.total())} / 6` });
    Lab.allow({});
    await say([
      `D1: **${Lab.counts.d1}**, D2: **${Lab.counts.d2}**. Roughly 50/50 again. Each detector sits at the end of just **one** path, so every click tells you which path the photon took.`,
      'Now place a **second beam splitter (BS2)**. Click one of the glowing slots on the bench.',
    ]);
    Lab.objective('Click a glowing slot to place BS2.');
    for (;;) {
      const slot = await Lab.waitSlot(['upper', 'cross', 'lower']);
      if (slot === 'cross') break;
      Audio.play('bad');
      await say(['Only **one** path passes through that spot, so a beam splitter there can’t combine anything. Try the place where **both paths meet**.']);
    }
    Audio.play('place');
    Lab.cfg.bs2 = true;
    Diagram.set({ bs2: true });
    Lab.resetCounts();
    Lab.renderTally();
    const p = await predict({
      prompt: 'BS2 now sits where the two paths meet. What happens to the next 10 photons?',
      options: ['About half go to each detector, as before', 'Every photon goes to the same detector', 'Each detector receives half a photon', 'No photons are detected at all'],
      answer: 1,
      explain: 'With both paths recombined, their amplitudes interfere. They add for one detector and cancel for the other.',
    });
    Lab.allow({ one: true, ten: true });
    Lab.objective('Send at least <b>10</b> photons through the complete interferometer.');
    await Lab.waitFire(() => Lab.total() >= 10, { progress: () => `${Math.min(10, Lab.total())} / 10` });
    Lab.allow({});
    await checkPrediction(run, p, `All **${Lab.counts.d1}** photons arrived at D1. D2 stayed completely dark!`);
    await say([
      'Think about it: if each photon went down just **one** path, BS2 would split it 50/50 and D2 would click half the time. It **never** does.',
      'Classically we’d multiply probabilities: P(TT) = P(TR) = P(RT) = P(RR) = ½ × ½ = ¼, so each detector should get ¼ + ¼ = ½. Experiment says 1 and 0!',
      'Quantum mechanics uses complex **probability amplitudes** as weights instead. The photon leaves BS1 in a **superposition** of both paths, and **each photon interferes with itself**. Let me show you.',
    ]);
    await Explainer.open({ tab: 'paths', guided: ['paths', 'graphs', 'halves'], phaseDeg: 0, block: false, lockPhase: true, lockBlock: true });
    Lab.cfg.overlayAllowed = true;
    $('btn-overlay').classList.remove('hidden');
    $('btn-explain').classList.remove('hidden');
    await say(['From now on you can switch on **amplitude graphs** on the bench. The optional **How do amplitudes combine?** button shows the arrow addition at BS2.']);
    await conclude(run, {
      prompt: 'Every photon reached D1 and none reached D2. What is the best conclusion?',
      options: [
        'The amplitudes interfere: they add for D1 and cancel for D2',
        'The photon splits into halves that recombine into a whole at BS2',
        'BS2 blocks the route to D2',
        'Every photon takes the upper path',
      ],
      answer: 0,
      reasons: [
        'If each photon took a single path, BS2 would send half of them to D2, but none arrive',
        'Each detector measured half-energy pieces of the photon',
        'D2 must be switched off',
      ],
      reasonAnswer: 0,
      explain: 'Amplitudes from indistinguishable paths add before squaring. At D2 they are equal and opposite, so they cancel.',
    });
    await quiz(run, 'post');
  }

  async function level3(run) {
    Lab.setup({ bs2: true, showPhase: true, phaseEditable: false, overlayAllowed: true });
    await say([
      '**Bench 3.** I’ve added a **phase shifter** to the lower path: a glass slab that delays the light very slightly.',
      'We measure the delay as an angle φ. 360° is one whole wavelength, which brings everything back to the start. The graph in your panel shows the predicted P(D1) in gold and P(D2) in coral.',
    ]);
    await quiz(run, 'pre');
    const p = await predict({
      prompt: 'Which phase setting will send EVERY photon to D2?',
      options: ['45°', '90°', '180°', '360°'],
      answer: 2,
      explain: 'At 180° the lower amplitude flips sign: the D1 contributions cancel and the D2 contributions add.',
    });
    Lab.cfg.phaseEditable = true;
    Lab.allow({ one: true, ten: true });
    Lab.objective('Use the <b>φ slider</b> to make <b>D2</b> click every time, then send 5 photons at that setting.');
    await Lab.waitFire(() => Lab.cfg.phaseDeg === 180 && Lab.since.n >= 5, {
      progress: () => (Lab.cfg.phaseDeg === 180 ? `${Math.min(5, Lab.since.n)} / 5 photons at 180°` : `φ is ${Lab.cfg.phaseDeg}°`),
      hint: { after: 12, text: 'Hint: on the graph, where does the coral P(D2) curve reach the top?' },
    });
    Lab.allow({});
    await checkPrediction(run, p, `At φ = 180°, all of your last ${Lab.since.n} photons arrived at **D2**. D1 went dark!`);
    const p2 = await predict({
      prompt: 'Now set φ = 90°. What will happen?',
      options: ['Every photon goes to D1', 'Every photon goes to D2', 'About half go to each detector', 'No photons are detected'],
      answer: 2,
      explain: 'P(D1) = cos²(90°/2) = cos²(45°) = 0.5. The amplitudes partly add and partly cancel.',
    });
    Lab.allow({ one: true, ten: true });
    Lab.objective('Set <b>φ = 90°</b> and send at least <b>10</b> photons.');
    await Lab.waitFire(() => Lab.cfg.phaseDeg === 90 && Lab.since.n >= 10, {
      progress: () => (Lab.cfg.phaseDeg === 90 ? `${Math.min(10, Lab.since.n)} / 10 photons at 90°` : `φ is ${Lab.cfg.phaseDeg}°`),
    });
    Lab.allow({});
    await checkPrediction(run, p2, `At 90° your last ${Lab.since.n} photons split D1 = **${Lab.since.d1}**, D2 = **${Lab.since.d2}**.`);
    await say(['The phase is the **direction** of each amplitude arrow. Turning one arrow changes whether the two add up or cancel. Watch the graphs as you change φ.']);
    await Explainer.open({ tab: 'graphs', guided: ['graphs'], phaseDeg: 90, lockBlock: true });
    await conclude(run, {
      prompt: 'Changing only the lower path’s phase switched which detector clicks. What does this show?',
      options: [
        'The relative phase between the two path amplitudes decides where they add or cancel',
        'The phase shifter changes the photon’s energy',
        'The phase shifter blocks the lower path',
        'Each photon really went only along the lower path',
      ],
      answer: 0,
      reasons: [
        'At 180° the lower amplitude flips sign, so the D1 contributions cancel and the D2 ones add',
        'At 180° each photon loses half of its energy',
        'The glass slab absorbs photons heading for D1',
      ],
      reasonAnswer: 0,
      explain: 'P(D1) = cos²(φ/2) and P(D2) = sin²(φ/2): only the relative phase matters.',
    });
    await say(['Before the next bench the device must be **calibrated**: D2 has to be perfectly dark. Set φ back to **0°**.']);
    Lab.objective('Calibrate: set <b>φ = 0°</b>.');
    await Lab.waitPhase((v) => v === 0 || v === 360);
    Audio.play('place');
    await say(['Calibrated! From now on, **D1 is the normally bright detector** and **D2 is the normally dark one**.']);
    await quiz(run, 'post');
  }

  const VERDICT_OPTIONS = ['Specimen present, and still intact', 'Specimen present, but damaged', 'Can’t tell yet: no conclusive evidence', 'Specimen absent, for certain'];
  const VERDICT_REASONS = [
    'A dark click can only happen when the lower path is blocked, and that photon was detected, not absorbed',
    'A photon was absorbed. That only happens if the specimen is there, and it damages it',
    'Bright clicks happen whether or not the specimen is there, so they can’t decide it',
    'Every photon reached the bright detector, which proves the holder is empty',
  ];
  const VERDICT_INDEX = { present: 0, damaged: 1, inconclusive: 2 };
  const VERDICT_EXPLAIN = {
    present: 'A dark click is **proof**: it has 0% probability with an empty holder.',
    damaged: 'An absorption proves presence, but the specimen paid the price.',
    inconclusive: 'Bright clicks are **inconclusive**: 100% if empty, 25% if present. You can’t claim certainty either way.',
  };

  /** One sealed-holder round. Used in Level 4 (with coaching) and in the Vault. */
  async function hiddenRound(run, o) {
    Lab.cfg.specimen = 'hidden';
    Lab.cfg.present = o.present;
    Lab.cfg.damaged = false;
    Diagram.set({ specimen: 'hidden' });
    Lab.resetCounts();
    Lab.objective(o.objective);
    // In the Vault you may decide without spending photons; in Level 4 you must look first.
    Lab.allow({ one: true, conclude: !o.coach });
    let warned = false;
    const outOfPhotons = () => Lab.budget && Lab.budget.left <= 0;
    for (;;) {
      if (outOfPhotons()) break;
      const act = await Lab.waitAction();
      if (act.type === 'conclude') break;
      const out = act.outcome;
      if (out === 'absorbed') {
        run.damage++;
        renderStats(run);
        await say(['**Absorbed!** The photon hit the specimen. Now we know it was there, but it is **damaged**.'], { speaker: 'lab', tag: { text: 'SPECIMEN DAMAGED', cls: 'tag-bad' } });
        break;
      }
      if (o.coach) {
        if (out === 'd1' && !run.seen.bright) {
          run.seen.bright = true;
          await conclude(run, {
            prompt: 'The **bright** detector clicked. Can you safely conclude that the specimen is absent?',
            options: ['Yes, the specimen is absent', 'No, I can’t conclude that'],
            answer: 1,
            reasons: [
              'A bright click happens 100% of the time when the holder is empty, but also 25% of the time when the specimen is present',
              'If the specimen were present, every photon would be absorbed',
              'The bright detector never clicks when the specimen is present',
            ],
            reasonAnswer: 0,
            explain: 'Bright clicks are **inconclusive**: they occur with either configuration. Keep going, or conclude “can’t tell”.',
          });
        } else if (out === 'd2' && !run.seen.dark) {
          run.seen.dark = true;
          await conclude(run, {
            prompt: 'The **dark** detector clicked! What do you know now?',
            options: ['The specimen is present, and still intact', 'The specimen is absent', 'Nothing yet: clicks are random', 'The specimen was damaged'],
            answer: 0,
            reasons: [
              'With the device calibrated, D2 can only click when something blocks the lower path, and this photon was detected, not absorbed',
              'D2 clicks 25% of the time whether or not the specimen is there',
              'The photon bounced off the specimen into D2',
            ],
            reasonAnswer: 0,
            explain: 'You detected the specimen **without a single photon touching it**: an interaction-free measurement!',
          });
        }
      }
      if (Lab.roundLog.includes('d2') && !warned && o.coach) {
        warned = true;
        await say(['Tip: you already have proof. Each extra photon now only risks damaging the specimen. Press **Make a conclusion** when ready.']);
      }
      if (outOfPhotons()) {
        await say(['That was your last photon. Time to decide.']);
        break;
      }
      Lab.allow({ one: true, conclude: true });
    }
    Lab.allow({});
    const ev = Physics.verdictFromLog(Lab.roundLog);
    const idx = VERDICT_INDEX[ev];
    const res = await conclude(run, {
      prompt: `${o.label}: what can you conclude about the sealed holder?`,
      options: VERDICT_OPTIONS,
      answer: idx,
      reasons: VERDICT_REASONS,
      reasonAnswer: idx,
      whyPrompt: 'Why? Pick the reason that matches your evidence.',
      explain: VERDICT_EXPLAIN[ev],
    });
    run.verdicts++;
    if (res.conclusionCorrect) run.correctVerdicts++;
    // reveal
    if (o.present) run.present++;
    let reveal;
    if (Lab.cfg.damaged) reveal = 'The holder is opened: the specimen is there, **damaged**.';
    else if (o.present) {
      Diagram.set({ specimen: 'revealPresent' });
      if (ev === 'present' && res.conclusionCorrect) {
        run.detections++;
        renderStats(run);
        UI.pop('+1 safe detection', 'good');
        Audio.play('fanfare');
        reveal = 'The holder is opened: a specimen, **perfectly intact**. A safe detection!';
      } else reveal = 'The holder is opened: there **was** a specimen, intact. Your bright clicks couldn’t have proved it either way, so concluding “can’t tell” was the honest answer.';
    } else {
      Diagram.set({ specimen: 'revealEmpty' });
      reveal = 'The holder is opened: it was **empty**. Notice that no number of bright clicks could have **proved** that.';
    }
    await say([reveal], { speaker: 'lab' });
    return { ev, present: o.present, damaged: Lab.cfg.damaged, correct: res.conclusionCorrect };
  }

  async function level4(run) {
    Lab.setup({ bs2: true, showPhase: true, phaseEditable: false, specimen: 'slot', overlayAllowed: true, absorbRow: true });
    await say([
      '**Bench 4.** Here’s our mission: some holders contain a **light-sensitive specimen**. A single absorbed photon damages it.',
      'The interferometer is calibrated (φ = 0°): **D1 is normally bright, D2 normally dark**. The holder sits in the lower path.',
    ]);
    await quiz(run, 'pre');
    Lab.cfg.specimen = 'dummy';
    Diagram.set({ specimen: 'visible' });
    Lab.renderTally();
    await say(['Let’s practise on a **visible test dummy** first. Damage to dummies doesn’t count, and I’ll replace them as needed.']);
    const p = await predict({
      prompt: 'With the dummy blocking the lower path, how often will the dark detector D2 click?',
      options: ['Never. D2 is dark (0%)', '25% of photons', '50% of photons', 'Every photon (100%)'],
      answer: 1,
      explain: 'The lower amplitude is absorbed (50%). The upper amplitude reaches BS2 with nothing to cancel against, so it splits evenly: ½ × ½ = 25% for each detector.',
    });
    Lab.allow({ one: true, ten: true });
    Lab.objective('Send photons until you’ve seen <b>D2 click</b> at least once (minimum 8 photons).');
    await Lab.waitFire(() => Lab.counts.d2 >= 1 && Lab.total() >= 8, {
      progress: () => `${Lab.total()} photons · D2 clicks: ${Lab.counts.d2}`,
    });
    Lab.allow({});
    const N = Lab.total();
    await checkPrediction(run, p, `Out of ${N} photons: D1 ${Lab.counts.d1}, **D2 ${Lab.counts.d2}**, absorbed ${Lab.counts.absorbed}. The predicted split is 25% / 25% / 50%.`);
    await UI.modal({ title: 'Evidence table', body: evidenceTableHTML(), buttons: [{ label: 'Got it' }] });
    const s = Save.get();
    if (s) {
      s.evidenceUnlocked = true;
      Save.commit();
    }
    await say([
      'Here’s the **key discovery**: with the holder empty, D2 has **0%** probability. So a dark click can **only** happen if something is blocking the lower path.',
      'And that photon was detected at D2, so it was **never absorbed**. You can detect the specimen without a single photon touching it!',
      'Why? The specimen is a **which-path detector**: it makes the two paths distinguishable, so the cancellation at D2 is destroyed. “No particle” doesn’t mean no effect!',
      'Conditional probability gives the numbers: P(D2) = P(not absorbed) × P(D2 | not absorbed) = ½ × ½ = ¼.',
      'But a **bright** click happens 100% of the time when empty and 25% when present. On its own it’s **inconclusive**.',
    ]);
    const states = shuffle([true, false, Math.random() < 0.5]);
    for (let i = 0; i < states.length; i++) {
      await say([`**Sealed holder ${i + 1} of ${states.length}.** You can’t see inside. Send photons one at a time and conclude whenever you’re ready.`]);
      await hiddenRound(run, {
        present: states[i],
        coach: true,
        label: `Holder ${i + 1}`,
        objective: `Holder <b>${i + 1}/${states.length}</b>: is a specimen inside? Send photons one at a time, then <b>Make a conclusion</b>.`,
      });
    }
    Lab.cfg.specimen = 'slot';
    Diagram.set({ specimen: 'slot' });
    await quiz(run, 'post');
  }

  async function level5(run) {
    Lab.setup({ bs2: true, showPhase: true, phaseEditable: false, specimen: 'hidden', overlayAllowed: true, absorbRow: true });
    await say([
      '**Bench 5: Defend your conclusion.** A good scientist separates **proof** from **evidence**, and admits when a result is **inconclusive**.',
      'I’ll show you case files from other experimenters. For each, decide what the outcomes really prove.',
    ]);
    await quiz(run, 'pre');
    const BASIC = ['Specimen absent, for certain', 'Inconclusive', 'Present, and intact', 'Present, but damaged'];
    const cases = [
      {
        log: ['d1'],
        prompt: 'Case 1: one photon, and the **bright** detector clicked. Can you safely conclude that the specimen is absent?',
        options: ['Yes, the specimen is absent', 'No, the result is inconclusive', 'The specimen is present and intact', 'The specimen is present but damaged'],
        answer: 1,
        reasons: [
          'A bright click happens 100% of the time if empty and 25% if present, so both are possible',
          'The bright detector only clicks for empty holders',
          'A specimen would always absorb the photon',
        ],
        explain: 'Bright = inconclusive. It cannot tell the two configurations apart.',
      },
      {
        log: ['d2'],
        prompt: 'Case 2: one photon, and the **dark** detector clicked. What does it prove?',
        options: BASIC,
        answer: 2,
        reasons: ['D2 has 0% probability with an empty holder, and this photon was detected, not absorbed', 'D2 clicks 25% of the time either way', 'A dark click means the photon was absorbed'],
        explain: 'Dark = proof of presence, with no absorption: the specimen is intact.',
      },
      {
        log: ['d1', 'absorbed'],
        prompt: 'Case 3: first a bright click, then the next photon was **absorbed**. What can be concluded?',
        options: BASIC,
        answer: 3,
        reasons: ['Absorption can only happen if something is in the lower path, and it damages the specimen', 'Absorption proves the holder was empty', 'The first bright click already proved it was absent'],
        explain: 'Absorption proves presence, but the specimen is now damaged.',
      },
      {
        log: ['d1', 'd1', 'd1', 'd1', 'd1'],
        prompt: 'Case 4: five photons, **all bright** clicks. What is the most honest conclusion?',
        options: ['Proven absent', 'Very likely absent, but not proven', 'Present, and intact', 'No information at all'],
        answer: 1,
        reasons: [
          'If present, five bright clicks in a row has probability (1/4)⁵ ≈ 0.1%: unlikely, but not zero',
          'Five clicks is enough to make it certain',
          'Bright clicks carry no information whatsoever',
        ],
        explain: 'Repeated bright clicks are **evidence** that makes absence very likely, but they never **prove** it.',
      },
      {
        log: ['d2'],
        phase: 90,
        prompt: 'Case 5: a careless technician left the phase at **φ = 90°**. One photon: the **dark** detector clicked. Is the specimen present?',
        options: ['Yes, present and intact', 'Inconclusive: the device wasn’t calibrated', 'Absent, for certain', 'Present, but damaged'],
        answer: 1,
        reasons: [
          'At 90°, D2 clicks 50% of the time even with an empty holder, so a D2 click is no longer proof',
          'Dark clicks always prove presence, whatever the phase',
          'The phase shifter absorbed the photon',
        ],
        explain: 'Proof depends on **calibration**. Real experiments must check that the dark detector really is dark.',
      },
    ];
    for (let i = 0; i < cases.length; i++) {
      const cs = cases[i];
      Lab.cfg.phaseDeg = cs.phase || 0;
      $('phase-range').value = Lab.cfg.phaseDeg;
      $('phase-val').textContent = Lab.cfg.phaseDeg + '°';
      Lab.renderPhase();
      Lab.cfg.damaged = false;
      Diagram.set({ phaseDeg: Lab.cfg.phaseDeg, specimen: 'hidden' });
      Lab.resetCounts();
      Lab.log = [];
      cs.log.forEach((o) => Lab.record(o));
      Lab.objective(`Case file <b>${i + 1}/${cases.length}</b>: read the photon log and defend a conclusion.`);
      await conclude(run, { prompt: cs.prompt, options: cs.options, answer: cs.answer, reasons: cs.reasons, reasonAnswer: 0, explain: cs.explain });
    }
    Lab.cfg.phaseDeg = 0;
    Diagram.set({ phaseDeg: 0 });
    await say(['Remember the summary: **dark click = proof (intact)**, **absorption = proof (damaged)**, **bright click = inconclusive**, and **calibrate first**.']);
    await quiz(run, 'post');
  }

  async function vault(run) {
    Lab.setup({ bs2: true, showPhase: true, phaseEditable: false, specimen: 'hidden', overlayAllowed: false, absorbRow: true });
    const N = 5;
    let states;
    do states = Array.from({ length: N }, () => Math.random() < 0.5);
    while (states.filter(Boolean).length < 2 || states.filter((x) => !x).length < 1);
    Lab.budget = { left: 15, max: 15 };
    Lab.holders = states.map(() => ({ result: null, current: false }));
    Lab.renderTally();
    await say([
      '**The Specimen Vault.** Five sealed holders. Each may hold a precious light-sensitive specimen.',
      'You have **15 photons** in total. Find the specimens, keep them **intact**, and defend every conclusion. Your **reasoning** is scored. Safe detections and damage are tracked **separately**, because luck plays a part in those.',
    ]);
    const results = [];
    for (let i = 0; i < N; i++) {
      Lab.holders.forEach((h, j) => (h.current = j === i));
      Lab.renderTally();
      if (Lab.budget.left <= 0) await say([`No photons left for holder ${i + 1}. You can still give an honest conclusion.`]);
      const r = await hiddenRound(run, {
        present: states[i],
        coach: false,
        label: `Holder ${i + 1}`,
        objective: `Holder <b>${i + 1}/${N}</b>. Spend photons wisely, then <b>Make a conclusion</b>.`,
      });
      results.push(r);
      Lab.holders[i].current = false;
      Lab.holders[i].result = r.damaged ? 'damage' : r.present ? (r.ev === 'present' ? 'eye' : 'specimen') : 'check';
      Lab.renderTally();
    }
    run.vaultResults = results;
  }

  const LEVELS = { 1: level1, 2: level2, 3: level3, 4: level4, 5: level5, 6: vault };

  function evidenceTableHTML(observed) {
    const rows = Content.evidenceTable
      .map((r) => `<tr><td>${r.outcome}</td><td>${r.absent}</td><td>${r.present}</td></tr>`)
      .join('');
    return `<p>For an ideal, balanced interferometer, calibrated so one detector is normally dark (probability per photon):</p>
      <table class="px-table"><thead><tr><th>Outcome per photon</th><th>Specimen absent</th><th>Absorbing specimen present</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="muted">A dark-detector click identifies the specimen without absorption in that trial. A bright-detector click is inconclusive because it can occur in either configuration.</p>`;
  }

  // =====================================================================
  // Opening, closing and completing levels
  // =====================================================================
  let active = null;

  async function open(id, onDone) {
    const meta = id === 6 ? Content.finale : Content.levels[id - 1];
    const run = makeRun(id);
    active = { id, run };
    $('level').classList.remove('hidden');
    $('lvl-title').textContent = id === 6 ? meta.title : `Level ${id} · ${meta.title}`;
    renderStats(run);
    UI.mountDialog($('level-dialog'));
    Chat.setContext(id === 6 ? null : id, Save.get() ? Math.min(5, Save.get().unlocked) : 1);
    Diagram.start();
    const s = Save.get();
    if (s) {
      s.inLevel = id;
      Save.commit();
    }
    let completed = false;
    try {
      await LEVELS[id](run);
      completed = true;
    } catch (e) {
      if (e !== UI.ABORT) {
        console.error(e);
        UI.toast('Something went wrong in this level. Returning to the lab.');
      }
    }
    if (completed) await complete(run);
    close();
    if (onDone) onDone(completed);
  }

  function close() {
    UI.abortAll();
    Diagram.stop();
    $('level').classList.add('hidden');
    UI.mountDialog(null);
    UI.hideDialog();
    Chat.setContext(null);
    active = null;
    const s = Save.get();
    if (s) {
      s.inLevel = null;
      Save.commit();
    }
  }

  async function leave() {
    if (!active) return;
    const ok = await UI.confirm('Leave this level?', 'Your progress in this level will be lost. Completed levels stay saved.', 'Leave', 'Keep playing');
    if (ok) UI.abortAll();
  }

  function starsFor(run) {
    const pct = run.possible ? run.earned / run.possible : 0;
    return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;
  }
  const starHTML = (n) => [0, 1, 2].map((i) => Sprites.icon(i < n ? 'star' : 'starEmpty', 'big')).join('');

  async function complete(run) {
    const s = Save.get();
    const stars = starsFor(run);
    const prev = s.levels[run.id];
    s.levels[run.id] = {
      id: run.id,
      done: true,
      stars,
      bestStars: Math.max(stars, (prev && prev.bestStars) || 0),
      earned: run.earned,
      possible: run.possible,
      pre: run.pre,
      post: run.post,
      detections: run.detections,
      damage: run.damage,
      notes: run.notes,
    };
    s.unlocked = Math.min(6, Math.max(s.unlocked, run.id + 1));
    if (run.id === 6)
      s.finalResult = {
        earned: run.earned,
        possible: run.possible,
        detections: run.detections,
        present: run.present,
        damage: run.damage,
        correctVerdicts: run.correctVerdicts,
        verdicts: run.verdicts,
      };
    Save.commit();
    Audio.play('fanfare');
    if (run.id === 6) return finalReport(run);
    const meta = Content.levels[run.id - 1];
    const preN = run.pre.filter(Boolean).length;
    const postN = run.post.filter(Boolean).length;
    await UI.modal({
      title: `Level ${run.id} complete!`,
      closable: false,
      body: `
        <div class="complete">
          <div class="stars">${starHTML(stars)}</div>
          <p class="center">Stars come from your <b>reasoning</b>, not from lucky results.</p>
          <div class="stat-grid">
            <div class="stat">${Sprites.icon('star')}<b>${run.earned}/${run.possible}</b><span>Understanding</span></div>
            <div class="stat">${Sprites.icon('book')}<b>${preN}/3 → ${postN}/3</b><span>Warm-up → Check</span></div>
            <div class="stat">${Sprites.icon('eye')}<b>${run.detections}</b><span>Safe detections</span></div>
            <div class="stat ${run.damage ? 'bad' : ''}">${Sprites.icon('damage')}<b>${run.damage}</b><span>Damaged (separate)</span></div>
          </div>
          <div class="insight-card"><img src="${Sprites.iconURL(meta.insight.icon, 6)}" alt=""><div><div class="insight-name">New insight: ${meta.insight.name}</div><div>${meta.insight.text}</div></div></div>
        </div>`,
      buttons: [{ label: run.id < 5 ? 'Back to the lab ▶' : 'Back to the lab: the Vault is open! ▶' }],
    });
  }

  function rankFor(pct) {
    if (pct >= 0.9) return 'Quantum Detective';
    if (pct >= 0.7) return 'Careful Experimenter';
    if (pct >= 0.5) return 'Promising Apprentice';
    return 'Curious Explorer';
  }

  async function finalReport(run) {
    const pct = run.possible ? run.earned / run.possible : 0;
    await UI.modal({
      title: 'Vault report',
      wide: true,
      closable: false,
      body: `
        <div class="complete">
          <div class="stars">${starHTML(starsFor(run))}</div>
          <h3 class="center rank">${rankFor(pct)}</h3>
          <div class="stat-grid">
            <div class="stat">${Sprites.icon('star')}<b>${run.earned}/${run.possible}</b><span>Reasoning score</span></div>
            <div class="stat">${Sprites.icon('check')}<b>${run.correctVerdicts}/${run.verdicts}</b><span>Conclusions matched the evidence</span></div>
            <div class="stat">${Sprites.icon('eye')}<b>${run.detections}/${run.present}</b><span>Specimens found intact</span></div>
            <div class="stat ${run.damage ? 'bad' : ''}">${Sprites.icon('damage')}<b>${run.damage}</b><span>Specimens damaged</span></div>
          </div>
          <p>Why is detection scored separately? Even with perfect play, this interferometer finds a present specimen safely only <b>1 time in 3</b> (dark 25% vs absorbed 50%). Luck decides which; your <b>reasoning</b> is what you control.</p>
          <p class="muted">Open the Notebook in the lab to see your full progress report and copy it for your teacher.</p>
        </div>`,
      buttons: [{ label: 'Back to the lab ▶' }],
    });
  }

  function key(e) {
    if (!active) return false;
    if (e.key === 'f' || e.key === 'F') {
      if (!$('fire1').disabled) Lab.fire(1);
      return true;
    }
    if (e.key === 'Escape') {
      leave();
      return true;
    }
    return false;
  }

  function bindControls() {
    $('fire1').addEventListener('click', () => Lab.fire(1));
    $('fire10').addEventListener('click', () => Lab.fire(10));
    $('btn-conclude').addEventListener('click', () => {
      const w = Lab.waiter;
      if (w && w.kind === 'action' && !Lab.busy) {
        Audio.play('select');
        w.resolve({ type: 'conclude' });
        Lab.updateControls();
      }
    });
    $('phase-range').addEventListener('input', (e) => {
      if (!Lab.cfg || !Lab.cfg.phaseEditable) return;
      Audio.play('click');
      Lab.setPhase(+e.target.value);
    });
    $('btn-overlay').addEventListener('click', () => {
      Lab.overlay = !Lab.overlay;
      Diagram.set({ overlay: Lab.overlay });
      $('btn-overlay').classList.toggle('on', Lab.overlay);
      $('btn-overlay').textContent = Lab.overlay ? 'Hide amplitude graphs' : 'Show amplitude graphs';
      Audio.play('click');
    });
    $('btn-explain').addEventListener('click', () => {
      const c = Lab.cfg;
      Explainer.open({ tab: 'combine', phaseDeg: c.phaseDeg, block: c.specimen === 'dummy', lockBlock: false });
    });
    $('lvl-close').addEventListener('click', leave);
    $('lvl-chat').addEventListener('click', () => Chat.open());
    Diagram.init($('diagram'));
  }

  /** Plain-text report (for copying to a teacher). */
  function reportText() {
    const s = Save.get();
    if (!s) return '';
    const t = Save.totals();
    const lines = ['Quantum Bomb Tester: progress report', `Date: ${new Date().toLocaleString()}`, ''];
    for (let i = 1; i <= 6; i++) {
      const r = s.levels[i];
      const name = i === 6 ? 'Final: The Vault' : `Level ${i}: ${Content.levels[i - 1].title}`;
      if (!r) {
        lines.push(`${name}: not completed`);
        continue;
      }
      const pre = r.pre && r.pre.length ? `, warm-up ${r.pre.filter(Boolean).length}/3 -> check ${r.post.filter(Boolean).length}/3` : '';
      lines.push(`${name}: ${r.bestStars} star(s), understanding ${r.earned}/${r.possible}${pre}, safe detections ${r.detections}, damaged ${r.damage}`);
      (r.notes || []).forEach((n) => lines.push(`   - Q: ${n.question}\n     A: ${n.answer}\n     Student's explanation: "${n.note}"`));
    }
    lines.push('', `Totals: understanding ${t.earned}/${t.possible}, safe detections ${t.detections}, specimens damaged ${t.damage}`);
    return lines.join('\n');
  }

  window.QBT.Levels = { open, key, bindControls, isActive: () => !!active, evidenceTableHTML, reportText, starHTML };
})();

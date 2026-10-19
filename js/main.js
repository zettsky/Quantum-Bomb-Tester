/* Quantum Bomb Tester — boot, screens, HUD, settings, notebook and input routing. */
(function () {
  'use strict';
  const { Settings, Save, Audio, Sprites, UI, Chat, World, Levels, Content, Explainer } = window.QBT;
  const $ = (id) => document.getElementById(id);
  let screen = 'title';

  // ---------------- Screens ----------------
  function show(name) {
    screen = name;
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $('screen-' + name).classList.add('active');
    if (name === 'game') {
      World.start();
      World.rebuild();
      renderHUD();
    } else World.stop();
  }

  function refreshTitle() {
    const has = Save.exists();
    const btn = $('btn-resume');
    btn.disabled = !has;
    if (has) {
      const s = Save.get();
      const done = Save.totals().done;
      btn.innerHTML = `Resume <small>${s.finalResult ? 'Vault complete' : done >= 5 ? 'Vault open' : 'Level ' + Math.min(5, s.unlocked)}</small>`;
    } else btn.textContent = 'Resume';
  }

  async function newGame() {
    Audio.init();
    if (Save.exists()) {
      const ok = await UI.confirm('Start a new game?', 'This will erase your saved progress.', 'Start over', 'Cancel');
      if (!ok) return;
    }
    Save.newGame();
    World.setPlayer(null);
    enterLab();
    await intro();
  }
  function resume() {
    if (!Save.exists()) return;
    Audio.init();
    World.setPlayer(Save.get().player);
    enterLab();
    const s = Save.get();
    if (s.inLevel) {
      s.inLevel = null;
      Save.commit();
      UI.toast('You left mid-level last time. Walk back to that bench to restart it.');
    }
  }
  function enterLab() {
    if (Settings.get().music > 0) Audio.startMusic();
    show('game');
    UI.mountDialog(null);
    Chat.setContext(null, Save.get().unlocked);
  }

  async function intro() {
    const s = Save.get();
    try {
      await UI.say([
        'Ah, you made it! Welcome to the **Quantum Optics Lab**. I’m Prof. Lumen.',
        'Our job: find out whether a **light-sensitive specimen** is present, **without** letting a single photon hit it. It sounds impossible. It isn’t.',
        'Walk with the **arrow keys / WASD** (or the on-screen pad). Stand by a bench and press **E** to start an experiment. Start with **bench 1**, marked with “!”.',
        'Before each experiment you’ll **predict** what happens. Afterwards you’ll **choose a conclusion and explain it**. Good reasoning earns points; lucky results don’t.',
        'Want to go deeper at any time? Tap the **chat bubble** to ask me questions.',
      ]);
    } catch (e) {
      /* aborted */
    }
    s.introSeen = true;
    Save.commit();
  }

  // ---------------- HUD ----------------
  function renderHUD() {
    const s = Save.get();
    if (!s) return;
    const slots = [];
    for (let i = 1; i <= 5; i++) {
      const L = Content.levels[i - 1];
      const rec = s.levels[i];
      const locked = i > s.unlocked;
      const ic = rec && rec.done ? Sprites.icon(L.insight.icon) : locked ? Sprites.icon('lock') : `<span class="num">${i}</span>`;
      const stars = rec && rec.done ? `<span class="mini-stars">${'★'.repeat(rec.bestStars)}${'☆'.repeat(3 - rec.bestStars)}</span>` : '';
      slots.push(`<div class="slot ${i === s.unlocked && !(rec && rec.done) ? 'current' : ''} ${locked ? 'locked' : ''}" title="Level ${i}: ${L.title}${locked ? ' (locked)' : ''}">${ic}${stars}</div>`);
    }
    const v = s.levels[6];
    slots.push(`<div class="slot vault ${s.unlocked >= 6 && !v ? 'current' : ''} ${s.unlocked < 6 ? 'locked' : ''}" title="Final challenge: the Vault">${v ? Sprites.icon('star') : s.unlocked >= 6 ? '<span class="num">V</span>' : Sprites.icon('lock')}</div>`);
    $('hud-slots').innerHTML = slots.join('');
    const t = Save.totals();
    $('hud-stats').innerHTML = `
      <span title="Understanding points">${Sprites.icon('star')} ${t.earned}<small>/${t.possible}</small></span>
      <span title="Safe detections">${Sprites.icon('eye')} ${t.detections}</span>
      <span title="Specimens damaged (tracked separately)" class="${t.damage ? 'bad' : ''}">${Sprites.icon('damage')} ${t.damage}</span>`;
  }

  // ---------------- Interactions in the lab ----------------
  async function onInteract(target) {
    if (UI.isBusy() || Levels.isActive()) return;
    const s = Save.get();
    Audio.play('select');
    if (target.kind === 'prof') return talkToProf();
    const id = target.kind === 'vault' ? 6 : target.id;
    if (id > s.unlocked) {
      Audio.play('bad');
      UI.toast(Sprites.icon('lock') + (id === 6 ? ' The Vault opens once all five levels are complete.' : ` Complete level ${id - 1} first.`));
      return;
    }
    const meta = id === 6 ? Content.finale : Content.levels[id - 1];
    const rec = s.levels[id];
    const go = await UI.modal({
      title: id === 6 ? 'The Vault' : `Bench ${id}`,
      body: `
        <div class="level-card">
          <h3>${id === 6 ? meta.title : 'Level ' + id + ': ' + meta.title}</h3>
          <div class="card-row"><span class="card-k">Your challenge</span><span>${meta.challenge}</span></div>
          <div class="card-row"><span class="card-k">What it teaches</span><span>${meta.teaches}</span></div>
          ${rec ? `<div class="card-row"><span class="card-k">Best</span><span class="stars-inline">${Levels.starHTML(rec.bestStars)}</span></div>` : ''}
          ${id <= 5 ? '<p class="muted">Includes 3 warm-up questions before and 3 check-up questions after.</p>' : ''}
        </div>`,
      buttons: [
        { label: 'Not yet', value: false, cls: 'alt' },
        { label: rec ? 'Play again ▶' : 'Start ▶', value: true },
      ],
    });
    if (!go) return;
    s.player = World.getPlayer();
    Save.commit();
    World.setPaused(true);
    await Levels.open(id, () => {
      renderHUD();
      World.rebuild();
      Chat.setContext(null, Save.get().unlocked);
    });
    if (id === 5 && Save.get().unlocked >= 6 && !Save.get().levels[6]) {
      try {
        await UI.say(['Superb! You’ve mastered all five benches. The **Vault** door (top right) is now open for the final challenge.']);
      } catch (e) {}
    }
  }

  async function talkToProf() {
    const s = Save.get();
    const next = Math.min(6, s.unlocked);
    try {
      const r = await UI.choose({
        prompt: next === 6 && s.finalResult ? 'You’ve finished everything. Wonderful work! Replay any bench to improve your stars, or ask me anything.' : 'Hello again! How can I help?',
        options: ['What should I do next?', 'I have a question (open the chat)', 'Show me the Amplitude Explorer', 'Bye!'],
      });
      if (r.index === 0) {
        const meta = next === 6 ? Content.finale : Content.levels[next - 1];
        await UI.say([
          next === 6 ? `Head to the **Vault** (top right): ${meta.challenge}` : `Go to **bench ${next}**: “${meta.title}”. ${meta.challenge}`,
          `It teaches: ${meta.teaches}`,
        ]);
      } else if (r.index === 1) Chat.open();
      else if (r.index === 2) {
        if (s.unlocked < 3) await UI.say(['Finish **bench 2** first. That’s where amplitudes are introduced.']);
        else await Explainer.open({ tab: 'paths' });
      }
    } catch (e) {
      /* aborted */
    }
  }

  // ---------------- Settings ----------------
  function seg(key, opts) {
    const cur = Settings.get()[key];
    return `<div class="seg" data-key="${key}">${opts.map((o) => `<button type="button" class="${o === cur ? 'on' : ''}" data-v="${o}">${o[0].toUpperCase() + o.slice(1)}</button>`).join('')}</div>`;
  }
  function toggle(key, label) {
    return `<label class="check"><input type="checkbox" data-key="${key}" ${Settings.get()[key] ? 'checked' : ''}><span class="box"></span>${label}</label>`;
  }
  function slider(key, label) {
    const v = Settings.get()[key];
    return `<label class="slider-row"><span>${label}</span><input type="range" min="0" max="100" step="5" data-key="${key}" value="${v}"><b>${v}</b></label>`;
  }
  async function openSettings() {
    const body = document.createElement('div');
    body.className = 'settings';
    body.innerHTML = `
      <h4>Sound</h4>
      ${slider('master', 'Master volume')}
      ${slider('music', 'Music')}
      ${slider('sfx', 'Sound effects')}
      <h4>Gameplay</h4>
      <div class="set-row"><span>Text speed</span>${seg('textSpeed', ['slow', 'normal', 'fast', 'instant'])}</div>
      <div class="set-row"><span>Photon animation</span>${seg('animSpeed', ['slow', 'normal', 'fast'])}</div>
      ${toggle('showExpected', 'Show predicted-share markers on the detector counts')}
      <h4>Accessibility</h4>
      ${toggle('largeText', 'Larger text')}
      ${toggle('reducedMotion', 'Reduce motion (no screen shake, instant photons)')}
      <h4>Controls</h4>
      <p class="muted">Move: arrow keys / WASD · Interact / advance text: E, Enter or Space · Answer: 1–4 · Send photon: F · Notebook: N · Chat: C · Menu / leave level: Esc</p>
      ${Save.exists() ? '<h4>Data</h4><button type="button" class="btn small danger" id="reset-progress">Erase saved progress</button>' : ''}`;
    body.addEventListener('input', (e) => {
      const k = e.target.dataset.key;
      if (!k) return;
      if (e.target.type === 'range') {
        Settings.set(k, +e.target.value);
        e.target.nextElementSibling.textContent = e.target.value;
        if (k === 'music') +e.target.value > 0 && screen === 'game' ? Audio.startMusic() : +e.target.value === 0 && Audio.stopMusic();
      } else if (e.target.type === 'checkbox') {
        Settings.set(k, e.target.checked);
        applySettings();
      }
    });
    body.addEventListener('change', (e) => {
      if (e.target.type === 'range') Audio.play('click');
    });
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('.seg button');
      if (b) {
        const k = b.parentElement.dataset.key;
        Settings.set(k, b.dataset.v);
        b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        Audio.play('click');
      }
      if (e.target.id === 'reset-progress') {
        const ok = await UI.confirm('Erase progress?', 'All levels, scores and notes will be deleted. This cannot be undone.', 'Erase', 'Cancel');
        if (ok) {
          Save.wipe();
          UI.closeTopModal();
          UI.abortAll();
          if (Levels.isActive()) UI.abortAll();
          show('title');
          refreshTitle();
        }
      }
    });
    Audio.init();
    await UI.modal({ title: Sprites.icon('gear') + ' Settings', body, buttons: [{ label: 'Done' }] });
  }
  function applySettings() {
    const s = Settings.get();
    document.body.classList.toggle('large-text', !!s.largeText);
    document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
  }

  // ---------------- Notebook ----------------
  async function openNotebook() {
    const s = Save.get();
    if (!s) return;
    const body = document.createElement('div');
    body.className = 'notebook';
    const tabs = [
      { id: 'insights', label: 'Insights' },
      { id: 'evidence', label: 'Evidence table' },
      { id: 'progress', label: 'Progress' },
      { id: 'notes', label: 'Your explanations' },
    ];
    body.innerHTML = `<div class="tabs">${tabs.map((t) => `<button type="button" class="tab" data-tab="${t.id}">${t.label}</button>`).join('')}</div><div class="nb-body"></div>`;
    const nb = body.querySelector('.nb-body');
    const render = (id) => {
      body.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
      if (id === 'insights') {
        nb.innerHTML = `<div class="insight-grid">${Content.levels
          .map((L) => {
            const got = s.levels[L.id] && s.levels[L.id].done;
            return `<div class="insight ${got ? '' : 'locked'}"><div class="slot big">${got ? Sprites.icon(L.insight.icon) : '?'}</div><div><b>${got ? L.insight.name : 'Level ' + L.id + ': ???'}</b><div>${got ? L.insight.text : 'Complete level ' + L.id + ' to collect this insight.'}</div></div></div>`;
          })
          .join('')}</div>`;
      } else if (id === 'evidence') {
        nb.innerHTML = s.evidenceUnlocked || (s.levels[4] && s.levels[4].done) ? Levels.evidenceTableHTML() : '<p class="muted">Discover this table at bench 4.</p>';
      } else if (id === 'progress') {
        const rows = [];
        for (let i = 1; i <= 6; i++) {
          const r = s.levels[i];
          const name = i === 6 ? 'Vault' : `${i}. ${Content.levels[i - 1].title}`;
          rows.push(
            r
              ? `<tr><td>${name}</td><td>${'★'.repeat(r.bestStars)}${'☆'.repeat(3 - r.bestStars)}</td><td>${r.earned}/${r.possible}</td><td>${r.pre && r.pre.length ? r.pre.filter(Boolean).length + '/3 → ' + r.post.filter(Boolean).length + '/3' : '—'}</td><td>${r.detections}</td><td>${r.damage}</td></tr>`
              : `<tr class="muted"><td>${name}</td><td colspan="5">not completed</td></tr>`
          );
        }
        const t = Save.totals();
        nb.innerHTML = `<table class="px-table"><thead><tr><th>Level</th><th>Stars</th><th>Understanding</th><th>Warm-up → Check</th><th>Safe det.</th><th>Damaged</th></tr></thead><tbody>${rows.join('')}</tbody>
          <tfoot><tr><td>Total</td><td></td><td>${t.earned}/${t.possible}</td><td></td><td>${t.detections}</td><td>${t.damage}</td></tr></tfoot></table>
          <p class="muted">Understanding is earned by reasoning. Safe detections and damage depend partly on luck, so they are tracked separately.</p>
          <button type="button" class="btn small" id="copy-report">Copy report for my teacher</button>`;
        nb.querySelector('#copy-report').addEventListener('click', async () => {
          const text = Levels.reportText();
          try {
            await navigator.clipboard.writeText(text);
            UI.toast('Report copied to the clipboard.');
          } catch (e) {
            UI.modal({ title: 'Your report', body: `<textarea class="report-box" readonly rows="14">${UI.esc(text)}</textarea>`, buttons: [{ label: 'Close' }] });
          }
        });
      } else {
        const notes = [];
        Object.values(s.levels).forEach((r) => (r.notes || []).forEach((n) => notes.push(n)));
        nb.innerHTML = notes.length
          ? notes.map((n) => `<div class="note"><div class="muted">Level ${n.level > 5 ? 'Vault' : n.level}: ${UI.esc(n.question)}</div><div><b>${UI.esc(n.answer)}</b></div><div>“${UI.esc(n.note)}”</div></div>`).join('')
          : '<p class="muted">When you explain a conclusion in your own words, it is saved here.</p>';
      }
    };
    body.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (b) {
        Audio.play('click');
        render(b.dataset.tab);
      }
    });
    render('insights');
    await UI.modal({ title: Sprites.icon('book') + ' Notebook', body, wide: true, buttons: [{ label: 'Close' }] });
  }

  async function openMenu() {
    const v = await UI.modal({
      title: 'Paused',
      body: '<p class="center">Your progress saves automatically after every level.</p>',
      buttons: [
        { label: 'Notebook', value: 'book', cls: 'alt' },
        { label: 'Settings', value: 'settings', cls: 'alt' },
        { label: 'Quit to title', value: 'quit', cls: 'alt' },
        { label: 'Resume', value: 'resume' },
      ],
    });
    if (v === 'book') openNotebook();
    else if (v === 'settings') openSettings();
    else if (v === 'quit') {
      const s = Save.get();
      if (s) {
        s.player = World.getPlayer();
        Save.commit();
      }
      Audio.stopMusic();
      show('title');
      refreshTitle();
    }
  }

  // ---------------- Input ----------------
  const MOVE = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

  document.addEventListener('keydown', (e) => {
    Audio.init();
    const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox';
    if (UI.modalKey(e)) return;
    if (Chat.isOpen()) {
      if (e.key === 'Escape') Chat.close();
      return;
    }
    if (typing) return;
    if (UI.dialogKey(e)) {
      e.preventDefault();
      return;
    }
    if (Levels.isActive()) {
      if (Levels.key(e)) e.preventDefault();
      return;
    }
    if (screen !== 'game') return;
    if (MOVE[e.key]) {
      World.keys.add(MOVE[e.key]);
      e.preventDefault();
    } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      World.interact();
    } else if (e.key === 'Escape') openMenu();
    else if (e.key === 'n' || e.key === 'N') openNotebook();
    else if (e.key === 'c' || e.key === 'C') Chat.open();
  });
  document.addEventListener('keyup', (e) => {
    if (MOVE[e.key]) World.keys.delete(MOVE[e.key]);
  });
  window.addEventListener('blur', () => World.keys.clear());

  function bindTouch() {
    document.querySelectorAll('.dpad button').forEach((b) => {
      const dir = b.dataset.dir;
      const on = (e) => {
        e.preventDefault();
        Audio.init();
        World.keys.add(dir);
      };
      const off = () => World.keys.delete(dir);
      b.addEventListener('pointerdown', on);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
    });
    $('touch-a').addEventListener('click', () => {
      if (UI.isBusy()) return;
      World.interact();
    });
  }

  // ---------------- Title background ----------------
  function titleBackground() {
    const cv = $('title-bg');
    const ctx = cv.getContext('2d');
    const dots = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: Math.random() < 0.2 ? 2 : 1, p: Math.random() * 6 }));
    function frame(t) {
      if (screen === 'title') {
        const w = (cv.width = Math.ceil(innerWidth / 4));
        const h = (cv.height = Math.ceil(innerHeight / 4));
        ctx.fillStyle = '#263a40';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) {
          ctx.fillStyle = '#2a3f45';
          ctx.fillRect(x, y, 8, 8);
        }
        // faint interferometer outline
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        ctx.fillStyle = 'rgba(116,149,147,0.35)';
        for (let i = -60; i <= 60; i += 3) {
          ctx.fillRect(cx + i, cy - 40, 1, 1);
          ctx.fillRect(cx + i, cy + 40, 1, 1);
        }
        for (let i = -40; i <= 40; i += 3) {
          ctx.fillRect(cx - 60, cy + i, 1, 1);
          ctx.fillRect(cx + 60, cy + i, 1, 1);
        }
        dots.forEach((d) => {
          if (!Settings.get().reducedMotion) d.x = (d.x + d.v * 0.004) % 1;
          ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 0.002 + d.p);
          ctx.fillStyle = d.s === 2 ? '#fec837' : '#b9cbc9';
          ctx.fillRect(Math.floor(d.x * w), Math.floor(d.y * h), d.s, d.s);
        });
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------- Boot ----------------
  function boot() {
    applySettings();
    $('hud-chat').innerHTML = Sprites.icon('chat');
    $('hud-book').innerHTML = Sprites.icon('book');
    $('hud-gear').innerHTML = Sprites.icon('gear');
    $('hud-menu').innerHTML = Sprites.icon('menu');
    $('lvl-chat').innerHTML = Sprites.icon('chat');
    $('btn-new').addEventListener('click', () => {
      Audio.play('select');
      newGame();
    });
    $('btn-resume').addEventListener('click', () => {
      Audio.play('select');
      resume();
    });
    $('btn-settings').addEventListener('click', () => {
      Audio.play('select');
      openSettings();
    });
    $('hud-chat').addEventListener('click', () => Chat.open());
    $('hud-book').addEventListener('click', () => {
      Audio.play('select');
      openNotebook();
    });
    $('hud-gear').addEventListener('click', () => {
      Audio.play('select');
      openSettings();
    });
    $('hud-menu').addEventListener('click', () => {
      Audio.play('select');
      openMenu();
    });
    World.init($('world'), $('prompt'), $('world-wrap'));
    World.onInteract(onInteract);
    Levels.bindControls();
    bindTouch();
    titleBackground();
    refreshTitle();
    // Keep the lab frozen while any overlay, dialog or level is open.
    setInterval(() => {
      if (screen === 'game') World.setPaused(Levels.isActive() || UI.isBusy());
    }, 100);
    // Persist the player's position now and then.
    setInterval(() => {
      const s = Save.get();
      if (screen === 'game' && s && !Levels.isActive()) {
        s.player = World.getPlayer();
        Save.commit();
      }
    }, 4000);
    // Redraw text-heavy canvases once the pixel font has loaded.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => World.rebuild());
  }

  boot();
})();

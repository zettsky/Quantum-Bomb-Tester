/* Quantum Bomb Tester — the walkable pixel-art lab (hub world). */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Sprites, Audio, Save, Settings, Content } = window.QBT;

  const TS = 16;
  const W = 320;
  const H = 176;
  const MAP = [
    'WWWWWWWWWWWWWWWWWWWW',
    'WwwSwwwBBBBwwSwwVVwW',
    'WP................PW',
    'W..................W',
    'W..................W',
    'W.....RRRRRRR......W',
    'W.....RRRRRRR......W',
    'W..................W',
    'W..................W',
    'WP................PW',
    'WWWWWWWWWWWWWWWWWWWW',
  ];
  const SOLID = new Set(['W', 'w', 'S', 'B', 'V', 'P']);
  const STATIONS = [
    { id: 1, tx: 2, ty: 3 },
    { id: 2, tx: 6, ty: 3 },
    { id: 3, tx: 10, ty: 3 },
    { id: 4, tx: 5, ty: 7 },
    { id: 5, tx: 10, ty: 7 },
  ];
  const VAULT = { x: 256, y: 16, w: 32, h: 16 };
  const PROF = { x: 15 * TS + 8, y: 6 * TS + 4 };
  const START = { x: 9 * TS + 8, y: 5 * TS + 12, dir: 'down' };

  let canvas, ctx, promptEl, wrap;
  let staticLayer = null;
  let running = false;
  let paused = false;
  let last = 0;
  const keys = new Set();
  const player = { x: START.x, y: START.y, dir: 'down', frame: 0, animT: 0, moving: false, stepT: 0 };
  let target = null;
  let onInteract = null;
  const motes = [];

  function init(cv, prompt, wrapEl) {
    canvas = cv;
    ctx = cv.getContext('2d');
    promptEl = prompt;
    wrap = wrapEl;
    canvas.width = W;
    canvas.height = H;
    for (let i = 0; i < 10; i++) motes.push({ x: Math.random() * W, y: 40 + Math.random() * 120, v: 4 + Math.random() * 6, p: Math.random() * 6 });
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', (e) => {
      // tap on the prompt target = interact
      if (target && !paused) onInteract && onInteract(target);
    });
  }

  function resize() {
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    let s = Math.min(r.width / W, r.height / H);
    if (s >= 1) s = Math.max(1, Math.floor(s * 2) / 2);
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    canvas.dataset.scale = s;
  }

  const unlocked = () => Save.unlocked();
  const levelRec = (id) => (Save.get() && Save.get().levels[id]) || null;

  // ---------- static layer ----------
  const hash = (x, y) => {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  };
  function rebuild() {
    staticLayer = document.createElement('canvas');
    staticLayer.width = W;
    staticLayer.height = H;
    const c = staticLayer.getContext('2d');
    const r = (x, y, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
    };
    for (let ty = 0; ty < MAP.length; ty++) {
      for (let tx = 0; tx < MAP[ty].length; tx++) {
        const t = MAP[ty][tx];
        const x = tx * TS;
        const y = ty * TS;
        if (t === 'W') {
          r(x, y, TS, TS, '#22343a');
          if (ty === 0 || ty === MAP.length - 1) r(x, y + (ty === 0 ? 12 : 0), TS, 4, '#2b4148');
          else r(x + (tx === 0 ? 12 : 0), y, 4, TS, '#2b4148');
          continue;
        }
        if (t === 'w' || t === 'S' || t === 'B' || t === 'V') {
          r(x, y, TS, TS, '#394f57');
          r(x, y, TS, 2, '#749593');
          r(x, y + 13, TS, 3, '#2b3d43');
          r(x + 7, y + 2, 1, 11, '#35494f');
          continue;
        }
        // floor
        const alt = (tx + ty) % 2 === 0;
        r(x, y, TS, TS, alt ? '#446668' : '#416361');
        if (hash(tx, ty) > 0.6) r(x + Math.floor(hash(ty, tx) * 12) + 2, y + Math.floor(hash(tx + 7, ty) * 12) + 2, 2, 1, '#4f7375');
        r(x, y + 15, TS, 1, '#3d5c5b');
        if (t === 'R') {
          r(x, y, TS, TS, '#525162');
          r(x + 2, y + 2, TS - 4, TS - 4, '#5c5b6e');
          if (hash(tx, ty) > 0.5) r(x + 7, y + 7, 2, 2, '#fd9978');
        }
        if (t === 'P') {
          r(x + 4, y + 9, 8, 6, '#d9735a');
          r(x + 3, y + 8, 10, 2, '#fd9978');
          r(x + 2, y + 1, 4, 7, '#5f8f5a');
          r(x + 6, y - 2, 4, 10, '#9bd48a');
          r(x + 10, y + 2, 4, 6, '#5f8f5a');
          r(x + 7, y, 2, 4, '#c8ebb9');
        }
      }
    }
    // rug border
    c.strokeStyle = '#fec837';
    c.lineWidth = 1;
    c.strokeRect(6 * TS + 1.5, 5 * TS + 1.5, 7 * TS - 3, 2 * TS - 3);

    // shelves
    [3, 13].forEach((tx) => {
      const x = tx * TS;
      r(x, 1, TS, 29, '#1b282d');
      r(x + 1, 2, TS - 2, 27, '#525162');
      const books = ['#fd9978', '#fec837', '#b9cbc9', '#749593', '#e8615a', '#ffffff'];
      [4, 16].forEach((sy) => {
        r(x + 1, sy + 9, TS - 2, 2, '#1b282d');
        let bx = x + 2;
        let i = tx + sy;
        while (bx < x + TS - 3) {
          const bw = 2 + (i % 2);
          r(bx, sy + 1 + (i % 3), bw, 8 - (i % 3), books[i % books.length]);
          bx += bw + 1;
          i++;
        }
      });
    });
    // chalkboard with an interferometer sketch
    r(112, 2, 64, 27, '#1b282d');
    r(113, 3, 62, 25, '#749593');
    r(115, 5, 58, 21, '#2f4a46');
    c.fillStyle = '#d9e2e1';
    [[120, 22, 20, 1], [120, 9, 1, 13], [120, 9, 28, 1], [140, 22, 8, 1], [148, 9, 1, 14]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
    r(119, 21, 3, 3, '#fec837');
    r(147, 8, 3, 3, '#fec837');
    Sprites.drawText(c, 'E=HF', 154, 9, '#fec837');
    Sprites.drawText(c, 'P=A', 154, 17, '#fd9978');
    r(166, 17, 2, 2, '#fd9978');
    r(115, 26, 58, 2, '#525162');
    r(160, 26, 6, 1, '#ffffff');

    // vault door
    const vu = unlocked() >= 6;
    r(254, 0, 36, 32, '#1b282d');
    r(256, 1, 32, 30, '#525162');
    r(258, 3, 28, 26, vu ? '#5c6a7a' : '#46455a');
    for (let i = 0; i < 7; i++) r(258 + i * 4, 26, 2, 3, i % 2 ? '#1b282d' : '#fec837');
    c.fillStyle = vu ? '#fec837' : '#749593';
    c.beginPath();
    c.arc(272, 15, 7, 0, Math.PI * 2);
    c.fill();
    r(271, 8, 2, 14, '#1b282d');
    r(265, 14, 14, 2, '#1b282d');
    Sprites.drawText(c, 'VAULT', 263, 4, vu ? '#fec837' : '#b9cbc9');

    STATIONS.forEach((s) => drawBench(c, s));
  }

  function drawBench(c, s) {
    const x = s.tx * TS;
    const y = s.ty * TS;
    const open = s.id <= unlocked();
    const r = (a, b, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(a, b, w, h);
    };
    r(x - 1, y - 1, 34, 17, '#1b282d');
    r(x, y, 32, 9, open ? '#749593' : '#5b6b6b');
    r(x, y, 32, 1, '#b9cbc9');
    r(x, y + 9, 32, 6, '#525162');
    r(x + 2, y + 15, 3, 1, '#1b282d');
    r(x + 27, y + 15, 3, 1, '#1b282d');
    // number plate
    r(x + 12, y + 9, 8, 7, '#1b282d');
    Sprites.drawText(c, String(s.id), x + 15, y + 10, open ? '#fec837' : '#749593');
    // equipment on the bench top
    const k = '#1b282d';
    if (s.id === 1) {
      r(x + 3, y + 2, 6, 4, '#fd9978');
      r(x + 13, y + 2, 4, 4, '#ffffff');
      r(x + 22, y + 1, 4, 4, '#fec837');
      r(x + 13, y - 4, 4, 4, '#fec837');
      r(x + 9, y + 3, 4, 1, k);
    } else if (s.id === 2) {
      r(x + 4, y + 2, 5, 5, '#ffffff');
      r(x + 22, y + 2, 5, 5, '#ffffff');
      r(x + 9, y + 4, 13, 1, '#fec837');
      r(x + 4, y - 3, 5, 3, '#b9cbc9');
    } else if (s.id === 3) {
      c.fillStyle = '#fec837';
      c.beginPath();
      c.arc(x + 16, y + 3, 5, 0, Math.PI * 2);
      c.fill();
      r(x + 16, y, 1, 4, k);
      r(x + 4, y + 2, 4, 5, '#b9cbc9');
      r(x + 24, y + 2, 4, 5, '#b9cbc9');
    } else if (s.id === 4) {
      Sprites.drawIcon(c, 'specimen', x + 12, y - 4, 1);
      r(x + 3, y + 3, 5, 4, '#525162');
      r(x + 24, y + 3, 5, 4, '#525162');
    } else if (s.id === 5) {
      r(x + 4, y + 1, 10, 7, '#ffffff');
      r(x + 5, y + 3, 8, 1, '#749593');
      r(x + 5, y + 5, 6, 1, '#749593');
      r(x + 20, y + 2, 6, 6, '#fec837');
      r(x + 22, y + 4, 2, 2, '#d9a514');
    }
  }

  // ---------- movement ----------
  function solidAt(x, y) {
    const tx = Math.floor(x / TS);
    const ty = Math.floor(y / TS);
    if (ty < 0 || ty >= MAP.length || tx < 0 || tx >= MAP[0].length) return true;
    if (SOLID.has(MAP[ty][tx])) return true;
    for (const s of STATIONS) {
      if (x >= s.tx * TS && x < s.tx * TS + 32 && y >= s.ty * TS && y < s.ty * TS + 15) return true;
    }
    if (Math.abs(x - PROF.x) < 6 && y > PROF.y - 5 && y < PROF.y + 1) return true;
    return false;
  }
  function blocked(x, y) {
    return solidAt(x - 5, y - 4) || solidAt(x + 5, y - 4) || solidAt(x - 5, y) || solidAt(x + 5, y);
  }

  function update(dt) {
    let dx = 0;
    let dy = 0;
    if (!paused) {
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dy -= 1;
      if (keys.has('down')) dy += 1;
    }
    player.moving = dx !== 0 || dy !== 0;
    if (player.moving) {
      if (dx && dy) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      const sp = 72 * dt;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? 'left' : 'right';
      else if (dy) player.dir = dy < 0 ? 'up' : 'down';
      const nx = player.x + dx * sp;
      if (!blocked(nx, player.y)) player.x = nx;
      const ny = player.y + dy * sp;
      if (!blocked(player.x, ny)) player.y = ny;
      player.animT += dt;
      if (player.animT > 0.16) {
        player.animT = 0;
        player.frame++;
      }
      player.stepT += dt;
      if (player.stepT > 0.3) {
        player.stepT = 0;
        Audio.play('step');
      }
    } else {
      player.frame = 0;
    }
    target = paused ? null : findTarget();
    updatePrompt();
  }

  function distToRect(x, y, rc) {
    const dx = Math.max(rc.x - x, 0, x - (rc.x + rc.w));
    const dy = Math.max(rc.y - y, 0, y - (rc.y + rc.h));
    return Math.hypot(dx, dy);
  }
  function findTarget() {
    const cands = [];
    STATIONS.forEach((s) => cands.push({ kind: 'level', id: s.id, rect: { x: s.tx * TS, y: s.ty * TS, w: 32, h: 15 } }));
    cands.push({ kind: 'vault', id: 6, rect: VAULT });
    cands.push({ kind: 'prof', rect: { x: PROF.x - 8, y: PROF.y - 14, w: 16, h: 16 } });
    let best = null;
    let bd = 13;
    cands.forEach((c) => {
      const d = distToRect(player.x, player.y - 3, c.rect);
      if (d < bd) {
        bd = d;
        best = c;
      }
    });
    return best;
  }

  function updatePrompt() {
    if (!promptEl) return;
    if (!target) {
      promptEl.classList.add('hidden');
      return;
    }
    let label;
    if (target.kind === 'prof') label = 'Talk to Prof. Lumen';
    else if (target.kind === 'vault') label = unlocked() >= 6 ? 'Final challenge: The Vault' : 'Vault (finish all 5 levels)';
    else {
      const L = Content.levels[target.id - 1];
      label = target.id <= unlocked() ? `Level ${target.id}: ${L.title}` : `Level ${target.id} (locked)`;
    }
    const locked = (target.kind === 'level' && target.id > unlocked()) || (target.kind === 'vault' && unlocked() < 6);
    promptEl.innerHTML = `<span class="key">E</span> ${locked ? Sprites.icon('lock') : ''}${label}`;
    promptEl.classList.remove('hidden');
    const s = parseFloat(canvas.dataset.scale || 1);
    const cr = canvas.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const cx = target.rect.x + target.rect.w / 2;
    const cy = target.rect.y;
    const half = promptEl.offsetWidth / 2 + 4;
    const left = cr.left - wr.left + cx * s;
    promptEl.style.left = Math.max(half, Math.min(wr.width - half, left)) + 'px';
    promptEl.style.top = cr.top - wr.top + Math.max(0, cy - 20) * s + 'px';
  }

  // ---------- render ----------
  function render(t) {
    if (!staticLayer) rebuild();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(staticLayer, 0, 0);
    const u = unlocked();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);
    const bob = Math.round(Math.sin(t * 0.006) * 2);

    // station markers
    STATIONS.forEach((s) => {
      const x = s.tx * TS;
      const y = s.ty * TS;
      const rec = levelRec(s.id);
      if (s.id === u && !(rec && rec.done)) {
        ctx.globalAlpha = 0.4 + 0.5 * pulse;
        ctx.strokeStyle = '#fec837';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2.5, y - 2.5, 37, 20);
        ctx.globalAlpha = 1;
        Sprites.drawText(ctx, '!', x + 15, y - 12 + bob, '#fec837');
      }
      if (rec && rec.done) {
        const stars = rec.bestStars || rec.stars || 1;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i < stars ? '#fec837' : '#525162';
          ctx.fillRect(x + 9 + i * 5, y - 7, 3, 3);
          ctx.fillRect(x + 10 + i * 5, y - 8, 1, 5);
          ctx.fillRect(x + 8 + i * 5, y - 6, 5, 1);
        }
      }
      if (s.id > u) Sprites.drawIcon(ctx, 'lock', x + 24, y - 6, 1);
    });
    if (u >= 6) {
      ctx.globalAlpha = 0.3 + 0.4 * pulse;
      ctx.strokeStyle = '#fec837';
      ctx.strokeRect(253.5, 0.5, 37, 33);
      ctx.globalAlpha = 1;
      if (!(Save.get() && Save.get().finalResult)) Sprites.drawText(ctx, '!', 271, 36 + bob, '#fec837');
    } else Sprites.drawIcon(ctx, 'lock', 268, 18, 1);

    // floating photon motes
    if (!Settings.get().reducedMotion) {
      motes.forEach((m) => {
        m.x += m.v * 0.016;
        if (m.x > W) m.x = -4;
        const yy = m.y + Math.sin(t * 0.002 + m.p) * 4;
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 0.004 + m.p);
        ctx.fillStyle = '#fec837';
        ctx.fillRect(Math.round(m.x), Math.round(yy), 1, 1);
        ctx.globalAlpha = 1;
      });
    }

    // characters, sorted by y
    const profDir = Math.abs(player.x - PROF.x) + Math.abs(player.y - PROF.y) < 48 ? facing(PROF, player) : 'down';
    const actors = [
      { y: PROF.y, draw: () => Sprites.drawChar(ctx, 'prof', profDir, 0, PROF.x - 8, PROF.y - 16 + (Math.sin(t * 0.003) > 0.6 ? -1 : 0)) },
      { y: player.y, draw: () => Sprites.drawChar(ctx, 'player', player.dir, player.moving ? player.frame : 0, Math.round(player.x - 8), Math.round(player.y - 16)) },
    ];
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
    // professor speech bubble
    ctx.fillStyle = '#1b282d';
    ctx.fillRect(PROF.x + 3, PROF.y - 27 + bob, 11, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(PROF.x + 4, PROF.y - 26 + bob, 9, 7);
    ctx.fillRect(PROF.x + 5, PROF.y - 19 + bob, 2, 1);
    Sprites.drawText(ctx, '?', PROF.x + 7, PROF.y - 25 + bob, '#394f57');
  }
  function facing(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    update(dt);
    render(t);
    requestAnimationFrame(loop);
  }

  window.QBT.World = {
    init,
    resize,
    rebuild,
    start() {
      if (running) return;
      running = true;
      last = 0;
      resize();
      rebuild();
      requestAnimationFrame(loop);
    },
    stop() {
      running = false;
    },
    setPaused(p) {
      paused = p;
      if (p) keys.clear();
    },
    isPaused: () => paused,
    keys,
    interact() {
      if (paused) return;
      target = findTarget();
      if (target && onInteract) onInteract(target);
    },
    onInteract: (fn) => (onInteract = fn),
    getPlayer: () => ({ x: player.x, y: player.y, dir: player.dir }),
    setPlayer(p) {
      const q = p || START;
      player.x = q.x;
      player.y = q.y;
      player.dir = q.dir || 'down';
      if (blocked(player.x, player.y)) {
        player.x = START.x;
        player.y = START.y;
      }
    },
  };
})();

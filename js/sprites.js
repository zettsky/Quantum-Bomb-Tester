/* Quantum Bomb Tester — pixel-art sprites, icons and a tiny 3×5 bitmap font. */
(function () {
  'use strict';
  window.QBT = window.QBT || {};

  // Palette follows the slate/teal UI theme, with coral and gold accents.
  const PAL = {
    k: '#1b282d', // outline
    K: '#2b2b35', // shoes / dark
    w: '#ffffff',
    c: '#b9cbc9', // mist
    m: '#749593', // sage
    t: '#446668', // teal
    d: '#394f57', // deep
    s: '#525162', // slate
    o: '#fd9978', // coral
    O: '#d9735a',
    g: '#fec837', // gold
    G: '#d9a514',
    y: '#ffe9a0',
    r: '#e8615a', // red
    R: '#a83c3c',
    n: '#9bd48a', // green
    N: '#5f8f5a',
  };

  // ---------- Characters (16×16) ----------
  const pad16 = (row) => (row + '................').slice(0, 16);
  const mirror = (half) => (half.length >= 16 ? half : half + half.split('').reverse().join(''));

  const FRONT = [
    '........',
    '.....kkk',
    '....khhh',
    '...khhhh',
    '...khggh',
    '...khsss',
    '...ksess',
    '...kssss',
    '....kwoo',
    '...kwwoo',
    '..kswwoo',
    '..kkwwww',
    '...kcwww',
  ].map(mirror);

  const BACK = [
    '........',
    '.....kkk',
    '....khhh',
    '...khhhh',
    '...kghhh',
    '...khhhh',
    '...khhhh',
    '....khhh',
    '....kwww',
    '...kwwww',
    '..kswwww',
    '..kkwwww',
    '...kcwww',
  ].map(mirror);

  const SIDE = [
    '................',
    '.....kkkkk......',
    '....khhhhhk.....',
    '...khhhhhhhk....',
    '...khhhhgggk....',
    '...khhhhsssk....',
    '...khhhssesk....',
    '....khsssssk....',
    '.....kwwook.....',
    '....kwwwook.....',
    '....kwwsook.....',
    '....kwwkwwk.....',
    '....kcwwwck.....',
  ].map(pad16);

  const LEGS_FB = [
    ['....kddkkddk....', '....kKKkkKKk....', '................'],
    ['...kddk..kddk...', '...kKKk..kKKk...', '................'],
  ];
  const LEGS_SIDE = [
    ['.....kddk.......', '.....kKKk.......', '................'],
    ['....kdk.kdk.....', '...kKk...kKk....', '................'],
  ];

  function charFrame(dir, frame) {
    const f = frame % 2;
    if (dir === 'up') return BACK.concat(LEGS_FB[f]);
    if (dir === 'left' || dir === 'right') return SIDE.concat(LEGS_SIDE[f]);
    return FRONT.concat(LEGS_FB[f]);
  }

  const PLAYER_PAL = { h: '#7a4b3a', s: '#f2c39b', g: '#fec837', w: '#ffffff', c: '#b9cbc9', o: '#fd9978', d: '#394f57', e: '#1b282d' };
  const PROF_PAL = { h: '#e6ecea', s: '#e9b48c', g: '#749593', w: '#ffffff', c: '#b9cbc9', o: '#fec837', d: '#525162', e: '#1b282d' };

  function drawRows(ctx, rows, pal, x, y, flip, scale) {
    const sc = scale || 1;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const n = row.length;
      for (let c = 0; c < n; c++) {
        const ch = row[flip ? n - 1 - c : c];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = (pal && pal[ch]) || PAL[ch] || '#ff00ff';
        ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
      }
    }
  }

  function drawChar(ctx, who, dir, frame, x, y, scale) {
    const rows = charFrame(dir, frame);
    drawRows(ctx, rows, who === 'prof' ? PROF_PAL : PLAYER_PAL, x, y, dir === 'left', scale);
  }

  // ---------- Icons (8×8) ----------
  const ICONS = {
    photon: ['...gg...', '..gyyg..', '.gyyyyg.', 'gyywwyyg', 'gyywwyyg', '.gyyyyg.', '..gyyg..', '...gg...'],
    bright: ['..kkkk..', '.kggggk.', 'kggyyggk', 'kgyyyygk', 'kgyyyygk', 'kggyyggk', '.kggggk.', '..kkkk..'],
    dark: ['..kkkk..', '.kssssk.', 'kssoossk', 'ksoooosk', 'ksoooosk', 'kssoossk', '.kssssk.', '..kkkk..'],
    absorbed: ['r......r', '.r....r.', '..r..r..', '...rr...', '...rr...', '..r..r..', '.r....r.', 'r......r'],
    eye: ['........', '..kkkk..', '.kwwwwk.', 'kwwttwwk', 'kwwttwwk', '.kwwwwk.', '..kkkk..', '........'],
    damage: ['...kk...', '..krrk..', '.krrkrk.', 'krrkrrrk', 'krkrrrrk', '.krrkrk.', '..krrk..', '...kk...'],
    star: ['...gg...', '...gg...', 'gggggggg', '.gggggg.', '..gggg..', '.gg..gg.', 'gg....gg', '........'],
    starEmpty: ['...ss...', '...ss...', 'ssssssss', '.ssssss.', '..ssss..', '.ss..ss.', 'ss....ss', '........'],
    lock: ['..kkkk..', '.kk..kk.', '.k....k.', 'kkkkkkkk', 'kggggggk', 'kgggkggk', 'kggggggk', 'kkkkkkkk'],
    check: ['........', '.......n', '......nn', 'n....nn.', 'nn..nn..', '.nnnn...', '..nn....', '........'],
    book: ['.kkkkkk.', 'kowwwwok', 'kowwwwok', 'kowkkwok', 'kowwwwok', 'kowkkwok', 'kooooook', '.kkkkkk.'],
    gear: ['..k..k..', '.kkkkkk.', '.kk..kk.', 'kk....kk', 'kk....kk', '.kk..kk.', '.kkkkkk.', '..k..k..'],
    chat: ['.kkkkkk.', 'kwwwwwwk', 'kwwwwwwk', 'kwkwkwkk', 'kwwwwwwk', '.kkkkkk.', '..kk....', '.k......'],
    detector: ['.kkkkkk.', 'kssssssk', 'ksggggsk', 'ksgyygsk', 'ksgyygsk', 'ksggggsk', 'kssssssk', '.kkkkkk.'],
    splitter: ['kkkkkkkk', 'kcccccwk', 'kccccwck', 'kcccwcck', 'kccwccck', 'kcwcccck', 'kwccccck', 'kkkkkkkk'],
    dial: ['..kkkk..', '.kcccck.', 'kccccgck', 'kcccgcck', 'kcckccck', 'kcccccck', '.kcccck.', '..kkkk..'],
    seal: ['..gggg..', '.gGggGg.', 'gGggggGg', 'gggwwggg', 'gGggggGg', '.gGggGg.', '.oo..oo.', '.o....o.'],
    specimen: ['...kk...', '..kook..', '.kowook.', 'kowooook', 'koooooOk', '.kooOOk.', '..kOOk..', '...kk...'],
    menu: ['........', 'kkkkkkkk', 'kkkkkkkk', '........', 'kkkkkkkk', 'kkkkkkkk', '........', 'kkkkkkkk'],
  };

  const iconCache = {};
  function iconURL(name, scale) {
    const sc = scale || 4;
    const key = name + '@' + sc;
    if (iconCache[key]) return iconCache[key];
    const rows = ICONS[name] || ICONS.photon;
    const cv = document.createElement('canvas');
    cv.width = 8 * sc;
    cv.height = 8 * sc;
    drawRows(cv.getContext('2d'), rows, null, 0, 0, false, sc);
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  }
  function icon(name, cls) {
    return `<img class="ico ${cls || ''}" src="${iconURL(name)}" alt="" aria-hidden="true">`;
  }
  function drawIcon(ctx, name, x, y, scale) {
    drawRows(ctx, ICONS[name] || ICONS.photon, null, x, y, false, scale || 1);
  }

  // ---------- 3×5 bitmap font for map signs ----------
  const FONT = {
    A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
    D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
    G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
    J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
    M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
    P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
    S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
    V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
    Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
    0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
    3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'],
    6: ['011', '100', '110', '101', '010'], 7: ['111', '001', '010', '010', '010'], 8: ['010', '101', '010', '101', '010'],
    9: ['010', '101', '011', '001', '110'], '=': ['000', '111', '000', '111', '000'], '!': ['010', '010', '010', '000', '010'],
    '?': ['110', '001', '010', '000', '010'], '.': ['000', '000', '000', '000', '010'], ' ': ['000', '000', '000', '000', '000'],
  };
  function drawText(ctx, text, x, y, color, scale) {
    const sc = scale || 1;
    ctx.fillStyle = color;
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
      const g = FONT[ch] || FONT[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') ctx.fillRect(cx + c * sc, y + r * sc, sc, sc);
      cx += 4 * sc;
    }
  }
  const textWidth = (text, scale) => String(text).length * 4 * (scale || 1) - (scale || 1);

  window.QBT.Sprites = { PAL, drawChar, drawRows, icon, iconURL, drawIcon, drawText, textWidth, ICONS };
})();

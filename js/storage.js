/* Quantum Bomb Tester — settings and save data (localStorage). */
(function () {
  'use strict';
  window.QBT = window.QBT || {};

  const SETTINGS_KEY = 'qbt.settings.v1';
  const SAVE_KEY = 'qbt.save.v1';

  const DEFAULT_SETTINGS = {
    master: 70,
    music: 40,
    sfx: 80,
    textSpeed: 'normal', // slow | normal | fast | instant
    animSpeed: 'normal', // slow | normal | fast
    reducedMotion: false,
    showExpected: true,
    largeText: false,
  };

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable (private mode): the game still runs */
    }
  }

  let settings = Object.assign({}, DEFAULT_SETTINGS, read(SETTINGS_KEY) || {});
  const listeners = [];

  const Settings = {
    get: () => settings,
    set(key, value) {
      settings[key] = value;
      write(SETTINGS_KEY, settings);
      listeners.forEach((fn) => fn(settings, key));
    },
    onChange: (fn) => listeners.push(fn),
    reset() {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      write(SETTINGS_KEY, settings);
      listeners.forEach((fn) => fn(settings));
    },
  };

  function newSave() {
    return {
      version: 1,
      created: Date.now(),
      updated: Date.now(),
      unlocked: 1, // highest level that may be played (6 = vault)
      levels: {}, // id -> { done, stars, bestStars, earned, possible, pre:[], post:[], detections, damage, notes:[] }
      finalResult: null,
      player: null,
      introSeen: false,
      inLevel: null,
    };
  }

  let save = read(SAVE_KEY);

  const Save = {
    exists: () => !!save,
    get: () => save,
    newGame() {
      save = newSave();
      write(SAVE_KEY, save);
      return save;
    },
    commit() {
      if (!save) return;
      save.updated = Date.now();
      write(SAVE_KEY, save);
    },
    wipe() {
      save = null;
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
    },
    totals() {
      const t = { earned: 0, possible: 0, detections: 0, damage: 0, done: 0 };
      if (!save) return t;
      Object.values(save.levels).forEach((l) => {
        t.earned += l.earned || 0;
        t.possible += l.possible || 0;
        t.detections += l.detections || 0;
        t.damage += l.damage || 0;
        if (l.done && l.id <= 5) t.done++;
      });
      return t;
    },
  };

  window.QBT.Settings = Settings;
  window.QBT.Save = Save;
})();

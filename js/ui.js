/* Quantum Bomb Tester — dialogue box, choices, modals, toasts and the "Ask the Professor" chat. */
(function () {
  'use strict';
  window.QBT = window.QBT || {};
  const { Settings, Sprites, Audio, Content } = window.QBT;

  const ABORT = { aborted: true };
  const pending = new Set();

  /** A promise that can be cancelled when the player leaves a level. */
  function track(executor) {
    return new Promise((resolve, reject) => {
      const entry = { reject, cleanup: null };
      pending.add(entry);
      executor((v) => {
        pending.delete(entry);
        if (entry.cleanup) entry.cleanup();
        resolve(v);
      }, entry);
    });
  }
  function abortAll() {
    pending.forEach((e) => {
      if (e.cleanup) e.cleanup();
      e.reject(ABORT);
    });
    pending.clear();
    hideDialog();
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------------- Dialogue box ----------------
  const SPEAKERS = {
    prof: { name: 'Prof. Lumen', who: 'prof' },
    you: { name: 'You', who: 'player' },
    lab: { name: 'Lab console', who: null },
  };

  let dlg, dlgText, dlgChoices, dlgNote, dlgNoteInput, dlgNext, dlgName, dlgPortrait, dlgTag;
  let advanceFn = null;
  let typing = null;
  let choiceKeys = null;

  function buildDialog() {
    dlg = document.createElement('div');
    dlg.className = 'dialog hidden';
    dlg.tabIndex = -1;
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-live', 'polite');
    dlg.innerHTML = `
      <div class="dlg-portrait"><canvas width="64" height="64"></canvas><div class="dlg-name"></div></div>
      <div class="dlg-main">
        <div class="dlg-tag hidden"></div>
        <div class="dlg-text"></div>
        <div class="dlg-note hidden">
          <label>Explain briefly in your own words <span class="muted">(optional, saved to your notebook)</span>
          <textarea maxlength="240" rows="2" placeholder="Because..."></textarea></label>
        </div>
        <div class="dlg-choices"></div>
        <div class="dlg-next hidden" aria-hidden="true">▼</div>
      </div>
      <button class="dlg-chat" type="button" title="Ask the professor for more detail" aria-label="Ask the professor">${Sprites.icon('chat')}</button>`;
    dlgText = dlg.querySelector('.dlg-text');
    dlgChoices = dlg.querySelector('.dlg-choices');
    dlgNote = dlg.querySelector('.dlg-note');
    dlgNoteInput = dlg.querySelector('textarea');
    dlgNext = dlg.querySelector('.dlg-next');
    dlgName = dlg.querySelector('.dlg-name');
    dlgPortrait = dlg.querySelector('canvas');
    dlgTag = dlg.querySelector('.dlg-tag');
    dlg.querySelector('.dlg-chat').addEventListener('click', (e) => {
      e.stopPropagation();
      Chat.open();
    });
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('button, textarea, label')) return;
      advance();
    });
    document.body.appendChild(dlg);
  }

  function mountDialog(parent) {
    if (!dlg) buildDialog();
    (parent || document.body).appendChild(dlg);
    dlg.classList.toggle('floating', !parent);
  }

  function setSpeaker(key) {
    const sp = SPEAKERS[key] || SPEAKERS.prof;
    dlgName.textContent = sp.name;
    const ctx = dlgPortrait.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    if (sp.who) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 64, 64);
      ctx.clip();
      Sprites.drawChar(ctx, sp.who, 'down', 0, -8, 4, 5);
      ctx.restore();
    } else {
      Sprites.drawIcon(ctx, 'detector', 8, 8, 6);
    }
  }

  /** Simple markup: **gold**, __coral__. Returns [{text, cls}]. */
  function parse(line) {
    const segs = [];
    const re = /\*\*(.+?)\*\*|__(.+?)__/g;
    let last = 0;
    let m;
    while ((m = re.exec(line))) {
      if (m.index > last) segs.push({ text: line.slice(last, m.index), cls: '' });
      segs.push({ text: m[1] || m[2], cls: m[1] ? 'hl' : 'hl2' });
      last = re.lastIndex;
    }
    if (last < line.length) segs.push({ text: line.slice(last), cls: '' });
    return segs;
  }
  function renderSegs(segs, n) {
    let out = '';
    let left = n;
    for (const s of segs) {
      if (left <= 0) break;
      const t = s.text.slice(0, left);
      left -= t.length;
      out += s.cls ? `<span class="${s.cls}">${esc(t)}</span>` : esc(t);
    }
    return out;
  }

  const SPEED = { slow: 38, normal: 18, fast: 7, instant: 0 };

  function typeLine(line) {
    return new Promise((done) => {
      const segs = parse(line);
      const total = segs.reduce((a, s) => a + s.text.length, 0);
      const delay = SPEED[Settings.get().textSpeed] == null ? 18 : SPEED[Settings.get().textSpeed];
      if (!delay) {
        dlgText.innerHTML = renderSegs(segs, total);
        return done();
      }
      let n = 0;
      const finish = () => {
        clearInterval(typing.timer);
        typing = null;
        dlgText.innerHTML = renderSegs(segs, total);
        done();
      };
      typing = {
        finish,
        timer: setInterval(() => {
          n += 1;
          dlgText.innerHTML = renderSegs(segs, n);
          if (n % 3 === 0) Audio.play('type');
          if (n >= total) finish();
        }, delay),
      };
    });
  }

  function advance() {
    if (typing) return typing.finish();
    if (advanceFn) {
      const fn = advanceFn;
      advanceFn = null;
      Audio.play('click');
      fn();
    }
  }

  function showDialog(speaker, tag) {
    if (!dlg) buildDialog();
    dlg.classList.remove('hidden');
    setSpeaker(speaker || 'prof');
    dlgChoices.innerHTML = '';
    dlgNote.classList.add('hidden');
    dlgNext.classList.add('hidden');
    if (tag) {
      dlgTag.className = 'dlg-tag ' + (tag.cls || '');
      dlgTag.textContent = tag.text;
    } else dlgTag.className = 'dlg-tag hidden';
  }
  function hideDialog() {
    if (!dlg) return;
    if (typing) {
      clearInterval(typing.timer);
      typing = null;
    }
    advanceFn = null;
    choiceKeys = null;
    dlg.classList.add('hidden');
  }

  /** Show one or more lines; resolves after the player advances past the last one. */
  function say(lines, opts) {
    const o = opts || {};
    const list = Array.isArray(lines) ? lines : [lines];
    return track(async (resolve, entry) => {
      for (const line of list) {
        showDialog(o.speaker, o.tag);
        await typeLine(line);
        dlgNext.classList.remove('hidden');
        await new Promise((r) => (advanceFn = r));
        if (!pending.has(entry)) return;
      }
      if (!o.keep) hideDialog();
      resolve();
    });
  }

  /**
   * Ask a multiple-choice question in the dialogue box.
   * opts: { prompt, options:[string], tag:{text,cls}, note:boolean, speaker }
   * Resolves { index, note }.
   */
  function choose(opts) {
    return track(async (resolve, entry) => {
      showDialog(opts.speaker, opts.tag);
      await typeLine(opts.prompt);
      if (!pending.has(entry)) return;
      if (opts.note) {
        dlgNote.classList.remove('hidden');
        dlgNoteInput.value = '';
      }
      const pick = (i) => {
        if (!pending.has(entry)) return;
        Audio.play('select');
        const note = opts.note ? dlgNoteInput.value.trim() : '';
        choiceKeys = null;
        hideDialog();
        resolve({ index: i, note });
      };
      dlgChoices.innerHTML = '';
      opts.options.forEach((label, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.innerHTML = `<span class="key">${i + 1}</span><span>${esc(label)}</span>`;
        b.addEventListener('click', () => pick(i));
        dlgChoices.appendChild(b);
      });
      choiceKeys = (k) => {
        const i = parseInt(k, 10) - 1;
        if (i >= 0 && i < opts.options.length) pick(i);
      };
      // No option is pre-focused, so nothing looks pre-selected (answer with clicks or keys 1-4).
      dlg.focus({ preventScroll: true });
    });
  }

  function dialogKey(e) {
    if (!dlg || dlg.classList.contains('hidden')) return false;
    if (e.target && e.target.tagName === 'TEXTAREA') return false;
    if (choiceKeys && /^[1-9]$/.test(e.key)) {
      choiceKeys(e.key);
      return true;
    }
    if (!choiceKeys && (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E')) {
      advance();
      return true;
    }
    return false;
  }

  // ---------------- Modals ----------------
  const modalStack = [];

  /**
   * modal({ title, body: string|Node, buttons:[{label, value, cls}], wide, closable, onOpen })
   * Resolves with the clicked button's value (or null when closed).
   */
  function modal(opts) {
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.className = 'modal-back';
      const box = document.createElement('div');
      box.className = 'modal panel' + (opts.wide ? ' wide' : '') + (opts.cls ? ' ' + opts.cls : '');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.innerHTML = `
        <div class="panel-tab"><span>${opts.title || ''}</span>${opts.closable === false ? '' : '<button class="x-btn" type="button" aria-label="Close">✕</button>'}</div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>`;
      const body = box.querySelector('.modal-body');
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);
      const foot = box.querySelector('.modal-foot');
      const close = (v) => {
        const i = modalStack.indexOf(entry);
        if (i >= 0) modalStack.splice(i, 1);
        back.remove();
        if (opts.onClose) opts.onClose();
        resolve(v === undefined ? null : v);
      };
      const entry = { close, closable: opts.closable !== false, box };
      (opts.buttons || []).forEach((b) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (b.cls || '');
        btn.innerHTML = b.label;
        btn.addEventListener('click', () => {
          Audio.play(b.cls && b.cls.includes('alt') ? 'back' : 'select');
          close(b.value);
        });
        foot.appendChild(btn);
      });
      if (!foot.children.length) foot.remove();
      const x = box.querySelector('.x-btn');
      if (x)
        x.addEventListener('click', () => {
          Audio.play('back');
          close(null);
        });
      back.appendChild(box);
      document.body.appendChild(back);
      modalStack.push(entry);
      if (opts.onOpen) opts.onOpen(box, close);
      const focusable = box.querySelector('.modal-foot .btn, .modal-body button, .x-btn');
      if (focusable) focusable.focus({ preventScroll: true });
    });
  }
  function modalKey(e) {
    if (!modalStack.length) return false;
    if (e.key === 'Escape') {
      const top = modalStack[modalStack.length - 1];
      if (top.closable) top.close(null);
      return true;
    }
    return true; // a modal swallows game keys
  }
  const confirm = (title, text, yes, no) =>
    modal({
      title,
      body: `<p>${text}</p>`,
      buttons: [
        { label: no || 'Cancel', value: false, cls: 'alt' },
        { label: yes || 'OK', value: true },
      ],
    });

  // ---------------- Toasts / score pops ----------------
  function toast(html, ms) {
    let box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 2200);
    setTimeout(() => t.remove(), (ms || 2200) + 400);
  }
  function pop(text, kind) {
    const p = document.createElement('div');
    p.className = 'score-pop ' + (kind || '');
    p.textContent = text;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }

  // ---------------- Ask the Professor chat ----------------
  const Chat = {
    context: null,
    unlockedLevel: 1,
    el: null,
    build() {
      const el = document.createElement('aside');
      el.className = 'chat panel hidden';
      el.setAttribute('aria-label', 'Ask the professor');
      el.innerHTML = `
        <div class="panel-tab"><span>${Sprites.icon('chat')} Ask Prof. Lumen</span><button class="x-btn" type="button" aria-label="Close chat">✕</button></div>
        <div class="chat-log" aria-live="polite"></div>
        <div class="chat-topics"></div>`;
      el.querySelector('.x-btn').addEventListener('click', () => Chat.close());
      document.body.appendChild(el);
      this.el = el;
      this.log = el.querySelector('.chat-log');
      this.topics = el.querySelector('.chat-topics');
    },
    setContext(levelId, unlocked) {
      this.context = levelId;
      if (unlocked) this.unlockedLevel = unlocked;
    },
    isOpen() {
      return this.el && !this.el.classList.contains('hidden');
    },
    open() {
      if (!this.el) this.build();
      Audio.play('select');
      this.el.classList.remove('hidden');
      this.renderTopics();
      if (!this.log.children.length)
        this.addMsg('prof', 'Curious about something? Pick a question below. I’ll go deeper than the main lesson.');
    },
    close() {
      if (this.el) this.el.classList.add('hidden');
      Audio.play('back');
    },
    renderTopics() {
      const groups = [];
      const ctx = this.context;
      if (ctx && Content.chat[ctx]) groups.push({ label: 'About this level', items: Content.chat[ctx] });
      groups.push({ label: 'General', items: Content.chat.general });
      for (let i = 1; i <= Math.min(5, this.unlockedLevel); i++) {
        if (i !== ctx) groups.push({ label: 'Level ' + i + ': ' + Content.levels[i - 1].title, items: Content.chat[i] });
      }
      this.topics.innerHTML = '';
      groups.forEach((g) => {
        const h = document.createElement('div');
        h.className = 'chat-group';
        h.textContent = g.label;
        this.topics.appendChild(h);
        g.items.forEach((t) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chat-topic';
          b.textContent = t.q;
          b.addEventListener('click', () => this.ask(t));
          this.topics.appendChild(b);
        });
      });
    },
    ask(topic) {
      Audio.play('click');
      this.addMsg('you', topic.q);
      topic.a.forEach((p, i) => setTimeout(() => this.addMsg('prof', p), 250 + i * 350));
    },
    addMsg(who, text) {
      const m = document.createElement('div');
      m.className = 'msg ' + who;
      m.innerHTML = esc(text);
      this.log.appendChild(m);
      this.log.scrollTop = this.log.scrollHeight;
      if (who === 'prof') Audio.play('type');
    },
  };

  function isBusy() {
    return modalStack.length > 0 || Chat.isOpen() || (dlg && !dlg.classList.contains('hidden'));
  }

  window.QBT.UI = {
    ABORT,
    track,
    abortAll,
    mountDialog,
    say,
    choose,
    hideDialog,
    dialogKey,
    modal,
    modalKey,
    confirm,
    toast,
    pop,
    isBusy,
    esc,
    hasModal: () => modalStack.length > 0,
    closeTopModal: () => modalStack.length && modalStack[modalStack.length - 1].close(null),
  };
  window.QBT.Chat = Chat;
})();

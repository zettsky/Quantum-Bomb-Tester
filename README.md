# Quantum Bomb Tester

HSI2011 Team 3 Finals Project

A single-player, pixel-art web game that teaches 17–18-year-olds **quantum interference** and
**interaction-free measurement** (the Elitzur–Vaidman "bomb tester"). Players walk around a quantum optics lab,
run a Mach–Zehnder interferometer one photon at a time, and learn to tell whether a light-sensitive specimen is
present without any photon touching it.

No build step and no dependencies: plain HTML, CSS and JavaScript.

## Play

- **Online:** enable GitHub Pages for this repository (Settings → Pages → Deploy from branch → `main` / root).
  The game will then be at `https://zettsky.github.io/Quantum-Bomb-Tester/`.
- **Locally:** open `index.html` in a browser, or serve the folder:

  ```bash
  python -m http.server 8000
  ```

  then visit <http://localhost:8000>.

**Controls:** arrow keys / WASD to move · E, Enter or Space to interact and advance text · 1–4 to answer ·
F to send a photon · N notebook · C chat · Esc menu / leave level. On touch screens an on-screen D-pad appears.

## Structure of the game

The home screen has **New Game**, **Resume** (progress is saved automatically in the browser) and **Settings**
(master / music / sound-effect volume, text speed, photon animation speed, predicted-share markers,
larger text, reduced motion, erase progress).

In the lab, the player walks to five benches and a vault door. Each bench is one level:

| Level | Player's challenge | What it teaches |
|---|---|---|
| 1. Learn the detector | Send photons through a beam splitter and predict the counts | Individual outcomes are probabilistic; repeated trials reveal probabilities |
| 2. Recombine the paths | Place the second beam splitter so every photon reaches the same detector | Probability amplitudes interfere |
| 3. Change the phase | Adjust one path's phase to switch which detector clicks | Relative phase changes interference |
| 4. Find the specimen | Detect an absorber hidden in one path without damaging it | Interaction-free measurement |
| 5. Defend your conclusion | Decide whether each outcome proves presence or leaves uncertainty | Evidence, inconclusive results, and limits |
| Final: The Vault | Five sealed holders, 15 photons: find the specimens and keep them intact | Everything together |

Each level:

1. **Warm-up:** 3 questions *before* the level (no feedback, records a baseline).
2. **Predict → run → observe:** before every experiment the player predicts the outcome.
3. **Conclude + explain:** the player chooses a conclusion, then the best reason, and can type a brief explanation
   in their own words (saved to the Notebook and the teacher report).
4. **Check-up:** the same 3 questions *after* the level (scored, with feedback), so learning gain can be seen.

Prof. Lumen's **chat bubble** (in the HUD, the level header and the dialogue box) gives optional, more in-depth
elaborations, unlocked by level.

## The physics (as implemented)

`js/physics.js` models a balanced Mach–Zehnder interferometer with transmission amplitude `1/√2` and reflection
amplitude `i/√2`. The phase shifter and specimen holder sit in the lower path.

- No second beam splitter: P(D1) = P(D2) = 1/2
- Balanced, phase φ: P(D1) = cos²(φ/2), P(D2) = sin²(φ/2)
- Absorbing specimen present (calibrated so D2 is normally dark):

| Outcome per photon | Specimen absent | Absorbing specimen present |
|---|---|---|
| Normally bright detector (D1) clicks | 100% | 25% |
| Normally dark detector (D2) clicks | 0% | 25% |
| Photon absorbed; specimen damaged | 0% | 50% |

The central discovery is that a **dark-detector click identifies the specimen without absorption** in that trial,
while a **bright-detector click is inconclusive** because it occurs in either configuration.

Teaching choices built into the visuals:

- Before detection, the photon is drawn as faint **amplitude** waves on both paths, never as two half-sized photons.
  Every detection shows one whole photon (E = hf). An "Amplitude Explorer" covers the two paths with amplitude
  bars, amplitude graphs, an optional "how amplitudes combine at BS2" arrow diagram, and a "Not half-photons!"
  comparison.
- The game says openly that the computer is **not** quantum: it samples outcomes with a pseudo-random number
  generator using the predicted probabilities. The aim is to learn the predictions.

Run the physics tests with:

```bash
node tests/physics.test.js
```

## Scoring: reasoning, not luck

- **Understanding points:** predictions are judged against the quantum prediction, not against the random result.
  Conclusions and reasons are judged against the evidence the player actually saw (for example, "can't tell" is
  the correct answer after only bright clicks, even if a specimen was secretly there). Check-up questions also score.
- **Safe detections** and **specimens damaged** are tracked **separately** and never subtracted from understanding.
- Stars per level come from understanding % (≥85% ★★★, ≥60% ★★).
- The Notebook's Progress tab can copy a plain-text report (scores, warm-up → check-up, and the student's own
  explanations) for the teacher.

## Code layout

```
index.html          screens and layout
css/style.css       pixel UI theme (slate/teal palette with coral and gold accents)
js/content.js       ALL teaching text: level descriptions, quiz questions, professor chat topics
js/physics.js       amplitude model and sampling (also runs in Node for tests)
js/storage.js       settings + save game (localStorage)
js/audio.js         synthesised chiptune music and sound effects (WebAudio)
js/sprites.js       pixel-art characters, icons, 3×5 bitmap font
js/ui.js            dialogue box, choices, modals, toasts, "Ask the Professor" chat
js/diagram.js       interferometer bench renderer and photon animation
js/explainer.js     Amplitude Explorer modal
js/world.js         walkable lab hub
js/levels.js        the five levels, the Vault, scoring and reports
js/main.js          boot, title screen, HUD, settings, notebook, input
tests/              physics unit tests
```

To align wording with the lecture notes, edit `js/content.js` (quizzes, chat elaborations, level cards).
Dialogue that happens during experiments lives in `js/levels.js`.

## References

- A. Elitzur & L. Vaidman, "Quantum mechanical interaction-free measurements", *Found. Phys.* 23, 987 (1993).
- P. Kwiat, H. Weinfurter, T. Herzog, A. Zeilinger & M. Kasevich, "Interaction-free measurement", *PRL* 74, 4763 (1995).
- P. Grangier, G. Roger & A. Aspect, "Experimental evidence for a photon anticorrelation effect on a beam splitter", *Europhys. Lett.* 1, 173 (1986).

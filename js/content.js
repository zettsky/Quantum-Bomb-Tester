/*
 * Quantum Bomb Tester — teaching content.
 * All quiz questions, level descriptions and "Ask the Professor" elaborations
 * live here so they can be aligned with the HSI2011 lecture notes in one place.
 */
(function () {
  'use strict';
  window.QBT = window.QBT || {};

  const levels = [
    {
      id: 1,
      title: 'Learn the detector',
      challenge: 'Send photons through a beam splitter and predict the counts.',
      teaches: 'Individual outcomes are probabilistic; repeated trials reveal probabilities.',
      insight: { name: 'Click Counter', icon: 'detector', text: 'One photon gives one whole click. Probabilities only show up over many repeated trials.' },
    },
    {
      id: 2,
      title: 'Recombine the paths',
      challenge: 'Arrange two paths so every photon reaches the same detector.',
      teaches: 'Probability amplitudes interfere.',
      insight: { name: 'Twin Splitter', icon: 'splitter', text: 'Add the amplitudes first, then square. Amplitudes can cancel. Probabilities cannot.' },
    },
    {
      id: 3,
      title: 'Change the phase',
      challenge: 'Adjust one path to switch which detector clicks.',
      teaches: 'Relative phase changes interference.',
      insight: { name: 'Phase Dial', icon: 'dial', text: 'The relative phase between the paths decides which detector is bright: P(D1) = cos²(φ/2).' },
    },
    {
      id: 4,
      title: 'Find the specimen',
      challenge: 'Detect an absorber hidden in one path without damaging it.',
      teaches: 'Interaction-free measurement.',
      insight: { name: 'Dark-Port Lens', icon: 'eye', text: 'A click at the normally dark detector proves the specimen is there, and that photon was never absorbed.' },
    },
    {
      id: 5,
      title: 'Defend your conclusion',
      challenge: 'Decide whether each outcome proves presence or leaves uncertainty.',
      teaches: 'Evidence, inconclusive results, and limits.',
      insight: { name: 'Logic Seal', icon: 'seal', text: 'Dark click = proof. Bright click = inconclusive. Absorption = present but damaged. Calibrate first.' },
    },
  ];

  const finale = {
    id: 6,
    title: 'Final challenge: The Specimen Vault',
    challenge: 'Five sealed holders and a limited photon budget. Find the specimens and keep them intact.',
    teaches: 'Put every idea together and defend each conclusion.',
  };

  // The same three questions are asked BEFORE a level (no feedback, a baseline)
  // and AFTER it (with feedback), so learning gain can be measured fairly.
  const quizzes = {
    1: [
      {
        q: 'A single photon meets a 50:50 beam splitter with a detector on each output. What happens?',
        options: [
          'Both detectors click, each receiving half the photon’s energy',
          'Exactly one detector clicks, and we cannot predict which one',
          'The same detector always clicks',
          'Neither clicks until many photons have arrived',
        ],
        answer: 1,
        explain: 'A photon is detected whole (energy hf) at exactly one detector. Quantum mechanics predicts only the probability of each outcome.',
      },
      {
        q: 'You send 100 photons through the 50:50 beam splitter. Which statement is correct?',
        options: [
          'You will always get exactly 50 and 50',
          'You will get close to 50/50 (e.g. 46/54), and the fractions approach 0.5 as you send more photons',
          'The counts tell us nothing about the probabilities',
          'Each photon remembers where the previous one went, so they alternate',
        ],
        answer: 1,
        explain: 'Random outcomes fluctuate. The spread for N photons is about √N/2 (±5 for 100), so 46/54 is normal. Over many trials the fractions settle towards the probabilities.',
      },
      {
        q: 'What does “probability 0.5 at detector A” mean in this experiment?',
        options: [
          'Each photon is split into two halves',
          'Over many repeated trials, about half of the photons are detected at A',
          'Detector A is only half as sensitive',
          'Photons reaching A carry half the energy',
        ],
        answer: 1,
        explain: 'A probability |amplitude|\u00B2 shows up as the statistics of many repeats on identically prepared photons. It does not mean a fraction of a photon.',
      },
    ],
    2: [
      {
        q: 'In a balanced interferometer with both beam splitters, every photon reaches D1. What is the best explanation?',
        options: [
          'The amplitudes for the two paths add up at D1 and cancel at D2',
          'Two half-photons recombine into a whole one at the second beam splitter',
          'Each photon interferes with the other photons in the beam',
          'Every photon secretly takes the upper path',
        ],
        answer: 0,
        explain: 'Each photon interferes with itself: its two paths are in superposition. At D1, A(RT) + A(TR) = \u2212\u00BD \u2212 \u00BD (they add); at D2, A(RR) + A(TT) = \u2212i/2 + i/2 = 0 (they cancel).',
      },
      {
        q: 'When two indistinguishable paths lead to the same detector, what do we add together?',
        options: ['Probabilities', 'Probability amplitudes', 'Photon energies', 'Detector counts'],
        answer: 1,
        explain: 'Add the amplitudes first, then square. Adding probabilities (the classical way) gives \u00BC + \u00BC = \u00BD at each detector and can never cancel.',
      },
      {
        q: 'You remove the second beam splitter. What happens to the detector counts?',
        options: [
          'Still every photon at D1',
          'Roughly 50/50 between D1 and D2. Each detector now reveals the path, so there is no interference',
          'No photons are detected',
          'Every photon goes to D2',
        ],
        answer: 1,
        explain: 'Without BS2 each detector sits at the end of just one path. Nothing recombines the paths, so we get 50/50 with no interference.',
      },
    ],
    3: [
      {
        q: 'In a balanced interferometer, you delay the lower path by half a wavelength (180°). What happens?',
        options: [
          'Every photon now goes to D2',
          'Each photon loses half its energy',
          'The counts become 50/50',
          'Nothing changes, because each photon only takes one path',
        ],
        answer: 0,
        explain: 'A 180° shift flips the sign of the lower amplitude. The D1 contributions now cancel and the D2 contributions add: P(D2) = sin²(90°) = 1.',
      },
      {
        q: 'With a 90° phase shift, what is P(D1)?',
        options: ['0%', '25%', '50%', '100%'],
        answer: 2,
        explain: 'P(D1) = cos²(φ/2) = cos²(45°) = 0.5.',
      },
      {
        q: 'What decides which detector a photon can reach in the interferometer?',
        options: [
          'The relative phase between the two path amplitudes',
          'The colour the photon changes into',
          'How bright the source is',
          'Which path the photon “really” took',
        ],
        answer: 0,
        explain: 'Only the relative phase matters. It sets whether the amplitudes add or cancel at each detector.',
      },
    ],
    4: [
      {
        q: 'The interferometer is calibrated so D2 is dark. A specimen now blocks the lower path. What is the probability a photon is absorbed by it?',
        options: ['0%', '25%', '50%', '100%'],
        answer: 2,
        explain: 'Half of the amplitude-squared goes down the lower path, so P(absorbed) = |1/√2|² = 1/2.',
      },
      {
        q: 'With the specimen present, how often does the normally dark detector D2 click?',
        options: ['0%', '25%', '50%', '75%'],
        answer: 1,
        explain: 'Conditional probability: P(D2) = P(not absorbed) \u00D7 P(D2 | not absorbed) = \u00BD \u00D7 \u00BD = \u00BC (and \u00BC for D1).',
      },
      {
        q: 'Why can a D2 click reveal the specimen without that photon touching it?',
        options: [
          'Blocking one path destroys the cancellation that kept D2 dark, and the photon detected at D2 was never absorbed',
          'The photon bounced off the specimen and into D2',
          'The specimen glows and D2 sees that light',
          'D2 senses the heat of the specimen',
        ],
        answer: 0,
        explain: 'The specimen acts like a which-path detector: it makes the paths distinguishable, so the cancellation at D2 disappears. The photon that clicked at D2 was detected there, so it delivered no energy to the specimen.',
      },
    ],
    5: [
      {
        q: 'The bright detector clicked. Can you safely conclude that the specimen is absent?',
        options: [
          'Yes. The bright detector clicks whenever the holder is empty',
          'No. A bright click also happens 25% of the time when the specimen is present',
          'Yes, as long as it happens once',
          'No, because the bright detector is broken',
        ],
        answer: 1,
        explain: 'A bright click happens 100% of the time when empty and 25% of the time when the specimen is present. It cannot tell the two cases apart.',
      },
      {
        q: 'Which single outcome proves the specimen is present AND leaves it intact?',
        options: ['A bright (D1) click', 'A dark (D2) click', 'An absorption', 'No click at all'],
        answer: 1,
        explain: 'A dark click is impossible without the specimen (0%), and that photon was detected at D2, not absorbed.',
      },
      {
        q: 'If the specimen IS present and you keep sending photons until a dark click or an absorption happens, how often do you detect it safely?',
        options: ['1/4 of the time', '1/3 of the time', '1/2 of the time', 'Every time'],
        answer: 1,
        explain: 'Ignore bright clicks (they just mean “try again”). Dark (25%) vs absorbed (50%): 25 / (25 + 50) = 1/3.',
      },
    ],
  };

  // "Ask the Professor" chat: in-depth elaborations, unlocked by context.
  const chat = {
    general: [
      {
        id: 'goal',
        q: 'What is this lab for?',
        a: [
          'Our goal: find out whether a light-sensitive specimen is in the lab, without letting a single photon hit it.',
          'The tool is a Mach–Zehnder interferometer: a photon source, a first beam splitter (BS1), two mirrors, a second beam splitter (BS2) and two detectors, D1 and D2.',
        ],
      },
      {
        id: 'computer',
        q: 'Is the computer doing real quantum physics?',
        a: [
          'No. This is an ordinary computer. It uses a pseudo-random number generator to pick each outcome with the probabilities quantum mechanics predicts.',
          'So the random clicks you see do not prove anything quantum. What you are learning are the predictions: how amplitudes combine and what probabilities they give. Real single-photon experiments match exactly these numbers.',
        ],
      },
      {
        id: 'photon',
        q: 'What exactly is a photon?',
        a: [
          'A photon is the smallest packet of light energy, E = hf, where h is Planck’s constant and f is the frequency.',
          'A detector either registers a whole photon or nothing at all. We never record a fraction of one.',
        ],
      },
      {
        id: 'duality',
        q: 'Is the photon a wave or a particle here?',
        a: [
          'Both faces of one quantum object: it travels as a wave and arrives as a particle.',
          'Between source and detector, its amplitude explores both paths and interferes with itself. At a detector it shows up as one discrete photon, delivering all its energy hf at once.',
          'It\u2019s the interferometer version of Young\u2019s double slit: two paths instead of two slits.',
        ],
      },
      {
        id: 'bomb',
        q: 'Why is the game called “Bomb Tester”?',
        a: [
          'In 1993 Avshalom Elitzur and Lev Vaidman imagined a bomb so sensitive that a single photon would set it off. Could you tell whether such a bomb is live without exploding it?',
          'Their answer used this exact interferometer: yes, some of the time. Paul Kwiat and colleagues demonstrated it with real photons in 1995. Our light-sensitive specimen plays the role of the bomb.',
        ],
      },
      {
        id: 'uses',
        q: 'Is this used for anything real?',
        a: [
          'Interaction-free ideas have inspired research on imaging light-sensitive objects while absorbing fewer photons, and on quantum-enhanced measurement.',
          'It is still mostly research rather than everyday technology. Its biggest impact has been on how physicists think about measurement.',
          'Interferometers themselves are everywhere: LIGO detects gravitational waves using a kilometres-long interferometer, sensing changes far smaller than a proton.',
        ],
      },
    ],
    1: [
      {
        id: 'l1-cons',
        q: 'Why must P(T) + P(R) = 1?',
        a: [
          'Conservation of energy (and of probability): the photon must leave the beamsplitter somewhere. It is either transmitted or reflected.',
          'For a 50:50 beamsplitter P(T) = P(R) = 0.5. In amplitudes: |1/\u221A2|\u00B2 + |i/\u221A2|\u00B2 = \u00BD + \u00BD = 1.',
        ],
      },
      {
        id: 'l1-predict',
        q: 'Why can’t we predict which detector clicks?',
        a: [
          'Quantum mechanics gives the probability of each outcome, not a definite answer for one photon.',
          'As far as experiments can tell, nothing hidden inside the photon decides its outcome in advance. Each measurement gives one random outcome, and the superposition collapses to that result.',
          'Probabilities only show up as statistics. Like the lecture example: a state (\u221A3/2)|\u2191\u27E9 + (1/2)|\u2193\u27E9 measured 1000 times gives about 750 up and 250 down.',
        ],
      },
      {
        id: 'l1-spread',
        q: 'How close to 50/50 should my counts be?',
        a: [
          'For N photons with probability p, expect N·p clicks with a spread of about √(N·p·(1−p)).',
          'For 20 photons at p = 0.5: 10 ± 2.2. So 8 and 12 is perfectly normal, while 2 and 18 would be suspicious.',
          'The spread in the fraction shrinks like 1/√N, so the fraction gets closer to 0.5 as you send more photons.',
        ],
      },
      {
        id: 'l1-split',
        q: 'Does the photon split at the beam splitter?',
        a: [
          'No. If it split, both detectors would register a half-energy blip every time. Instead exactly one detector clicks, with the full energy hf.',
          'In 1986 Grangier, Roger and Aspect checked this with true single photons: the two outputs essentially never clicked together.',
        ],
      },
    ],
    2: [
      {
        id: 'l2-classical',
        q: 'Why not just multiply and add probabilities?',
        a: [
          'That is the classical expectation: P(TT) = P(TR) = P(RT) = P(RR) = 0.5 \u00D7 0.5 = 0.25, so each detector should get \u00BC + \u00BC = \u00BD.',
          'Experimentally the photon ALWAYS leaves one port and never the other. Classical probabilities are real, positive weights; quantum mechanics uses complex amplitudes as weights, and complex weights can cancel.',
        ],
      },
      {
        id: 'l2-matrix',
        q: 'Can I write the beamsplitter as a matrix?',
        a: [
          'Yes. Call the lower path |0\u27E9 = (1, 0) and the upper path |1\u27E9 = (0, 1). A 50:50 beamsplitter is M = (1/\u221A2)(1 i; i 1).',
          'A photon entering in |0\u27E9 leaves as M(1, 0) = (|0\u27E9 + i|1\u27E9)/\u221A2: a superposition with 50% for each path. The reflected part always picks up the factor i.',
          'The whole interferometer is M, then the mirrors and phase, then M again. Multiplying the matrices gives the same answer as adding the path amplitudes.',
        ],
      },
      {
        id: 'l2-what',
        q: 'What exactly is interfering?',
        a: [
          'Not one photon with another! We send ONE photon at a time. Each photon interferes with itself: its possible paths are in superposition.',
          'The paths interfere only when they are indistinguishable. (With two photons at once you get even stranger effects, like Hong\u2013Ou\u2013Mandel bunching.)',
        ],
      },
      {
        id: 'l2-amp',
        q: 'Amplitude vs probability: what’s the difference?',
        a: [
          'Each way an event can happen has a probability amplitude: a complex number you can picture as an arrow with a length and a direction (phase).',
          'Probability = (length of arrow)². When several indistinguishable paths lead to the same outcome, add the arrows first, then square.',
          'Arrows pointing opposite ways cancel. That’s how a probability can drop to zero.',
        ],
      },
      {
        id: 'l2-cancel',
        q: 'Why exactly do the D2 amplitudes cancel?',
        a: [
          'Rules from lecture 3b: transmission \u00D7 1/\u221A2, reflection \u00D7 i/\u221A2, each mirror \u00D7 i. Multiply along the path, add paths that end at the same place, square at the end.',
          'To D2: A(RR) = (i/\u221A2)\u00B7i\u00B7(i/\u221A2) = \u2212i/2 and A(TT) = (1/\u221A2)\u00B7i\u00B7(1/\u221A2) = +i/2. Same length, opposite directions: they cancel, P = 0.',
          'To D1: A(RT) = A(TR) = \u2212\u00BD. They point the same way and add: P = |\u22121|\u00B2 = 1.',
        ],
      },
      {
        id: 'l2-which',
        q: 'What is “which-path information”?',
        a: [
          'If anything in the setup could reveal which path the photon took, the two paths are no longer indistinguishable and interference disappears.',
          'Removing BS2 does this: D1 then means \u201Cupper path\u201D and D2 means \u201Clower path\u201D. It\u2019s the same as the double-slit twist: watch which slit, and the bands disappear.',
          'Think of it as asking a different question: without BS2 you ask \u201Cwhich path?\u201D, with BS2 you ask \u201Cwhich interference port?\u201D. You can get which-path information or interference, never both at once.',
        ],
      },
      {
        id: 'l2-half',
        q: 'Isn’t an amplitude just half a photon?',
        a: [
          'No. An amplitude carries no energy. You can never detect it directly. It is a number whose square gives a probability.',
          'The photon’s energy hf always arrives in one piece, at one detector. Amplitudes describe the odds of where it will arrive.',
        ],
      },
    ],
    3: [
      {
        id: 'l3-kallang',
        q: 'How is this like the Kallang wave?',
        a: [
          'In the stadium wave, two waves meeting \u201Cin step\u201D (arms both up) grow bigger: constructive interference. Meeting in opposite phase, they die out: destructive interference.',
          'Here the \u201Cwaves\u201D are the two path amplitudes of a single photon. Delaying one path by 180\u00B0 swaps which detector sees constructive and which sees destructive interference.',
        ],
      },
      {
        id: 'l3-phase',
        q: 'What is phase, physically?',
        a: [
          'Phase is the direction of the amplitude arrow. Making the lower path a little longer (here, a glass slab) rotates its arrow.',
          'A delay of one whole wavelength is 360\u00B0, which brings the arrow back where it started. In the wave equation y = A sin(kx \u2212 \u03C9t + \u03C6), it is the \u03C6 term.',
        ],
      },
      {
        id: 'l3-cos',
        q: 'Where does cos²(φ/2) come from?',
        a: [
          'At D1, two arrows of length ½ arrive with relative angle φ. Adding them gives a resultant of length cos(φ/2), so P(D1) = cos²(φ/2).',
          'At D2 they meet with an extra half-turn, giving P(D2) = sin²(φ/2). The two always add to 1.',
        ],
      },
      {
        id: 'l3-cal',
        q: 'Why do we need to calibrate?',
        a: [
          'The specimen test relies on D2 being perfectly dark when the lower path is clear.',
          'If the phase drifts away from 0°, D2 clicks even with an empty holder, and a dark click would no longer prove anything.',
        ],
      },
    ],
    4: [
      {
        id: 'l4-measure',
        q: 'Is the specimen making a measurement?',
        a: [
          'Yes! An absorbing specimen in the lower path is a which-path detector. If it absorbs the photon, the superposition collapses to \u201Clower path\u201D (measurement backaction), and the specimen is damaged.',
          'If it does NOT absorb, that also tells us something: the photon must be in the upper path. Either way the paths are now distinguishable, so interference is destroyed and D2 can click.',
          'As lecture 3b puts it: \u201Cno particle\u201D doesn\u2019t mean no effect on the system.',
        ],
      },
      {
        id: 'l4-why',
        q: 'Why does a blocker make D2 click?',
        a: [
          'The specimen absorbs whatever arrives along the lower path. The amplitude that continues past it is zero.',
          'Only the upper amplitude reaches BS2, with nothing to cancel against. BS2 splits it evenly.',
          'Using conditional probability, P(A and B) = P(A) \u00D7 P(B|A): P(D2) = P(not absorbed) \u00D7 P(D2 | not absorbed) = \u00BD \u00D7 \u00BD = \u00BC. Same for D1. The other \u00BD is absorption.',
        ],
      },
      {
        id: 'l4-touch',
        q: 'Did the photon really not touch the specimen?',
        a: [
          'When D2 clicks, the photon was detected at D2, so the specimen received no energy in that trial. Yet D2 could only click because the specimen was there.',
          'Physicists call this an interaction-free (or counterfactual) measurement. The wording is debated, but the predictions and the experiments are clear.',
        ],
      },
      {
        id: 'l4-zeno',
        q: 'Can we do better than detecting it safely 1/3 of the time?',
        a: [
          'Yes, with a cleverer device. Using the quantum Zeno effect (many weak, repeated interrogations), Kwiat and colleagues showed the safe-detection chance can be pushed close to 100%.',
          'The simple interferometer in this lab tops out at 1/3, or 1/2 if you also tune the beam splitters.',
        ],
      },
    ],
    5: [
      {
        id: 'l5-proof',
        q: 'What’s the difference between evidence and proof?',
        a: [
          'Proof: an outcome that is impossible under one hypothesis. A dark click has probability 0 when the holder is empty, so it proves presence (in a calibrated device).',
          'Evidence: an outcome more likely under one hypothesis but possible under both. A bright click is 100% vs 25%, so it shifts the odds but never settles it.',
        ],
      },
      {
        id: 'l5-bayes',
        q: 'How much do repeated bright clicks tell me?',
        a: [
          'This is conditional probability again. Start at 50/50. If the specimen is present, each bright click has probability \u00BC; if absent, probability 1.',
          'After n bright clicks: P(present) = (¼)ⁿ / ((¼)ⁿ + 1). That’s 20% after 1 click, 1.5% after 3, about 0.1% after 5.',
          'It gets very small, but it never reaches zero. Absence is never proven.',
        ],
      },
      {
        id: 'l5-limits',
        q: 'What are the real-world limits?',
        a: [
          'Real beam splitters are not exactly 50:50, detectors sometimes miss photons, and the phase drifts with temperature and vibration.',
          'All of these can make D2 click even with nothing in the path. Real experiments measure these imperfections and account for them.',
        ],
      },
    ],
  };

  const evidenceTable = [
    { outcome: 'Normally bright detector (D1) clicks', absent: '100%', present: '25%' },
    { outcome: 'Normally dark detector (D2) clicks', absent: '0%', present: '25%' },
    { outcome: 'Photon absorbed; specimen damaged', absent: '0%', present: '50%' },
  ];

  // What the model assumes, and how the real world differs. Shown in the Notebook's "Lab manual".
  const assumptions = [
    { a: 'A true single-photon source: exactly one photon per shot.', real: 'Real “single-photon” sources sometimes emit zero or two photons; experiments check this with coincidence counts.' },
    { a: 'Ideal, lossless 50:50 beamsplitters (P(T) = P(R) = ½) and perfect mirrors.', real: 'Real splitting ratios differ slightly from 50:50, so the cancellation at D2 is never perfect.' },
    { a: 'Perfectly indistinguishable paths (equal lengths, perfect overlap), so interference is complete.', real: 'Imperfect overlap lowers the interference “visibility”. D2 then clicks occasionally even with an empty holder.' },
    { a: 'A stable phase: φ stays where you set it.', real: 'Temperature and vibration make the phase drift, so real interferometers must be re-calibrated (see Level 5, case 5).' },
    { a: 'Perfect detectors: every photon that arrives is counted and there are no false clicks.', real: 'Real detectors miss some photons and produce occasional “dark counts” (see Level 5, case 6).' },
    { a: 'A perfectly absorbing specimen: any photon reaching it is absorbed and damages it.', real: 'Real samples may absorb only partially, which changes the probabilities.' },
    { a: 'Outcomes are drawn by an ordinary pseudo-random number generator using the quantum predictions.', real: 'The game teaches the predictions. It is not evidence that anything quantum happens inside the computer.' },
  ];

  // Sources behind the game's claims, and where each one is used.
  const sources = [
    { cite: 'Y. Gao, HSI2011 lecture 3b: Wave–particle duality & quantum interference (2026).', used: 'Beamsplitter matrix M, path amplitudes A(RT), A(TR), A(RR), A(TT), classical vs quantum weights, Hong–Ou–Mandel.' },
    { cite: 'Y. Gao, HSI2011 lecture 2a: Uncertainty & measurements in QM (2026).', used: 'Random single outcomes, statistics of repeats, measurement collapse, conditional probability.' },
    { cite: 'Y. Gao, HSI2011 lecture 5a: Experiments that shaped quantum theory (2026).', used: 'Wave–particle duality (“travels as a wave, arrives as a particle”), which-path information.' },
    { cite: 'A. C. Elitzur & L. Vaidman, “Quantum mechanical interaction-free measurements”, Found. Phys. 23, 987–997 (1993). doi:10.1007/BF00736012', used: 'The bomb-tester idea and the 25% / 25% / 50% probabilities (Level 4, Vault).' },
    { cite: 'P. Kwiat, H. Weinfurter, T. Herzog, A. Zeilinger & M. Kasevich, “Interaction-free measurement”, Phys. Rev. Lett. 74, 4763 (1995). doi:10.1103/PhysRevLett.74.4763', used: 'First demonstration with real photons; the 50% limit of the simple scheme and the Zeno proposal (Bonus lab).' },
    { cite: 'P. G. Kwiat, A. G. White, J. R. Mitchell, O. Nairz, G. Weihs, H. Weinfurter & A. Zeilinger, “High-efficiency quantum interrogation measurements via the quantum Zeno effect”, Phys. Rev. Lett. 83, 4725 (1999). doi:10.1103/PhysRevLett.83.4725', used: 'Safe-detection efficiencies beyond the 50% limit (Bonus lab, professor chat).' },
    { cite: 'P. Grangier, G. Roger & A. Aspect, “Experimental evidence for a photon anticorrelation effect on a beam splitter”, Europhys. Lett. 1, 173 (1986). doi:10.1209/0295-5075/1/4/004', used: 'A single photon is never detected at both outputs at once (the “Not half-photons!” tab).' },
    { cite: 'C. K. Hong, Z. Y. Ou & L. Mandel, “Measurement of subpicosecond time intervals between two photons by interference”, Phys. Rev. Lett. 59, 2044 (1987). doi:10.1103/PhysRevLett.59.2044', used: 'Two-photon bunching mentioned in the chat (“What exactly is interfering?”).' },
    { cite: 'B. P. Abbott et al. (LIGO Scientific & Virgo Collaborations), “Observation of gravitational waves from a binary black hole merger”, Phys. Rev. Lett. 116, 061102 (2016). doi:10.1103/PhysRevLett.116.061102', used: 'Interferometers as real measurement tools (professor chat).' },
  ];

  window.QBT.Content = { levels, finale, quizzes, chat, evidenceTable, assumptions, sources };
})();

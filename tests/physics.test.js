// Run with: node tests/physics.test.js
const assert = require('assert');
const P = require('../js/physics.js');

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: expected ${b}, got ${a}`);

// Level 1: one beam splitter only -> 50/50
let a = P.analyse({ bs2: false });
near(a.P.d1, 0.5, 'no BS2 D1');
near(a.P.d2, 0.5, 'no BS2 D2');

// Level 2: balanced interferometer -> all to D1, D2 dark
a = P.analyse({ bs2: true, phaseDeg: 0 });
near(a.P.d1, 1, 'balanced D1');
near(a.P.d2, 0, 'balanced D2');
assert.strictEqual(a.P.d2, 0, 'dark detector exactly zero');

// Lecture 3b path amplitudes: A(RT) = A(TR) = -1/2, A(RR) = -i/2, A(TT) = +i/2
const lec = P.analyse({});
near(lec.contrib.d1[0].re, -0.5, 'A(RT)'); near(lec.contrib.d1[1].re, -0.5, 'A(TR)');
near(lec.contrib.d2[0].im, -0.5, 'A(RR)'); near(lec.contrib.d2[1].im, 0.5, 'A(TT)');

// Level 3: phase changes interference: P(D1) = cos^2(phi/2)
for (const deg of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
  a = P.analyse({ phaseDeg: deg });
  const phi = (deg * Math.PI) / 180;
  near(a.P.d1, Math.cos(phi / 2) ** 2, `cos^2 at ${deg}`);
  near(a.P.d1 + a.P.d2, 1, `normalised at ${deg}`);
}
near(P.analyse({ phaseDeg: 180 }).P.d2, 1, '180 -> all D2');

// Level 4: absorbing specimen -> 25 / 25 / 50 (the key table), any phase
for (const deg of [0, 90, 180]) {
  a = P.analyse({ phaseDeg: deg, specimen: true });
  near(a.P.d1, 0.25, `specimen D1 @${deg}`);
  near(a.P.d2, 0.25, `specimen D2 @${deg}`);
  near(a.P.absorbed, 0.5, `specimen absorbed @${deg}`);
}
near(P.analyse({ specimen: false }).P.absorbed, 0, 'no specimen, no absorption');

// Sampling respects probabilities (deterministic stream)
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const counts = { d1: 0, d2: 0, absorbed: 0 };
const spec = P.analyse({ specimen: true });
for (let i = 0; i < 200000; i++) counts[P.sample(spec.P, rand)]++;
near(Math.round(counts.d1 / 2000) / 100, 0.25, 'sampled D1');
near(Math.round(counts.absorbed / 2000) / 100, 0.5, 'sampled absorbed');
const dark = { d2: 0 };
const bal = P.analyse({});
for (let i = 0; i < 100000; i++) if (P.sample(bal.P, rand) === 'd2') dark.d2++;
assert.strictEqual(dark.d2, 0, 'calibrated dark detector never clicks without specimen');

// Logic of conclusions
assert.strictEqual(P.verdictFromLog(['d1', 'd1']), 'inconclusive');
assert.strictEqual(P.verdictFromLog(['d1', 'd2']), 'present');
assert.strictEqual(P.verdictFromLog(['d2', 'absorbed']), 'damaged');
near(P.posteriorPresent(1), 0.2, 'posterior after 1 bright');
assert.ok(P.posteriorPresent(5) > 0, 'never proven absent');

console.log('All physics tests passed.');

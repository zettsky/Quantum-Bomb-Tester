/*
 * Quantum Bomb Tester — physics model.
 *
 * A balanced Mach–Zehnder interferometer, one photon at a time.
 *   BS1 splits the photon's amplitude into an UPPER path (reflected) and a
 *   LOWER path (transmitted). The lower path holds the phase shifter and the
 *   specimen holder. BS2 recombines the paths towards D1 and D2.
 *
 * Convention (as in most textbooks):
 *   transmission amplitude  t = 1/√2
 *   reflection amplitude    r = i/√2   (a quarter-turn, 90° phase)
 *
 * With phase φ on the lower path and nothing blocking it:
 *   P(D1) = cos²(φ/2)   P(D2) = sin²(φ/2)
 * With an absorbing specimen in the lower path (any φ):
 *   P(D1) = 1/4   P(D2) = 1/4   P(absorbed) = 1/2
 *
 * The game never claims the computer is quantum: outcomes are drawn with an
 * ordinary pseudo-random number generator using these predicted probabilities.
 */
(function (root) {
  'use strict';

  const S = Math.SQRT1_2;
  const C = (re, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const abs2 = (a) => a.re * a.re + a.im * a.im;
  const abs = (a) => Math.sqrt(abs2(a));
  const arg = (a) => Math.atan2(a.im, a.re);
  const expi = (phi) => C(Math.cos(phi), Math.sin(phi));
  const ZERO = C(0, 0);
  const T = C(S, 0);
  const R = C(0, S);
  const deg = (d) => (d * Math.PI) / 180;
  // Remove floating-point dust so "never" really means never.
  const clean = (p) => (p < 1e-12 ? 0 : p > 1 - 1e-12 ? 1 : p);

  /**
   * cfg: { bs2: boolean (default true), phaseDeg: number, specimen: boolean }
   * Returns amplitudes at every stage plus outcome probabilities.
   */
  function analyse(cfg) {
    const bs2 = cfg.bs2 !== false;
    const phi = deg(cfg.phaseDeg || 0);
    const specimen = !!cfg.specimen;

    const upper = mul(C(1), R); // reflected at BS1
    const lower = mul(T, expi(phi)); // transmitted at BS1, then phase shifter
    const absorbed = specimen ? abs2(lower) : 0;
    const lowerAtBS2 = specimen ? ZERO : lower;

    let contrib;
    if (bs2) {
      // D1 (right): upper transmits, lower reflects. D2 (up): upper reflects, lower transmits.
      contrib = {
        d1: [mul(upper, T), mul(lowerAtBS2, R)],
        d2: [mul(upper, R), mul(lowerAtBS2, T)],
      };
    } else {
      // No second beam splitter: each path runs straight into its own detector.
      contrib = { d1: [upper, ZERO], d2: [ZERO, lowerAtBS2] };
    }
    const d1 = add(contrib.d1[0], contrib.d1[1]);
    const d2 = add(contrib.d2[0], contrib.d2[1]);
    const P = { d1: clean(abs2(d1)), d2: clean(abs2(d2)), absorbed: clean(absorbed) };
    return { upper, lower, lowerAtBS2, contrib, d1, d2, P, bs2, specimen, phaseDeg: cfg.phaseDeg || 0 };
  }

  /** Draw one outcome ('d1' | 'd2' | 'absorbed') from predicted probabilities. */
  function sample(P, rand) {
    const r = (rand || Math.random)();
    if (r < P.d1) return 'd1';
    if (r < P.d1 + P.d2) return 'd2';
    if (P.absorbed > 0) return 'absorbed';
    return P.d2 > P.d1 ? 'd2' : 'd1';
  }

  /** What a log of outcomes (in a calibrated device) logically proves. */
  function verdictFromLog(log) {
    if (log.includes('absorbed')) return 'damaged';
    if (log.includes('d2')) return 'present';
    return 'inconclusive';
  }

  /** P(present | n bright clicks only), starting from a prior. */
  function posteriorPresent(nBright, prior) {
    const p = prior == null ? 0.5 : prior;
    const like = Math.pow(0.25, nBright);
    return (p * like) / (p * like + (1 - p));
  }

  /** Binomial expectation and spread for N trials with probability p. */
  function binomial(N, p) {
    return { mean: N * p, sd: Math.sqrt(N * p * (1 - p)) };
  }

  const api = { C, add, mul, abs, abs2, arg, expi, T, R, deg, analyse, sample, verdictFromLog, posteriorPresent, binomial };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QBT = root.QBT || {};
  root.QBT.Physics = api;
})(typeof window !== 'undefined' ? window : globalThis);

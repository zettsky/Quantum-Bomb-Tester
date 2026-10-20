# Presenter guide: Quantum Bomb Tester

This guide helps the team present the game against the HSI2011 assessment rubric. The game supplies the physics,
evidence and visuals. Q&A defence, teamwork and delivery are judged on the team itself, so most of this guide is
about preparing those.

## 1. Rubric map

| Criterion | What the game gives you | What the team must do live |
|---|---|---|
| **Scientific clarity & understanding** | Physics follows lecture 3b exactly (M, A(RT)… amplitudes, factor i per mirror) and is unit-tested. The probability table is 25/25/50. Every assumption and real-world limit is listed in **Notebook → Lab manual**. Level 5 cases 5–6 cover calibration and detector noise. | Explain the key principle in one sentence (section 3). Say the assumptions out loud before anyone asks. |
| **Depth & originality** | An interaction-free measurement as a playable experiment. Scoring rewards reasoning, not luck. Predict → observe → explain loop with pre/post questions. **Bonus lab** goes beyond the textbook ⅓ result (efficiency r/(1+r) → ½, and why going past ½ needs the quantum Zeno scheme). | Point these out explicitly as design decisions (section 6). |
| **Presentation effectiveness** | Polished pixel visuals, a clear five-level arc, and **Settings → Presenter mode**, which unlocks every bench so you can jump straight to any moment. | Follow the narrative arc and timed script (sections 2 and 4) and rehearse to time. |
| **Q&A defence** | The professor chat holds in-depth answers for every level. | Practise the Q&A bank (section 5). Separate what is **known** (the predictions, the experiments) from what is **debated** (interpretation). |
| **Teamwork & coherence** | Each level is a self-contained module, which makes ownership easy to split. | Use the ownership plan (section 7). Everyone must be able to give the 60-second summary. |
| **Use of evidence & sources** | **Notebook → Sources** lists every reference with a DOI and where it is used. The Notebook's progress report gives pre/post data. | Cite sources on slides. Ideally run a small playtest and show the learning gain honestly, including its limits (section 8). |

## 2. Narrative arc

1. **Hook:** "Can you know something is there without anything touching it?" (show the sealed holder)
2. **The tool:** one photon at a time; a beamsplitter gives random single outcomes but predictable statistics (Level 1, lecture 2a).
3. **The surprise:** recombine the paths and every photon goes to one detector. Classically we expect ¼ + ¼ = ½ each; amplitudes A(RR) + A(TT) cancel instead (Level 2, lecture 3b).
4. **The control knob:** relative phase decides which port is bright, P(D1) = cos²(φ/2) (Level 3).
5. **The payoff:** block one path and the cancellation breaks. A dark click proves the specimen is there, with no photon absorbed (Level 4: 25/25/50 table, which-path link to lecture 5a).
6. **Honesty:** a bright click is inconclusive, proof depends on calibration, and real detectors are noisy (Level 5).
7. **Beyond:** the bonus lab shows the ⅓ limit is not fundamental (r/(1+r)), and the Zeno experiments go further.
8. **Takeaway:** each photon interferes with itself; "no particle" doesn't mean no effect.

## 3. The 60-second summary (every member should be able to say this)

> A photon passing a 50:50 beamsplitter is in a superposition of two paths. When the paths recombine, their
> amplitudes add: at one detector A(RT) + A(TR) = −1, so it always clicks; at the other A(RR) + A(TT) = 0, so it
> stays dark. If a light-sensitive specimen blocks one path, it acts as a which-path detector and the cancellation
> disappears. Now half the photons are absorbed, a quarter reach the bright detector and a quarter reach the
> dark one. A dark click is impossible without the specimen, and that photon was never absorbed, so we have
> detected the specimen without touching it. A bright click proves nothing, because it happens either way. The
> game makes students predict, observe and justify each step, and scores their reasoning rather than their luck.

## 4. Timed demo script

Before presenting: open the game, turn on **Settings → Presenter mode**, set text speed to **Fast**, and turn the
music down. Adjust the timings below to your slot.

| Time | Speaker | On screen | Say |
|---|---|---|---|
| 0:00–0:40 | A | Title → lab, walk the character | Hook question; the game teaches interaction-free measurement to 17–18-year-olds. |
| 0:40–1:30 | A | Bench 1: send 1 photon, then 20 | One whole click per photon (hf); random outcomes, predictable statistics. |
| 1:30–2:40 | B | Bench 2: place BS2, fire 10, open the Amplitude Explorer | Classical ¼ + ¼ vs quantum amplitudes; "Not half-photons!" tab. |
| 2:40–3:20 | B | Bench 3: drag φ to 180° | Relative phase; cos² graph; calibration. |
| 3:20–4:50 | C | Bench 4: dummy run, evidence table, one sealed holder | The key discovery; answer "The bright detector clicked. Can you conclude it's absent?" live. |
| 4:50–5:40 | C | Bench 5, cases 5–6 | Evidence vs proof; calibration; detector noise (≈98%, not 100%). |
| 5:40–6:30 | D | Bonus lab slider; Notebook → Lab manual and Sources | Beyond ⅓; assumptions; sources. |
| 6:30–7:00 | D | Notebook → Progress | Pedagogy: reasoning scored separately from luck; pre/post gain. Takeaway line. |

**Short version (~4 min):** cut bench 3 to one sentence, show only bench 4's evidence table and one holder, and
skip the bonus lab simulation.

## 5. Q&A bank

**Known physics**

- **Why exactly 25% / 25% / 50%?** P(absorbed) = |lower amplitude|² = ½. If not absorbed (probability ½), only the upper amplitude reaches BS2, which splits it evenly, so P(D2) = ½ × ½ = ¼ (conditional probability, lecture 2a). Same for D1.
- **Why can't a bright click prove absence?** It happens 100% of the time when the holder is empty and 25% when the specimen is present, so it is possible under both. Repeated bright clicks make absence very likely (5 in a row ≈ 0.1% if present) but never certain.
- **Why does the dark detector stay dark?** At D2, A(RR) = −i/2 and A(TT) = +i/2 (reflection × i/√2, transmission × 1/√2, mirror × i). They are equal and opposite, so they cancel.
- **Isn't the photon just split in half?** No. Each detection delivers the full energy hf at one detector, and true single photons are never detected at both outputs at once (Grangier, Roger & Aspect, 1986).
- **What is interfering, if there's only one photon?** The photon's own path amplitudes. Each photon interferes with itself, and only when the paths are indistinguishable (lecture 3b).
- **How does this connect to the double slit and the uncertainty lecture?** The specimen acts as a which-path detector. You can get which-path information or interference, never both (lectures 5a and 2a).
- **Do the mirrors' factors of i matter?** Each path has one mirror, so the factor is common to both. It drops out of the relative phase but is kept so the amplitudes match the lecture.
- **What's the best you can do?** With 50:50 beamsplitters, firing until something conclusive happens finds a present specimen safely ⅓ of the time. Tuning the reflectivity gives r/(1+r), approaching ½ (bonus lab). The quantum Zeno scheme goes further, and Kwiat et al. (1999) demonstrated efficiencies above that limit.
- **Is it used in practice?** It mostly shapes how physicists think about measurement, and inspires research on low-damage imaging. Interferometers in general are major measurement tools, such as LIGO. Don't overclaim everyday applications.

**Debated or uncertain (say so)**

- **Did the photon "really" not interact?** The prediction is certain: the detected photon delivered no energy to the specimen. Whether that counts as "no interaction" depends on interpretation (Elitzur & Vaidman discuss it in many-worlds terms). Present this as open, not settled.
- **What happens with a partially absorbing specimen?** The lower amplitude is reduced rather than removed, so the cancellation is only partial. D2 clicks less often, and a calibrated dark click still signals that something is in the path. The game assumes perfect absorption (Lab manual).

**About the game**

- **Isn't the computer's randomness fake?** Yes, and the game says so. It samples a pseudo-random number generator using the quantum predictions. The aim is to teach the predictions, not to demonstrate quantum randomness.
- **Why not score students on detections?** Detection is partly luck (⅓ per present specimen at best). Scoring reasoning against the evidence actually observed is fairer, so detections and damage are tracked separately.
- **How do you know the physics is right?** `tests/physics.test.js` checks the lecture amplitudes, cos²(φ/2), the 25/25/50 table, that the dark port never clicks when empty, sampling statistics, and the bonus-lab formulas.
- **How do you know students learn?** The same three questions are asked before and after each level, without feedback the first time, giving a pre/post comparison. Be honest about the sample size of any playtest.

## 6. Design decisions to highlight

- Predict → observe → explain cycle before and after every experiment (POE; White & Gunstone, *Probing Understanding*, 1992).
- Conclusions are judged against the **evidence seen**, not the hidden truth: "can't tell" is correct after only bright clicks, even if a specimen was secretly there.
- Visual rule: before detection, faint **amplitude** waves travel both paths; at detection, one whole gold photon appears. Half-photons are never shown.
- Honest limits built into play: calibration (case 5), detector noise (case 6), Lab manual, and a pseudo-random disclaimer.
- Physics checked by automated tests against the lecture's own numbers.

## 7. Team ownership plan

Give each member one area to own deeply, and have everyone rehearse the 60-second summary and the "known vs debated"
Q&A answers.

| Member | Owns | Must also be able to explain |
|---|---|---|
| A | Levels 1 & 3: probability, statistics, phase | The 60-second summary |
| B | Level 2 and the Amplitude Explorer: amplitudes, M, A(RT)… | Why the half-photon picture fails |
| C | Levels 4 & 5: the bomb tester, evidence vs proof, limits | The 25/25/50 derivation |
| D | Vault, bonus lab, game design, sources, playtest data | Why reasoning is scored instead of luck |

Swap roles in one rehearsal so anyone can cover any question.

## 8. Evidence you can gather before presenting

1. Ask 3–5 classmates to play two or three levels.
2. Use **Notebook → Progress → Copy report** to collect the warm-up and check-up scores.
3. Present the pre → post change **with its limits**: small sample, the same questions repeated, no control group.
   This addresses "evidence used critically" honestly.

## 9. Sources

All references, with DOIs, are listed in-game under **Notebook → Sources**, and in `js/content.js` (`sources`).
Also cite the HSI2011 lectures 2a, 3b and 5a (Y. Gao) and, for pedagogy, R. White & R. Gunstone, *Probing
Understanding* (Falmer Press, 1992).

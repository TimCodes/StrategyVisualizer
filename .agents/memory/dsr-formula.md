---
name: Deflated Sharpe Ratio formula implementation
description: Exact implementation choices for the Bailey & Lopez de Prado 2014 DSR, edge cases, and test expectations.
---

Reference: "The Deflated Sharpe Ratio" — Bailey & Lopez de Prado (2014).

**Formula:**
- SR = mean(r) / std(r) — per-period, NOT annualized (avoids period-length ambiguity)
- σ²_SR = (1 - γ₃·SR + (γ₄-1)/4·SR²) / (T-1)  where γ₃ = skewness, γ₄ = kurtosis (4th moment, not excess)
- E_max(N) = (1-γ_em)·Φ⁻¹(1 - 1/N) + γ_em·Φ⁻¹(1 - 1/(N·e))  (Euler-Mascheroni constant γ_em ≈ 0.5772)
- SR* = σ_SR · E_max(N)
- DSR = Φ((SR - SR*) / σ_SR)

**Edge cases:**
- N ≤ 1: E_max = 0, Φ⁻¹(1 - 1/N) is undefined for N=1 (→ -∞). Guard with `if (N <= 1) return 0`.
- σ²_SR ≤ 0 or NaN: clamp to 1e-10 before sqrt.
- T < 5: return `notValid: true` (formula meaningless on tiny samples).
- Simulated data: formula runs but DSR is tagged `notValid: true` with `SIMULATED_REASON`.

**Direction check (used in tests):** Higher N → higher E_max → higher SR* → lower (SR - SR*)/σ_SR → lower DSR. Positive SR with N=1 gives DSR > 0.5.

**DSR today is informational only** — it is computed and returned alongside Monte Carlo results but does not gate pass/fail by itself. Future: may be used as a second pass criterion.

**N source:** `storage.getTrialCount(strategyId)` for per-strategy count. `useGlobalTrials=true` uses `getTrialCount()` (no strategyId) for global count.

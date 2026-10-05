/* ═══════════════════════════════════════════════════════════════
   EV BATTERY INTELLIGENCE — MAIN DASHBOARD JAVASCRIPT
   Preserves all original heuristic calculations + adds:
   - Battery digital twin cell grid
   - AI diagnostic progress animation
   - Event timeline
   - Header clock
   - All dashboard update functions
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── API Configuration ───────────────────────────────────────
const API_URL = 'http://127.0.0.1:5000';

// ─── Chart instance ──────────────────────────────────────────
let trendChart = null;

// ─── Active state ─────────────────────────────────────────────
let currentDiagnostics = {
  soh: 85.6,
  trri: 11.0,
  chem: 'NMC',
  cycle: 120,
  voltage: 3.82,
  current: 2.10,
  temp: 29.0,
  r0: 28.4,
  rul_km: 4760,
  rul_cycles: 56,
  degradation: 14.4,
  condition: 'GOOD',
  grade: 'GRADE A — EV TRACTION',
  desc: 'Cell retains prime capacity. Recommended for primary EV mobility (Electric Vehicles & 2-Wheelers).'
};

// ─── Cell configuration (6S4P = 24 cells) ────────────────────
const CELL_ROWS   = 4;   // 4 parallel rows (P)
const CELL_COLS   = 6;   // 6 series columns (S)
const TOTAL_CELLS = CELL_ROWS * CELL_COLS; // 24

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initChart();
  generateCellGrid();
  startHeaderClock();
  setupEventListeners();
  checkAPIHealth();
  // Initial render with default values
  runClientFallback(
    currentDiagnostics.cycle,
    currentDiagnostics.voltage,
    currentDiagnostics.current,
    currentDiagnostics.temp,
    currentDiagnostics.chem
  );
  addTimelineEvent('Initialising dashboard', 'cyan');
  addTimelineEvent('Edge inference mode: active', 'green');
  addTimelineEvent('Battery telemetry received', 'green');
});

/* ════════════════════════════════════════════════════════════════
   HEADER CLOCK
════════════════════════════════════════════════════════════════ */
function startHeaderClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('headerTime');
    if (el) el.textContent = `${h}:${m}:${s} IST`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ════════════════════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════════════════════ */
function setupEventListeners() {

  // Form submission — AI Diagnostic button
  document.getElementById('predictionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await runDiagnosticWithAnimation();
  });

  // Chemistry select
  document.getElementById('inputChemistry').addEventListener('change', (e) => {
    document.getElementById('activeChemLabel').textContent = e.target.value;
  });

  // Simulation preset buttons
  document.getElementById('presetSafe').addEventListener('click', () => {
    applyPreset({ cycle: 80, voltage: 3.92, current: 1.8, temp: 27.0, chem: 'NMC' }, 'presetSafe');
  });

  document.getElementById('presetHeat').addEventListener('click', () => {
    applyPreset({ cycle: 190, voltage: 3.75, current: 2.4, temp: 42.0, chem: 'NMC' }, 'presetHeat');
  });

  document.getElementById('presetSolar').addEventListener('click', () => {
    applyPreset({ cycle: 310, voltage: 3.65, current: 1.6, temp: 29.0, chem: 'LFP' }, 'presetSolar');
  });

  document.getElementById('presetRunaway').addEventListener('click', () => {
    applyPreset({ cycle: 240, voltage: 3.25, current: 3.2, temp: 48.0, chem: 'NMC' }, 'presetRunaway');
  });
}

/* ════════════════════════════════════════════════════════════════
   APPLY PRESET
════════════════════════════════════════════════════════════════ */
function applyPreset(preset, buttonId) {
  // Update form fields
  document.getElementById('inputCycle').value   = preset.cycle;
  document.getElementById('inputVoltage').value = preset.voltage;
  document.getElementById('inputCurrent').value = preset.current;
  document.getElementById('inputTemp').value    = preset.temp;
  document.getElementById('inputChemistry').value = preset.chem;
  document.getElementById('activeChemLabel').textContent = preset.chem;

  // Highlight active preset button
  document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(buttonId);
  if (btn) btn.classList.add('active');

  addTimelineEvent(`Preset applied: ${btn ? btn.querySelector('.preset-name').textContent : ''}`, 'cyan');

  // Run diagnostic with animation
  runDiagnosticWithAnimation();
}

/* ════════════════════════════════════════════════════════════════
   AI DIAGNOSTIC WITH PROGRESS ANIMATION
════════════════════════════════════════════════════════════════ */
async function runDiagnosticWithAnimation() {
  const btn     = document.getElementById('btnRunDiag');
  const wrap    = document.getElementById('diagProgressWrap');
  const fill    = document.getElementById('diagProgressFill');
  const pct     = document.getElementById('diagProgressPct');
  const label   = document.getElementById('diagProgressLabel');
  const btnText = document.getElementById('btnDiagText');

  // Disable button & show progress
  btn.disabled = true;
  btnText.textContent = 'Analyzing...';
  wrap.style.display  = 'block';

  // Animate progress 0 → 100%
  const steps = [
    { pct: 10, msg: 'Receiving battery telemetry...' },
    { pct: 25, msg: 'Preprocessing sensor data...' },
    { pct: 45, msg: 'Running degradation model...' },
    { pct: 65, msg: 'Computing TRRI & thermal risk...' },
    { pct: 82, msg: 'Predicting EOL trajectory...' },
    { pct: 95, msg: 'Generating AI diagnosis...' },
    { pct: 100, msg: 'Analysis complete.' }
  ];

  // Pulse pipeline "inference" step
  const pipeInf = document.getElementById('pipeInference');
  if (pipeInf) { pipeInf.classList.remove('active'); pipeInf.classList.add('running'); }

  addTimelineEvent('AI diagnostic initiated', 'purple');

  for (const step of steps) {
    await sleep(280);
    fill.style.width  = `${step.pct}%`;
    pct.textContent   = `${step.pct}%`;
    label.textContent = step.msg;
  }

  await sleep(350);

  // Run actual calculation
  await runPrediction();

  // Reset UI
  btn.disabled  = false;
  btnText.textContent = 'RUN AI DIAGNOSTIC';
  wrap.style.display = 'none';
  fill.style.width   = '0%';
  if (pipeInf) { pipeInf.classList.remove('running'); pipeInf.classList.add('active'); }

  // Update timestamp
  const now = new Date();
  const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const footerEl = document.getElementById('footerLastUpdate');
  if (footerEl) footerEl.textContent = ts;

  addTimelineEvent('AI diagnostic completed', 'green');
  addTimelineEvent('Dashboard updated', 'cyan');
}

/* ════════════════════════════════════════════════════════════════
   CHECK API HEALTH
════════════════════════════════════════════════════════════════ */
async function checkAPIHealth() {
  const dot    = document.getElementById('statusDot');
  const text   = document.getElementById('apiStatusText');
  const badge  = document.getElementById('apiStatusBadge');

  try {
    const res  = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();

    if (data.status === 'healthy') {
      dot.style.background  = 'var(--green)';
      dot.style.boxShadow   = '0 0 8px var(--green)';
      text.textContent      = 'EDGE AI ONLINE';
      badge.style.borderColor = 'var(--green-border)';
      badge.style.background  = 'var(--green-bg)';
      badge.style.color       = 'var(--green)';
      fetchHistory();
      addTimelineEvent('Edge ML API connected', 'green');
    } else {
      setOfflineStatus(dot, text, badge);
    }
  } catch {
    setOfflineStatus(dot, text, badge);
  }
}

function setOfflineStatus(dot, text, badge) {
  dot.style.background   = 'var(--amber)';
  dot.style.boxShadow    = '0 0 8px var(--amber)';
  dot.style.animation    = 'pulse-amber 2s infinite';
  text.textContent       = 'HEURISTIC MODE';
  badge.style.borderColor = 'var(--amber-border)';
  badge.style.background  = 'var(--amber-bg)';
  badge.style.color       = 'var(--amber)';
  addTimelineEvent('API offline — local heuristic active', 'amber');
}

/* ════════════════════════════════════════════════════════════════
   RUN PREDICTION (API + client fallback)
════════════════════════════════════════════════════════════════ */
async function runPrediction() {
  const cycle   = parseInt(document.getElementById('inputCycle').value)   || 120;
  const voltage = parseFloat(document.getElementById('inputVoltage').value) || 3.82;
  const current = parseFloat(document.getElementById('inputCurrent').value) || 2.10;
  const temp    = parseFloat(document.getElementById('inputTemp').value)    || 29.0;
  const chem    = document.getElementById('inputChemistry').value           || 'NMC';

  // Immediate UI updates for sensor strip
  animateValue('valVoltage',  `${voltage.toFixed(2)} V`);
  animateValue('valCurrent',  `${current.toFixed(2)} A`);
  animateValue('valTemp',     `${temp.toFixed(1)} \u00b0C`);
  animateValue('sensorTemp',  `${temp.toFixed(1)} \u00b0C`);

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle,
        voltage_avg: voltage,
        current_avg: current,
        temp_max: temp,
        chemistry: chem
      }),
      signal: AbortSignal.timeout(5000)
    });

    const data = await res.json();
    if (data.success) {
      updateDashboard(data, chem, cycle, voltage, current, temp);
      fetchHistory();
      return;
    }
  } catch {
    // Fallback to client-side heuristic
    console.log('[EV BMS] API unavailable — using client-side heuristic');
  }

  runClientFallback(cycle, voltage, current, temp, chem);
}

/* ════════════════════════════════════════════════════════════════
   UPDATE DASHBOARD (from API data)
════════════════════════════════════════════════════════════════ */
function updateDashboard(data, chem, cycle, voltage, current, temp) {
  const soh   = parseFloat(data.soh_percent);
  const trri  = parseFloat(data.thermal_safety ? data.thermal_safety.risk_index : 15);
  const r0    = data.ecm_diagnostics ? data.ecm_diagnostics.internal_resistance_mohm : 28.4;
  const rul_c = data.rul ? data.rul.cycles : 56;
  const rul_k = data.rul ? data.rul.km : 4760;

  currentDiagnostics = {
    soh, trri, chem, cycle, voltage, current, temp,
    r0, rul_km: rul_k, rul_cycles: rul_c,
    degradation: parseFloat(data.degradation_percent),
    condition: data.condition,
    grade: data.second_life ? data.second_life.grade : 'GRADE A',
    desc:  data.second_life ? data.second_life.application : ''
  };

  applyAllUpdates(soh, trri, r0, rul_k, rul_c, temp, voltage, current, cycle, chem, data);
}

/* ════════════════════════════════════════════════════════════════
   CLIENT FALLBACK HEURISTIC
   (preserved from original with expanded outputs)
════════════════════════════════════════════════════════════════ */
function runClientFallback(cycle, voltage, current, temp, chem) {
  // SoH calculation (Thevenin-inspired heuristic)
  const chemFactor  = chem === 'LFP' ? 0.5 : 1.0;
  const tempPenalty = Math.max(0, (temp - 29.0) * 0.12);
  const rawDeg      = (0.10 * cycle * chemFactor) + tempPenalty;
  const soh         = Math.max(25.0, Math.min(100.0, 100.0 - rawDeg));
  const degradation = 100.0 - soh;

  // Internal resistance (ECM-based)
  const r0 = 24.0 + (degradation * 0.45) + (Math.max(0, current - 1.5) * 1.5);

  // Remaining Useful Life
  const rul_cycles = Math.max(0, Math.round((soh - 80.0) / (0.09 * chemFactor)));
  const rul_km     = Math.round(rul_cycles * 85.0);

  // Thermal Runaway Risk Index (Arrhenius-weighted)
  const tScore = Math.max(0, Math.min(100, (temp - 25.0) / 30.0 * 100));
  const rScore = Math.max(0, Math.min(100, (r0 - 25.0) / 45.0 * 100));
  const trri   = Math.round((0.6 * tScore) + (0.4 * rScore));

  // Second-life grading
  let grade, appDesc, gradeChar;
  if (soh >= 80.0) {
    grade    = 'GRADE A — EV TRACTION';
    gradeChar = 'A';
    appDesc  = 'Cell retains prime capacity. Recommended for primary EV mobility (Electric Vehicles & 2-Wheelers).';
  } else if (soh >= 65.0) {
    grade    = 'GRADE B — SOLAR STORAGE';
    gradeChar = 'B';
    appDesc  = 'Second-Life Storage for Solar Irrigation Pumps & stationary microgrids.';
  } else {
    grade    = 'GRADE C — MATERIAL RECYCLING';
    gradeChar = 'C';
    appDesc  = 'Candidate for Hydrometallurgical recovery of Lithium, Cobalt, and Nickel.';
  }

  // XAI attribution (proportional contribution)
  const thermalPct = Math.round(Math.min(70, Math.max(5, tempPenalty * 10)));
  const cratePct   = Math.round(Math.min(50, Math.max(5, current * 12)));
  const cyclePct   = Math.max(5, 100 - thermalPct - cratePct);

  const simulatedData = {
    soh_percent:        soh.toFixed(1),
    degradation_percent: degradation.toFixed(1),
    condition: soh >= 80 ? 'GOOD' : (soh >= 65 ? 'WARNING' : 'CRITICAL'),
    alert:     soh >= 80 ? 'Battery operating normally.' : 'Elevated degradation detected.',
    rul: { cycles: rul_cycles, km: rul_km },
    ecm_diagnostics: { internal_resistance_mohm: r0 },
    thermal_safety: {
      risk_index:           trri,
      risk_level:           trri >= 70 || temp >= 45 ? 'CRITICAL' : (trri >= 40 ? 'ELEVATED' : 'NORMAL'),
      relay_cutoff_tripped: trri >= 70 || temp >= 45
    },
    second_life: {
      grade,
      gradeChar,
      application:        appDesc,
      economic_value_pct: Math.round(soh * 0.8)
    },
    xai: {
      thermal_stress_pct: thermalPct,
      crate_stress_pct:   cratePct,
      cycle_fatigue_pct:  cyclePct
    }
  };

  updateDashboard(simulatedData, chem, cycle, voltage, current, temp);
}

/* ════════════════════════════════════════════════════════════════
   APPLY ALL DASHBOARD UPDATES
════════════════════════════════════════════════════════════════ */
function applyAllUpdates(soh, trri, r0, rul_km, rul_cycles, temp, voltage, current, cycle, chem, data) {
  const deg     = parseFloat(data.degradation_percent) || (100 - soh);
  const cond    = data.condition || (soh >= 80 ? 'GOOD' : soh >= 65 ? 'WARNING' : 'CRITICAL');
  const condCss = cond.toLowerCase() === 'good' ? 'good' : cond.toLowerCase() === 'warning' ? 'warning' : 'critical';

  // ── 1. KPI Section ──────────────────────────────────────────
  animateValue('kpiSohVal',       `${soh.toFixed(1)}<span class="kpi-unit">%</span>`);
  animateValue('kpiTrriVal',      `${trri.toFixed(0)}<span class="kpi-unit">%</span>`);
  animateValue('kpiRulVal',       `${rul_km.toLocaleString()}<span class="kpi-unit">km</span>`);
  animateValue('kpiDegText',      `Degradation: ${deg.toFixed(1)}%`, false);
  animateValue('kpiRulCycles',    `${rul_cycles} cycles to 80% EoL`, false);

  // SoH gauge bar & badge
  setBarWidth('kpiSohBar', soh);
  setBadge('kpiSohBadge', cond, condCss);

  // TRRI color logic
  const trriCss = trri < 40 ? 'good' : (trri < 70 ? 'warning' : 'critical');
  const trriLabel = trri < 40 ? 'LOW RISK' : (trri < 70 ? 'ELEVATED' : 'CRITICAL');
  setBarWidth('kpiTrriBar', trri);
  setBadge('kpiTrriBadge', trriLabel, trriCss);
  const trriBarEl = document.getElementById('kpiTrriBar');
  if (trriBarEl) {
    trriBarEl.className = 'kpi-gauge-fill ' + (trri < 40 ? 'kpi-fill-green' : trri < 70 ? 'kpi-fill-amber' : 'kpi-fill-red');
  }

  // Thermal sub
  setInner('trriSub', trri >= 70 ? 'TRIPPED (<100ms)' : (trri >= 40 ? 'Thermal Stress' : 'Safe Margin'));

  // Battery status KPI
  const battStatusText = cond === 'GOOD' ? 'HEALTHY' : (cond === 'WARNING' ? 'DEGRADED' : 'CRITICAL');
  animateValue('kpiBattStatusVal', battStatusText, false, true);
  setBadge('kpiBattStatusBadge', cond === 'GOOD' ? 'OPERATIONAL' : cond, condCss);
  setInner('kpiBattStatusSub',
    cond === 'GOOD' ? 'No immediate anomaly' :
    cond === 'WARNING' ? 'Elevated degradation detected' : 'Immediate attention required');

  // RUL badge
  setBadge('kpiRulBadge', rul_cycles > 0 ? 'ACTIVE' : 'EOL REACHED', rul_cycles > 0 ? 'good' : 'critical');

  // ── 2. Sensor Strip ─────────────────────────────────────────
  animateValue('valVoltage',  `${voltage.toFixed(2)} V`, false);
  animateValue('valCurrent',  `${current.toFixed(2)} A`, false);
  animateValue('valTemp',     `${temp.toFixed(1)} \u00b0C`, false);
  animateValue('sensorTemp',  `${temp.toFixed(1)} \u00b0C`, false);
  animateValue('valRes',      `${r0.toFixed(1)} m\u03a9`, false);
  animateValue('sensorSoh',   `${soh.toFixed(1)}%`, false);
  const crate = (current / 2.2).toFixed(2); // nominal cap ~2.2Ah
  animateValue('sensorCrate', `${crate} C`, false);

  // ── 3. Thermal Section ──────────────────────────────────────
  const tempMax   = parseFloat((temp + 3.1 + (trri > 40 ? 2.5 : 0)).toFixed(1));
  const tempDelta = parseFloat((tempMax - temp).toFixed(1));
  animateValue('valTempMax',  `${tempMax.toFixed(1)} \u00b0C`, false);
  animateValue('valTempDelta', `${tempDelta.toFixed(1)} \u00b0C`, false);

  const thermalStatus = temp >= 45 ? 'CRITICAL' : (temp >= 38 ? 'WARNING' : 'NORMAL');
  const thermalEl = document.getElementById('thermalStatusText');
  if (thermalEl) {
    thermalEl.textContent = thermalStatus;
    thermalEl.className = 'thermal-mini-value ' + (
      thermalStatus === 'CRITICAL' ? 'status-critical-text' :
      thermalStatus === 'WARNING'  ? 'status-warning-text'  : 'status-good-text'
    );
  }

  // ── 4. Pack Visualization ───────────────────────────────────
  updateCellGrid(soh, temp, trri);
  const packSubEl = document.getElementById('packSubtitle');
  if (packSubEl) packSubEl.textContent = `${chem} \u2022 ${cycle} Cycles \u2022 6S4P \u2022 24 Cells`;
  const packTempEl = document.getElementById('packTempBadge');
  if (packTempEl) packTempEl.textContent = `Pack Avg: ${temp.toFixed(1)} \u00b0C`;
  updateHeaderStats(chem, cycle);

  // ── 5. Chart ─────────────────────────────────────────────────
  updateChart(soh, cycle, chem);

  // ── 6. AI Diagnosis ─────────────────────────────────────────
  updateAIDiagnosis(soh, trri, temp, current, rul_cycles, data.xai);

  // ── 7. XAI Bars ─────────────────────────────────────────────
  if (data.xai) updateXaiBars(data.xai);

  // ── 8. Safety / Relay / Alert ───────────────────────────────
  updateSafetyPanel(trri, temp, soh, data);

  // ── 9. Second-Life ──────────────────────────────────────────
  if (data.second_life) updateSecondLife(data.second_life, soh, rul_cycles);

  // ── 10. Chart Footer ────────────────────────────────────────
  const eolCycles = cycle + rul_cycles;
  setInner('eolProjection',     `Predicted EOL: ~${eolCycles.toLocaleString()} cycles`);
  setInner('currentCycleMarker', `Current: Cycle ${cycle} \u2014 ${soh.toFixed(1)}% SoH`);
  setInner('diagEolPrediction',  `~${eolCycles.toLocaleString()} cycles`);
}

/* ════════════════════════════════════════════════════════════════
   AI DIAGNOSIS UPDATE
════════════════════════════════════════════════════════════════ */
function updateAIDiagnosis(soh, trri, temp, current, rul_cycles, xai) {
  const statusLabel = document.getElementById('diagStatusLabel');
  const pulseEl     = document.getElementById('diagPulseDot');
  const msgEl       = document.getElementById('diagMessage');
  const riskBadge   = document.getElementById('diagRiskBadge');
  const confBadge   = document.getElementById('aiConfBadge');
  const riskLvEl    = document.getElementById('diagRiskLevel');
  const mechEl      = document.getElementById('diagPrimaryMechanism');
  const msgPanelEl  = document.querySelector('.diagnosis-message');

  let status, color, message, riskLevel, mechanism, confidence;

  if (temp >= 45 || trri >= 70) {
    // Critical thermal condition
    status     = 'CRITICAL THERMAL ALERT';
    color      = 'var(--red)';
    riskLevel  = 'CRITICAL';
    confidence = 97;
    mechanism  = 'Thermal runaway precursor';
    message    = 'Critical thermal conditions detected. Temperature exceeds safe operating threshold. ' +
                 'Relay cutoff protocol simulated. Immediate cooling intervention recommended.';
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--red)';
  } else if (temp >= 38 || trri >= 40) {
    // High temperature stress
    status     = 'ELEVATED THERMAL STRESS';
    color      = 'var(--amber)';
    riskLevel  = 'ELEVATED';
    confidence = 91;
    mechanism  = 'Thermal stress & Arrhenius aging';
    message    = 'Elevated thermal stress detected. Accelerated degradation rate predicted due to ' +
                 'high operating temperature. Monitoring dT/dt thermal gradient.';
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--amber)';
  } else if (current >= 3.0) {
    // High C-rate stress
    status     = 'HIGH LOAD STRESS';
    color      = 'var(--amber)';
    riskLevel  = 'MODERATE';
    confidence = 88;
    mechanism  = 'High C-rate / load stress';
    message    = 'High discharge rate detected. Internal resistance growth may accelerate. ' +
                 'Lithium plating risk elevated at current C-rate.';
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--amber)';
  } else if (soh < 65) {
    // Advanced degradation
    status     = 'ADVANCED DEGRADATION';
    color      = 'var(--red)';
    riskLevel  = 'HIGH';
    confidence = 93;
    mechanism  = 'Capacity fade & lithium inventory loss';
    message    = 'Battery has exceeded primary EV application threshold (SoH < 65%). ' +
                 'Second-life redeployment or recycling assessment recommended.';
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--red)';
  } else if (soh < 80) {
    // Approaching EOL
    status     = 'APPROACHING EOL';
    color      = 'var(--amber)';
    riskLevel  = 'MODERATE';
    confidence = 90;
    mechanism  = 'Natural cycle fatigue (SEI growth)';
    message    = 'Battery approaching 80% EoL threshold. ' +
                 `Estimated ${rul_cycles} cycles remaining. Plan for second-life assessment.`;
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--amber)';
  } else {
    // Healthy / normal
    status     = 'HEALTHY';
    color      = 'var(--green)';
    riskLevel  = 'LOW';
    confidence = 94;
    mechanism  = 'Natural cycle aging (SEI growth)';
    message    = 'Battery operating within expected conditions. No immediate thermal anomaly detected. ' +
                 'SoH is within the healthy range for primary EV traction application.';
    if (msgPanelEl) msgPanelEl.style.borderLeftColor = 'var(--green)';
  }

  if (statusLabel) { statusLabel.textContent = status; statusLabel.style.color = color; }
  if (pulseEl)     { pulseEl.style.background = color; pulseEl.style.boxShadow = `0 0 10px ${color}`; }
  if (msgEl)       msgEl.textContent = message;
  if (riskBadge)   {
    riskBadge.textContent = `Risk: ${riskLevel}`;
    riskBadge.className   = 'diag-risk-badge ' +
      (riskLevel === 'LOW' ? 'status-good' : riskLevel === 'MODERATE' || riskLevel === 'ELEVATED' ? 'status-warning' : 'status-critical');
  }
  if (confBadge)   confBadge.textContent = `Confidence: ${confidence}%`;
  if (riskLvEl)    riskLvEl.textContent  = riskLevel;
  if (mechEl)      mechEl.textContent    = mechanism;
}

/* ════════════════════════════════════════════════════════════════
   UPDATE XAI BARS (from data or fallback)
════════════════════════════════════════════════════════════════ */
function updateXaiBars(xai) {
  setBarWidth('xaiCycleFill',   xai.cycle_fatigue_pct);
  setBarWidth('xaiThermalFill', xai.thermal_stress_pct);
  setBarWidth('xaiCrateFill',   xai.crate_stress_pct);
  setInner('xaiCycleVal',   `${xai.cycle_fatigue_pct}%`);
  setInner('xaiThermalVal', `${xai.thermal_stress_pct}%`);
  setInner('xaiCrateVal',   `${xai.crate_stress_pct}%`);
}

/* ════════════════════════════════════════════════════════════════
   SAFETY / RELAY / ALERT UPDATE
════════════════════════════════════════════════════════════════ */
function updateSafetyPanel(trri, temp, soh, data) {
  const safetyMain  = document.getElementById('safetyMain');
  const safetyIcon  = document.getElementById('safetyIcon');
  const safetyLabel = document.getElementById('safetyMainLabel');
  const alertBox    = document.getElementById('alertBox');
  const alertText   = document.getElementById('alertText');
  const relayEl     = document.getElementById('relayTag');
  const thermalProt = document.getElementById('thermalProtStatus');

  const isTripped = (data.thermal_safety && data.thermal_safety.relay_cutoff_tripped) ||
                    temp >= 45.0 || trri >= 70.0;

  if (isTripped) {
    safetyMain.className  = 'safety-main critical';
    safetyIcon.textContent  = '\u26a0';
    safetyLabel.textContent = 'CRITICAL';
    alertBox.className      = 'alert-banner critical';
    alertText.textContent   = 'CRITICAL: Thermal runaway precursor detected. Autonomous relay cutoff simulated (<100 ms). Load isolation protocol active.';
    if (relayEl) { relayEl.textContent = 'TRIPPED \u00b7 OPEN'; relayEl.className = 'safety-item-value relay-value tripped'; }
    if (thermalProt) { thermalProt.textContent = 'TRIPPED'; thermalProt.className = 'safety-item-value status-critical-text'; }
    addTimelineEvent('Thermal relay cutoff simulated', 'red');

  } else if (trri >= 40.0 || temp >= 38.0) {
    safetyMain.className  = 'safety-main warning';
    safetyIcon.textContent  = '\u26a0';
    safetyLabel.textContent = 'WARNING';
    alertBox.className      = 'alert-banner warning';
    alertText.textContent   = 'WARNING: Elevated cell temperature. Monitoring dT/dt thermal gradient. Relay armed.';
    if (relayEl) { relayEl.textContent = 'ARMED \u00b7 CLOSED'; relayEl.className = 'safety-item-value relay-value'; }
    if (thermalProt) { thermalProt.textContent = 'MONITORING'; thermalProt.className = 'safety-item-value status-warning-text'; }
    addTimelineEvent('Thermal conditions elevated — monitoring', 'amber');

  } else {
    safetyMain.className  = 'safety-main';
    safetyIcon.textContent  = '\u2713';
    safetyLabel.textContent = 'NORMAL';
    alertBox.className      = 'alert-banner';
    alertText.textContent   = data.alert || 'Optimal electrothermal equilibrium. No degradation intervention required.';
    if (relayEl) { relayEl.textContent = 'ARMED \u00b7 CLOSED'; relayEl.className = 'safety-item-value relay-value'; }
    if (thermalProt) { thermalProt.textContent = 'ACTIVE'; thermalProt.className = 'safety-item-value status-good-text'; }
    addTimelineEvent('Thermal conditions nominal', 'green');
  }
}

/* ════════════════════════════════════════════════════════════════
   SECOND-LIFE UPDATE
════════════════════════════════════════════════════════════════ */
function updateSecondLife(sl, soh, rul_cycles) {
  // Grade display
  const gradeChar = sl.gradeChar || (sl.grade.includes('A') ? 'A' : sl.grade.includes('B') ? 'B' : 'C');
  const gradeLabel = sl.grade;
  const gradeEl   = document.getElementById('slGradeValue');
  const gradeLbEl = document.getElementById('slGradeLabel');

  const gradeColor = gradeChar === 'A' ? 'var(--green)' : gradeChar === 'B' ? 'var(--amber)' : 'var(--red)';
  if (gradeEl) { gradeEl.textContent = gradeChar; gradeEl.style.color = gradeColor; }
  if (gradeLbEl) { gradeLbEl.textContent = `GRADE ${gradeChar}`; gradeLbEl.style.color = gradeColor; }

  // Grade display container background
  const slGradeDisplay = document.querySelector('.sl-grade-display');
  if (slGradeDisplay) {
    slGradeDisplay.style.background = gradeChar === 'A' ? 'var(--green-bg)' : gradeChar === 'B' ? 'var(--amber-bg)' : 'var(--red-bg)';
    slGradeDisplay.style.borderColor = gradeChar === 'A' ? 'var(--green-border)' : gradeChar === 'B' ? 'var(--amber-border)' : 'var(--red-border)';
  }

  // Application
  const appEl = document.getElementById('secondLifeGrade');
  if (appEl) appEl.textContent = gradeChar === 'A' ? 'Primary EV / 2-Wheeler' : gradeChar === 'B' ? 'Solar Storage / Microgrid' : 'Hydrometallurgical Recycling';

  // Description
  const descEl = document.getElementById('secondLifeDesc');
  if (descEl) descEl.textContent = sl.application;

  // Metrics
  setInner('slResidualCap', `${soh.toFixed(1)}%`);
  setInner('economicValText', `~${sl.economic_value_pct || Math.round(soh * 0.8)}%`);

  const confidence = gradeChar === 'A' ? 94 : gradeChar === 'B' ? 87 : 76;
  setInner('slConfidence', `${confidence}%`);

  // RUL bar
  const maxCycles = 300;
  const rulPct    = Math.min(100, Math.max(0, (rul_cycles / maxCycles) * 100));
  setBarWidth('rulBarFill', rulPct);
  setInner('valRulKm',     currentDiagnostics.rul_km.toLocaleString() + ' km');
  setInner('valRulCycles', `${rul_cycles} cycles to 80% EoL`);
}

/* ════════════════════════════════════════════════════════════════
   BATTERY CELL GRID — Digital Twin (6S4P, 24 cells)
   Each cell displays its temperature and cell number.
   Clicking a cell opens the Cell Detail Modal.
════════════════════════════════════════════════════════════════ */

/**
 * Seed-based variance so per-cell values are stable between renders
 * (only change when simulation inputs change).
 */
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateCellGrid() {
  const grid = document.getElementById('cellGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cellNum = String(i + 1).padStart(2, '0');
    const cell    = document.createElement('div');
    cell.className       = 'battery-cell cell-healthy';
    cell.dataset.cellNum = cellNum;
    cell.dataset.idx     = i;
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-label', `Cell ${cellNum} — click for details`);

    // Temperature display
    const tempSpan = document.createElement('span');
    tempSpan.className = 'cell-temp';
    tempSpan.textContent = '--°';

    // Cell ID label
    const idSpan = document.createElement('span');
    idSpan.className = 'cell-id';
    idSpan.textContent = cellNum;

    cell.appendChild(tempSpan);
    cell.appendChild(idSpan);

    // Click → open modal
    cell.addEventListener('click', () => openCellModal(cell));
    // Keyboard support
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCellModal(cell); }
    });

    grid.appendChild(cell);
  }

  // Modal close button
  const closeBtn = document.getElementById('cellModalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeCellModal);

  // Close on overlay background click
  const overlay = document.getElementById('cellModalOverlay');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCellModal();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCellModal();
  });
}

function updateCellGrid(soh, temp, trri) {
  const cells = document.querySelectorAll('.battery-cell');
  if (!cells.length) return;

  const { voltage, r0, cycle } = currentDiagnostics;
  let minTemp = Infinity, maxTemp = -Infinity;

  cells.forEach((cell) => {
    const idx = parseInt(cell.dataset.idx);

    // Use seeded variance so values are stable per simulation run
    // but deterministic per-cell (no flickering on re-render)
    const seed = idx * 7 + Math.round(temp * 10) + Math.round(soh);
    const rv = (s) => seededRandom(seed + s);

    // Per-cell calculated values with realistic variance
    const cellTemp = parseFloat(Math.max(20, Math.min(75, temp + (rv(0) * 6 - 3))).toFixed(1));
    const cellSoh  = parseFloat(Math.max(50, Math.min(100, soh  + (rv(1) * 8 - 4))).toFixed(1));
    const cellV    = parseFloat(Math.max(2.8, Math.min(4.2, voltage + (rv(2) * 0.12 - 0.06))).toFixed(2));
    const cellR    = parseFloat(Math.max(18, Math.min(120, r0   + (rv(3) * 10 - 5))).toFixed(1));

    cell.dataset.voltage  = cellV;
    cell.dataset.temp     = cellTemp;
    cell.dataset.soh      = cellSoh;
    cell.dataset.res      = cellR;
    cell.dataset.cycles   = cycle;

    // Track pack temperature range
    if (cellTemp < minTemp) minTemp = cellTemp;
    if (cellTemp > maxTemp) maxTemp = cellTemp;

    // Cell state based on temperature (primary) and SoH
    let cellClass, statusLabel, aiText;
    if (cellTemp >= 45 || trri >= 70 || cellSoh < 65) {
      cellClass   = 'battery-cell cell-critical';
      statusLabel = 'Critical';
      aiText      = 'Critical · Immediate attention required';
    } else if (cellTemp >= 35 || trri >= 40 || cellSoh < 80) {
      cellClass   = 'battery-cell cell-warm';
      statusLabel = 'Elevated';
      aiText      = 'Elevated temperature · Monitor dT/dt';
    } else {
      cellClass   = 'battery-cell cell-healthy';
      statusLabel = 'Nominal';
      aiText      = 'Healthy · No anomaly';
    }

    cell.className        = cellClass;
    cell.dataset.status   = statusLabel;
    cell.dataset.aitext   = aiText;

    // Update the temperature text inside the cell
    const tempEl = cell.querySelector('.cell-temp');
    if (tempEl) tempEl.textContent = `${cellTemp.toFixed(0)}°`;
  });

  // Update pack stats bar
  const deltaT = (maxTemp - minTemp);
  const packDeltaEl  = document.getElementById('packDeltaT');
  const packStatEl   = document.getElementById('packThermalStatus');

  if (packDeltaEl) packDeltaEl.textContent = `${deltaT.toFixed(1)} °C`;
  if (packStatEl) {
    if (maxTemp >= 45 || trri >= 70) {
      packStatEl.textContent = 'CRITICAL';
      packStatEl.className   = 'status-critical-text';
    } else if (maxTemp >= 35 || trri >= 40) {
      packStatEl.textContent = 'WARNING';
      packStatEl.className   = 'status-warning-text';
    } else {
      packStatEl.textContent = 'NORMAL';
      packStatEl.className   = 'status-good-text';
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   CELL DETAIL MODAL — open / close
────────────────────────────────────────────────────────────── */
function openCellModal(cell) {
  const overlay  = document.getElementById('cellModalOverlay');
  if (!overlay) return;

  const cellNum = cell.dataset.cellNum;
  const status  = cell.dataset.status  || 'Nominal';
  const aiText  = cell.dataset.aitext  || 'Healthy · No anomaly';

  // Populate modal fields
  document.getElementById('cellModalTitle').textContent = `CELL ${cellNum}`;
  document.getElementById('cmVoltage').textContent = `${cell.dataset.voltage} V`;
  document.getElementById('cmTemp').innerHTML     = `${cell.dataset.temp} °C`;
  document.getElementById('cmRes').innerHTML      = `${cell.dataset.res} mΩ`;
  document.getElementById('cmSoh').textContent    = `${cell.dataset.soh}%`;
  document.getElementById('cmCycles').textContent = cell.dataset.cycles || currentDiagnostics.cycle;

  // AI assessment text colour
  const aiEl = document.getElementById('cmAiAssessment');
  aiEl.textContent = aiText;
  aiEl.style.color = status === 'Critical' ? 'var(--red)' : status === 'Elevated' ? 'var(--amber)' : 'var(--green)';

  // Badge
  const badge = document.getElementById('cellModalBadge');
  badge.textContent = status;
  badge.className   = 'cell-modal-badge' +
    (status === 'Critical' ? ' crit' : status === 'Elevated' ? ' warn' : '');

  overlay.style.display = 'flex';
}

function closeCellModal() {
  const overlay = document.getElementById('cellModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

/* ════════════════════════════════════════════════════════════════
   HEADER STATS UPDATE
════════════════════════════════════════════════════════════════ */
function updateHeaderStats(chem, cycle) {
  setInner('activeChemLabel',   chem);
  setInner('headerCycleCount',  String(cycle));
}

/* ════════════════════════════════════════════════════════════════
   CHART — INIT & UPDATE
════════════════════════════════════════════════════════════════ */
function initChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  trendChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: [1, 50, 100, 150, 200, 250, 300, 350],
      datasets: [
        {
          label: 'Historical SoH (%)',
          data:  [100.0, 97.2, 94.1, 90.5, 86.8, null, null, null],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#06b6d4',
          segment: { borderDash: ctx => ctx.p1DataIndex >= 4 ? [6,4] : [] }
        },
        {
          label: 'AI Predicted SoH (%)',
          data:  [null, null, null, null, 86.8, 82.1, 77.4, 72.0],
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.06)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#8b5cf6',
        },
        {
          label: 'EoL Threshold (80%)',
          data:  [80, 80, 80, 80, 80, 80, 80, 80],
          borderColor: 'rgba(239, 68, 68, 0.65)',
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600, easing: 'easeInOutQuart' },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#5a6a84', font: { size: 10 } },
          title: { display: true, text: 'Cycle Count', color: '#5a6a84', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: { color: '#5a6a84', font: { size: 10 }, callback: v => `${v}%` },
          min: 50, max: 105,
          title: { display: true, text: 'SoH (%)', color: '#5a6a84', font: { size: 10 } }
        }
      },
      plugins: {
        legend: {
          display: false  // We use our own HTML legend
        },
        tooltip: {
          backgroundColor: 'rgba(7, 11, 22, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#06b6d4',
          bodyColor: '#94a3b8',
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) + '%' : 'N/A'}`
          }
        }
      }
    }
  });
}

function updateChart(soh, cycle, chem) {
  if (!trendChart) return;

  const chemFactor = chem === 'LFP' ? 0.5 : 1.0;

  // Generate historical data up to current cycle
  const histLabels  = [];
  const histData    = [];
  const predLabels  = [];
  const predData    = [];
  const step = 50;

  for (let c = 0; c <= cycle; c += step) {
    const rawDeg = 0.10 * c * chemFactor;
    const s = Math.max(50, Math.min(100, 100 - rawDeg));
    histLabels.push(c);
    histData.push(parseFloat(s.toFixed(1)));
    predData.push(null);
  }
  if (histLabels[histLabels.length - 1] !== cycle) {
    histLabels.push(cycle);
    histData.push(parseFloat(soh.toFixed(1)));
    predData.push(null);
  }

  // Predict forward 150 more cycles
  let lastHistIdx = histData.length - 1;
  for (let i = 1; i <= 3; i++) {
    const fc = cycle + i * step;
    const rawDeg = 0.10 * fc * chemFactor;
    const s = Math.max(50, Math.min(100, 100 - rawDeg));
    histLabels.push(fc);
    histData.push(null);
    predData.push(parseFloat(s.toFixed(1)));
  }

  // Bridge: start prediction from last historical point
  predData[lastHistIdx] = parseFloat(soh.toFixed(1));

  const eolLine = histLabels.map(() => 80);

  trendChart.data.labels            = histLabels;
  trendChart.data.datasets[0].data  = histData;
  trendChart.data.datasets[1].data  = predData;
  trendChart.data.datasets[2].data  = eolLine;
  trendChart.update('active');
}

/* ════════════════════════════════════════════════════════════════
   FETCH HISTORY (API)
════════════════════════════════════════════════════════════════ */
async function fetchHistory() {
  try {
    const res  = await fetch(`${API_URL}/history`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();

    if (data.success && data.data && data.data.length > 0) {
      const reversed = [...data.data].reverse();
      const labels   = reversed.map(d => d.cycle);
      const sohData  = reversed.map(d => d.predicted_soh);
      const eolData  = reversed.map(() => 80);

      trendChart.data.labels           = labels;
      trendChart.data.datasets[0].data = sohData;
      trendChart.data.datasets[1].data = sohData.map(() => null); // Clear prediction
      trendChart.data.datasets[2].data = eolData;
      trendChart.update();
    }
  } catch {
    // Silent — chart has default data
  }
}

/* ════════════════════════════════════════════════════════════════
   DIAGNOSTIC TIMELINE
════════════════════════════════════════════════════════════════ */
function addTimelineEvent(message, type = 'cyan') {
  const list = document.getElementById('timelineList');
  if (!list) return;

  const now = new Date();
  const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const item = document.createElement('li');
  item.className = 'timeline-item';
  item.innerHTML = `
    <span class="timeline-time">${ts}</span>
    <span class="timeline-dot timeline-dot-${type}"></span>
    <span class="timeline-msg">${message}</span>
  `;

  // Prepend (newest first)
  list.insertBefore(item, list.firstChild);

  // Cap to 8 events
  while (list.children.length > 8) {
    list.removeChild(list.lastChild);
  }
}

/* ════════════════════════════════════════════════════════════════
   HELPER UTILITIES
════════════════════════════════════════════════════════════════ */

/** Set innerHTML of an element by ID */
function setInner(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Set element text content with optional animation class */
function animateValue(id, html, useAnimation = true, plainText = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (plainText) {
    el.textContent = html;
  } else {
    el.innerHTML = html;
  }
  if (useAnimation) {
    el.classList.add('updating');
    setTimeout(() => el.classList.remove('updating'), 350);
  }
}

/** Set width of a bar element */
function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

/** Set badge text + CSS class */
function setBadge(id, text, statusClass) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = `kpi-badge status-${statusClass}`;
}

/** Promise-based sleep */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

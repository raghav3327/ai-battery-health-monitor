import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5000';

/**
 * Intercepts all backend API calls so tests run deterministically in offline
 * client-heuristic mode without requiring a running Flask process on :5000.
 */
async function mockApiOffline(page) {
  await page.route(`${API_BASE}/**`, (route) => route.abort('connectionrefused'));
}

/**
 * Mocks healthy Flask /health and /history endpoints so initial load produces
 * zero failed network requests or console errors.
 */
async function mockApiHealthy(page, historyRows = []) {
  await page.route(`${API_BASE}/health`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        project: 'AI Battery Health Monitor',
        model_loaded: true,
      }),
    })
  );

  await page.route(`${API_BASE}/history`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        count: historyRows.length,
        data: historyRows,
      }),
    })
  );
}

/**
 * Waits for the AI diagnostic progress animation (~2.3 s) to complete.
 */
async function waitForDiagnosticCompletion(page) {
  await expect(page.locator('#btnRunDiag')).toBeEnabled({ timeout: 10_000 });
  await expect(page.locator('#diagProgressWrap')).toBeHidden({ timeout: 10_000 });
}

test.describe('EV Battery Health & Thermal Safety Dashboard E2E', () => {
  test('TC01: Initial dashboard load, zero console/page errors, header clock, and 24-cell digital twin', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await mockApiHealthy(page);
    await page.goto('/');

    await expect(page).toHaveTitle(/EV Battery Intelligence/i);
    await expect(page.locator('#activeChemLabel')).toHaveText('NMC');
    await expect(page.locator('#headerCycleCount')).toHaveText('120');
    await expect(page.locator('#headerTime')).toHaveText(/^\d{2}:\d{2}:\d{2} IST$/);

    // Initial runClientFallback(120, 3.82, 2.10, 29.0, 'NMC') computes 88.0% SoH
    await expect(page.locator('#kpiSohVal')).toContainText('88.0%');
    await expect(page.locator('#kpiDegText')).toHaveText('Degradation: 12.0%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('GOOD');
    await expect(page.locator('#slGradeValue')).toHaveText('A');

    // 6S4P = 24 interactive battery cells
    await expect(page.locator('#cellGrid .battery-cell')).toHaveCount(24);

    // Chart.js loaded from CDN without JS runtime errors
    const hasChart = await page.evaluate(() => typeof window.Chart === 'function');
    expect(hasChart).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('TC02: Offline fallback rendering switches badge to HEURISTIC MODE and computes local diagnostics', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await mockApiOffline(page);
    await page.goto('/');

    await expect(page.locator('#apiStatusText')).toHaveText('HEURISTIC MODE');
    await expect(page.locator('#timelineList')).toContainText('API offline — local heuristic active');

    await page.locator('#inputCycle').fill('150');
    await page.locator('#inputVoltage').fill('3.78');
    await page.locator('#inputCurrent').fill('2.00');
    await page.locator('#inputTemp').fill('29.0');
    await page.locator('#btnRunDiag').click();

    await waitForDiagnosticCompletion(page);

    // NMC at cycle 150, 29 C: 100 - 15.0 = 85.0%
    await expect(page.locator('#kpiSohVal')).toContainText('85.0%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('GOOD');
    await expect(page.locator('#safetyMainLabel')).toHaveText('NORMAL');
    expect(pageErrors).toEqual([]);
  });

  test('TC03: Online Flask API integration handles /health, POST /predict, and GET /history', async ({ page }) => {
    let predictPayload = null;

    await mockApiHealthy(page, [
      { cycle: 120, predicted_soh: 88.4 },
      { cycle: 80, predicted_soh: 92.1 },
    ]);

    await page.route(`${API_BASE}/predict`, async (route) => {
      predictPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          soh_percent: 88.4,
          degradation_percent: 11.6,
          condition: 'GOOD',
          alert: 'Battery operating normally. High electrochemical capacity retention.',
          chemistry: predictPayload.chemistry,
          rul: { cycles: 88, km: 7480, eol_threshold_pct: 80.0 },
          ecm_diagnostics: { internal_resistance_mohm: 29.5, status: 'Nominal' },
          thermal_safety: {
            risk_index: 14.2,
            risk_level: 'NORMAL',
            relay_cutoff_tripped: false,
          },
          second_life: {
            grade: 'GRADE A',
            application: 'Primary EV Traction (Electric Vehicles & 2-Wheelers)',
            economic_value_pct: 75.1,
          },
          xai: {
            thermal_stress_pct: 12.0,
            crate_stress_pct: 18.0,
            cycle_fatigue_pct: 70.0,
          },
        }),
      });
    });

    await page.goto('/');
    await expect(page.locator('#apiStatusText')).toHaveText('EDGE AI ONLINE');
    await expect(page.locator('#timelineList')).toContainText('Edge ML API connected');

    await page.locator('#inputCycle').fill('115');
    await page.locator('#inputVoltage').fill('3.85');
    await page.locator('#inputCurrent').fill('2.05');
    await page.locator('#inputTemp').fill('28.5');
    await page.locator('#btnRunDiag').click();

    await waitForDiagnosticCompletion(page);

    expect(predictPayload).toEqual({
      cycle: 115,
      voltage_avg: 3.85,
      current_avg: 2.05,
      temp_max: 28.5,
      chemistry: 'NMC',
    });
    await expect(page.locator('#kpiSohVal')).toContainText('88.4%');
    await expect(page.locator('#valRes')).toHaveText('29.5 mΩ');
    await expect(page.locator('#xaiCycleVal')).toHaveText('70%');
  });

  test('TC04: Preset button Standard Drive (#presetSafe) triggers animation and renders healthy state', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    await page.locator('#presetSafe').click();

    await expect(page.locator('#presetSafe')).toHaveClass(/active/);
    await expect(page.locator('#inputCycle')).toHaveValue('80');
    await expect(page.locator('#inputVoltage')).toHaveValue('3.92');
    await expect(page.locator('#inputCurrent')).toHaveValue('1.8');
    await expect(page.locator('#inputTemp')).toHaveValue('27');
    await expect(page.locator('#inputChemistry')).toHaveValue('NMC');

    // Progress animation locks submit button while analyzing
    await expect(page.locator('#btnRunDiag')).toBeDisabled();
    await expect(page.locator('#btnDiagText')).toHaveText('Analyzing...');
    await expect(page.locator('#diagProgressWrap')).toBeVisible();

    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#btnDiagText')).toHaveText('RUN AI DIAGNOSTIC');
    await expect(page.locator('#footerLastUpdate')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    await expect(page.locator('#kpiSohVal')).toContainText('92.0%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('GOOD');
    await expect(page.locator('#safetyMainLabel')).toHaveText('NORMAL');
    await expect(page.locator('#relayTag')).toHaveText('ARMED · CLOSED');
    await expect(page.locator('#slGradeValue')).toHaveText('A');
  });

  test('TC05: Preset button High Temp Drive (#presetHeat) enters elevated thermal warning state', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    await page.locator('#presetHeat').click();
    await expect(page.locator('#presetHeat')).toHaveClass(/active/);
    await expect(page.locator('#presetSafe')).not.toHaveClass(/active/);

    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#kpiSohVal')).toContainText('79.4%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('WARNING');
    await expect(page.locator('#safetyMainLabel')).toHaveText('WARNING');
    await expect(page.locator('#thermalStatusText')).toHaveText('WARNING');
    await expect(page.locator('#thermalProtStatus')).toHaveText('MONITORING');
    await expect(page.locator('#relayTag')).toHaveText('ARMED · CLOSED');
    await expect(page.locator('#diagStatusLabel')).toHaveText('ELEVATED THERMAL STRESS');
    await expect(page.locator('#slGradeValue')).toHaveText('B');
  });

  test('TC06: Preset button 2nd-Life Solar (#presetSolar) switches chemistry to LFP and updates pack telemetry', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    await page.locator('#presetSolar').click();
    await expect(page.locator('#presetSolar')).toHaveClass(/active/);
    await expect(page.locator('#inputChemistry')).toHaveValue('LFP');
    await expect(page.locator('#activeChemLabel')).toHaveText('LFP');

    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#headerCycleCount')).toHaveText('310');
    await expect(page.locator('#packSubtitle')).toHaveText('LFP • 310 Cycles • 6S4P • 24 Cells');
    await expect(page.locator('#kpiSohVal')).toContainText('84.5%');
    await expect(page.locator('#kpiRulCycles')).toHaveText('100 cycles to 80% EoL');
  });

  test('TC07: Preset button Thermal Stress (#presetRunaway) trips safety relay and marks all 24 cells critical', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    await page.locator('#presetRunaway').click();
    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#safetyMainLabel')).toHaveText('CRITICAL');
    await expect(page.locator('#relayTag')).toHaveText('TRIPPED · OPEN');
    await expect(page.locator('#relayTag')).toHaveClass(/tripped/);
    await expect(page.locator('#thermalProtStatus')).toHaveText('TRIPPED');
    await expect(page.locator('#thermalStatusText')).toHaveText('CRITICAL');
    await expect(page.locator('#diagStatusLabel')).toHaveText('CRITICAL THERMAL ALERT');
    await expect(page.locator('#packThermalStatus')).toHaveText('CRITICAL');

    await expect(page.locator('#cellGrid .battery-cell.cell-critical')).toHaveCount(24);
  });

  test('TC08: NMC vs LFP chemistry switching and manual form submission update Second-Life Grade B and Grade C', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    // Immediate header chemistry label update on select change
    await page.locator('#inputChemistry').selectOption('LFP');
    await expect(page.locator('#activeChemLabel')).toHaveText('LFP');

    // Cycle 450, LFP -> 77.5% SoH -> Grade B (WARNING)
    await page.locator('#inputCycle').fill('450');
    await page.locator('#inputVoltage').fill('3.65');
    await page.locator('#inputCurrent').fill('1.60');
    await page.locator('#inputTemp').fill('29.0');
    await page.locator('#btnRunDiag').click();
    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#kpiSohVal')).toContainText('77.5%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('WARNING');
    await expect(page.locator('#slGradeValue')).toHaveText('B');
    await expect(page.locator('#secondLifeGrade')).toHaveText('Solar Storage / Microgrid');

    // Same cycle 450 switched to NMC -> 55.0% SoH -> Grade C (CRITICAL)
    await page.locator('#inputChemistry').selectOption('NMC');
    await expect(page.locator('#activeChemLabel')).toHaveText('NMC');
    await page.locator('#btnRunDiag').click();
    await waitForDiagnosticCompletion(page);

    await expect(page.locator('#kpiSohVal')).toContainText('55.0%');
    await expect(page.locator('#kpiSohBadge')).toHaveText('CRITICAL');
    await expect(page.locator('#slGradeValue')).toHaveText('C');
    await expect(page.locator('#secondLifeGrade')).toHaveText('Hydrometallurgical Recycling');

    // Diagnostic timeline caps at 8 entries
    await expect(page.locator('#timelineList .timeline-item')).toHaveCount(8);
  });

  test('TC09: Chart.js canvas renders with non-zero dimensions and updates datasets on prediction', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    const canvas = page.locator('#trendChart');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(100);

    const initialChartData = await page.evaluate(() => {
      const chart = window.Chart.getChart('trendChart');
      return {
        labels: [...chart.data.labels],
        historical: [...chart.data.datasets[0].data],
        predicted: [...chart.data.datasets[1].data],
        eol: [...chart.data.datasets[2].data],
      };
    });

    expect(initialChartData.labels).toEqual([0, 50, 100, 120, 170, 220, 270]);
    expect(initialChartData.eol.every((v) => v === 80)).toBe(true);

    // Switch to LFP at cycle 250 and submit
    await page.locator('#inputChemistry').selectOption('LFP');
    await page.locator('#inputCycle').fill('250');
    await page.locator('#inputTemp').fill('29.0');
    await page.locator('#btnRunDiag').click();
    await waitForDiagnosticCompletion(page);

    const updatedChartData = await page.evaluate(() => {
      const chart = window.Chart.getChart('trendChart');
      return {
        labels: [...chart.data.labels],
        historical: [...chart.data.datasets[0].data],
        predicted: [...chart.data.datasets[1].data],
        eol: [...chart.data.datasets[2].data],
      };
    });

    expect(updatedChartData.labels).toEqual([0, 50, 100, 150, 200, 250, 300, 350, 400]);
    // Historical ends at cycle 250 (idx 5) = 87.5%, prediction bridges from idx 5 -> idx 8
    expect(updatedChartData.historical[5]).toBe(87.5);
    expect(updatedChartData.historical[6]).toBeNull();
    expect(updatedChartData.predicted[5]).toBe(87.5);
    expect(updatedChartData.predicted[8]).toBe(80);
    await expect(page.locator('#currentCycleMarker')).toHaveText('Current: Cycle 250 — 87.5% SoH');
  });

  test('TC10: Cell Detail Modal accessibility/interactions and mobile responsive layout', async ({ page }) => {
    await mockApiOffline(page);
    await page.goto('/');

    const overlay = page.locator('#cellModalOverlay');
    await expect(overlay).toBeHidden();
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');

    // Open Cell 01 via click and close with Escape key
    await page.locator('#cellGrid .battery-cell[data-cell-num="01"]').click();
    await expect(overlay).toBeVisible();
    await expect(page.locator('#cellModalTitle')).toHaveText('CELL 01');
    await expect(page.locator('#cmVoltage')).toHaveText(/\d+\.\d{2} V/);
    await expect(page.locator('#cmTemp')).toHaveText(/\d+(\.\d)? °C/);
    await expect(page.locator('#cmRes')).toHaveText(/\d+(\.\d)? mΩ/);
    await expect(page.locator('#cmSoh')).toHaveText(/\d+(\.\d)?%/);
    await expect(page.locator('#cmCycles')).toHaveText('120');

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();

    // Open Cell 12 via keyboard Enter (accessibility) and close via Close button
    const cell12 = page.locator('#cellGrid .battery-cell[data-cell-num="12"]');
    await cell12.focus();
    await page.keyboard.press('Enter');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#cellModalTitle')).toHaveText('CELL 12');

    await page.locator('#cellModalClose').click();
    await expect(overlay).toBeHidden();

    // Open Cell 24 and close by clicking backdrop overlay
    await page.locator('#cellGrid .battery-cell[data-cell-num="24"]').click();
    await expect(overlay).toBeVisible();
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).toBeHidden();

    // Verify mobile responsive layout (390x844 triggers <= 480px breakpoint)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('.brand-subtitle')).toBeHidden();
    await expect(page.locator('.header-stat').first()).toBeHidden();
    await expect(page.locator('#predictionForm')).toBeVisible();
    await expect(page.locator('#cellGrid')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

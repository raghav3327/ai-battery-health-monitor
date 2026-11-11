import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const HTML_PATH = path.join(ROOT_DIR, 'dashboard', 'index.html');
const JS_PATH = path.join(ROOT_DIR, 'dashboard', 'js', 'main.js');

function createMockElement(tagName = 'div', id = '') {
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    className: '',
    textContent: '',
    innerHTML: '',
    value: '',
    disabled: false,
    dataset: {},
    style: {},
    children: [],
    attributes: {},
    listeners: {},
    classList: {
      add(...cls) {
        const current = new Set(el.className.split(/\s+/).filter(Boolean));
        cls.forEach((c) => current.add(c));
        el.className = [...current].join(' ');
      },
      remove(...cls) {
        const current = new Set(el.className.split(/\s+/).filter(Boolean));
        cls.forEach((c) => current.delete(c));
        el.className = [...current].join(' ');
      },
    },
    get firstChild() {
      return el.children[0] || null;
    },
    get lastChild() {
      return el.children[el.children.length - 1] || null;
    },
    setAttribute(name, val) {
      el.attributes[name] = String(val);
    },
    addEventListener(type, fn) {
      el.listeners[type] = el.listeners[type] || [];
      el.listeners[type].push(fn);
    },
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    insertBefore(newNode, refNode) {
      const idx = el.children.indexOf(refNode);
      if (idx === -1) el.children.unshift(newNode);
      else el.children.splice(idx, 0, newNode);
      return newNode;
    },
    removeChild(child) {
      const idx = el.children.indexOf(child);
      if (idx !== -1) el.children.splice(idx, 1);
      return child;
    },
    querySelector(selector) {
      if (selector.startsWith('.')) {
        const target = selector.slice(1);
        return el.children.find((c) => c.className.split(/\s+/).includes(target)) || null;
      }
      return null;
    },
    getContext() {
      return {};
    },
  };
  return el;
}

function loadDashboardSandbox() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const js = fs.readFileSync(JS_PATH, 'utf8');

  const elementsById = new Map();
  for (const match of html.matchAll(/id=["']([^"']+)["']/g)) {
    elementsById.set(match[1], createMockElement('div', match[1]));
  }

  const extraBySelector = new Map([
    ['.diagnosis-message', createMockElement('p')],
    ['.sl-grade-display', createMockElement('div')],
  ]);

  const doc = {
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(selector) {
      return extraBySelector.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.battery-cell') {
        const grid = elementsById.get('cellGrid');
        return grid ? grid.children : [];
      }
      return [];
    },
    createElement(tag) {
      return createMockElement(tag);
    },
    addEventListener() {},
  };

  class MockChart {
    constructor(_ctx, config) {
      this.data = config.data;
      this.options = config.options;
    }
    update() {}
  }

  const sandbox = {
    document: doc,
    Chart: MockChart,
    AbortSignal: { timeout: () => ({}) },
    fetch: async () => {
      throw new Error('offline');
    },
    console: { log() {}, error() {} },
    setTimeout: () => 0,
    setInterval: () => 0,
    Math,
    Date,
    Number,
    String,
    parseInt,
    parseFloat,
    Infinity,
  };

  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  return { sandbox, elementsById };
}

test('all DOM IDs referenced in dashboard/js/main.js exist in dashboard/index.html', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const js = fs.readFileSync(JS_PATH, 'utf8');

  const htmlIds = new Set([...html.matchAll(/id=["']([^"']+)["']/g)].map((m) => m[1]));
  const jsIds = [...new Set([...js.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((m) => m[1]))];
  const missing = jsIds.filter((id) => !htmlIds.has(id));

  assert.ok(jsIds.length > 0, 'Expected at least one getElementById call in main.js');
  assert.deepEqual(missing, []);
});

test('runClientFallback classifies safe, heated, second-life LFP, critical NMC, and runaway states', () => {
  const { sandbox, elementsById } = loadDashboardSandbox();
  sandbox.initChart();
  sandbox.generateCellGrid();

  // Safe NMC preset
  sandbox.runClientFallback(80, 3.92, 1.8, 27.0, 'NMC');
  assert.equal(elementsById.get('kpiSohBadge').textContent, 'GOOD');
  assert.equal(elementsById.get('slGradeValue').textContent, 'A');
  assert.equal(elementsById.get('safetyMainLabel').textContent, 'NORMAL');
  assert.equal(elementsById.get('relayTag').textContent, 'ARMED · CLOSED');

  // High temperature drive preset
  sandbox.runClientFallback(190, 3.75, 2.4, 42.0, 'NMC');
  assert.equal(elementsById.get('safetyMainLabel').textContent, 'WARNING');
  assert.equal(elementsById.get('thermalStatusText').textContent, 'WARNING');

  // Second-Life LFP band (65% <= SoH < 80%: at cycle 450, LFP SoH = 77.5%)
  sandbox.runClientFallback(450, 3.65, 1.6, 29.0, 'LFP');
  assert.equal(elementsById.get('kpiSohBadge').textContent, 'WARNING');
  assert.equal(elementsById.get('slGradeValue').textContent, 'B');

  // Severe capacity fade NMC band (SoH < 65%: at cycle 450, NMC SoH = 55.0%)
  sandbox.runClientFallback(450, 3.55, 2.0, 29.0, 'NMC');
  assert.equal(elementsById.get('kpiSohBadge').textContent, 'CRITICAL');
  assert.equal(elementsById.get('slGradeValue').textContent, 'C');

  // Thermal runaway preset
  sandbox.runClientFallback(240, 3.25, 3.2, 48.0, 'NMC');
  assert.equal(elementsById.get('safetyMainLabel').textContent, 'CRITICAL');
  assert.equal(elementsById.get('relayTag').textContent, 'TRIPPED · OPEN');
  assert.equal(elementsById.get('thermalProtStatus').textContent, 'TRIPPED');
});

test('generateCellGrid builds 24 cells and updateCellGrid marks critical thermal cells', () => {
  const { sandbox, elementsById } = loadDashboardSandbox();
  sandbox.generateCellGrid();

  const cells = elementsById.get('cellGrid').children;
  assert.equal(cells.length, 24);

  sandbox.updateCellGrid(72.0, 48.0, 85.0);
  assert.ok(cells.every((c) => c.className.includes('cell-critical')));
  assert.ok(cells.every((c) => Number(c.dataset.temp) >= 20 && Number(c.dataset.temp) <= 75));
  assert.equal(elementsById.get('packThermalStatus').textContent, 'CRITICAL');
});

test('addTimelineEvent caps list length to 8 items and seededRandom is deterministic', () => {
  const { sandbox, elementsById } = loadDashboardSandbox();
  const list = elementsById.get('timelineList');

  for (let i = 1; i <= 12; i += 1) {
    sandbox.addTimelineEvent(`Event ${i}`, 'cyan');
  }

  assert.equal(list.children.length, 8);
  assert.ok(list.firstChild.innerHTML.includes('Event 12'));
  assert.equal(sandbox.seededRandom(42), sandbox.seededRandom(42));
});

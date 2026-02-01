// Simple calculator logic with keyboard support and basic input validation
// Added: theme switching (system, dark, light, ocean) with persistence.

const displayEl = document.getElementById('display');
const keysEl = document.querySelector('.keys');
const themeSelect = document.getElementById('theme-select');

let state = {
  expr: '', // current expression string (what we show and evaluate)
};

// Map visual symbols to JS operators
const symbolMap = {
  '×': '*',
  '÷': '/',
  '−': '-', // sometimes used minus symbol
  '–': '-', // en dash
};

// Helper: sanitize and normalize expression (replace visual symbols)
function normalizeExpression(input) {
  return input.split('').map(ch => symbolMap[ch] || ch).join('');
}

// Allowed characters for evaluation
const allowedRE = /^[0-9+\-*/%.()\s]+$/;

// Update display (shows '0' if empty)
function updateDisplay() {
  displayEl.textContent = state.expr || '0';
}

// Append a value (digit/operator/dot)
function appendValue(val) {
  // map × ÷ to * /
  if (val in symbolMap) val = symbolMap[val];

  // Prevent multiple leading zeros like "00" (but allow "0." or "10")
  if (state.expr === '0' && /^[0-9]$/.test(val)) {
    state.expr = val;
  } else {
    state.expr += val;
  }
  updateDisplay();
}

// Clear everything
function clearAll() {
  state.expr = '';
  updateDisplay();
  displayEl.classList.remove('error');
}

// Delete last character
function deleteLast() {
  state.expr = state.expr.slice(0, -1);
  updateDisplay();
  displayEl.classList.remove('error');
}

// Toggle negate for the last number in the expression
function negateLastNumber() {
  const m = state.expr.match(/(.*?)(-?\d*\.?\d*)$/);
  if (!m) return;
  let prefix = m[1] || '';
  let last = m[2] || '';
  if (!last) {
    state.expr += '-';
  } else {
    if (last.startsWith('-')) last = last.slice(1);
    else last = '-' + last;
    state.expr = prefix + last;
  }
  updateDisplay();
}

// Percent: convert the last number to percent (number / 100)
function percentLastNumber() {
  const m = state.expr.match(/(.*?)(-?\d*\.?\d*)$/);
  if (!m) return;
  let prefix = m[1] || '';
  let last = m[2] || '';
  if (!last) return;
  const num = parseFloat(last);
  if (isNaN(num)) return;
  const pct = (num / 100).toString();
  state.expr = prefix + pct;
  updateDisplay();
}

// Evaluate expression safely
function calculate() {
  if (!state.expr) return;
  const expr = normalizeExpression(state.expr);

  // Basic allowed characters check
  if (!allowedRE.test(expr)) {
    showError('Invalid characters');
    return;
  }

  // Prevent expressions like multiple trailing operators (optional)
  const safeExpr = expr.replace(/[^0-9.)]$/, '');

  try {
    const result = Function(`"use strict"; return (${safeExpr})`)();
    if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
      showError('Math error');
      return;
    }
    state.expr = formatResult(result);
    updateDisplay();
  } catch (err) {
    showError('Error');
  }
}

function formatResult(n) {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(10)).toString();
}

function showError(msg) {
  displayEl.textContent = msg;
  displayEl.classList.add('error');
  setTimeout(() => {
    displayEl.classList.remove('error');
    state.expr = '';
    updateDisplay();
  }, 900);
}

/* Button click handling */
keysEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const val = btn.getAttribute('data-value');
  const action = btn.getAttribute('data-action');

  if (val !== null) {
    appendValue(val);
    return;
  }

  switch(action) {
    case 'clear': clearAll(); break;
    case 'delete': deleteLast(); break;
    case 'negate': negateLastNumber(); break;
    case 'percent': percentLastNumber(); break;
    case 'calculate': calculate(); break;
  }
});

/* Keyboard support */
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); calculate(); return; }
  if (e.key === 'Backspace') { e.preventDefault(); deleteLast(); return; }
  if (e.key === 'Escape') { e.preventDefault(); clearAll(); return; }

  const keyMap = {
    '/': '/', '*': '*', '+': '+', '-': '-', '.': '.',
    '%': '%', '(': '(', ')': ')'
  };

  if (keyMap[e.key]) {
    appendValue(keyMap[e.key]);
    e.preventDefault();
    return;
  }

  if (/^[0-9]$/.test(e.key)) {
    appendValue(e.key);
    e.preventDefault();
    return;
  }

  if (e.code && e.code.startsWith('Numpad')) {
    if (e.code === 'NumpadDecimal') { appendValue('.'); e.preventDefault(); return; }
    const num = e.key;
    if (/^[0-9]$/.test(num)) { appendValue(num); e.preventDefault(); return; }
  }

  if (e.key === '×') { appendValue('*'); e.preventDefault(); return; }
  if (e.key === '÷') { appendValue('/'); e.preventDefault(); return; }
});

/* Initialize calculator display */
clearAll();
updateDisplay();

/* THEME SWITCHER */

// theme values: 'system' | 'dark' | 'light' | 'ocean'
const THEME_KEY = 'calc_theme';
let systemMedia = window.matchMedia('(prefers-color-scheme: light)');
let currentSavedTheme = localStorage.getItem(THEME_KEY) || 'system';

function applyTheme(theme) {
  // If 'system', choose based on prefers-color-scheme
  if (theme === 'system') {
    const useLight = systemMedia.matches;
    document.documentElement.setAttribute('data-theme', useLight ? 'light' : 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function initTheme() {
  // Set selector value
  themeSelect.value = currentSavedTheme;

  applyTheme(currentSavedTheme);

  // If system is chosen, listen for changes
  if (currentSavedTheme === 'system') {
    systemMedia.addEventListener('change', handleSystemChange);
  }
}

function handleSystemChange(e) {
  if (localStorage.getItem(THEME_KEY) === 'system') {
    applyTheme('system');
  }
}

themeSelect.addEventListener('change', (e) => {
  const val = e.target.value;
  // remove existing listener if present
  systemMedia.removeEventListener('change', handleSystemChange);

  if (val === 'system') {
    systemMedia.addEventListener('change', handleSystemChange);
  }

  localStorage.setItem(THEME_KEY, val);
  applyTheme(val);
});

// initialize
initTheme();
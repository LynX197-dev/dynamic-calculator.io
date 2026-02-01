// Simple + Scientific calculator logic with keyboard support and basic input validation
// Features: scientific panel (toggle), degree/radian mode, many scientific functions
// Persistence: theme stored in localStorage; degree/radian mode stored in session

const displayEl = document.getElementById("display");
const keysEl = document.querySelector(".keys");
const themeSelect = document.getElementById("theme-select");

const sciToggleBtn = document.getElementById("sci-toggle");
const sciPanel = document.getElementById("scientific");
const degToggleBtn = document.getElementById("deg-toggle");

let state = {
  expr: "", // current expression string (what we show and evaluate)
};

// Degree/radian state (persisted to sessionStorage)
const ANGLE_KEY = "calc_angle_mode"; // 'deg' or 'rad'
let angleMode = sessionStorage.getItem(ANGLE_KEY) || "deg";
updateDegToggleUI();

// Map visual symbols to JS operators
const symbolMap = {
  "×": "*",
  "÷": "/",
  "−": "-", // sometimes used minus symbol
  "–": "-", // en dash
};

// Helper: sanitize and normalize expression (replace visual symbols and caret)
function normalizeExpression(input) {
  // replace visual symbols
  let s = input
    .split("")
    .map((ch) => symbolMap[ch] || ch)
    .join("");
  // replace caret '^' with JS power operator '**'
  s = s.replace(/\^/g, "**");
  return s;
}

// Allowed characters for evaluation (digits, operators, parentheses, decimal, whitespace)
// We allow '^' which we convert to '**'. We don't allow raw letters in final expression
const allowedRE = /^[0-9+\-*/%^().\s]+$/;

// Update display (shows '0' if empty)
function updateDisplay() {
  displayEl.textContent = state.expr || "0";
}

// Append a value (digit/operator/dot)
function appendValue(val) {
  // direct mapping for visual operators
  if (val in symbolMap) val = symbolMap[val];

  if (state.expr === "0" && /^[0-9]$/.test(val)) {
    state.expr = val;
  } else {
    state.expr += val;
  }
  updateDisplay();
}

// Clear everything
function clearAll() {
  state.expr = "";
  updateDisplay();
  displayEl.classList.remove("error");
}

// Delete last character
function deleteLast() {
  state.expr = state.expr.slice(0, -1);
  updateDisplay();
  displayEl.classList.remove("error");
}

// Toggle negate for the last number in the expression (works for scientific too)
function negateLastNumber() {
  const m = state.expr.match(/(.*?)(-?\d*\.?\d*)$/);
  if (!m) return;
  let prefix = m[1] || "";
  let last = m[2] || "";
  if (!last) {
    state.expr += "-";
  } else {
    if (last.startsWith("-")) last = last.slice(1);
    else last = "-" + last;
    state.expr = prefix + last;
  }
  updateDisplay();
}

// Percent: convert the last number to percent (number / 100)
function percentLastNumber() {
  const m = state.expr.match(/(.*?)(-?\d*\.?\d*)$/);
  if (!m) return;
  let prefix = m[1] || "";
  let last = m[2] || "";
  if (!last) return;
  const num = parseFloat(last);
  if (isNaN(num)) return;
  const pct = (num / 100).toString();
  state.expr = prefix + pct;
  updateDisplay();
}

// Apply a scientific function to the last number (or perform special actions)
function applySciFunction(fn) {
  // helper find last numeric token or treat empty expression as 0
  const m = state.expr.match(/(.*?)(-?\d*\.?\d*)$/);
  let prefix = (m ? m[1] : "") || "";
  let last = (m ? m[2] : "") || "";

  // utility to replace last token
  function replaceLast(repl) {
    state.expr = prefix + repl;
    updateDisplay();
  }

  // If function should insert a symbol rather than evaluate on last number
  // e.g., x^y: append caret so user can enter exponent
  if (fn === "pow") {
    // append caret operator for exponentiation
    // only append if expression doesn't end with operator
    if (state.expr === "" || /[+\-*/^.(]$/.test(state.expr)) {
      // append " ( ) " to guide user if needed; we'll just append "^"
      state.expr += "^";
    } else {
      state.expr += "^";
    }
    updateDisplay();
    return;
  }

  if (fn === "pi") {
    replaceLast(Math.PI.toString());
    return;
  }
  if (fn === "e") {
    replaceLast(Math.E.toString());
    return;
  }
  if (fn === "percent") {
    percentLastNumber();
    return;
  }
  if (fn === "negate") {
    negateLastNumber();
    return;
  }

  // if there's no number to apply to, do nothing (except for some functions that act on 0)
  if (!last) {
    // many functions can act on 0 by appending "0" then applying, but keep behavior minimal
    return;
  }

  const num = parseFloat(last);
  if (isNaN(num)) return;

  // angle conversion helpers
  const toRad = (x) => (angleMode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (angleMode === "deg" ? (x * 180) / Math.PI : x);

  let result;
  switch (fn) {
    case "sin":
      result = Math.sin(toRad(num));
      break;
    case "cos":
      result = Math.cos(toRad(num));
      break;
    case "tan":
      result = Math.tan(toRad(num));
      break;
    case "asin":
      result = fromRad(Math.asin(num));
      break;
    case "acos":
      result = fromRad(Math.acos(num));
      break;
    case "atan":
      result = fromRad(Math.atan(num));
      break;
    case "ln":
      result = Math.log(num);
      break;
    case "log10":
      result = Math.log10 ? Math.log10(num) : Math.log(num) / Math.LN10;
      break;
    case "sqrt":
      result = Math.sqrt(num);
      break;
    case "pow2":
      result = Math.pow(num, 2);
      break;
    case "pow3":
      result = Math.pow(num, 3);
      break;
    case "exp":
      result = Math.exp(num);
      break;
    case "abs":
      result = Math.abs(num);
      break;
    case "reciprocal":
      if (num === 0) {
        showError("Math error");
        return;
      }
      result = 1 / num;
      break;
    case "factorial":
      if (num < 0 || !Number.isInteger(num)) {
        showError("Invalid");
        return;
      }
      result = factorial(num);
      break;
    default:
      return;
  }

  if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
    showError("Math error");
    return;
  }

  // format and replace
  replaceLast(formatResult(result));
}

function factorial(n) {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Evaluate expression safely
function calculate() {
  if (!state.expr) return;
  const exprRaw = normalizeExpression(state.expr);

  // Disallow letters or unexpected chars (we only allow digits/operators/parentheses/decimal and '**' after normalization)
  if (!allowedRE.test(exprRaw)) {
    showError("Invalid characters");
    return;
  }

  // Prevent expressions ending in an unresolved operator like '2+'
  const safeExpr = exprRaw.replace(/[*+\-\/^%]$/, "");

  try {
    // Evaluate using Function; because we validated allowed characters and replaced caret,
    // we avoid injecting names. Note: In production, use a proper math parser.
    const result = Function(`"use strict"; return (${safeExpr})`)();
    if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
      showError("Math error");
      return;
    }
    state.expr = formatResult(result);
    updateDisplay();
  } catch (err) {
    showError("Error");
  }
}

function formatResult(n) {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(12)).toString();
}

function showError(msg) {
  displayEl.textContent = msg;
  displayEl.classList.add("error");
  setTimeout(() => {
    displayEl.classList.remove("error");
    state.expr = "";
    updateDisplay();
  }, 900);
}

/* Button click handling */
keysEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const val = btn.getAttribute("data-value");
  const action = btn.getAttribute("data-action");

  if (val !== null) {
    appendValue(val);
    return;
  }

  switch (action) {
    case "clear":
      clearAll();
      break;
    case "delete":
      deleteLast();
      break;
    case "negate":
      negateLastNumber();
      break;
    case "percent":
      percentLastNumber();
      break;
    case "calculate":
      calculate();
      break;
  }
});

/* Scientific panel handling */
sciToggleBtn.addEventListener("click", () => {
  const showing = sciPanel.classList.toggle("show");
  sciToggleBtn.setAttribute("aria-pressed", showing ? "true" : "false");
  sciPanel.setAttribute("aria-hidden", showing ? "false" : "true");
});

sciPanel.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const fn = btn.getAttribute("data-fn");
  if (!fn) return;
  applySciFunction(fn);
});

/* Degree/Radian toggle */
degToggleBtn.addEventListener("click", () => {
  angleMode = angleMode === "deg" ? "rad" : "deg";
  sessionStorage.setItem(ANGLE_KEY, angleMode);
  updateDegToggleUI();
});
function updateDegToggleUI() {
  const isDeg = angleMode === "deg";
  degToggleBtn.setAttribute("aria-pressed", isDeg ? "true" : "false");
  degToggleBtn.textContent = isDeg ? "deg" : "rad";
}

/* Keyboard support */
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    calculate();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    deleteLast();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    clearAll();
    return;
  }

  const keyMap = {
    "/": "/",
    "*": "*",
    "+": "+",
    "-": "-",
    ".": ".",
    "%": "%",
    "(": "(",
    ")": ")",
    "^": "^",
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

  if (e.code && e.code.startsWith("Numpad")) {
    if (e.code === "NumpadDecimal") {
      appendValue(".");
      e.preventDefault();
      return;
    }
    const num = e.key;
    if (/^[0-9]$/.test(num)) {
      appendValue(num);
      e.preventDefault();
      return;
    }
  }

  if (e.key === "×") {
    appendValue("*");
    e.preventDefault();
    return;
  }
  if (e.key === "÷") {
    appendValue("/");
    e.preventDefault();
    return;
  }
});

/* Initialize calculator display and theme */
clearAll();
updateDisplay();

/* THEME SWITCHER (unchanged from prior) */

// theme values: 'system' | 'dark' | 'light' | 'ocean'
const THEME_KEY = "calc_theme";
let systemMedia = window.matchMedia("(prefers-color-scheme: light)");
let currentSavedTheme = localStorage.getItem(THEME_KEY) || "system";

function applyTheme(theme) {
  if (theme === "system") {
    const useLight = systemMedia.matches;
    document.documentElement.setAttribute(
      "data-theme",
      useLight ? "light" : "dark",
    );
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function initTheme() {
  themeSelect.value = currentSavedTheme;
  applyTheme(currentSavedTheme);
  if (currentSavedTheme === "system") {
    systemMedia.addEventListener("change", handleSystemChange);
  }
}

function handleSystemChange(e) {
  if (localStorage.getItem(THEME_KEY) === "system") {
    applyTheme("system");
  }
}

themeSelect.addEventListener("change", (e) => {
  const val = e.target.value;
  systemMedia.removeEventListener("change", handleSystemChange);
  if (val === "system") {
    systemMedia.addEventListener("change", handleSystemChange);
  }
  localStorage.setItem(THEME_KEY, val);
  applyTheme(val);
});

initTheme();

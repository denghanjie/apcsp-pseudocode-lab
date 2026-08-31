import { runProgramAsync } from "./interpreter.js";
import { EXAMPLES, getExample } from "./examples.js";
import {
  COLLEGE_BOARD_SOURCES,
  COURSE_EXAM_FACTS,
  DISCLAIMER,
  REFERENCE_CATEGORIES,
  RUNNER_CONVENIENCES,
} from "./reference.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  appShell: $(".app-shell"),
  aboutButton: $("#about-button"),
  aboutClose: $("#about-close"),
  aboutContent: $("#about-content"),
  aboutDialog: $("#about-dialog"),
  appStatus: $("#app-status"),
  clearInputButton: $("#clear-input-button"),
  codeEditor: $("#code-editor"),
  codeHighlight: $("#code-highlight"),
  consoleEmpty: $("#console-empty"),
  consoleOutput: $("#console-output"),
  consolePanel: $("#console-panel"),
  consoleTab: $("#console-tab"),
  copyOutputButton: $("#copy-output-button"),
  cursorPosition: $("#cursor-position"),
  drawerScrim: $("#drawer-scrim"),
  examplesClose: $("#examples-close"),
  examplesList: $("#examples-list"),
  examplesRail: $("#examples-rail"),
  examplesToggle: $("#examples-toggle"),
  inputDialog: $("#input-dialog"),
  inputForm: $("#input-form"),
  inputQueue: $("#input-queue"),
  lineCount: $("#line-count"),
  lineNumbers: $("#line-numbers"),
  readyDot: $("#ready-dot"),
  referenceButton: $("#reference-button"),
  referenceCategories: $("#reference-categories"),
  referenceClose: $("#reference-close"),
  referenceDrawer: $("#reference-drawer"),
  referenceFooterClose: $("#reference-footer-close"),
  referenceResults: $("#reference-results"),
  referenceSearch: $("#reference-search"),
  resetButton: $("#reset-button"),
  resetRobotButton: $("#reset-robot-button"),
  robotGrid: $("#robot-grid"),
  robotPanel: $("#robot-panel"),
  robotPosition: $("#robot-position"),
  robotTab: $("#robot-tab"),
  runBanner: $("#run-banner"),
  runButton: $("#run-button"),
  runMessage: $("#run-message"),
  runtimeInput: $("#runtime-input"),
  stepBadge: $("#step-badge"),
  stopButton: $("#stop-button"),
  summaryInputs: $("#summary-inputs"),
  summaryOutput: $("#summary-output"),
  summaryStatus: $("#summary-status"),
  summarySteps: $("#summary-steps"),
  summaryTime: $("#summary-time"),
  syntaxHelp: $("#syntax-help"),
  themeButton: $("#theme-button"),
  themeLabel: $("#theme-label"),
  toast: $("#toast"),
};

const STORAGE_KEY = "pseudocode-lab:v1";
const DEFAULT_ROBOT = Object.freeze({
  rows: 5,
  columns: 5,
  start: Object.freeze({ row: 4, column: 2, direction: "north" }),
  blocked: Object.freeze([{ row: 3, column: 2 }]),
});

const state = {
  selectedExampleId: EXAMPLES[0].id,
  drafts: new Map(),
  currentOutput: "",
  currentResult: null,
  selectedReferenceId: "lists",
  abortController: null,
  running: false,
  lastFocus: null,
  toastTimer: null,
  robotConfig: DEFAULT_ROBOT,
  robotSnapshot: { ...DEFAULT_ROBOT.start },
  robotTrace: [],
};

const ICONS = Object.freeze({
  "first-program": '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 3h11l6 6v20H8V3Z"/><path d="M19 3v7h7M13 15l7 4-7 4v-8Z"/></svg>',
  conditionals: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="5" r="3"/><circle cx="7" cy="25" r="3"/><circle cx="25" cy="25" r="3"/><path d="M16 8v6M7 22v-3c0-3 2-5 5-5h8c3 0 5 2 5 5v3"/></svg>',
  loops: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 10A11 11 0 0 0 7 7l-2 3M6 22a11 11 0 0 0 19 3l2-3"/><path d="M5 4v6h6M27 28v-6h-6"/></svg>',
  lists: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="6" cy="8" r="1.5"/><circle cx="6" cy="16" r="1.5"/><circle cx="6" cy="24" r="1.5"/><path d="M12 8h14M12 16h14M12 24h14"/></svg>',
  procedures: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 4H8v8H4M21 4h3v8h4M11 28H8v-8H4M21 28h3v-8h4"/><path d="M16 8v16M12 12l4-4 4 4M12 20l4 4 4-4"/></svg>',
  robot: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="9" width="22" height="17" rx="5"/><path d="M16 9V5M13 5h6M10 26v3M22 26v3"/><circle cx="11" cy="17" r="2"/><circle cx="21" cy="17" r="2"/><path d="M11 22h10"/></svg>',
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightCode(source) {
  const tokenPattern = /"(?:\\.|[^"\\])*"|\/\/.*$|\b(?:PROCEDURE|RETURN|IF|ELSE|REPEAT|UNTIL|TIMES|FOR|EACH|IN|NOT|AND|OR|MOD|true|false)\b|\b(?:DISPLAY|INPUT|RANDOM|LENGTH|INSERT|APPEND|REMOVE|MOVE_FORWARD|ROTATE_LEFT|ROTATE_RIGHT|CAN_MOVE)\b|(?:←|≠|≥|≤|<-|!=|>=|<=|[+\-*\/=<>])|\b\d+(?:\.\d+)?\b/gm;
  let cursor = 0;
  let html = "";
  for (const match of source.matchAll(tokenPattern)) {
    html += escapeHtml(source.slice(cursor, match.index));
    const token = match[0];
    let className = "tok-operator";
    if (token.startsWith("//")) className = "tok-comment";
    else if (token.startsWith('"')) className = "tok-string";
    else if (/^\d/.test(token)) className = "tok-number";
    else if (/^(DISPLAY|INPUT|RANDOM|LENGTH|INSERT|APPEND|REMOVE|MOVE_FORWARD|ROTATE_LEFT|ROTATE_RIGHT|CAN_MOVE)$/.test(token)) className = "tok-builtin";
    else if (/^[A-Za-z_]+$/.test(token)) className = "tok-keyword";
    html += `<span class="${className}">${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }
  html += escapeHtml(source.slice(cursor));
  return `${html}\n`;
}

function updateEditorChrome() {
  const source = elements.codeEditor.value;
  const lines = source.split("\n").length;
  elements.codeHighlight.innerHTML = highlightCode(source);
  elements.lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
  elements.lineCount.textContent = `${lines} ${lines === 1 ? "line" : "lines"}`;
  updateCursorPosition();
  syncEditorScroll();
}

function updateCursorPosition() {
  const value = elements.codeEditor.value;
  const position = elements.codeEditor.selectionStart;
  const prior = value.slice(0, position);
  const line = prior.split("\n").length;
  const lineStart = prior.lastIndexOf("\n") + 1;
  const column = position - lineStart + 1;
  elements.cursorPosition.textContent = `Line ${line}, Column ${column}`;
}

function syncEditorScroll() {
  elements.codeHighlight.scrollTop = elements.codeEditor.scrollTop;
  elements.codeHighlight.scrollLeft = elements.codeEditor.scrollLeft;
  elements.lineNumbers.scrollTop = elements.codeEditor.scrollTop;
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedExampleId: state.selectedExampleId,
      theme: document.documentElement.dataset.theme,
      drafts: Object.fromEntries(state.drafts),
      code: elements.codeEditor.value,
      input: elements.inputQueue.value,
    }));
  } catch {
    // Storage is optional; the standalone runner must still work without it.
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return;
    if (getExample(saved.selectedExampleId)) state.selectedExampleId = saved.selectedExampleId;
    if (saved.drafts && typeof saved.drafts === "object") {
      for (const [id, draft] of Object.entries(saved.drafts)) {
        if (getExample(id) && typeof draft === "string") state.drafts.set(id, draft);
      }
    }
    if (saved.theme === "dark" || saved.theme === "light") setTheme(saved.theme, false);
    if (typeof saved.code === "string") state.drafts.set(state.selectedExampleId, saved.code);
    if (typeof saved.input === "string") elements.inputQueue.dataset.restoredValue = saved.input;
  } catch {
    // Ignore malformed or blocked storage.
  }
}

function renderExamples() {
  elements.examplesList.replaceChildren();
  for (const example of EXAMPLES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.exampleId = example.id;
    button.setAttribute("aria-current", String(example.id === state.selectedExampleId));
    button.title = example.summary;
    button.innerHTML = `<span class="example-icon">${ICONS[example.id]}</span><span class="example-label">${escapeHtml(example.name)}</span>`;
    button.addEventListener("click", () => selectExample(example.id));
    elements.examplesList.append(button);
  }
}

function selectExample(id) {
  const example = getExample(id);
  if (!example) return;
  state.drafts.set(state.selectedExampleId, elements.codeEditor.value);
  state.selectedExampleId = id;
  elements.codeEditor.value = state.drafts.get(id) ?? example.code;
  elements.inputQueue.value = example.inputQueue.map(formatInputValue).join("\n");
  state.robotConfig = example.robot ?? DEFAULT_ROBOT;
  resetRobotView();
  renderExamples();
  updateEditorChrome();
  clearResults();
  switchResultTab(example.robot ? "robot" : "console");
  closeExamplesRail();
  persistState();
}

function formatInputValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseInputValue(rawValue) {
  const value = String(rawValue).trim();
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return Number(value);
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("[") && value.endsWith("]"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function getInputValues() {
  const raw = elements.inputQueue.value;
  if (raw === "") return [];
  return raw.split(/\r?\n/).map(parseInputValue);
}

function clearResults() {
  state.currentOutput = "";
  state.currentResult = null;
  elements.consoleOutput.replaceChildren();
  elements.consoleEmpty.hidden = false;
  elements.copyOutputButton.disabled = true;
  setRunBanner("idle", "Ready to run.", 0);
  setSummary({ status: "Idle", steps: 0, inputs: 0, output: 0, time: "—" });
  setAppStatus("Ready", "ready");
}

function setRunBanner(kind, message, steps = 0) {
  elements.runBanner.className = `run-banner banner-${kind}`;
  elements.runMessage.textContent = message;
  elements.stepBadge.textContent = `${steps.toLocaleString()} ${steps === 1 ? "step" : "steps"}`;
  const path = kind === "success"
    ? '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/>'
    : kind === "running"
      ? '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
      : kind === "error"
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
  $(".banner-icon svg", elements.runBanner).innerHTML = path;
}

function setSummary({ status, steps, inputs, output, time }) {
  elements.summaryStatus.textContent = status;
  elements.summarySteps.textContent = Number(steps || 0).toLocaleString();
  elements.summaryInputs.textContent = Number(inputs || 0).toLocaleString();
  elements.summaryOutput.textContent = Number(output || 0).toLocaleString();
  elements.summaryTime.textContent = time;
}

function setAppStatus(message, kind = "ready") {
  elements.appStatus.textContent = message;
  const color = kind === "running" ? "var(--blue)" : kind === "error" ? "var(--danger)" : "#39b85a";
  elements.readyDot.style.background = color;
}

function setRunning(running) {
  state.running = running;
  elements.runButton.disabled = running;
  elements.stopButton.disabled = !running;
  elements.resetButton.disabled = running;
  for (const button of $$("button", elements.examplesList)) button.disabled = running;
  if (running) {
    setRunBanner("running", "Running program…", 0);
    setAppStatus("Running", "running");
    elements.summaryStatus.textContent = "Running";
  }
}

function errorLocation(error) {
  const loc = error?.primaryLoc ?? error?.loc ?? error?.location;
  const start = loc?.start ?? loc;
  const line = Number(start?.line ?? error?.line ?? 0);
  const column = Number(start?.column ?? error?.column ?? 1);
  return line > 0 ? { line, column: Math.max(1, column || 1) } : null;
}

function selectSourceLocation(location) {
  if (!location) return;
  const lines = elements.codeEditor.value.split("\n");
  const line = Math.min(Math.max(1, location.line), lines.length);
  const start = lines.slice(0, line - 1).reduce((total, text) => total + text.length + 1, 0);
  const end = start + lines[line - 1].length;
  elements.codeEditor.focus();
  elements.codeEditor.setSelectionRange(start, end);
  const lineHeight = Number.parseFloat(getComputedStyle(elements.codeEditor).lineHeight) || 28;
  elements.codeEditor.scrollTop = Math.max(0, (line - 4) * lineHeight);
  syncEditorScroll();
  updateCursorPosition();
}

function renderResult(result, elapsedMs) {
  elements.consoleOutput.replaceChildren();
  state.currentResult = result;
  const wasAborted = result?.error?.code === "ABORTED";
  const rawEntries = Array.isArray(result?.outputEntries) ? result.outputEntries : [];
  const entries = rawEntries.map((entry) => {
    if (typeof entry === "string") return entry;
    return entry?.text ?? entry?.value ?? entry?.output ?? String(entry ?? "");
  });
  state.currentOutput = typeof result?.output === "string" ? result.output : entries.join("");

  for (const entry of entries) {
    const item = document.createElement("li");
    item.textContent = String(entry).replace(/ $/, "");
    elements.consoleOutput.append(item);
  }

  if (!result?.ok && !wasAborted) {
    const error = result?.error ?? { message: "The program stopped with an unknown error." };
    const location = errorLocation(error);
    const item = document.createElement("li");
    item.className = "output-error";
    item.textContent = `${location ? `Line ${location.line}: ` : ""}${error.message ?? String(error)}`;
    if (error.hint) item.textContent += ` — ${error.hint}`;
    if (location) {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.title = "Jump to source line";
      item.addEventListener("click", () => selectSourceLocation(location));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") selectSourceLocation(location);
      });
    }
    elements.consoleOutput.append(item);
  }

  elements.consoleEmpty.hidden = elements.consoleOutput.children.length > 0;
  elements.copyOutputButton.disabled = !state.currentOutput;
  const steps = result?.steps ?? 0;
  const elapsed = `${Math.max(0.1, elapsedMs).toFixed(elapsedMs >= 100 ? 0 : 1)} ms`;

  if (result?.ok) {
    setRunBanner("success", "Program completed successfully.", steps);
    setAppStatus("Ready", "ready");
  } else if (wasAborted) {
    setRunBanner("idle", "Execution stopped.", steps);
    setAppStatus("Ready", "ready");
  } else {
    setRunBanner("error", "Program stopped with an error.", steps);
    setAppStatus("Error", "error");
    switchResultTab("console");
  }

  setSummary({
    status: result?.ok ? "Completed" : wasAborted ? "Stopped" : "Error",
    steps,
    inputs: result?.inputConsumed ?? result?.inputsConsumed ?? 0,
    output: entries.length,
    time: elapsed,
  });

  if (result?.robot || result?.robotTrace) {
    state.robotSnapshot = result.robot ?? state.robotSnapshot;
    state.robotTrace = result.robotTrace ?? [];
    renderRobot(state.robotConfig, state.robotSnapshot, state.robotTrace);
  }
}

async function executeProgram() {
  if (state.running) return;
  setRunning(true);
  elements.consoleOutput.replaceChildren();
  elements.consoleEmpty.hidden = true;
  const started = performance.now();
  state.abortController = new AbortController();
  const example = getExample(state.selectedExampleId);
  state.robotConfig = example?.robot ?? DEFAULT_ROBOT;
  resetRobotView();

  try {
    const result = await runProgramAsync(elements.codeEditor.value, {
      input: getInputValues(),
      inputs: getInputValues(),
      inputQueue: getInputValues(),
      inputProvider: requestRuntimeInput,
      robot: state.robotConfig,
      robotConfig: state.robotConfig,
      maxSteps: 100_000,
      stepLimit: 100_000,
      chunkSize: 500,
      signal: state.abortController.signal,
    });
    renderResult(result, performance.now() - started);
  } catch (error) {
    if (error?.name === "AbortError" || state.abortController.signal.aborted) {
      const stoppedResult = {
        ok: false,
        output: state.currentOutput,
        outputEntries: [],
        steps: 0,
        error: { message: "Execution stopped by the user." },
      };
      renderResult(stoppedResult, performance.now() - started);
      setRunBanner("idle", "Execution stopped.", 0);
      setAppStatus("Ready", "ready");
      elements.summaryStatus.textContent = "Stopped";
    } else {
      renderResult({ ok: false, output: "", outputEntries: [], steps: 0, error }, performance.now() - started);
    }
  } finally {
    setRunning(false);
    state.abortController = null;
  }
}

function stopProgram() {
  if (!state.running || !state.abortController) return;
  state.abortController.abort();
  if (elements.inputDialog.open) elements.inputDialog.close("cancel");
  setAppStatus("Stopping…", "running");
}

function requestRuntimeInput(context = {}) {
  return new Promise((resolve, reject) => {
    if (state.abortController?.signal.aborted) {
      reject(new DOMException("Execution stopped", "AbortError"));
      return;
    }
    const location = errorLocation(context);
    $("#input-dialog-copy").textContent = location
      ? `The program requested its next value at line ${location.line}.`
      : "The program requested its next value.";
    elements.runtimeInput.value = "";
    elements.inputDialog.showModal();
    requestAnimationFrame(() => elements.runtimeInput.focus());

    const onClose = () => {
      elements.inputDialog.removeEventListener("close", onClose);
      if (elements.inputDialog.returnValue === "submit") {
        const raw = elements.runtimeInput.value;
        elements.inputQueue.value += `${elements.inputQueue.value ? "\n" : ""}${raw}`;
        resolve(parseInputValue(raw));
      } else {
        reject(new DOMException("INPUT() cancelled", "AbortError"));
      }
    };
    elements.inputDialog.addEventListener("close", onClose);
  });
}

function switchResultTab(tabName) {
  const showRobot = tabName === "robot";
  elements.consoleTab.setAttribute("aria-selected", String(!showRobot));
  elements.robotTab.setAttribute("aria-selected", String(showRobot));
  elements.consolePanel.hidden = showRobot;
  elements.robotPanel.hidden = !showRobot;
}

function resetRobotView() {
  state.robotSnapshot = { ...state.robotConfig.start };
  state.robotTrace = [{ ...state.robotConfig.start }];
  renderRobot(state.robotConfig, state.robotSnapshot, state.robotTrace);
}

function renderRobot(config, snapshot, trace = []) {
  if (!config || !snapshot) return;
  const rows = Number(config.rows ?? 5);
  const columns = Number(config.columns ?? config.cols ?? 5);
  const blocked = new Set((config.blocked ?? []).map((cell) => `${cell.row}:${cell.column ?? cell.col}`));
  const visited = new Set((trace ?? []).map((cell) => `${cell.row}:${cell.column ?? cell.col}`));
  const startKey = `${config.start.row}:${config.start.column ?? config.start.col}`;
  const robotColumn = snapshot.column ?? snapshot.col;
  const robotKey = `${snapshot.row}:${robotColumn}`;
  const direction = String(snapshot.direction ?? "north").toLowerCase();
  const angle = { north: 0, east: 90, south: 180, west: 270 }[direction] ?? 0;

  elements.robotGrid.style.setProperty("--robot-columns", columns);
  elements.robotGrid.style.setProperty("--robot-rows", rows);
  elements.robotGrid.replaceChildren();
  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const key = `${row}:${column}`;
      const cell = document.createElement("div");
      cell.className = "robot-cell";
      if (key === startKey) cell.classList.add("is-start");
      if (blocked.has(key)) cell.classList.add("is-blocked");
      if (visited.has(key) && !blocked.has(key)) cell.classList.add("is-path");
      cell.title = `Row ${row}, Column ${column}${blocked.has(key) ? " — blocked" : ""}`;
      if (key === robotKey) {
        const token = document.createElement("div");
        token.className = "robot-token";
        token.style.setProperty("--robot-angle", `${angle}deg`);
        token.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 7 14-7-3-7 3 7-14Z"/></svg>';
        cell.append(token);
      }
      elements.robotGrid.append(cell);
    }
  }
  elements.robotPosition.textContent = `Row ${snapshot.row}, Column ${robotColumn} · ${direction}`;
  elements.robotGrid.setAttribute("aria-label", `${rows} by ${columns} robot grid. Robot at row ${snapshot.row}, column ${robotColumn}, facing ${direction}.`);
}

function renderReferenceCategories() {
  elements.referenceCategories.replaceChildren();
  for (const category of REFERENCE_CATEGORIES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.categoryId = category.id;
    button.textContent = category.name;
    button.setAttribute("aria-current", String(category.id === state.selectedReferenceId));
    button.addEventListener("click", () => {
      state.selectedReferenceId = category.id;
      elements.referenceSearch.value = "";
      renderReferenceCategories();
      renderReferenceResults();
    });
    elements.referenceCategories.append(button);
  }
}

function searchableText(category, entry) {
  return [
    category.name,
    category.description,
    entry.title,
    entry.syntax,
    entry.explanation,
    ...(entry.searchTerms ?? []),
  ].join(" ").toLowerCase();
}

function createReferenceEntry(category, entry, { includeCategory = false } = {}) {
  const wrapper = document.createElement("article");
  wrapper.className = "reference-entry";
  wrapper.innerHTML = `
    <div class="reference-entry-header">
      <div>
        ${includeCategory ? `<p class="reference-category-label">${escapeHtml(category.name)}</p>` : ""}
        <code>${escapeHtml(entry.syntax)}</code>
      </div>
      <button class="copy-snippet" type="button" aria-label="Copy ${escapeHtml(entry.title)} syntax" title="Copy syntax">
        <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>
      </button>
    </div>
    <p><strong>${escapeHtml(entry.title)}.</strong> ${escapeHtml(entry.explanation)}</p>
  `;
  $(".copy-snippet", wrapper).addEventListener("click", () => copyText(entry.syntax, "Syntax copied."));
  return wrapper;
}

function renderReferenceResults() {
  const query = elements.referenceSearch.value.trim().toLowerCase();
  elements.referenceResults.replaceChildren();
  if (query) {
    const matches = [];
    for (const category of REFERENCE_CATEGORIES) {
      for (const entry of category.entries) {
        if (searchableText(category, entry).includes(query)) matches.push({ category, entry });
      }
    }
    for (const convenience of RUNNER_CONVENIENCES) {
      const haystack = [convenience.title, convenience.runnerSyntax, convenience.officialSyntax, convenience.explanation, ...(convenience.searchTerms ?? [])].join(" ").toLowerCase();
      if (haystack.includes(query)) {
        matches.push({
          category: { name: "Runner conveniences" },
          entry: { title: convenience.title, syntax: convenience.runnerSyntax, explanation: convenience.explanation },
        });
      }
    }
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "reference-empty";
      empty.textContent = `No reference entries match “${elements.referenceSearch.value.trim()}”.`;
      elements.referenceResults.append(empty);
      return;
    }
    for (const match of matches) elements.referenceResults.append(createReferenceEntry(match.category, match.entry, { includeCategory: true }));
    return;
  }

  const category = REFERENCE_CATEGORIES.find((item) => item.id === state.selectedReferenceId) ?? REFERENCE_CATEGORIES[0];
  const intro = document.createElement("div");
  intro.className = "reference-section-intro";
  intro.textContent = category.description;
  elements.referenceResults.append(intro);
  for (const entry of category.entries) elements.referenceResults.append(createReferenceEntry(category, entry));
  if (category.note) {
    const note = document.createElement("div");
    note.className = "reference-note";
    note.textContent = category.note;
    elements.referenceResults.append(note);
  }
}

function openReference() {
  state.lastFocus = document.activeElement;
  elements.referenceButton.setAttribute("aria-expanded", "true");
  elements.referenceDrawer.classList.add("is-open");
  elements.referenceDrawer.setAttribute("aria-hidden", "false");
  elements.drawerScrim.hidden = false;
  requestAnimationFrame(() => elements.drawerScrim.classList.add("is-open"));
  elements.appShell.inert = true;
  setTimeout(() => elements.referenceSearch.focus(), 180);
}

function closeReference() {
  elements.referenceButton.setAttribute("aria-expanded", "false");
  elements.referenceDrawer.classList.remove("is-open");
  elements.referenceDrawer.setAttribute("aria-hidden", "true");
  elements.drawerScrim.classList.remove("is-open");
  elements.appShell.inert = false;
  setTimeout(() => { elements.drawerScrim.hidden = true; }, 190);
  state.lastFocus?.focus?.();
}

function renderAbout() {
  const weights = [
    ["Creative Development", "10–13%", 34],
    ["Data", "17–22%", 57],
    ["Algorithms and Programming", "30–35%", 100],
    ["Computer Systems and Networks", "11–15%", 40],
    ["Impact of Computing", "21–26%", 74],
  ];
  const facts = COURSE_EXAM_FACTS.items;
  elements.aboutContent.innerHTML = `
    <p class="about-lede">Your memory is right: AP Computer Science Principles does not prescribe one classroom programming language. College Board uses a shared Exam Reference Sheet notation so algorithms and programming ideas can be assessed consistently.</p>
    <div class="about-callout"><strong>What this tool is.</strong> A browser-based implementation of the text notation in Appendix 1 of the current Course and Exam Description. It is a practice aid, not a substitute for learning a real programming language or for current official materials.</div>
    <div class="about-grid">
      <section class="about-section">
        <h3>The five big ideas</h3>
        <div class="weight-list">
          ${weights.map(([name, weight, width]) => `<div class="weight-row"><div class="weight-copy"><strong>${name}</strong><div class="weight-track"><i style="--weight:${width}%"></i></div></div><span>${weight}</span></div>`).join("")}
        </div>
        <p>Algorithms and Programming is the largest multiple-choice content area. A completed high-school algebra course is the recommended prerequisite; prior computer science is not required.</p>
      </section>
      <section class="about-section">
        <h3>Current 2026–27 assessment</h3>
        <ul>
          ${facts.slice(2, 7).map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.fact)}</li>`).join("")}
        </ul>
      </section>
    </div>
    <div class="source-list">
      <strong>Official sources checked ${escapeHtml(COURSE_EXAM_FACTS.checkedOn)}</strong>
      ${COLLEGE_BOARD_SOURCES.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} <span aria-hidden="true">↗</span></a>`).join("")}
      <p>${escapeHtml(DISCLAIMER.details[0])} ${escapeHtml(DISCLAIMER.details[3])}</p>
    </div>
  `;
}

function openAbout() {
  renderAbout();
  elements.aboutDialog.showModal();
}

function setTheme(theme, announce = true) {
  document.documentElement.dataset.theme = theme;
  elements.themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
  elements.themeButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  if (announce) showToast(`${theme === "dark" ? "Dark" : "Light"} theme enabled.`);
  persistState();
}

function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

function openExamplesRail() {
  elements.examplesRail.classList.add("is-open");
  elements.examplesToggle.setAttribute("aria-expanded", "true");
}

function closeExamplesRail() {
  elements.examplesRail.classList.remove("is-open");
  elements.examplesToggle.setAttribute("aria-expanded", "false");
}

async function copyText(text, successMessage = "Copied to clipboard.") {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast(successMessage);
  } catch {
    showToast("Copy failed. Select the text and copy it manually.");
  }
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function bindEvents() {
  elements.codeEditor.addEventListener("input", () => {
    updateEditorChrome();
    state.drafts.set(state.selectedExampleId, elements.codeEditor.value);
    persistState();
  });
  elements.codeEditor.addEventListener("scroll", syncEditorScroll);
  elements.codeEditor.addEventListener("click", updateCursorPosition);
  elements.codeEditor.addEventListener("keyup", updateCursorPosition);
  elements.codeEditor.addEventListener("select", updateCursorPosition);
  elements.codeEditor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const { selectionStart, selectionEnd, value } = elements.codeEditor;
      elements.codeEditor.value = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
      elements.codeEditor.setSelectionRange(selectionStart + 2, selectionStart + 2);
      elements.codeEditor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  elements.runButton.addEventListener("click", executeProgram);
  elements.stopButton.addEventListener("click", stopProgram);
  elements.resetButton.addEventListener("click", () => {
    const example = getExample(state.selectedExampleId);
    state.drafts.delete(state.selectedExampleId);
    elements.codeEditor.value = example?.code ?? "";
    elements.inputQueue.value = (example?.inputQueue ?? []).map(formatInputValue).join("\n");
    state.robotConfig = example?.robot ?? DEFAULT_ROBOT;
    resetRobotView();
    updateEditorChrome();
    clearResults();
    persistState();
    showToast("Example reset.");
  });
  elements.clearInputButton.addEventListener("click", () => {
    elements.inputQueue.value = "";
    elements.inputQueue.focus();
    persistState();
  });
  elements.inputQueue.addEventListener("input", persistState);
  elements.copyOutputButton.addEventListener("click", () => copyText(state.currentOutput, "Console output copied."));

  elements.consoleTab.addEventListener("click", () => switchResultTab("console"));
  elements.robotTab.addEventListener("click", () => switchResultTab("robot"));
  elements.resetRobotButton.addEventListener("click", resetRobotView);

  elements.referenceButton.addEventListener("click", openReference);
  elements.syntaxHelp.addEventListener("click", openReference);
  elements.referenceClose.addEventListener("click", closeReference);
  elements.referenceFooterClose.addEventListener("click", closeReference);
  elements.drawerScrim.addEventListener("click", closeReference);
  elements.referenceSearch.addEventListener("input", renderReferenceResults);

  elements.aboutButton.addEventListener("click", openAbout);
  elements.aboutClose.addEventListener("click", () => elements.aboutDialog.close());
  elements.aboutDialog.addEventListener("click", (event) => {
    if (event.target === elements.aboutDialog) elements.aboutDialog.close();
  });

  elements.themeButton.addEventListener("click", toggleTheme);
  elements.examplesToggle.addEventListener("click", () => {
    if (elements.examplesRail.classList.contains("is-open")) closeExamplesRail();
    else openExamplesRail();
  });
  elements.examplesClose.addEventListener("click", closeExamplesRail);

  document.addEventListener("keydown", (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key === "Enter") {
      event.preventDefault();
      executeProgram();
    } else if (event.key === "Escape") {
      if (state.running) stopProgram();
      else if (elements.referenceDrawer.classList.contains("is-open")) closeReference();
      else closeExamplesRail();
    }
  });
}

function initialize() {
  restoreState();
  renderExamples();
  renderReferenceCategories();
  renderReferenceResults();
  bindEvents();
  const selected = getExample(state.selectedExampleId) ?? EXAMPLES[0];
  elements.codeEditor.value = state.drafts.get(selected.id) ?? selected.code;
  elements.inputQueue.value = elements.inputQueue.dataset.restoredValue ?? selected.inputQueue.map(formatInputValue).join("\n");
  state.robotConfig = selected.robot ?? DEFAULT_ROBOT;
  updateEditorChrome();
  resetRobotView();
  clearResults();
  switchResultTab(selected.robot ? "robot" : "console");
  requestAnimationFrame(() => {
    elements.codeEditor.focus({ preventScroll: true });
    if (selected.id === "first-program") setTimeout(executeProgram, 120);
  });
}

initialize();

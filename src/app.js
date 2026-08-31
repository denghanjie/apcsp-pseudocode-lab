import { createExecution } from "./interpreter.js";
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
  editorShell: $("#editor-shell"),
  editorStatus: $(".editor-status"),
  examplesClose: $("#examples-close"),
  examplesList: $("#examples-list"),
  examplesRail: $("#examples-rail"),
  examplesToggle: $("#examples-toggle"),
  inputDialog: $("#input-dialog"),
  inputForm: $("#input-form"),
  inputQueue: $("#input-queue"),
  lineCount: $("#line-count"),
  lineNumbers: $("#line-numbers"),
  executionAnnouncer: $("#execution-announcer"),
  executionLine: $("#execution-line"),
  executionPosition: $("#execution-position"),
  frameContext: $("#frame-context"),
  framesGroup: $("#frames-group"),
  framesOutput: $("#frames-output"),
  listsGroup: $("#lists-group"),
  listsOutput: $("#lists-output"),
  readyDot: $("#ready-dot"),
  referenceButton: $("#reference-button"),
  referenceCategories: $("#reference-categories"),
  referenceClose: $("#reference-close"),
  referenceDrawer: $("#reference-drawer"),
  referenceFooterClose: $("#reference-footer-close"),
  referenceResults: $("#reference-results"),
  referenceSearch: $("#reference-search"),
  resetButton: $("#reset-button"),
  resetButtonLabel: $("#reset-button-label"),
  resetRobotButton: $("#reset-robot-button"),
  robotGrid: $("#robot-grid"),
  robotPanel: $("#robot-panel"),
  robotPosition: $("#robot-position"),
  robotTab: $("#robot-tab"),
  runBanner: $("#run-banner"),
  runButton: $("#run-button"),
  runButtonLabel: $("#run-button-label"),
  runMessage: $("#run-message"),
  runtimeInput: $("#runtime-input"),
  stateEmpty: $("#state-empty"),
  statePanel: $("#state-panel"),
  stateStepCount: $("#state-step-count"),
  stateTab: $("#state-tab"),
  stepButton: $("#step-button"),
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
  variablesGroup: $("#variables-group"),
  variablesOutput: $("#variables-output"),
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
  execution: null,
  executionPhase: "idle",
  executionCheckpoint: null,
  executionStartedAt: 0,
  executionSource: "",
  inspectorValues: new Map(),
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
  positionExecutionLine();
}

function sourceLocation(value) {
  const loc = value?.loc ?? value?.primaryLoc ?? value?.location ?? value;
  const start = loc?.start ?? loc;
  const line = Number(start?.line ?? value?.line ?? 0);
  const column = Number(start?.column ?? value?.column ?? 1);
  return line > 0 ? { line, column: Math.max(1, column || 1) } : null;
}

function positionExecutionLine() {
  if (elements.executionLine.hidden) return;
  const line = Number(elements.executionLine.dataset.line || 0);
  if (line < 1) return;
  const editorStyle = getComputedStyle(elements.codeEditor);
  const lineHeight = Number.parseFloat(editorStyle.lineHeight) || 28;
  const paddingTop = Number.parseFloat(editorStyle.paddingTop) || 0;
  const top = paddingTop + (line - 1) * lineHeight - elements.codeEditor.scrollTop;
  elements.executionLine.style.height = `${lineHeight}px`;
  elements.executionLine.style.transform = `translateY(${top}px)`;
}

function scrollExecutionLineIntoView(line) {
  const editorStyle = getComputedStyle(elements.codeEditor);
  const lineHeight = Number.parseFloat(editorStyle.lineHeight) || 28;
  const paddingTop = Number.parseFloat(editorStyle.paddingTop) || 0;
  const lineTop = paddingTop + (line - 1) * lineHeight;
  const lineBottom = lineTop + lineHeight;
  const visibleTop = elements.codeEditor.scrollTop;
  const visibleBottom = visibleTop + elements.codeEditor.clientHeight;
  if (lineTop < visibleTop + lineHeight) {
    elements.codeEditor.scrollTop = Math.max(0, lineTop - lineHeight * 2);
  } else if (lineBottom > visibleBottom - lineHeight) {
    elements.codeEditor.scrollTop = Math.max(0, lineBottom - elements.codeEditor.clientHeight + lineHeight * 2);
  }
  syncEditorScroll();
}

function clearExecutionLocation() {
  state.executionCheckpoint = null;
  elements.executionLine.hidden = true;
  elements.executionLine.removeAttribute("data-line");
  elements.executionLine.removeAttribute("data-phase");
  elements.executionPosition.hidden = true;
  elements.editorStatus.classList.remove("has-execution");
}

function setExecutionLocation(checkpoint, { announce = false, scroll = true } = {}) {
  const location = sourceLocation(checkpoint);
  if (!location) {
    clearExecutionLocation();
    return;
  }
  state.executionCheckpoint = checkpoint;
  const completed = checkpoint?.phase === "after";
  const failed = checkpoint?.phase === "failed";
  const iteration = checkpoint?.details?.iteration;
  const total = checkpoint?.details?.total;
  const iterationCopy = iteration
    ? ` · iteration ${iteration}${Number.isFinite(total) ? ` of ${total}` : ""}`
    : "";
  const copy = completed
    ? `Finished at line ${location.line}`
    : failed
      ? `Stopped at line ${location.line}`
      : `Next line ${location.line}${iterationCopy}`;
  elements.executionLine.dataset.line = String(location.line);
  elements.executionLine.dataset.phase = failed ? "failed" : completed ? "after" : "before";
  elements.executionLine.hidden = false;
  elements.executionPosition.textContent = copy;
  elements.executionPosition.hidden = false;
  elements.editorStatus.classList.add("has-execution");
  positionExecutionLine();
  if (scroll) scrollExecutionLineIntoView(location.line);
  if (announce) {
    elements.executionAnnouncer.textContent = completed
      ? `Execution finished at line ${location.line}.`
      : failed
        ? `Execution stopped at line ${location.line}.`
        : `Paused before line ${location.line}${iterationCopy}.`;
  }
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

function formatStateValue(value, depth = 0) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Object.is(value, -0) ? "0" : String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "null";
  if (Array.isArray(value)) {
    if (depth >= 3) return "[…]";
    const values = value.slice(0, 50).map((item) => formatStateValue(item, depth + 1));
    if (value.length > 50) values.push("…");
    return `[${values.join(", ")}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stateValueSignature(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function appendVariableRow(container, name, value, scope, key, currentValues) {
  const row = document.createElement("div");
  row.className = "state-row";
  const signature = stateValueSignature(value);
  currentValues.set(key, signature);
  if (state.inspectorValues.get(key) !== signature) {
    row.classList.add("is-changed");
    row.title = "Changed on the latest step";
  }
  row.innerHTML = `
    <span class="state-key"><code>${escapeHtml(name)}</code><small>${escapeHtml(scope)}</small></span>
    <code class="state-value">${escapeHtml(formatStateValue(value))}</code>
  `;
  container.append(row);
}

function appendListRow(container, name, values, scope, key, currentValues) {
  const wrapper = document.createElement("article");
  wrapper.className = "list-state-item";
  const signature = stateValueSignature(values);
  currentValues.set(key, signature);
  if (state.inspectorValues.get(key) !== signature) {
    wrapper.classList.add("is-changed");
    wrapper.title = "Changed on the latest step";
  }
  const header = document.createElement("header");
  header.innerHTML = `<code>${escapeHtml(name)}</code><small>${escapeHtml(scope)} · ${values.length} ${values.length === 1 ? "item" : "items"}</small>`;
  wrapper.append(header);
  if (values.length === 0) {
    const empty = document.createElement("span");
    empty.className = "list-empty-value";
    empty.textContent = "Empty list";
    wrapper.append(empty);
  } else {
    const list = document.createElement("ol");
    list.className = "list-items";
    values.forEach((value, index) => {
      const item = document.createElement("li");
      item.innerHTML = `<span class="list-index">${index + 1}</span><code class="list-item-value">${escapeHtml(formatStateValue(value))}</code>`;
      list.append(item);
    });
    wrapper.append(list);
  }
  container.append(wrapper);
}

function renderStateInspector(snapshot = {}) {
  const globals = snapshot?.globals && typeof snapshot.globals === "object" ? snapshot.globals : {};
  const frames = Array.isArray(snapshot?.frames) ? snapshot.frames : [];
  const variables = [];
  const lists = [];
  const currentValues = new Map();

  const collect = (values, scope, scopeKey) => {
    for (const [name, value] of Object.entries(values ?? {})) {
      const entry = { name, value, scope, key: `${scopeKey}:${name}` };
      if (Array.isArray(value)) lists.push(entry);
      else variables.push(entry);
    }
  };
  collect(globals, "Global", "global");
  for (const frame of frames) {
    collect(frame.locals, frame.name || `Frame ${frame.depth}`, `frame-${frame.depth}-${frame.name}`);
  }

  elements.variablesOutput.replaceChildren();
  elements.listsOutput.replaceChildren();
  elements.framesOutput.replaceChildren();
  for (const entry of variables) {
    appendVariableRow(elements.variablesOutput, entry.name, entry.value, entry.scope, entry.key, currentValues);
  }
  for (const entry of lists) {
    appendListRow(elements.listsOutput, entry.name, entry.value, entry.scope, entry.key, currentValues);
  }
  for (const frame of frames) {
    const row = document.createElement("div");
    row.className = "frame-row";
    const callLine = sourceLocation(frame.callLoc)?.line;
    row.innerHTML = `
      <span class="frame-depth">${escapeHtml(frame.depth ?? "")}</span>
      <span class="frame-copy"><strong>${escapeHtml(frame.name ?? "Procedure")}</strong><small>${callLine ? `Called from line ${callLine}` : "Active procedure"}</small></span>
    `;
    elements.framesOutput.append(row);
  }

  const activeFrame = frames.at(-1);
  elements.frameContext.textContent = activeFrame
    ? `Inside ${activeFrame.name} · depth ${activeFrame.depth}`
    : "Global scope";
  const steps = Number(snapshot?.steps ?? 0);
  elements.stateStepCount.textContent = `${steps.toLocaleString()} ${steps === 1 ? "operation" : "operations"}`;
  elements.variablesGroup.hidden = variables.length === 0;
  elements.listsGroup.hidden = lists.length === 0;
  elements.framesGroup.hidden = frames.length === 0;
  elements.stateEmpty.hidden = variables.length + lists.length + frames.length > 0;
  state.inspectorValues = currentValues;
}

function clearResults() {
  state.currentOutput = "";
  state.currentResult = null;
  state.inspectorValues = new Map();
  elements.consoleOutput.replaceChildren();
  elements.consoleEmpty.hidden = false;
  elements.copyOutputButton.disabled = true;
  renderStateInspector();
  clearExecutionLocation();
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

function setExecutionControls(phase) {
  state.executionPhase = phase;
  const hasExecution = Boolean(state.execution);
  const continuing = phase === "continuing";
  const waiting = phase === "waiting";
  const stepping = phase === "stepping";
  const locked = hasExecution;
  state.running = continuing || waiting;

  elements.runButtonLabel.textContent = hasExecution ? "Continue" : "Run";
  elements.runButton.setAttribute("aria-label", hasExecution ? "Continue program" : "Run program");
  elements.runButton.disabled = continuing || waiting || stepping;
  elements.stepButton.hidden = continuing;
  elements.stepButton.disabled = waiting || stepping;
  elements.stopButton.hidden = !continuing;
  elements.stopButton.disabled = !continuing;
  elements.resetButtonLabel.textContent = hasExecution ? "Reset run" : "Reset";
  elements.resetButton.title = hasExecution ? "Reset execution and keep the current code" : "Restore the selected example";
  elements.resetButton.disabled = continuing || waiting || stepping;
  elements.codeEditor.readOnly = locked;
  elements.inputQueue.readOnly = locked;
  elements.clearInputButton.disabled = locked;
  elements.resetRobotButton.disabled = locked;
  elements.editorShell.classList.toggle("is-debugging", locked);
  for (const button of $$("button", elements.examplesList)) button.disabled = locked;
}

function errorLocation(error) {
  return sourceLocation(error);
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

function normalizeOutputEntries(record) {
  const rawEntries = Array.isArray(record?.outputEntries) ? record.outputEntries : [];
  return rawEntries.map((entry) => {
    if (typeof entry === "string") return entry;
    return entry?.text ?? entry?.value ?? entry?.output ?? String(entry ?? "");
  });
}

function renderConsole(record, { includeError = false } = {}) {
  elements.consoleOutput.replaceChildren();
  const entries = normalizeOutputEntries(record);
  state.currentOutput = typeof record?.output === "string" ? record.output : entries.join("");

  for (const entry of entries) {
    const item = document.createElement("li");
    item.textContent = String(entry).replace(/ $/, "");
    elements.consoleOutput.append(item);
  }

  const wasAborted = record?.error?.code === "ABORTED";
  if (includeError && !record?.ok && !wasAborted) {
    const error = record?.error ?? { message: "The program stopped with an unknown error." };
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
  return entries;
}

function elapsedLabel(elapsedMs) {
  return `${Math.max(0.1, elapsedMs).toFixed(elapsedMs >= 100 ? 0 : 1)} ms`;
}

function renderResult(result, elapsedMs) {
  state.currentResult = result;
  const wasAborted = result?.error?.code === "ABORTED";
  const entries = renderConsole(result, { includeError: true });
  const steps = result?.steps ?? 0;
  const elapsed = elapsedLabel(elapsedMs);

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

  renderStateInspector(result?.state ?? result);

  if (result?.robot || result?.robotTrace) {
    state.robotSnapshot = result.robot ?? state.robotSnapshot;
    state.robotTrace = result.robotTrace ?? [];
    renderRobot(state.robotConfig, state.robotSnapshot, state.robotTrace);
  }
}

function beginExecution() {
  if (state.execution) return state.execution;
  clearResults();
  state.abortController = new AbortController();
  state.executionStartedAt = performance.now();
  state.executionSource = elements.codeEditor.value;
  state.inspectorValues = new Map();
  const example = getExample(state.selectedExampleId);
  state.robotConfig = example?.robot ?? DEFAULT_ROBOT;
  resetRobotView();
  state.execution = createExecution(state.executionSource, {
    inputQueue: getInputValues(),
    robot: state.robotConfig,
    stepLimit: 100_000,
  });
  setExecutionControls("paused");
  return state.execution;
}

function renderExecutionProgress(progress, { announce = false, scroll = true } = {}) {
  if (!progress) return;
  const snapshot = progress.state ?? state.execution?.snapshot?.() ?? {};
  const entries = renderConsole(snapshot);
  renderStateInspector(snapshot);
  state.currentResult = {
    status: progress.status,
    state: snapshot,
    checkpoint: progress.checkpoint,
  };

  if (snapshot.robot || snapshot.robotTrace) {
    state.robotSnapshot = snapshot.robot ?? state.robotSnapshot;
    state.robotTrace = snapshot.robotTrace ?? [];
    renderRobot(state.robotConfig, state.robotSnapshot, state.robotTrace);
  }

  setExecutionLocation(progress.checkpoint, { announce, scroll });
  const location = sourceLocation(progress.checkpoint);
  const steps = snapshot.steps ?? 0;
  const elapsed = elapsedLabel(performance.now() - state.executionStartedAt);
  if (progress.status === "input-required") {
    setRunBanner("running", location ? `Waiting for input at line ${location.line}…` : "Waiting for input…", steps);
    setAppStatus("Waiting for input", "running");
  } else if (state.executionPhase === "continuing") {
    setRunBanner("running", "Running program…", steps);
    setAppStatus("Running", "running");
  } else {
    setRunBanner("paused", location ? `Paused before line ${location.line}.` : "Execution paused.", steps);
    setAppStatus(location ? `Paused · line ${location.line}` : "Paused", "running");
  }
  setSummary({
    status: progress.status === "input-required" ? "Waiting for input" : state.executionPhase === "continuing" ? "Running" : "Paused",
    steps,
    inputs: snapshot.inputConsumed ?? 0,
    output: entries.length,
    time: elapsed,
  });
}

function finishExecution(progress) {
  const execution = state.execution;
  if (!execution) return;
  const result = progress?.result ?? execution.getResult();
  const checkpoint = progress?.checkpoint ?? result?.debug?.checkpoint ?? state.executionCheckpoint;
  if (checkpoint) setExecutionLocation(checkpoint, { announce: true, scroll: true });
  renderResult(result, performance.now() - state.executionStartedAt);
  state.execution = null;
  state.abortController = null;
  state.executionSource = "";
  setExecutionControls("idle");
}

async function resumeAfterInput(progress, resumePhase) {
  let current = progress;
  while (current?.status === "input-required" && state.execution) {
    setExecutionControls("waiting");
    renderExecutionProgress(current, { announce: true, scroll: true });
    let submission;
    try {
      submission = await requestRuntimeInput(current.inputRequest ?? current.checkpoint);
    } catch (error) {
      state.execution?.abort();
      return state.execution?.advanceToNextStatement() ?? null;
    }
    if (!state.execution) return null;
    try {
      state.execution.provideInput(submission.value);
    } catch (error) {
      showToast(error?.message ?? "That input value is not supported.");
      continue;
    }
    elements.inputQueue.value += `${elements.inputQueue.value ? "\n" : ""}${submission.raw}`;
    persistState();
    setExecutionControls(resumePhase);
    current = state.execution.advanceToNextStatement();
  }
  return current;
}

async function stepProgram() {
  if (["continuing", "waiting", "stepping"].includes(state.executionPhase)) return;
  const execution = beginExecution();
  setExecutionControls("stepping");
  let progress = execution.advanceToNextStatement();
  progress = await resumeAfterInput(progress, "paused");
  if (!progress || state.execution !== execution) return;
  if (progress.done) {
    finishExecution(progress);
    return;
  }
  setExecutionControls("paused");
  renderExecutionProgress(progress, { announce: true, scroll: true });
}

async function executeProgram() {
  if (["continuing", "waiting", "stepping"].includes(state.executionPhase)) return;
  const execution = beginExecution();
  const controller = state.abortController;
  setExecutionControls("continuing");
  setRunBanner("running", "Running program…", execution.snapshot().steps ?? 0);
  setAppStatus("Running", "running");
  elements.summaryStatus.textContent = "Running";
  let progress = null;

  try {
    while (state.execution === execution && !execution.done) {
      const sliceStarted = performance.now();
      let boundaries = 0;
      do {
        if (controller?.signal.aborted && !execution.done) execution.abort();
        progress = execution.advanceToNextStatement();
        if (progress.status === "input-required") {
          progress = await resumeAfterInput(progress, "continuing");
          if (!progress || state.execution !== execution) return;
        }
        boundaries += 1;
      } while (!progress.done && boundaries < 250 && performance.now() - sliceStarted < 8);

      renderExecutionProgress(progress, { announce: false, scroll: false });
      if (progress.done) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (state.execution === execution) {
      if (!progress?.done && execution.done) {
        progress = execution.advanceToNextStatement();
      } else {
        progress ??= execution.advanceToNextStatement();
      }
      finishExecution(progress);
    }
  } catch (error) {
    const snapshot = execution.snapshot?.() ?? {};
    renderResult({
      ok: false,
      output: snapshot.output ?? "",
      outputEntries: snapshot.outputEntries ?? [],
      globals: snapshot.globals ?? {},
      frames: snapshot.frames ?? [],
      state: snapshot,
      robot: snapshot.robot ?? null,
      robotTrace: snapshot.robotTrace ?? [],
      steps: snapshot.steps ?? 0,
      inputConsumed: snapshot.inputConsumed ?? 0,
      error,
    }, performance.now() - state.executionStartedAt);
    state.execution = null;
    state.abortController = null;
    setExecutionControls("idle");
  }
}

function stopProgram() {
  if (!state.execution || !state.running) return;
  state.abortController?.abort();
  state.execution.abort();
  if (elements.inputDialog.open) elements.inputDialog.close("cancel");
  setAppStatus("Stopping…", "running");
}

function resetExecution() {
  if (!state.execution) return false;
  state.abortController?.abort();
  state.execution.abort();
  if (elements.inputDialog.open) elements.inputDialog.close("cancel");
  state.execution = null;
  state.abortController = null;
  state.executionSource = "";
  setExecutionControls("idle");
  resetRobotView();
  clearResults();
  showToast("Execution reset. Your code was kept.");
  return true;
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
    elements.inputDialog.returnValue = "";
    elements.inputDialog.showModal();
    requestAnimationFrame(() => elements.runtimeInput.focus());

    const onClose = () => {
      elements.inputDialog.removeEventListener("close", onClose);
      if (elements.inputDialog.returnValue === "submit") {
        const raw = elements.runtimeInput.value;
        resolve({ raw, value: parseInputValue(raw) });
      } else {
        reject(new DOMException("INPUT() cancelled", "AbortError"));
      }
    };
    elements.inputDialog.addEventListener("close", onClose);
  });
}

function switchResultTab(tabName, { focus = false } = {}) {
  const views = {
    console: [elements.consoleTab, elements.consolePanel],
    state: [elements.stateTab, elements.statePanel],
    robot: [elements.robotTab, elements.robotPanel],
  };
  if (!views[tabName]) tabName = "console";
  for (const [name, [tab, panel]] of Object.entries(views)) {
    const selected = name === tabName;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  }
  if (focus) views[tabName][0].focus();
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
    clearExecutionLocation();
    state.drafts.set(state.selectedExampleId, elements.codeEditor.value);
    persistState();
  });
  elements.codeEditor.addEventListener("scroll", syncEditorScroll);
  elements.codeEditor.addEventListener("click", updateCursorPosition);
  elements.codeEditor.addEventListener("keyup", updateCursorPosition);
  elements.codeEditor.addEventListener("select", updateCursorPosition);
  elements.codeEditor.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && !elements.codeEditor.readOnly) {
      event.preventDefault();
      const { selectionStart, selectionEnd, value } = elements.codeEditor;
      elements.codeEditor.value = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
      elements.codeEditor.setSelectionRange(selectionStart + 2, selectionStart + 2);
      elements.codeEditor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  elements.runButton.addEventListener("click", executeProgram);
  elements.stepButton.addEventListener("click", stepProgram);
  elements.stopButton.addEventListener("click", stopProgram);
  elements.resetButton.addEventListener("click", () => {
    if (resetExecution()) return;
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
  elements.stateTab.addEventListener("click", () => switchResultTab("state"));
  elements.robotTab.addEventListener("click", () => switchResultTab("robot"));
  $(".results-tabs").addEventListener("keydown", (event) => {
    const names = ["console", "state", "robot"];
    const tabs = [elements.consoleTab, elements.stateTab, elements.robotTab];
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    switchResultTab(names[nextIndex], { focus: true });
  });
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
  window.addEventListener("resize", positionExecutionLine);

  document.addEventListener("keydown", (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    const dialogOpen = elements.inputDialog.open || elements.aboutDialog.open;
    if (event.key === "F10" && !dialogOpen && !elements.referenceDrawer.classList.contains("is-open")) {
      event.preventDefault();
      stepProgram();
    } else if (modifier && event.key === "Enter" && !dialogOpen) {
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
  setExecutionControls("idle");
  switchResultTab(selected.robot ? "robot" : "console");
  requestAnimationFrame(() => {
    elements.codeEditor.focus({ preventScroll: true });
    if (selected.id === "first-program") setTimeout(executeProgram, 120);
  });
}

initialize();

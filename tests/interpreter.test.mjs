import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASCII_ALIASES,
  createExecution,
  parseProgram,
  runProgram,
  runProgramAsync,
  tokenize,
} from '../src/interpreter.js';

function expectSuccess(source, options = {}) {
  const result = runProgram(source, options);
  assert.equal(result.ok, true, result.error?.message);
  assert.equal(result.error, null);
  return result;
}

function expectFailure(source, code, options = {}) {
  const result = runProgram(source, options);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'error');
  assert.equal(result.error?.code, code, result.error?.message);
  return result;
}

test('1: arithmetic precedence, real division, MOD, and inclusive singleton RANDOM', () => {
  const result = expectSuccess(`
a ← 2 + 3 * 4
DISPLAY(a)
DISPLAY(17 / 5)
DISPLAY(17 MOD 5)
DISPLAY(RANDOM(7, 7))
`);
  assert.equal(result.output, '14 3.4 2 7 ');
  assert.deepEqual(result.outputEntries, ['14 ', '3.4 ', '2 ', '7 ']);
  assert.deepEqual(
    result.events.filter((event) => event.type === 'display').map((event) => event.text),
    ['14', '3.4', '2', '7'],
  );
});

test('2: scalar assignment copies the current value', () => {
  const result = expectSuccess(`
a ← 1
b ← a
a ← 2
DISPLAY(b)
DISPLAY(a)
`);
  assert.equal(result.output, '1 2 ');
});

test('3: strict Boolean IF, comparison, AND, and NOT', () => {
  const result = expectSuccess(`
a ← 3
b ← 5
IF ((a < b) AND (NOT (a = b)))
{
  DISPLAY(1)
}
ELSE
{
  DISPLAY(0)
}
`);
  assert.equal(result.output, '1 ');

  const invalid = expectFailure('IF (1) { DISPLAY(1) }', 'EXPECTED_BOOLEAN');
  assert.equal(invalid.error.loc.start.line, 1);
});

test('4: INPUT consumes a typed queue value', () => {
  const result = expectSuccess(
    `
x ← INPUT()
IF (x ≥ 10)
{
  DISPLAY(x / 2)
}
ELSE
{
  DISPLAY(x)
}
`,
    { inputQueue: [12] },
  );
  assert.equal(result.output, '6 ');
  assert.equal(result.inputConsumed, 1);
  assert.equal(result.events.find((event) => event.type === 'input').source, 'queue');
});

test('5: REPEAT n TIMES executes exactly n times', () => {
  const result = expectSuccess(`
sum ← 0
i ← 1
REPEAT 4 TIMES
{
  sum ← sum + i
  i ← i + 1
}
DISPLAY(sum)
`);
  assert.equal(result.output, '10 ');
});

test('6: REPEAT UNTIL is a pretest loop', () => {
  const result = expectSuccess(`
x ← 5
count ← 0
REPEAT UNTIL (x ≥ 5)
{
  count ← count + 1
}
DISPLAY(count)
REPEAT UNTIL (x = 8)
{
  x ← x + 1
}
DISPLAY(x)
`);
  assert.equal(result.output, '0 8 ');
});

test('7: assigning a list creates an independent copy', () => {
  const result = expectSuccess(`
aList ← [20, 40, 60]
bList ← aList
aList[2] ← 99
DISPLAY(bList[2])
DISPLAY(aList[2])
`);
  assert.equal(result.output, '40 99 ');
  assert.deepEqual(result.globals.aList, [20, 99, 60]);
  assert.deepEqual(result.globals.bList, [20, 40, 60]);
});

test('8: INSERT, APPEND, REMOVE, LENGTH, and ordered traversal', () => {
  const result = expectSuccess(`
aList ← [10, 30]
INSERT(aList, 2, 20)
APPEND(aList, 40)
REMOVE(aList, 1)
DISPLAY(LENGTH(aList))
FOR EACH item IN aList
{
  DISPLAY(item)
}
`);
  assert.equal(result.output, '3 20 30 40 ');
  assert.deepEqual(result.globals.aList, [20, 30, 40]);
});

test('9: FOR EACH visits first through last', () => {
  const result = expectSuccess(`
values ← [4, 1, 9]
FOR EACH value IN values
{
  DISPLAY(value)
}
`);
  assert.equal(result.output, '4 1 9 ');
});

test('10: invalid list access is fatal and later statements are not run', () => {
  const result = expectFailure(
    `aList ← []
DISPLAY(aList[1])
DISPLAY(999)`,
    'INVALID_LIST_INDEX',
  );
  assert.equal(result.output, '');
  assert.equal(result.error.loc.start.line, 2);
  assert.match(result.error.hint, /1-indexed/i);
});

test('11: no-return procedure calls and immediate RETURN work', () => {
  const result = expectSuccess(`
PROCEDURE showDouble(x)
{
  DISPLAY(x * 2)
}

PROCEDURE absolute(x)
{
  IF (x < 0)
  {
    RETURN(-x)
  }
  RETURN(x)
}

showDouble(3)
DISPLAY(absolute(-4))
`);
  assert.equal(result.output, '6 4 ');
});

test('procedure list parameters receive copies', () => {
  const result = expectSuccess(`
PROCEDURE mutate(items)
{
  items[1] ← 99
  APPEND(items, 3)
}
original ← [1, 2]
mutate(original)
DISPLAY(original[1])
DISPLAY(LENGTH(original))
`);
  assert.equal(result.output, '1 2 ');
  assert.deepEqual(result.globals.original, [1, 2]);
});

test('PROCEDURE declarations are rejected outside the program top level', () => {
  const insideIf = expectFailure(
    `IF (true)
{
  PROCEDURE hidden()
  {
    DISPLAY(1)
  }
}
hidden()`,
    'PROCEDURE_NOT_TOP_LEVEL',
  );
  assert.equal(insideIf.error.phase, 'parse');
  assert.equal(insideIf.error.loc.start.line, 3);
  assert.match(insideIf.error.hint, /outside every IF, loop/i);

  const insideProcedure = expectFailure(
    `PROCEDURE outer()
{
  PROCEDURE inner()
  {
    DISPLAY(1)
  }
}`,
    'PROCEDURE_NOT_TOP_LEVEL',
  );
  assert.equal(insideProcedure.error.phase, 'parse');
  assert.equal(insideProcedure.error.loc.start.line, 3);
});

test('built-in and robot direction words are not general-purpose values or variables', () => {
  const builtInValue = expectFailure('x ← DISPLAY', 'RESERVED_BUILTIN_VALUE');
  assert.equal(builtInValue.error.phase, 'validate');
  assert.deepEqual(builtInValue.error.loc.start, { offset: 4, line: 1, column: 5 });

  const builtInTarget = expectFailure('LENGTH ← 3', 'RESERVED_BUILTIN_VALUE');
  assert.equal(builtInTarget.error.phase, 'validate');
  assert.equal(builtInTarget.error.loc.start.column, 1);

  const directionValue = expectFailure('DISPLAY(forward)', 'RESERVED_DIRECTION_VALUE');
  assert.equal(directionValue.error.phase, 'validate');
  assert.equal(directionValue.error.loc.start.column, 9);

  const directionTarget = expectFailure('left ← 1', 'RESERVED_DIRECTION_VALUE');
  assert.equal(directionTarget.error.phase, 'parse');
  assert.equal(directionTarget.error.loc.start.column, 1);

  const valid = expectSuccess('DISPLAY(LENGTH([1, 2]))\nDISPLAY(CAN_MOVE(forward))', {
    robot: {
      rows: 2,
      columns: 2,
      start: { row: 2, column: 1, direction: 'north' },
      blocked: [],
    },
  });
  assert.equal(valid.output, '2 true ');
});

test('12: robot relative motion, rotation, trace, and fatal invalid move', () => {
  const result = expectFailure(
    `
IF (CAN_MOVE(forward))
{
  MOVE_FORWARD()
}
ROTATE_RIGHT()
MOVE_FORWARD()
MOVE_FORWARD()
DISPLAY(999)
`,
    'INVALID_ROBOT_MOVE',
    {
      robot: {
        rows: 3,
        columns: 3,
        start: { row: 2, column: 2, direction: 'north' },
        blocked: [],
      },
    },
  );
  assert.equal(result.output, '');
  assert.deepEqual(
    { row: result.robot.row, column: result.robot.column, direction: result.robot.direction },
    { row: 1, column: 3, direction: 'east' },
  );
  assert.equal(result.robotTrace.at(-1).action, 'MOVE_FORWARD');
  assert.equal(result.robotTrace.at(-1).success, false);
  assert.deepEqual(result.robotTrace.at(-1).attempted, { row: 1, column: 4 });
});

test('INSERT only accepts an existing 1..L index; APPEND is add-at-end', () => {
  const empty = expectFailure('items ← []\nINSERT(items, 1, 5)', 'INVALID_LIST_INDEX');
  assert.match(empty.error.hint, /APPEND/);

  const afterEnd = expectFailure(
    'items ← [1, 2]\nINSERT(items, LENGTH(items) + 1, 3)',
    'INVALID_LIST_INDEX',
  );
  assert.deepEqual(afterEnd.globals.items, [1, 2]);
});

test('ASCII operator aliases are accepted and reported', () => {
  const result = expectSuccess('x <- 4\nIF (x >= 4 AND x != 5) { DISPLAY(x) }');
  assert.equal(result.output, '4 ');
  assert.deepEqual(
    result.aliasesUsed.map((entry) => [entry.alias, entry.official]),
    [
      ['<-', '←'],
      ['>=', '≥'],
      ['!=', '≠'],
    ],
  );
  assert.equal(ASCII_ALIASES['<-'], '←');
});

test('deterministic injected RNG can hit both inclusive endpoints', () => {
  const samples = [0, 0.9999999999999999];
  const result = expectSuccess('DISPLAY(RANDOM(2, 4))\nDISPLAY(RANDOM(2, 4))', {
    rng: () => samples.shift(),
  });
  assert.equal(result.output, '2 4 ');
});

test('step budget stops an infinite loop with a located structured error', () => {
  const result = expectFailure(
    `x ← 0
REPEAT UNTIL (false)
{
  x ← x + 1
}`,
    'STEP_LIMIT',
    { stepLimit: 100 },
  );
  assert.equal(result.steps, 100);
  assert.equal(result.error.details.stepLimit, 100);
  assert.ok(result.error.loc.start.line >= 2);
});

test('recursive procedures are stopped by the call-depth limit', () => {
  const result = expectFailure(
    `PROCEDURE forever()
{
  forever()
}
forever()`,
    'CALL_DEPTH_LIMIT',
    { maxCallDepth: 8, stepLimit: 10_000 },
  );
  assert.equal(result.error.callStack.length, 8);
});

test('syntax diagnostics and runtime call stacks retain source locations', () => {
  const syntax = runProgram('DISPLAY(1 +');
  assert.equal(syntax.ok, false);
  assert.equal(syntax.error.phase, 'parse');
  assert.equal(syntax.error.code, 'EXPECTED_EXPRESSION');
  assert.equal(syntax.error.loc.start.line, 1);

  const runtime = expectFailure(
    `PROCEDURE inner()
{
  values ← []
  DISPLAY(values[1])
}
PROCEDURE outer()
{
  inner()
}
outer()`,
    'INVALID_LIST_INDEX',
  );
  assert.equal(runtime.error.loc.start.line, 4);
  assert.deepEqual(runtime.error.callStack.map((frame) => frame.name), ['outer', 'inner']);
});

test('results and snapshots do not leak mutable interpreter lists', () => {
  const execution = createExecution('items ← [1, 2]\nDISPLAY(items)');
  const first = execution.run();
  first.globals.items[0] = 999;
  first.state.globals.items.push(3);
  const second = execution.getResult();
  const snapshot = execution.snapshot();
  assert.deepEqual(second.globals.items, [1, 2]);
  assert.deepEqual(snapshot.globals.items, [1, 2]);
  assert.equal(second.output, '[1, 2] ');
});

test('INPUT can pause a resumable execution and accept a supplied value', () => {
  const execution = createExecution('x ← INPUT()\nDISPLAY(x + 1)');
  const paused = execution.run();
  assert.equal(paused.status, 'input-required');
  assert.equal(paused.error.code, 'INPUT_REQUIRED');
  assert.equal(paused.inputRequest.inputNumber, 1);

  execution.provideInput(9);
  const completed = execution.run();
  assert.equal(completed.ok, true);
  assert.equal(completed.output, '10 ');
  assert.equal(completed.inputConsumed, 1);
  assert.equal(completed.events.find((event) => event.type === 'input').source, 'provider');
});

test('runProgramAsync accepts an asynchronous inputProvider', async () => {
  const requested = [];
  const result = await runProgramAsync('DISPLAY(INPUT())\nDISPLAY(INPUT())', {
    chunkSize: 2,
    inputQueue: ['queued'],
    inputProvider: async (request) => {
      requested.push(request.inputNumber);
      await Promise.resolve();
      return 'provided';
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.output, 'queued provided ');
  assert.deepEqual(requested, [2]);
});

test('cooperative async execution honors AbortSignal', async () => {
  const controller = new AbortController();
  const promise = runProgramAsync(
    `x ← 0
REPEAT UNTIL (false)
{
  x ← x + 1
}`,
    { stepLimit: 10_000_000, chunkSize: 10, signal: controller.signal },
  );
  setTimeout(() => controller.abort(), 0);
  const result = await promise;
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ABORTED');
  assert.ok(result.steps < 10_000_000);
});

test('token and AST nodes carry line/column spans', () => {
  const tokens = tokenize('x ← 1\nDISPLAY(x)');
  assert.deepEqual(tokens[0].loc.start, { offset: 0, line: 1, column: 1 });
  assert.equal(tokens.find((token) => token.type === 'DISPLAY').loc.start.line, 2);
  const ast = parseProgram('x ← 1\nDISPLAY(x)');
  assert.equal(ast.body[1].loc.start.line, 2);
  assert.equal(ast.body[1].expression.args[0].loc.start.column, 9);
});

test('statement stepping pauses before each line and exposes prior effects', () => {
  const execution = createExecution('x ← 1\ny ← x + 2\nDISPLAY(y)');

  const first = execution.advanceToNextStatement();
  assert.equal(first.status, 'running');
  assert.equal(first.checkpoint.kind, 'statement');
  assert.equal(first.checkpoint.phase, 'before');
  assert.equal(first.checkpoint.loc.start.line, 1);
  assert.deepEqual(first.state.globals, {});

  const second = execution.advanceToNextStatement();
  assert.equal(second.checkpoint.loc.start.line, 2);
  assert.deepEqual(second.state.globals, { x: 1 });

  const third = execution.advanceToNextStatement();
  assert.equal(third.checkpoint.loc.start.line, 3);
  assert.deepEqual(third.state.globals, { x: 1, y: 3 });

  const completed = execution.advanceToNextStatement();
  assert.equal(completed.status, 'completed');
  assert.equal(completed.done, true);
  assert.equal(completed.checkpoint.phase, 'after');
  assert.equal(completed.result.ok, true);
  assert.equal(completed.result.output, '3 ');
});

test('statement stepping exposes loop iterations without hiding an empty-loop budget', () => {
  const execution = createExecution(`x ← 0
REPEAT 2 TIMES
{
  x ← x + 1
}
DISPLAY(x)`);
  const pauses = [];
  for (let guard = 0; guard < 20; guard += 1) {
    const pause = execution.advanceToNextStatement();
    if (pause.done) break;
    pauses.push({
      line: pause.checkpoint.loc.start.line,
      kind: pause.checkpoint.kind,
      iteration: pause.checkpoint.details?.iteration ?? null,
      x: pause.state.globals.x,
    });
  }
  assert.deepEqual(pauses, [
    { line: 1, kind: 'statement', iteration: null, x: undefined },
    { line: 2, kind: 'statement', iteration: null, x: 0 },
    { line: 2, kind: 'loop-iteration', iteration: 1, x: 0 },
    { line: 4, kind: 'statement', iteration: null, x: 0 },
    { line: 2, kind: 'loop-iteration', iteration: 2, x: 1 },
    { line: 4, kind: 'statement', iteration: null, x: 1 },
    { line: 6, kind: 'statement', iteration: null, x: 2 },
  ]);
  assert.equal(execution.getResult().output, '2 ');

  const infinite = createExecution('REPEAT UNTIL(false)\n{\n}', { stepLimit: 18 });
  let finalPause;
  for (let guard = 0; guard < 30; guard += 1) {
    finalPause = infinite.advanceToNextStatement();
    if (finalPause.done) break;
  }
  assert.equal(finalPause.status, 'error');
  assert.equal(finalPause.result.error.code, 'STEP_LIMIT');
  assert.equal(finalPause.result.steps, 18);
});

test('statement stepping enters procedures and exposes cloned local frames', () => {
  const execution = createExecution(`PROCEDURE bump(value)
{
  value ← value + 1
  RETURN(value)
}
answer ← bump(4)
DISPLAY(answer)`);

  const caller = execution.advanceToNextStatement();
  assert.equal(caller.checkpoint.loc.start.line, 6);
  const body = execution.advanceToNextStatement();
  assert.equal(body.checkpoint.loc.start.line, 3);
  assert.deepEqual(body.state.frames[0].locals, { value: 4 });

  body.state.frames[0].locals.value = 999;
  const returned = execution.advanceToNextStatement();
  assert.equal(returned.checkpoint.loc.start.line, 4);
  assert.deepEqual(returned.state.frames[0].locals, { value: 5 });

  const afterCall = execution.advanceToNextStatement();
  assert.equal(afterCall.checkpoint.loc.start.line, 7);
  assert.deepEqual(afterCall.state.frames, []);
  assert.equal(afterCall.state.globals.answer, 5);
});

test('statement debug snapshots are detached across calls and public views', () => {
  const execution = createExecution('items ← [[1], 2]\nDISPLAY(items)');
  execution.advanceToNextStatement();
  const display = execution.advanceToNextStatement();

  display.state.globals.items[0][0] = 99;
  display.state.variables.items.push(3);
  const untouched = execution.snapshot();
  assert.deepEqual(untouched.globals.items, [[1], 2]);
  assert.deepEqual(untouched.variables.items, [[1], 2]);

  untouched.variables.items[0][0] = 77;
  assert.deepEqual(untouched.globals.items, [[1], 2]);
});

test('runtime errors retain failure-time locals without leaking mutable state', () => {
  const execution = createExecution(`PROCEDURE breakList(items)
{
  items[1] ← 9
  DISPLAY(items[3])
}
source ← [1, 2]
breakList(source)`);

  let pause;
  for (let guard = 0; guard < 20; guard += 1) {
    pause = execution.advanceToNextStatement();
    if (pause.done) break;
  }

  assert.equal(pause.status, 'error');
  assert.equal(pause.result.error.code, 'INVALID_LIST_INDEX');
  assert.deepEqual(pause.state.globals.source, [1, 2]);
  assert.deepEqual(pause.state.frames[0].locals.items, [9, 2]);
  pause.state.frames[0].locals.items[0] = 999;
  assert.deepEqual(execution.snapshot().frames[0].locals.items, [9, 2]);
});

test('debug snapshot failures never mask the intended runtime error', () => {
  const execution = createExecution('DISPLAY(1 / 0)');
  const originalSnapshot = execution.runtime.snapshot.bind(execution.runtime);
  let failOnce = true;
  execution.runtime.snapshot = () => {
    if (failOnce) {
      failOnce = false;
      throw new Error('synthetic debug snapshot failure');
    }
    return originalSnapshot();
  };

  const result = execution.run();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'DIVISION_BY_ZERO');
  assert.equal(result.error.phase, 'runtime');
});

test('statement stepping suspends and resumes one INPUT statement exactly once', () => {
  const execution = createExecution('x ← INPUT()\nDISPLAY(x)');
  const assignment = execution.advanceToNextStatement();
  assert.equal(assignment.checkpoint.loc.start.line, 1);

  const waiting = execution.advanceToNextStatement();
  assert.equal(waiting.status, 'input-required');
  assert.equal(waiting.pauseReason, 'input');
  assert.equal(waiting.checkpoint.phase, 'suspended');
  assert.deepEqual(waiting.state.globals, {});
  assert.equal(waiting.state.inputConsumed, 0);
  assert.equal(waiting.events.length, 0);

  execution.provideInput(7);
  const resumed = execution.advanceToNextStatement();
  assert.equal(resumed.checkpoint.loc.start.line, 2);
  assert.equal(resumed.state.globals.x, 7);
  assert.equal(resumed.state.inputConsumed, 1);
  assert.equal(resumed.events.filter((event) => event.type === 'input').length, 1);
});

test('statement stepping preserves the final result and raw step count', () => {
  const source = `items ← [1, 2]
sum ← 0
FOR EACH item IN items
{
  sum ← sum + item
}
DISPLAY(sum)`;
  const expected = runProgram(source);
  const execution = createExecution(source);
  let pause;
  for (let guard = 0; guard < 100; guard += 1) {
    pause = execution.advanceToNextStatement();
    if (pause.done) break;
  }
  assert.equal(pause.status, 'completed');
  assert.equal(pause.result.steps, expected.steps);
  assert.deepEqual(pause.result.globals, expected.globals);
  assert.deepEqual(pause.result.events, expected.events);
  assert.equal(pause.result.output, expected.output);
});

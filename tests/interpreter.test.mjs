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

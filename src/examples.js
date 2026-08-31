/**
 * Runnable AP CSP text-notation examples.
 *
 * The source strings intentionally use the notation printed on the College
 * Board Exam Reference Sheet: the assignment arrow, symbolic comparisons,
 * uppercase procedure names, 1-based lists, and brace-delimited blocks.
 */

export const EXAMPLES = Object.freeze([
  Object.freeze({
    id: "first-program",
    name: "First program",
    summary: "Total a list, make a decision, and call a display procedure.",
    concepts: Object.freeze(["assignment", "list", "iteration", "selection", "procedure"]),
    code: `numbers ← [3, 7, 2, 9, 4]
total ← 0
i ← 1

REPEAT UNTIL(i > LENGTH(numbers)) {
  total ← total + numbers[i]
  i ← i + 1
}

DISPLAY("Total:")
DISPLAY(total)
DISPLAY("Count:")
DISPLAY(LENGTH(numbers))

IF(total > 20) {
  DISPLAY("That is a big total!")
} ELSE {
  DISPLAY("That is a small total.")
}

showList(numbers)

PROCEDURE showList(aList) {
  DISPLAY("Numbers:")
  FOR EACH item IN aList {
    DISPLAY(item)
  }
}`,
    inputQueue: Object.freeze([]),
    robot: null,
    expectedOutput: "Total: 25 Count: 5 That is a big total! Numbers: 3 7 2 9 4 ",
  }),

  Object.freeze({
    id: "conditionals",
    name: "Conditionals",
    summary: "Read a score and choose exactly one message to display.",
    concepts: Object.freeze(["INPUT", "comparison", "IF", "ELSE"]),
    code: `score ← INPUT()

IF(score ≥ 70)
{
  DISPLAY("On track")
}
ELSE
{
  DISPLAY("Keep practicing")
}`,
    inputQueue: Object.freeze([84]),
    robot: null,
    expectedOutput: "On track ",
  }),

  Object.freeze({
    id: "loops",
    name: "Loops",
    summary: "Use both a counted loop and a pre-test repeat-until loop.",
    concepts: Object.freeze(["REPEAT n TIMES", "REPEAT UNTIL", "iteration"]),
    code: `total ← 0

REPEAT 4 TIMES
{
  total ← total + 2
}

DISPLAY(total)

countdown ← 3
REPEAT UNTIL(countdown = 0)
{
  DISPLAY(countdown)
  countdown ← countdown - 1
}

DISPLAY("Go!")`,
    inputQueue: Object.freeze([]),
    robot: null,
    expectedOutput: "8 3 2 1 Go! ",
  }),

  Object.freeze({
    id: "lists",
    name: "Lists",
    summary: "Append a score, traverse the list, and compute its average.",
    concepts: Object.freeze(["list", "APPEND", "FOR EACH", "LENGTH"]),
    code: `scores ← [88, 92, 79]
APPEND(scores, 95)

total ← 0
FOR EACH score IN scores
{
  total ← total + score
}

average ← total / LENGTH(scores)
DISPLAY(average)`,
    inputQueue: Object.freeze([]),
    robot: null,
    expectedOutput: "88.5 ",
  }),

  Object.freeze({
    id: "procedures",
    name: "Procedures",
    summary: "Define one value-returning procedure and one display procedure.",
    concepts: Object.freeze(["PROCEDURE", "parameters", "RETURN", "procedure call"]),
    code: `PROCEDURE larger(a, b)
{
  IF(a > b)
  {
    RETURN(a)
  }
  RETURN(b)
}

PROCEDURE announce(label, value)
{
  DISPLAY(label)
  DISPLAY(value)
}

answer ← larger(42, 27)
announce("Larger value:", answer)`,
    inputQueue: Object.freeze([]),
    robot: null,
    expectedOutput: "Larger value: 42 ",
  }),

  Object.freeze({
    id: "robot",
    name: "Robot",
    summary: "Sense a blocked square, turn, and continue along an open route.",
    concepts: Object.freeze(["CAN_MOVE", "MOVE_FORWARD", "ROTATE_LEFT", "ROTATE_RIGHT"]),
    code: `REPEAT 2 TIMES
{
  IF(CAN_MOVE(forward))
  {
    MOVE_FORWARD()
  }
  ELSE
  {
    ROTATE_RIGHT()
  }
}

ROTATE_LEFT()
IF(CAN_MOVE(forward))
{
  MOVE_FORWARD()
}`,
    inputQueue: Object.freeze([]),
    robot: Object.freeze({
      rows: 5,
      columns: 5,
      start: Object.freeze({ row: 4, column: 2, direction: "north" }),
      blocked: Object.freeze([
        Object.freeze({ row: 3, column: 2 }),
      ]),
    }),
    expectedOutput: "",
    expectedRobot: Object.freeze({ row: 3, column: 3, direction: "north" }),
  }),
]);

export function getExample(id) {
  return EXAMPLES.find((example) => example.id === id) ?? null;
}

export const examples = EXAMPLES;

export default EXAMPLES;

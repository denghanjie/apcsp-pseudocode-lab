/**
 * AP CSP reference data used by the runner's searchable reference panel.
 *
 * Official syntax and explanations are condensed from Appendix 1 of the
 * current AP Computer Science Principles Course and Exam Description. Runner
 * conveniences are intentionally exported in a separate collection below.
 */

export const SOURCE_URLS = Object.freeze({
  course: "https://apcentral.collegeboard.org/courses/ap-computer-science-principles",
  exam: "https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam",
  assessment: "https://apstudents.collegeboard.org/courses/ap-computer-science-principles/assessment",
  examDates: "https://apstudents.collegeboard.org/exam-dates",
  ced: "https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf",
  referenceInformation: "https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/subject-specific/reference-information",
});

export const COLLEGE_BOARD_SOURCES = Object.freeze([
  Object.freeze({
    id: "course",
    label: "AP Computer Science Principles course",
    url: SOURCE_URLS.course,
  }),
  Object.freeze({
    id: "exam",
    label: "AP Computer Science Principles exam",
    url: SOURCE_URLS.exam,
  }),
  Object.freeze({
    id: "assessment",
    label: "AP Computer Science Principles assessment",
    url: SOURCE_URLS.assessment,
  }),
  Object.freeze({
    id: "exam-dates",
    label: "2027 AP Exam Dates",
    url: SOURCE_URLS.examDates,
  }),
  Object.freeze({
    id: "ced",
    label: "Course and Exam Description",
    url: SOURCE_URLS.ced,
    location: "Exam Reference Sheet, Appendix 1, printed pages 213–218",
  }),
  Object.freeze({
    id: "reference-information",
    label: "Reference Information for Specific AP Exams",
    url: SOURCE_URLS.referenceInformation,
  }),
]);

const CED_SOURCE = Object.freeze({
  label: "AP CSP Course and Exam Description, Appendix 1",
  url: SOURCE_URLS.ced,
  pages: "213–218",
});

export const REFERENCE_CATEGORIES = Object.freeze([
  Object.freeze({
    id: "basics",
    name: "Basics",
    description: "Assignment, input, output, arithmetic, and numeric procedures.",
    searchTerms: Object.freeze([
      "assignment", "variable", "display", "output", "input", "arithmetic",
      "random", "mod", "remainder", "number",
    ]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "assignment",
        title: "Assignment",
        syntax: "a ← expression",
        explanation: "Evaluate expression, then assign a copy of its result to a.",
        searchTerms: Object.freeze(["assign", "arrow", "copy", "store", "variable"]),
      }),
      Object.freeze({
        id: "display",
        title: "Display",
        syntax: "DISPLAY(expression)",
        explanation: "Display the value of expression followed by one space.",
        searchTerms: Object.freeze(["display", "print", "output", "space"]),
      }),
      Object.freeze({
        id: "input",
        title: "Input",
        syntax: "value ← INPUT()",
        explanation: "Accept one value from the user and return that input value.",
        searchTerms: Object.freeze(["input", "user", "read", "value"]),
      }),
      Object.freeze({
        id: "arithmetic",
        title: "Arithmetic",
        syntax: "a + b\na - b\na * b\na / b",
        explanation: "Perform arithmetic using mathematical order of operations. Division is real-number division; 17 / 5 is 3.4.",
        searchTerms: Object.freeze(["add", "subtract", "multiply", "divide", "precedence"]),
      }),
      Object.freeze({
        id: "mod",
        title: "Remainder",
        syntax: "a MOD b",
        explanation: "Return the remainder for integer a ≥ 0 and integer b > 0. MOD has the same precedence as * and /.",
        searchTerms: Object.freeze(["mod", "remainder", "integer", "divisible"]),
      }),
      Object.freeze({
        id: "random",
        title: "Random integer",
        syntax: "RANDOM(a, b)",
        explanation: "Return an equally likely integer from a through b, including both endpoints.",
        searchTerms: Object.freeze(["random", "integer", "inclusive", "chance"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "logic",
    name: "Logic",
    description: "Relational tests and Boolean operators.",
    searchTerms: Object.freeze([
      "logic", "boolean", "true", "false", "comparison", "relational",
      "not", "and", "or",
    ]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "comparisons",
        title: "Comparisons",
        syntax: "a = b\na ≠ b\na > b\na < b\na ≥ b\na ≤ b",
        explanation: "Test the relationship between two values. Every comparison evaluates to true or false.",
        searchTerms: Object.freeze(["equal", "not equal", "greater", "less", "compare"]),
      }),
      Object.freeze({
        id: "not",
        title: "NOT",
        syntax: "NOT condition",
        explanation: "Evaluate to true when condition is false; otherwise evaluate to false.",
        searchTerms: Object.freeze(["not", "negate", "opposite", "boolean"]),
      }),
      Object.freeze({
        id: "and",
        title: "AND",
        syntax: "condition1 AND condition2",
        explanation: "Evaluate to true only when both conditions are true.",
        searchTerms: Object.freeze(["and", "both", "boolean"]),
      }),
      Object.freeze({
        id: "or",
        title: "OR",
        syntax: "condition1 OR condition2",
        explanation: "Evaluate to true when either or both conditions are true.",
        searchTerms: Object.freeze(["or", "either", "inclusive", "boolean"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "selection",
    name: "Selection",
    description: "Choose which block of statements runs.",
    searchTerms: Object.freeze(["selection", "if", "else", "condition", "branch"]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "if",
        title: "IF",
        syntax: "IF(condition)\n{\n  <block of statements>\n}",
        explanation: "Execute the block when condition is true; take no action when it is false.",
        searchTerms: Object.freeze(["if", "condition", "branch", "selection"]),
      }),
      Object.freeze({
        id: "if-else",
        title: "IF / ELSE",
        syntax: "IF(condition)\n{\n  <first block>\n}\nELSE\n{\n  <second block>\n}",
        explanation: "Execute the first block when condition is true; otherwise execute the second block.",
        searchTerms: Object.freeze(["if", "else", "otherwise", "branch", "selection"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "iteration",
    name: "Iteration",
    description: "Repeat a block a fixed number of times or until a condition is true.",
    searchTerms: Object.freeze(["iteration", "loop", "repeat", "times", "until"]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "repeat-times",
        title: "REPEAT n TIMES",
        syntax: "REPEAT n TIMES\n{\n  <block of statements>\n}",
        explanation: "Execute the block exactly n times.",
        searchTerms: Object.freeze(["repeat", "times", "counted loop", "iteration"]),
      }),
      Object.freeze({
        id: "repeat-until",
        title: "REPEAT UNTIL",
        syntax: "REPEAT UNTIL(condition)\n{\n  <block of statements>\n}",
        explanation: "Check condition before each iteration and repeat while it is false. An initially true condition runs the block zero times.",
        searchTerms: Object.freeze(["repeat", "until", "pre-test", "condition", "loop"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "lists",
    name: "Lists",
    description: "Create, copy, index, mutate, measure, and traverse ordered values.",
    searchTerms: Object.freeze([
      "list", "array", "index", "insert", "append", "remove", "length",
      "for each", "traverse", "copy",
    ]),
    source: CED_SOURCE,
    note: "AP CSP list indices begin at 1. An index below 1 or above the current list length produces an error and terminates the program.",
    entries: Object.freeze([
      Object.freeze({
        id: "list-create-copy",
        title: "Create or copy a list",
        syntax: "aList ← [value1, value2, value3]\naList ← []\naList ← bList",
        explanation: "Create an ordered list, create an empty list, or assign an independent copy of bList.",
        searchTerms: Object.freeze(["list", "literal", "empty", "copy", "create"]),
      }),
      Object.freeze({
        id: "list-index",
        title: "Read or replace an element",
        syntax: "x ← aList[i]\naList[i] ← x",
        explanation: "Access or replace the element at 1-based index i.",
        searchTerms: Object.freeze(["index", "element", "read", "replace", "one based"]),
      }),
      Object.freeze({
        id: "insert",
        title: "INSERT",
        syntax: "INSERT(aList, i, value)",
        explanation: "Shift values at indices i and greater one place right, then place value at i. Under the reference sheet's universal index rule, i must be from 1 through the current length.",
        searchTerms: Object.freeze(["insert", "shift right", "index", "add"]),
      }),
      Object.freeze({
        id: "append",
        title: "APPEND",
        syntax: "APPEND(aList, value)",
        explanation: "Increase the list length by one and place value at the end.",
        searchTerms: Object.freeze(["append", "end", "add", "push"]),
      }),
      Object.freeze({
        id: "remove",
        title: "REMOVE",
        syntax: "REMOVE(aList, i)",
        explanation: "Remove the element at i and shift all later elements one place left.",
        searchTerms: Object.freeze(["remove", "delete", "shift left", "index"]),
      }),
      Object.freeze({
        id: "length",
        title: "LENGTH",
        syntax: "LENGTH(aList)",
        explanation: "Return the number of elements currently in aList.",
        searchTerms: Object.freeze(["length", "size", "count", "list"]),
      }),
      Object.freeze({
        id: "for-each",
        title: "FOR EACH",
        syntax: "FOR EACH item IN aList\n{\n  <block of statements>\n}",
        explanation: "Assign item each list value in order, from first to last, and execute the block once per value.",
        searchTerms: Object.freeze(["for each", "traverse", "loop", "item", "list"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "procedures",
    name: "Procedures",
    description: "Name reusable blocks, pass arguments, and optionally return a value.",
    searchTerms: Object.freeze([
      "procedure", "function", "call", "parameter", "argument", "return",
    ]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "procedure",
        title: "Define and call a procedure",
        syntax: "PROCEDURE procName(parameter1, parameter2)\n{\n  <block of statements>\n}\n\nprocName(arg1, arg2)",
        explanation: "Define a procedure with zero or more parameters. A call assigns arguments to parameters in order and runs the block.",
        searchTerms: Object.freeze(["procedure", "define", "call", "parameter", "argument"]),
      }),
      Object.freeze({
        id: "return",
        title: "Return a value",
        syntax: "RETURN(expression)\n\nresult ← procName(arg1, arg2)",
        explanation: "Immediately return expression and resume at the calling statement. RETURN may appear anywhere inside the procedure.",
        searchTerms: Object.freeze(["return", "result", "value", "early return"]),
      }),
    ]),
  }),

  Object.freeze({
    id: "robot",
    name: "Robot",
    description: "Move and turn on a supplied grid, or sense an adjacent square.",
    searchTerms: Object.freeze([
      "robot", "grid", "move", "forward", "rotate", "left", "right",
      "backward", "open", "blocked",
    ]),
    source: CED_SOURCE,
    entries: Object.freeze([
      Object.freeze({
        id: "robot-actions",
        title: "Move and rotate",
        syntax: "MOVE_FORWARD()\nROTATE_LEFT()\nROTATE_RIGHT()",
        explanation: "Move one square in the facing direction, or rotate in place 90 degrees counterclockwise or clockwise.",
        searchTerms: Object.freeze(["move forward", "rotate left", "rotate right", "turn"]),
      }),
      Object.freeze({
        id: "can-move",
        title: "Sense an open square",
        syntax: "CAN_MOVE(direction)",
        explanation: "Return true when the adjacent square in the relative direction is open. direction is left, right, forward, or backward.",
        searchTerms: Object.freeze(["can move", "sense", "open", "left", "right", "forward", "backward"]),
      }),
      Object.freeze({
        id: "blocked-move",
        title: "Blocked move",
        syntax: "MOVE_FORWARD()",
        explanation: "If the destination is blocked or beyond the grid, the robot stays put and the program terminates.",
        searchTerms: Object.freeze(["blocked", "wall", "edge", "error", "terminate"]),
      }),
    ]),
  }),
]);

export const COURSE_EXAM_FACTS = Object.freeze({
  schoolYear: "2026–27",
  checkedOn: "2026-08-31",
  items: Object.freeze([
    Object.freeze({
      id: "common-notation",
      label: "Common exam notation",
      fact: "AP CSP does not designate one programming language. The Exam Reference Sheet supplies common text-based and block-based constructs for assessment.",
      sourceUrl: SOURCE_URLS.ced,
      sourceLocation: "Instructional Approaches, printed page 131",
    }),
    Object.freeze({
      id: "big-idea-weight",
      label: "Algorithms and Programming",
      fact: "Big Idea 3 accounts for 30–35% of the multiple-choice section.",
      sourceUrl: SOURCE_URLS.ced,
      sourceLocation: "Exam Information, printed page 164",
    }),
    Object.freeze({
      id: "exam-delivery",
      label: "End-of-course exam",
      fact: "The current end-of-course exam is fully digital in the Bluebook testing app.",
      sourceUrl: SOURCE_URLS.exam,
    }),
    Object.freeze({
      id: "exam-format",
      label: "Exam format",
      fact: "Section I has 70 multiple-choice questions in 120 minutes and is 70% of the score. Section II includes the Create performance task and two written-response questions completed in 60 minutes and is 30%.",
      sourceUrl: SOURCE_URLS.exam,
    }),
    Object.freeze({
      id: "create-time",
      label: "Create performance task",
      fact: "Schools provide at least 9 hours of in-class time for the Create performance task.",
      sourceUrl: SOURCE_URLS.exam,
    }),
    Object.freeze({
      id: "create-deadline",
      label: "2027 Create deadline",
      fact: "The 2026–27 Create performance task submission deadline is April 30, 2027, at 11:59 p.m. ET.",
      sourceUrl: SOURCE_URLS.assessment,
    }),
    Object.freeze({
      id: "exam-date",
      label: "2027 exam date",
      fact: "The AP CSP end-of-course exam is scheduled for May 14, 2027, in Session 1; the local AP coordinator provides the exact time and location.",
      sourceUrl: SOURCE_URLS.examDates,
    }),
    Object.freeze({
      id: "reference-access",
      label: "Exam reference access",
      fact: "AP CSP reference material is available in Bluebook and is also printed and mailed to schools for exam day.",
      sourceUrl: SOURCE_URLS.referenceInformation,
    }),
    Object.freeze({
      id: "reference-status",
      label: "2027 reference status",
      fact: "As checked on August 31, 2026, College Board says 2027 booklet links will be posted in September; meanwhile, the CED appendix contains the same reference information.",
      sourceUrl: SOURCE_URLS.referenceInformation,
    }),
  ]),
});

export const RUNNER_CONVENIENCES = Object.freeze([
  Object.freeze({
    id: "line-comments",
    title: "Line comments",
    runnerSyntax: "// explanation",
    officialSyntax: null,
    explanation: "The runner ignores text after //. Appendix 1 does not define comment syntax.",
    searchTerms: Object.freeze(["comment", "notes", "slash"]),
  }),
  Object.freeze({
    id: "ascii-assignment",
    title: "ASCII assignment alias",
    runnerSyntax: "a <- expression",
    officialSyntax: "a ← expression",
    explanation: "Use <- when the official assignment arrow is inconvenient to type.",
    searchTerms: Object.freeze(["ascii", "alias", "assignment", "arrow"]),
  }),
  Object.freeze({
    id: "ascii-comparisons",
    title: "ASCII comparison aliases",
    runnerSyntax: "a != b\na >= b\na <= b",
    officialSyntax: "a ≠ b\na ≥ b\na ≤ b",
    explanation: "The runner accepts keyboard-friendly aliases; the symbols at right are the official notation.",
    searchTerms: Object.freeze(["ascii", "alias", "not equal", "greater", "less"]),
  }),
]);

export const DISCLAIMER = Object.freeze({
  short: "Unofficial practice tool; always defer to current College Board materials.",
  details: Object.freeze([
    "This runner is an independent educational aid and is not affiliated with or endorsed by College Board.",
    "Its AP Core reference follows Appendix 1 of the current AP CSP Course and Exam Description, but College Board does not define every lexical or runtime detail needed for a complete interpreter.",
    "Input parsing, display formatting for compound values, expression precedence beyond the stated arithmetic rules, procedure scope, traversal during list mutation, and execution safety limits are documented runner decisions rather than exam rules.",
    "AP, Advanced Placement, and AP Computer Science Principles are trademarks of College Board.",
  ]),
});

export const referenceCategories = REFERENCE_CATEGORIES;

export default REFERENCE_CATEGORIES;

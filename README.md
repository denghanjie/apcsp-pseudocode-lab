# Pseudocode Lab

Pseudocode Lab is a dependency-free, browser-based runner for the text notation in the AP Computer Science Principles Exam Reference Sheet. It is an independent study tool and is not affiliated with or endorsed by College Board.

## Open the app

The easiest option is to double-click `index.html`. On macOS, you can also double-click `start.command`.

No installation, account, network connection, or build step is required for the standalone app.

To inspect a program one statement at a time, choose **Step** or press `F10`. The highlighted row is the next statement to execute; the Console, State, and Robot tabs show the effects of all statements completed so far. While paused, **Run** becomes **Continue**, and **Reset execution** leaves the source code unchanged.

## What the runner supports

- Assignment with `←` (plus the convenience alias `<-`)
- `DISPLAY(expression)` and queued `INPUT()` values
- Arithmetic, `MOD`, inclusive `RANDOM(a, b)`, comparisons, `NOT`, `AND`, and `OR`
- `IF` / `ELSE`, `REPEAT n TIMES`, and pre-test `REPEAT UNTIL`
- Strict 1-based lists, list-copy assignment, indexing, `INSERT`, `APPEND`, `REMOVE`, `LENGTH`, and `FOR EACH`
- Procedures, parameters, calls, and `RETURN`
- `MOVE_FORWARD`, `ROTATE_LEFT`, `ROTATE_RIGHT`, and `CAN_MOVE(direction)` with an animated grid view
- Statement-by-statement debugging with **Step** / `F10`, source-line highlighting, and live global, list, and procedure-local state
- Source-linked syntax/runtime errors and a 100,000-step safety limit

The app also accepts `//` line comments and the ASCII comparison aliases `!=`, `>=`, and `<=`. These are runner conveniences, not notation defined by the Exam Reference Sheet.

## Important AP CSP context (checked August 31, 2026)

AP CSP does not designate one classroom programming language. College Board says the Exam Reference Sheet establishes a common way to communicate programming concepts for the exam. The course still expects students to learn and use an appropriate real text- or block-based language for their Create performance task.

The five current big ideas and multiple-choice weightings are:

| Big idea | Weighting |
| --- | ---: |
| Creative Development | 10–13% |
| Data | 17–22% |
| Algorithms and Programming | 30–35% |
| Computer Systems and Networks | 11–15% |
| Impact of Computing | 21–26% |

For 2026–27, the end-of-course exam is fully digital in Bluebook. The 70-question, 120-minute multiple-choice section is 70% of the score. The Create performance task and 60-minute written-response portion account for 30%. The Create submission deadline is April 30, 2027 at 11:59 p.m. ET; the exam is May 14, 2027, Session 1.

## Official sources

- [AP CSP course page](https://apcentral.collegeboard.org/courses/ap-computer-science-principles)
- [AP CSP assessment page](https://apstudents.collegeboard.org/courses/ap-computer-science-principles/assessment)
- [Course and Exam Description PDF](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf) — Appendix 1, printed pages 213–218
- [Reference information for specific AP exams](https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/subject-specific/reference-information)
- [2027 AP exam dates](https://apstudents.collegeboard.org/exam-dates)

As of August 31, 2026, College Board says 2027 reference-booklet links will be posted in September; it directs students to use the same reference information in the current Course and Exam Description in the meantime.

## Source development

The standalone `index.html` is built from readable source files in `src/` plus `app.html` and `styles.css`.

```bash
npm test
npm run build
npm run serve
```

The build and tests use only Node.js built-ins. The app itself has no dependencies.

See `QA.md` for the automated, browser, responsive, and concept-fidelity verification record.

## Interpreter decisions beyond the reference sheet

The Exam Reference Sheet is an instruction reference rather than a complete language specification. This runner therefore documents its choices for input parsing, strings, comments, expression precedence, procedure scope, iteration during list mutation, error messages, and execution limits. These choices are learning-oriented implementation details, not College Board rules. When anything differs, defer to the current official materials and your AP teacher.

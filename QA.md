# Pseudocode Lab QA record

Checked August 31, 2026 against the current College Board AP Computer Science Principles pages and the Exam Reference Sheet in Appendix 1 of the current Course and Exam Description.

## Automated verification

- Interpreter suite: 34 tests passed, 0 failed.
- Statement debugger coverage includes straight-line effects, nested branches, loop-iteration boundaries, procedure step-in and locals, paused `INPUT()`, runtime-error state, immutable snapshots, and full-run parity.
- Shipped examples: all six matched their exact expected output; the robot example also matched row 3, column 3, facing north.
- Source syntax: `src/interpreter.js` and `src/app.js` pass Node syntax checks.
- Standalone build: `index.html` is self-contained, has no runtime-relative JavaScript or CSS resources, and its exact inline app script parses successfully.
- Build guard: `build.mjs` parses the classic-script payload before writing `index.html`, preventing packaging-only syntax regressions.

## Browser verification

The final standalone `index.html` was tested in the in-app browser at 1536×1024 and 390×844.

- Default example completed with 139 steps and 11 displayed values; its empty state was fully hidden.
- **Step** and `F10` paused before the first executable statement, advanced through nested loop and procedure bodies, and highlighted the next source row without stealing editor focus.
- The live State view showed prior-statement effects, changed scalar values, 1-based list entries, and active procedure locals/call frames; Robot motion updated only after its source statement executed.
- **Continue** finished the same paused execution, **Reset run** preserved source text, and the editor/input queue remained copyable but read-only while debugging.
- Queued `INPUT()` selected the expected conditional branch, and an empty queue opened the live input dialog.
- A paused `INPUT()` resumed exactly once after a supplied value and reported one consumed input.
- Robot example finished at row 3, column 3, facing north.
- An invalid 1-based list access produced a structured error; clicking it selected the exact failing source line.
- Stop halted an intentionally infinite loop while the runner remained responsive.
- Searching the reference for `RANDOM` returned only `RANDOM(a, b)`.
- About displayed the current five big-idea weightings, 2026–27 assessment facts, 2027 Create deadline, and 2027 exam date.
- Mobile layout had no horizontal overflow; editor, output, summary, reference, and examples navigation remained usable.
- At both desktop and mobile breakpoints, Run/Step/Reset and Continue/Step/Reset run fit without overflow; Console/State/Robot tabs also supported arrow-key navigation.

## Fidelity ledger

Accepted concepts:

- `design/desktop-concept.png`
- `design/reference-drawer-concept.png`

Final browser renders:

- `design/final-desktop.png`
- `design/final-reference.png`
- `design/final-mobile.png`
- `design/final-mobile-results.png`

| Comparison point | Result |
| --- | --- |
| Primary geometry | At the concept's native 1536×1024 size, the final uses the same 306 px examples rail, 718 px editor, 510 px results pane, 90 px header, and 66 px status bar rhythm. |
| Palette and surfaces | Navy rail, white work surfaces, blue selection/action color, pale green success state, gray rules, and restrained shadows match the accepted system. |
| Typography and code | UI hierarchy, monospaced editor/output, blue keywords, red strings, purple numbers, line-number gutter, and compact app chrome were matched and audited. |
| Controls and icons | Run/Stop/Reset, examples, tabs, reference/about actions, copy controls, status indicator, and theme control use a consistent outlined icon system and working states. |
| Reference drawer | Final geometry matches the concept: 528 px wide, begins below the header, ends above the status bar, keeps the global chrome visible, and highlights the Reference action while open. |
| Responsive behavior | At 390×844 the examples rail becomes an accessible drawer, controls remain tap-sized, editor/results stack cleanly, and there is no horizontal overflow. |
| Above-the-fold copy | Product name, subtitle, examples, workspace filename, action labels, result tabs, syntax-help prompt, input label, summary title, and status copy match the accepted information architecture. |

Intentional accuracy deviations from the image-generated concept:

- The concept's sample combined strings, numbers, and a list into single output expressions. The final default program uses only implemented Exam Reference Sheet constructs and separate `DISPLAY` calls, so output appears as 11 faithful values instead of four illustrative lines.
- The concept's leading `//` comment was removed from the default example because comments are documented as a runner convenience, not official Exam Reference Sheet notation.
- Decorative desktop-only chevrons, a keyboard icon, and an inert menu glyph were omitted rather than shipping controls without a real action.
- The execution summary reports values the runner actually measures (steps, inputs, outputs, and time) instead of invented concept metrics.

No material visual or interaction mismatches remain after the final concept-to-render inspection.

# NoaCG Flow Lab - deterministic authoring and simulation tutorial

## Live prototype

https://miwco.github.io/noacg-flow-lab/

## What this version adds

- Flow JSON v2 with automatic version 1 migration.
- Explicitly ordered branches for transitions sharing a source and event.
- Typed AND/OR condition groups and typed event payloads.
- One draft-based transition editor with Save and Discard.
- Design and Simulate modes using the same runtime.
- Branch traces, rejected-condition explanations, Reset, and Step Back.
- Rich legal-event descriptors for generic and specialized operator controls.
- Independent Flow controller contracts for future package composition.
- Standalone quiz and lower-third renderers using v2 semantics.
- Visual event and variable contract editors with generated-control previews.
- Locally saved simulation scenarios with clean replay and selectable history.

## Step-by-step workflow

1. Choose **Quiz reference** and remain in **Design** mode.
2. Select **Reveal correct** or **Reveal wrong** in the decision-branch strip.
3. Review its priority. Lower numbers are considered first for the same source and event.
4. Add predicates and choose **All conditions (AND)** or **Any condition (OR)**. Conditions cannot contain scripts or deeper nesting.
5. Save the complete transition draft. Flow health blocks duplicate priorities, duplicate conditions, and unconditional branches that are not last.
6. Prepare permitted data in **Runtime data**. Data editing remains separate from transitions and locks on air.
7. Switch to **Simulate**. Structural editing is locked and only legal operator actions are displayed.
8. Run Take, select an answer, Lock, and Reveal. The Inspector explains every considered branch and shows which predicates passed or failed.
9. In **Data contracts**, select an event or variable. Configure its type, options, required status, numeric limits, operator access, or animation-completion source. Review the generated generic control before using the contract.
10. Use **Step back** to restore the exact state and variables before the most recent event. Select any event in **Event history** to review its trace.
11. Save the current run as a scenario. Replaying it always starts with a clean runtime and preserves the original typed payloads.
12. Export normalized v2 JSON or a standalone HTML player. Invalid projects cannot be exported or simulated.
13. Load **Lower third** to confirm the same runtime contract supports a different graphic and control panel.

## Future package direction

Each Flow controls one independent graphic. A future whole-broadcast control room will compose multiple Flow controllers and their legal-event descriptors without creating combined states such as `QUIZ_ON_LOWER_THIRD_OFF`.

## Video tutorial

Render the aligned overview with `npm run video:render`. The published video is available at `/tutorial2.mp4`.

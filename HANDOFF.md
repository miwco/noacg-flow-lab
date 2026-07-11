# Fresh-session handoff - NoaCG Flow Lab

Copy the prompt below into a new coding session after opening this repository.

---

You are continuing work on NoaCG Flow Lab, an experimental static Next.js application for visually authoring the behavior of live HTML broadcast graphics.

Start by reading `AGENTS.md`, `CLAUDE.md`, `README.md`, `tutorial2.md`, and this file. Inspect the current `main` branch before changing anything.

## What exists now

- Live app: https://miwco.github.io/noacg-flow-lab/
- Typed, React-independent Flow schema/runtime/validation in `src/flow/`.
- State-first graph editor with transition inspector, local persistence, JSON import/export, and a standalone HTML player export.
- Transition editor: change label, source, destination, event, one simple condition, and named actions. It can delete transitions.
- Two reference flows: a quiz and an interview lower third.
- Operator and authoring help under the `?` button.
- A fitted 16:9 preview canvas. Do not regress the full quiz output: all four answer rows must remain visible.
- Remotion video source in `src/remotion` and `public/tutorial2.mp4`.

## Product principles that must not change

1. States are stable on-air situations. Changing data belongs in variables.
2. The primary graph remains states and meaningful transitions. Do not turn ordinary actions into a spaghetti graph.
3. Flow defines when and why behavior occurs. It is not the animation timeline or a general JavaScript programming environment.
4. Operator actions must be derived from the runtime and only show legal actions.
5. Keep the app static and deployable to GitHub Pages and Vercel with no backend or secrets.

## Safer authoring iteration completed

The transition editor now stages edits with Save and Discard, provides a readable summary, supports typed value sources, and blocks duplicate or impossible routes. Explicitly permitted runtime variables can be edited before Take. Standalone exports select a quiz or lower-third renderer contract, and focused validation/export tests cover the new behavior.

The transition strip remains as a reliable fallback because global and parallel conditional transitions are not always easy to select as visual edges. Do not remove it until edge selection preserves that clarity.

## Previous recommendation

## Current implementation workflow

1. Consolidate transition authoring and remove immediate-edit paths.
2. Migrate projects to deterministic Flow JSON v2 with bounded condition groups and typed event payloads.
3. Expose rich legal-event descriptors and independent Flow controllers.
4. Add Design and Simulate modes with branch explanations and reversible history.
5. Align standalone export with the same v2 runtime semantics.
6. Prepare package composition contracts without building package control UI yet.

The next highest-value iteration is **make the authoring loop safer and more expressive without adding breadth**:

1. Improve the transition editor UX.
   - Add a readable transition summary and unsaved-change feedback.
   - Support typed literal values for conditions and set-variable actions.
   - Add a duplicate-transition check and more helpful validation when an edited transition becomes impossible.
   - Replace the temporary transition strip with reliable selectable visual graph edges only if it can be done without reducing clarity.
2. Add a small data-control surface for editable runtime variables.
   - Let the operator change permitted data values before Take.
   - Keep editing separate from state transitions.
3. Strengthen the standalone HTML proof.
   - Add a minimal graphic renderer contract so the exported player can render the quiz and lower third more faithfully, not just its generic runtime UI.
4. Add tests for edited-project validation and standalone export behavior.

Do not start a third graphic type until these points are complete. Validate with `npm test`, `npm run lint`, `npm run build`, browser checks at desktop and phone widths, and `npm run video:render` if the tutorial becomes inaccurate. Commit with clear human-readable messages and push `main` only after validation.

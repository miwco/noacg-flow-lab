# NoaCG Flow Lab

An experimental, standalone prototype for authoring the behavior of live HTML broadcast graphics.

NoaCG Studio will eventually cover the graphic's design and animation. Flow Lab explores the missing behavioral layer: what stable states a graphic has, what operators may do, which transitions are legal, and what data changes along the way.

> Design defines what a graphic looks like. Timeline defines how it animates. Flow defines when and why it happens.

## Current prototype

The reference project is an original, broadcast-inspired quiz graphic. It implements the full live workflow:

`OFF → QUESTION → SELECTED → LOCKED → RESULT`

- Take a question on air, choose and re-choose an answer, lock it, and reveal correct or wrong outcomes.
- Operator controls are derived from the active state and guarded by the runtime. Impossible actions are omitted rather than silently ignored.
- The state graph highlights the live state and most recently fired transition.
- States, transitions, variables, conditions, and actions can be inspected. State names and descriptions are editable; states and variables can be added; nodes can be moved; graph handles create new connections.
- Guided authoring starts by modifying a working reference and can continue from a deliberately minimal blank Flow.
- Transition creation opens a complete draft in one stable Inspector; visible handles connect states without browser prompts.
- The Graphic connection panel explains the state, variable, and named-animation contract received by the continuously mounted renderer.
- Projects persist in browser local storage and can be exported/imported as readable JSON.
- Transition edits are staged, summarized, type-aware, and checked for impossible or duplicate routes before save.
- Permitted runtime data can be prepared before Take without turning data changes into state transitions.
- Standalone HTML export includes renderer contracts for both reference graphics.
- Flow JSON v2 gives guarded branches explicit priority, supports bounded AND/OR conditions, and migrates version 1 projects on load.
- Design and Simulate modes share one runtime; simulation explains branch decisions and supports stepping back.
- Legal-event descriptors carry typed payload and presentation metadata for generic or specialized controls.
- Event and variable contracts are authored visually with types, options, required fields, ranges, and generated-control previews.
- Simulation runs can be saved locally as scenarios, replayed from a clean runtime, and inspected through a selectable event timeline.
- A separate Control Room proof composes quiz and lower-third instances with isolated state, shared monitoring, specialized controls, and generic fallbacks.
- Desktop is a working creative-tool layout. Phone layouts intentionally switch between Preview, Flow, Controls, and Inspect modes.

## Behavioral model

The reusable model is in [`src/flow`](src/flow):

| Concept | Meaning |
| --- | --- |
| State | A stable, meaningful on-air condition, such as `LOCKED`. |
| Event | An operator action or external trigger, such as `REVEAL`. |
| Transition | A legal route from a source state to a destination state for an event. |
| Variable | Changing data, such as `selectedAnswer`, kept separate from state. |
| Condition group | A bounded set of typed predicates combined with AND or OR. |
| Action | A generic effect: set a variable, play a named animation, or emit an event. |

The engine is deliberately React-free. The UI projects it into React Flow, the preview consumes the resulting runtime state, and a future compiler can consume the same JSON. The engine does not contain quiz-specific commands such as `selectQuizAnswer`.

## Technical decisions

- **Next.js + TypeScript**: static, Vercel-ready frontend with no backend, database, sign-in, or secrets.
- **React Flow / xyflow**: a mature pan/zoom/draggable graph surface, used only for authoring presentation. It is not the flow runtime.
- **State graph first**: actions remain concise transition details in the inspector. This avoids a low-level node-programming surface for normal broadcast behavior.
- **Variables are not states**: `SELECTED` plus `selectedAnswer = C` remains one meaningful stable state rather than four answer-specific states.
- **Named animations now**: Flow can trigger `question-in` or `correct-reveal` without pretending to be an animation timeline. A timeline system can later implement those names.

The approach is informed by Rive's compact state/transition/input model and broadcast Transition Logic's separation of graphics structure from changing content. It intentionally avoids the unrestricted execution graph of a general-purpose visual programming system.

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test and build

```bash
npm test       # flow runtime scenarios
npm run lint   # ESLint
npm run build  # Vercel production build
```

The tests cover runtime legality, guarded branches, emitted events, controller isolation, v1 migration, data-contract validation, and standalone export behavior.

## Deploy to Vercel

Import this repository into Vercel, select the default Next.js preset, and deploy. No configuration or environment variables are needed. The root route is static, so refresh and direct navigation work without server state.

## Deliberate limitations

- The quiz preview is a reference renderer, not a general design editor.
- Conditions deliberately stop at one AND/OR group and do not allow arbitrary scripts or nested expressions.
- Actions are typed but only preview-facing animation and variable actions are demonstrated.
- Reference renderers are still pre-wired. Editable design-layer slot binding remains future work, but the contract and current mappings are visible to authors.
- The standalone HTML player proves portable Flow JSON execution and reference rendering, but is not a playout-system compatibility claim.

## Direction

One Flow remains one independently operated graphic. The Control Room proof composes isolated Flow instances through their controller contracts rather than combining every graphic into one state machine. Regions and cross-graphic automation remain deliberately deferred.

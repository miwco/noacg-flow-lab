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
- Projects persist in browser local storage and can be exported/imported as readable JSON.
- Desktop is a working creative-tool layout. Phone layouts intentionally switch between Preview, Flow, Controls, and Inspect modes.

## Behavioral model

The reusable model is in [`src/flow`](src/flow):

| Concept | Meaning |
| --- | --- |
| State | A stable, meaningful on-air condition, such as `LOCKED`. |
| Event | An operator action or external trigger, such as `REVEAL`. |
| Transition | A legal route from a source state to a destination state for an event. |
| Variable | Changing data, such as `selectedAnswer`, kept separate from state. |
| Condition | An optional guard evaluated before a transition runs. |
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

The runtime tests cover valid take, invalid reveal from OFF, changing selections, invalid lock, protected post-lock selection, both reveal branches, reset, and non-corruption after rejected actions.

## Deploy to Vercel

Import this repository into Vercel, select the default Next.js preset, and deploy. No configuration or environment variables are needed. The root route is static, so refresh and direct navigation work without server state.

## Deliberate limitations

- The quiz preview is a reference renderer, not a general design editor.
- Conditions currently cover simple variable comparisons and set/not-set checks.
- Actions are typed but only preview-facing animation and variable actions are demonstrated.
- Connection creation and basic state/variable editing are intentionally lightweight. Rich transition/action authoring needs further UX research before expanding it.
- This version exports/imports Flow JSON; a standalone HTML compiler is the next technical experiment, not a claim of playout-system compatibility.

## Direction

Future iterations should validate this model against lower thirds, scoreboards, timers, data updates, and multi-layer graphics before integration into NoaCG Studio. Likely additions include richer conditions, external data and timer events, animation-completion events, reusable behavior patterns, and a platform-neutral Flow JSON-to-HTML runtime compiler.

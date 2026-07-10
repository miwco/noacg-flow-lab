# NoaCG Flow Lab - video tutorial brief

## Purpose

Create a short product tutorial showing the current NoaCG Flow Lab prototype. The video should make one idea clear: **Flow defines when and why a live graphic behaves, while Design and Timeline are separate future layers.**

## Live site

Use this URL for all browser recording and interaction:

https://miwco.github.io/noacg-flow-lab/

## Recording direction

- Record at a desktop viewport first, preferably 16:9 at 1920×1080.
- Use a polished creative-software tone: calm, confident, broadcast-aware, not developer-oriented.
- Keep pauses short after each click so the preview animation is visible.
- Cursor movement should be deliberate. Do not quickly sweep across the UI.
- Record a second pass at a narrow phone viewport only for the mobile section.
- The tutorial should be around 2-3 minutes. Use clean cuts rather than showing every pause or page reload.

## Core terminology to use exactly

- **State**: a stable on-air situation, for example `QUESTION` or `LOCKED`.
- **Variable**: changing data, for example `selectedAnswer`. Variables are not states.
- **Transition**: a legal route between states, triggered by an operator action or event.
- **Condition**: a rule that protects a transition, for example an answer must exist before `LOCK` is available.
- **Action**: a transition effect, such as setting a variable or playing a named animation.

Do not describe the app as a generic node-programming tool, a drawing app, or an animation timeline.

---

## Suggested edit and narration script

### Scene 1 - Introduce the workspace

**Screen:** Open the live site at its initial OFF state. Show the entire desktop workspace for 3-4 seconds.

**Point out:**

- Live Preview at left
- State Graph in the center
- Operator Controls and Inspector at right
- Runtime variables below the preview

**Voiceover:**

> This is NoaCG Flow Lab - an experiment in defining how a live HTML graphic behaves. The preview shows the output, the graph shows the behavior, and the operator controls only expose actions that are legal right now.

### Scene 2 - Explain the initial state

**Screen:** Keep the application in `OFF`. Highlight the `OFF` state in the graph and the `Take` control.

**Voiceover:**

> The graphic starts in the OFF state. Only Take is available, because the graphic is not yet on air. The active state is highlighted in the graph and repeated in the preview header.

### Scene 3 - Take the graphic on air

**Action:** Click **Take** once. Pause to show the question and answers animate in.

**Screen:** Show the preview, the active `QUESTION` state, and the Inspector, which should now show the Take transition.

**Voiceover:**

> Take moves the graphic from OFF to QUESTION. The transition plays the named question-in animation. Notice that the Inspector explains the trigger, source state, destination state, condition, and actions - without filling the graph with low-level operation nodes.

### Scene 4 - Select and change an answer

**Action:** Click **A**, pause briefly, then click **C**.

**Screen:** Keep the preview and Runtime panel in view. Show that `selectedAnswer` changes from A to C and that the preview selection follows it.

**Voiceover:**

> Selecting an answer moves the graphic to SELECTED and stores the choice in selectedAnswer. Choose another answer before locking, and the variable changes while the graphic stays in the same meaningful state. This is the key distinction: values change as variables, not as extra states such as Selected A, Selected B, Selected C, and Selected D.

### Scene 5 - Inspect the selection transition

**Action:** Click the **SELECT_ANSWER** label in the transition rail, or click the current transition in the graph if it is visible.

**Screen:** Focus on the Inspector.

**Voiceover:**

> This transition receives the operator action, sets selectedAnswer from its value, plays an answer animation, and arrives in SELECTED. Details live in the Inspector so the primary graph remains readable at a glance.

### Scene 6 - Lock the answer

**Action:** Click **Lock**.

**Screen:** Show the locked preview styling, active `LOCKED` state, and only the legal controls.

**Voiceover:**

> Lock is available only after an answer has been selected. Once locked, changing the answer is no longer possible. Flow Lab protects the operator from invalid actions instead of leaving them enabled and silently ignoring them.

### Scene 7 - Reveal the correct branch

**Action:** Click **Reveal** while C is selected.

**Screen:** Pause on the correct result. Show `RESULT` as the active state and the Inspector condition for Reveal.

**Voiceover:**

> Reveal compares selectedAnswer with correctAnswer. In this run, C is correct, so the correct reveal branch plays and the result is shown.

### Scene 8 - Demonstrate the wrong branch

**Action:** Click **Reset**. Then click **Take**, click **A**, click **Lock**, then click **Reveal**.

**Screen:** Pause on the wrong-result preview where A is wrong and C is shown as correct.

**Voiceover:**

> The same Reveal event can take a different guarded branch. When the selected answer is wrong, the graphic marks that answer as wrong and shows the actual correct answer.

### Scene 9 - Take out and reset

**Action:** From the result, click **Take out**. Then repeat the flow briefly until a non-OFF state and click **Reset**.

**Screen:** Show the preview returning to OFF and `selectedAnswer` returning to an empty value.

**Voiceover:**

> Take out removes the graphic from air. Reset is a global safety action that restores the initial state and clears the selected answer.

### Scene 10 - Show editability and persistence

**Action:**

1. Click a state node such as `QUESTION`.
2. Edit its Name or Description in the Inspector. Do not permanently change the demo project unless the recording is disposable.
3. Drag a node to a new position.
4. Click **State** and demonstrate the browser prompt for adding a state. Cancel the prompt unless you want to show creation.
5. Click **Define variable** and show the prompt. Cancel it.
6. Hover over the Export Flow JSON icon in the top-right toolbar. Do not trigger a browser download unless the video needs to show it.

**Voiceover:**

> This is a working prototype, not a static mockup. States can be inspected, renamed, and moved. New states and variables can be added, and the project persists locally in the browser. Flow projects can also be exported and imported as readable JSON.

### Scene 11 - Mobile use

**Screen:** Switch to a narrow phone viewport and reload the same URL. Show the four mobile tabs: Preview, Flow, Controls, and Inspect.

**Action:**

1. Open **Controls**.
2. Click **Take**.
3. Select an answer.
4. Return to **Preview**.
5. Open **Flow** to show the graph can still be viewed.

**Voiceover:**

> On a phone, Flow Lab switches to focused workspace modes. The key operator workflow remains comfortably usable: preview the graphic, take it on air, select an answer, lock it, reveal it, and inspect the current logic.

### Scene 12 - Close

**Screen:** Return to the clean OFF state. Frame the preview, graph, and controls together.

**Voiceover:**

> NoaCG Flow Lab is testing a simple proposition: live graphics behavior should be understandable as states, transitions, variables, and operator actions - before it becomes complex code.

**End card text:**

> NoaCG Flow Lab
> A visual behavioral model for live HTML graphics
> https://miwco.github.io/noacg-flow-lab/

---

## Current prototype boundaries - do not overstate in the video

- It is a standalone experiment, not integrated with NoaCG Studio.
- The quiz is the first reference graphic, not a quiz-specific engine.
- Named animation actions are predefined references, not a full timeline editor.
- The graph supports meaningful inspection, node movement, state addition, basic connection creation, and event assignment. Full visual authoring of arbitrary conditions and action sequences is a next-step feature.
- No playout-system export, SPX integration, CasparCG integration, or standalone HTML compiler is shown in this tutorial.

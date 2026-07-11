# NoaCG Flow Lab - current build tutorial script

## Tutorial goal

Show how NoaCG Flow Lab separates graphic design, changing data, and on-air behavior. By the end, the viewer should understand how to author and validate a Flow, simulate its operator workflow, save a repeatable scenario, export it, and operate two independent graphics from the Control Room.

## Suggested format

- Duration: 7 to 9 minutes
- Capture size: 1920 by 1080
- Begin with the Quiz reference in Design mode
- Use deliberate cursor movement and pause briefly after state changes
- Keep the state graph, operator controls, and Inspector visible whenever possible

## Scene 1 - What Flow Lab controls

### On screen

Open NoaCG Flow Lab. Hold on the complete desktop workspace.

### Narration

"NoaCG Flow Lab is an experimental authoring tool for the behavioral layer of live HTML broadcast graphics.

Design defines what a graphic looks like. A timeline defines how it animates. Flow defines when and why its behavior occurs.

The central rule is simple: stable on-air situations are states, while changing content belongs in variables."

### On-screen callouts

- States are stable situations
- Variables are changing data
- Events request behavior
- Only legal operator actions are shown

## Scene 2 - Read the quiz Flow

### On screen

Select **Quiz reference**. Move across the graph from OFF to RESULT.

Highlight these states in order:

`OFF -> QUESTION -> SELECTED -> LOCKED -> RESULT`

### Narration

"The quiz is modeled as five meaningful broadcast states.

OFF means nothing is on air. QUESTION shows the question. SELECTED means an answer has been chosen but may still change. LOCKED commits the choice. RESULT displays the reveal.

There are not four separate states for answers A, B, C, and D. The selected answer is changing data, so it remains a variable."

### Demonstration

Select the OFF state and briefly edit its description without saving unrelated changes. Explain that state names and descriptions describe stable situations.

## Scene 3 - Understand deterministic decision branches

### On screen

Select **Reveal correct** from the Decision branches strip.

Show:

- Event: REVEAL
- From: locked
- To: result
- Priority: 0
- Condition comparing `selectedAnswer` with `correctAnswer`

Then select **Reveal wrong** and show its lower-priority fallback.

### Narration

"Transitions sharing the same source and event form an ordered decision group.

Lower priority numbers are considered first. When REVEAL is received from LOCKED, Flow first checks whether the selected answer equals the correct answer. If that condition fails, the later unconditional branch handles the wrong result.

This order is explicit. Runtime behavior never depends on a hidden array position."

### On-screen callout

`REVEAL from LOCKED`

1. Priority 0 - correct condition
2. Priority 10 - wrong fallback

## Scene 4 - Edit a transition safely

### On screen

Keep **Reveal correct** selected and scroll to **Edit transition**.

Change its label temporarily, then show **Unsaved changes**. Press **Discard**.

Add a second condition, switch between:

- All conditions (AND)
- Any condition (OR)

Remove the temporary condition and leave the project unchanged.

### Narration

"Transition editing uses a draft. Changes do not affect the saved project until Save transition is pressed.

A condition group may require all predicates or any predicate. Values can come from typed literals, variables, or event payload fields.

The expression model is deliberately bounded. It supports readable broadcast logic without turning Flow into a JavaScript programming environment."

### Demonstration option

Temporarily duplicate a branch priority to show the Flow health error and disabled Save button. Correct or discard it before continuing.

## Scene 5 - Author typed data contracts

### On screen

Open **Data contracts**.

Select the `SELECT_ANSWER` event and show its payload field and A, B, C, D options.

Select the `correctAnswer` variable and show:

- String type
- Default value
- Operator-editable setting
- Allowed options

Create a temporary event and add a payload field with:

- Label: Team
- Type: String
- Required: Yes
- Options: Home, Away

Show the generated control preview, then restore the Quiz reference.

### Narration

"Events and variables form typed contracts between authoring, controls, renderers, and future integrations.

An event payload can define required fields, options, and numeric limits. A variable can define its type, default value, allowed options, and whether an operator may prepare it before Take.

The generated-control preview shows how a generic operator surface will interpret the contract. Specialized controls may improve the presentation, but they use the same runtime legality and payload schema."

## Scene 6 - Prepare data before Take

### On screen

In **Runtime data**, change **Correct answer** from C to D.

### Narration

"Operator-editable data is prepared separately from state transitions.

Here the correct answer can be changed before the quiz goes on air. Once Take leaves the initial state, this field locks. The operator cannot silently rewrite protected live data."

## Scene 7 - Simulate the complete quiz

### On screen

Switch from **Design** to **Simulate**.

Run this sequence:

1. Take
2. Select A
3. Change selection to D
4. Lock
5. Reveal

Pause after each step so the viewer can see the active state and legal controls change.

### Narration

"Simulation uses the same runtime as operator control and standalone export.

Only events that are currently legal are offered. After Take, answer selection becomes available. Before Lock, the answer may change. After Lock, selection disappears and Reveal becomes legal.

Because the correct answer was prepared as D, this run follows the correct reveal branch."

### On-screen callout

`Legal controls come from the Flow runtime`

## Scene 8 - Inspect why the branch fired

### On screen

In the Inspector, show **Event history** and select the REVEAL entry.

Show the trace:

- Reveal correct - PASS
- Selected answer D equals correct answer D
- Resulting state: RESULT

Select an earlier event in the history and then return to REVEAL.

### Narration

"Every simulated event records its previous state, considered branches, condition results, variable changes, actions, and resulting state.

The trace explains why a branch passed or failed in plain language. Earlier events remain selectable, so an author can investigate the full run rather than only its latest state."

## Scene 9 - Step back and save a scenario

### On screen

Press **Step back** and show the runtime return from RESULT to LOCKED.

Run Reveal again.

Under **Scenarios**, press **Save current run** and name it:

`Correct answer D`

Replay the saved scenario.

### Narration

"Step back restores the exact runtime snapshot before the most recent event.

A useful run can also be saved as a scenario. Scenarios preserve typed event payloads in browser storage. Replay always begins from a clean runtime, making important operator paths repeatable during authoring and testing."

## Scene 10 - Validate and export

### On screen

Return to Design mode.

Show **Flow health** with no errors.

Point to:

- Export Flow JSON
- Export standalone HTML

### Narration

"Flow health checks states, events, variables, payload contracts, branch priorities, conditions, emitted events, and reachability.

Projects with structural errors cannot enter simulation or export a standalone player.

JSON export writes normalized Flow version 2. Standalone HTML embeds the same behavior model and a renderer for the selected reference graphic. Both exports remain browser-only and platform-neutral."

## Scene 11 - Prove the model with a lower third

### On screen

Select **Lower third**.

Change the prepared name and role. Switch to Simulate and run:

1. Take
2. Continue
3. Take out

### Narration

"The interview lower third deliberately contrasts with the quiz.

It has different data, different states, and a different operator sequence, but it uses the same Flow schema and runtime.

This is the reusable unit: one Flow project controls one independently operated graphic."

## Scene 12 - Operate the Control Room

### On screen

Return to authoring if necessary and press **Control room**.

Show the two panels:

- Program quiz
- Guest lower third

Edit the lower-third name and role before Take.

Take the quiz. Pause on the On-air monitor showing:

- Program quiz: QUESTION
- Guest lower third: OFF

Then Take the lower third. Show:

- Program quiz: QUESTION
- Guest lower third: IN

Select an answer in the quiz while the lower third remains on air.

### Narration

"The Control Room is a two-instance package proof.

Each panel owns an independent Flow controller. The shared monitor observes both snapshots, while every button still comes from its instance's legal-event query.

Taking the quiz does not change the lower third. Taking the lower third does not change the quiz. They can remain on air together because this proof does not invent combined package states or hidden coordination rules.

The quiz uses specialized answer buttons. The lower third uses prepared text fields. Generic controls remain available from the same typed contracts."

## Scene 13 - Explain the package boundary

### On screen

Hold on the Control Room monitor with both graphics active.

### Narration

"This build proves composition without state explosion.

The package does not create a state called quiz-question-plus-lower-third-in. It composes isolated instances and their capabilities.

Logical regions, exclusivity, and automatic cross-graphic Take Out policies are deliberately not part of this proof. Those rules can be added later as an explicit coordination layer without weakening each graphic's own Flow."

### On-screen callouts

- One Flow per independently operated graphic
- One controller per running instance
- One monitor composing snapshots
- No hidden cross-graphic behavior

## Scene 14 - Closing summary

### On screen

Return to a wide shot of the Control Room, then cut to the quiz state graph.

### Narration

"NoaCG Flow Lab now covers the full behavioral loop:

Author stable states. Define typed data and events. Order guarded decisions. Simulate legal operator paths. Inspect why they fired. Save repeatable scenarios. Export the same runtime. And compose independent graphics in one control room.

The result stays readable for authors, safe for operators, and open for future broadcast-package coordination."

### Final title card

`NoaCG Flow Lab`

`Design defines how it looks.`

`Timeline defines how it moves.`

`Flow defines when and why it happens.`

## Recording checklist

- Restore the Quiz reference before recording
- Clear or deliberately name saved scenarios
- Confirm Flow health has no errors before export
- Keep all four quiz answers visible inside the preview
- Verify the lower-third name and role before Take
- In the Control Room, demonstrate both independent monitor changes
- Avoid showing invalid actions as enabled controls
- Record desktop first, then optionally include a short phone-layout montage

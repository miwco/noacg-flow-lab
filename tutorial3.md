# NoaCG Flow Lab - authoring-first tutorial script

## Tutorial goal

Teach a new author how the lower-third example is built, how to modify its behavior safely, and how to create a small Flow from scratch. Simulation is used to verify the authored behavior rather than serving as the main subject.

## Suggested format

- Duration: 9 to 12 minutes
- Capture size: 1920 by 1080
- Begin with the Lower third reference in Design mode
- Keep workflow help open during the first authoring pass
- Pause after every selection so the Inspector relationship is visible
- Keep the preview continuously visible when demonstrating runtime changes

## Scene 1 - The three layers

### On screen

Open Flow Lab and select **Lower third**.

### Narration

"A broadcast graphic has three separate concerns.

Design defines its visual elements. A timeline defines how those elements animate. Flow defines which stable situations exist, what may happen next, and why.

In this tutorial we will first modify a working lower third. Then we will build a small Flow from scratch."

### On-screen callouts

- State = stable situation
- Variable = changing data
- Event = request to do something
- Transition = legal route
- Action = data change or named animation request

## Scene 2 - Read the working lower third

### On screen

Follow the graph from `OFF` to `IN` to `HOLD`.

Select each state and show its name, stable ID, and description in the Inspector.

Point to the minimap in the lower-right corner. Drag inside it to navigate the larger canvas and use its wheel interaction to change the graph zoom.

### Narration

"The lower third has three stable situations.

OFF means the graphic is not on air. IN means its entrance is active. HOLD means it has settled on air.

The guest name and title are not states because their values can change without changing the graphic's behavioral situation. They are variables.

The minimap is both an overview and a navigation control. It shows where the visible viewport sits inside a larger graph."

## Scene 3 - Modify a state

### On screen

Select **HOLD**. Change its description to:

`The guest strap is fully visible and ready to remain on air.`

Show that the node description and operator context update.

### Narration

"Clicking a state opens it in the stable Inspector. The name is what authors and operators read. The ID is its durable contract and remains stable.

Descriptions should explain the on-air situation, not contain changing guest data."

## Scene 4 - Understand a transition

### On screen

Select the edge from OFF to IN or choose **Take in** from the Transitions list.

Show the event label on the native connection line. Click the thicker line itself to reopen the transition Inspector. Explain that the list beneath the graph is the reliable alternate selection method.

In the Inspector, point to:

- From: OFF
- To: IN
- Event: TAKE
- Conditions
- Actions

### Narration

"A transition answers one sentence: when this event is requested from this state, where may the graphic go, under which conditions, and what effects should run?

TAKE is legal in OFF because this transition exists. After it fires, the state is IN, so the runtime offers only events that have a legal route from IN."

### On-screen callout

`Operator button TAKE -> transition OFF to IN -> actions -> current state IN`

## Scene 5 - Modify an action

### On screen

In the Take in transition, find the action:

`Play animation: lower-third-in`

Temporarily change it to `guest-strap-in`. Show **Unsaved changes**, then press **Discard**.

Add a temporary second action and change its type between:

- Play animation
- Set variable
- Emit event

Remove it before continuing.

### Narration

"Actions remain details of a meaningful transition. They do not become extra graph nodes.

A play-animation action sends a name to the renderer or future timeline layer. Flow does not implement the timeline itself. A set-variable action changes typed data. An emit action requests another declared event."

## Scene 6 - Create and connect a state

### On screen

Press **State**. The new state appears and opens in the Inspector.

Rename it `FEATURED` and describe it as:

`The guest strap is emphasized on air.`

Press **Add transition** above the graph. Point out the **New transition - not created** heading and the dashed amber **NEW** edge that appears between the source and destination states. Choose HOLD as the source and FEATURED as the destination and show that the draft edge follows those choices. Then press **Create transition** and point out that the route becomes solid.

### Narration

"Creating a state no longer asks for hidden setup in a browser prompt. It creates a draft state and opens the exact fields that need attention.

The explicit Add transition command opens a clearly marked draft. Its dashed edge lets you see the proposed connection, but the route does not become part of the project until you press Create transition. Cancel new transition removes the draft edge and leaves the existing Flow unchanged. Dragging between visible handles remains an optional faster method once the graph is familiar."

## Scene 7 - Define what makes the route legal

### On screen

Configure the new transition:

- Label: `Feature guest`
- From: HOLD
- To: FEATURED
- Event: press **New operator event**, enter `Feature`, then press **Create and use**
- Priority: 0
- Action: Play animation `lower-third-feature`

Save the transition.

Point out that the generated event ID is `FEATURE`. The new contract and transition remain staged together until **Create transition** is pressed.

### Narration

"The event is the request. The transition makes that request legal from HOLD. The destination defines the next stable situation.

Conditions are optional typed rules. Priorities make competing branches deterministic. Actions describe what data or named animation contract runs when the route succeeds."

### Demonstrate operator-action legality

Show the message beneath the Event field: the operator button appears only when the event has a legal transition from the current state. After saving, find FEATURE under **Behavior contracts** and select its listed route to return directly to the transition logic.

## Scene 8 - Connect changing data to the renderer

### On screen

Select the **Name** variable under Data contracts. Point to:

- Connected output: Primary name text
- Visibility: On air in IN and HOLD
- Current preview value
- The direct preview-value editor
- Any transition cards labeled Reads condition, Reads value, or Changes value

Change the current preview value while OFF, press **Show in preview**, and verify that the lower-third name changes without changing state. Repeat briefly with **Role**.

Then show **Graphic connection - What the renderer receives**.

Point to:

- Current state
- Variables
- Named animation contracts
- The note that the reference renderer is pre-wired

### Narration

"The renderer remains continuously mounted. Flow sends it the current state, current variable values, and named animation actions.

Variables do not attach directly to states. Transition conditions may read them and Set variable actions may change them. The renderer decides which visual slots consume them.

The selected variable now names its exact pre-wired output and when that output is visible. Its transition cards distinguish logic that reads the value from logic that changes it. Operator-editable data can be changed here while the graphic is in its initial state, then checked immediately in Preview.

The generic blank-flow renderer displays every variable in every state, so a new headline works without a separate connection step. If you add a variable to a specialized reference renderer that does not consume it, Flow marks it Not mapped instead of implying that it is on air. Creating new visual slots remains a responsibility of the future design layer."

## Scene 9 - Verify the modification

### On screen

Restore the Lower third reference if the temporary FEATURED route would prevent a clean demonstration, or keep it if fully valid.

Switch to **Simulate** and run:

1. Edit Name and Role while OFF
2. Take
3. Continue
4. Take out

### Narration

"Simulation verifies the same project the operator will run. Only legal actions are shown.

Watch the preview while the state changes. The graphic stays mounted continuously. React updates its state, data, and classes without reloading the page or recreating the entire on-air output."

## Scene 10 - Build from scratch

### On screen

Return to Design mode and select **Blank flow**.

Show the starting project:

- One OFF state
- One TAKE event
- One headline variable
- No transitions
- Generic renderer contract preview

Select **Headline** and show **Generated data row: headline**, **Every state**, and the current preview-value editor. Change the value before creating the first transition and verify it in Preview.

Press **State**, rename it `ON AIR`, and describe it.

Press **Add transition**. The first route starts at OFF and targets the new ON AIR state. A dashed amber edge shows the unsaved route while you configure it. Set it to use TAKE, add the animation action `graphic-in`, and create it. The edge becomes solid when it is saved.

### Narration

"Blank flow begins with only the minimum contracts needed to author safely.

We add an ON AIR state, connect OFF to it, choose TAKE as the event, and add a named animation request. The graph now defines when TAKE is legal and what stable state follows it."

## Scene 11 - Complete the return path

### On screen

Connect ON AIR back to OFF. In its Event field, press **New operator event**, enter `Take out`, and press **Create and use**. Configure:

- Event: TAKE_OUT
- Action: Play animation `graphic-out`

Save and confirm Flow health.

### Narration

"A complete on-air behavior also needs a legal way out. The inline creator adds the event contract without making you leave the transition. Events are declared contracts. Transitions decide where those events are legal.

Flow health checks missing references, impossible branches, duplicate priorities, invalid conditions, and unreachable states before simulation or export."

## Scene 12 - Simulate the new Flow

### On screen

Switch to Simulate.

Run TAKE, then TAKE_OUT. Select both entries in Event history.

### Narration

"The blank project now behaves like the references: OFF offers TAKE, ON AIR offers TAKE OUT, and the trace explains exactly which transition ran.

The generic preview is not a visual design. It proves that a new state machine, typed data, and renderer contract can be authored independently."

## Scene 13 - Control Room boundary

### On screen

Open Control room and operate the quiz and lower third while watching both preview panels and the shared on-air monitor.

### Narration

"One Flow project still represents one independently operated graphic. The Control Room composes their controllers and snapshots without combining their state spaces.

Each preview should visibly follow its own controls. Package-level regions and coordination remain a separate future layer."

## Scene 14 - Closing summary

### Narration

"The complete authoring loop is now visible:

Start from a working graphic. Read and modify its states. Select a transition to define the event, legal route, conditions, and actions. Keep changing content in variables. Inspect the renderer contract. Simulate the same behavior. Then repeat the process from a blank Flow.

Design defines how it looks. Timeline defines how it moves. Flow defines when and why it happens."

## Recording checklist

- Start with the Lower third reference, not the quiz
- Keep workflow help expanded during the authoring scenes
- Show that selecting transitions no longer inserts a second right-side panel
- Demonstrate normal page scrolling over the graph
- Demonstrate Ctrl + wheel graph zoom
- Demonstrate dragging the minimap to navigate the canvas
- Select a transition both from its edge label and from the Transitions list
- Create an Operator action and show which transition route uses it
- Confirm the preview does not flash during selection, Lock, Reveal, or lower-third Continue
- Keep all four quiz answers visible when the quiz appears
- Confirm the Blank flow reaches a healthy state before simulation
- Check desktop and phone layouts

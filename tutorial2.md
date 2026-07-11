# NoaCG Flow Lab - authoring and export tutorial

## Live prototype

https://miwco.github.io/noacg-flow-lab/

## What this version adds

- Stage transition edits with a readable summary, unsaved feedback, and Save or Discard controls.
- Use typed string, number, and boolean literals in conditions and set-variable actions.
- Block duplicate or impossible transition edits with a plain-language explanation.
- Edit explicitly permitted runtime data before Take, separately from transitions.
- Render the quiz and lower third faithfully in standalone HTML exports.

- Edit a transition's label, source state, destination state, and event.
- Add one clear condition using a variable and a simple rule.
- Add, edit, and remove named actions.
- Add and move states, connect them, and define variables.
- Switch between a quiz and an interview lower-third reference.
- Export a Flow project as JSON or download a standalone HTML player.
- Press the `?` button for the operator sequence and the authoring sequence.

## Step-by-step authoring workflow

Before following the original walkthrough below, note that transition changes now stay in a draft until **Save transition** is pressed. Typed values can come from a literal, another variable, or the incoming event. The **Runtime data** panel permits approved values to be prepared before Take and locks them once the graphic is on air.

1. Open the live prototype and choose **Quiz reference** from the top-right picker.
2. Press the `?` button. The operator panel shows the suggested live order, while the graph shows the authoring order.
3. Click a transition pill below the graph, such as **LOCK**. Its read-only summary appears in the Inspector.
4. Scroll to **Edit transition**. Change its label, source or destination if required, and select its event.
5. Click **Add condition**. Choose the variable, then pick a rule such as `has a value` or `equals` another variable. Clear it to make the path unconditional.
6. Under **Actions**, use **Add action** to create a named animation or a set-variable action. Edit the animation or value directly. Use `×` to remove an action.
7. Use **State** to add a stable state. Drag it to place it. Use **Connect** and drag from one state handle to another to create a path.
8. Use **Define variable** to add changing data. Do not create new states for data values such as selected answer or score.
9. Click the code icon in the top toolbar to download a standalone HTML player. Open the downloaded file in a browser to prove the Flow runtime works without the editor.
10. Select **Lower third** in the reference picker. Run **Take**, **Continue**, then **Take out**. Notice that the same state/event/transition model supports a very different broadcast graphic.

## Video tutorial

The companion animated overview is rendered from `src/remotion` and published at:

`/tutorial2.mp4`

Render it locally with:

```bash
npm run video:render
```

The video deliberately focuses on the authoring ideas rather than recreating every click: states first, editable transitions, variables, guided controls, standalone export, and the lower-third proof.

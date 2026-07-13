import type { FlowProject } from "./schema";

export const blankProject: FlowProject = {
  version: 2,
  id: "noacg-blank-flow",
  name: "Untitled graphic",
  description: "A blank Flow project ready for authoring.",
  initialStateId: "off",
  metadata: { renderer: "generic" },
  states: [
    {
      id: "off",
      label: "OFF",
      description: "The graphic is not on air.",
      position: { x: 80, y: 170 },
    },
  ],
  events: [
    {
      id: "TAKE",
      label: "Take",
      description: "Bring the graphic on air.",
      source: "operator",
      presentation: { intent: "primary", order: 1 },
    },
  ],
  variables: [
    {
      id: "headline",
      label: "Headline",
      type: "string",
      defaultValue: "Your text here",
      operatorEditable: true,
    },
  ],
  transitions: [],
};

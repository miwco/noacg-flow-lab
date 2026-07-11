import { migrateProject } from "./migration";

export const lowerThirdProject = migrateProject({
  version: 1,
  id: "noacg-lower-third-reference",
  name: "Interview lower third",
  description: "A compact reference flow for taking a lower third in, holding it, and taking it out.",
  initialStateId: "off",
  metadata: { reference: "lower-third", renderer: "lower-third" },
  states: [
    { id: "off", label: "OFF", description: "The lower third is not on air.", position: { x: 0, y: 170 } },
    { id: "in", label: "IN", description: "The name strap is animating on air.", position: { x: 220, y: 170 } },
    { id: "hold", label: "HOLD", description: "The lower third is on air and stable.", position: { x: 440, y: 170 } },
  ],
  events: [
    { id: "TAKE", label: "Take", description: "Bring the lower third on air." },
    { id: "CONTINUE", label: "Continue", description: "Settle the animation into its hold state." },
    { id: "TAKE_OUT", label: "Take out", description: "Remove the lower third from air." },
    { id: "RESET", label: "Reset", description: "Restore the clean initial state." },
  ],
  variables: [
    { id: "name", label: "Name", type: "string", defaultValue: "Maya Okafor", operatorEditable: true },
    { id: "role", label: "Role", type: "string", defaultValue: "Election analyst", operatorEditable: true },
  ],
  transitions: [
    { id: "take", from: "off", to: "in", event: "TAKE", label: "Take in", actions: [{ type: "play-animation", animation: "lower-third-in" }] },
    { id: "continue", from: "in", to: "hold", event: "CONTINUE", label: "Settle", actions: [{ type: "play-animation", animation: "lower-third-settle" }] },
    { id: "take-out", from: "*", to: "off", event: "TAKE_OUT", label: "Take out", actions: [{ type: "play-animation", animation: "lower-third-out" }] },
    { id: "reset", from: "*", to: "off", event: "RESET", label: "Reset", actions: [] },
  ],
});

lowerThirdProject.events.find((event) => event.id === "TAKE")!.presentation = { intent: "primary", order: 1 };
lowerThirdProject.events.find((event) => event.id === "RESET")!.presentation = { intent: "quiet", order: 9 };

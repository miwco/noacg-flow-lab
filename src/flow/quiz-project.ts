import { migrateProject } from "./migration";

export const quizProject = migrateProject({
  version: 1,
  id: "noacg-quiz-reference",
  name: "Quiz question",
  description: "A broadcast quiz reference flow with safe operator actions.",
  initialStateId: "off",
  metadata: { reference: "quiz", renderer: "quiz" },
  states: [
    { id: "off", label: "OFF", description: "Graphic is not on air.", position: { x: 0, y: 170 } },
    { id: "question", label: "QUESTION", description: "Question is on air and ready for a choice.", position: { x: 190, y: 170 } },
    { id: "selected", label: "SELECTED", description: "An answer can still be changed.", position: { x: 380, y: 170 } },
    { id: "locked", label: "LOCKED", description: "The chosen answer is committed.", position: { x: 570, y: 170 } },
    { id: "result", label: "RESULT", description: "The reveal is complete.", position: { x: 760, y: 170 } },
  ],
  events: [
    { id: "TAKE", label: "Take", description: "Put the question on air." },
    { id: "SELECT_ANSWER", label: "Select answer", description: "Choose A, B, C, or D.", valueType: "string" },
    { id: "LOCK", label: "Lock", description: "Commit the selected answer." },
    { id: "REVEAL", label: "Reveal", description: "Reveal the result." },
    { id: "TAKE_OUT", label: "Take out", description: "Remove the graphic from air." },
    { id: "RESET", label: "Reset", description: "Restore the clean initial state." },
  ],
  variables: [
    { id: "selectedAnswer", label: "Selected answer", type: "string", defaultValue: null },
    { id: "correctAnswer", label: "Correct answer", type: "string", defaultValue: "C", operatorEditable: true, options: ["A", "B", "C", "D"] },
  ],
  transitions: [
    { id: "take", from: "off", to: "question", event: "TAKE", label: "Take", actions: [{ type: "play-animation", animation: "question-in" }] },
    { id: "select-from-question", from: "question", to: "selected", event: "SELECT_ANSWER", label: "Select answer", actions: [{ type: "set-variable", variable: "selectedAnswer", value: { eventValue: true } }, { type: "play-animation", animation: "answer-select" }] },
    { id: "change-selection", from: "selected", to: "selected", event: "SELECT_ANSWER", label: "Change selection", actions: [{ type: "set-variable", variable: "selectedAnswer", value: { eventValue: true } }, { type: "play-animation", animation: "answer-change" }] },
    { id: "lock", from: "selected", to: "locked", event: "LOCK", label: "Lock selected answer", condition: { left: { variable: "selectedAnswer" }, operator: "is-set" }, actions: [{ type: "play-animation", animation: "answer-lock" }] },
    { id: "reveal-correct", from: "locked", to: "result", event: "REVEAL", label: "Reveal correct", condition: { left: { variable: "selectedAnswer" }, operator: "equals", right: { variable: "correctAnswer" } }, actions: [{ type: "play-animation", animation: "correct-reveal" }] },
    { id: "reveal-wrong", from: "locked", to: "result", event: "REVEAL", label: "Reveal wrong", actions: [{ type: "play-animation", animation: "wrong-reveal" }] },
    { id: "take-out", from: "*", to: "off", event: "TAKE_OUT", label: "Take out", actions: [{ type: "play-animation", animation: "graphic-out" }, { type: "set-variable", variable: "selectedAnswer", value: null }] },
    { id: "reset", from: "*", to: "off", event: "RESET", label: "Reset", actions: [{ type: "set-variable", variable: "selectedAnswer", value: null }] },
  ],
});

quizProject.events.find((event) => event.id === "SELECT_ANSWER")!.payload![0].options = ["A", "B", "C", "D"];
quizProject.events.find((event) => event.id === "TAKE")!.presentation = { intent: "primary", order: 1 };
quizProject.events.find((event) => event.id === "REVEAL")!.presentation = { intent: "primary", order: 4 };
quizProject.events.find((event) => event.id === "RESET")!.presentation = { intent: "quiet", order: 9 };

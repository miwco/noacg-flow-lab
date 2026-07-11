import { describe, expect, it } from "vitest";
import { quizProject } from "./quiz-project";
import { validateProject } from "./validation";

describe("edited project validation", () => {
  it("identifies an exact duplicate transition", () => {
    const duplicate = { ...quizProject.transitions[0], id: "duplicate-take", label: "Duplicate take" };
    const diagnostics = validateProject({ ...quizProject, transitions: [...quizProject.transitions, duplicate] });
    expect(diagnostics).toContainEqual(expect.objectContaining({ level: "error", transitionId: "duplicate-take" }));
  });

  it("explains when an unconditional route makes a later edit impossible", () => {
    const impossible = { ...quizProject.transitions[0], id: "shadowed", label: "Shadowed", to: "selected", priority: 10, condition: { mode: "all" as const, predicates: [{ left: { variable: "correctAnswer" }, operator: "equals" as const, right: "C" }] } };
    const diagnostics = validateProject({ ...quizProject, transitions: [...quizProject.transitions, impossible] });
    expect(diagnostics.find((item) => item.transitionId === "take")?.message).toContain("must be the final branch");
  });

  it("rejects a literal with the wrong variable type", () => {
    const project = { ...quizProject, variables: quizProject.variables.map((item) => item.id === "correctAnswer" ? { ...item, type: "number" as const, defaultValue: 3 } : item), transitions: quizProject.transitions.map((item) => item.id === "reveal-correct" ? { ...item, condition: { mode: "all" as const, predicates: [{ left: { variable: "correctAnswer" }, operator: "equals" as const, right: "C" }] } } : item) };
    expect(validateProject(project).some((item) => item.message.includes("Use a number value"))).toBe(true);
  });

  it("validates data contract constraints", () => {
    const project = { ...quizProject, variables: [...quizProject.variables, { id: "score", label: "Score", type: "number" as const, defaultValue: "zero", minimum: 10, maximum: 2, step: 0 }] };
    const messages = validateProject(project).map((item) => item.message);
    expect(messages.some((message) => message.includes("default value must be a number"))).toBe(true);
    expect(messages.some((message) => message.includes("minimum above its maximum"))).toBe(true);
    expect(messages.some((message) => message.includes("positive step"))).toBe(true);
  });

  it("requires emitted event payload fields", () => {
    const events = [...quizProject.events, { id: "UPDATE", label: "Update", source: "external" as const, payload: [{ id: "score", label: "Score", type: "number" as const, required: true }] }];
    const transitions = quizProject.transitions.map((item) => item.id === "take" ? { ...item, actions: [...item.actions, { type: "emit" as const, event: "UPDATE" }] } : item);
    expect(validateProject({ ...quizProject, events, transitions }).some((item) => item.message.includes("without required field"))).toBe(true);
  });
});

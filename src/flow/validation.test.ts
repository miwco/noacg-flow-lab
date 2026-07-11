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
});

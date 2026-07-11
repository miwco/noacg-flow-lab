import { describe, expect, it } from "vitest";
import { quizProject } from "./quiz-project";
import { availableEvents, createFlowController, createRuntime, dispatchEvent, setRuntimeVariable } from "./runtime";

function fire(runtime = createRuntime(quizProject), id: string, value?: string) {
  return dispatchEvent(quizProject, runtime, { id, data: value === undefined ? undefined : { value } });
}

describe("Flow runtime - quiz reference", () => {
  it("takes from OFF and rejects reveal from OFF", () => {
    expect(fire(undefined, "TAKE").runtime.stateId).toBe("question");
    const rejected = fire(undefined, "REVEAL");
    expect(rejected.ok).toBe(false);
    expect(rejected.runtime.stateId).toBe("off");
  });

  it("sets and changes the selected answer before lock", () => {
    const question = fire(undefined, "TAKE").runtime;
    const first = fire(question, "SELECT_ANSWER", "A").runtime;
    const changed = fire(first, "SELECT_ANSWER", "D").runtime;
    expect(changed.stateId).toBe("selected");
    expect(changed.variables.selectedAnswer).toBe("D");
  });

  it("protects invalid lock and selection after lock", () => {
    const question = fire(undefined, "TAKE").runtime;
    expect(fire(question, "LOCK").ok).toBe(false);
    const selected = fire(question, "SELECT_ANSWER", "C").runtime;
    const locked = fire(selected, "LOCK").runtime;
    expect(locked.stateId).toBe("locked");
    expect(fire(locked, "SELECT_ANSWER", "A").ok).toBe(false);
  });

  it("takes the correct and wrong reveal branches", () => {
    const question = fire(undefined, "TAKE").runtime;
    const correct = fire(fire(question, "SELECT_ANSWER", "C").runtime, "LOCK").runtime;
    const wrong = fire(fire(question, "SELECT_ANSWER", "A").runtime, "LOCK").runtime;
    const correctReveal = fire(correct, "REVEAL");
    const wrongReveal = fire(wrong, "REVEAL");
    expect(correctReveal.ok && correctReveal.transitionId).toBe("reveal-correct");
    expect(wrongReveal.ok && wrongReveal.transitionId).toBe("reveal-wrong");
    expect(correctReveal.runtime.stateId).toBe("result");
    expect(wrongReveal.runtime.stateId).toBe("result");
  });

  it("resets reliably without corrupting state", () => {
    const selected = fire(fire(undefined, "TAKE").runtime, "SELECT_ANSWER", "B").runtime;
    const reset = fire(selected, "RESET");
    expect(reset.ok).toBe(true);
    expect(reset.runtime.stateId).toBe("off");
    expect(reset.runtime.variables.selectedAnswer).toBeNull();
  });

  it("allows permitted data edits only before Take", () => {
    const ready = setRuntimeVariable(quizProject, createRuntime(quizProject), "correctAnswer", "D");
    expect(ready.variables.correctAnswer).toBe("D");
    expect(setRuntimeVariable(quizProject, ready, "selectedAnswer", "A")).toBe(ready);
    const onAir = fire(ready, "TAKE").runtime;
    expect(setRuntimeVariable(quizProject, onAir, "correctAnswer", "A")).toBe(onAir);
  });

  it("returns rich legal-event descriptors and keeps controllers independent", () => {
    expect(availableEvents(quizProject, createRuntime(quizProject)).find((event) => event.id === "TAKE")?.label).toBe("Take");
    const first = createFlowController(quizProject);
    const second = createFlowController(quizProject);
    first.dispatch({ id: "TAKE" });
    expect(first.getSnapshot().stateId).toBe("question");
    expect(second.getSnapshot().stateId).toBe("off");
  });

  it("evaluates ordered condition groups and records branch explanations", () => {
    const locked = fire(fire(fire(undefined, "TAKE").runtime, "SELECT_ANSWER", "A").runtime, "LOCK").runtime;
    const result = fire(locked, "REVEAL");
    expect(result.ok && result.transitionId).toBe("reveal-wrong");
    expect(result.trace[0].consideredTransitions.map((item) => item.passed)).toEqual([false, true]);
    expect(result.trace[0].consideredTransitions[1].explanation).toContain("Unconditional");
  });

  it("processes emitted events and hides non-operator sources", () => {
    const project = { ...quizProject, events: [...quizProject.events, { id: "DONE", label: "Done", source: "animation-complete" as const, animation: "question-in" }], transitions: [...quizProject.transitions, { id: "done", from: "question", to: "selected", event: "DONE", priority: 0, actions: [] }], };
    const withEmit = { ...project, transitions: project.transitions.map((item) => item.id === "take" ? { ...item, actions: [...item.actions, { type: "emit" as const, event: "DONE" }] } : item) };
    const result = dispatchEvent(withEmit, createRuntime(withEmit), { id: "TAKE" });
    expect(result.runtime.stateId).toBe("selected");
    expect(result.trace).toHaveLength(2);
    expect(availableEvents(project, { ...createRuntime(project), stateId: "question" }).some((event) => event.id === "DONE")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { migrateProject } from "./migration";

describe("Flow project migration", () => {
  it("migrates v1 conditions, priorities, and event values", () => {
    const migrated = migrateProject({ version: 1, id: "x", name: "X", description: "", initialStateId: "a", states: [{ id: "a", label: "A", position: { x: 0, y: 0 } }], variables: [{ id: "choice", label: "Choice", type: "string", defaultValue: null }], events: [{ id: "CHOOSE", label: "Choose", valueType: "string" }], transitions: [{ id: "choose", from: "a", to: "a", event: "CHOOSE", condition: { left: { variable: "choice" }, operator: "not-equals", right: "" }, actions: [{ type: "set-variable", variable: "choice", value: { eventValue: true } }] }] });
    expect(migrated.version).toBe(2);
    expect(migrated.transitions[0].priority).toBe(0);
    expect(migrated.transitions[0].condition?.mode).toBe("all");
    expect(migrated.transitions[0].actions[0]).toEqual({ type: "set-variable", variable: "choice", value: { eventField: "value" } });
  });

  it("restores quiz answer options in previously migrated browser data", () => {
    const project = migrateProject({ version: 2, id: "quiz", name: "Quiz", description: "", initialStateId: "off", metadata: { reference: "quiz" }, states: [{ id: "off", label: "OFF", position: { x: 0, y: 0 } }], variables: [], events: [{ id: "SELECT_ANSWER", label: "Select", payload: [{ id: "value", label: "Value", type: "string" }] }], transitions: [] });
    expect(project.events[0].payload?.[0].options).toEqual(["A", "B", "C", "D"]);
  });
});

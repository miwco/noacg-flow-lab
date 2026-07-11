import type { FlowProject, FlowValue, FlowValueType, ValueReference } from "./schema";

type V1Reference = FlowValue | { variable: string } | { eventValue: true };
type V1Project = Omit<FlowProject, "version" | "events" | "transitions"> & {
  version: 1;
  events: Array<{ id: string; label: string; description?: string; valueType?: FlowValueType }>;
  transitions: Array<Omit<FlowProject["transitions"][number], "priority" | "condition"> & {
    condition?: { left: { variable: string }; operator: "equals" | "not-equals" | "is-set" | "is-not-set"; right?: V1Reference };
  }>;
};

function migrateReference(reference: V1Reference | undefined): ValueReference | undefined {
  if (reference && typeof reference === "object" && "eventValue" in reference) return { eventField: "value" };
  return reference;
}

export function migrateProject(input: unknown): FlowProject {
  if (!input || typeof input !== "object") throw new Error("Flow project must be an object.");
  const project = input as FlowProject | V1Project;
  if (project.version === 2) return normalizeProject(structuredClone(project));
  if (project.version !== 1) throw new Error("Unsupported Flow project version.");
  const priorities = new Map<string, number>();
  return normalizeProject({
    ...structuredClone(project),
    version: 2,
    events: project.events.map(({ valueType, ...event }) => ({ ...event, source: "operator", payload: valueType ? [{ id: "value", label: "Value", type: valueType, required: true }] : undefined })),
    transitions: project.transitions.map((transition) => {
      const key = `${transition.from}\u0000${transition.event}`;
      const priority = priorities.get(key) ?? 0;
      priorities.set(key, priority + 10);
      const condition = transition.condition ? { mode: "all" as const, predicates: [{ left: { variable: transition.condition.left.variable }, operator: transition.condition.operator, right: migrateReference(transition.condition.right) }] } : undefined;
      return { ...transition, priority, condition, actions: transition.actions.map((action) => action.type === "set-variable" ? { ...action, value: migrateReference(action.value as V1Reference)! } : action) };
    }),
  });
}

function normalizeProject(project: FlowProject): FlowProject {
  const events = project.events.map((event) => {
    const source = event.source ?? "operator";
    if (project.metadata?.reference === "quiz" && event.id === "SELECT_ANSWER" && event.payload?.[0]) return { ...event, source, payload: [{ ...event.payload[0], options: event.payload[0].options?.length ? event.payload[0].options : ["A", "B", "C", "D"] }] };
    return { ...event, source };
  });
  const transitions = project.metadata?.reference === "quiz" ? project.transitions.map((transition) => transition.id === "reveal-wrong" ? { ...transition, condition: undefined } : transition) : project.transitions;
  return { ...project, events, transitions };
}

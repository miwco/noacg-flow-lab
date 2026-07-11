import type { FlowAction, FlowCondition, FlowProject, FlowTransition, ValueReference } from "./schema";

export type FlowDiagnostic = { level: "error" | "warning"; message: string; transitionId?: string };

function transitionName(transition: FlowTransition) {
  return transition.label?.trim() || transition.id;
}

function referencedVariables(condition?: FlowCondition, actions: FlowAction[] = []): string[] {
  const names = condition ? [condition.left.variable, ...(condition.right && typeof condition.right === "object" && "variable" in condition.right ? [condition.right.variable] : [])] : [];
  actions.forEach((action) => {
    if (action.type === "set-variable") {
      names.push(action.variable);
      if (typeof action.value === "object" && action.value && "variable" in action.value) names.push(action.value.variable);
    }
  });
  return names;
}

function literalType(value: ValueReference | undefined): string | undefined {
  return value === null ? "null" : typeof value === "object" || value === undefined ? undefined : typeof value;
}

function sameCondition(left?: FlowCondition, right?: FlowCondition) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateProject(project: FlowProject): FlowDiagnostic[] {
  const diagnostics: FlowDiagnostic[] = [];
  const stateIds = new Set<string>();
  project.states.forEach((state) => {
    if (stateIds.has(state.id)) diagnostics.push({ level: "error", message: `Two states use the ID "${state.id}". Each state needs its own ID.` });
    stateIds.add(state.id);
  });
  if (!stateIds.has(project.initialStateId)) diagnostics.push({ level: "error", message: "Choose an initial state before this flow can run." });

  const events = new Set(project.events.map((event) => event.id));
  const variables = new Map(project.variables.map((variable) => [variable.id, variable]));
  project.transitions.forEach((transition, index) => {
    const name = transitionName(transition);
    const add = (message: string, level: "error" | "warning" = "error") => diagnostics.push({ level, message, transitionId: transition.id });
    if (transition.from !== "*" && !stateIds.has(transition.from)) add(`"${name}" starts from a state that does not exist.`);
    if (!stateIds.has(transition.to)) add(`"${name}" has no valid destination state.`);
    if (!transition.event.trim()) add(`"${name}" needs an operator action or event.`);
    else if (!events.has(transition.event)) add(`"${name}" uses an event that is not defined.`);
    referencedVariables(transition.condition, transition.actions).forEach((id) => { if (!variables.has(id)) add(`"${id}" is used by "${name}" but is not a defined variable.`); });

    const conditionVariable = transition.condition && variables.get(transition.condition.left.variable);
    const conditionLiteral = literalType(transition.condition?.right);
    if (conditionVariable && conditionLiteral && conditionLiteral !== "null" && conditionLiteral !== conditionVariable.type) add(`"${name}" compares ${conditionVariable.label} with a ${conditionLiteral} value. Use a ${conditionVariable.type} value instead.`);
    transition.actions.forEach((action) => {
      if (action.type !== "set-variable") return;
      const variable = variables.get(action.variable);
      const type = literalType(action.value);
      if (variable && type && type !== "null" && type !== variable.type) add(`"${name}" sets ${variable.label} to a ${type} value. Use a ${variable.type} value instead.`);
    });

    const earlier = project.transitions.slice(0, index).find((candidate) => candidate.from === transition.from && candidate.event === transition.event);
    if (earlier && (!earlier.condition || sameCondition(earlier.condition, transition.condition))) {
      add(earlier.condition ? `"${name}" duplicates the same route and condition as "${transitionName(earlier)}".` : `"${name}" can never run because "${transitionName(earlier)}" already handles this event unconditionally.`);
    }
  });

  const reached = new Set([project.initialStateId]);
  let changed = true;
  while (changed) {
    changed = false;
    project.transitions.forEach((transition) => {
      if ((transition.from === "*" || reached.has(transition.from)) && !reached.has(transition.to)) { reached.add(transition.to); changed = true; }
    });
  }
  project.states.filter((state) => !reached.has(state.id)).forEach((state) => diagnostics.push({ level: "warning", message: `"${state.label}" cannot be reached from the initial state.` }));
  if (project.metadata?.reference === "quiz") {
    if (!project.transitions.some((transition) => transition.event === "LOCK" && transition.condition?.left.variable === "selectedAnswer" && transition.condition.operator === "is-set")) diagnostics.push({ level: "warning", message: "The reference quiz should only lock after an answer is selected." });
    if (!project.transitions.some((transition) => transition.from === "locked" && transition.event === "REVEAL")) diagnostics.push({ level: "warning", message: "The reference quiz has no reveal transition after lock." });
  }
  return diagnostics;
}

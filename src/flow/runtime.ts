import type { FlowAction, FlowCondition, FlowEventPayload, FlowProject, FlowValue, ValueReference } from "./schema";

export type RuntimeState = {
  stateId: string;
  variables: Record<string, FlowValue>;
  lastTransitionId?: string;
  lastAnimation?: string;
  revision: number;
};

export type DispatchResult = { ok: true; runtime: RuntimeState; transitionId: string } | { ok: false; runtime: RuntimeState; reason: string };

export function createRuntime(project: FlowProject): RuntimeState {
  return { stateId: project.initialStateId, variables: Object.fromEntries(project.variables.map((variable) => [variable.id, variable.defaultValue])), revision: 0 };
}

export function setRuntimeVariable(project: FlowProject, runtime: RuntimeState, variableId: string, value: FlowValue): RuntimeState {
  const variable = project.variables.find((item) => item.id === variableId);
  if (!variable?.operatorEditable || runtime.stateId !== project.initialStateId) return runtime;
  const validType = value === null || typeof value === variable.type;
  const validOption = !variable.options?.length || variable.options.includes(value);
  if (!validType || !validOption) return runtime;
  return { ...runtime, variables: { ...runtime.variables, [variableId]: value }, revision: runtime.revision + 1 };
}

function resolveValue(reference: ValueReference | undefined, variables: Record<string, FlowValue>, event: FlowEventPayload): FlowValue {
  if (reference && typeof reference === "object") {
    if ("variable" in reference) return variables[reference.variable];
    if ("eventValue" in reference) return event.value ?? null;
  }
  return reference ?? null;
}

export function evaluateCondition(condition: FlowCondition | undefined, variables: Record<string, FlowValue>, event: FlowEventPayload): boolean {
  if (!condition) return true;
  const left = variables[condition.left.variable];
  if (condition.operator === "is-set") return left !== null && left !== "" && left !== undefined;
  if (condition.operator === "is-not-set") return left === null || left === "" || left === undefined;
  const right = resolveValue(condition.right, variables, event);
  return condition.operator === "equals" ? left === right : left !== right;
}

function runAction(action: FlowAction, variables: Record<string, FlowValue>, event: FlowEventPayload): { variables: Record<string, FlowValue>; animation?: string } {
  if (action.type === "set-variable") return { variables: { ...variables, [action.variable]: resolveValue(action.value, variables, event) } };
  if (action.type === "play-animation") return { variables, animation: action.animation };
  return { variables };
}

export function dispatchEvent(project: FlowProject, runtime: RuntimeState, event: FlowEventPayload): DispatchResult {
  const matching = project.transitions.filter((transition) => transition.event === event.id && (transition.from === runtime.stateId || transition.from === "*"));
  const transition = matching.find((candidate) => evaluateCondition(candidate.condition, runtime.variables, event));
  if (!transition) {
    const reason = matching.length ? `“${event.id}” is not ready - its condition is not met.` : `“${event.id}” is not available while ${runtime.stateId.toUpperCase()} is active.`;
    return { ok: false, runtime, reason };
  }
  let variables = { ...runtime.variables };
  let lastAnimation: string | undefined;
  for (const action of transition.actions) {
    const result = runAction(action, variables, event);
    variables = result.variables;
    lastAnimation = result.animation ?? lastAnimation;
  }
  return { ok: true, transitionId: transition.id, runtime: { stateId: transition.to, variables, lastTransitionId: transition.id, lastAnimation, revision: runtime.revision + 1 } };
}

export function availableEvents(project: FlowProject, runtime: RuntimeState): string[] {
  return [...new Set(project.transitions.filter((transition) => (transition.from === runtime.stateId || transition.from === "*") && !(transition.from === "*" && transition.to === runtime.stateId) && evaluateCondition(transition.condition, runtime.variables, { id: transition.event })).map((transition) => transition.event))];
}

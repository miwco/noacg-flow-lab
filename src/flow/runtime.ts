import type { AvailableEvent, FlowAction, FlowConditionGroup, FlowEventPayload, FlowField, FlowPredicate, FlowProject, FlowValue, ValueReference } from "./schema";

export type RuntimeState = { stateId: string; variables: Record<string, FlowValue>; lastTransitionId?: string; lastAnimation?: string; revision: number };
export type TransitionEvaluation = { transitionId: string; passed: boolean; explanation: string };
export type TransitionTrace = { event: FlowEventPayload; previousStateId: string; consideredTransitions: TransitionEvaluation[]; selectedTransitionId?: string; variableChanges: Array<{ id: string; before: FlowValue; after: FlowValue }>; actions: FlowAction[]; resultingStateId: string };
export type DispatchResult = { ok: true; runtime: RuntimeState; transitionId: string; trace: TransitionTrace[] } | { ok: false; runtime: RuntimeState; reason: string; trace: TransitionTrace[] };
export type UpdateResult = { ok: true; runtime: RuntimeState } | { ok: false; runtime: RuntimeState; reason: string };

export function createRuntime(project: FlowProject): RuntimeState {
  return { stateId: project.initialStateId, variables: Object.fromEntries(project.variables.map((variable) => [variable.id, variable.defaultValue])), revision: 0 };
}

function fieldError(field: FlowField, value: FlowValue): string | undefined {
  if (field.required && (value === null || value === "" || value === undefined)) return `${field.label} is required.`;
  if (value !== null && value !== undefined && typeof value !== field.type) return `${field.label} must be a ${field.type}.`;
  if (field.options?.length && !field.options.includes(value)) return `${field.label} must use one of its permitted values.`;
  if (typeof value === "number" && field.minimum !== undefined && value < field.minimum) return `${field.label} must be at least ${field.minimum}.`;
  if (typeof value === "number" && field.maximum !== undefined && value > field.maximum) return `${field.label} must be at most ${field.maximum}.`;
}

export function setRuntimeVariable(project: FlowProject, runtime: RuntimeState, variableId: string, value: FlowValue): RuntimeState {
  return updateRuntimeVariable(project, runtime, variableId, value).runtime;
}

export function updateRuntimeVariable(project: FlowProject, runtime: RuntimeState, variableId: string, value: FlowValue): UpdateResult {
  const variable = project.variables.find((item) => item.id === variableId);
  if (!variable?.operatorEditable) return { ok: false, runtime, reason: "That data value is not operator-editable." };
  if (runtime.stateId !== project.initialStateId) return { ok: false, runtime, reason: "Prepare editable data before the graphic goes on air." };
  const error = fieldError(variable, value);
  if (error) return { ok: false, runtime, reason: error };
  return { ok: true, runtime: { ...runtime, variables: { ...runtime.variables, [variableId]: value }, revision: runtime.revision + 1 } };
}

function resolveValue(reference: ValueReference | undefined, variables: Record<string, FlowValue>, event: FlowEventPayload): FlowValue {
  if (reference && typeof reference === "object") {
    if ("variable" in reference) return variables[reference.variable];
    return event.data?.[reference.eventField] ?? null;
  }
  return reference ?? null;
}

function predicateText(predicate: FlowPredicate, variables: Record<string, FlowValue>, event: FlowEventPayload) {
  const left = resolveValue(predicate.left, variables, event);
  const right = resolveValue(predicate.right, variables, event);
  return `${JSON.stringify(left)} ${predicate.operator} ${predicate.right === undefined ? "" : JSON.stringify(right)}`.trim();
}

export function evaluatePredicate(predicate: FlowPredicate, variables: Record<string, FlowValue>, event: FlowEventPayload): boolean {
  const left = resolveValue(predicate.left, variables, event);
  if (predicate.operator === "is-set") return left !== null && left !== "" && left !== undefined;
  if (predicate.operator === "is-not-set") return left === null || left === "" || left === undefined;
  const right = resolveValue(predicate.right, variables, event);
  if (predicate.operator === "equals") return left === right;
  if (predicate.operator === "not-equals") return left !== right;
  if (typeof left !== "number" || typeof right !== "number") return false;
  if (predicate.operator === "greater-than") return left > right;
  if (predicate.operator === "greater-than-or-equal") return left >= right;
  if (predicate.operator === "less-than") return left < right;
  return left <= right;
}

export function evaluateCondition(condition: FlowConditionGroup | undefined, variables: Record<string, FlowValue>, event: FlowEventPayload): boolean {
  if (!condition) return true;
  const results = condition.predicates.map((predicate) => evaluatePredicate(predicate, variables, event));
  return condition.mode === "all" ? results.every(Boolean) : results.some(Boolean);
}

function evaluateTransition(condition: FlowConditionGroup | undefined, variables: Record<string, FlowValue>, event: FlowEventPayload) {
  if (!condition) return { passed: true, explanation: "Unconditional branch." };
  const results = condition.predicates.map((predicate) => ({ passed: evaluatePredicate(predicate, variables, event), text: predicateText(predicate, variables, event) }));
  const passed = condition.mode === "all" ? results.every((item) => item.passed) : results.some((item) => item.passed);
  return { passed, explanation: `${condition.mode === "all" ? "All" : "Any"} conditions: ${results.map((item) => `${item.text} ${item.passed ? "passed" : "failed"}`).join("; ")}` };
}

function payloadError(project: FlowProject, event: FlowEventPayload) {
  const definition = project.events.find((item) => item.id === event.id);
  if (!definition) return `"${event.id}" is not a defined event.`;
  for (const field of definition.payload ?? []) {
    const error = fieldError(field, event.data?.[field.id] ?? null);
    if (error) return error;
  }
}

function dispatchSingle(project: FlowProject, runtime: RuntimeState, event: FlowEventPayload): { runtime: RuntimeState; trace: TransitionTrace; emitted: FlowEventPayload[]; transitionId?: string } {
  const matching = project.transitions.filter((transition) => transition.event === event.id && (transition.from === runtime.stateId || transition.from === "*")).sort((a, b) => a.priority - b.priority);
  const considered = matching.map((transition) => ({ transition, ...evaluateTransition(transition.condition, runtime.variables, event) }));
  const selected = considered.find((candidate) => candidate.passed)?.transition;
  if (!selected) return { runtime, emitted: [], trace: { event, previousStateId: runtime.stateId, consideredTransitions: considered.map(({ transition, passed, explanation }) => ({ transitionId: transition.id, passed, explanation })), variableChanges: [], actions: [], resultingStateId: runtime.stateId } };
  const variables = { ...runtime.variables };
  let lastAnimation = runtime.lastAnimation;
  const emitted: FlowEventPayload[] = [];
  for (const action of selected.actions) {
    if (action.type === "set-variable") variables[action.variable] = resolveValue(action.value, variables, event);
    else if (action.type === "play-animation") lastAnimation = action.animation;
    else emitted.push({ id: action.event, data: Object.fromEntries(Object.entries(action.data ?? {}).map(([key, value]) => [key, resolveValue(value, variables, event)])) });
  }
  const variableChanges = Object.keys(variables).filter((id) => variables[id] !== runtime.variables[id]).map((id) => ({ id, before: runtime.variables[id], after: variables[id] }));
  const next = { stateId: selected.to, variables, lastTransitionId: selected.id, lastAnimation, revision: runtime.revision + 1 };
  return { runtime: next, emitted, transitionId: selected.id, trace: { event, previousStateId: runtime.stateId, consideredTransitions: considered.map(({ transition, passed, explanation }) => ({ transitionId: transition.id, passed, explanation })), selectedTransitionId: selected.id, variableChanges, actions: selected.actions, resultingStateId: next.stateId } };
}

export function dispatchEvent(project: FlowProject, runtime: RuntimeState, event: FlowEventPayload): DispatchResult {
  const error = payloadError(project, event);
  if (error) return { ok: false, runtime, reason: error, trace: [] };
  let next = runtime;
  let queue = [event];
  const trace: TransitionTrace[] = [];
  let firstTransitionId: string | undefined;
  for (let depth = 0; queue.length; depth += 1) {
    if (depth >= 32) return { ok: false, runtime: next, reason: "Emitted events exceeded the safe processing limit.", trace };
    const current = queue.shift()!;
    const result = dispatchSingle(project, next, current);
    trace.push(result.trace);
    if (depth === 0) firstTransitionId = result.transitionId;
    next = result.runtime;
    queue = [...queue, ...result.emitted];
    if (!result.transitionId && depth === 0) break;
  }
  if (!firstTransitionId) {
    const matching = project.transitions.some((transition) => transition.event === event.id && (transition.from === runtime.stateId || transition.from === "*"));
    return { ok: false, runtime, reason: matching ? `"${event.id}" is not ready because its conditions are not met.` : `"${event.id}" is not available while ${runtime.stateId.toUpperCase()} is active.`, trace };
  }
  return { ok: true, runtime: next, transitionId: firstTransitionId, trace };
}

export function availableEvents(project: FlowProject, runtime: RuntimeState): AvailableEvent[] {
  const ids = new Set(project.transitions.filter((transition) => (transition.from === runtime.stateId || transition.from === "*") && !(transition.from === "*" && transition.to === runtime.stateId) && evaluateCondition(transition.condition, runtime.variables, { id: transition.event })).map((transition) => transition.event));
  return project.events.filter((event) => ids.has(event.id) && (event.source ?? "operator") === "operator").map((event) => ({ ...event, source: event.source ?? "operator" })).sort((a, b) => (a.presentation?.order ?? 0) - (b.presentation?.order ?? 0));
}

export interface FlowController {
  getSnapshot(): RuntimeState;
  getAvailableEvents(): AvailableEvent[];
  setEditableData(variableId: string, value: FlowValue): UpdateResult;
  dispatch(event: FlowEventPayload): DispatchResult;
  subscribe(listener: (snapshot: RuntimeState) => void): () => void;
}

export type FlowInstance = { id: string; flowId: string; label: string; controller: FlowController };

export function createFlowController(project: FlowProject, initial = createRuntime(project)): FlowController {
  let runtime = initial;
  const listeners = new Set<(snapshot: RuntimeState) => void>();
  const publish = () => listeners.forEach((listener) => listener(runtime));
  return {
    getSnapshot: () => runtime,
    getAvailableEvents: () => availableEvents(project, runtime),
    setEditableData: (id, value) => { const result = updateRuntimeVariable(project, runtime, id, value); runtime = result.runtime; if (result.ok) publish(); return result; },
    dispatch: (event) => { const result = dispatchEvent(project, runtime, event); runtime = result.runtime; if (result.ok) publish(); return result; },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

import type { FlowAction, FlowPredicate, FlowProject, FlowTransition, ValueReference } from "./schema";

export type FlowDiagnostic = { level: "error" | "warning"; message: string; transitionId?: string };
const name = (transition: FlowTransition) => transition.label?.trim() || transition.id;
const referenceVariable = (reference?: ValueReference) => reference && typeof reference === "object" && "variable" in reference ? reference.variable : undefined;
const referenceEventField = (reference?: ValueReference) => reference && typeof reference === "object" && "eventField" in reference ? reference.eventField : undefined;
const literalType = (reference?: ValueReference) => reference === null ? "null" : typeof reference === "object" || reference === undefined ? undefined : typeof reference;

function references(predicate: FlowPredicate, actions: FlowAction[]) {
  const variables = [referenceVariable(predicate.left), referenceVariable(predicate.right)].filter(Boolean) as string[];
  actions.forEach((action) => { if (action.type === "set-variable") variables.push(action.variable, ...([referenceVariable(action.value)].filter(Boolean) as string[])); });
  return variables;
}

export function validateProject(project: FlowProject): FlowDiagnostic[] {
  const diagnostics: FlowDiagnostic[] = [];
  const stateIds = new Set<string>();
  project.states.forEach((state) => { if (stateIds.has(state.id)) diagnostics.push({ level: "error", message: `Two states use the ID "${state.id}". Each state needs its own ID.` }); stateIds.add(state.id); });
  if (!stateIds.has(project.initialStateId)) diagnostics.push({ level: "error", message: "Choose an initial state before this flow can run." });
  const eventIds = new Set<string>();
  project.events.forEach((event) => {
    if (!event.id.trim()) diagnostics.push({ level: "error", message: "Every event needs an ID." });
    if (eventIds.has(event.id)) diagnostics.push({ level: "error", message: `Two events use the ID "${event.id}".` });
    eventIds.add(event.id);
    const fieldIds = new Set<string>();
    event.payload?.forEach((field) => {
      if (!field.id.trim()) diagnostics.push({ level: "error", message: `${event.label} has a payload field without an ID.` });
      if (fieldIds.has(field.id)) diagnostics.push({ level: "error", message: `${event.label} has two payload fields named "${field.id}".` });
      fieldIds.add(field.id);
      if (field.type === "number" && field.minimum !== undefined && field.maximum !== undefined && field.minimum > field.maximum) diagnostics.push({ level: "error", message: `${event.label} field ${field.label} has a minimum above its maximum.` });
      if (field.step !== undefined && field.step <= 0) diagnostics.push({ level: "error", message: `${event.label} field ${field.label} needs a positive step.` });
    });
    if (event.source === "animation-complete" && !event.animation?.trim()) diagnostics.push({ level: "error", message: `${event.label} needs the animation name it waits for.` });
  });
  const variableIds = new Set<string>();
  project.variables.forEach((variable) => {
    if (!variable.id.trim()) diagnostics.push({ level: "error", message: "Every variable needs an ID." });
    if (variableIds.has(variable.id)) diagnostics.push({ level: "error", message: `Two variables use the ID "${variable.id}".` });
    variableIds.add(variable.id);
    if (variable.defaultValue !== null && typeof variable.defaultValue !== variable.type) diagnostics.push({ level: "error", message: `${variable.label}'s default value must be a ${variable.type}.` });
    if (variable.options?.length && !variable.options.includes(variable.defaultValue)) diagnostics.push({ level: "warning", message: `${variable.label}'s default value is not one of its options.` });
    if (variable.type === "number" && variable.minimum !== undefined && variable.maximum !== undefined && variable.minimum > variable.maximum) diagnostics.push({ level: "error", message: `${variable.label} has a minimum above its maximum.` });
    if (variable.step !== undefined && variable.step <= 0) diagnostics.push({ level: "error", message: `${variable.label} needs a positive step.` });
  });
  const events = new Map(project.events.map((event) => [event.id, event]));
  const variables = new Map(project.variables.map((variable) => [variable.id, variable]));
  const groups = new Map<string, FlowTransition[]>();

  project.transitions.forEach((transition) => {
    const add = (message: string, level: "error" | "warning" = "error") => diagnostics.push({ level, message, transitionId: transition.id });
    if (transition.from !== "*" && !stateIds.has(transition.from)) add(`"${name(transition)}" starts from a state that does not exist.`);
    if (!stateIds.has(transition.to)) add(`"${name(transition)}" has no valid destination state.`);
    const event = events.get(transition.event);
    if (!event) add(`"${name(transition)}" uses an event that is not defined.`);
    if (!Number.isInteger(transition.priority) || transition.priority < 0) add(`"${name(transition)}" needs a non-negative whole-number priority.`);
    const predicates = transition.condition?.predicates ?? [];
    if (transition.condition && predicates.length === 0) add(`"${name(transition)}" has an empty condition group.`);
    predicates.forEach((predicate) => {
      references(predicate, transition.actions).forEach((id) => { if (!variables.has(id)) add(`"${id}" is used by "${name(transition)}" but is not a defined variable.`); });
      [predicate.left, predicate.right].forEach((reference) => {
        const field = referenceEventField(reference);
        if (field && !event?.payload?.some((item) => item.id === field)) add(`"${name(transition)}" reads event field "${field}", but that field is not defined.`);
      });
      const leftVariable = variables.get(referenceVariable(predicate.left) ?? "");
      const type = literalType(predicate.right);
      if (leftVariable && type && type !== "null" && type !== leftVariable.type) add(`"${name(transition)}" compares ${leftVariable.label} with a ${type} value. Use a ${leftVariable.type} value instead.`);
      if (predicate.operator.includes("greater") || predicate.operator.includes("less")) {
        if (leftVariable?.type !== "number") add(`"${name(transition)}" uses a numeric comparison with a non-number value.`);
      }
    });
    transition.actions.forEach((action) => {
      if (action.type === "set-variable") {
        const variable = variables.get(action.variable);
        const type = literalType(action.value);
        if (!variable) add(`"${action.variable}" is set by "${name(transition)}" but is not a defined variable.`);
        else if (type && type !== "null" && type !== variable.type) add(`"${name(transition)}" sets ${variable.label} to a ${type} value. Use a ${variable.type} value instead.`);
      } else if (action.type === "emit") {
        const emitted = events.get(action.event);
        if (!emitted) add(`"${name(transition)}" emits an event that is not defined.`);
        else {
          const supplied = new Set(Object.keys(action.data ?? {}));
          emitted.payload?.filter((field) => field.required).forEach((field) => { if (!supplied.has(field.id)) add(`"${name(transition)}" emits ${emitted.label} without required field "${field.id}".`); });
          supplied.forEach((field) => { if (!emitted.payload?.some((item) => item.id === field)) add(`"${name(transition)}" emits unknown ${emitted.label} field "${field}".`); });
        }
      }
    });
    const key = `${transition.from}\u0000${transition.event}`;
    groups.set(key, [...(groups.get(key) ?? []), transition]);
  });

  groups.forEach((group) => {
    const ordered = [...group].sort((a, b) => a.priority - b.priority);
    const priorities = new Set<number>();
    ordered.forEach((transition, index) => {
      const add = (message: string, level: "error" | "warning" = "error") => diagnostics.push({ level, message, transitionId: transition.id });
      if (priorities.has(transition.priority)) add(`"${name(transition)}" shares its priority with another branch. Give every branch a distinct order.`);
      priorities.add(transition.priority);
      if (!transition.condition && index !== ordered.length - 1) add(`"${name(transition)}" is unconditional and must be the final branch.`);
      const duplicate = ordered.slice(0, index).find((candidate) => JSON.stringify(candidate.condition) === JSON.stringify(transition.condition));
      if (duplicate) add(`"${name(transition)}" duplicates the conditions used by "${name(duplicate)}".`);
    });
    if (ordered.length > 1 && ordered.every((transition) => transition.condition)) diagnostics.push({ level: "warning", message: `The ${ordered[0].event} decision from ${ordered[0].from} has no fallback branch.` });
  });

  const reached = new Set([project.initialStateId]);
  let changed = true;
  while (changed) { changed = false; project.transitions.forEach((transition) => { if ((transition.from === "*" || reached.has(transition.from)) && !reached.has(transition.to)) { reached.add(transition.to); changed = true; } }); }
  project.states.filter((state) => !reached.has(state.id)).forEach((state) => diagnostics.push({ level: "warning", message: `"${state.label}" cannot be reached from the initial state.` }));
  return diagnostics;
}

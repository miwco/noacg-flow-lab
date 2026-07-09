import type { FlowAction, FlowCondition, FlowProject } from "./schema";

export type FlowDiagnostic = { level: "error" | "warning"; message: string };

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

export function validateProject(project: FlowProject): FlowDiagnostic[] {
  const diagnostics: FlowDiagnostic[] = [];
  const ids = new Set<string>();
  project.states.forEach((state) => {
    if (ids.has(state.id)) diagnostics.push({ level: "error", message: `Two states use the ID “${state.id}”. Each state needs its own ID.` });
    ids.add(state.id);
  });
  if (!ids.has(project.initialStateId)) diagnostics.push({ level: "error", message: "Choose an initial state before this flow can run." });
  const variableIds = new Set(project.variables.map((variable) => variable.id));
  project.transitions.forEach((transition) => {
    if (transition.from !== "*" && !ids.has(transition.from)) diagnostics.push({ level: "error", message: `Transition “${transition.label ?? transition.id}” starts from a state that does not exist.` });
    if (!ids.has(transition.to)) diagnostics.push({ level: "error", message: `Transition “${transition.label ?? transition.id}” has no valid destination state.` });
    if (!transition.event.trim()) diagnostics.push({ level: "error", message: "A transition needs an operator action or event." });
    referencedVariables(transition.condition, transition.actions).forEach((name) => { if (!variableIds.has(name)) diagnostics.push({ level: "error", message: `“${name}” is used by “${transition.label ?? transition.id}” but is not a defined variable.` }); });
  });
  const reached = new Set([project.initialStateId]);
  let changed = true;
  while (changed) { changed = false; project.transitions.forEach((transition) => { if ((transition.from === "*" || reached.has(transition.from)) && !reached.has(transition.to)) { reached.add(transition.to); changed = true; } }); }
  project.states.filter((state) => !reached.has(state.id)).forEach((state) => diagnostics.push({ level: "warning", message: `“${state.label}” cannot be reached from the initial state.` }));
  if (project.metadata?.reference === "quiz") {
    if (!project.transitions.some((transition) => transition.event === "LOCK" && transition.condition?.left.variable === "selectedAnswer" && transition.condition.operator === "is-set")) diagnostics.push({ level: "warning", message: "The reference quiz should only lock after an answer is selected." });
    if (!project.transitions.some((transition) => transition.from === "locked" && transition.event === "REVEAL")) diagnostics.push({ level: "warning", message: "The reference quiz has no reveal transition after lock." });
  }
  return diagnostics;
}

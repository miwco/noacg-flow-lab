export type FlowValue = string | number | boolean | null;
export type FlowValueType = "string" | "number" | "boolean";

export type FlowField = {
  id: string;
  label: string;
  type: FlowValueType;
  required?: boolean;
  options?: FlowValue[];
  minimum?: number;
  maximum?: number;
  step?: number;
};

export type FlowVariable = FlowField & {
  defaultValue: FlowValue;
  operatorEditable?: boolean;
};

export type FlowState = {
  id: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
};

export type FlowEvent = {
  id: string;
  label: string;
  description?: string;
  source?: "operator" | "external" | "animation-complete";
  payload?: FlowField[];
  animation?: string;
  presentation?: {
    intent?: "primary" | "normal" | "quiet" | "destructive";
    group?: string;
    order?: number;
  };
};

export type ValueReference =
  | FlowValue
  | { variable: string }
  | { eventField: string };

export type FlowPredicate = {
  left: ValueReference;
  operator:
    | "equals"
    | "not-equals"
    | "is-set"
    | "is-not-set"
    | "greater-than"
    | "greater-than-or-equal"
    | "less-than"
    | "less-than-or-equal";
  right?: ValueReference;
};

export type FlowConditionGroup = {
  mode: "all" | "any";
  predicates: FlowPredicate[];
};
export type FlowCondition = FlowConditionGroup;

export type FlowAction =
  | { type: "set-variable"; variable: string; value: ValueReference }
  | { type: "play-animation"; animation: string }
  | { type: "emit"; event: string; data?: Record<string, ValueReference> };

export type FlowTransition = {
  id: string;
  from: string | "*";
  to: string;
  event: string;
  priority: number;
  label?: string;
  condition?: FlowConditionGroup;
  actions: FlowAction[];
};

export type FlowProject = {
  version: 2;
  id: string;
  name: string;
  description: string;
  initialStateId: string;
  states: FlowState[];
  events: FlowEvent[];
  variables: FlowVariable[];
  transitions: FlowTransition[];
  metadata?: {
    reference?: "quiz" | "lower-third";
    renderer?: "quiz" | "lower-third" | "generic";
  };
};

export type FlowEventPayload = { id: string; data?: Record<string, FlowValue> };

export type AvailableEvent = FlowEvent & {
  source: "operator" | "external" | "animation-complete";
};

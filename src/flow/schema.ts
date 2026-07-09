export type FlowValue = string | number | boolean | null;

export type FlowVariable = {
  id: string;
  label: string;
  type: "string" | "number" | "boolean";
  defaultValue: FlowValue;
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
  valueType?: "string" | "number" | "boolean";
};

export type ValueReference = FlowValue | { variable: string } | { eventValue: true };

export type FlowCondition = {
  left: { variable: string };
  operator: "equals" | "not-equals" | "is-set" | "is-not-set";
  right?: ValueReference;
};

export type FlowAction =
  | { type: "set-variable"; variable: string; value: ValueReference }
  | { type: "play-animation"; animation: string }
  | { type: "emit"; event: string };

export type FlowTransition = {
  id: string;
  from: string | "*";
  to: string;
  event: string;
  label?: string;
  condition?: FlowCondition;
  actions: FlowAction[];
};

export type FlowProject = {
  version: 1;
  id: string;
  name: string;
  description: string;
  initialStateId: string;
  states: FlowState[];
  events: FlowEvent[];
  variables: FlowVariable[];
  transitions: FlowTransition[];
  metadata?: { reference?: "quiz" };
};

export type FlowEventPayload = { id: string; value?: FlowValue };

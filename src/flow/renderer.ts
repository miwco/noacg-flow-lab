import type { RuntimeState } from "./runtime";
import type { FlowAction, FlowEventPayload, FlowProject } from "./schema";

export interface FlowRenderer<TTarget = unknown> {
  mount(target: TTarget, project: FlowProject, dispatch: (event: FlowEventPayload) => void): void;
  render(runtime: RuntimeState): void;
  handleAction?(action: FlowAction): void;
  destroy?(): void;
}

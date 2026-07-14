"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleDot,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react";
import { lowerThirdProject } from "@/flow/lower-third-project";
import { quizProject } from "@/flow/quiz-project";
import {
  createFlowController,
  type FlowController,
  type RuntimeState,
} from "@/flow/runtime";
import type {
  AvailableEvent,
  FlowEventPayload,
  FlowField,
  FlowProject,
  FlowValue,
} from "@/flow/schema";
import {
  GenericPreview,
  LowerThirdPreview,
  QuizPreview,
} from "./graphic-preview";

type InstanceDefinition = {
  id: string;
  label: string;
  project: FlowProject;
  specialized?: "quiz" | "lower-third";
};
const definitions: InstanceDefinition[] = [
  {
    id: "program-quiz",
    label: "Program quiz",
    project: quizProject,
    specialized: "quiz",
  },
  {
    id: "guest-lower-third",
    label: "Guest lower third",
    project: lowerThirdProject,
    specialized: "lower-third",
  },
];

function useController(project: FlowProject) {
  const controller = useMemo(() => createFlowController(project), [project]);
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());
  useEffect(() => controller.subscribe(setSnapshot), [controller]);
  return { controller, snapshot };
}

export default function ControlRoom({ onBack }: { onBack: () => void }) {
  const quiz = useController(quizProject);
  const lowerThird = useController(lowerThirdProject);
  const instances = [
    { definition: definitions[0], ...quiz },
    { definition: definitions[1], ...lowerThird },
  ];
  return (
    <main className="control-room-shell">
      <header className="control-room-header">
        <div className="brand">
          <b>
            <CircleDot size={20} />
          </b>
          <div>
            <strong>
              NoaCG <i>Control Room</i>
            </strong>
            <small>Two independent Flow instances</small>
          </div>
        </div>
        <button onClick={onBack}>
          <ArrowLeft size={15} /> Back to authoring
        </button>
      </header>
      <section className="control-room-intro">
        <div>
          <small>PACKAGE PROOF</small>
          <h1>One desk, isolated graphics.</h1>
          <p>
            Each panel queries its own Flow controller. Nothing here combines
            states or guesses which actions are legal.
          </p>
        </div>
        <div className="package-status">
          <LayoutDashboard size={20} />
          <span>
            <b>2</b> independent instances
          </span>
        </div>
      </section>
      <section className="on-air-monitor">
        <small>ON-AIR MONITOR</small>
        <div>
          {instances.map((instance) => (
            <MonitorItem
              key={instance.definition.id}
              definition={instance.definition}
              snapshot={instance.snapshot}
            />
          ))}
        </div>
      </section>
      <section className="instance-grid">
        {instances.map((instance) => (
          <InstancePanel
            key={instance.definition.id}
            definition={instance.definition}
            controller={instance.controller}
            snapshot={instance.snapshot}
          />
        ))}
      </section>
    </main>
  );
}

function MonitorItem({
  definition,
  snapshot,
}: {
  definition: InstanceDefinition;
  snapshot: RuntimeState;
}) {
  const state =
    definition.project.states.find((item) => item.id === snapshot.stateId)
      ?.label ?? snapshot.stateId;
  return (
    <article>
      <i
        className={
          snapshot.stateId === definition.project.initialStateId ? "" : "live"
        }
      />
      <span>
        {definition.label}
        <small>{definition.project.name}</small>
      </span>
      <b>{state}</b>
    </article>
  );
}

function InstancePanel({
  definition,
  controller,
  snapshot,
}: {
  definition: InstanceDefinition;
  controller: FlowController;
  snapshot: RuntimeState;
}) {
  const [notice, setNotice] = useState("Ready.");
  const state = definition.project.states.find(
    (item) => item.id === snapshot.stateId,
  );
  const dispatch = (event: FlowEventPayload) => {
    const result = controller.dispatch(event);
    setNotice(result.ok ? `Ran ${event.id}.` : result.reason);
  };
  const reset = () => {
    const event = controller
      .getAvailableEvents()
      .find((item) => item.id === "RESET");
    if (event) dispatch({ id: event.id });
  };
  return (
    <article className="instance-panel">
      <header>
        <div>
          <small>FLOW INSTANCE</small>
          <h2>{definition.label}</h2>
          <code>{definition.id}</code>
        </div>
        <span
          className={
            snapshot.stateId === definition.project.initialStateId ? "" : "live"
          }
        >
          <i />
          {state?.label ?? snapshot.stateId}
        </span>
      </header>
      <InstancePreview definition={definition} snapshot={snapshot} />
      <div className="instance-body">
        <p>{state?.description}</p>
        <EditableData
          project={definition.project}
          controller={controller}
          snapshot={snapshot}
          onNotice={setNotice}
        />
        <InstanceControls
          events={controller.getAvailableEvents()}
          specialized={definition.specialized}
          dispatch={dispatch}
        />
        <div className="instance-notice">
          <Check size={13} />
          {notice}
        </div>
        <button className="instance-reset" onClick={reset}>
          <RotateCcw size={13} /> Reset instance
        </button>
      </div>
    </article>
  );
}

function InstancePreview({
  definition,
  snapshot,
}: {
  definition: InstanceDefinition;
  snapshot: RuntimeState;
}) {
  return (
    <div className="room-preview-live">
      {definition.specialized === "lower-third" ? (
        <LowerThirdPreview runtime={snapshot} />
      ) : definition.specialized === "quiz" ? (
        <QuizPreview runtime={snapshot} />
      ) : (
        <GenericPreview runtime={snapshot} />
      )}
    </div>
  );
}

function EditableData({
  project,
  controller,
  snapshot,
  onNotice,
}: {
  project: FlowProject;
  controller: FlowController;
  snapshot: RuntimeState;
  onNotice: (notice: string) => void;
}) {
  const editable = project.variables.filter((item) => item.operatorEditable);
  if (!editable.length) return null;
  return (
    <div className="instance-data">
      <small>PREP DATA</small>
      {editable.map((variable) => (
        <label key={variable.id}>
          {variable.label}
          <ContractInput
            field={variable}
            value={snapshot.variables[variable.id]}
            disabled={snapshot.stateId !== project.initialStateId}
            onChange={(value) => {
              const result = controller.setEditableData(variable.id, value);
              onNotice(
                result.ok ? `Updated ${variable.label}.` : result.reason,
              );
            }}
          />
        </label>
      ))}
    </div>
  );
}

function InstanceControls({
  events,
  specialized,
  dispatch,
}: {
  events: AvailableEvent[];
  specialized?: InstanceDefinition["specialized"];
  dispatch: (event: FlowEventPayload) => void;
}) {
  const quizSelect =
    specialized === "quiz"
      ? events.find((event) => event.id === "SELECT_ANSWER")
      : undefined;
  return (
    <div className="instance-controls">
      {quizSelect?.payload?.[0]?.options && (
        <div className="room-answer-buttons">
          {quizSelect.payload[0].options.map((option) => (
            <button
              key={String(option)}
              onClick={() =>
                dispatch({
                  id: quizSelect.id,
                  data: { [quizSelect.payload![0].id]: option },
                })
              }
            >
              {String(option)}
            </button>
          ))}
        </div>
      )}
      {events
        .filter((event) => event !== quizSelect)
        .map((event) => (
          <GenericEventControl
            key={event.id}
            event={event}
            dispatch={dispatch}
          />
        ))}
      {events.length === 0 && (
        <p>No operator actions are legal in this state.</p>
      )}
    </div>
  );
}

function GenericEventControl({
  event,
  dispatch,
}: {
  event: AvailableEvent;
  dispatch: (event: FlowEventPayload) => void;
}) {
  const [data, setData] = useState<Record<string, FlowValue>>({});
  return (
    <div className="generic-event-control">
      {event.payload?.map((field) => (
        <label key={field.id}>
          {field.label}
          <ContractInput
            field={field}
            value={data[field.id] ?? null}
            onChange={(value) =>
              setData((current) => ({ ...current, [field.id]: value }))
            }
          />
        </label>
      ))}
      <button
        className={event.presentation?.intent === "primary" ? "primary" : ""}
        onClick={() => dispatch({ id: event.id, data })}
      >
        {event.label}
      </button>
    </div>
  );
}

function ContractInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FlowField;
  value: FlowValue;
  disabled?: boolean;
  onChange: (value: FlowValue) => void;
}) {
  if (field.options?.length || field.type === "boolean") {
    const options = field.options?.length ? field.options : [true, false];
    return (
      <select
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(
            field.type === "number"
              ? Number(event.target.value)
              : field.type === "boolean"
                ? event.target.value === "true"
                : event.target.value,
          )
        }
      >
        {options.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      disabled={disabled}
      type={field.type === "number" ? "number" : "text"}
      min={field.minimum}
      max={field.maximum}
      step={field.step}
      value={value === null ? "" : String(value)}
      onChange={(event) =>
        onChange(
          field.type === "number"
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeHandle,
  type NodeProps,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertCircle,
  Check,
  CircleDot,
  CircleHelp,
  CodeXml,
  Download,
  FileUp,
  Link2,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { compileStandaloneHtml } from "@/flow/html-export";
import { blankProject } from "@/flow/blank-project";
import { lowerThirdProject } from "@/flow/lower-third-project";
import { migrateProject } from "@/flow/migration";
import { quizProject } from "@/flow/quiz-project";
import {
  availableEvents,
  createRuntime,
  dispatchEvent,
  updateRuntimeVariable,
  type RuntimeState,
  type TransitionTrace,
} from "@/flow/runtime";
import type {
  AvailableEvent,
  FlowAction,
  FlowConditionGroup,
  FlowEvent,
  FlowEventPayload,
  FlowField,
  FlowPredicate,
  FlowProject,
  FlowTransition,
  FlowValue,
  FlowVariable,
  ValueReference,
} from "@/flow/schema";
import { validateProject } from "@/flow/validation";
import {
  GenericPreview,
  LowerThirdPreview,
  QuizPreview,
} from "./graphic-preview";

type Selection = {
  kind: "state" | "transition" | "event" | "variable";
  id: string;
} | null;
type Tab = "preview" | "flow" | "controls" | "inspect";
type WorkspaceMode = "design" | "simulate";
type StateData = {
  label: string;
  active: boolean;
  selected: boolean;
  description?: string;
};
type HistoryItem = {
  before: RuntimeState;
  event: FlowEventPayload;
  trace: TransitionTrace[];
};
type FlowScenario = { id: string; name: string; events: FlowEventPayload[] };

function StateNode({ data }: NodeProps<Node<StateData>>) {
  return (
    <div
      className={`state-node ${data.active ? "active" : ""} ${data.selected ? "selected" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <i />
      <strong>{data.label}</strong>
      <span>
        {data.active ? "LIVE STATE" : data.description || "Flow state"}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { state: StateNode };
const STATE_NODE_WIDTH = 147;
const STATE_NODE_HEIGHT = 76;
const stateNodeHandles: NodeHandle[] = [
  {
    id: null,
    type: "target",
    position: Position.Left,
    x: 0,
    y: 37,
    width: 1,
    height: 2,
  },
  {
    id: null,
    type: "source",
    position: Position.Right,
    x: STATE_NODE_WIDTH - 1,
    y: 37,
    width: 1,
    height: 2,
  },
];

export function createStateGraphNode(
  state: FlowProject["states"][number],
  active: boolean,
  selected: boolean,
): Node<StateData> {
  return {
    id: state.id,
    type: "state",
    position: state.position,
    width: STATE_NODE_WIDTH,
    height: STATE_NODE_HEIGHT,
    handles: stateNodeHandles,
    data: {
      label: state.label,
      description: state.description,
      active,
      selected,
    },
  };
}

export function graphTransitions(
  saved: FlowTransition[],
  pending: FlowTransition | null,
) {
  return pending ? [...saved, pending] : saved;
}

export function createOperatorEventDraft(
  label: string,
  existingEvents: FlowEvent[],
): FlowEvent {
  const cleanLabel = label.trim();
  const baseId =
    cleanLabel
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "EVENT";
  const existingIds = new Set(
    existingEvents.map((event) => event.id.toUpperCase()),
  );
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) id = `${baseId}_${suffix++}`;
  const order =
    Math.max(
      0,
      ...existingEvents.map((event) => event.presentation?.order ?? 0),
    ) + 1;
  return {
    id,
    label: cleanLabel,
    description: `${cleanLabel} operator action.`,
    source: "operator",
    payload: [],
    presentation: { intent: "normal", order },
  };
}

export function createNativeTransitionEdge(
  transition: FlowTransition,
  eventLabel: string,
  selected: boolean,
  fired: boolean,
  draft = false,
  onActivate?: () => void,
): Edge {
  const emphasized = selected || draft;
  return {
    id: transition.id,
    source: transition.from,
    target: transition.to,
    animated: fired && !draft,
    markerEnd: { type: MarkerType.ArrowClosed },
    interactionWidth: 36,
    focusable: true,
    ariaRole: "button",
    ariaLabel: `Edit transition ${transition.label || transition.id}: ${transition.from} to ${transition.to} on ${eventLabel}`,
    domAttributes: onActivate
      ? {
          onKeyDown: (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onActivate();
          },
        }
      : undefined,
    className: `${selected ? "flow-edge-selected" : ""} ${fired ? "flow-edge-fired" : ""} ${draft ? "flow-edge-draft" : ""}`,
    style: {
      stroke: draft ? "#f6bc56" : undefined,
      strokeDasharray: draft ? "8 6" : undefined,
      strokeWidth: emphasized ? 4 : 3,
    },
    label: draft ? `NEW - ${eventLabel}` : eventLabel,
    labelStyle: {
      fill: emphasized ? "#ffe0a3" : "#d7e4ff",
      fontSize: 10,
      fontWeight: 800,
    },
    labelBgStyle: {
      fill: emphasized ? "#302a20" : "#10172b",
      fillOpacity: 0.98,
      stroke: emphasized ? "#f6bc56" : "#5677af",
      strokeWidth: 1,
    },
    labelBgPadding: [7, 5],
    labelBgBorderRadius: 6,
  };
}

function referenceText(reference: ValueReference | undefined) {
  if (reference && typeof reference === "object")
    return "variable" in reference
      ? reference.variable
      : `event.${reference.eventField}`;
  return JSON.stringify(reference);
}
function predicateText(predicate: FlowPredicate) {
  const left = referenceText(predicate.left);
  if (predicate.operator === "is-set") return `${left} has a value`;
  if (predicate.operator === "is-not-set") return `${left} has no value`;
  return `${left} ${predicate.operator.replaceAll("-", " ")} ${referenceText(predicate.right)}`;
}
function conditionText(condition?: FlowConditionGroup) {
  if (!condition) return "Always available";
  return condition.predicates
    .map(predicateText)
    .join(condition.mode === "all" ? " AND " : " OR ");
}
function actionText(action: FlowAction) {
  if (action.type === "play-animation") return `Play "${action.animation}"`;
  if (action.type === "set-variable")
    return `Set ${action.variable} to ${referenceText(action.value)}`;
  return `Emit ${action.event}`;
}
function saveFile(name: string, content: string, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function FlowLab({
  onOpenControlRoom,
}: {
  onOpenControlRoom?: () => void;
}) {
  const [project, setProject] = useState<FlowProject>(quizProject);
  const [runtime, setRuntime] = useState(() => createRuntime(quizProject));
  const [selection, setSelection] = useState<Selection>({
    kind: "state",
    id: "off",
  });
  const [pendingTransition, setPendingTransition] =
    useState<FlowTransition | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [mode, setMode] = useState<WorkspaceMode>("design");
  const [guidedMode, setGuidedMode] = useState(true);
  const [notice, setNotice] = useState("Ready for air.");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);
  const [scenarios, setScenarios] = useState<FlowScenario[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const storageReady = useRef(false);
  const graphInstance = useRef<ReactFlowInstance<Node<StateData>, Edge> | null>(
    null,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("noacg-flow-lab-project");
        if (saved)
          loadProject(
            migrateProject(JSON.parse(saved)),
            "Saved Flow restored.",
          );
      } catch {
        localStorage.removeItem("noacg-flow-lab-project");
      }
      storageReady.current = true;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (storageReady.current)
      localStorage.setItem("noacg-flow-lab-project", JSON.stringify(project));
  }, [project]);
  useEffect(() => {
    if (storageReady.current)
      localStorage.setItem(
        `noacg-flow-scenarios:${project.id}`,
        JSON.stringify(scenarios),
      );
  }, [project.id, scenarios]);

  const diagnostics = useMemo(() => validateProject(project), [project]);
  const hasErrors = diagnostics.some((item) => item.level === "error");
  const allowed = useMemo(
    () => availableEvents(project, runtime),
    [project, runtime],
  );
  const state =
    selection?.kind === "state"
      ? project.states.find((item) => item.id === selection.id)
      : undefined;
  const transition =
    selection?.kind === "transition"
      ? pendingTransition?.id === selection.id
        ? pendingTransition
        : project.transitions.find((item) => item.id === selection.id)
      : undefined;
  const selectedEvent =
    selection?.kind === "event"
      ? project.events.find((item) => item.id === selection.id)
      : undefined;
  const selectedVariable =
    selection?.kind === "variable"
      ? project.variables.find((item) => item.id === selection.id)
      : undefined;
  const stateName =
    project.states.find((item) => item.id === runtime.stateId)?.label ||
    runtime.stateId;
  const startingTemplate =
    project.metadata?.reference === "lower-third"
      ? lowerThirdProject
      : project.metadata?.reference === "quiz"
        ? quizProject
        : blankProject;
  const startingTemplateLabel =
    project.metadata?.reference === "lower-third"
      ? "lower third"
      : project.metadata?.reference === "quiz"
        ? "quiz reference"
        : "blank flow";
  const selectedHistoryItem =
    selectedHistory === null ? history.at(-1) : history[selectedHistory];
  const lastTrace = selectedHistoryItem?.trace.at(-1);

  function loadProject(next: FlowProject, message: string) {
    let savedScenarios: FlowScenario[] = [];
    try {
      savedScenarios = JSON.parse(
        localStorage.getItem(`noacg-flow-scenarios:${next.id}`) || "[]",
      );
    } catch {
      savedScenarios = [];
    }
    setProject(next);
    setPendingTransition(null);
    setRuntime(createRuntime(next));
    setSelection({ kind: "state", id: next.initialStateId });
    setHistory([]);
    setSelectedHistory(null);
    setScenarios(savedScenarios);
    setMode("design");
    setNotice(message);
    window.setTimeout(
      () => graphInstance.current?.fitView({ padding: 0.12 }),
      0,
    );
  }
  const dispatch = useCallback(
    (event: FlowEventPayload) => {
      const before = runtime;
      const result = dispatchEvent(project, runtime, event);
      setRuntime(result.runtime);
      setHistory((items) =>
        [...items, { before, event, trace: result.trace }].slice(-100),
      );
      setSelectedHistory(null);
      if (result.ok) {
        setSelection({ kind: "transition", id: result.transitionId });
        setNotice(
          `Ran ${project.transitions.find((item) => item.id === result.transitionId)?.label || event.id}.`,
        );
      } else setNotice(result.reason);
    },
    [project, runtime],
  );
  const selectTransition = useCallback(
    (id: string) => setSelection({ kind: "transition", id }),
    [],
  );

  const nodes = useMemo<Node<StateData>[]>(
    () =>
      project.states.map((item) =>
        createStateGraphNode(
          item,
          runtime.stateId === item.id,
          selection?.kind === "state" && selection.id === item.id,
        ),
      ),
    [project.states, runtime.stateId, selection],
  );
  const edges = useMemo<Edge[]>(
    () =>
      graphTransitions(project.transitions, pendingTransition)
        .filter((item) => item.from !== "*")
        .map((item) => {
          const selected =
            selection?.kind === "transition" && selection.id === item.id;
          const eventLabel =
            project.events.find((event) => event.id === item.event)?.label ??
            item.event;
          return createNativeTransitionEdge(
            item,
            eventLabel,
            selected,
            runtime.lastTransitionId === item.id,
            pendingTransition?.id === item.id,
            () => selectTransition(item.id),
          );
        }),
    [
      pendingTransition,
      project.events,
      project.transitions,
      runtime.lastTransitionId,
      selectTransition,
      selection,
    ],
  );
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (mode === "simulate") return;
      setProject((current) => ({
        ...current,
        states: current.states.map((item) => {
          const change = changes.find(
            (entry) =>
              entry.type === "position" &&
              entry.id === item.id &&
              entry.position,
          );
          return change?.type === "position" && change.position
            ? { ...item, position: change.position }
            : item;
        }),
      }));
    },
    [mode],
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      if (mode === "simulate" || !connection.source || !connection.target)
        return;
      if (pendingTransition) {
        setSelection({ kind: "transition", id: pendingTransition.id });
        setNotice(
          "Finish or cancel the open new transition before adding another.",
        );
        return;
      }
      const transitionId = `transition-${crypto.randomUUID()}`;
      const event =
        project.events.find((item) => item.source !== "animation-complete") ??
        project.events[0];
      const eventId = event?.id ?? "TAKE";
      const priorities = project.transitions
        .filter(
          (item) => item.from === connection.source && item.event === eventId,
        )
        .map((item) => item.priority);
      if (!event)
        setProject((current) => ({
          ...current,
          events: [
            ...current.events,
            { id: eventId, label: "Take", source: "operator" },
          ],
        }));
      setPendingTransition({
        id: transitionId,
        from: connection.source,
        to: connection.target,
        event: eventId,
        priority: priorities.length ? Math.max(...priorities) + 10 : 0,
        label: "New transition",
        actions: [],
      });
      setSelection({ kind: "transition", id: transitionId });
      setNotice(
        "New transition opened. Configure it, then press Create transition.",
      );
    },
    [mode, pendingTransition, project],
  );

  function enterMode(next: WorkspaceMode) {
    if (next === "simulate" && pendingTransition) {
      setSelection({ kind: "transition", id: pendingTransition.id });
      setNotice("Create or cancel the new transition before testing the Flow.");
      return;
    }
    if (next === "simulate" && hasErrors) {
      setNotice("Fix Flow health errors before simulation.");
      return;
    }
    setMode(next);
    setRuntime(createRuntime(project));
    setHistory([]);
    setSelectedHistory(null);
    setNotice(
      next === "simulate" ? "Simulation started." : "Design mode ready.",
    );
  }
  function stepBack() {
    const item = history.at(-1);
    if (!item) return;
    setRuntime(item.before);
    setHistory((items) => items.slice(0, -1));
    setSelectedHistory(null);
    setNotice("Stepped back one event.");
  }
  function saveScenario() {
    if (!history.length) {
      setNotice("Run at least one event before saving a scenario.");
      return;
    }
    const name = prompt(
      "Scenario name",
      `Scenario ${scenarios.length + 1}`,
    )?.trim();
    if (!name) return;
    setScenarios((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name,
        events: history.map((item) => item.event),
      },
    ]);
    setNotice(`Saved scenario ${name}.`);
  }
  function replayScenario(scenario: FlowScenario) {
    let next = createRuntime(project);
    const replayed: HistoryItem[] = [];
    for (const event of scenario.events) {
      const before = next;
      const result = dispatchEvent(project, next, event);
      replayed.push({ before, event, trace: result.trace });
      next = result.runtime;
      if (!result.ok) break;
    }
    setMode("simulate");
    setRuntime(next);
    setHistory(replayed);
    setSelectedHistory(null);
    setNotice(`Replayed ${scenario.name}.`);
  }

  function importProject(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadProject(
          migrateProject(JSON.parse(String(reader.result))),
          "Flow project imported and normalized to v2.",
        );
      } catch {
        setNotice("That file is not a supported Flow project.");
      }
    };
    reader.readAsText(file);
  }
  function addState() {
    const id = `state-${crypto.randomUUID()}`;
    const anchor =
      state ??
      (transition
        ? project.states.find((item) => item.id === transition.to)
        : undefined) ??
      project.states.find((item) => item.id === project.initialStateId) ??
      project.states[0];
    const position = {
      x: (anchor?.position.x ?? 0) + 300,
      y: anchor?.position.y ?? 170,
    };
    while (
      project.states.some(
        (item) =>
          Math.abs(item.position.x - position.x) < 170 &&
          Math.abs(item.position.y - position.y) < 90,
      )
    )
      position.y += 110;
    setProject((current) => ({
      ...current,
      states: [
        ...current.states,
        {
          id,
          label: "NEW STATE",
          description: "Describe the stable on-air situation.",
          position,
        },
      ],
    }));
    setSelection({ kind: "state", id });
    window.setTimeout(
      () =>
        graphInstance.current?.setCenter(position.x + 74, position.y + 38, {
          zoom: 1,
          duration: 300,
        }),
      0,
    );
    setNotice(
      "State created and selected. Name it in the Inspector, then press Add transition above the graph.",
    );
  }
  function addTransition() {
    if (project.states.length < 2) {
      setNotice(
        "Add a second state before creating a transition between states.",
      );
      return;
    }
    if (pendingTransition) {
      setSelection({ kind: "transition", id: pendingTransition.id });
      setNotice(
        "Finish or cancel the open new transition before adding another.",
      );
      return;
    }
    const firstRoute = project.transitions.length === 0;
    const from = firstRoute
      ? project.initialStateId
      : (state?.id ?? project.initialStateId);
    const to =
      (firstRoute
        ? project.states.find((item) => item.id !== project.initialStateId)?.id
        : project.states.find((item) => item.id !== from)?.id) ??
      project.initialStateId;
    const event =
      project.events.find((item) => item.source !== "animation-complete") ??
      project.events[0];
    const eventId = event?.id ?? "TAKE";
    const transitionId = `transition-${crypto.randomUUID()}`;
    const priorities = project.transitions
      .filter((item) => item.from === from && item.event === eventId)
      .map((item) => item.priority);
    if (!event)
      setProject((current) => ({
        ...current,
        events: [
          ...current.events,
          { id: eventId, label: "Take", source: "operator" },
        ],
      }));
    setPendingTransition({
      id: transitionId,
      from,
      to,
      event: eventId,
      priority: priorities.length ? Math.max(...priorities) + 10 : 0,
      label: "New transition",
      actions: [],
    });
    setSelection({ kind: "transition", id: transitionId });
    setNotice(
      "New transition opened as a dashed amber line. Configure it, then press Create transition.",
    );
  }
  function addVariable() {
    const id = `variable-${crypto.randomUUID()}`;
    setProject((current) => ({
      ...current,
      variables: [
        ...current.variables,
        { id, label: "New variable", type: "string", defaultValue: "" },
      ],
    }));
    setSelection({ kind: "variable", id });
  }
  function addEvent() {
    const id = `EVENT_${project.events.length + 1}`;
    setProject((current) => ({
      ...current,
      events: [
        ...current.events,
        { id, label: "New event", source: "operator", payload: [] },
      ],
    }));
    setSelection({ kind: "event", id });
    setNotice(
      "Operator action created. Name it here, then add or select a transition and choose this event in its Event field.",
    );
  }

  return (
    <main
      className={`lab-shell mode-${mode} ${guidedMode ? "guided-mode" : ""}`}
    >
      <header className="topbar">
        <div className="brand">
          <b>
            <CircleDot size={20} />
          </b>
          <div>
            <strong>
              NoaCG <i>Flow Lab</i>
            </strong>
            <small>Visual behavior for live HTML graphics</small>
          </div>
        </div>
        <div className="topbar-actions">
          <span>
            <Check size={14} /> Flow JSON v2
          </span>
          {onOpenControlRoom && (
            <button className="open-control-room" onClick={onOpenControlRoom}>
              Control room
            </button>
          )}
          <div className="mode-switch">
            <button
              className={mode === "design" ? "active" : ""}
              onClick={() => enterMode("design")}
            >
              Design
            </button>
            <button
              className={mode === "simulate" ? "active" : ""}
              onClick={() => enterMode("simulate")}
            >
              Simulate
            </button>
          </div>
          <button
            className={`help-button ${guidedMode ? "active" : ""}`}
            onClick={() => setGuidedMode((value) => !value)}
            title="Show workflow help"
          >
            <CircleHelp size={17} />
          </button>
          <select
            className="reference-picker"
            value={project.metadata?.reference ?? "blank"}
            onChange={(event) => {
              const choice = event.target.value;
              loadProject(
                choice === "lower-third"
                  ? lowerThirdProject
                  : choice === "blank"
                    ? blankProject
                    : quizProject,
                choice === "blank"
                  ? "Blank Flow created. Add a state, connect it, then configure the transition."
                  : "Reference loaded.",
              );
            }}
          >
            <option value="quiz">Quiz reference</option>
            <option value="lower-third">Lower third</option>
            <option value="blank">Blank flow</option>
          </select>
          <button
            onClick={() =>
              saveFile(
                "noacg-flow-project.json",
                JSON.stringify(project, null, 2),
              )
            }
            title="Export Flow JSON"
          >
            <Download size={16} />
          </button>
          <button
            disabled={hasErrors}
            onClick={() =>
              saveFile(
                `${project.id}.html`,
                compileStandaloneHtml(project),
                "text/html",
              )
            }
            title="Export standalone HTML"
          >
            <CodeXml size={16} />
          </button>
          <button
            onClick={() => importRef.current?.click()}
            title="Import Flow JSON"
          >
            <FileUp size={16} />
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) =>
              event.target.files?.[0] && importProject(event.target.files[0])
            }
          />
        </div>
      </header>
      <nav className="mobile-tabs" aria-label="Workspace">
        {(["preview", "flow", "controls", "inspect"] as Tab[]).map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      <section className={`workspace tab-${tab}`}>
        <div className="left-column">
          <section className="panel preview-panel">
            <Title
              eyebrow="Live preview"
              title={project.name}
              right={
                <span className="state-pill">
                  <i />
                  {stateName}
                </span>
              }
            />
            {project.metadata?.renderer === "lower-third" ? (
              <LowerThirdPreview runtime={runtime} />
            ) : project.metadata?.renderer === "quiz" ? (
              <QuizPreview runtime={runtime} />
            ) : (
              <GenericPreview runtime={runtime} />
            )}
            <div className="preview-foot">
              <span>
                <Sparkles size={14} />
                {runtime.lastAnimation
                  ? `Animation: ${runtime.lastAnimation}`
                  : "Waiting for transition"}
              </span>
              <span>16:9 output</span>
            </div>
          </section>
          <section className="panel runtime-panel">
            <Title
              eyebrow="Runtime data"
              title={
                runtime.stateId === project.initialStateId
                  ? "Ready to edit"
                  : "Live values"
              }
            />
            <div className="variable-list">
              {project.variables.map((variable) => (
                <div key={variable.id}>
                  <span>
                    {variable.label}
                    <small>{variable.id}</small>
                  </span>
                  {variable.operatorEditable &&
                  runtime.stateId === project.initialStateId ? (
                    <RuntimeValueInput
                      variable={variable}
                      value={runtime.variables[variable.id]}
                      onChange={(value) => {
                        const result = updateRuntimeVariable(
                          project,
                          runtime,
                          variable.id,
                          value,
                        );
                        setRuntime(result.runtime);
                        if (!result.ok) setNotice(result.reason);
                      }}
                    />
                  ) : (
                    <strong>
                      {runtime.variables[variable.id] === null
                        ? "-"
                        : String(runtime.variables[variable.id])}
                    </strong>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="panel graph-panel">
          <Title
            eyebrow={mode === "simulate" ? "Simulation graph" : "State graph"}
            title={project.name}
            right={
              mode === "design" ? (
                <div className="graph-actions">
                  <button onClick={addState}>
                    <Plus size={14} /> Add state
                  </button>
                  <button
                    onClick={addTransition}
                    disabled={project.states.length < 2}
                  >
                    <Link2 size={14} />
                    {pendingTransition
                      ? "Finish new transition"
                      : "Add transition"}
                  </button>
                </div>
              ) : (
                <div className="graph-actions">
                  <button onClick={stepBack} disabled={!history.length}>
                    Step back
                  </button>
                  <button
                    onClick={() => {
                      setRuntime(createRuntime(project));
                      setHistory([]);
                    }}
                  >
                    Reset
                  </button>
                </div>
              )
            }
          />
          {guidedMode && mode === "design" && (
            <AuthoringGuide
              project={project}
              onSelect={setSelection}
              onAddState={addState}
              onAddTransition={addTransition}
              onSimulate={() => enterMode("simulate")}
            />
          )}
          <div className="graph-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) =>
                setSelection({ kind: "state", id: node.id })
              }
              onEdgeClick={(_, edge) => selectTransition(edge.id)}
              onInit={(instance) => {
                graphInstance.current = instance;
                window.setTimeout(() => instance.fitView({ padding: 0.12 }), 0);
              }}
              fitView
              minZoom={0.4}
              maxZoom={1.5}
              zoomOnScroll={false}
              preventScrolling={false}
              zoomActivationKeyCode="Control"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#263558" gap={20} size={1} />
              <MiniMap
                nodeColor={(node) =>
                  node.id === runtime.stateId ? "#79a6ff" : "#26385d"
                }
                maskColor="rgba(8,12,25,.7)"
                pannable
                zoomable
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="graph-transition-strip">
            <span>TRANSITIONS - SELECT TO EDIT</span>
            {project.transitions.length === 0 && (
              <p>No transitions yet. Use Add transition above the graph.</p>
            )}
            {[...project.transitions]
              .sort(
                (a, b) =>
                  a.from.localeCompare(b.from) ||
                  a.event.localeCompare(b.event) ||
                  a.priority - b.priority,
              )
              .map((item) => (
                <button
                  key={item.id}
                  className={`${runtime.lastTransitionId === item.id ? "fired" : ""} ${selection?.kind === "transition" && selection.id === item.id ? "selected" : ""}`}
                  onClick={() =>
                    setSelection({ kind: "transition", id: item.id })
                  }
                >
                  <small>
                    {project.states.find((state) => state.id === item.from)
                      ?.label ?? "ANY"}{" "}
                    {" → "}
                    {project.states.find((state) => state.id === item.to)
                      ?.label ?? item.to}
                  </small>
                  <strong>{item.event}</strong>
                  <span>{item.label || "Edit logic"}</span>
                </button>
              ))}
          </div>
          <div className="graph-note">
            <span>
              <i className="dot live" /> Active state
            </span>
            <span>
              <i className="dot fired" /> Last transition
            </span>
            <span>
              {pendingTransition
                ? "Dashed amber line: unsaved transition"
                : "Click a transition label to edit logic"}
            </span>
            <span>Ctrl + wheel to zoom</span>
            <span>Minimap: drag to navigate, wheel to zoom</span>
            <span>Mode: {mode}</span>
          </div>
        </section>
        <div className="right-column">
          <section className="panel controls-panel">
            <Title eyebrow="Operator controls" title="Only legal actions" />
            {guidedMode && (
              <div className="operator-guide">
                <strong>
                  {mode === "simulate" ? "Test safely" : "Operator sequence"}
                </strong>
                <span>
                  Prepare data, Take, then use only the actions offered by the
                  runtime.
                </span>
              </div>
            )}
            <p>
              {
                project.states.find((item) => item.id === runtime.stateId)
                  ?.description
              }
            </p>
            <EventControls
              events={allowed}
              runtime={runtime}
              dispatch={dispatch}
            />
            <div
              className={`notice ${notice.includes("not ") || notice.includes("Fix") ? "warning" : ""}`}
            >
              {notice.includes("not ") || notice.includes("Fix") ? (
                <AlertCircle size={15} />
              ) : (
                <Check size={15} />
              )}
              {notice}
            </div>
            {mode === "simulate" && (
              <ScenarioControls
                history={history}
                scenarios={scenarios}
                onSave={saveScenario}
                onReplay={replayScenario}
                onDelete={(id) =>
                  setScenarios((items) =>
                    items.filter((item) => item.id !== id),
                  )
                }
              />
            )}
          </section>
          <section className="panel inspector-panel">
            <Title
              eyebrow="Inspector"
              title={
                transition
                  ? "Transition"
                  : state
                    ? "State"
                    : selectedEvent
                      ? "Event contract"
                      : selectedVariable
                        ? "Variable contract"
                        : "Select a graph item"
              }
            />
            <div className="inspector-scroll">
              {state && (
                <div className="inspector-content">
                  <div className="selection-explainer">
                    <strong>State = stable situation</strong>
                    <span>
                      Use a variable for text, scores, choices, and other
                      changing data.
                    </span>
                  </div>
                  <Info label="State ID" value={state.id} />
                  <label>
                    Name
                    <input
                      disabled={mode === "simulate"}
                      value={state.label}
                      onChange={(event) =>
                        setProject((current) => ({
                          ...current,
                          states: current.states.map((item) =>
                            item.id === state.id
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      disabled={mode === "simulate"}
                      value={state.description || ""}
                      onChange={(event) =>
                        setProject((current) => ({
                          ...current,
                          states: current.states.map((item) =>
                            item.id === state.id
                              ? { ...item, description: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  {mode === "design" && state.id !== project.initialStateId && (
                    <button
                      className="delete-transition"
                      onClick={() => {
                        if (
                          !confirm(
                            `Delete ${state.label} and its connected transitions?`,
                          )
                        )
                          return;
                        setProject((current) => ({
                          ...current,
                          states: current.states.filter(
                            (item) => item.id !== state.id,
                          ),
                          transitions: current.transitions.filter(
                            (item) =>
                              item.from !== state.id && item.to !== state.id,
                          ),
                        }));
                        setSelection({
                          kind: "state",
                          id: project.initialStateId,
                        });
                      }}
                    >
                      Delete state
                    </button>
                  )}
                </div>
              )}
              {mode === "design" && transition && (
                <TransitionEditor
                  key={transition.id}
                  transition={transition}
                  project={project}
                  isNew={pendingTransition?.id === transition.id}
                  onDraftChange={setPendingTransition}
                  onSave={(next, newEvents) => {
                    const isNew = pendingTransition?.id === next.id;
                    setProject((current) => ({
                      ...current,
                      events: [
                        ...current.events,
                        ...newEvents.filter(
                          (event) =>
                            !current.events.some(
                              (existing) => existing.id === event.id,
                            ),
                        ),
                      ],
                      transitions: isNew
                        ? [...current.transitions, next]
                        : current.transitions.map((item) =>
                            item.id === next.id ? next : item,
                          ),
                    }));
                    if (isNew) setPendingTransition(null);
                    setNotice(
                      isNew
                        ? newEvents.length
                          ? `Transition and ${newEvents[0].label} operator action created.`
                          : "Transition created."
                        : newEvents.length
                          ? `Transition changes and ${newEvents[0].label} operator action saved.`
                          : "Transition changes saved.",
                    );
                  }}
                  onDelete={() => {
                    if (pendingTransition?.id === transition.id) {
                      setPendingTransition(null);
                      setSelection({
                        kind: "state",
                        id:
                          transition.from === "*"
                            ? project.initialStateId
                            : transition.from,
                      });
                      setNotice("New transition canceled.");
                    } else {
                      setProject((current) => ({
                        ...current,
                        transitions: current.transitions.filter(
                          (item) => item.id !== transition.id,
                        ),
                      }));
                      setSelection(null);
                    }
                  }}
                />
              )}
              {mode === "simulate" && transition && (
                <div className="inspector-content">
                  <Info label="Event" value={transition.event} />
                  <Info label="Priority" value={String(transition.priority)} />
                  <Info label="From" value={transition.from} />
                  <Info label="To" value={transition.to} />
                  <Info
                    label="Condition"
                    value={conditionText(transition.condition)}
                  />
                  <div className="action-list">
                    <small>ACTIONS</small>
                    {transition.actions.map((action, index) => (
                      <div key={index}>
                        <b>{index + 1}</b>
                        {actionText(action)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mode === "design" && selectedEvent && (
                <>
                  <EventRelationship
                    event={selectedEvent}
                    project={project}
                    onSelectTransition={selectTransition}
                  />
                  <EventContractEditor
                    event={selectedEvent}
                    onChange={(next) =>
                      setProject((current) => ({
                        ...current,
                        events: current.events.map((item) =>
                          item.id === selectedEvent.id ? next : item,
                        ),
                        transitions: current.transitions.map((item) =>
                          item.event === selectedEvent.id
                            ? { ...item, event: next.id }
                            : item,
                        ),
                      }))
                    }
                  />
                </>
              )}
              {mode === "design" && selectedVariable && (
                <>
                  <VariableRelationship
                    variable={selectedVariable}
                    project={project}
                    runtime={runtime}
                    onSelectTransition={selectTransition}
                    onRuntimeChange={(value) => {
                      const result = updateRuntimeVariable(
                        project,
                        runtime,
                        selectedVariable.id,
                        value,
                      );
                      setRuntime(result.runtime);
                      setNotice(
                        result.ok
                          ? `${selectedVariable.label} preview value updated.`
                          : result.reason,
                      );
                    }}
                    onShowPreview={() => setTab("preview")}
                  />
                  <VariableContractEditor
                    variable={selectedVariable}
                    onChange={(next) => {
                      setProject((current) => ({
                        ...current,
                        variables: current.variables.map((item) =>
                          item.id === selectedVariable.id ? next : item,
                        ),
                      }));
                      if (
                        next.type !== selectedVariable.type ||
                        next.defaultValue !== selectedVariable.defaultValue
                      ) {
                        setRuntime((current) => ({
                          ...current,
                          variables: {
                            ...current.variables,
                            [next.id]: next.defaultValue,
                          },
                        }));
                      }
                    }}
                  />
                </>
              )}
              {mode === "simulate" && (
                <SimulationTimeline
                  history={history}
                  selected={selectedHistory}
                  onSelect={setSelectedHistory}
                />
              )}
              {mode === "simulate" && lastTrace && (
                <TracePanel trace={lastTrace} project={project} />
              )}
            </div>
          </section>
          {mode === "design" && (
            <DataContractsPanel
              project={project}
              selection={selection}
              onSelect={setSelection}
              onAddEvent={addEvent}
              onAddVariable={addVariable}
            />
          )}
          {mode === "design" && (
            <GraphicContractPanel project={project} onSelect={setSelection} />
          )}
          <section className="panel validation-panel">
            <Title
              eyebrow="Flow health"
              title={hasErrors ? "Needs attention" : "Looking good"}
            />
            {diagnostics.length ? (
              diagnostics.map((item, index) => (
                <div className={`diagnostic ${item.level}`} key={index}>
                  <AlertCircle size={14} />
                  {item.message}
                </div>
              ))
            ) : (
              <div className="diagnostic okay">
                <Check size={14} /> No structural issues found.
              </div>
            )}
            {mode === "design" && (
              <button
                className="text-action"
                onClick={() =>
                  loadProject(
                    startingTemplate,
                    `${startingTemplateLabel[0].toUpperCase()}${startingTemplateLabel.slice(1)} restored.`,
                  )
                }
              >
                <RotateCcw size={14} /> Restore {startingTemplateLabel}
              </button>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function AuthoringGuide({
  project,
  onSelect,
  onAddState,
  onAddTransition,
  onSimulate,
}: {
  project: FlowProject;
  onSelect: (selection: Selection) => void;
  onAddState: () => void;
  onAddTransition: () => void;
  onSimulate: () => void;
}) {
  const isBlank = project.metadata?.renderer === "generic";
  const exampleState =
    project.states.find((item) => item.id !== project.initialStateId) ??
    project.states[0];
  const exampleTransition =
    project.transitions.find((item) => item.from !== "*") ??
    project.transitions[0];
  const exampleVariable = project.variables[0];
  return (
    <div className="author-guide">
      <div>
        <small>BUILD THIS FLOW</small>
        <strong>
          {isBlank
            ? "Create one state, connect it, then edit the logic."
            : "Modify the working example, then test it."}
        </strong>
      </div>
      <button
        onClick={
          isBlank && project.states.length === 1
            ? onAddState
            : () =>
                exampleState && onSelect({ kind: "state", id: exampleState.id })
        }
      >
        <b>1</b>
        <span>
          {isBlank && project.states.length === 1
            ? "Add on-air state"
            : "Edit a state"}
          <small>Stable on-air situation</small>
        </span>
      </button>
      <button disabled={project.states.length < 2} onClick={onAddTransition}>
        <b>2</b>
        <span>
          {exampleTransition ? "Add another transition" : "Add transition"}
          <small>Create a new connection between states</small>
        </span>
      </button>
      <button
        disabled={!exampleTransition}
        onClick={() =>
          exampleTransition
            ? onSelect({ kind: "transition", id: exampleTransition.id })
            : exampleVariable &&
              onSelect({ kind: "variable", id: exampleVariable.id })
        }
      >
        <b>3</b>
        <span>
          Edit the logic<small>Conditions and named actions</small>
        </span>
      </button>
      <button disabled={!exampleTransition} onClick={onSimulate}>
        <b>4</b>
        <span>
          Test the result<small>Only legal actions appear</small>
        </span>
      </button>
    </div>
  );
}

function Title({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
      </div>
      {right}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <small>{label}</small>
      <span>{value}</span>
    </div>
  );
}

function transitionRoute(project: FlowProject, transition: FlowTransition) {
  const from =
    transition.from === "*"
      ? "ANY STATE"
      : (project.states.find((state) => state.id === transition.from)?.label ??
        transition.from);
  const to =
    project.states.find((state) => state.id === transition.to)?.label ??
    transition.to;
  return `${from} → ${to}`;
}

function EventRelationship({
  event,
  project,
  onSelectTransition,
}: {
  event: FlowProject["events"][number];
  project: FlowProject;
  onSelectTransition: (id: string) => void;
}) {
  const routes = project.transitions.filter((item) => item.event === event.id);
  return (
    <div className="contract-relationship">
      <small>HOW THIS CONNECTS</small>
      <strong>
        {event.source === "operator" || !event.source
          ? `Operator button: ${event.label}`
          : `Trigger: ${event.label}`}
      </strong>
      <p>
        When {event.id} is triggered, Flow looks for a matching transition from
        the current state. The winning transition checks its conditions, moves
        to its destination state, and runs its actions.
      </p>
      <div className="relationship-flow">
        <span>{event.label}</span>
        <i>→</i>
        <b>
          {routes.length
            ? `${routes.length} legal route${routes.length === 1 ? "" : "s"}`
            : "No transition yet"}
        </b>
      </div>
      {routes.map((route) => (
        <button key={route.id} onClick={() => onSelectTransition(route.id)}>
          <span>{transitionRoute(project, route)}</span>
          <strong>{route.label || route.event}</strong>
          <small>Edit transition logic</small>
        </button>
      ))}
      {!routes.length && (
        <p className="relationship-warning">
          This event cannot appear as a legal operator action until a transition
          selects it in the Event field.
        </p>
      )}
    </div>
  );
}

function referenceUsesVariable(
  reference: ValueReference | undefined,
  variableId: string,
) {
  return Boolean(
    reference &&
    typeof reference === "object" &&
    "variable" in reference &&
    reference.variable === variableId,
  );
}

function transitionUsesVariable(
  transition: FlowTransition,
  variableId: string,
) {
  return transitionVariableUsage(transition, variableId).length > 0;
}

export function transitionVariableUsage(
  transition: FlowTransition,
  variableId: string,
) {
  const usage = new Set<string>();
  const conditionUse = transition.condition?.predicates.some(
    (predicate) =>
      referenceUsesVariable(predicate.left, variableId) ||
      referenceUsesVariable(predicate.right, variableId),
  );
  if (conditionUse) usage.add("Reads condition");
  transition.actions.forEach((action) => {
    if (action.type === "set-variable") {
      if (action.variable === variableId) usage.add("Changes value");
      if (referenceUsesVariable(action.value, variableId))
        usage.add("Reads value");
    }
    if (
      action.type === "emit" &&
      Object.values(action.data ?? {}).some((value) =>
        referenceUsesVariable(value, variableId),
      )
    )
      usage.add("Reads for emitted event");
  });
  return [...usage];
}

export function rendererVariableConnection(
  project: FlowProject,
  variable: FlowVariable,
) {
  const renderer = project.metadata?.renderer ?? "generic";
  if (renderer === "generic")
    return {
      renderer,
      connected: true,
      slot: `Generated data row: ${variable.id}`,
      visibility: "Every state",
      explanation:
        "The blank-flow renderer automatically shows every variable. No state connection is required.",
    };
  if (renderer === "lower-third" && variable.id === "name")
    return {
      renderer,
      connected: true,
      slot: "Primary name text",
      visibility: "On air in IN and HOLD",
      explanation:
        "The lower-third reference renderer reads this value continuously.",
    };
  if (renderer === "lower-third" && variable.id === "role")
    return {
      renderer,
      connected: true,
      slot: "Secondary role text",
      visibility: "On air in IN and HOLD",
      explanation:
        "The lower-third reference renderer reads this value continuously.",
    };
  if (renderer === "quiz" && variable.id === "selectedAnswer")
    return {
      renderer,
      connected: true,
      slot: "Selected answer highlight",
      visibility: "QUESTION through RESULT when a value is set",
      explanation:
        "Quiz transitions change this value when the operator selects an answer.",
    };
  if (renderer === "quiz" && variable.id === "correctAnswer")
    return {
      renderer,
      connected: true,
      slot: "Correct-answer reveal",
      visibility: "RESULT state",
      explanation:
        "The quiz renderer compares this value with the selected answer during Reveal.",
    };
  return {
    renderer,
    connected: false,
    slot: "No visual slot in this reference renderer",
    visibility: "Not rendered",
    explanation:
      "The variable is valid Flow data, but this pre-wired reference renderer does not consume it.",
  };
}

function VariableRelationship({
  variable,
  project,
  runtime,
  onSelectTransition,
  onRuntimeChange,
  onShowPreview,
}: {
  variable: FlowVariable;
  project: FlowProject;
  runtime: RuntimeState;
  onSelectTransition: (id: string) => void;
  onRuntimeChange: (value: FlowValue) => void;
  onShowPreview: () => void;
}) {
  const connection = rendererVariableConnection(project, variable);
  const routes = project.transitions.filter((transition) =>
    transitionUsesVariable(transition, variable.id),
  );
  return (
    <div className="contract-relationship">
      <small>HOW THIS CONNECTS</small>
      <strong>Changing data: {variable.label}</strong>
      <p>
        Variables do not connect directly to states. A renderer reads their
        current values, while transition conditions may inspect them and Set
        variable actions may change them.
      </p>
      <div className="relationship-flow">
        <span>{variable.id}</span>
        <i>→</i>
        <b>Renderer data</b>
      </div>
      <div
        className={`renderer-variable-slot ${
          connection.connected ? "connected" : "unmapped"
        }`}
      >
        <small>{connection.connected ? "CONNECTED OUTPUT" : "NOT MAPPED"}</small>
        <strong>{connection.slot}</strong>
        <span>{connection.visibility}</span>
        <p>{connection.explanation}</p>
      </div>
      <div className="variable-preview-value">
        <span>
          <small>CURRENT PREVIEW VALUE</small>
          <b>
            {runtime.variables[variable.id] === null
              ? "-"
              : String(runtime.variables[variable.id])}
          </b>
        </span>
        {variable.operatorEditable &&
        runtime.stateId === project.initialStateId ? (
          <RuntimeValueInput
            variable={variable}
            value={runtime.variables[variable.id]}
            onChange={onRuntimeChange}
            ariaLabel={`Current preview value for ${variable.label}`}
          />
        ) : (
          <small>
            {variable.operatorEditable
              ? "Return to the initial state to edit this value."
              : "Transition logic controls this runtime value."}
          </small>
        )}
        <button type="button" onClick={onShowPreview}>
          Show in preview
        </button>
      </div>
      {routes.map((route) => (
        <button key={route.id} onClick={() => onSelectTransition(route.id)}>
          <span>{transitionRoute(project, route)}</span>
          <strong>{route.label || route.event}</strong>
          <small>
            {transitionVariableUsage(route, variable.id).join(" + ")}
          </small>
        </button>
      ))}
      {!routes.length && (
        <p className="relationship-warning">
          No transition reads or changes this variable yet. Add a condition or
          Set variable action in a transition to use it in Flow logic.
        </p>
      )}
      <p className="relationship-limit">
        Flow supplies behavior and data. The renderer decides visual placement
        and visibility, so variables do not need a separate state connection.
      </p>
    </div>
  );
}

function DataContractsPanel({
  project,
  selection,
  onSelect,
  onAddEvent,
  onAddVariable,
}: {
  project: FlowProject;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onAddEvent: () => void;
  onAddVariable: () => void;
}) {
  return (
    <section className="panel contracts-panel">
      <Title eyebrow="Behavior contracts" title="Operator actions and data" />
      <p className="contracts-intro">
        An operator action declares a button or trigger. A transition decides
        where that event is legal and what happens when it fires. To create In,
        Next, Out, or Reset buttons, add and name each action here, then select
        it in the Event field of the appropriate transition.
      </p>
      <div className="contract-group">
        <div>
          <small>EVENTS / OPERATOR BUTTONS</small>
          <button onClick={onAddEvent}>
            <Plus size={12} /> Operator action
          </button>
        </div>
        {project.events.map((event) => (
          <button
            key={event.id}
            className={
              selection?.kind === "event" && selection.id === event.id
                ? "selected"
                : ""
            }
            onClick={() => onSelect({ kind: "event", id: event.id })}
          >
            <span>
              {event.label}
              <small>{event.id}</small>
            </span>
            <b>
              {project.transitions.filter((item) => item.event === event.id)
                .length || "No"}{" "}
              routes
            </b>
          </button>
        ))}
      </div>
      <div className="contract-group">
        <div>
          <small>VARIABLES</small>
          <button onClick={onAddVariable}>
            <Plus size={12} /> Variable
          </button>
        </div>
        {project.variables.map((variable) => (
          <button
            key={variable.id}
            className={
              selection?.kind === "variable" && selection.id === variable.id
                ? "selected"
                : ""
            }
            onClick={() => onSelect({ kind: "variable", id: variable.id })}
          >
            <span>
              {variable.label}
              <small>{variable.id}</small>
            </span>
            <b>{variable.type}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function GraphicContractPanel({
  project,
  onSelect,
}: {
  project: FlowProject;
  onSelect: (selection: Selection) => void;
}) {
  const renderer = project.metadata?.renderer ?? "generic";
  const animations = [
    ...new Set(
      project.transitions.flatMap((transition) =>
        transition.actions
          .filter(
            (
              action,
            ): action is Extract<FlowAction, { type: "play-animation" }> =>
              action.type === "play-animation",
          )
          .map((action) => action.animation),
      ),
    ),
  ];
  return (
    <section className="panel graphic-contract-panel">
      <Title eyebrow="Graphic connection" title="What the renderer receives" />
      <div className="graphic-contract-intro">
        <strong>{renderer} renderer</strong>
        <p>
          The renderer stays mounted. Flow sends its current state, variable
          values, and named animation actions. Flow does not contain the visual
          design or animation timeline.
        </p>
      </div>
      <div className="contract-map">
        <small>STATE</small>
        <span>Controls which stable visual situation is shown</span>
        <small>DATA</small>
        <div>
          {project.variables.length ? (
            project.variables.map((variable) => (
              <button
                key={variable.id}
                onClick={() => onSelect({ kind: "variable", id: variable.id })}
              >
                <b>{variable.label}</b>
                <span>← {variable.id}</span>
              </button>
            ))
          ) : (
            <span>No variables yet</span>
          )}
        </div>
        <small>ANIMATIONS</small>
        <div>
          {animations.length ? (
            animations.map((animation) => (
              <code key={animation}>{animation}</code>
            ))
          ) : (
            <span>No named animation actions yet</span>
          )}
        </div>
      </div>
      <p className="graphic-contract-note">
        {renderer === "generic"
          ? "The generic preview shows every variable in every state. Choosing which visual text slot appears in each state is not yet authorable here; that requires the future design-layer binding UI."
          : "This reference renderer is pre-wired. Editable visual slot mapping belongs to the next design-layer integration, while the Flow contract remains platform-neutral."}
      </p>
    </section>
  );
}

function parseOptions(
  raw: string,
  type: FlowField["type"],
): FlowValue[] | undefined {
  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      type === "number"
        ? Number(item)
        : type === "boolean"
          ? item === "true"
          : item,
    );
  return values.length ? values : undefined;
}
function typedValue(raw: string, type: FlowField["type"]): FlowValue {
  if (raw === "") return type === "string" ? "" : null;
  return type === "number"
    ? Number(raw)
    : type === "boolean"
      ? raw === "true"
      : raw;
}

function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: FlowField;
  onChange: (field: FlowField) => void;
  onRemove: () => void;
}) {
  return (
    <div className="field-editor">
      <label>
        Field ID
        <input
          value={field.id}
          onChange={(event) =>
            onChange({ ...field, id: event.target.value.replace(/\W/g, "") })
          }
        />
      </label>
      <label>
        Label
        <input
          value={field.label}
          onChange={(event) =>
            onChange({ ...field, label: event.target.value })
          }
        />
      </label>
      <label>
        Type
        <select
          value={field.type}
          onChange={(event) =>
            onChange({
              ...field,
              type: event.target.value as FlowField["type"],
              options: undefined,
              minimum: undefined,
              maximum: undefined,
              step: undefined,
            })
          }
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={field.required ?? false}
          onChange={(event) =>
            onChange({ ...field, required: event.target.checked })
          }
        />{" "}
        Required
      </label>
      <label>
        Options
        <input
          value={field.options?.join(", ") ?? ""}
          placeholder="Comma-separated"
          onChange={(event) =>
            onChange({
              ...field,
              options: parseOptions(event.target.value, field.type),
            })
          }
        />
      </label>
      {field.type === "number" && (
        <div className="number-constraints">
          <label>
            Min
            <input
              type="number"
              value={field.minimum ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  minimum:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Max
            <input
              type="number"
              value={field.maximum ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  maximum:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Step
            <input
              type="number"
              value={field.step ?? ""}
              onChange={(event) =>
                onChange({
                  ...field,
                  step:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      )}
      <button className="remove-action" onClick={onRemove}>
        Remove field
      </button>
    </div>
  );
}

function EventContractEditor({
  event,
  onChange,
}: {
  event: FlowProject["events"][number];
  onChange: (event: FlowProject["events"][number]) => void;
}) {
  const fields = event.payload ?? [];
  return (
    <div className="inspector-content contract-editor">
      <label>
        Event ID
        <input
          value={event.id}
          readOnly
          title="Event IDs stay stable after creation"
        />
      </label>
      <label>
        Label
        <input
          value={event.label}
          onChange={(change) =>
            onChange({ ...event, label: change.target.value })
          }
        />
      </label>
      <label>
        Description
        <textarea
          value={event.description ?? ""}
          onChange={(change) =>
            onChange({ ...event, description: change.target.value })
          }
        />
      </label>
      <label>
        Source
        <select
          value={event.source ?? "operator"}
          onChange={(change) =>
            onChange({
              ...event,
              source: change.target.value as NonNullable<typeof event.source>,
            })
          }
        >
          <option value="operator">Operator</option>
          <option value="external">External</option>
          <option value="animation-complete">Animation complete</option>
        </select>
      </label>
      {event.source === "animation-complete" && (
        <label>
          Animation name
          <input
            value={event.animation ?? ""}
            onChange={(change) =>
              onChange({ ...event, animation: change.target.value })
            }
          />
        </label>
      )}
      <div className="contract-heading">
        <small>PAYLOAD FIELDS</small>
        <button
          onClick={() =>
            onChange({
              ...event,
              payload: [
                ...fields,
                {
                  id: `field${fields.length + 1}`,
                  label: "New field",
                  type: "string",
                },
              ],
            })
          }
        >
          <Plus size={12} /> Field
        </button>
      </div>
      {fields.map((field, index) => (
        <FieldEditor
          key={index}
          field={field}
          onChange={(next) =>
            onChange({
              ...event,
              payload: fields.map((item, itemIndex) =>
                itemIndex === index ? next : item,
              ),
            })
          }
          onRemove={() =>
            onChange({
              ...event,
              payload: fields.filter((_, itemIndex) => itemIndex !== index),
            })
          }
        />
      ))}
      <GenericControlPreview event={event} />
    </div>
  );
}

function VariableContractEditor({
  variable,
  onChange,
}: {
  variable: FlowVariable;
  onChange: (variable: FlowVariable) => void;
}) {
  return (
    <div className="inspector-content contract-editor">
      <label>
        Variable ID
        <input
          value={variable.id}
          readOnly
          title="Variable IDs stay stable after creation"
        />
      </label>
      <label>
        Label
        <input
          value={variable.label}
          onChange={(event) =>
            onChange({ ...variable, label: event.target.value })
          }
        />
      </label>
      <label>
        Type
        <select
          value={variable.type}
          onChange={(event) => {
            const type = event.target.value as FlowField["type"];
            onChange({
              ...variable,
              type,
              defaultValue:
                type === "number" ? 0 : type === "boolean" ? false : "",
              options: undefined,
              minimum: undefined,
              maximum: undefined,
              step: undefined,
            });
          }}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
      </label>
      <label>
        Default value
        {variable.type === "boolean" ? (
          <select
            value={String(variable.defaultValue)}
            onChange={(event) =>
              onChange({
                ...variable,
                defaultValue: event.target.value === "true",
              })
            }
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <input
            type={variable.type === "number" ? "number" : "text"}
            value={
              variable.defaultValue === null
                ? ""
                : String(variable.defaultValue)
            }
            onChange={(event) =>
              onChange({
                ...variable,
                defaultValue: typedValue(event.target.value, variable.type),
              })
            }
          />
        )}
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={variable.operatorEditable ?? false}
          onChange={(event) =>
            onChange({ ...variable, operatorEditable: event.target.checked })
          }
        />{" "}
        Operator editable before Take
      </label>
      <label>
        Options
        <input
          value={variable.options?.join(", ") ?? ""}
          placeholder="Comma-separated"
          onChange={(event) =>
            onChange({
              ...variable,
              options: parseOptions(event.target.value, variable.type),
            })
          }
        />
      </label>
      {variable.type === "number" && (
        <div className="number-constraints">
          <label>
            Min
            <input
              type="number"
              value={variable.minimum ?? ""}
              onChange={(event) =>
                onChange({
                  ...variable,
                  minimum:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Max
            <input
              type="number"
              value={variable.maximum ?? ""}
              onChange={(event) =>
                onChange({
                  ...variable,
                  maximum:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            Step
            <input
              type="number"
              value={variable.step ?? ""}
              onChange={(event) =>
                onChange({
                  ...variable,
                  step:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}

function GenericControlPreview({
  event,
}: {
  event: FlowProject["events"][number];
}) {
  return (
    <div className="control-preview">
      <small>GENERATED CONTROL PREVIEW</small>
      <strong>{event.label}</strong>
      {event.payload?.map((field) => (
        <label key={field.id}>
          {field.label}
          {field.options?.length ? (
            <select disabled>
              {field.options.map((option) => (
                <option key={String(option)}>{String(option)}</option>
              ))}
            </select>
          ) : field.type === "boolean" ? (
            <input disabled type="checkbox" />
          ) : (
            <input
              disabled
              type={field.type === "number" ? "number" : "text"}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function ScenarioControls({
  history,
  scenarios,
  onSave,
  onReplay,
  onDelete,
}: {
  history: HistoryItem[];
  scenarios: FlowScenario[];
  onSave: () => void;
  onReplay: (scenario: FlowScenario) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="scenario-controls">
      <div>
        <small>SCENARIOS</small>
        <button disabled={!history.length} onClick={onSave}>
          Save current run
        </button>
      </div>
      {scenarios.length === 0 ? (
        <p>No saved scenarios yet.</p>
      ) : (
        scenarios.map((scenario) => (
          <div key={scenario.id}>
            <button onClick={() => onReplay(scenario)}>
              <span>
                {scenario.name}
                <small>{scenario.events.length} events</small>
              </span>
            </button>
            <button
              className="remove-action"
              aria-label={`Delete ${scenario.name}`}
              onClick={() => onDelete(scenario.id)}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function SimulationTimeline({
  history,
  selected,
  onSelect,
}: {
  history: HistoryItem[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="simulation-timeline">
      <small>EVENT HISTORY</small>
      {history.length === 0 ? (
        <p>Run an operator event to begin the trace.</p>
      ) : (
        history.map((item, index) => (
          <button
            key={index}
            className={
              (selected ?? history.length - 1) === index ? "selected" : ""
            }
            onClick={() => onSelect(index)}
          >
            <b>{index + 1}</b>
            <span>
              {item.event.id}
              <small>
                {item.before.stateId} →{" "}
                {item.trace.at(-1)?.resultingStateId ?? item.before.stateId}
              </small>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function EventControls({
  events,
  runtime,
  dispatch,
}: {
  events: AvailableEvent[];
  runtime: RuntimeState;
  dispatch: (event: FlowEventPayload) => void;
}) {
  const select = events.find((event) => event.id === "SELECT_ANSWER");
  const options = select?.payload?.[0]?.options ?? [];
  return (
    <>
      {select && (
        <div className="answer-controls">
          {options.map((option) => (
            <button
              key={String(option)}
              className={
                runtime.variables.selectedAnswer === option ? "selected" : ""
              }
              onClick={() =>
                dispatch({
                  id: select.id,
                  data: { [select.payload![0].id]: option },
                })
              }
            >
              {String(option)}
            </button>
          ))}
        </div>
      )}
      <div className="command-controls">
        {events
          .filter((event) => event.id !== "SELECT_ANSWER")
          .map((event) => (
            <button
              key={event.id}
              className={
                event.presentation?.intent === "primary"
                  ? "primary"
                  : event.presentation?.intent === "quiet"
                    ? "quiet"
                    : ""
              }
              onClick={() => {
                const data: Record<string, FlowValue> = {};
                for (const field of event.payload ?? []) {
                  const raw = prompt(field.label);
                  if (raw === null) return;
                  data[field.id] =
                    field.type === "number"
                      ? Number(raw)
                      : field.type === "boolean"
                        ? raw === "true"
                        : raw;
                }
                dispatch({ id: event.id, data });
              }}
            >
              {event.label}
            </button>
          ))}
      </div>
    </>
  );
}

function TracePanel({
  trace,
  project,
}: {
  trace: TransitionTrace;
  project: FlowProject;
}) {
  return (
    <div className="trace-panel">
      <small>LAST EVENT TRACE</small>
      <strong>
        {trace.event.id}: {trace.previousStateId} → {trace.resultingStateId}
      </strong>
      {trace.consideredTransitions.map((item) => (
        <div
          className={item.passed ? "passed" : "failed"}
          key={item.transitionId}
        >
          <b>{item.passed ? "PASS" : "FAIL"}</b>
          <span>
            {project.transitions.find(
              (transition) => transition.id === item.transitionId,
            )?.label || item.transitionId}
            <small>{item.explanation}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function TransitionEditor({
  transition,
  project,
  isNew,
  onDraftChange,
  onSave,
  onDelete,
}: {
  transition: FlowTransition;
  project: FlowProject;
  isNew: boolean;
  onDraftChange: (transition: FlowTransition) => void;
  onSave: (transition: FlowTransition, newEvents: FlowEvent[]) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(transition);
  const [draftEvents, setDraftEvents] = useState<FlowEvent[]>([]);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventLabel, setNewEventLabel] = useState("");
  const updateDraft = (next: FlowTransition) => {
    setDraft(next);
    if (isNew) onDraftChange(next);
  };
  const editorProject = draftEvents.length
    ? { ...project, events: [...project.events, ...draftEvents] }
    : project;
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(transition) ||
    draftEvents.length > 0;
  const errors = validateProject({
    ...editorProject,
    transitions: isNew
      ? [...editorProject.transitions, draft]
      : editorProject.transitions.map((item) =>
          item.id === draft.id ? draft : item,
        ),
  }).filter((item) => item.level === "error" && item.transitionId === draft.id);
  const sourceLabel =
    draft.from === "*"
      ? "Any state"
      : (project.states.find((state) => state.id === draft.from)?.label ??
        draft.from);
  const destinationLabel =
    project.states.find((state) => state.id === draft.to)?.label ?? draft.to;
  return (
    <section className="panel transition-editor">
      <Title
        eyebrow={isNew ? "New transition - not created" : "Edit transition"}
        title={draft.label || draft.event}
        right={
          <span className={`draft-status ${dirty ? "dirty" : ""}`}>
            {isNew ? "Creating new" : dirty ? "Unsaved changes" : "Saved"}
          </span>
        }
      />
      <div className="transition-form">
        <div className="selection-explainer">
          <strong>This is where the behavior lives</strong>
          <span>
            Choose the triggering event, the legal source state, the destination
            state, optional conditions, and the actions that run.
          </span>
        </div>
        <div className="transition-summary">
          <div className="logic-chain">
            <span>
              <small>BUTTON / EVENT</small>
              <b>
                {editorProject.events.find((item) => item.id === draft.event)
                  ?.label ?? draft.event}
              </b>
            </span>
            <i>→</i>
            <span>
              <small>LEGAL FROM</small>
              <b>{sourceLabel}</b>
            </span>
            <i>→</i>
            <span>
              <small>GO TO</small>
              <b>{destinationLabel}</b>
            </span>
          </div>
          <span>
            Priority {draft.priority}. {conditionText(draft.condition)}. Then
            run {draft.actions.length}{" "}
            {draft.actions.length === 1 ? "action" : "actions"}.
          </span>
        </div>
        <label>
          Label
          <input
            value={draft.label || ""}
            onChange={(event) =>
              updateDraft({ ...draft, label: event.target.value })
            }
          />
        </label>
        <label>
          From
          <select
            value={draft.from}
            onChange={(event) =>
              updateDraft({ ...draft, from: event.target.value })
            }
          >
            <option value="*">Any state</option>
            {project.states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            value={draft.to}
            onChange={(event) =>
              updateDraft({ ...draft, to: event.target.value })
            }
          >
            {project.states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.label}
              </option>
            ))}
          </select>
        </label>
        <div className="transition-event-field">
          <div>
            <label>
              Event
              <select
                value={draft.event}
                onChange={(event) => {
                  const eventId = event.target.value;
                  setDraftEvents((items) =>
                    items.filter((item) => item.id === eventId),
                  );
                  updateDraft({ ...draft, event: eventId });
                }}
              >
                {editorProject.events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="new-operator-event"
              onClick={() => setCreatingEvent((current) => !current)}
            >
              <Plus size={12} />
              {draftEvents.length
                ? "Replace staged event"
                : "New operator event"}
            </button>
          </div>
          {creatingEvent && (
            <div className="inline-event-creator">
              <label>
                Operator button name
                <input
                  autoFocus
                  placeholder="Next, Out, Reset..."
                  value={newEventLabel}
                  onChange={(event) => setNewEventLabel(event.target.value)}
                />
              </label>
              <span>
                Event ID:
                <b>
                  {newEventLabel.trim()
                    ? createOperatorEventDraft(newEventLabel, project.events).id
                    : "Enter a name"}
                </b>
              </span>
              <div>
                <button
                  disabled={!newEventLabel.trim()}
                  onClick={() => {
                    const event = createOperatorEventDraft(
                      newEventLabel,
                      project.events,
                    );
                    setDraftEvents([event]);
                    updateDraft({ ...draft, event: event.id });
                    setCreatingEvent(false);
                    setNewEventLabel("");
                  }}
                >
                  Create and use
                </button>
                <button
                  onClick={() => {
                    setCreatingEvent(false);
                    setNewEventLabel("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p>
            The operator button appears only when this event has a legal
            transition from the current state.
          </p>
          {draftEvents[0] && (
            <p className="event-staged">
              <b>{draftEvents[0].label}</b> is staged with this transition.
              {isNew ? " Cancel new transition" : " Discard changes"} removes it
              without changing the project.
            </p>
          )}
        </div>
        <label>
          Branch priority
          <input
            type="number"
            min="0"
            step="10"
            value={draft.priority}
            onChange={(event) =>
              updateDraft({
                ...draft,
                priority: Number(event.target.value),
              })
            }
          />
        </label>
        <ConditionEditor
          condition={draft.condition}
          project={editorProject}
          eventId={draft.event}
          onChange={(condition) => updateDraft({ ...draft, condition })}
        />
        <ActionEditor
          actions={draft.actions}
          project={editorProject}
          onChange={(actions) => updateDraft({ ...draft, actions })}
        />
        {errors.map((error, index) => (
          <div className="edit-error" key={index}>
            <AlertCircle size={14} />
            {error.message}
          </div>
        ))}
        <div className="edit-actions">
          <button
            className="save-transition"
            disabled={(!isNew && !dirty) || errors.length > 0}
            onClick={() => {
              onSave(draft, draftEvents);
              setDraftEvents([]);
              setCreatingEvent(false);
              setNewEventLabel("");
            }}
          >
            {isNew ? "Create transition" : "Save transition"}
          </button>
          {!isNew && (
            <button
              disabled={!dirty}
              onClick={() => {
                updateDraft(transition);
                setDraftEvents([]);
                setCreatingEvent(false);
                setNewEventLabel("");
              }}
            >
              Discard changes
            </button>
          )}
        </div>
        <button className="delete-transition" onClick={onDelete}>
          {isNew ? "Cancel new transition" : "Delete transition"}
        </button>
      </div>
    </section>
  );
}

function ConditionEditor({
  condition,
  project,
  eventId,
  onChange,
}: {
  condition?: FlowConditionGroup;
  project: FlowProject;
  eventId: string;
  onChange: (condition?: FlowConditionGroup) => void;
}) {
  const event = project.events.find((item) => item.id === eventId);
  const predicates = condition?.predicates ?? [];
  const update = (index: number, predicate: FlowPredicate) =>
    onChange({
      mode: condition?.mode ?? "all",
      predicates: predicates.map((item, itemIndex) =>
        itemIndex === index ? predicate : item,
      ),
    });
  return (
    <div className="condition-editor">
      <div>
        <small>CONDITIONS</small>
        <button
          onClick={() =>
            onChange({
              mode: condition?.mode ?? "all",
              predicates: [
                ...predicates,
                {
                  left: { variable: project.variables[0]?.id || "" },
                  operator: "is-set",
                },
              ],
            })
          }
        >
          Add condition
        </button>
      </div>
      {predicates.length > 1 && (
        <label>
          Match
          <select
            value={condition?.mode}
            onChange={(event) =>
              onChange({
                mode: event.target.value as "all" | "any",
                predicates,
              })
            }
          >
            <option value="all">All conditions (AND)</option>
            <option value="any">Any condition (OR)</option>
          </select>
        </label>
      )}
      {predicates.map((predicate, index) => {
        const left = predicate.left;
        const leftType =
          left && typeof left === "object" && "variable" in left
            ? project.variables.find((item) => item.id === left.variable)?.type
            : undefined;
        return (
          <div className="predicate-editor" key={index}>
            <ValueReferenceEditor
              label="Left value"
              value={predicate.left}
              variables={project.variables}
              fields={event?.payload ?? []}
              onChange={(left) => update(index, { ...predicate, left })}
            />
            <label>
              Rule
              <select
                value={predicate.operator}
                onChange={(event) =>
                  update(index, {
                    ...predicate,
                    operator: event.target.value as FlowPredicate["operator"],
                    right: event.target.value.startsWith("is-")
                      ? undefined
                      : (predicate.right ??
                        (leftType === "number"
                          ? 0
                          : leftType === "boolean"
                            ? false
                            : "")),
                  })
                }
              >
                <option value="is-set">has a value</option>
                <option value="is-not-set">has no value</option>
                <option value="equals">equals</option>
                <option value="not-equals">does not equal</option>
                <option value="greater-than">greater than</option>
                <option value="greater-than-or-equal">
                  greater than or equal
                </option>
                <option value="less-than">less than</option>
                <option value="less-than-or-equal">less than or equal</option>
              </select>
            </label>
            {!predicate.operator.startsWith("is-") && (
              <ValueReferenceEditor
                label="Right value"
                value={predicate.right}
                expectedType={leftType}
                variables={project.variables}
                fields={event?.payload ?? []}
                onChange={(right) => update(index, { ...predicate, right })}
              />
            )}
            <button
              className="remove-action"
              onClick={() =>
                onChange(
                  predicates.length === 1
                    ? undefined
                    : {
                        mode: condition?.mode ?? "all",
                        predicates: predicates.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      },
                )
              }
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ActionEditor({
  actions,
  project,
  onChange,
}: {
  actions: FlowAction[];
  project: FlowProject;
  onChange: (actions: FlowAction[]) => void;
}) {
  const update = (index: number, action: FlowAction) =>
    onChange(
      actions.map((item, itemIndex) => (itemIndex === index ? action : item)),
    );
  return (
    <div className="transition-actions">
      <div>
        <small>ACTIONS</small>
        <button
          onClick={() =>
            onChange([
              ...actions,
              { type: "play-animation", animation: "new-animation" },
            ])
          }
        >
          Add action
        </button>
      </div>
      {actions.map((action, index) => (
        <div className="editable-action" key={index}>
          <select
            value={action.type}
            onChange={(event) =>
              update(
                index,
                event.target.value === "set-variable"
                  ? {
                      type: "set-variable",
                      variable: project.variables[0]?.id || "",
                      value: "",
                    }
                  : event.target.value === "emit"
                    ? { type: "emit", event: project.events[0]?.id || "" }
                    : { type: "play-animation", animation: "new-animation" },
              )
            }
          >
            <option value="play-animation">Play animation</option>
            <option value="set-variable">Set variable</option>
            <option value="emit">Emit event</option>
          </select>
          {action.type === "play-animation" ? (
            <input
              value={action.animation}
              onChange={(event) =>
                update(index, { ...action, animation: event.target.value })
              }
            />
          ) : action.type === "set-variable" ? (
            <>
              <select
                value={action.variable}
                onChange={(event) =>
                  update(index, { ...action, variable: event.target.value })
                }
              >
                {project.variables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ValueReferenceEditor
                label="Value"
                value={action.value}
                expectedType={
                  project.variables.find((item) => item.id === action.variable)
                    ?.type
                }
                variables={project.variables}
                fields={[]}
                onChange={(value) => update(index, { ...action, value })}
              />
            </>
          ) : (
            <select
              value={action.event}
              onChange={(event) =>
                update(index, { ...action, event: event.target.value })
              }
            >
              {project.events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
          <button
            className="remove-action"
            onClick={() =>
              onChange(actions.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function ValueReferenceEditor({
  label,
  value,
  variables,
  fields,
  expectedType,
  onChange,
}: {
  label: string;
  value?: ValueReference;
  variables: FlowVariable[];
  fields: FlowField[];
  expectedType?: FlowField["type"];
  onChange: (value: ValueReference) => void;
}) {
  const kind =
    value && typeof value === "object"
      ? "variable" in value
        ? "variable"
        : "event"
      : "literal";
  const variable =
    kind === "variable" &&
    value &&
    typeof value === "object" &&
    "variable" in value
      ? variables.find((item) => item.id === value.variable)
      : undefined;
  const type = expectedType ?? variable?.type ?? "string";
  return (
    <div className="value-reference">
      <label>
        {label} source
        <select
          value={kind}
          onChange={(event) =>
            onChange(
              event.target.value === "variable"
                ? { variable: variables[0]?.id || "" }
                : event.target.value === "event"
                  ? { eventField: fields[0]?.id || "" }
                  : type === "number"
                    ? 0
                    : type === "boolean"
                      ? false
                      : "",
            )
          }
        >
          <option value="literal">Typed value</option>
          <option value="variable">Variable</option>
          {fields.length > 0 && <option value="event">Event field</option>}
        </select>
      </label>
      {kind === "variable" ? (
        <label>
          Variable
          <select
            value={
              typeof value === "object" && value && "variable" in value
                ? value.variable
                : ""
            }
            onChange={(event) => onChange({ variable: event.target.value })}
          >
            {variables.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : kind === "event" ? (
        <label>
          Event field
          <select
            value={
              typeof value === "object" && value && "eventField" in value
                ? value.eventField
                : ""
            }
            onChange={(event) => onChange({ eventField: event.target.value })}
          >
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Literal
          {type === "boolean" ? (
            <select
              value={String(value ?? false)}
              onChange={(event) => onChange(event.target.value === "true")}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              value={
                value === null || typeof value === "object" ? "" : String(value)
              }
              onChange={(event) =>
                onChange(
                  type === "number"
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
            />
          )}
        </label>
      )}
    </div>
  );
}

function RuntimeValueInput({
  variable,
  value,
  onChange,
  ariaLabel,
}: {
  variable: FlowVariable;
  value: FlowValue;
  onChange: (value: FlowValue) => void;
  ariaLabel?: string;
}) {
  if (variable.options?.length || variable.type === "boolean") {
    const options = variable.options?.length ? variable.options : [true, false];
    return (
      <select
        className="runtime-input"
        aria-label={ariaLabel}
        value={String(value ?? "")}
        onChange={(event) =>
          onChange(
            variable.type === "number"
              ? Number(event.target.value)
              : variable.type === "boolean"
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
      className="runtime-input"
      aria-label={ariaLabel}
      type={variable.type === "number" ? "number" : "text"}
      min={variable.minimum}
      max={variable.maximum}
      step={variable.step}
      value={value === null ? "" : String(value)}
      onChange={(event) =>
        onChange(
          variable.type === "number"
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

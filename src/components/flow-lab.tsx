"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Connection, type Edge, type Node, type NodeProps, type OnNodesChange, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Check, CircleDot, CircleHelp, Download, FileUp, Link2, Plus, RotateCcw, Sparkles } from "lucide-react";
import { quizProject } from "@/flow/quiz-project";
import { availableEvents, createRuntime, dispatchEvent, type RuntimeState } from "@/flow/runtime";
import type { FlowCondition, FlowProject, FlowTransition, FlowValue } from "@/flow/schema";
import { validateProject } from "@/flow/validation";

type Selection = { kind: "state" | "transition"; id: string } | null;
type Tab = "preview" | "flow" | "controls" | "inspect";
type StateData = { label: string; active: boolean; selected: boolean; description?: string };

const names: Record<string, string> = { TAKE: "Take", LOCK: "Lock", REVEAL: "Reveal", TAKE_OUT: "Take out", RESET: "Reset" };
const guideSteps: Record<string, number> = { TAKE: 1, SELECT_ANSWER: 2, LOCK: 3, REVEAL: 4, TAKE_OUT: 5 };

function StateNode({ data }: NodeProps<Node<StateData>>) {
  return <div className={`state-node ${data.active ? "active" : ""} ${data.selected ? "selected" : ""}`}>
    <Handle type="target" position={Position.Left} />
    <i />
    <strong>{data.label}</strong>
    <span>{data.active ? "LIVE STATE" : data.description || "Flow state"}</span>
    <Handle type="source" position={Position.Right} />
  </div>;
}

const nodeTypes = { state: StateNode };

function conditionText(condition?: FlowCondition) {
  if (!condition) return "Always available";
  if (condition.operator === "is-set") return `${condition.left.variable} has a value`;
  if (condition.operator === "is-not-set") return `${condition.left.variable} has no value`;
  const right = condition.right && typeof condition.right === "object" && "variable" in condition.right ? condition.right.variable : JSON.stringify(condition.right);
  return `${condition.left.variable} ${condition.operator === "equals" ? "equals" : "does not equal"} ${right}`;
}

function actionText(action: FlowTransition["actions"][number]) {
  if (action.type === "play-animation") return `Play \"${action.animation}\"`;
  if (action.type === "set-variable") return `Set ${action.variable}`;
  return `Emit ${action.event}`;
}

function saveFile(name: string, content: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function FlowLab() {
  const [project, setProject] = useState<FlowProject>(quizProject);
  const [runtime, setRuntime] = useState<RuntimeState>(() => createRuntime(quizProject));
  const [selection, setSelection] = useState<Selection>({ kind: "state", id: "off" });
  const [tab, setTab] = useState<Tab>("preview");
  const [guidedMode, setGuidedMode] = useState(false);
  const [notice, setNotice] = useState("Ready for air.");
  const importRef = useRef<HTMLInputElement>(null);
  const storageReady = useRef(false);
  const graphInstance = useRef<ReactFlowInstance<Node<StateData>, Edge> | null>(null);

  useEffect(() => {
    const loadSavedProject = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("noacg-flow-lab-project");
        if (saved) {
          const next = JSON.parse(saved) as FlowProject;
          storageReady.current = true;
          setProject(next);
          setRuntime(createRuntime(next));
          window.setTimeout(() => graphInstance.current?.fitView({ padding: 0.12 }), 0);
          return;
        }
      } catch {
        localStorage.removeItem("noacg-flow-lab-project");
      }
      storageReady.current = true;
      localStorage.setItem("noacg-flow-lab-project", JSON.stringify(quizProject));
    }, 0);
    return () => window.clearTimeout(loadSavedProject);
  }, []);

  useEffect(() => {
    if (storageReady.current) localStorage.setItem("noacg-flow-lab-project", JSON.stringify(project));
  }, [project]);

  const dispatch = useCallback((id: string, value?: FlowValue) => {
    const result = dispatchEvent(project, runtime, { id, value });
    setRuntime(result.runtime);
    if (result.ok) {
      setSelection({ kind: "transition", id: result.transitionId });
      setNotice(`Ran ${result.transitionId.replaceAll("-", " ")}.`);
    } else {
      setNotice(result.reason);
    }
  }, [project, runtime]);

  const allowed = useMemo(() => availableEvents(project, runtime), [project, runtime]);
  const diagnostics = useMemo(() => validateProject(project), [project]);
  const state = selection?.kind === "state" ? project.states.find((item) => item.id === selection.id) : undefined;
  const transition = selection?.kind === "transition" ? project.transitions.find((item) => item.id === selection.id) : undefined;
  const stateName = project.states.find((item) => item.id === runtime.stateId)?.label || runtime.stateId;
  const featuredTransitions = project.transitions.filter((item, index, list) => item.from !== "*" && item.from !== item.to && list.findIndex((other) => other.from === item.from && other.to === item.to && other.event === item.event) === index);

  const nodes = useMemo<Node<StateData>[]>(() => project.states.map((item) => ({
    id: item.id,
    type: "state",
    position: item.position,
    width: 147,
    height: 76,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: item.label, description: item.description, active: runtime.stateId === item.id, selected: selection?.kind === "state" && selection.id === item.id },
  })), [project.states, runtime.stateId, selection]);

  const edges = useMemo<Edge[]>(() => project.transitions.filter((item) => item.from !== "*").map((item) => ({
    id: item.id,
    source: item.from,
    target: item.to,
    label: item.label ?? item.event,
    animated: runtime.lastTransitionId === item.id,
    markerEnd: { type: MarkerType.ArrowClosed },
    className: `${selection?.kind === "transition" && selection.id === item.id ? "flow-edge-selected" : ""} ${runtime.lastTransitionId === item.id ? "flow-edge-fired" : ""}`,
    labelStyle: { fill: "#c3d1ff", fontSize: 11, fontWeight: 700 },
    labelBgStyle: { fill: "#10172b", fillOpacity: 0.94 },
  })), [project.transitions, runtime.lastTransitionId, selection]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setProject((current) => ({
      ...current,
      states: current.states.map((item) => {
        const change = changes.find((entry) => entry.type === "position" && entry.id === item.id && entry.position);
        return change?.type === "position" && change.position ? { ...item, position: change.position } : item;
      }),
    }));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const event = prompt("Trigger name, for example CONTINUE");
    if (!event) return;
    setProject((current) => ({
      ...current,
      events: current.events.some((item) => item.id === event) ? current.events : [...current.events, { id: event, label: event }],
      transitions: [...current.transitions, { id: `transition-${crypto.randomUUID()}`, from: connection.source!, to: connection.target!, event, label: event, actions: [{ type: "play-animation", animation: "transition" }] }],
    }));
  }, []);

  const addState = () => {
    const label = prompt("State name", "NEW STATE");
    if (!label?.trim()) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `state-${Date.now()}`;
    setProject((current) => ({ ...current, states: [...current.states, { id, label: label.toUpperCase(), description: "A new stable graphic state.", position: { x: 340, y: 430 } }] }));
    setSelection({ kind: "state", id });
  };

  const addVariable = () => {
    const label = prompt("Variable name", "newValue");
    if (!label?.trim()) return;
    const id = label.replace(/\W/g, "") || `value${Date.now()}`;
    setProject((current) => ({ ...current, variables: [...current.variables, { id, label, type: "string", defaultValue: "" }] }));
  };

  const importProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as FlowProject;
        if (!next.states || !next.transitions || !next.variables) throw new Error();
        setProject(next);
        setRuntime(createRuntime(next));
        setNotice("Flow project imported.");
      } catch {
        setNotice("That file is not a valid Flow project.");
      }
    };
    reader.readAsText(file);
  };

  const restoreReference = () => {
    setProject(quizProject);
    setRuntime(createRuntime(quizProject));
    window.setTimeout(() => graphInstance.current?.fitView({ padding: 0.12 }), 0);
    setSelection({ kind: "state", id: "off" });
    setNotice("Reference quiz restored.");
  };

  return <main className={`lab-shell ${guidedMode ? "guided-mode" : ""}`}>
    <header className="topbar">
      <div className="brand"><b><CircleDot size={20} /></b><div><strong>NoaCG <i>Flow Lab</i></strong><small>Visual behavior for live HTML graphics</small></div></div>
      <div className="topbar-actions">
        <span><Check size={14} /> Saved locally</span>
        <button className={`help-button ${guidedMode ? "active" : ""}`} onClick={() => setGuidedMode((value) => !value)} aria-pressed={guidedMode} title="Show the recommended operator sequence"><CircleHelp size={17} /></button>
        <button onClick={() => saveFile("noacg-flow-project.json", JSON.stringify(project, null, 2))} title="Export Flow JSON"><Download size={16} /></button>
        <button onClick={() => importRef.current?.click()} title="Import Flow JSON"><FileUp size={16} /></button>
        <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && importProject(event.target.files[0])} />
      </div>
    </header>

    <nav className="mobile-tabs" aria-label="Workspace">
      {(["preview", "flow", "controls", "inspect"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </nav>

    <section className={`workspace tab-${tab}`}>
      <div className="left-column">
        <section className="panel preview-panel">
          <Title eyebrow="Live preview" title="Quiz question" right={<span className="state-pill"><i />{stateName}</span>} />
          <QuizPreview runtime={runtime} />
          <div className="preview-foot"><span><Sparkles size={14} /> {runtime.lastAnimation ? `Animation: ${runtime.lastAnimation}` : "Waiting for first transition"}</span><span>16:9 output</span></div>
        </section>
        <section className="panel runtime-panel"><Title eyebrow="Runtime" title="Live values" /><div className="variable-list">{project.variables.map((item) => <div key={item.id}><span>{item.label}<small>{item.id}</small></span><strong>{runtime.variables[item.id] === null ? "-" : String(runtime.variables[item.id])}</strong></div>)}</div></section>
      </div>

      <section className="panel graph-panel">
        <Title eyebrow="State graph" title={project.name} right={<div className="graph-actions"><button onClick={addState}><Plus size={14} /> State</button><button onClick={() => setNotice("Drag from a state handle to another state to connect them.")}><Link2 size={14} /> Connect</button></div>} />
        <div className="graph-canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelection({ kind: "state", id: node.id })} onEdgeClick={(_, edge) => setSelection({ kind: "transition", id: edge.id })} onInit={(instance) => { graphInstance.current = instance; window.setTimeout(() => instance.fitView({ padding: 0.12 }), 0); }} fitView minZoom={0.4} maxZoom={1.5} proOptions={{ hideAttribution: true }}><Background color="#263558" gap={20} size={1} /><MiniMap nodeColor={(node) => node.id === runtime.stateId ? "#79a6ff" : "#26385d"} maskColor="rgba(8,12,25,.7)" /><Controls showInteractive={false} /></ReactFlow></div>
        <div className="graph-transition-strip"><span>TRANSITIONS</span>{featuredTransitions.map((item) => <button key={item.id} className={runtime.lastTransitionId === item.id ? "fired" : ""} onClick={() => setSelection({ kind: "transition", id: item.id })}>{item.event}</button>)}</div>
        <div className="graph-note"><span><i className="dot live" /> Active state</span><span><i className="dot fired" /> Last transition</span><span>Global: {project.transitions.filter((item) => item.from === "*").map((item) => item.label).join(" · ")}</span></div>
      </section>

      <div className="right-column">
        <section className="panel controls-panel">
          <Title eyebrow="Operator controls" title="Only legal actions" />
          {guidedMode && <div className="operator-guide"><strong>Suggested run</strong><span>1 Take <b>→</b> 2 Select <b>→</b> 3 Lock <b>→</b> 4 Reveal <b>→</b> 5 Take out</span></div>}
          <p>{project.states.find((item) => item.id === runtime.stateId)?.description}</p>
          {allowed.includes("SELECT_ANSWER") && <div className="answer-controls">{["A", "B", "C", "D"].map((answer) => <button key={answer} className={runtime.variables.selectedAnswer === answer ? "selected" : ""} onClick={() => dispatch("SELECT_ANSWER", answer)}>{guidedMode && <StepBadge step={2} />}{answer}</button>)}</div>}
          <div className="command-controls">{allowed.filter((event) => event !== "SELECT_ANSWER").map((event) => <button key={event} className={event === "TAKE" || event === "REVEAL" ? "primary" : event === "RESET" ? "quiet" : ""} onClick={() => dispatch(event)}>{guidedMode && guideSteps[event] && <StepBadge step={guideSteps[event]} />}{names[event] || event}</button>)}</div>
          <div className={`notice ${notice.includes("not ") ? "warning" : ""}`}>{notice.includes("not ") ? <AlertCircle size={15} /> : <Check size={15} />}{notice}</div>
        </section>

        <section className="panel inspector-panel">
          <Title eyebrow="Inspector" title={transition ? "Transition" : state ? "State" : "Select a graph item"} />
          {state && <div className="inspector-content"><label>Name<input value={state.label} onChange={(event) => setProject((current) => ({ ...current, states: current.states.map((item) => item.id === state.id ? { ...item, label: event.target.value } : item) }))} /></label><label>Description<textarea value={state.description || ""} onChange={(event) => setProject((current) => ({ ...current, states: current.states.map((item) => item.id === state.id ? { ...item, description: event.target.value } : item) }))} /></label><p>A state is a stable on-air situation. Changing values belong in variables.</p></div>}
          {transition && <div className="inspector-content"><label>Trigger<select value={transition.event} onChange={(event) => setProject((current) => ({ ...current, transitions: current.transitions.map((item) => item.id === transition.id ? { ...item, event: event.target.value, label: event.target.value } : item) }))}>{project.events.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><Info label="From" value={transition.from === "*" ? "Any state (global)" : project.states.find((item) => item.id === transition.from)?.label || transition.from} /><Info label="To" value={project.states.find((item) => item.id === transition.to)?.label || transition.to} /><Info label="Condition" value={conditionText(transition.condition)} /><div className="action-list"><small>ACTIONS</small>{transition.actions.map((action, index) => <div key={index}><b>{index + 1}</b>{actionText(action)}</div>)}</div></div>}
        </section>

        <section className="panel validation-panel"><Title eyebrow="Flow health" title={diagnostics.some((item) => item.level === "error") ? "Needs attention" : "Looking good"} />{diagnostics.length ? diagnostics.map((item, index) => <div className={`diagnostic ${item.level}`} key={index}><AlertCircle size={14} />{item.message}</div>) : <div className="diagnostic okay"><Check size={14} /> No structural issues found.</div>}<button className="text-action" onClick={addVariable}><Plus size={14} /> Define variable</button><button className="text-action" onClick={restoreReference}><RotateCcw size={14} /> Restore quiz reference</button></section>
      </div>
    </section>
  </main>;
}

function Title({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) { return <div className="panel-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{right}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="info-row"><small>{label}</small><span>{value}</span></div>; }
function StepBadge({ step }: { step: number }) { return <span className="step-badge" aria-label={`Step ${step}`}>{step}</span>; }

function QuizPreview({ runtime }: { runtime: RuntimeState }) {
  const visible = runtime.stateId !== "off";
  const selected = String(runtime.variables.selectedAnswer || "");
  const correct = String(runtime.variables.correctAnswer || "");
  const answers = [["A", "The telegraph"], ["B", "The phonograph"], ["C", "Communication satellites"], ["D", "The printing press"]];
  return <div className={`quiz-frame ${visible ? "on-air" : "off-air"}`}><div className="quiz-glow" />{visible ? <div className="quiz-output" key={runtime.revision}><div className="quiz-topline"><span>LIVE QUIZ</span><b>£ 64,000</b></div><div className="question-card"><small>QUESTION 07</small><h3>Which invention made it possible to broadcast live pictures across the world?</h3></div><div className="answers">{answers.map(([letter, copy], index) => { const picked = selected === letter; const result = runtime.stateId === "result"; const tone = result ? correct === letter ? "correct" : picked ? "wrong" : "" : picked ? runtime.stateId === "locked" ? "locked" : "chosen" : ""; return <div className={`answer ${tone}`} style={{ animationDelay: `${.18 + index * .08}s` }} key={letter}><span>{letter}</span><p>{copy}</p>{result && correct === letter && <b>✓</b>}</div>; })}</div><div className="quiz-status">{runtime.stateId === "locked" ? "ANSWER LOCKED" : runtime.stateId === "result" ? selected === correct ? "CORRECT" : "RESULT" : ""}</div></div> : <div className="off-air-message"><span>PROGRAM</span><strong>OFF AIR</strong><small>Take to begin the question</small></div>}</div>;
}

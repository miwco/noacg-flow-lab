import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

const scenes = [
  { eyebrow: "NOACG FLOW LAB", title: "Create behavior, not spaghetti.", copy: "A visual behavioral model for live HTML graphics.", accent: "#8ab1ff" },
  { eyebrow: "1  STATES FIRST", title: "Model stable on-air situations.", copy: "OFF → QUESTION → SELECTED → LOCKED → RESULT", accent: "#74e2c0" },
  { eyebrow: "2  EDIT TRANSITIONS", title: "Choose the legal path.", copy: "Set a trigger, destination, plain-language condition, and named actions.", accent: "#f6bc56" },
  { eyebrow: "3  VARIABLES", title: "Keep changing data out of states.", copy: "selectedAnswer changes from A to C without creating extra states.", accent: "#a69bff" },
  { eyebrow: "4  OPERATOR GUIDE", title: "Learn the live sequence in context.", copy: "Press ? to number the next legal controls: Take, Select, Lock, Reveal, Take out.", accent: "#ff9aa5" },
  { eyebrow: "5  EXPORT", title: "Take the Flow runtime with you.", copy: "Export JSON for editing or a self-contained HTML player for a standalone proof.", accent: "#79d3ff" },
  { eyebrow: "6  SECOND REFERENCE", title: "The same model fits a lower third.", copy: "OFF → IN → HOLD makes broadcast behavior easy to read at a glance.", accent: "#74e2c0" },
];

function Scene({ scene, index }: { scene: (typeof scenes)[number]; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const fade = interpolate(frame, [0, 12, 156, 178], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const shift = interpolate(enter, [0, 1], [38, 0]);
  const nodes = index === 1 || index === 6 ? (index === 6 ? ["OFF", "IN", "HOLD"] : ["OFF", "QUESTION", "SELECTED", "LOCKED", "RESULT"]) : ["Trigger", "Condition", "Actions", "State"];
  return <AbsoluteFill style={{ opacity: fade, padding: 70, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "radial-gradient(circle at 75% 20%, #203b76 0, transparent 35%), #080d1b", color: "#f2f6ff", fontFamily: "Arial, sans-serif" }}>
    <div style={{ opacity: enter, transform: `translateY(${shift}px)` }}>
      <div style={{ color: scene.accent, fontWeight: 800, letterSpacing: 3, fontSize: 16 }}>{scene.eyebrow}</div>
      <h1 style={{ maxWidth: 850, margin: "22px 0 16px", fontSize: 62, letterSpacing: -2.8, lineHeight: 1.02 }}>{scene.title}</h1>
      <p style={{ maxWidth: 780, margin: 0, color: "#b9c8e6", fontSize: 25, lineHeight: 1.35 }}>{scene.copy}</p>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: enter }}>
      {nodes.map((node, nodeIndex) => <div key={node} style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ minWidth: 126, padding: "18px 20px", borderRadius: 12, border: `1px solid ${scene.accent}99`, background: "linear-gradient(135deg,#192d59,#10192f)", boxShadow: `0 0 26px ${scene.accent}25`, color: "#edf3ff", fontSize: 16, fontWeight: 800, textAlign: "center" }}>{index === 4 && nodeIndex < 4 ? `${nodeIndex + 1}  ${node}` : node}</div>{nodeIndex < nodes.length - 1 && <span style={{ color: scene.accent, fontSize: 28 }}>→</span>}</div>)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", color: "#7f92b8", fontSize: 15 }}><span>NoaCG Flow Lab</span><span>miwco.github.io/noacg-flow-lab</span></div>
  </AbsoluteFill>;
}

export function FlowLabTutorial() {
  return <AbsoluteFill>{scenes.map((scene, index) => <Sequence key={scene.eyebrow} from={index * 180} durationInFrames={180}><Scene scene={scene} index={index} /></Sequence>)}</AbsoluteFill>;
}

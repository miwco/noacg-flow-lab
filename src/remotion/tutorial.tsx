import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

const scenes = [
  { eyebrow: "NOACG FLOW LAB", title: "Create behavior, not spaghetti.", copy: "A visual behavioral model for live HTML graphics.", accent: "#8ab1ff", nodes: ["State", "Event", "Condition", "Action"] },
  { eyebrow: "1  STATES FIRST", title: "Model stable on-air situations.", copy: "Changing content remains typed data, never a state explosion.", accent: "#74e2c0", nodes: ["OFF", "QUESTION", "SELECTED", "LOCKED", "RESULT"] },
  { eyebrow: "2  ORDERED BRANCHES", title: "Make every decision deterministic.", copy: "Explicit priority and validation replace hidden transition order.", accent: "#f6bc56", nodes: ["REVEAL", "1 Correct", "2 Wrong"] },
  { eyebrow: "3  TYPED CONDITIONS", title: "Express logic without scripts.", copy: "Combine typed predicates with one readable AND or OR group.", accent: "#a69bff", nodes: ["Variable", "Rule", "Typed value"] },
  { eyebrow: "4  SIMULATE", title: "See exactly why a path fired.", copy: "Run legal events, inspect every guard, and step back safely.", accent: "#ff9aa5", nodes: ["Event", "Trace", "Step back"] },
  { eyebrow: "5  DATA CONTRACT", title: "Keep changing data out of states.", copy: "Typed payloads and variables form a stable runtime contract.", accent: "#79d3ff", nodes: ["Payload", "Variables", "Renderer"] },
  { eyebrow: "6  EXPORT", title: "Take the same Flow runtime with you.", copy: "Export normalized v2 JSON or a self-contained HTML player.", accent: "#74e2c0", nodes: ["Flow v2", "Standalone HTML"] },
  { eyebrow: "7  FUTURE PACKAGES", title: "Compose graphics, not state explosions.", copy: "Independent Flow controllers can share one future broadcast control room.", accent: "#8ab1ff", nodes: ["Quiz", "Lower third", "Score bug"] },
];

function Scene({ scene }: { scene: (typeof scenes)[number] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const fade = interpolate(frame, [0, 12, 156, 178], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const shift = interpolate(enter, [0, 1], [38, 0]);
  return <AbsoluteFill style={{ opacity: fade, padding: 70, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "radial-gradient(circle at 75% 20%, #203b76 0, transparent 35%), #080d1b", color: "#f2f6ff", fontFamily: "Arial, sans-serif" }}>
    <div style={{ opacity: enter, transform: `translateY(${shift}px)` }}><div style={{ color: scene.accent, fontWeight: 800, letterSpacing: 3, fontSize: 16 }}>{scene.eyebrow}</div><h1 style={{ maxWidth: 920, margin: "22px 0 16px", fontSize: 62, letterSpacing: -2.8, lineHeight: 1.02 }}>{scene.title}</h1><p style={{ maxWidth: 820, margin: 0, color: "#b9c8e6", fontSize: 25, lineHeight: 1.35 }}>{scene.copy}</p></div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: enter }}>{scene.nodes.map((node, index) => <div key={node} style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ minWidth: 126, padding: "18px 20px", borderRadius: 12, border: `1px solid ${scene.accent}99`, background: "linear-gradient(135deg,#192d59,#10192f)", color: "#edf3ff", fontSize: 16, fontWeight: 800, textAlign: "center" }}>{node}</div>{index < scene.nodes.length - 1 && <span style={{ color: scene.accent, fontSize: 28 }}>→</span>}</div>)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", color: "#7f92b8", fontSize: 15 }}><span>NoaCG Flow Lab</span><span>miwco.github.io/noacg-flow-lab</span></div>
  </AbsoluteFill>;
}

export function FlowLabTutorial() { return <AbsoluteFill>{scenes.map((scene, index) => <Sequence key={scene.eyebrow} from={index * 180} durationInFrames={180}><Scene scene={scene} /></Sequence>)}</AbsoluteFill>; }

"use client";

import { useState } from "react";
import ControlRoom from "./control-room";
import FlowLab from "./flow-lab";

export default function Workspace() {
  const [surface, setSurface] = useState<"author" | "control-room">("author");
  return surface === "author" ? <FlowLab onOpenControlRoom={() => setSurface("control-room")} /> : <ControlRoom onBack={() => setSurface("author")} />;
}

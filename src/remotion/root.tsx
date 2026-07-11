import { Composition } from "remotion";
import { FlowLabTutorial } from "./tutorial";

export function RemotionRoot() {
  return <Composition id="FlowLabTutorial2" component={FlowLabTutorial} durationInFrames={1440} fps={30} width={1280} height={720} />;
}

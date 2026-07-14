import { describe, expect, it } from "vitest";
import { compileStandaloneHtml } from "./html-export";
import { lowerThirdProject } from "./lower-third-project";
import { quizProject } from "./quiz-project";
import { blankProject } from "./blank-project";

describe("standalone HTML export", () => {
  it("embeds Flow JSON and the quiz renderer contract", () => {
    const html = compileStandaloneHtml(quizProject);
    expect(html).toContain('data-renderer="quiz"');
    expect(html).toContain("Communication satellites");
    expect(html).toContain("const project=");
  });

  it("includes editable lower-third data and escapes project markup", () => {
    const html = compileStandaloneHtml({
      ...lowerThirdProject,
      name: "<Unsafe>",
    });
    expect(html).toContain('data-renderer="lower-third"');
    expect(html).toContain("operatorEditable");
    expect(html).not.toContain("<title><Unsafe>");
  });

  it("keeps generic headline data off air until the initial state changes", () => {
    const html = compileStandaloneHtml(blankProject);
    expect(html).toContain('data-renderer="generic"');
    expect(html).toContain("runtime.stateId===project.initialStateId");
    expect(html).toContain("const headline=project.variables[0]");
  });
});

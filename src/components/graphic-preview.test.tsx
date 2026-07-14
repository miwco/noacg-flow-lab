// @vitest-environment jsdom

import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createRuntime, dispatchEvent } from "../flow/runtime";
import { quizProject } from "../flow/quiz-project";
import { blankProject } from "../flow/blank-project";
import { GenericPreview, QuizPreview } from "./graphic-preview";

describe("QuizPreview", () => {
  it("keeps the on-air graphic mounted while runtime state and data change", () => {
    const taken = dispatchEvent(quizProject, createRuntime(quizProject), {
      id: "TAKE",
    }).runtime;
    const view = render(<QuizPreview runtime={taken} />);
    const output = view.getByTestId("quiz-output");
    const selected = dispatchEvent(quizProject, taken, {
      id: "SELECT_ANSWER",
      data: { value: "A" },
    }).runtime;
    view.rerender(<QuizPreview runtime={selected} />);
    expect(view.getByTestId("quiz-output")).toBe(output);
    expect(view.getByText("The telegraph").closest(".answer")).toHaveClass(
      "chosen",
    );
  });
});

describe("GenericPreview", () => {
  it("hides data in the initial state and uses the first variable as the on-air headline", () => {
    const project = {
      ...blankProject,
      states: [
        ...blankProject.states,
        {
          id: "in",
          label: "IN",
          description: "Graphic is on air.",
          position: { x: 380, y: 170 },
        },
      ],
    };
    const runtime = createRuntime(project);
    const view = render(<GenericPreview project={project} runtime={runtime} />);

    expect(view.getByText("OFF AIR")).toBeInTheDocument();
    expect(view.queryByText("Your text here")).not.toBeInTheDocument();

    view.rerender(
      <GenericPreview
        project={project}
        runtime={{ ...runtime, stateId: "in" }}
      />,
    );
    expect(view.getByText("Your text here")).toBeInTheDocument();
    expect(view.getByText("IN - GENERIC GRAPHIC")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { createRuntime, dispatchEvent } from "../flow/runtime";
import { quizProject } from "../flow/quiz-project";
import { QuizPreview } from "./graphic-preview";

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

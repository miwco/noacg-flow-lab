// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { blankProject } from "../flow/blank-project";
import FlowLab from "./flow-lab";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("DOMMatrixReadOnly", class {});
  vi.stubGlobal("crypto", {
    randomUUID: () => "test-id",
  });
});

afterEach(() => cleanup());

describe("FlowLab authoring", () => {
  it("keeps the workspace interactive and adds a state", () => {
    localStorage.clear();
    const view = render(<FlowLab />);

    const help = screen.getByTitle("Show workflow help");
    fireEvent.click(help);
    expect(help).not.toHaveClass("active");

    fireEvent.change(view.container.querySelector(".reference-picker")!, {
      target: { value: "blank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add state" }));

    expect(screen.getByDisplayValue("NEW STATE")).toBeInTheDocument();
  });

  it("remains interactive after restoring an authored project", async () => {
    localStorage.setItem(
      "noacg-flow-lab-project",
      JSON.stringify({
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
        transitions: [
          {
            id: "take-in",
            from: "off",
            to: "in",
            event: "TAKE",
            priority: 0,
            label: "Take in",
            actions: [],
          },
        ],
      }),
    );
    render(<FlowLab />);

    expect(await screen.findByText("Saved Flow restored.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add state" }));

    expect(screen.getByDisplayValue("NEW STATE")).toBeInTheDocument();
  });
});

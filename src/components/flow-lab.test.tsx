// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import FlowLab, {
  createNativeTransitionEdge,
  createOperatorEventDraft,
  createStateGraphNode,
  graphTransitions,
  rendererVariableConnection,
  transitionVariableUsage,
} from "./flow-lab";
import { blankProject } from "@/flow/blank-project";
import { lowerThirdProject } from "@/flow/lower-third-project";
import { quizProject } from "@/flow/quiz-project";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("DOMMatrixReadOnly", class {});
  vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 64, height: 12 }),
  });
});

afterEach(() => cleanup());

describe("FlowLab transition creation", () => {
  it("creates and assigns an operator event without leaving the transition", () => {
    localStorage.clear();
    const view = render(<FlowLab />);

    fireEvent.change(view.container.querySelector(".reference-picker")!, {
      target: { value: "blank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add state" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add transition" })[0],
    );

    const eventSelect = screen.getByLabelText("Event") as HTMLSelectElement;
    expect(Array.from(eventSelect.options, (option) => option.value)).toEqual([
      "TAKE",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "New operator event" }));
    fireEvent.change(screen.getByLabelText("Operator button name"), {
      target: { value: "Next" },
    });
    expect(screen.getByText("NEXT")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create and use" }));

    expect(Array.from(eventSelect.options, (option) => option.value)).toEqual([
      "TAKE",
      "NEXT",
    ]);
    expect(eventSelect).toHaveValue("NEXT");

    fireEvent.click(screen.getByRole("button", { name: "Create transition" }));
    expect(
      screen.getByText("Transition and Next operator action created."),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".command-controls button"),
    ).toHaveTextContent("Next");
  });

  it("creates, cancels, and reopens a transition from its graph edge", () => {
    localStorage.clear();
    const view = render(<FlowLab />);

    fireEvent.change(view.container.querySelector(".reference-picker")!, {
      target: { value: "blank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add state" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add transition" })[0],
    );

    expect(
      screen.getByText("New transition - not created"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create transition" }),
    ).toBeEnabled();
    expect(
      screen.getByText("No transitions yet.", { exact: false }),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".flow-edge-draft"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel new transition" }),
    );
    expect(
      screen.queryByText("New transition - not created"),
    ).not.toBeInTheDocument();
    expect(
      view.container.querySelector(".flow-edge-draft"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add transition" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Create transition" }));

    expect(screen.getByText("Transition created.")).toBeInTheDocument();
    expect(
      screen.queryByText("No transitions yet.", { exact: false }),
    ).not.toBeInTheDocument();
    expect(
      view.container.querySelector(".react-flow__edge"),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector(".flow-edge-draft"),
    ).not.toBeInTheDocument();
    expect(
      view.container.querySelector(".react-flow__edgelabel-renderer"),
    ).toBeEmptyDOMElement();
    expect(
      view.container.querySelector(".transition-edge-label"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      view.container.querySelector('.react-flow__node[data-id="off"]')!,
    );
    expect(screen.getByText("State ID")).toBeInTheDocument();

    const savedEdge = view.container.querySelector(
      ".react-flow__edge .react-flow__edge-interaction",
    )!;
    fireEvent.click(savedEdge);
    expect(screen.getByText("Edit transition")).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("New transition");

    fireEvent.click(
      view.container.querySelector('.react-flow__node[data-id="off"]')!,
    );
    const savedEdgeGroup = view.container.querySelector(
      ".react-flow__edge[role='button']",
    )!;
    fireEvent.keyDown(savedEdgeGroup, { key: "Enter" });
    expect(screen.getByText("Edit transition")).toBeInTheDocument();
  });

  it("discards an inline event when its new transition is canceled", () => {
    localStorage.clear();
    const view = render(<FlowLab />);

    fireEvent.change(view.container.querySelector(".reference-picker")!, {
      target: { value: "blank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add state" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add transition" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "New operator event" }));
    fireEvent.change(screen.getByLabelText("Operator button name"), {
      target: { value: "Out" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create and use" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel new transition" }),
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Add transition" })[0],
    );
    const eventSelect = screen.getByLabelText("Event") as HTMLSelectElement;
    expect(Array.from(eventSelect.options, (option) => option.value)).toEqual([
      "TAKE",
    ]);
  });

  it("uses a native SVG edge with a large click target and event label", () => {
    const edge = createNativeTransitionEdge(
      {
        id: "take-in",
        from: "off",
        to: "in",
        event: "TAKE",
        priority: 0,
        label: "Take in",
        actions: [],
      },
      "Take",
      true,
      false,
      false,
    );

    expect(edge.type).toBeUndefined();
    expect(edge.label).toBe("Take");
    expect(edge.interactionWidth).toBe(36);
    expect(edge.focusable).toBe(true);
    expect(edge.ariaRole).toBe("button");
    expect(edge.ariaLabel).toBe("Edit transition Take in: off to in on Take");
    expect(edge.style).toMatchObject({ strokeWidth: 4 });
  });

  it("marks an unsaved transition as a dashed native draft edge", () => {
    const pending = {
      id: "draft-take-in",
      from: "off",
      to: "in",
      event: "TAKE",
      priority: 0,
      label: "Take in",
      actions: [],
    };
    const edge = createNativeTransitionEdge(pending, "Take", true, false, true);

    expect(edge.type).toBeUndefined();
    expect(edge.label).toBe("NEW - Take");
    expect(edge.style).toMatchObject({
      stroke: "#f6bc56",
      strokeDasharray: "8 6",
      strokeWidth: 4,
    });
    expect(edge.animated).toBe(false);
    expect(graphTransitions([], pending)).toEqual([pending]);
    expect(graphTransitions([], null)).toEqual([]);
  });

  it("keeps explicit endpoint geometry when controlled nodes are recreated", () => {
    const state = {
      id: "off",
      label: "OFF",
      description: "Graphic is off air.",
      position: { x: 100, y: 170 },
    };

    const unselected = createStateGraphNode(state, false, false);
    const selected = createStateGraphNode(state, false, true);

    expect(unselected.handles).toEqual(selected.handles);
    expect(selected.handles).toEqual([
      expect.objectContaining({ type: "target", position: "left", x: 0 }),
      expect.objectContaining({ type: "source", position: "right", x: 146 }),
    ]);
    expect(selected.width).toBe(147);
    expect(selected.height).toBe(76);
  });

  it("generates stable unique IDs for inline operator events", () => {
    const existing = [
      createOperatorEventDraft("Next", []),
      createOperatorEventDraft("Next", [createOperatorEventDraft("Next", [])]),
    ];

    expect(existing.map((event) => event.id)).toEqual(["NEXT", "NEXT_2"]);
    expect(createOperatorEventDraft("Take out", existing)).toMatchObject({
      id: "TAKE_OUT",
      label: "Take out",
      source: "operator",
    });
  });
});

describe("FlowLab variable connections", () => {
  it("describes the real renderer slot instead of assigning data to a state", () => {
    expect(
      rendererVariableConnection(blankProject, blankProject.variables[0]),
    ).toMatchObject({
      connected: true,
      slot: "Generated data row: headline",
      visibility: "Every state",
    });
    expect(
      rendererVariableConnection(
        lowerThirdProject,
        lowerThirdProject.variables[0],
      ),
    ).toMatchObject({
      connected: true,
      slot: "Primary name text",
      visibility: "On air in IN and HOLD",
    });
  });

  it("labels whether transition logic reads or changes a variable", () => {
    const selectionRoute = quizProject.transitions.find((transition) =>
      transition.actions.some(
        (action) =>
          action.type === "set-variable" &&
          action.variable === "selectedAnswer",
      ),
    )!;

    expect(transitionVariableUsage(selectionRoute, "selectedAnswer")).toEqual([
      "Changes value",
    ]);
  });

  it("edits an operator-permitted value and shows it in the mounted preview", () => {
    localStorage.clear();
    const view = render(<FlowLab />);

    fireEvent.change(view.container.querySelector(".reference-picker")!, {
      target: { value: "blank" },
    });
    const variableButton = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>(
        ".contract-group > button",
      ),
    ).find((button) => button.textContent?.includes("headline"))!;
    fireEvent.click(variableButton);

    expect(screen.getByText("Generated data row: headline")).toBeInTheDocument();
    expect(screen.getByText("Every state")).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("Current preview value for Headline"),
      { target: { value: "Breaking news" } },
    );

    expect(screen.getAllByText("Breaking news").length).toBeGreaterThan(0);
  });
});

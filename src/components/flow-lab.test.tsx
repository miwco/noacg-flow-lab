// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import FlowLab, {
  createNativeTransitionEdge,
  graphTransitions,
} from "./flow-lab";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("DOMMatrixReadOnly", class {});
  vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
});

afterEach(() => cleanup());

describe("FlowLab transition creation", () => {
  it("keeps a new transition separate until it is explicitly created", () => {
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
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel new transition" }),
    );
    expect(
      screen.queryByText("New transition - not created"),
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
      view.container.querySelector(".react-flow__edgelabel-renderer"),
    ).toBeEmptyDOMElement();
    expect(
      view.container.querySelector(".transition-edge-label"),
    ).not.toBeInTheDocument();
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
});

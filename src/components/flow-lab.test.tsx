// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import FlowLab from "./flow-lab";

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
  });
});

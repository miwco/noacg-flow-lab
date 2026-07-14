"use client";

import type { RuntimeState } from "../flow/runtime";
import type { FlowProject } from "../flow/schema";

export function LowerThirdPreview({ runtime }: { runtime: RuntimeState }) {
  const visible = runtime.stateId !== "off";
  return (
    <div className="lower-third-frame" data-testid="lower-third-preview">
      <div className="lower-third-safe">
        {visible ? (
          <div className={`lower-third-card ${runtime.stateId}`}>
            <span>LIVE ANALYSIS</span>
            <strong>{String(runtime.variables.name)}</strong>
            <p>{String(runtime.variables.role)}</p>
          </div>
        ) : (
          <div className="off-air-message">
            <span>PROGRAM</span>
            <strong>OFF AIR</strong>
            <small>Take to bring the lower third on air</small>
          </div>
        )}
      </div>
    </div>
  );
}

export function GenericPreview({
  project,
  runtime,
}: {
  project: FlowProject;
  runtime: RuntimeState;
}) {
  const visible = runtime.stateId !== project.initialStateId;
  const stateLabel =
    project.states.find((state) => state.id === runtime.stateId)?.label ??
    runtime.stateId;
  const variables = project.variables.map((variable) => ({
    ...variable,
    value: runtime.variables[variable.id],
  }));
  const [headline, ...supporting] = variables;
  return (
    <div className="generic-preview" data-testid="generic-preview">
      {visible ? (
        <>
          <small>{stateLabel} - GENERIC GRAPHIC</small>
          <strong>
            {headline?.value === null || headline?.value === undefined
              ? "-"
              : String(headline.value)}
          </strong>
          <div>
            {supporting.map((variable) => (
              <span key={variable.id}>
                <b>{variable.label}</b>
                {variable.value === null ? "-" : String(variable.value)}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="off-air-message">
          <span>GENERIC GRAPHIC</span>
          <strong>OFF AIR</strong>
          <small>
            Take to show {headline?.label?.toLowerCase() ?? "graphic data"}
          </small>
        </div>
      )}
    </div>
  );
}

export function QuizPreview({ runtime }: { runtime: RuntimeState }) {
  const visible = runtime.stateId !== "off";
  const selected = String(runtime.variables.selectedAnswer || "");
  const correct = String(runtime.variables.correctAnswer || "");
  const answers = [
    ["A", "The telegraph"],
    ["B", "The phonograph"],
    ["C", "Communication satellites"],
    ["D", "The printing press"],
  ];
  return (
    <div
      className={`quiz-frame ${visible ? "on-air" : "off-air"}`}
      data-testid="quiz-preview"
    >
      <div className="quiz-glow" />
      {visible ? (
        <div className="quiz-output" data-testid="quiz-output">
          <div className="quiz-topline">
            <span>LIVE QUIZ</span>
            <b>£ 64,000</b>
          </div>
          <div className="question-card">
            <small>QUESTION 07</small>
            <h3>
              Which invention made it possible to broadcast live pictures across
              the world?
            </h3>
          </div>
          <div className="answers">
            {answers.map(([letter, copy], index) => {
              const picked = selected === letter;
              const result = runtime.stateId === "result";
              const tone = result
                ? correct === letter
                  ? "correct"
                  : picked
                    ? "wrong"
                    : ""
                : picked
                  ? runtime.stateId === "locked"
                    ? "locked"
                    : "chosen"
                  : "";
              return (
                <div
                  className={`answer ${tone}`}
                  style={{ animationDelay: `${0.18 + index * 0.08}s` }}
                  key={letter}
                >
                  <span>{letter}</span>
                  <p>{copy}</p>
                  {result && correct === letter && <b>✓</b>}
                </div>
              );
            })}
          </div>
          <div className="quiz-status">
            {runtime.stateId === "locked"
              ? "ANSWER LOCKED"
              : runtime.stateId === "result"
                ? selected === correct
                  ? "CORRECT"
                  : "RESULT"
                : ""}
          </div>
        </div>
      ) : (
        <div className="off-air-message">
          <span>PROGRAM</span>
          <strong>OFF AIR</strong>
          <small>Take to begin the question</small>
        </div>
      )}
    </div>
  );
}

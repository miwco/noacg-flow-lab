# NoaCG Flow Lab development rules

- Preserve the core distinction: stable visual situations are states; changing values are variables.
- Keep `src/flow` independent of React, React Flow, browser APIs, and quiz-specific vocabulary.
- Prefer a readable state graph and a transition inspector over exposing every action as a graph node.
- Operator controls must use the runtime's legal-event query. Do not leave invalid actions enabled and silently ignore them.
- Treat named animation actions as a contract with a future timeline/design layer, not a timeline implementation.
- Validate a project before adding export/compiler work. Explain diagnostics in broadcast-user language.
- Keep the phone workflow intentional: preview and operator control are first-class; complex editing may be reduced but must not be broken.
- Keep previews fitted inside their 16:9 canvas. A preview may scale its presentation, but must never hide state-changing visual output.
- The editor supports two deliberately contrasting reference projects: a quiz and an interview lower third. Preserve both when changing generic Flow behavior.
- Keep standalone export browser-only and platform-neutral. It must consume Flow JSON rather than editor state or React code.
- The `?` button teaches both the operator sequence and authoring sequence. Extend it when adding common concepts instead of burying beginner guidance in documentation.
- The Remotion tutorial composition lives in `src/remotion`; keep it aligned with the real product and render it with `npm run video:render` after material workflow changes.
- Run `npm test`, `npm run lint`, and `npm run build` after behavior changes. Run `npx remotion versions --log=verbose` after changing video dependencies.

# NoaCG Flow Lab development rules

- Preserve the core distinction: stable visual situations are states; changing values are variables.
- Keep `src/flow` independent of React, React Flow, browser APIs, and quiz-specific vocabulary.
- Prefer a readable state graph and a transition inspector over exposing every action as a graph node.
- Operator controls must use the runtime's legal-event query. Do not leave invalid actions enabled and silently ignore them.
- Treat named animation actions as a contract with a future timeline/design layer, not a timeline implementation.
- Validate a project before adding export/compiler work. Explain diagnostics in broadcast-user language.
- Keep the phone workflow intentional: preview and operator control are first-class; complex editing may be reduced but must not be broken.
- Run `npm test`, `npm run lint`, and `npm run build` after behavior changes.

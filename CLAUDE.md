# NoaCG Flow Lab quick context

Read `AGENTS.md` first. It contains the binding product and architectural rules.

This is a static Next.js prototype deployed to GitHub Pages:

- Live app: https://miwco.github.io/noacg-flow-lab/
- Tutorial video: https://miwco.github.io/noacg-flow-lab/tutorial2.mp4
- Flow runtime and schema: `src/flow/`
- React authoring UI: `src/components/flow-lab.tsx`
- Video source: `src/remotion/`

Core commands:

```bash
npm run dev
npm test
npm run lint
npm run build
npm run video:render
```

The GitHub Pages workflow deploys pushes to `main`. Do not introduce a backend, secrets, authentication, or NoaCG Studio integration into this repository.

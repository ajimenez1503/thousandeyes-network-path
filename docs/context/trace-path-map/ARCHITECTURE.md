# ThousandEyes Network Path architecture

- The App Toolkit scaffold provides React, TypeScript, Strato components, and the Grail SDK.
- `Home.tsx` validates input, receives the optional intent, runs DQL through `useDql`, and renders query states.
- `traceGraph.ts` converts span records into unique service nodes and parent-derived service links.
- `TraceGraphView.tsx` lays out and draws the graph as SVG without an external graph package.
- `app.config.json` requests only bucket, span, and Smartscape read scopes and declares the trace intent.
- The query uses a validated hexadecimal trace ID and one of three fixed time windows to avoid arbitrary DQL input.

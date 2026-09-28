# ThousandEyes Network Path architecture

- The App Toolkit scaffold provides React, TypeScript, Strato components, and the Grail SDK.
- `Home.tsx` validates input, receives the optional intent, runs DQL through `useDql`, and renders test, trace, and graph query states.
- `traceGraph.ts` converts span records into unique service nodes and parent-derived service links.
- `TraceGraphView.tsx` lays out and draws the graph as SVG without an external graph package.
- `app.config.json` requests only bucket, span, and Smartscape read scopes and declares the trace intent.
- Test lookup groups spans by `thousandeyes.test.name` and test ID for the selected window. A Strato Select dropdown filters the returned options in the browser. A second query groups the selected test's spans by trace ID. The graph query uses a validated hexadecimal trace ID.
- Test-name and ID values are escaped as DQL string literals. Queries use one of three fixed time windows.

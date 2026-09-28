# ThousandEyes Network Path specification

## Goal

Let a user enter or open a distributed trace ID and immediately see the Smartscape service nodes and trace-specific connections without moving through a Notebook.

## User journey

1. Open the app or receive a `trace_id` intent.
2. Choose a search window and submit a valid 32-character hexadecimal trace ID.
3. See the services and directed connections inferred from the trace's parent spans.
4. See clear empty and query-error states when data is unavailable.

## Boundaries

The app displays a custom graph. It does not alter Smartscape topology or claim that Smartscape edges are exclusive to the selected trace.

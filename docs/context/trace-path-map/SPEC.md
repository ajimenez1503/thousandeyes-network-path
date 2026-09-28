# ThousandEyes Network Path specification

## Goal

Let a user choose a ThousandEyes test from a searchable dropdown, choose one of its recent traces, and see the Smartscape service nodes and trace-specific connections without moving through a Notebook. Keep direct trace ID entry and intent support.

## User journey

1. Choose a search window and open the dropdown of ThousandEyes tests observed in Grail. Filter the dropdown by name or ID if needed.
2. Select a test, identified by name and test ID.
3. Select one of the recent traces for that test.
4. See the services and directed connections inferred from the selected trace's parent spans.
5. Alternatively, enter a valid 32-character hexadecimal trace ID or receive a `trace_id` intent.
6. See clear empty and query-error states when data is unavailable.

## Boundaries

The app displays a custom graph. It does not alter Smartscape topology or claim that Smartscape edges are exclusive to the selected trace.
The dropdown shows tests with spans in the selected Grail window, not the complete ThousandEyes configuration inventory.

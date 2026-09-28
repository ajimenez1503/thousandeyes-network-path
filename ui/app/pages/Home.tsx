import React, { useEffect, useMemo, useState } from "react";
import { getIntent } from "@dynatrace-sdk/navigation";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Button } from "@dynatrace/strato-components/buttons";
import { TextInput } from "@dynatrace/strato-components/forms";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { TraceGraphView } from "../components/TraceGraphView";
import { buildTraceGraph, buildTraceQuery, type TraceSpan } from "../traceGraph";

type Hours = 2 | 24 | 168;

interface Selection {
  traceId: string;
  hours: Hours;
}

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;

export const Home = () => {
  const [draftTraceId, setDraftTraceId] = useState("");
  const [hours, setHours] = useState<Hours>(24);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    const payload: unknown = getIntent()?.getPayload();
    const rawTraceId =
      typeof payload === "object" && payload !== null && "trace_id" in payload
        ? payload.trace_id
        : undefined;
    if (typeof rawTraceId !== "string") return;
    const traceId = rawTraceId.trim().toLowerCase();
    setDraftTraceId(traceId);
    if (TRACE_ID_PATTERN.test(traceId)) setSelection({ traceId, hours: 24 });
  }, []);

  const query = selection
    ? buildTraceQuery(selection.traceId, selection.hours)
    : "fetch spans | limit 0";
  const { data, error, isLoading, forceRefetch } = useDql<TraceSpan>(
    { query },
    { enabled: selection !== null },
  );

  const graph = useMemo(() => buildTraceGraph(data?.records || []), [data?.records]);

  function showTrace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const traceId = draftTraceId.trim().toLowerCase();
    if (!TRACE_ID_PATTERN.test(traceId)) {
      setInputError("Enter a 32-character hexadecimal trace ID.");
      return;
    }
    setInputError("");
    if (selection?.traceId === traceId && selection.hours === hours) {
      void forceRefetch();
    } else {
      setSelection({ traceId, hours });
    }
  }

  return (
    <Flex flexDirection="column" gap={20} padding={32}>
      <Heading level={1}>ThousandEyes Network Path</Heading>
      <Paragraph>See the services connected by one distributed trace.</Paragraph>

      <form onSubmit={showTrace}>
        <Flex flexDirection="column" gap={12}>
          <label htmlFor="trace-id">Trace ID</label>
          <Flex gap={12} alignItems="center" flexFlow="wrap">
            <TextInput
              id="trace-id"
              value={draftTraceId}
              onChange={setDraftTraceId}
              placeholder="54864adb27bf9f0fb362add8e14199d6"
              autoComplete="off"
              style={{ width: 390 }}
            />
            <Button type="submit" variant="emphasized" color="primary" loading={isLoading}>
              Show path
            </Button>
          </Flex>
          {inputError && <Paragraph>{inputError}</Paragraph>}
          <Flex gap={8} alignItems="center" flexFlow="wrap">
            <Paragraph>Search window:</Paragraph>
            {([2, 24, 168] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="condensed"
                variant={hours === value ? "accent" : "default"}
                onClick={() => setHours(value)}
              >
                {value === 168 ? "7 days" : `${value} hours`}
              </Button>
            ))}
          </Flex>
        </Flex>
      </form>

      {error && <Paragraph>Query failed: {error.message}</Paragraph>}
      {selection && isLoading && <Paragraph>Loading the trace path…</Paragraph>}
      {selection && !isLoading && !error && data && (
        <>
          <Paragraph>
            {graph.spanCount} spans, {graph.nodes.length} services, {graph.edges.length} connections
          </Paragraph>
          {graph.spanCount === 10000 && (
            <Paragraph>This trace reached the 10,000-span query limit. The graph may be incomplete.</Paragraph>
          )}
          {graph.nodes.length > 0 ? (
            <TraceGraphView graph={graph} />
          ) : (
            <Paragraph>No service nodes were found for this trace in the selected window.</Paragraph>
          )}
        </>
      )}
    </Flex>
  );
};

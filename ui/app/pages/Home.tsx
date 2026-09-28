import React, { useEffect, useMemo, useState } from "react";
import { getIntent } from "@dynatrace-sdk/navigation";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Button } from "@dynatrace/strato-components/buttons";
import { Select, TextInput } from "@dynatrace/strato-components/forms";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { TraceGraphView } from "../components/TraceGraphView";
import {
  buildTestListQuery,
  buildTestTracesQuery,
  buildTraceGraph,
  buildTraceQuery,
  type TestTrace,
  type ThousandEyesTest,
  type TraceSpan,
} from "../traceGraph";

type Hours = 2 | 24 | 168;

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;

function testKey(test: ThousandEyesTest): string {
  return JSON.stringify([test.testId, test.testName]);
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Time unavailable";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

export const Home = () => {
  const [selectedTest, setSelectedTest] = useState<ThousandEyesTest | null>(null);
  const [draftTraceId, setDraftTraceId] = useState("");
  const [hours, setHours] = useState<Hours>(24);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
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
    if (TRACE_ID_PATTERN.test(traceId)) setSelectedTraceId(traceId);
  }, []);

  const {
    data: testData,
    error: testError,
    isLoading: testsLoading,
  } = useDql<ThousandEyesTest>({ query: buildTestListQuery(hours), maxResultRecords: 10000 });

  const testTracesQuery = selectedTest
    ? buildTestTracesQuery(selectedTest, hours)
    : "fetch spans | limit 0";
  const {
    data: traceChoicesData,
    error: traceChoicesError,
    isLoading: traceChoicesLoading,
  } = useDql<TestTrace>({ query: testTracesQuery }, { enabled: selectedTest !== null });

  const traceQuery = selectedTraceId
    ? buildTraceQuery(selectedTraceId, hours)
    : "fetch spans | limit 0";
  const {
    data: spanData,
    error: spanError,
    isLoading: spansLoading,
    forceRefetch,
  } = useDql<TraceSpan>({ query: traceQuery }, { enabled: selectedTraceId !== null });

  const graph = useMemo(() => buildTraceGraph(spanData?.records || []), [spanData?.records]);

  function chooseTrace(rawTraceId: string | null) {
    const traceId = rawTraceId?.trim().toLowerCase() || "";
    if (!TRACE_ID_PATTERN.test(traceId)) {
      setInputError("The selected trace has an invalid ID.");
      return;
    }
    setInputError("");
    setDraftTraceId(traceId);
    if (selectedTraceId === traceId) {
      void forceRefetch();
    } else {
      setSelectedTraceId(traceId);
    }
  }

  function showTrace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const traceId = draftTraceId.trim().toLowerCase();
    if (!TRACE_ID_PATTERN.test(traceId)) {
      setInputError("Enter a 32-character hexadecimal trace ID.");
      return;
    }
    setInputError("");
    if (selectedTraceId === traceId) {
      void forceRefetch();
    } else {
      setSelectedTraceId(traceId);
    }
  }

  return (
    <Flex flexDirection="column" gap={20} padding={32}>
      <Heading level={1}>ThousandEyes Network Path</Heading>
      <Paragraph>Choose a ThousandEyes test, then a recent trace to view its service path.</Paragraph>

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

      <Flex flexDirection="column" gap={8}>
        <label htmlFor="test-select">ThousandEyes tests with traces in this window</label>
        <Select<string>
          id="test-select"
          aria-label="ThousandEyes test"
          value={selectedTest ? testKey(selectedTest) : null}
          onChange={(value) => {
            const test = testData?.records.find((candidate) => testKey(candidate) === value) || null;
            setSelectedTest(test);
            setSelectedTraceId(null);
          }}
          disabled={testsLoading || Boolean(testError) || !testData?.records.length}
          style={{ width: 420 }}
        >
          <Select.Trigger placeholder={testsLoading ? "Loading tests…" : "Select a test"} width="full" />
          <Select.Content loading={testsLoading}>
            <Select.Filter />
            {testData?.records.map((test) => (
              <Select.Option
                key={testKey(test)}
                value={testKey(test)}
                textValue={`${test.testName || "Unnamed test"} ${test.testId || ""}`}
              >
                {test.testName || "Unnamed test"} · ID {test.testId || "unavailable"}
              </Select.Option>
            ))}
          </Select.Content>
        </Select>
        {testError && <Paragraph>Test list failed to load: {testError.message}</Paragraph>}
        {testData?.records.length === 0 && <Paragraph>No ThousandEyes tests had spans in this window.</Paragraph>}
        {testData?.records.length === 10000 && (
          <Paragraph>Showing the 10,000 most recently seen tests. Use a shorter window if needed.</Paragraph>
        )}
      </Flex>

      {selectedTest && (
        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Recent traces for {selectedTest.testName}</Heading>
          {traceChoicesError && <Paragraph>Trace search failed: {traceChoicesError.message}</Paragraph>}
          {traceChoicesLoading && <Paragraph>Loading recent traces…</Paragraph>}
          {!traceChoicesLoading && !traceChoicesError && traceChoicesData && (
            traceChoicesData.records.length === 0 ? (
              <Paragraph>No traces for this test were found in the selected window.</Paragraph>
            ) : (
              <>
                <Flex
                  flexDirection="column"
                  gap={8}
                  style={{ maxHeight: 320, overflowY: "auto", alignItems: "flex-start" }}
                >
                  {traceChoicesData.records.map((trace) => (
                    <Button
                      key={trace.traceId || "unknown"}
                      type="button"
                      variant={selectedTraceId === trace.traceId ? "accent" : "default"}
                      onClick={() => chooseTrace(trace.traceId)}
                    >
                      {formatTimestamp(trace.lastSeen)} · {trace.spanCount ?? 0} spans · {trace.traceId || "No trace ID"}
                    </Button>
                  ))}
                </Flex>
                {traceChoicesData.records.length === 30 && (
                  <Paragraph>Showing the 30 most recent traces for this test.</Paragraph>
                )}
              </>
            )
          )}
        </Flex>
      )}

      <form onSubmit={showTrace}>
        <Flex flexDirection="column" gap={12}>
          <label htmlFor="trace-id">Or enter a trace ID</label>
          <Flex gap={12} alignItems="center" flexFlow="wrap">
            <TextInput
              id="trace-id"
              value={draftTraceId}
              onChange={setDraftTraceId}
              placeholder="54864adb27bf9f0fb362add8e14199d6"
              autoComplete="off"
              style={{ width: 390 }}
            />
            <Button type="submit" variant="emphasized" color="primary" loading={spansLoading}>
              Show path
            </Button>
          </Flex>
          {inputError && <Paragraph>{inputError}</Paragraph>}
        </Flex>
      </form>

      {spanError && <Paragraph>Path query failed: {spanError.message}</Paragraph>}
      {selectedTraceId && spansLoading && <Paragraph>Loading the trace path…</Paragraph>}
      {selectedTraceId && !spansLoading && !spanError && spanData && (
        <>
          <Heading level={2}>Path for trace {selectedTraceId}</Heading>
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

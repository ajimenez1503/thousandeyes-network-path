import React, { useEffect, useMemo, useState } from "react";
import { getIntent } from "@dynatrace-sdk/navigation";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { Button } from "@dynatrace/strato-components/buttons";
import { TextInput } from "@dynatrace/strato-components/forms";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { TraceGraphView } from "../components/TraceGraphView";
import {
  buildTestSearchQuery,
  buildTestTracesQuery,
  buildTraceGraph,
  buildTraceQuery,
  type TestTrace,
  type ThousandEyesTest,
  type TraceSpan,
} from "../traceGraph";

type Hours = 2 | 24 | 168;

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;

function formatTimestamp(value: string | null): string {
  if (!value) return "Time unavailable";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

export const Home = () => {
  const [draftTestName, setDraftTestName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTest, setSelectedTest] = useState<ThousandEyesTest | null>(null);
  const [draftTraceId, setDraftTraceId] = useState("");
  const [hours, setHours] = useState<Hours>(24);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");
  const [searchError, setSearchError] = useState("");

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

  const testSearchQuery = searchTerm
    ? buildTestSearchQuery(searchTerm, hours)
    : "fetch spans | limit 0";
  const {
    data: testData,
    error: testError,
    isLoading: testsLoading,
  } = useDql<ThousandEyesTest>({ query: testSearchQuery }, { enabled: Boolean(searchTerm) });

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

  function searchTests(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = draftTestName.trim();
    if (term.length < 2 || term.length > 100) {
      setSearchError("Enter 2 to 100 characters of the test name.");
      return;
    }
    setSearchError("");
    setSearchTerm(term);
    setSelectedTest(null);
    setSelectedTraceId(null);
  }

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
      <Paragraph>Find a ThousandEyes test, choose one of its recent traces, and view its service path.</Paragraph>

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

      <form onSubmit={searchTests}>
        <Flex flexDirection="column" gap={12}>
          <label htmlFor="test-name">Test name</label>
          <Flex gap={12} alignItems="center" flexFlow="wrap">
            <TextInput
              id="test-name"
              value={draftTestName}
              onChange={setDraftTestName}
              placeholder="Demo Google"
              autoComplete="off"
              style={{ width: 390 }}
            />
            <Button type="submit" variant="emphasized" color="primary" loading={testsLoading}>
              Find tests
            </Button>
          </Flex>
          {searchError && <Paragraph>{searchError}</Paragraph>}
        </Flex>
      </form>

      {testError && <Paragraph>Test search failed: {testError.message}</Paragraph>}
      {searchTerm && testsLoading && <Paragraph>Searching for tests…</Paragraph>}
      {searchTerm && !testsLoading && !testError && testData && (
        <Flex flexDirection="column" gap={8}>
          <Heading level={2}>Matching tests</Heading>
          {testData.records.length === 0 ? (
            <Paragraph>No tests with that name had spans in the selected window.</Paragraph>
          ) : (
            testData.records.map((test) => (
              <Button
                key={`${test.testId || "unknown"}:${test.testName || "unknown"}`}
                type="button"
                variant={
                  selectedTest?.testId === test.testId && selectedTest.testName === test.testName
                    ? "accent"
                    : "default"
                }
                onClick={() => {
                  setSelectedTest(test);
                  setSelectedTraceId(null);
                }}
              >
                {test.testName || "Unnamed test"} · ID {test.testId || "unavailable"} · Last seen {formatTimestamp(test.lastSeen)}
              </Button>
            ))
          )}
          {testData.records.length === 50 && (
            <Paragraph>Showing the 50 most recently seen matches. Refine the test name to narrow the list.</Paragraph>
          )}
        </Flex>
      )}

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

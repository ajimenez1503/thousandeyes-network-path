export interface TraceSpan {
  spanId: string | null;
  parentId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  spanName: string | null;
}

export interface TraceNode {
  id: string;
  name: string;
  spanCount: number;
}

export interface TraceEdge {
  id: string;
  source: string;
  target: string;
  spanCount: number;
}

export interface TraceGraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
  spanCount: number;
}

export function buildTraceGraph(spans: TraceSpan[]): TraceGraph {
  const spansById = new Map<string, TraceSpan>();
  const nodesById = new Map<string, TraceNode>();
  const edgesById = new Map<string, TraceEdge>();

  for (const span of spans) {
    if (span.spanId) spansById.set(span.spanId, span);
    if (!span.serviceId) continue;

    const existing = nodesById.get(span.serviceId);
    if (existing) {
      existing.spanCount += 1;
      if (existing.name === existing.id && span.serviceName) {
        existing.name = span.serviceName;
      }
    } else {
      nodesById.set(span.serviceId, {
        id: span.serviceId,
        name: span.serviceName || span.serviceId,
        spanCount: 1,
      });
    }
  }

  for (const span of spans) {
    if (!span.serviceId || !span.parentId) continue;

    // Walk through nested spans until a different service is reached.
    const visited = new Set<string>();
    let parentId: string | null = span.parentId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent: TraceSpan | undefined = spansById.get(parentId);
      if (!parent) break;
      if (parent.serviceId && parent.serviceId !== span.serviceId) {
        const edgeId = `${parent.serviceId}->${span.serviceId}`;
        const existing = edgesById.get(edgeId);
        if (existing) {
          existing.spanCount += 1;
        } else {
          edgesById.set(edgeId, {
            id: edgeId,
            source: parent.serviceId,
            target: span.serviceId,
            spanCount: 1,
          });
        }
        break;
      }
      parentId = parent.parentId;
    }
  }

  return {
    nodes: [...nodesById.values()],
    edges: [...edgesById.values()],
    spanCount: spans.length,
  };
}

export function buildTraceQuery(traceId: string, hours: 2 | 24 | 168): string {
  if (!/^[0-9a-f]{32}$/.test(traceId)) {
    throw new Error("A trace ID must contain exactly 32 hexadecimal characters.");
  }

  return `fetch spans, from: now() - ${hours}h
| filter toString(trace.id) == "${traceId}"
| fields spanId = toString(span.id), parentId = toString(span.parent_id), serviceId = toString(dt.smartscape.service), serviceName = getNodeName(dt.smartscape.service), spanName = span.name
| limit 10000`;
}

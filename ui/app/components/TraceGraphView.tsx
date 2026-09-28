import React from "react";
import { useCurrentTheme } from "@dynatrace/strato-components/core";
import type { TraceGraph } from "../traceGraph";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;
const COLUMN_GAP = 92;
const ROW_GAP = 42;
const MARGIN = 40;

interface Position {
  x: number;
  y: number;
}

function layoutGraph(graph: TraceGraph): {
  positions: Map<string, Position>;
  width: number;
  height: number;
} {
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  const levels = new Map(graph.nodes.map((node) => [node.id, 0]));

  for (const edge of graph.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const queue = graph.nodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id);
  let cursor = 0;
  while (cursor < queue.length) {
    const source = queue[cursor++];
    for (const target of outgoing.get(source) || []) {
      levels.set(target, Math.max(levels.get(target) || 0, (levels.get(source) || 0) + 1));
      const next = (indegree.get(target) || 0) - 1;
      indegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }

  // A repeated service can create a cycle after spans are collapsed to nodes.
  // Keep those services visible in the final column.
  const lastAcyclicLevel = Math.max(0, ...levels.values());
  for (const node of graph.nodes) {
    if ((indegree.get(node.id) || 0) > 0) levels.set(node.id, lastAcyclicLevel + 1);
  }

  const groups = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const level = levels.get(node.id) || 0;
    const group = groups.get(level) || [];
    group.push(node.id);
    groups.set(level, group);
  }

  const positions = new Map<string, Position>();
  for (const [level, nodeIds] of groups) {
    nodeIds.forEach((id, row) => {
      positions.set(id, {
        x: MARGIN + level * (NODE_WIDTH + COLUMN_GAP),
        y: MARGIN + row * (NODE_HEIGHT + ROW_GAP),
      });
    });
  }

  const maxLevel = Math.max(0, ...groups.keys());
  const maxRows = Math.max(0, ...[...groups.values()].map((group) => group.length));
  return {
    positions,
    width: Math.max(600, MARGIN * 2 + (maxLevel + 1) * NODE_WIDTH + maxLevel * COLUMN_GAP),
    height: Math.max(320, MARGIN * 2 + maxRows * NODE_HEIGHT + Math.max(0, maxRows - 1) * ROW_GAP),
  };
}

export const TraceGraphView = ({ graph }: { graph: TraceGraph }) => {
  const theme = useCurrentTheme();
  const dark = theme === "dark";
  const { positions, width, height } = layoutGraph(graph);
  const background = dark ? "#171b23" : "#f8faff";
  const nodeFill = dark ? "#262c37" : "#ffffff";
  const textColor = dark ? "#f2f4f8" : "#202838";
  const mutedColor = dark ? "#a9b4c4" : "#65728a";
  const borderColor = dark ? "#6c8fda" : "#4f72bb";
  const edgeColor = dark ? "#7992c7" : "#778bb6";

  return (
    <div style={{ overflow: "auto", maxHeight: "68vh", border: `1px solid ${edgeColor}`, borderRadius: 8 }}>
      <svg
        role="img"
        aria-label={`Trace path with ${graph.nodes.length} services and ${graph.edges.length} connections`}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", background }}
      >
        <defs>
          <marker id="trace-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={edgeColor} />
          </marker>
        </defs>
        {graph.edges.map((edge) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          const startX = source.x + NODE_WIDTH;
          const startY = source.y + NODE_HEIGHT / 2;
          const endX = target.x;
          const endY = target.y + NODE_HEIGHT / 2;
          const bend = Math.max(35, (endX - startX) / 2);
          return (
            <path
              key={edge.id}
              d={`M${startX},${startY} C${startX + bend},${startY} ${endX - bend},${endY} ${endX},${endY}`}
              stroke={edgeColor}
              strokeWidth="2"
              fill="none"
              markerEnd="url(#trace-arrow)"
            >
              <title>{`${edge.source} to ${edge.target}; ${edge.spanCount} span transition(s)`}</title>
            </path>
          );
        })}
        {graph.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const shortName = node.name.length > 23 ? `${node.name.slice(0, 22)}…` : node.name;
          return (
            <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
              <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="10" fill={nodeFill} stroke={borderColor} strokeWidth="2" />
              <text x="12" y="29" fill={textColor} fontSize="14" fontWeight="600">{shortName}</text>
              <text x="12" y="51" fill={mutedColor} fontSize="11">{`${node.spanCount} spans`}</text>
              <title>{`${node.name}\n${node.id}\n${node.spanCount} spans`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

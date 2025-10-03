"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GraphResponse, GraphNode, GraphEdge } from "@/hooks/useAgentGraph";

interface GraphPanelProps {
  data?: GraphResponse;
  isLoading?: boolean;
}

// Very lightweight layout: place agent nodes in rows by group/type and tools next to their agent
export function GraphPanel({ data, isLoading }: GraphPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Graph</CardTitle>
        </CardHeader>
        <CardContent>Loading graph…</CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Graph</CardTitle>
        </CardHeader>
        <CardContent>No graph available</CardContent>
      </Card>
    );
  }

  const { nodes, edges } = data;

  // Small inline layout: map nodes to positions
  const positions = layoutNodes(nodes, edges);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Agent Graph</CardTitle>
      </CardHeader>
      <CardContent className="w-full h-[calc(100vh-240px)]">
        <svg className="w-full h-full" viewBox="0 0 1200 800" role="img" aria-label="Agent graph">
          <title>Agent graph</title>
          {/* Edges */}
          {edges.map((e) => {
            const a = positions[e.from];
            const b = positions[e.to];
            if (!a || !b) return null;
            return (
              <g key={`${e.from}->${e.to}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#9ca3af" strokeWidth={2} markerEnd="url(#arrow)" />
              </g>
            );
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
            </marker>
          </defs>
          {/* Nodes */}
          {nodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            const isAgent = n.kind === "agent";
            const w = 160;
            const h = 44;
            return (
              <g key={n.id} transform={`translate(${p.x - w / 2}, ${p.y - h / 2})`}>
                <rect width={w} height={h} rx={8} ry={8} fill={isAgent ? "#1f2937" : "#111827"} stroke="#9ca3af" />
                <text x={8} y={26} fill="#e5e7eb" fontSize="12">{n.label}</text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

function layoutNodes(nodes: GraphNode[], edges: GraphEdge[]): Record<string, { x: number; y: number }> {
  // Simple layered layout from roots left-to-right
  const inDegree: Record<string, number> = {};
  for (const n of nodes) inDegree[n.id] = 0;
  for (const e of edges) inDegree[e.to] = (inDegree[e.to] ?? 0) + 1;
  const roots = nodes.filter((n) => inDegree[n.id] === 0);

  const levels: string[][] = [];
  const visited = new Set<string>();

  const graph = new Map<string, string[]>();
  for (const e of edges) {
    if (!graph.has(e.from)) graph.set(e.from, []);
    graph.get(e.from)!.push(e.to);
  }

  const queue = [...roots.map((r) => r.id)];
  const levelMap = new Map<string, number>();
  for (const r of queue) levelMap.set(r, 0);
  while (queue.length) {
    const u = queue.shift()!;
    visited.add(u);
    const lvl = levelMap.get(u) ?? 0;
    const nexts = graph.get(u) ?? [];
    for (const v of nexts) {
      if ((levelMap.get(v) ?? -1) < lvl + 1) levelMap.set(v, lvl + 1);
      if (!visited.has(v)) queue.push(v);
    }
  }

  // Bucket by level
  const maxLevel = Math.max(0, ...Array.from(levelMap.values()));
  for (let i = 0; i <= maxLevel; i++) levels[i] = [];
  for (const n of nodes) {
    const lvl = levelMap.get(n.id) ?? 0;
    if (!levels[lvl]) levels[lvl] = [];
    levels[lvl].push(n.id);
  }

  // Assign positions
  const pos: Record<string, { x: number; y: number }> = {};
  const width = 1100;
  const height = 700;
  const levelGap = width / Math.max(1, (maxLevel + 1));
  const minY = 80;
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const ids = levels[lvl] ?? [];
    const gap = ids.length > 1 ? (height - 2 * minY) / (ids.length - 1) : 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      pos[id] = { x: 60 + lvl * levelGap, y: minY + i * gap };
    }
  }
  return pos;
}

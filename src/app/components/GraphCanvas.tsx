import { useId } from "react";
import type { GraphEdge, GraphNode, GraphSnapshot } from "../../core/okf-types";

interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
  radius: number;
  showLabel: boolean;
}

export function GraphCanvas({
  graph,
  onSelect,
}: { graph: GraphSnapshot; onSelect?: (id: string) => void }) {
  const markerId = useId().replaceAll(":", "");
  const width = 720;
  const height = 360;
  const degree = countNodeDegrees(graph.edges);
  const nodes = selectVisibleNodes(graph.nodes, degree, graph.largeGraph ? 54 : 64);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = selectVisibleEdges(graph.edges, nodeIds, graph.largeGraph ? 58 : 76);
  const positions = layoutGraph(nodes, edges, degree, width, height);

  return (
    <div className="graph-panel">
      <svg
        className="graph-svg"
        role="img"
        aria-label="Knowledge graph"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <marker id={markerId} markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--graph-edge)" />
          </marker>
        </defs>
        {edges.map((edge, index) => {
          const source = positions.get(edge.sourceId);
          const target = positions.get(edge.targetId);
          if (!source || !target) return null;
          return (
            <path
              className={
                edge.status === "resolved" ? "graph-edge" : "graph-edge graph-edge-unresolved"
              }
              d={edgePath(source, target, edge.id, index)}
              key={edge.id}
              markerEnd={`url(#${markerId})`}
            />
          );
        })}
        {nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          return (
            <g
              key={node.id}
              className="graph-node-group"
              onClick={() => onSelect?.(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect?.(node.id);
              }}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
            >
              <title>{node.path}</title>
              <circle
                aria-label={`Open graph node ${node.label}`}
                className="graph-node-hit"
                cx={position.x}
                cy={position.y}
                r={Math.max(24, position.radius + 10)}
              />
              <circle
                className={nodeClassName(node)}
                cx={position.x}
                cy={position.y}
                r={position.radius}
              />
              {position.showLabel ? (
                <text className="graph-label" x={position.x} y={position.y + position.radius + 16}>
                  {truncateLabel(node.label)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function countNodeDegrees(edges: GraphEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1);
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1);
  }
  return degree;
}

function selectVisibleNodes(
  nodes: GraphNode[],
  degree: Map<string, number>,
  limit: number,
): GraphNode[] {
  const concepts = nodes
    .filter((node) => !node.unresolved)
    .sort((left, right) => (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0));
  const unresolved = nodes
    .filter((node) => node.unresolved)
    .sort((left, right) => (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0))
    .slice(0, 10);
  return [...concepts.slice(0, Math.max(0, limit - unresolved.length)), ...unresolved];
}

function selectVisibleEdges(edges: GraphEdge[], nodeIds: Set<string>, limit: number): GraphEdge[] {
  const visibleEdges = edges.filter(
    (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
  );
  const resolved = visibleEdges.filter((edge) => edge.status === "resolved").slice(0, limit);
  const unresolved = visibleEdges.filter((edge) => edge.status !== "resolved").slice(0, 10);
  return [...resolved, ...unresolved];
}

function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  degree: Map<string, number>,
  width: number,
  height: number,
): Map<string, PositionedNode> {
  const positions = new Map<string, PositionedNode>();
  const concepts = nodes.filter((node) => !node.unresolved);
  const unresolved = nodes.filter((node) => node.unresolved);
  const hubCount = Math.max(1, Math.min(5, Math.ceil(concepts.length / 8)));
  const hubs = concepts.slice(0, hubCount);
  const hubIds = new Set(hubs.map((node) => node.id));
  const anchors = hubAnchors(hubs.length, width, height);

  hubs.forEach((node, index) => {
    const anchor = anchors[index] ?? { x: width / 2, y: height / 2 };
    positions.set(node.id, {
      node,
      x: anchor.x,
      y: anchor.y,
      radius: 22 + Math.min(8, degree.get(node.id) ?? 0),
      showLabel: true,
    });
  });

  const spokes = new Map<string, GraphNode[]>();
  for (const hub of hubs) spokes.set(hub.id, []);
  concepts
    .filter((node) => !hubIds.has(node.id))
    .forEach((node, index) => {
      const hub = connectedHub(node, hubs, edges) ?? hubs[index % Math.max(1, hubs.length)];
      if (!hub) return;
      spokes.get(hub.id)?.push(node);
    });

  hubs.forEach((hub, hubIndex) => {
    const satellites = spokes.get(hub.id) ?? [];
    const hubPosition = positions.get(hub.id);
    if (!hubPosition) return;
    satellites.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, satellites.length) + hubIndex * 0.42;
      const distance = 76 + (index % 3) * 18;
      positions.set(node.id, {
        node,
        x: clamp(hubPosition.x + Math.cos(angle) * distance, 34, width - 34),
        y: clamp(hubPosition.y + Math.sin(angle) * distance, 42, height - 42),
        radius: 8 + Math.min(6, degree.get(node.id) ?? 0),
        showLabel: (degree.get(node.id) ?? 0) >= 3 && positions.size < 16,
      });
    });
  });

  unresolved.forEach((node, index) => {
    const denominator = Math.max(1, unresolved.length - 1);
    positions.set(node.id, {
      node,
      x: 84 + (index / denominator) * (width - 168),
      y: 46 + (index % 2) * 22,
      radius: 7,
      showLabel: false,
    });
  });

  return positions;
}

function connectedHub(
  node: GraphNode,
  hubs: GraphNode[],
  edges: GraphEdge[],
): GraphNode | undefined {
  return hubs.find((hub) =>
    edges.some(
      (edge) =>
        (edge.sourceId === node.id && edge.targetId === hub.id) ||
        (edge.targetId === node.id && edge.sourceId === hub.id),
    ),
  );
}

function hubAnchors(count: number, width: number, height: number): Array<{ x: number; y: number }> {
  const center = { x: width / 2, y: height / 2 };
  if (count <= 1) return [center];
  if (count === 2)
    return [
      { x: width * 0.36, y: height * 0.5 },
      { x: width * 0.64, y: height * 0.5 },
    ];
  if (count === 3)
    return [
      { x: width * 0.5, y: height * 0.34 },
      { x: width * 0.34, y: height * 0.62 },
      { x: width * 0.66, y: height * 0.62 },
    ];
  return [
    { x: width * 0.5, y: height * 0.42 },
    { x: width * 0.3, y: height * 0.6 },
    { x: width * 0.7, y: height * 0.6 },
    { x: width * 0.38, y: height * 0.28 },
    { x: width * 0.62, y: height * 0.28 },
  ];
}

function edgePath(
  source: PositionedNode,
  target: PositionedNode,
  id: string,
  index: number,
): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const bend = (hashText(id) % 2 === 0 ? 1 : -1) * Math.min(34, 10 + length * 0.08);
  const offset = index % 3 === 0 ? 0 : bend;
  const controlX = source.x + dx / 2 + (-dy / length) * offset;
  const controlY = source.y + dy / 2 + (dx / length) * offset;
  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function nodeClassName(node: GraphNode): string {
  if (node.unresolved) return "graph-node graph-node-unresolved";
  const type = (node.type ?? "").toLowerCase();
  if (type.includes("guide")) return "graph-node graph-node-guide";
  if (type.includes("practice")) return "graph-node graph-node-practice";
  if (type.includes("concept")) return "graph-node graph-node-concept";
  return "graph-node graph-node-other";
}

function truncateLabel(label: string): string {
  return label.length > 20 ? `${label.slice(0, 19)}...` : label;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

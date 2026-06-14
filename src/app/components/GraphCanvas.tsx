import type { GraphSnapshot } from "../../core/okf-types";

export function GraphCanvas({
  graph,
  onSelect,
}: { graph: GraphSnapshot; onSelect?: (id: string) => void }) {
  const nodes = graph.nodes.slice(0, 42);
  const width = 720;
  const height = 360;
  const radius = Math.min(width, height) * 0.36;
  const positions = new Map(
    nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
      const distance = node.unresolved ? radius * 1.08 : radius * (0.55 + (index % 3) * 0.16);
      return [
        node.id,
        {
          x: width / 2 + Math.cos(angle) * distance,
          y: height / 2 + Math.sin(angle) * distance,
        },
      ];
    }),
  );
  return (
    <div className="graph-panel">
      <svg
        className="graph-svg"
        role="img"
        aria-label="Knowledge graph"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--graph-edge)" />
          </marker>
        </defs>
        {graph.edges.slice(0, 70).map((edge) => {
          const source = positions.get(edge.sourceId);
          const target = positions.get(edge.targetId);
          if (!source || !target) return null;
          return (
            <line
              className={
                edge.status === "resolved" ? "graph-edge" : "graph-edge graph-edge-unresolved"
              }
              key={edge.id}
              markerEnd="url(#arrow)"
              x1={source.x}
              x2={target.x}
              y1={source.y}
              y2={target.y}
            />
          );
        })}
        {nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          return (
            <g key={node.id} className="graph-node-group">
              <button
                aria-label={`Open graph node ${node.label}`}
                className="graph-node-hit"
                onClick={() => onSelect?.(node.id)}
                type="button"
              />
              <circle
                className={node.unresolved ? "graph-node graph-node-unresolved" : "graph-node"}
                cx={position.x}
                cy={position.y}
                r={node.unresolved ? 8 : 18}
              />
              <text className="graph-label" x={position.x} y={position.y + 34}>
                {node.label.slice(0, 22)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

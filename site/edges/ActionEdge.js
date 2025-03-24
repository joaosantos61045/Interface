import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';

const buttonEdgeLabelStyle = {
  position: "absolute",
  pointerEvents: "all",
  transformOrigin: "center",
};

const buttonEdgeButtonStyle = {
  width: "30px",
  height: "30px",
  border: "5px solidrgb(30, 113, 197)",
  color: "var(--xy-edge-label-color-default)",
  backgroundColor: "#f3f3f4",
  cursor: "pointer",
  borderRadius: "50%",
  fontSize: "12px",
  paddingTop: "0px",
};

const buttonEdgeButtonHoverStyle = {
  backgroundColor: "var(--xy-theme-hover)",
};

export default function ActionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            ...buttonEdgeLabelStyle,
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button
            style={buttonEdgeButtonStyle}
            onClick={onEdgeClick}
            onMouseOver={(e) => (e.target.style.backgroundColor = buttonEdgeButtonHoverStyle.backgroundColor)}
            onMouseOut={(e) => (e.target.style.backgroundColor = buttonEdgeButtonStyle.backgroundColor)}
          >
            Do Action
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

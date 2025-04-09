import React, { useCallback } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";

const buttonEdgeLabelStyle = {
  position: "absolute",
  pointerEvents: "all",
  transformOrigin: "center",
};

const buttonEdgeButtonStyle = {
  width: "30px",
  height: "30px",
  border: "5px solid rgb(252, 0, 55)",
  color: "var(--xy-edge-label-color-default)",
  backgroundColor: "#f3f3f4",
  cursor: "pointer",
  borderRadius: "50%",
  fontSize: "12px",
  paddingTop: "0px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const checkmarkStyle = {
  position: "absolute",
  left: "6px",
  bottom: "3px",
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
  markerEnd = { type: "arrow", color: "#f00" },
}) {
  const { nodes, setNodes } = useReactFlow();
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Action logic
  const onEdgeClick = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    return;
    // Find the action node (source of the edge)
    const actionNode = nodes.find((node) => node.id === id.split("-")[0]);

    if (!actionNode) return;

    const { target, action } = actionNode.data;

    // Find the target variable node by its label
    const targetNode = nodes.find(
      (node) => node.type === "Variable" && node.data.label === target
    );

    if (!targetNode) return; // If no matching target variable, exit

    let newTargetValue = targetNode.data.value;

    // Perform action
    try {
      if (action.includes("+=")) {
        const valueToAdd = parseFloat(action.replace("+=", "").trim());
        newTargetValue = parseFloat(newTargetValue) + valueToAdd;
      } else if (action.includes("=")) {
        const newValue = action.replace("=", "").trim();
        newTargetValue = newValue;
      } else {
        newTargetValue = eval(action.replace(target, newTargetValue)); // Evaluating expression
      }
    } catch (error) {
      console.error("Invalid action:", error.message);
      return; // Stop if invalid action expression
    }

    // Update the target variable with the new value
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === targetNode.id
          ? { ...node, data: { ...node.data, value: newTargetValue } }
          : node
      )
    );
  }, [id, nodes, setNodes]);

  return (
    <>
      {/* Dashed edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "rgb(85, 86, 87)", // Edge color
          strokeWidth: 2,
          strokeDasharray: "5,5", // Dashed effect
        }}
      />
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
            onMouseOver={(e) =>
              (e.target.style.backgroundColor =
                buttonEdgeButtonHoverStyle.backgroundColor)
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor =
                buttonEdgeButtonStyle.backgroundColor)
            }
          >
            <span style={checkmarkStyle}>{">"}</span>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

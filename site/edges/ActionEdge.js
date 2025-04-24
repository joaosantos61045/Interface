import React, { useCallback,useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  SmoothStepEdge,
  getSmoothStepPath,

} from "@xyflow/react";
import init, { main,get_env, send_message_to_server,perform_action_on_server } from "../../pkg/meerkat_remote_console_V2";
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
  source,
  data,
  target,
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
  const { nodes, setNodes, setEdges } = useReactFlow();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = useCallback(() => {
    send_message_to_server("do " + source);

    setShouldAnimate(true);
    setAnimationKey((prev) => prev + 1);

    setTimeout(() => {
      setShouldAnimate(false);
    }, 500);
  }, [source]);

  const pathId = `animated-path-${id}`;

  return (
    <>
      {/* Main edge path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "rgb(85, 86, 87)",
          strokeWidth: 2,
          strokeDasharray: "5,5",
        }}
      />

      {/* Animated ball path */}
      {shouldAnimate && (
        <svg
          style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}
        >
          <defs>
            <path id={pathId} d={edgePath} />
          </defs>
          <circle r="10" fill="#ff0073">
            <animateMotion dur="0.5s" repeatCount="1">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </svg>
      )}

      {/* Button on edge */}
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
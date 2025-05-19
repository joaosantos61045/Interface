import React, { useCallback, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from "@xyflow/react";
import { send_message_to_server } from "../../pkg/meerkat_remote_console_V2";
import useStore from "../store/store.js";

const buttonEdgeLabelStyle = {
  position: "absolute",
  pointerEvents: "all",
  transformOrigin: "center",
};

const buttonEdgeButtonStyle = {
  width: "32px",
  height: "32px",
  border: "2px solid #ff0073",
  color: "#ff0073",
  backgroundColor: "#ffffff",
  cursor: "pointer",
  borderRadius: "50%",
  fontSize: "16px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 6px rgba(255, 0, 115, 0.5)",
  transition: "all 0.3s ease",
  transform: "scale(1)",
};

const buttonEdgeButtonHoverStyle = {
  backgroundColor: "#ffe6f0",
  transform: "scale(1.1)",
  boxShadow: "none",
  // removed boxShadow here to avoid persistent circle glow
};

const checkmarkStyle = {
  position: "relative",
  top: "-1px",
};

export default function ActionEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd = { type: "arrow", color: "#ff0073" },
}) {
  let modParam = "";
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const {
    onNodesChange,
    environments,
    onEdgesChange,
    onConnect,
    currentEnvId,
    getCurrentEnv,
    paramInputs,
  } = useStore();
  const { nodes, edges } = getCurrentEnv();
  const [showPrompt, setShowPrompt] = useState(false);
  const [paramValues, setParamValues] = useState({});
  const [paramNames, setParamNames] = useState([]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const extractParams = (actionStr) => {
    const regex = /\(([^)]*)\)\s*=>/g;
    let match;
    const params = [];

    while ((match = regex.exec(actionStr)) !== null) {
      const part = match[1]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      params.push(...part);
    }

    return params;
  };
  function findNodeById(globalEnvs, nodeId) {
    for (const env of Object.values(globalEnvs)) {
      const found = env.nodes.find((n) => n.id === nodeId);
      if (found) return found;
    }
    return null;
  }
  const onEdgeClick = useCallback(() => {
    const actionStr = data?.action ?? "";

    if (
      currentEnvId !== "root" &&
      findNodeById(environments, currentEnvId)?.data?.params
    ) {
      const cleanedParams = Object.values(paramInputs);

      modParam = cleanedParams.join(" ");
      console.log("Params:", modParam);
    } else {
      modParam = "";
      console.log("No params");
    }

    const params = extractParams(actionStr);
    if (params.length > 0) {
      setParamNames(params);
      setParamValues(Object.fromEntries(params.map((p) => [p, ""])));
      setShowPrompt(true);
    } else {
      send_message_to_server(`do ${source} ${modParam}`);
      setShouldAnimate(true);
      setAnimationKey((prev) => prev + 1);
      setTimeout(() => setShouldAnimate(false), 600);
    }
  }, [data, source, paramInputs, currentEnvId, environments]);

  const onInputChange = (param, value) => {
    setParamValues((prev) => ({ ...prev, [param]: value }));
  };

  const onSubmit = () => {
    if (
      currentEnvId != "root" &&
      findNodeById(environments, currentEnvId).data.params
    ) {
      const cleanedParams = Object.values(paramInputs);
      modParam = cleanedParams.join(" ");
      console.log("Params:", modParam);
    } else {
      modParam = "";
      console.log("No params");
    }

    const args = paramNames.map((p) => paramValues[p] || "").join(" ");
    send_message_to_server(`do ${source} ${modParam} ${args}`);
    setShowPrompt(false);

    setShouldAnimate(true);
    setAnimationKey((prev) => prev + 1);
    setTimeout(() => setShouldAnimate(false), 600);
  };

  const pathId = `animated-path-${id}`;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "#888",
          strokeWidth: 2,
          strokeDasharray: "6, 6",
          animation: shouldAnimate ? "dashmove 1s linear infinite" : "none",
        }}
      />

      {shouldAnimate && (
        <svg
          style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}
        >
          <defs>
            <path id={pathId} d={edgePath} />
          </defs>
          <circle r="8" fill="#ff0073">
            <animateMotion dur="0.6s" repeatCount="1">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle
            r="14"
            fill="none"
            stroke="#ff0073"
            strokeWidth="2"
            opacity="0.5"
          >
            <animateMotion dur="0.6s" repeatCount="1">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </svg>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            ...buttonEdgeLabelStyle,
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: 100,
          }}
        >
          {showPrompt ? (
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                minWidth: "180px",
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowPrompt(false)}
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "-90px",
                  border: "none",
                  background: "transparent",
                  fontWeight: "bold",
                  fontSize: "14px",
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                X
              </button>

              {paramNames.map((param) => (
                <div key={param} style={{ marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px" }}>{param}</label>
                  <input
                    type="text"
                    value={paramValues[param]}
                    onChange={(e) => onInputChange(param, e.target.value)}
                    style={{ width: "100%", padding: "4px", fontSize: "12px" }}
                  />
                </div>
              ))}

              <button
                onClick={onSubmit}
                style={{
                  marginTop: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  backgroundColor: "#ff0073",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Run
              </button>
            </div>
          ) : (
            <button
              style={buttonEdgeButtonStyle}
              onClick={onEdgeClick}
              onMouseOver={(e) => {
                const btn = e.currentTarget;
                Object.assign(btn.style, {
                  ...buttonEdgeButtonHoverStyle,
                  boxShadow: "none", // remove circle glow on hover
                });
              }}
              onMouseOut={(e) => {
                const btn = e.currentTarget;
                Object.assign(btn.style, buttonEdgeButtonStyle);
              }}
            >
              <span style={checkmarkStyle}>{">"}</span>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

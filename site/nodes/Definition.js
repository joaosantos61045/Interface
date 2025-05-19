import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const DefinitionNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const paramInputs = useStore((state) => state.paramInputs);
  const isDimmed = !activeFilters.has("Definition");

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;
  const fetchNodeId = useStore((state) => state.fetchNodeId);
  const selected = id == fetchNodeId
  const moduleName = data.moduleName;

  const filteredParsedValue = Array.isArray(data.parsedValue)
    ? data.parsedValue.filter((item) => {
      if (!moduleName) return true;
      const inputKey = `${item.param}@${moduleName}`;
      const expectedValue = paramInputs?.[inputKey];

      if (!expectedValue) return true;

      return item.value?.includes(expectedValue.replace(/^"|"$/g, ""));
    })
    : [];

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={{...styles.node,...(selected ? styles.selected : {})}}>
        <div style={styles.content}>
          <div style={styles.header}>
            {data.label || "Unnamed"}
          </div>

          {Array.isArray(data.parsedValue) ? (
            <div style={styles.tableWrapper}>
              {filteredParsedValue.map((item, idx) => (
                <div key={idx} style={styles.row}>
                  <div style={styles.paramLine}>
                    <span style={styles.paramLabel}>{item.param}:</span> {item.value}
                  </div>
                  <div style={styles.outputLine}>
                    {item.output}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={styles.subtext}>
                {data.definition || "No Definition"}
              </div>
              <div style={styles.subtext}>
                {data.value || "No Value"}
              </div>
            </>
          )}
        </div>
      </div>

      {!connection.inProgress && (
        <Handle
          className="customHandle"
          position={Position.Right}
          type="source"
          isConnectable={isConnectable}
        />
      )}
      {(!connection.inProgress || isTarget) && (
        <Handle
          className="customHandle"
          position={Position.Left}
          type="target"
          isConnectableStart={false}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
};
const glowKeyframes = `
@keyframes glow-green {
  0% { box-shadow: 0 0 0px #13df1d }
  50% { box-shadow: 0 0 12px 4px #13df1d }
  100% { box-shadow: 0 0 0px #13df1d }
}
`;

if (typeof document !== "undefined" && !document.getElementById("glow-green-keyframes")) {
  const style = document.createElement("style");
  style.id = "glow-green-keyframes";
  style.innerHTML = glowKeyframes;
  document.head.appendChild(style);
}

const styles = {
  wrapper: {
    position: "relative",
    transition: "all 0.3s ease-in-out",
  },
  node: {
    width: "140px",
    height: "140px",
    background: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
    border: "2px solid #13df1d",
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 10px rgba(19, 223, 29, 0.3)",
    position: "relative",
    borderRadius: "12px",
    padding: "12px",
    cursor: "pointer",
  },
  selected: {
  animation: "glow-green 1.1s ease-in-out infinite",
  borderRadius: "14px",
},
  content: {
    transform: "rotate(-45deg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    fontFamily: "'Inter', sans-serif",
    gap: "4px",
    width: "100%",
  },
  header: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#059669",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  subtext: {
    fontWeight: 500,
    fontSize: "13px",
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  tableWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    gap: "8px",
    marginTop: "4px",
  },
  row: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #a7f3d0",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "12px",
    color: "#065f46",
    width: "100%",
    textAlign: "left",
  },
  paramLine: {
    fontWeight: "600",
    marginBottom: "2px",
    color: "#059669",
  },
  paramLabel: {
    fontWeight: "700",
    color: "#059669",
  },
  outputLine: {
    fontStyle: "italic",
    color: "#6b7280",
    whiteSpace: "pre-wrap",
  },
};

export default memo(DefinitionNode);

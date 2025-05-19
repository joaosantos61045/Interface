import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const ActionNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const paramInputs = useStore((state) => state.paramInputs);
  const isDimmed = !activeFilters.has("Action");
  const fetchNodeId = useStore((state) => state.fetchNodeId);
  const selected = id == fetchNodeId
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  // Determine the module name (used as suffix in paramInputs key: param@module)
  const moduleName = data.moduleName; // assumes you pass `module` in data like { module: "Ting", ... }

  // Filter parsed values based on paramInputs
  let filteredParsedValue = Array.isArray(data.parsedValue)
    ? data.parsedValue.filter((item) => {
      
        if (!moduleName) return true; // no module context, show all
        const inputKey = `${item.param}@${moduleName}`;
        const expectedValue = paramInputs?.[inputKey];
        
        // Show all if paramInputs is empty or if there's no expected value for this param
        if (!expectedValue) return true;

        return item.value?.includes(expectedValue.replace(/^"|"$/g, ""));

      })
    : [];

  
  return (
    <div
      style={{
        ...styles.wrapper,
        ...(selected ? styles.selected : {}),
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.node}>
        <div style={styles.header}>
          {data.label || "Unnamed Action"}
        </div>

        {filteredParsedValue.length > 0 ? (
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
          <div style={styles.subtext}>
            {data.action || "No Action Defined"}
          </div>
        )}
      </div>

      {/* Connection Handles */}
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
@keyframes glow-red {
  0% { box-shadow: 0 0 0px rgb(252, 0, 55) }
  50% { box-shadow: 0 0 12px 4px rgb(252, 0, 55)}
  100% { box-shadow: 0 0 0px rgb(252, 0, 55) }
}
`;

if (typeof document !== "undefined" && !document.getElementById("glow-red-keyframes")) {
  const style = document.createElement("style");
  style.id = "glow-red-keyframes";
  style.innerHTML = glowKeyframes;
  document.head.appendChild(style);
}
const styles = {
  wrapper: {
    position: "relative",
    transition: "all 0.3s ease-in-out",
  },
  node: {
    background: "linear-gradient(135deg, #fff 0%, #ffe4e6 100%)",
    border: "2px solid rgb(252, 0, 55)",
    borderRadius: "12px",
    padding: "12px 16px",
    minWidth: "140px",
    maxWidth: "300px",
    textAlign: "center",
    boxShadow: "0px 4px 10px rgba(252, 0, 55, 0.2)",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  header: {
    fontWeight: "700",
    fontSize: "16px",
    color: "#dc2626",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  selected: {
  animation: "glow-red 1.1s ease-in-out infinite",
  borderRadius: "14px",
},
  subtext: {
    fontWeight: "500",
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
    gap: "12px", // More space between blocks
    marginTop: "8px",
  },
  row: {
    backgroundColor: "#fff1f2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "13px",
    color: "#374151",
    width: "100%",
    textAlign: "left",
  },
  paramLine: {
    fontWeight: "600",
    marginBottom: "4px",
    color: "#b91c1c", // Red
  },
  paramLabel: {
    fontWeight: "700",
    color: "#b91c1c",
  },
  outputLine: {
    fontStyle: "italic",
    color: "#6b7280",
    whiteSpace: "pre-wrap",
  },
};


export default memo(ActionNode);

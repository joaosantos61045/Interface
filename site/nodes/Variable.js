import React from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const VariableNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("Variable");

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div
      style={{
        ...styles.node,
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.header}>
        {data.label || "Unnamed Variable"}
      </div>

      {Array.isArray(data.parsedValue) ? (
        <div style={styles.tableWrapper}>
          {data.parsedValue.map((item, idx) => (
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
        <div style={styles.value}>
          {data.value || "No Value"}
        </div>
      )}

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

const styles = {
  node: {
    padding: "16px 20px",
    border: "2px solid #e100ff",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #ffffff 0%, #fdf4ff 100%)", 
    width: "auto",
    maxWidth: "500px",
    minWidth: "180px",
    textAlign: "center",
    boxShadow: "0px 4px 10px rgba(225, 0, 255, 0.2)",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#8b5cf6", 
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  value: {
    fontWeight: 500,
    fontSize: "14px",
    color: "#6b7280", 
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tableWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    gap: "12px",
    marginTop: "8px",
  },
  row: {
    backgroundColor: "#fdf4ff",
    border: "1px solid #e9d5ff",
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
    color: "#7e22ce",
  },
  paramLabel: {
    fontWeight: "700",
    color: "#7e22ce",
  },
  outputLine: {
    fontStyle: "italic",
    color: "#6b7280",
    whiteSpace: "pre-wrap",
  },
};

export default VariableNode;

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
      <div style={styles.value}>
        {data.value || "No Value"}
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
};

export default VariableNode;

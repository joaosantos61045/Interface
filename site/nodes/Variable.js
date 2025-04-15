import React from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from '../store/store.js';

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
      <strong style={styles.text}>{data.label || "Unnamed Variable"}</strong>
      <p style={styles.text}>{data.value || "No Value"}</p>

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
    padding: "10px",
    border: "2px solid rgb(225, 0, 255)",
    borderRadius: "5px",
    background: "#fff",
    width: "auto",
    maxWidth: "550px",
    textAlign: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    display: "block",
  },
};

export default VariableNode;

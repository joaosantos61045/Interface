import React from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const ModuleNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("Module");

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
        {data.label || "Unnamed Module"}
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
    padding: "20px 30px",
    border: "2px solid #a855f7",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #e6e0ff 0%, #f3f0ff 100%)", // Lighter background
    width: "auto",
    maxWidth: "700px", // Bigger width for the container
    minWidth: "250px", // At least a certain size
    textAlign: "center",
    boxShadow: "0px 6px 15px rgba(168, 85, 247, 0.2)",
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    fontWeight: 700,
    fontSize: "18px", // Larger font size for the label
    color: "#9333ea", // Purple color for the module label
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

export default ModuleNode;

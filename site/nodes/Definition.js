import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const DefinitionNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("Definition");

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.node}>
        <div style={styles.content}>
          <div style={styles.header}>
            {data.label || "Unnamed"}
          </div>
          <div style={styles.subtext}>
            {data.definition || "No Definition"}
          </div>
          <div style={styles.subtext}>
            {data.value || "No Value"}
          </div>
        </div>
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
};

export default memo(DefinitionNode);

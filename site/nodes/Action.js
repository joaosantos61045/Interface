import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const ActionNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("Action");

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
        <div style={styles.header}>
          {data.label || "Unnamed Action"}
        </div>
        <div style={styles.subtext}>
          {data.action || "No Action Defined"}
        </div>
        <div style={styles.subtext}>
          {data.value || "No Action Defined"}
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
    gap: "4px",
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
  subtext: {
    fontWeight: "500",
    fontSize: "13px",
    color: "#6b7280", 
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
};

export default memo(ActionNode);

import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from '../store/store.js';

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
          <strong style={styles.text}>{data.label || "Unnamed"}</strong>
          <p style={styles.text}>{data.definition || "No Value"}</p>
          <p style={styles.text}>{data.value || "No Value"}</p>
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
    position: "relative", // Needed for absolute positioning of handles
    transition: "all 0.2s ease-in-out",
  },
  node: {
    width: "120px",
    height: "120px",
    background: "#fff",
    border: "2px solid rgb(19, 223, 29)",
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
    position: "relative",
    padding: "10px",
  },
  content: {
    transform: "rotate(-45deg)",
    textAlign: "center",
    fontSize: "12px",
    wordBreak: "break-word",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    display: "block",
    textAlign: "center",
  },
};

export default memo(DefinitionNode);

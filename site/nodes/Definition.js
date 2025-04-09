import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";

const DefinitionNode = ({ id, data, isConnectable }) => {
  const connection = useConnection();
  
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div style={styles.wrapper}>
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
        />
      )}
      {(!connection.inProgress || isTarget) && (
        <Handle
          className="customHandle"
          position={Position.Left}
          type="target"
          isConnectableStart={false}
        />
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: "relative", // Needed for absolute positioning of handles
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
    padding: "10px", // Added padding to make sure text doesn't touch edges
  },
  content: {
    transform: "rotate(-45deg)", // Rotates text back to normal
    textAlign: "center",
    fontSize: "12px",
    wordBreak: "break-word",
    maxWidth: "100%", // Ensures content doesn't overflow
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap", // Prevents the text from wrapping
    width: "100%", // Makes sure it takes up the full width of its container
    display: "block",
    textAlign: "center", // Center-align the text within the container
  },
};

export default memo(DefinitionNode);

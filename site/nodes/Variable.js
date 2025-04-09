import React, { useState } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";

const VariableNode = ({ id, data, isConnectable }) => {
  
  const connection = useConnection();
 
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div style={styles.node} >
      <strong style={styles.text}>{data.label || "Unnamed Variable"}</strong>
      <p style={styles.text}>{data.value || "No Value"}</p>

      {/* Connection Handles */}
      {!connection.inProgress && (
          <Handle
            className="customHandle"
            position={Position.Right}
            type="source"
          />
        )}
        {/* We want to disable the target handle, if the connection was started from this node */}
        {(!connection.inProgress || isTarget) && (
          <Handle className="customHandle" position={Position.Left} type="target" isConnectableStart={false} />
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
    maxwidth: "550px",
    textAlign: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "300px",
    height: "auto",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    width: "280px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
  },
  button: {
    padding: "8px 16px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "8px 16px",
    background: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
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

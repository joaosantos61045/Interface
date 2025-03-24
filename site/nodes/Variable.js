import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const VariableNode = ({ data, isConnectable }) => {
  return (
    <div style={styles.node}>
      {/* Variable Name */}
      <label>
        Name:
        <input
          type="text"
          value={data.label}
          onChange={(e) => data.onChange(e.target.value)}
          style={styles.input}
        />
      </label>

      {/* Variable Value */}
      <label>
        Value:
        <input
          type="text"
          value={data.value}
          onChange={(e) => data.onValueChange(e.target.value)}
          style={styles.input}
        />
      </label>

      {/* Handles for Connections */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const styles = {
  node: {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    background: "#fff",
    width: "150px",
    textAlign: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
  },
  input: {
    width: "90%",
    marginTop: "5px",
    padding: "5px",
    fontSize: "12px",
  },
};

export default memo(VariableNode);

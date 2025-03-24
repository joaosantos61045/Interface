import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const ActionNode = ({ data, isConnectable }) => {
  return (
    <div style={styles.node}>
      <strong>Action</strong>
      <input
        type="text"
        value={data.buttonText}
        onChange={(e) => data.onButtonTextChange(e.target.value)}
        placeholder="Button Text"
        style={styles.input}
      />
      <button style={styles.button}>{data.buttonText || "Click Me"}</button>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  node: { padding: "10px", border: "1px solid #ddd", borderRadius: "5px", background: "#fff", width: "150px", textAlign: "center" },
  input: { width: "90%", marginTop: "5px", padding: "5px" },
  button: { marginTop: "5px", padding: "5px", cursor: "pointer", width: "100%" },
};

export default memo(ActionNode);

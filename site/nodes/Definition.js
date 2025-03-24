import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const DefinitionNode = ({ data, isConnectable }) => {
  return (
    <div style={styles.node}>
      <strong>Definition</strong>
      <input
        type="text"
        value={data.label}
        onChange={(e) => data.onTitleChange(e.target.value)}
        placeholder="Title"
        style={styles.input}
      />
      <textarea
        value={data.definition}
        onChange={(e) => data.onDefinitionChange(e.target.value)}
        placeholder="Definition"
        style={styles.textarea}
      />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  node: { padding: "10px", border: "1px solid #ddd", borderRadius: "5px", background: "#fff", width: "200px" },
  input: { width: "100%", marginTop: "5px", padding: "5px" },
  textarea: { width: "96%", marginTop: "5px", padding: "5px", height: "50px" },
};

export default memo(DefinitionNode);

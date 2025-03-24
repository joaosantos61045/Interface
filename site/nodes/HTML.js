import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const HtmlNode = ({ data, isConnectable }) => {
  return (
    <div style={styles.node}>
      <strong>HTML</strong>
      <textarea
        value={data.content}
        onChange={(e) => data.onHtmlChange(e.target.value)}
        placeholder="Enter HTML"
        style={styles.textarea}
      />
      <div dangerouslySetInnerHTML={{ __html: data.html }} style={styles.preview} />
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
    node: {
      backgroundImage: "url('https://www.pngmart.com/files/23/Iphone-PNG-Isolated-Pic-Frame-PNG-HD.png')",
      backgroundSize: "cover",
      width: "100px",
      height: "100px",
      borderRadius: "10px",
      border: "2px solid #ccc",
    },
  };
  

export default memo(HtmlNode);

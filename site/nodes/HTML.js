import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const HtmlNode = ({ data, isConnectable }) => {
  const openHtmlContent = () => {
    const newWindow = window.open();
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.label || "HTML Page"}</title>
      </head>
      <body>
          ${data.definition || "<p>No HTML content</p>"}
      </body>
      </html>
    `);
    newWindow.document.close();
  };

  return (
    <div style={styles.node}>
      {/* Screen area where content is displayed */}
      <div style={styles.screen}>
        <strong style={styles.label}>{data.label || "Unnamed HTML definition"}</strong>
        <button onClick={openHtmlContent} style={styles.button}>
          Open HTML
        </button>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  node: {
    position: "relative",
    width: "120px",
    height: "220px",
    borderRadius: "20px",
    border: "5px solid #000",
    backgroundColor: "#ccc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  },
  screen: {
    backgroundImage: "url('https://miro.medium.com/v2/resize:fit:1400/1*bXww9rpeTUyZ1J31sgPR9A.jpeg')",
  backgroundSize: "cover",
    width: "85%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    boxShadow: "inset 0 0 5px rgba(0,0,0,0.2)",
  },
  label: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "5px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    display: "block",
  },
  button: {
    padding: "4px 8px",
    fontSize: "10px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default memo(HtmlNode);

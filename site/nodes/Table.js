import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";

const TableNode = ({ isConnectable }) => {
  return (
    <div style={styles.node}>
      <strong>Table</strong>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td>Row 1, Col 1</td>
            <td>Row 1, Col 2</td>
          </tr>
          <tr>
            <td>Row 2, Col 1</td>
            <td>Row 2, Col 2</td>
          </tr>
        </tbody>
      </table>
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  node: { padding: "10px", border: "1px solid #ddd", borderRadius: "5px", background: "#fff", width: "200px", textAlign: "center" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "5px" },
  td: { border: "1px solid #ddd", padding: "5px" },
};

export default memo(TableNode);

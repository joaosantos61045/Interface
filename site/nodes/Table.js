import React, { useState, memo } from "react";
import { Handle, Position } from "@xyflow/react";
import useStore from '../store/store.js';

const TableNode = ({ id, data, isConnectable }) => {
  const [rowsForm, setRowsForm] = useState([]);
  const [newRowCount, setNewRowCount] = useState(1); // Default to 1 row
  const [isEditing, setIsEditing] = useState(false); // Toggle for editing
  const updateNode = useStore((state) => state.updateNode);

  // Handle input change for adding new rows
  const handleRowInputChange = (e, rowIdx, colIdx) => {
    const value = e.target.value;
    const updatedRows = [...rowsForm];
    updatedRows[rowIdx][colIdx] = value;
    setRowsForm(updatedRows);
  };

  // Handle adding multiple rows
  const handleAddMultipleRows = () => {
    const newRows = Array.from({ length: newRowCount }, () => data.columns.map(() => ""));
    setRowsForm(newRows);
  };

  // Submit rows to the table
  const handleSubmitRows = () => {
    updateNode(id, { rows: [...(data.rows || []), ...rowsForm] });
    setRowsForm([]);
  };

  // Enable editing mode
  const handleEditRows = () => {
    setIsEditing(!isEditing);
  };

  // Handle row edits
  const handleEditRowInputChange = (e, rowIdx, colIdx) => {
    const value = e.target.value;
    const updatedRows = [...data.rows];
    updatedRows[rowIdx][colIdx] = value;
    updateNode(id, { rows: updatedRows });
  };

  // Handle deleting a row
  const handleDeleteRow = (rowIdx) => {
    const updatedRows = data.rows.filter((_, index) => index !== rowIdx);
    updateNode(id, { rows: updatedRows });
  };

  return (
    <div style={styles.node}>
      <strong>{data.label || "Database Table"}</strong>

      <table style={styles.table}>
        <thead>
          <tr>
            {data.columns && data.columns.map((col, idx) => (
              <th key={idx} style={styles.th}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows && data.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} style={styles.td}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleEditRowInputChange(e, rowIdx, cellIdx)}
                      style={styles.input}
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
              {isEditing && (
                <td>
                  <button onClick={() => handleDeleteRow(rowIdx)} style={styles.deleteButton}>X</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Rows Section */}
      <label style={{ display: "block", margin: "10px 0" }}>
        Number of rows to add:
        <input
          type="number"
          value={newRowCount}
          onChange={(e) => setNewRowCount(Number(e.target.value))}
          min="1"
          style={styles.input}
        />
      </label>
      <button onClick={handleAddMultipleRows} style={styles.button}>Add {newRowCount} Row(s)</button>
      <button onClick={handleEditRows} style={styles.editButton}>
        {isEditing ? "Finish Editing" : "Edit Rows"}
      </button>

      {/* Row Form Inputs */}
      {rowsForm.length > 0 && (
        <div>
          <h4>Fill Row Values:</h4>
          {rowsForm.map((row, rowIdx) => (
            <div key={rowIdx} style={{ marginBottom: "10px" }}>
              {data.columns.map((col, colIdx) => (
                <input
                  key={colIdx}
                  type="text"
                  value={row[colIdx] || ""}
                  placeholder={col.name}
                  onChange={(e) => handleRowInputChange(e, rowIdx, colIdx)}
                  style={styles.input}
                />
              ))}
            </div>
          ))}
          <button onClick={handleSubmitRows} style={styles.button}>Submit Rows</button>
        </div>
      )}

      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  node: {
    padding: "10px",
    border: "2px solid #2196F3",
    borderRadius: "5px",
    background: "#fff",
    width: "auto",
    textAlign: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    border: "1px solid #ddd",
    padding: "8px",
    backgroundColor: "#f2f2f2",
    textAlign: "center",
    fontWeight: "bold",
  },
  td: {
    border: "1px solid #ddd",
    padding: "8px",
    textAlign: "center",
  },
  input: {
    padding: "5px",
    margin: "5px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    width: "90px",
  },
  button: {
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "8px 16px",
    cursor: "pointer",
    margin: "5px 0",
    borderRadius: "4px",
  },
  deleteButton: {
    backgroundColor: "#ff4d4d",
    color: "white",
    border: "none",
    padding: "5px 10px",
    cursor: "pointer",
    borderRadius: "4px",
    marginLeft: "5px",
  },
  editButton: {
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    padding: "8px 16px",
    cursor: "pointer",
    margin: "5px 5px",
    borderRadius: "4px",
  },
};

export default memo(TableNode);

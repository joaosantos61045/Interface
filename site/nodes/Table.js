import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import useStore from "../store/store.js";

const TableNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const paramInputs = useStore((state) => state.paramInputs); // grab inputs from store
  const isDimmed = !activeFilters.has("Table");
  const fetchNodeId = useStore((state) => state.fetchNodeId);
  const selected = id == fetchNodeId
  const moduleName = data.moduleName;

  // Filter paramTables based on matching paramInputs
  const filteredParamTables = Object.entries(data.paramTables || {}).filter(([key]) => {
    if (!moduleName || !paramInputs) return true;

    // Find input that matches module
    const inputEntry = Object.entries(paramInputs).find(([inputKey]) =>
      inputKey.endsWith(`@${moduleName}`)
    );

    if (!inputEntry) return true;

    const [, value] = inputEntry;
    const cleanedValue = value?.replace(/^"|"$/g, "");

    return key.includes(cleanedValue);
  });

  const displayRows = Object.fromEntries(filteredParamTables);

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(selected ? styles.selected : {}),
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.node}>
        <div style={styles.header}>{data.label || "Database Table"}</div>

        {Object.keys(displayRows).length > 0 ? (
          Object.entries(displayRows).map(([paramKey, rows], idx) => (
            <div key={idx} style={{ marginTop: idx > 0 ? "16px" : "0" }}>
              <div style={styles.subHeader}>
                {paramKey !== "Default" ? paramKey : null}
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    {data.columns?.map((col, idx) => (
                      <th key={idx} style={styles.th}>
                        {`${col.name} (${col.type})`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows && rows.length > 0 ? (
                    rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {data.columns.map((col, colIdx) => (
                          <td key={colIdx} style={styles.td}>
                            {row[col.name] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {data.columns.map((_, colIdx) => (
                        <td key={colIdx} style={styles.td}></td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          // Fallback if no paramTables match, but we still want to show columns
          <div>
            <table style={styles.table}>
              <thead>
                <tr>
                  {data.columns?.map((col, idx) => (
                    <th key={idx} style={styles.th}>
                      {`${col.name} (${col.type})`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {data.columns?.map((_, colIdx) => (
                    <td key={colIdx} style={styles.td}></td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>

      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};
const glowKeyframes = `
@keyframes glow-blue {
  0% { box-shadow: 0 0 0px #2196F3 }
  50% { box-shadow: 0 0 12px 4px #2196F3 }
  100% { box-shadow: 0 0 0px #2196F3 }
}
`;

if (typeof document !== "undefined" && !document.getElementById("glow-blue-keyframes")) {
  const style = document.createElement("style");
  style.id = "glow-blue-keyframes";
  style.innerHTML = glowKeyframes;
  document.head.appendChild(style);
}
const styles = {
  wrapper: {
    position: "relative",
    transition: "all 0.3s ease-in-out",
  },
  node: {
    background: "linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)",
    border: "2px solid #2196F3",
    borderRadius: "12px",
    padding: "16px",
    minWidth: "200px",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0px 4px 10px rgba(33, 150, 243, 0.2)",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
  },
  selected: {
    animation: "glow-blue 1.1s ease-in-out infinite",
    borderRadius: "14px",
  },
  header: {
    fontWeight: "700",
    fontSize: "18px",
    color: "#1d4ed8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  subHeader: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#1e40af",
    marginBottom: "4px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    borderBottom: "2px solid #93c5fd",
    padding: "8px",
    backgroundColor: "#dbeafe",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#2563eb",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "12px",
    textAlign: "center",
    color: "#374151",
  },
};

export default memo(TableNode);

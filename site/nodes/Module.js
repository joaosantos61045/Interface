import React from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from "../store/store.js";

const ModuleNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const enterModule = useStore((state) => state.enterModule); // action you'll define
  const isDimmed = !activeFilters.has("Module");
  const fetchNodeId = useStore((state) => state.fetchNodeId);
  const selected = id == fetchNodeId
  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div
      style={{
        ...styles.node,
        opacity: isDimmed ? 0.4 : 1,
        ...(selected ? styles.selected : {}),
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.header}>
        {data.label || "Unnamed Module"}
      </div>
      <div style={{ fontSize: "14px", color: "#6b7280" }}>
        {data.value || "No description available."}
      </div>

      <button
        onClick={() => enterModule(data.label)}
        style={styles.button}
      >
        Enter Module
      </button>

      <Handle
        className="customHandle"
        position={Position.Right}
        type="source"
        isConnectable={isConnectable}
      />
      <Handle
        className="customHandle"
        position={Position.Left}
        type="target"
        isConnectableStart={false}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const glowKeyframes = `
@keyframes glow-mod {
  0% { box-shadow: 0 0 0px #a855f7 }
  50% { box-shadow: 0 0 12px 4px #a855f7}
  100% { box-shadow: 0 0 0px #a855f7}
}
`;

if (typeof document !== "undefined" && !document.getElementById("glow-mod-keyframes")) {
  const style = document.createElement("style");
  style.id = "glow-mod-keyframes";
  style.innerHTML = glowKeyframes;
  document.head.appendChild(style);
}
const styles = {
  node: {
    padding: "20px",
    border: "2px solid #a855f7",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #e6e0ff 0%, #f3f0ff 100%)",
    width: "auto",
    minWidth: "220px",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0px 6px 15px rgba(168, 85, 247, 0.2)",
    transition: "all 0.3s ease-in-out",
    cursor: "default",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    fontFamily: "'Inter', sans-serif",
  },
  selected: {
  animation: "glow-mod 1.1s ease-in-out infinite",
  borderRadius: "14px",
},
  header: {
    fontWeight: 700,
    fontSize: "18px",
    color: "#9333ea",
  },
  button: {
    padding: "6px 14px",
    borderRadius: "8px",
    background: "#9333ea",
    color: "#fff",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default ModuleNode;

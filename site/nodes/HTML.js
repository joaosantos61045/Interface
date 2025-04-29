import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import useStore from "../store/store.js";

const HtmlNode = ({ data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("HTML");

  const openHtmlContent = () => {
    const name = data.label || "UnnamedHTML";
    const url = `http://localhost:8080/app/A7pX2/${encodeURIComponent(name)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
    >
      <div style={styles.device}>
        <div style={styles.notch}></div>
        <div style={styles.screen}>
          <strong style={styles.label}>{data.label || "Unnamed HTML"}</strong>
          <button onClick={openHtmlContent} style={styles.button}>
            Open HTML
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const styles = {
  wrapper: {
    position: "relative",
    transition: "all 0.3s ease",
  },
  device: {
    width: "140px",
    height: "260px",
    backgroundColor: "#222",
    borderRadius: "30px",
    padding: "8px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  notch: {
    width: "60px",
    height: "8px",
    backgroundColor: "#000",
    borderRadius: "4px",
    position: "absolute",
    top: "6px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 2,
  },
  screen: {
    marginTop: "20px",
    backgroundImage: "url('https://miro.medium.com/v2/resize:fit:1400/1*bXww9rpeTUyZ1J31sgPR9A.jpeg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "calc(100% - 20px)",
    borderRadius: "20px",
    padding: "10px",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.3)",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: "4px 8px",
    borderRadius: "6px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  button: {
    marginTop: "8px",
    padding: "6px 10px",
    fontSize: "10px",
    fontWeight: "600",
    background: "#00bcd4",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.2s ease-in-out",
  },
};

export default memo(HtmlNode);

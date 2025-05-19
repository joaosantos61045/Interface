import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import useStore from "../store/store.js";
import { get_namespace } from "../../pkg/meerkat_remote_console_V2.js";
const HtmlNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("HTML");
  const [isExpanded, setIsExpanded] = useState(false);
const fetchNodeId = useStore((state) => state.fetchNodeId);
  const selected = id == fetchNodeId
  const name = id || "UnnamedHTML";
  const pathParts = name.split("@").reverse().map(encodeURIComponent);
  const path = pathParts.join("/");
  const url = `http://localhost:8080/app/${get_namespace()}/${path}`;

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const dynamicDeviceStyle = {
    ...styles.device,
    height: isExpanded ? "600px" : "260px",
    width: isExpanded ? "100%" : "150px",
  };

  const dynamicScreenStyle = {
    ...styles.screen,
    height: "100%",
    width: "100%",
    backgroundImage: isExpanded
      ? "none"
      : "url('https://miro.medium.com/v2/resize:fit:1400/1*bXww9rpeTUyZ1J31sgPR9A.jpeg')",
  };

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
      <div style={dynamicDeviceStyle}>
        <div style={styles.notch}></div>
        <div style={dynamicScreenStyle}>
          <strong style={styles.label}>{data.label || "Unnamed HTML"}</strong>

          {isExpanded ? (
            <>
              <iframe
                src={url}
                title={name}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "10px",
                  flex: 1,
                }}
              />
              <button onClick={toggleExpanded} style={styles.button}>
                Collapse
              </button>
            </>
          ) : (
            <button onClick={toggleExpanded} style={styles.button}>
              Open HTML Inline
            </button>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};
const glowKeyframes = `
@keyframes glow-html {
  0% { box-shadow: 0 0 0px rgba(0,0,0,0.4) }
  50% { box-shadow: 0 0 12px 4px rgba(0,0,0,0.4)}
  100% { box-shadow: 0 0 0px rgba(0,0,0,0.4) }
}
`;

if (typeof document !== "undefined" && !document.getElementById("glow-html-keyframes")) {
  const style = document.createElement("style");
  style.id = "glow-html-keyframes";
  style.innerHTML = glowKeyframes;
  document.head.appendChild(style);
}
const styles = {
  wrapper: {
    position: "relative",
    transition: "all 0.3s ease",
  },
  device: {
    width: "140px",
    backgroundColor: "#222",
    borderRadius: "30px",
    padding: "8px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    transition: "height 0.3s ease",
  },
  selected: {
  animation: "glow-html 1.1s ease-in-out infinite",
  borderRadius: "30px ",
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
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100%",
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

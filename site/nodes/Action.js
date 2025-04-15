import React, { memo } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import useStore from '../store/store.js';
import init, { main, get_env, send_message_to_server } from "../../pkg/meerkat_remote_console_V2";

const ActionNode = ({ id, data, isConnectable }) => {
  const activeFilters = useStore((state) => state.activeFilters);
  const isDimmed = !activeFilters.has("Action");

  const connection = useConnection();
  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  const onEdgeClick = () => {
    console.log("BE",isDimmed);
    const message = "do " + data.target + "=" + data.action;
    console.log(message);
    send_message_to_server(message);
  };

  return (
    <div
      style={{
        ...styles.node,
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(100%)" : "none",
        pointerEvents: isDimmed ? "none" : "auto",
      }}
      onClick={onEdgeClick}
    >
      <strong style={styles.text}>{data.label}</strong>
      <p style={styles.text}>{data.target || "No target"}</p>
      <p style={styles.text}>{data.action || "No action defined"}</p>

      {!connection.inProgress && (
        <Handle
          className="customHandle"
          position={Position.Right}
          type="source"
          isConnectable={isConnectable}
        />
      )}
      {(!connection.inProgress || isTarget) && (
        <Handle
          className="customHandle"
          position={Position.Left}
          type="target"
          isConnectableStart={false}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
};

const styles = {
  node: {
    padding: "10px",
    border: "2px solid rgb(252, 0, 55)",
    borderRadius: "5px",
    background: "#fff",
    width: "auto",
    maxWidth: "550px",
    textAlign: "center",
    boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    display: "block",
  },
};

export default memo(ActionNode);

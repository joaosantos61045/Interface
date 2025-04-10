import React, { memo } from "react";
import { Handle, Position,useConnection } from "@xyflow/react";
import init, { main,get_env, send_message_to_server } from "../../pkg/meerkat_remote_console_V2";
const ActionNode = ({id, data, isConnectable }) => {
  const connection = useConnection();
     
      const isTarget = connection.inProgress && connection.fromNode.id !== id;
    const onEdgeClick = () => {
      let message = "do "+ data.target+"="+data.action;
        console.log(message);
        send_message_to_server(message);
            
      };
  return (
    <div style={styles.node}>
      <strong style={styles.text}>{data.label}</strong>
      <p style={styles.text}>{data.target || "No target"}</p>
      <p style={styles.text}>{data.action || "No action defined"}</p>
      
      
      {!connection.inProgress && (
                <Handle
                  className="customHandle"
                  position={Position.Right}
                  type="source"
                />
              )}
              {/* We want to disable the target handle, if the connection was started from this node */}
              {(!connection.inProgress || isTarget) && (
                <Handle className="customHandle" position={Position.Left} type="target" isConnectableStart={false} />
              )}
    </div>
  );
};

const styles = {
  node: { padding: "10px", border: "2px solid rgb(252, 0, 55)", borderRadius: "5px", background: "#fff", width: "auto", maxwidth: "550px",textAlign: "center" },
  input: { width: "90%", marginTop: "5px", padding: "5px" },
  button: { marginTop: "5px", padding: "5px", cursor: "pointer", width: "100%" },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    display: "block",
  },
};

export default memo(ActionNode);

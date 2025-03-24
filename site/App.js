import React, { useEffect, useRef, useCallback,useState  } from "react";
import { useFloating } from '@floating-ui/react';
import Console from "./console.js";
import init, { main } from "../pkg/meerkat_remote_console_V2.js"; // Import your existing functions
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  MiniMap,
  Controls,
  Background,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Sidebar from "./Sidebar";
import { DnDProvider, useDnD } from "./DnDContext";
import VariableNode from "./nodes/Variable";
import DefinitionNode from './nodes/Definition';
import ActionNode from './nodes/Action';
import TableNode from './nodes/Table';
import HtmlNode from './nodes/HTML';
import ActionEdge from './edges/ActionEdge';
import useStore from './store/store.js'; // Import the zustand store

const nodeTypes = {
  variable: VariableNode,
  definition: DefinitionNode,
  action: ActionNode,
  table: TableNode,
  html: HtmlNode,
};

const edgeTypes = {
  action: ActionEdge,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = () => {
  const reactFlowWrapper = useRef(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useStore(); // Use Zustand store
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();
  const { refs, floatingStyles } = useFloating();
  const addNode = useStore((state) => state.addNode);
  const [pendingNode, setPendingNode] = useState(null);
  const [formData, setFormData] = useState({});
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("nodes", nodes.length);
    }, 2000);
  
    return () => clearInterval(interval);
  }, []);
  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges(
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, edges);
          const outgoers = getOutgoers(node, nodes, edges);
          const connectedEdges = getConnectedEdges([node], edges);

          const remainingEdges = acc.filter(
            (edge) => !connectedEdges.includes(edge),
          );

          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            })),
          );

          return [...remainingEdges, ...createdEdges];
        }, edges),
      );
    },
    [nodes, edges, setEdges]
  );

  

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const updateNodeData = (id, field, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };
  
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setPendingNode({ type, position });

      // Pre-fill default values based on type
      let initialData = {};
      switch (type) {
        case "variable":
          initialData = { label: "", value: "" };
          break;
        case "definition":
          initialData = { label: "", definition: "" };
          break;
        case "action":
          initialData = { name: "", action: "" };
          break;
        case "table":
          initialData = { rows: [["Row 1", "Data 1"], ["Row 2", "Data 2"]] };
          break;
        case "html":
          initialData = { content: "<p>Enter HTML here</p>" };
          break;
        default:
          initialData = { label: "" };
      }
      setFormData(initialData);
    },
    [screenToFlowPosition, type]
  );

  const handleConfirm = () => {
    if (!pendingNode) return;

    const newNode = {
      id: getId(),
      type: pendingNode.type,
      position: pendingNode.position,
      data: {
        ...formData,
        onChange: (value) => updateNodeData(newNode.id, "label", value),
      },
    };

    addNode(newNode);
    setPendingNode(null);
    setFormData({});
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }} ref={refs.setReference}>
      {/* React Flow + Sidebar on the left */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "2px solid #ddd", padding: "10px" }}>
        <h2 style={{ textAlign: "center" }}>Meerkat UI</h2>
        
        <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ flex: 1, border: "1px solid #ccc", borderRadius: "8px" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            style={{ backgroundColor: "#F7F9FB" }}
          >
            <Sidebar />
            <Console />
            <Controls />
            <Background />
            <MiniMap />
          </ReactFlow>
          
        </div>
        {pendingNode && (
        <div style={styles.configPanel}>
          <h3>Configure {pendingNode.type} Node</h3>
          
          {/* Render dynamic inputs based on node type */}
          {Object.keys(formData).map((key) => (
            <label key={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}:
              <input
                type="text"
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                style={styles.input}
              />
            </label>
          ))}

          <button onClick={handleConfirm} style={styles.button}>Confirm</button>
        </div>
      )}
      </div>
    </div>
  );
};
const styles = {
  configPanel: {
    position: "fixed", // Center it relative to the viewport
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)", // Perfect centering
    background: "white",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    width: "300px", // Slightly wider for better input layout
    zIndex: 1000,
    textAlign: "center", // Center content inside
  },
  input: {
    width: "100%",
    padding: "8px",
    marginBottom: "8px",
    fontSize: "14px",
  },
  button: {
    padding: "8px 16px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
  },
};
const App = () => {
  useEffect(() => {
    const run = async () => {
      console.log("Initializing...");
      await init();
      await main();
    };
    run();
  }, []);

  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow />
      </DnDProvider>
    </ReactFlowProvider>
  );
};

export default App;

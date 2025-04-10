import React, { useEffect, useRef, useCallback, useState } from "react";
import { useFloating } from '@floating-ui/react';
import Console from "./console.js";
import { nanoid } from 'nanoid';
import init, { main,get_env, send_message_to_server } from "../pkg/meerkat_remote_console_V2";
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
import useStore from './store/store.js';
import { /** @type {NodeType} */ NodeType, /** @type {NodeData} */ NodeData } from "./types.d.ts";
const nodeTypes = {
  Variable: VariableNode,
  Definition: DefinitionNode,
  Action: ActionNode,
  Table: TableNode,
  HTML: HtmlNode,
};

const edgeTypes = {
  action: ActionEdge,
};
let id = 0;
const getId = () => {
  let str = '';
  let num = id++;
  do {
      str = String.fromCharCode(97 + (num % 26)) + str; // 'a' = 97
      num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  return `dndnode_${str}`;
};

const DnDFlow = () => {
  const reactFlowWrapper = useRef(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useStore();
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();
  const { refs, floatingStyles } = useFloating();
  const addNode = useStore((state) => state.addNode);
  const updateNode = useStore((state) => state.updateNode);
  const removeNode = useStore((state) => state.removeNode);
  const addEdge = useStore((state) => state.addEdge);
  const checkExists = useStore((state) => state.checkExists);
  const [pendingNode, setPendingNode] = useState(null);
  const [formData, setFormData] = useState({});
  const [editFormData, setEditFormData] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  useEffect(() => {
    const interval = setInterval(() => {
      //console.log("nodes", nodes);
      //console.log("edges", edges);
      
    }, 4000);

    return () => clearInterval(interval);
  }, []);
  window.update_environment = function(envString) {
    try {
      const env = JSON.parse(envString); // e.g. {"x0":"Int(3)-Var-3","g0":"Int(6)-Def-(x + x)"}
      console.log("🔁 Parsed environment:", env);
  
      // Step 1: Create dependency mappings for each node
      const dependencies = {}; // maps nodeId to a list of dependent node ids
      const nodesToUpdate = [];
  
      for (const [rawLabel, rawValueAndType] of Object.entries(env)) {
        const baseLabel = rawLabel.replace(/\d+$/, ''); // "x0" -> "x"
    
        // Split into parts: ["Int(6)", "Def", "(x + x)"]
        const parts = rawValueAndType.split("-");
        const valuePart = parts[0];
        const type = parts[1];
        const rawDefinition = parts[2] || null;
    
        // Extract number from Int(x) or Bool(y) etc.
        const parsedValueMatch = valuePart.match(/^[A-Za-z]+\((.*)\)$/);
        const parsedValue = parsedValueMatch ? parsedValueMatch[1] : valuePart;
    
        // Clean definition if it exists (remove surrounding parentheses)
        const cleanDefinition = rawDefinition?.replace(/^\((.*)\)$/, '$1');
    
        // Track node dependencies
        const nodeDependencies = cleanDefinition ? cleanDefinition.match(/\b[A-Za-z_]\w*\b/g) || [] : [];
        dependencies[baseLabel] = nodeDependencies;
    
        // Save the nodes and their data
        nodesToUpdate.push({
          label: baseLabel,
          value: parsedValue,
          type,
          definition: type === "Def" ? cleanDefinition : undefined
        });
      }
    
      // Step 2: Sort nodes by dependency order (topological sort)
      const sortedNodes = topologicalSort(nodesToUpdate, dependencies);
  
      // Step 3: Update nodes in sorted order
      sortedNodes.forEach(({ label, value, type, definition }) => {
        const node = nodes.find((node) => node.id === label);
  
        const updateData = { value };
        if (type === "Def" && definition) {
          updateData.definition = definition;
        }
  
        if (node) {
          // Update existing node
          console.log(`Updating node ${label} with value: ${value}`);
          updateNode(label, updateData);
        } else {
          // Node doesn't exist, create it
          console.warn(`Node with label ${label} not found. Creating new node of type ${type}.`);
  
          const newNode = {
            id: label,
            type: type === "Def" ? "Definition" : "Variable",
            position: { x: 0, y: 0 }, // default position
            data: {
              label,
              value,
              definition: type === "Def" && definition !== undefined ? definition : undefined,
            },
          };
  
          addNode(newNode);
        }
      });
    } catch (e) {
      console.error("Failed to parse environment:", e);
    }
  };
  
  // Helper function: Topological Sort (dependency resolution)
  function topologicalSort(nodes, dependencies) {
    const sorted = [];
    const visited = new Set();
    const tempMark = new Set(); // to detect cycles
  
    function visit(node) {
      if (tempMark.has(node.label)) {
        throw new Error(`Circular dependency detected: ${node.label}`);
      }
      if (!visited.has(node.label)) {
        tempMark.add(node.label);
        const nodeDeps = dependencies[node.label] || [];
        nodeDeps.forEach(dep => {
          const depNode = nodes.find(n => n.label === dep);
          if (depNode) {
            visit(depNode);
          }
        });
        visited.add(node.label);
        tempMark.delete(node.label);
        sorted.push(node);
      }
    }
  
    nodes.forEach(node => {
      visit(node);
    });
  
    return sorted;
  }
  

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

  const onBeforeDelete = useCallback(
    ({ nodes: nodesToDelete }) => {
      // Check if any node has edges (incoming or outgoing)
      const hasEdges = nodesToDelete.some((node) =>
        edges.some((edge) => edge.source === node.id || edge.target === node.id)
      );
  
      if (hasEdges) {
        console.warn("Cannot delete nodes that have edges.");
      //  return false; // Prevent deletion
      }
  
      return true; // Allow deletion if no edges exist
    },
    [edges]
  );
  
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

 /* const updateNodeData = (id, field, value) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [field]: value } } : node
      )
    );
  };*/

  const handleSave = () => {
    if (!selectedNode) return;
  
    console.log(editFormData)
    let message = '';
    if (selectedNode.type === 'Variable') {
      message = `var ${editFormData.label} = ${editFormData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (selectedNode.type === 'Definition') {
      message = `def ${editFormData.label} = ${editFormData.definition}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    }
  
    
    if(selectedNode.id === editFormData.label)
    updateNode(selectedNode.id, editFormData);
    else{
      const newNode = {
        id: editFormData.label,
        type: selectedNode.type,
        position: selectedNode.position,
        data: { ...editFormData },
      };
      console.log("New Node:",selectedNode)
      removeNode(selectedNode.id); // Remove the old node problema se tiver edges
      addNode(newNode);
      
    }
    setSelectedNode(null);
    setEditFormData({});
  };
  const handleDelete = () => {
    if (!selectedNode) return;
    removeNode(selectedNode.id);
    setSelectedNode(null); // Close modal
    setEditFormData({}); // Reset form
  };



  /**
   * Handles dropping a node onto the canvas.
   * @param {DragEvent} event - The drag event.
   */
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setPendingNode({ type, position });

      /** @type {Record<NodeType, NodeData>} */
      const defaultData = {
        Variable: { label: "v", value: 1 },
        Definition: { label: "d",definition:"" , },
        Action: { label: "x",target:"", action: "" },
        Table: { label: "s", columns: [{ name: "", type: "text" }], rows: [] },
        HTML: { label: "c", definition: "<p>Enter HTML here</p>" },
      };

      setFormData(defaultData[type] || { label: "" });
    },
    [screenToFlowPosition, type]
  );

  
  const handleEditCancel = () => {
    setSelectedNode(null);
    setEditFormData({});
  };
  const handleConfirm = () => {
    if (!pendingNode) return;
    checkExists(formData.label);
  
    // Create the new node
    const newNode = {
      id: formData.label,
      type: pendingNode.type,
      position: pendingNode.position,
      data: { ...formData },
    };
  
    
    let message = '';
    if (pendingNode.type === 'Variable') {
      message = `var ${formData.label} = ${formData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (pendingNode.type === 'Definition') {
      message = `def ${formData.label} = ${formData.definition}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    }
  
    // Add the new node
    addNode(newNode);
  
    // Reset the pending node and form data
    setPendingNode(null);
    setFormData({});
  };
  


  const onNodeDoubleClick = (_, node) => {
    setSelectedNode(node);
    setEditFormData(node.data);
  };

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if ( connectionState.isValid || connectionState.fromHandle.type === 'target') {
        return;
      }
      
      const fromNodeId = connectionState.fromNode.id;
      const fromNodeType = connectionState.fromNode.type;
      const id = getId();
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;

      let newNodeType = '';
      let newNodeData = {};
      let edgeType = 'default';
      let action = "Unknown";
      if (fromNodeType === 'Action') {
        newNodeType = 'Variable';
        newNodeData = { label: id, value: "" };
        edgeType = 'action';
        console.log("ALO")
        action=connectionState.fromNode.data.action;
        console.log("Action",action)
        updateNode(fromNodeId, { target: id });
      } else if (fromNodeType === 'Variable') {
        newNodeType = 'Definition';
        newNodeData = { label: id, definition: ""+connectionState.fromNode.data.label };
      } else {
        return;
      }

      const newNode = {
        id,
        type: newNodeType,
        position: screenToFlowPosition({
          x: clientX,
          y: clientY,
        }),
        data: newNodeData,
      };

      const newEdge = {
        id: `${fromNodeId}->${id}`,
        source: fromNodeId,
        target: id,
        data: {
          action: action, // Assign action to the edge data
        },
        type: edgeType,
        reconnectable: 'target',
      };

    let message = '';
    if (newNodeType === 'Variable') {
      message = `var ${newNodeData.label} = ${newNodeData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (newNodeType === 'Definition') {
      message = `def ${newNodeData.label} = ${newNodeData.definition}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    }
      // Update nodes and edges
      addNode(newNode);
      console.log("Adding edge", newEdge)
      if(fromNodeType === 'Action')
      addEdge(newEdge);
      // Optionally trigger the pending node form with the new node
      // set the pendingNode to the newNode to show form
      //setPendingNode(newNode);
    },
    [setNodes, setEdges, screenToFlowPosition, setPendingNode]
  );
  const handleColumnChange = (index, field, value) => {
    setFormData((prev) => {
      const columns = [...prev.columns];
      columns[index][field] = value;
      return { ...prev, columns };
    });
  };
  const handleDeleteColumn = (index) => {
    console.log(formData.columns)
    const updatedColumns = formData.columns.filter((_, i) => i !== index);
    setFormData({ ...formData, columns: updatedColumns });
  };

  const handleAddColumn = () => {
    setFormData((prev) => ({
      ...prev,
      columns: [...prev.columns, { name: "", type: "text" }],
    }));
  };

  const handleEditAddColumn = () => {
    setEditFormData({
      ...editFormData,
      columns: [...editFormData.columns, { name: "", type: "text" }],
    });
  };

  const handleEditDeleteColumn = (index) => {
    const updatedColumns = editFormData.columns.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, columns: updatedColumns });
  };

  const handleEditColumnChange = (index, key, value) => {
    const updatedColumns = editFormData.columns.map((col, i) =>
      i === index ? { ...col, [key]: value } : col
    );
    setEditFormData({ ...editFormData, columns: updatedColumns });
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }} ref={refs.setReference}>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "2px solid #ddd", padding: "10px" }}>
        <h2 style={{ textAlign: "center" }}>Meerkat UI</h2>

        <div ref={reactFlowWrapper} style={{ flex: 1, border: "1px solid #ccc", borderRadius: "8px" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            onBeforeDelete={onBeforeDelete}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onDrop={onDrop}
            onNodeDoubleClick={onNodeDoubleClick}
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

            {pendingNode && (
              <div style={styles.configPanel}>
                <h3>Configure {pendingNode.type} Node</h3>

                {pendingNode.type === "Table" ? (
                  <>
                    {/* Table Name Input */}
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Table Name:
                      <input
                        value={formData.label || ""}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        style={styles.input}
                        required />
                    </label>

                    <h4>Columns:</h4>

                    {formData.columns.map((col, index) => (
                      <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        {/* Column Name Input */}
                        <input
                          placeholder="Column Name"
                          value={col.name || ""}
                          onChange={(e) => handleColumnChange(index, "name", e.target.value)}
                          style={styles.input}
                        />

                        {/* Column Type Dropdown */}
                        <select
                          value={col.type || "text"}
                          onChange={(e) => handleColumnChange(index, "type", e.target.value)}
                          style={styles.input}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                        </select>

                        {/* Delete Column Button */}
                        <button onClick={() => handleDeleteColumn(index)} style={styles.deleteButton}>
                          ✖
                        </button>
                      </div>
                    ))}

                    {/* Add Column Button */}
                    <button onClick={handleAddColumn} style={styles.button}>
                      + Add Column
                    </button>
                  </>
                ) : (
                  // Generic Form for Other Node Types
                  Object.keys(formData).map((key) => (
                    <label key={key} style={{ display: "block", marginBottom: "10px" }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                      <input
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        style={styles.input}
                      />
                    </label>
                  ))
                )}

                {/* Cancel & Confirm Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setPendingNode(null)} style={styles.cancel_button}>
                    Cancel
                  </button>
                  <button onClick={handleConfirm} style={styles.button}>
                    Confirm
                  </button>
                </div>
              </div>
            )}


            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setPendingNode(null)} style={styles.cancel_button}>
                Cancel
              </button>
              <button onClick={handleConfirm} style={styles.button}>
                Confirm
              </button>
            </div>
          </div>
        )}


{selectedNode && (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <h3>Edit {selectedNode.type} Node</h3>

      {selectedNode.type === "Table" ? (
        <>
          {/* Edit Table Name */}
          <label style={styles.label}>
            Table Name:
            <input
              value={editFormData.label || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, label: e.target.value })
              }
              style={styles.input}
            />
          </label>

          <h4>Columns:</h4>
          {editFormData.columns.map((col, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
            >
              {/* Edit Column Name */}
              <input
                placeholder="Column Name"
                value={col.name || ""}
                onChange={(e) =>
                  handleEditColumnChange(index, "name", e.target.value)
                }
                style={styles.input}
              />

              {/* Edit Column Type */}
              <select
                value={col.type || "text"}
                onChange={(e) =>
                  handleEditColumnChange(index, "type", e.target.value)
                }
                style={styles.input}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>

              {/* Delete Column Button */}
              <button
                onClick={() => handleEditDeleteColumn(index)}
                style={styles.deleteButton}
              >
                ✖
              </button>
            </div>
          ))}

          {/* Add Column Button */}
          <button onClick={handleEditAddColumn} style={styles.button}>
            + Add Column
          </button>
        </>
      ) : (
        <>
          {/* NEW: Buttons for Nodes That Point to This Node */}
          <div style={{ marginBottom: "10px" }}>
            <h4>Related Nodes:</h4>
            {edges
              .filter((edge) => edge.target === selectedNode.id)
              .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source);
                return sourceNode ? (
                  <button
                    key={sourceNode.id}
                    onClick={() =>{
                      setEditFormData((prev) => ({
                        ...prev,
                        definition: prev.definition
                          ? `${prev.definition} ${sourceNode.data.label}`
                          : sourceNode.data.label,
                      }))
                    
                    }
                    }
                    style={styles.button}
                  >
                    {sourceNode.data.label}
                  </button>
                ) : null;
              })}
          </div>
              
          {/* Generic Editing for Other Node Types */}
          {["label", "definition", "target", "action", "content", "value"].map(
            (key) =>
              selectedNode.data[key] !== undefined && (
                <label key={key} style={styles.label}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}:
                  <textarea
                    name={key}
                    value={editFormData[key] || ""}
                    onChange={(e) => {
                      setEditFormData({
                        ...editFormData,
                        [key]: e.target.value,
                      });
                      e.target.style.height = "auto"; // Reset height
                      e.target.style.height = `${e.target.scrollHeight}px`; // Expand dynamically
                    }}
                    style={{
                      ...styles.input,
                      minHeight: "40px",
                      resize: "none",
                      overflow: "hidden",
                    }}
                  />
                </label>
              )
          )}
        </>
      )}

      {/* Buttons for Save, Cancel, Delete */}
      <div style={styles.buttonContainer}>
        <button onClick={handleSave} style={styles.saveButton}>
          Save
        </button>
        <button onClick={handleEditCancel} style={styles.saveButton}>
          Cancel
        </button>
        <button onClick={handleDelete} style={styles.deleteButton}>
          Delete
        </button>
      </div>
    </div>
  </div>
)}





      </div>
    </div>
  );
};
const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    width: "300px",
  },
  saveButton: {
    padding: "8px 16px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",

  },
  deleteButton: {
    padding: "8px 16px",
    background: "#FF0000",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",

  },
  configPanel: {
    position: "fixed", // Center it relative to the viewport
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "white",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    width: "300px",
    zIndex: 1000,
    textAlign: "center",
  },
  input: {
    width: "95%",
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
  cancel_button: {
    padding: "8px 16px",
    background: "#FF0000",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
  }
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

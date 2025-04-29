import React, { useEffect, useRef, useCallback, useState } from "react";
import { useFloating } from '@floating-ui/react';
import Console from "./console.js";
import SearchBar from './SearchBar';
import FilterBar from './FilterBar';
import * as d3 from "d3-force";
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
  const [nodeColorFilter, setNodeColorFilter] = useState(() => (node) => node.data?.color || '#333');
  const { screenToFlowPosition,setCenter  } = useReactFlow();
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
      const env = JSON.parse(envString);
      console.log("Parsed environment:", env);
  
      const dependencies = {};
      const nodesToUpdate = [];
  
      for (const [label, data] of Object.entries(env)) {
        const {
          name,
          val,
          type,
          exp,
          keyword,
          originalInput,
          operation
        } = data;
  
        const baseLabel = name;
  
        if (operation === "delete") {
          console.log(`Deleting node: ${baseLabel}`);
          removeNode(baseLabel);
          continue;
        }
  
        const isDefinition = keyword === "def";
  
        const nodeDependencies = exp
          ? exp.match(/\b[A-Za-z_]\w*\b/g)?.filter(dep => dep !== name) || []
          : [];
  
        dependencies[baseLabel] = nodeDependencies;
  
        nodesToUpdate.push({
          id: baseLabel,
          label: baseLabel,
          value: val,
          type,
          definition: isDefinition ? exp : undefined,
          x: 0,
          y: 0 // These will be updated by D3
        });
      }
  
      // 🔧 Apply force-directed layout to prevent overlap
      const applyForceLayout = (nodes) => {
        const simulation = d3.forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-20))        // was -250
        .force("center", d3.forceCenter(0, 0))
        .force("collision", d3.forceCollide().radius(30))         // was 80
        .stop();
  
        for (let i = 0; i < 30; i++) simulation.tick();
  
        return nodes.map(node => ({
          ...node,
          position: { x: node.x, y: node.y }
        }));
      };
  
      const sortedNodes = topologicalSort(nodesToUpdate, dependencies);
      const positionedNodes = applyForceLayout(sortedNodes);
  
      positionedNodes.forEach(({ id, label, value, type, definition, position }) => {
        const node = nodes.find(n => n.id === label);
  
        const updateData = { value };
        if (definition) updateData.definition = definition;
  
        if (node) {
          console.log(`Updating node ${label} with value: ${value}`);
          updateNode(label, updateData);
        } else {
          if (type.startsWith("$")) return;
  
          console.warn(`Creating new node ${label} with type ${type}.`);
          let nodeType = "Variable";
  
          if (type === "html") nodeType = "HTML";
          else if (type.includes("action")) nodeType = "Action";
          else if (definition) nodeType = "Definition";
          else if (type?.startsWith("array[{") || value?.startsWith("table")) nodeType = "Table";
  
          let newNode;
  
          if (nodeType === "Table") {
            const columnPattern = /array\[\{(.+?)\}\]/;
            const match = type.match(columnPattern);
            const columns = [];
  
            if (match) {
              const columnDefs = match[1].split(",");
              for (const col of columnDefs) {
                const [colName, colType] = col.trim().split(":").map(s => s.trim());
                if (colName && colType) columns.push({ name: colName, type: colType });
              }
            }
  
            const rows = [];
            const valuePattern = /^table\[(.+)\]$/;
            const valueMatch = value?.match(valuePattern);
  
            if (valueMatch) {
              const rowString = `[${valueMatch[1]}]`;
              try {
                const parsedRows = JSON.parse(rowString.replace(/(\w+)\s*:/g, '"$1":'));
                if (Array.isArray(parsedRows)) rows.push(...parsedRows);
              } catch (e) {
                console.warn("Failed to parse table rows from value:", value);
              }
            }
  
            newNode = {
              id: label,
              type: "Table",
              position,
              data: { label, columns, rows }
            };
          } else if (nodeType === "Action") {
            newNode = {
              id: label,
              type: "Action",
              position,
              data: { label, action: definition }
            };
          } else {
            newNode = {
              id: label,
              type: nodeType,
              position,
              data: { label, value, definition }
            };
          }
  
          console.log("New node:", newNode);
          addNode(newNode);
        }
      });
  
      console.log("Parsed nodes:", nodes);
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
      //message = `var ${editFormData.label} = ${editFormData.value};${selectedNode.position.x}/${selectedNode.position.y}`;
      message = `var ${editFormData.label} = ${editFormData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (selectedNode.type === 'Definition' || selectedNode.type === 'HTML') {
      //message = `def ${editFormData.label} = ${editFormData.definition};${selectedNode.position.x}/${selectedNode.position.y}`;
      message = `def ${editFormData.label} = ${editFormData.definition}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (selectedNode.type === 'Table') {
      console.log("Table data",editFormData)
      const {columns } = editFormData;

      if ( !columns || columns.length === 0) {
        alert("Table name or columns missing.");
        return;
      }
    
      const formattedColumns = columns
        .map(col => `${col.name}:${col.type}`)
        .join(", ");
    
      const message = `table ${editFormData.label} { ${formattedColumns} }`;
    
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (selectedNode.type === 'Action') {
      message = `def ${editFormData.label} = ${editFormData.action} `;
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
    let message = 'delete '+selectedNode.id+'';
    send_message_to_server(message);  
    if (!selectedNode) return;
    //removeNode(selectedNode.id);
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
        Variable: { label: "var1", value: 1 },
        Definition: { label: "def1",definition:"" , },
        Action: { label: "act" ,action: "action { var1 :=3}" },
        Table: { label: "tab", columns: [{ name: "", type: "string" }], rows: [] },
        HTML: { label: "pag", definition: "<p>Enter HTML here</p>" },
        group: { label: "mod" },
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
    console.log("New Node:",newNode.type)
    
    
    let message = '';
    if (pendingNode.type === 'Variable') {
      //message = `var ${formData.label} = ${formData.value};${pendingNode.position.x}/${pendingNode.position.y}`;
      message = `var ${formData.label} = ${formData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (pendingNode.type === 'Definition' || pendingNode.type === 'HTML') {
      //message = `def ${formData.label} = ${formData.definition};${pendingNode.position.x}/${pendingNode.position.y}`;
      message = `def ${formData.label} = ${formData.definition}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (pendingNode.type === 'Table') {
      const {columns } = newNode.data;

      if ( !columns || columns.length === 0) {
        alert("Table name or columns missing.");
        return;
      }
    
      const formattedColumns = columns
        .map(col => `${col.name}:${col.type}`)
        .join(", ");
    
      const message = `table ${formData.label} { ${formattedColumns} }`;
    
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (pendingNode.type === 'Action') {
    message = `def ${formData.label} = ${formData.action}`;
    console.log("Sending message to server:", message);
    send_message_to_server(message);
    } else if (pendingNode.type === 'group') {
      message = `module ${formData.label}`;
      console.log("Sending message to server:", message);
     // send_message_to_server(message);
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
  const onNodeDragStop = (event, node) => {
    
    // Find all group nodes
    const groupNodes = nodes.filter((n) => n.type === 'group');

    let newParentId = null;

    // Check if dragged node is inside any group
    for (const groupNode of groupNodes) {
      const insideGroup = isInside(node.position, groupNode);
      
      if (insideGroup) {
        newParentId = groupNode.id;
       // updateNode(node.id, { parentId: newParentId });
        break; // Only one group at a time
      }
    }
    
    
  }
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
      //message = `var ${newNodeData.label} = ${newNodeData.value};${newNode.position.x}/${newNode.position.y}`;
      message = `var ${newNodeData.label} = ${newNodeData.value}`;
      console.log("Sending message to server:", message);
      send_message_to_server(message);
    } else if (newNodeType === 'Definition') {
      //message = `def ${newNodeData.label} = ${newNodeData.definition};${newNode.position.x}/${newNode.position.y}`;
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
      columns: [...prev.columns, { name: "", type: "string" }],
    }));
  };

  const handleEditAddColumn = () => {
    setEditFormData({
      ...editFormData,
      columns: [...editFormData.columns, { name: "", type: "string" }],
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
  const nodeColor = (node) => {
    switch (node.type) {
      case 'Variable':
        return 'rgb(225, 0, 255)';
      case 'Definition':
        return 'rgb(19, 223, 29)';
      case 'Action':
        return 'rgb(255, 0, 0)';
      case 'Table':
        return 'rgb(0, 0, 255)';
      case 'HTML':
        return 'rgb(255, 165, 0)';
       
      default:
        return '#ff0072';
    }
  };
  const handleMinimapNodeClick = (event, node) => {
    if (node?.position) {
      const offsetX = 60; // shift right
      const offsetY = 45;  // shift down
      const { x, y } = node.position;
  
      setCenter(x + offsetX, y + offsetY, {
        zoom: 2,
        duration: 800,
      });
    }
  };
  const isInside = (childPos, parentNode) => {
    const { position, style } = parentNode;
    const width = style?.width || 150;
    const height = style?.height || 22;
 
    return (
      childPos.x > position.x &&
      childPos.x < position.x + width &&
      childPos.y > position.y &&
      childPos.y < position.y + height
    );
  };
 
  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }} ref={refs.setReference}>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "2px solid #ddd", padding: "10px" }}>
      <h2 style={{
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",  
      color: "#333",  
      marginBottom: "20px", 
    }}>
      Meerkat UI
    </h2>

        <div  style={{ flex: 1, border: "1px solid #ccc", borderRadius: "8px" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
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
            style={{ 
              backgroundColor: "#F7F9FB",
              borderRadius: "8px", 
              padding: "15px", 
            }}
          >
            
            <FilterBar nodes={nodes} setNodes={setNodes} />
            <SearchBar nodes={nodes} />
            <Sidebar />
           
            <Console />
            <Controls />
            <Background />
            <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable onNodeClick={handleMinimapNodeClick} />
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
                          value={col.type || "string"}
                          onChange={(e) => handleColumnChange(index, "type", e.target.value)}
                          style={styles.input}
                        >
                          <option value="string">String</option>
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
                      <textarea
                        value={formData[key]}
                        onChange={(e) => {
                          setFormData({ ...formData, [key]: e.target.value });
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        style={{
                          ...styles.input,
                          minHeight: "40px",
                          resize: "none",
                          overflow: "hidden",
                        }}
                      />
                    </label>
                  ))
                  
                )}

                {/* Cancel & Confirm Buttons */}
                <div style={styles.buttonContainer}>
                  <button onClick={() => setPendingNode(null)} style={styles.cancel_button}>
                    Cancel
                  </button>
                  <button onClick={handleConfirm} style={styles.button}>
                    Confirm
                  </button>
                </div>
              </div>
            )}


           
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
          { selectedNode.type == "Definition" && <div style={{ marginBottom: "10px" }}>
            <h4>Related Nodes:</h4>
            {edges
              .filter((edge) => edge.target === selectedNode.id)
              .map((edge) => {
                const sourceNode = nodes.find((node) => node.id === edge.source);
                return sourceNode ? (
                  <button
                  key={sourceNode.id}
                  onClick={() => {
                    setEditFormData((prev) => ({
                      ...prev,
                      definition: prev.definition
                        ? `${prev.definition} ${sourceNode.data.label}`
                        : sourceNode.data.label,
                    }));
                  }}
                  style={{ ...styles.button, margin: "5px" }}
                >
                  {sourceNode.data.label}
                </button>

                  
                ) : null;
              })}
          </div>}
              
          {/* Generic Editing for Other Node Types */}
          {["label", "definition", "action", "content", "value"]
            .filter((key) => {
              // Hide 'value' field if it's a Definition or Html node
              if (
                (key === "value" &&
                (selectedNode.type === "Definition" || selectedNode.type === "HTML" || selectedNode.type === "Action")) || selectedNode.type === "Action" && key === "definition"
              ) {
                return false;
              }
              return selectedNode.data[key] !== undefined;
            })
            .map((key) => (
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
            ))}

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
    borderRadius: "10px", // More rounded corners
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)", // Softer shadow for depth
    textAlign: "center",
    width: "350px", // Slightly wider modal
  },
  saveButton: {
    padding: "10px 20px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "6px", // Rounded edges for buttons
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    marginBottom: "10px", // Add spacing between buttons
    transition: "background-color 0.3s ease",
  },
  deleteButton: {
    padding: "10px 20px",
    background: "#FF0000",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    marginBottom: "10px", // Add spacing between buttons
    transition: "background-color 0.3s ease",
  },
  configPanel: {
    position: "fixed", // Center it relative to the viewport
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "white",
    padding: "20px",
    borderRadius: "10px", // More rounded corners
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
    width: "350px", // Slightly wider config panel
    zIndex: 1000,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    fontSize: "14px",
    borderRadius: "6px", // Rounded input corners
    border: "1px solid #e2e8f0",
    boxSizing: "border-box", // Prevent padding from affecting width
    outline: "none",
    transition: "border 0.3s ease",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px", // Add space between buttons
    marginTop: "20px", // Add margin for spacing
  },
  cancel_button: {
    padding: "12px 18px",
    background: "#FF4C4C",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    transition: "background-color 0.3s ease",
  },
  button: {
    padding: "12px 18px",
    background: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    transition: "background-color 0.3s ease",
  },
  label: {
    fontSize: "14px",
    marginBottom: "8px",
    textAlign: "left",
    display: "block",
    color: "#333", // Darker text for better readability
  },
  deleteColumnButton: {
    padding: "8px 14px",
    background: "#FF0000",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginLeft: "10px", // Space between the input and button
  },
  buttonHover: {
    backgroundColor: "#5B9BD5",
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

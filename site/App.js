import React, { useEffect, useRef, useCallback, useState, use } from "react";
import { useFloating } from '@floating-ui/react';
import Console from "./console.js";
import SearchBar from './SearchBar.js';
import FilterBar from './FilterBar.js';
import * as d3 from "d3-force";
import ELK from 'elkjs/lib/elk.bundled.js';
import Dagre from '@dagrejs/dagre';
import init, { main, get_env, send_message_to_server, fetch_dependencies, get_namespace } from "../pkg/meerkat_remote_console_V2.js";
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
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Sidebar from "./Sidebar.js";
import { DnDProvider, useDnD } from "./DnDContext.js";
import VariableNode from "./nodes/Variable.js";
import DefinitionNode from './nodes/Definition.js';
import ActionNode from './nodes/Action.js';
import TableNode from './nodes/Table.js';
import HtmlNode from './nodes/HTML.js';
import ModuleNode from './nodes/Module.js';
import ActionEdge from './edges/ActionEdge.js';
import useStore from './store/store.js';
import { /** @type {NodeType} */ NodeType, /** @type {NodeData} */ NodeData } from "./types.d.ts";

const nodeTypes = {
  Variable: VariableNode,
  Definition: DefinitionNode,
  Action: ActionNode,
  Table: TableNode,
  HTML: HtmlNode,
  Module: ModuleNode,
};

const edgeTypes = {
  action: ActionEdge,
};
let id = 0;
const getId = () => {
  const randomId = Math.floor(Math.random() * 100000);
  return `dndnode_${randomId}`;
};


const DnDFlow = () => {

  const { onNodesChange, environments, onEdgesChange, onConnect, currentEnvId, getCurrentEnv, getEnv, addNode, updateNode, removeNode, addEdge, removeEdge, checkExists, setNodes, setEdges } = useStore();
  const { nodes, edges } = getCurrentEnv(); // Get nodes and edges of the current environment
  const pathStack = useStore((state) => state.pathStack);
  const setEnv = useStore((state) => state.setEnv);
  const [nodeColorFilter, setNodeColorFilter] = useState(() => (node) => node.data?.color || '#333');
  const { getIntersectingNodes } = useReactFlow();
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const [type] = useDnD();

  const { refs, floatingStyles } = useFloating();

  // Local states for node and form management
  const [pendingNode, setPendingNode] = useState(null);
  const [formData, setFormData] = useState({});
  const [editFormData, setEditFormData] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const interval = setInterval(() => {
      // Your repeated logic here
      console.log(useStore.getState().pathStack);

    }, 5000); // 1000 ms = 1 second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  window.update_environment = function (envString) {
    try {
      const env = typeof envString === 'string' ? JSON.parse(envString) : envString;
      console.log("Parsed environment:", env);

      const dependencies = {};
      const nodesToUpdate = [];

      const processModuleCommands = (commands, parentModule = null) => {
        const parsedCommands = typeof commands === "string" ? JSON.parse(commands) : commands;

        for (const [subLabel, subData] of Object.entries(parsedCommands)) {
          const subFullName = subData.name || `${subLabel}@${parentModule}`;
          const [baseLabel, subModuleName] = subFullName.includes("@") ? subFullName.split("@") : [subFullName, null];

          const subNodeDependencies = subData.exp
            ? subData.exp.match(/\b[A-Za-z_]\w*\b/g)?.filter(dep => dep !== subFullName) || []
            : [];

          dependencies[baseLabel] = subNodeDependencies;

          nodesToUpdate.push({
            id: subFullName,
            label: baseLabel,
            value: subData.val,
            type: subData.type,
            definition: subData.keyword === "def" ? subData.exp : undefined,
            moduleName: parentModule,
            position: { x: 0, y: 0 },
            commands: subData.commands // nested modules
          });

          // If this node is a module, recurse
          if (subData.type === "module" && subData.commands) {
            processModuleCommands(subData.commands, baseLabel);
          }
        }
      };

      for (const [label, data] of Object.entries(env)) {
        const {
          name, val, type, exp, keyword, originalInput,
          operation, commands
        } = data;

        // Skip internal/system types
        if (type && type.includes("$")) continue;

        // Handle delete first
        const [baseLabel, moduleNameFromName] = name.includes("@") ? name.split("@") : [name, null];
        if (operation === "delete") {
          removeNode(name);
          continue;
        }

        const fullModuleName = moduleNameFromName || null;
        const isDefinition = keyword === "def";

        // Collect dependencies
        const nodeDependencies = exp
          ? exp.match(/\b[A-Za-z_]\w*\b/g)?.filter(dep => dep !== name) || []
          : [];
        dependencies[baseLabel] = nodeDependencies;

        nodesToUpdate.push({
          id: name,
          label: baseLabel,
          value: val,
          type,
          definition: isDefinition ? exp : undefined,
          moduleName: fullModuleName,
          position: { x: 0, y: 0 },
          commands
        });

        // If module, recursively parse its commands
        if (type === "module" && commands) {
          try {
            processModuleCommands(commands, baseLabel);
          } catch (e) {
            console.warn(`Failed to parse module commands for ${label}`, e);
          }
        }
      }

      const sortedNodes = topologicalSort(nodesToUpdate, dependencies);


      for (const { id, label, value, type, definition, position, moduleName, commands } of sortedNodes) {
        function extractModuleHierarchy(id) {
          const parts = id.split("@");

          if (parts.length === 1) {
            return { envId: "root", parentId: null };
          } else if (parts.length === 2) {
            return { envId: parts[1], parentId: "root" };
          } else {
            return {
              envId: parts[parts.length - 2],
              parentId: parts[parts.length - 1]
            };
          }
        }

        const { envId, parentId } = extractModuleHierarchy(id);
        const nodeType = (() => {
          if (type === "html") return "HTML";
          if (type === "module") return "Module";
          if (type?.includes("action")) return "Action";
          if (definition) return "Definition";
          if (type?.startsWith("array[{") || value?.startsWith("table")) return "Table";
          return "Variable";
        })();

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
            try {
              const parsedRows = JSON.parse(`[${valueMatch[1]}]`.replace(/(\w+):/g, '"$1":'));
              if (Array.isArray(parsedRows)) rows.push(...parsedRows);
            } catch (e) {
              console.warn("Failed to parse table rows from value:", value);
            }
          }

          newNode = {
            id,
            type: "Table",
            position,
            data: { label, columns, rows }
          };

        } else if (nodeType === "Action") {
          newNode = {
            id,
            type: "Action",
            position,
            data: { label, action: definition }
          };

        } else if (nodeType === "Module") {
          newNode = {
            id,
            type: "Module",
            position,
            data: { label, value }
          };
        } else {
          newNode = {
            id,
            type: nodeType,
            position,
            data: { label, value, definition }
          };
        }

        const existing = getCurrentEnv().nodes.find(n => n.id === id);
        if (existing) {
          updateNode(id, newNode.data);
        } else {
          parentId == envId
            ? addNode(newNode, envId)
            : addNode(newNode, envId, parentId);
        }
      }

      // Fetch dependencies
      (async () => {
        for (const node of sortedNodes) {
          try {
            setSelectedNodeId(node.id);
            await fetch_dependencies(node.id);
          } catch (e) {
            console.error(`Error fetching for ${node.id}:`, e);
          }
        }
      })();

    } catch (e) {
      console.error("Failed to parse environment:", e);
    }
  };

  function findNodeById(globalEnvs, nodeId) {
    for (const env of Object.values(globalEnvs)) {
      const found = env.nodes.find((n) => n.id === nodeId);
      if (found) return found;
    }
    return null;
  }

  function findNodeByLabel(globalEnvs, label) {
    for (const env of Object.values(globalEnvs)) {
      const found = env.nodes.find((n) => n.data?.label === label);
      if (found) return found;
    }
    return null;
  }

  window.setupEdges = function (dependencies) {
    const source = selectedNodeId;
    const node = findNodeById(environments, source);
    console.log("Setting up edges for node:", node);
    if (!node) return;
    console.log("Dependencies:", dependencies);
    // 🔧 Extract module ID from node ID (everything except final label)
    const moduleId = source.includes("@")
      ? source.split("@").at(-1)
      : "root";

    if (dependencies.length === 0) {
      console.log("No dependencies found.");

      if ((node.type === "Definition" || node.type === "HTML") && node.data?.definition) {
        const referencedLabels = [
          ...new Set(node.data.definition.match(/\b[A-Za-z_]\w*\b/g) || []),
        ].filter((label) => label !== node.data.label); // avoid self-reference

        edges.forEach((edge) => {
          if (edge.target === source) {
            const sourceNode = findNodeById(environments, source); 
            const sourceLabel = sourceNode?.data?.label; 
            if (sourceLabel && !referencedLabels.includes(sourceLabel)) {
              removeEdge(edge.id, moduleId); 
            }
          }
        });

        referencedLabels.forEach((label) => {
          const sourceNode = findNodeByLabel(environments, label);
          if (sourceNode) {
            const edgeId = `${sourceNode.id}->${source}`;
            if (!edges.find((e) => e.id === edgeId)) {
              addEdge(
                {
                  id: edgeId,
                  source: sourceNode.id,
                  target: source,
                  type: "default",
                  reconnectable: true,
                },
                moduleId 
              );
            }
          }
        });
      }

      if (node.type === "Action" && node.data?.action) {
        const patterns = [
          /([a-zA-Z_]\w*)\s*:=/,
          /insert\s+.+\s+into\s+([a-zA-Z_]\w*)/,
          /update\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+with/,
          /delete\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+where/,
        ];

        let targetLabel = null;
        for (const pattern of patterns) {
          const match = node.data.action.match(pattern);
          if (match) {
            targetLabel = match[1];
            break;
          }
        }

        edges.forEach((edge) => {
          if (edge.source === source && edge.type === "action") {
            const targetNode = findNodeByLabel(environments, targetLabel);
            const targetEdgeLabel = targetNode?.data?.label;
            if (targetEdgeLabel && targetEdgeLabel !== targetLabel) {
              removeEdge(edge.id, moduleId); // 👈 pass moduleId
            }
          }
        });

        if (targetLabel) {
          const targetNode = findNodeByLabel(environments, targetLabel);
          if (targetNode) {
            const edgeId = `${source}->${targetNode.id}`;
            if (!edges.find((e) => e.id === edgeId)) {
              addEdge(
                {
                  id: edgeId,
                  source,
                  target: targetNode.id,
                  type: "action",
                  data: { action: node.data.action },
                  reconnectable: true,
                },
                moduleId // 👈 pass moduleId
              );
            }
          }
        }
      }

      setSelectedNodeId(null);
      return;
    }
    console.log("BRH found:");

    // Handle backend dependency response
    for (const target of dependencies) {
      console.log("Target:", target);
      const targetNode = findNodeById(environments, target);
      console.log("Target node:", targetNode);
      if (!targetNode) continue;

      let id = `${source}->${target}`;

      let type = "default";
      if (moduleId === "User") {
        console.log("Setting up edges for node:", node);

        console.log("Target node:", targetNode);
        console.log(id)

      }
      if (targetNode.type === "Action") {
        id = `${target}->${source}`;
        type = "action";
      }

      if (!edges.find((e) => e.id === id)) {
        addEdge({
          id,
          source: type === "action" ? target : source,
          target: type === "action" ? source : target,
          type,
          data: type === "action" ? { action: targetNode.data.action } : {},
          reconnectable: true,
        }, moduleId); // 👈 pass module
      }
    }

    setSelectedNodeId(null);
  };


  function layoutNodesCircular(nodes, setNodes) {
    const centerX = 0;
    const centerY = 0;

    // Define groups with matching type names
    const groups = {
      HTML: [],
      Variable: [],
      Definition: [],
      Action: [],
      Misc: [],
    };

    // Group nodes based on `node.data.type`
    nodes.forEach((node) => {
      const type = node.data?.type;
      if (type && groups[type]) {
        groups[type].push(node);
      } else {
        groups.Misc.push(node);
      }
    });

    // Order of rings from center outward
    const layerOrder = ["HTML", "Variable", "Definition", "Action", "Misc"];
    const baseRadius = 0;
    const radiusIncrement = 150;

    const placedNodes = [];

    layerOrder.forEach((type, layerIndex) => {
      const layerNodes = groups[type];
      if (layerNodes.length === 0) return;

      const radius = baseRadius + radiusIncrement * layerIndex;
      const angleStep = (2 * Math.PI) / layerNodes.length;

      layerNodes.forEach((node, i) => {
        const angle = i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        placedNodes.push({
          ...node,
          position: { x, y },
        });
      });
    });

    setNodes(placedNodes);
  }





  const getLayoutedElements = (nodes, edges, options) => {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: options.direction });

    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
      g.setNode(node.id, {
        ...node,
        width: node.measured?.width ?? 0,
        height: node.measured?.height ?? 0,
      }),
    );

    Dagre.layout(g);

    return {
      nodes: nodes.map((node) => {
        const position = g.node(node.id);
        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        const x = position.x - (node.measured?.width ?? 0) / 2;
        const y = position.y - (node.measured?.height ?? 0) / 2;

        return { ...node, position: { x, y } };
      }),
      edges,
    };
  };


  const layerButtons = useCallback(() => {

    const newNodes = layoutCircularLayers(nodes, edges);
    setNodes(newNodes);

  });

  const onLayout = useCallback(
    (direction) => {

      const layouted = getLayoutedElements(nodes, edges, { direction });

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);

      fitView();
    },
    [nodes, edges],
  );

  // Helper function: Topological Sort (dependency resolution)
  function topologicalSort(nodes, dependencies) {
    const sorted = [];
    const visited = new Set();
    const tempMark = new Set(); // To detect cycles

    const nodeMap = new Map(); // To store nodes by their id for easy lookup

    // First, organize nodes by module
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // A helper function to visit nodes and resolve dependencies
    function visit(node) {
      if (tempMark.has(node.id)) {
        throw new Error(`Circular dependency detected: ${node.id}`);
      }
      if (!visited.has(node.id)) {
        tempMark.add(node.id);

        // Get node dependencies based on the node's module context
        const nodeDeps = dependencies[node.id] || [];

        // Visit all dependencies of this node
        nodeDeps.forEach(dep => {
          const depNode = nodeMap.get(dep);
          if (depNode) {
            visit(depNode);
          }
        });

        visited.add(node.id);
        tempMark.delete(node.id);
        sorted.push(node);
      }
    }

    // Start visiting all nodes to detect cycles and sort them
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

  const wrapInNestedModules = (message) => {
    const modules = pathStack.slice(1).reverse(); // Exclude 'root' and reverse order

    return modules.reduce((msg, mod) => `@${mod} { ${msg} }`, message);
  };

  const handleSave = () => {
    if (!selectedNode) return;

    let message = '';

    if (selectedNode.type === 'Variable') {
      message = `var ${editFormData.label} = ${editFormData.value}`;
    } else if (selectedNode.type === 'Definition' || selectedNode.type === 'HTML') {
      message = `def ${editFormData.label} = ${editFormData.definition}`;
    } else if (selectedNode.type === 'Table') {
      const { columns } = editFormData;

      if (!columns || columns.length === 0) {
        alert("Table name or columns missing.");
        return;
      }

      const formattedColumns = columns
        .map(col => `${col.name}:${col.type}`)
        .join(", ");

      message = `table ${editFormData.label} { ${formattedColumns} }`;
    } else if (selectedNode.type === 'Action') {
      message = `def ${editFormData.label} = ${editFormData.action}`;
    }

    // Wrap in nested modules if not in root
    const wrappedMessage = wrapInNestedModules(message);
    send_message_to_server(wrappedMessage);

    setSelectedNode(null);
    setEditFormData({});
  };

  const handleDelete = () => {
    let message = 'delete ' + selectedNode.id + '';
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
        Definition: { label: "def1", definition: "", },
        Action: { label: "act", action: "action { var1 :=3}" },
        Table: { label: "tab", columns: [{ name: "", type: "string" }], rows: [] },
        HTML: { label: "pag", definition: "<p>'Enter HTML here'</p>" },
        Module: { label: "mod" },
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

    const newNode = {
      id: formData.label,
      type: pendingNode.type,
      position: pendingNode.position,
      data: { ...formData },
    };

    let message = '';

    switch (pendingNode.type) {
      case 'Variable':
        message = `var ${formData.label} = ${formData.value}`;
        break;
      case 'Definition':
      case 'HTML':
        message = `def ${formData.label} = ${formData.definition}`;
        break;
      case 'Table':
        const { columns } = newNode.data;
        if (!columns || columns.length === 0) {
          alert("Table name or columns missing.");
          return;
        }
        const formattedColumns = columns.map(col => `${col.name}:${col.type}`).join(", ");
        message = `table ${formData.label} { ${formattedColumns} }`;
        break;
      case 'Action':
        message = `def ${formData.label} = ${formData.action}`;
        break;
      case 'Module':
        message = `module ${formData.label} {}`;
        break;
      default:
        console.warn("Unsupported node type:", pendingNode.type);
        return;
    }

    const nestedMessage = currentEnvId === 'root'
      ? message
      : wrapInNestedModules(message);

    console.log("Sending message to server:", nestedMessage);
    send_message_to_server(nestedMessage);

    setPendingNode(null);
    setFormData({});
  };



  const onNodeDoubleClick = (_, node) => {
    setSelectedNode(node);
    setEditFormData(node.data);
  };


  // Function to adjust the size of the Module when a node is added
  const adjustModuleSize = (moduleId, nodeWidth, nodeHeight) => {
    // Find the module by its ID
    const moduleNode = nodes.find(n => n.id === moduleId);

    if (moduleNode) {
      const padding = 20; // Extra padding to add around nodes inside the module
      let newWidth = moduleNode.width || 0;
      let newHeight = moduleNode.height || 0;

      // Increase width if necessary
      if (nodeWidth > newWidth) {
        newWidth = nodeWidth + padding;
      }

      // Increase height if necessary
      if (nodeHeight > newHeight) {
        newHeight = nodeHeight + padding;
      }
      // Update the module node with the new size
      console.log("Updating module node size:", moduleNode.id, newWidth, newHeight);
      updateNode(moduleNode.id, { width: newWidth, height: newHeight });
    }
  };
  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid || connectionState.fromHandle.type === 'target') {
        return;
      }

      const fromNodeId = connectionState.fromNode.id;
      const fromNodeType = connectionState.fromNode.type;
      let id = getId();
      while (nodes.find(node => node.id === id)) {
        id = getId();
      }
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;

      let newNodeType = '';
      let newNodeData = {};
      let edgeType = 'default';
      let action = "Unknown";
      if (fromNodeType === 'Action') {
        newNodeType = 'Variable';
        newNodeData = { label: id, value: "" };
        edgeType = 'action';

        action = connectionState.fromNode.data.action;
        updateNode(fromNodeId, { target: id });
      } else if (fromNodeType === 'Variable') {
        newNodeType = 'Definition';
        newNodeData = { label: id, definition: connectionState.fromNode.data.label };
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
      addNode(newNode, currentEnvId);
      console.log("Adding edge", newEdge)
      if (fromNodeType === 'Action')
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

        <div style={{ flex: 1, border: "1px solid #ccc", borderRadius: "8px" }}>
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
          <div style={{ position: 'absolute', top: 140, left: 280, zIndex: 1000 }}>
            <div style={{ fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ marginRight: 4 }}>@</span>
              {pathStack.map((id, idx) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setEnv(id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3498db',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      padding: 0,
                      marginRight: 4,
                    }}
                  >
                    {id}
                  </button>
                  {idx < pathStack.length - 1 && (
                    <span style={{ color: '#aaa', marginRight: 4 }}>/</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Panel position="top-left">
            <div style={{
              display: "flex",
              gap: "10px",
              background: "#fff",
              padding: "10px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              fontFamily: "Arial, sans-serif"
            }}>

              <button
                onClick={() => onLayout('TB')}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#6A5ACD", // Purple
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Vertical
              </button>
              <button
                onClick={() => onLayout('LR')}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#6A5ACD", // Purple
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Horizontal
              </button>
              <button
                onClick={() => layoutNodesCircular(nodes, setNodes)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#6A5ACD", // Purple
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Layers
              </button>

            </div>

          </Panel>


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
                  {selectedNode.type == "Definition" && <div style={{ marginBottom: "10px" }}>
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

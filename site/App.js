import React, { useEffect, useRef, useCallback, useState, use } from "react";
import { useFloating } from '@floating-ui/react';
import Console from "./console.js";
import SearchBar from './SearchBar.js';
import FilterBar from './FilterBar.js';
import * as d3 from "d3-force";
import ELK from 'elkjs/lib/elk.bundled.js';
import Dagre from '@dagrejs/dagre';
import init, { main, get_env, send_message_to_server, fetch_dependencies, get_usid } from "../pkg/meerkat_remote_console_V2.js";
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

const getId = () => {
  const randomId = Math.floor(Math.random() * 100000);
  return `dndnode_${randomId}`;
};


const DnDFlow = () => {

  const { paramInputs, setParamInput, onNodesChange, environments, onEdgesChange, onConnect, currentEnvId, getCurrentEnv, getEnv, addNode, updateNode, removeNode, addEdge, removeEdge, checkExists, setNodes, setEdges } = useStore();
  const { nodes, edges } = getCurrentEnv(); // Get nodes and edges of the current environment
  const pathStack = useStore((state) => state.pathStack);
  const setEnv = useStore((state) => state.setEnv);
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const [type] = useDnD();
  const handleParamChange = useStore((state) => state.setParamInput);
  const { refs, floatingStyles } = useFloating();
  let usid = localStorage.getItem("usid");
  const namespace = localStorage.getItem("namespace");
  const [selectedTab, setSelectedTab] = useState("Basic");

  // Local states for node and form management
  let varNodes = nodes
    .filter((n) => n.type === "Variable" || n.type === "Table")
    .map((n) => ({
      id: n.id,
      label: n.data?.label,
      type: n.type,
      columns: n.data?.columns || [], // Only applicable to Table nodes
    }));
  const [pendingNode, setPendingNode] = useState(null);
  const [formData, setFormData] = useState({});
  const [editFormData, setEditFormData] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const fetchNodeId = useStore((state) => state.fetchNodeId);
  const setFetchNodeId = useStore((state) => state.setFetchNodeId);
  const { fitView } = useReactFlow();

  const currentNode = findNodeByLabel(environments, currentEnvId);
  const rawParams = currentNode?.data?.params || null;
  let parsedParams = {};
  const layoutRequested = useStore(state => state.layoutRequested);
  const clearLayoutRequest = useStore(state => state.clearLayoutRequest);

  useEffect(() => {
    if (layoutRequested) {
      const timeout = setTimeout(() => {

        fitView()  // or whichever direction you want
        clearLayoutRequest();
      }, 15); // delay by 10 milliseconds (you can tweak this)

      return () => clearTimeout(timeout); // cleanup
    }
    if (!parsedParams) return;
    Object.entries(parsedParams).forEach(([paramName]) => {
      if (paramName.toLowerCase().includes("usid") && paramInputs[paramName] !== `"${usid}"`) {
        handleParamChange(paramName, `"${usid}"`);
      }
    });
  }, [layoutRequested, clearLayoutRequest, parsedParams, usid, paramInputs]);

  useEffect(() => {
    if (!editFormData?.targetNodeId) return;

    const target = varNodes.find((n) => n.id === editFormData.targetNodeId);
    const targetType = target?.type;

    let newActionType = editFormData.actionType;

    if (targetType === "Variable" && newActionType !== "Assign") {
      newActionType = "Assign";
    } else if (targetType === "Table" && !["Insert", "Update", "Delete", "Clear"].includes(newActionType)) {
      newActionType = "Insert";
    }

    if (newActionType !== editFormData.actionType) {
      setEditFormData((prev) => ({
        ...prev,
        actionType: newActionType,
        values: {},
        condition: "",
        expression: "",
      }));
    }
  }, [editFormData.targetNodeId]);
  try {

    parsedParams = typeof rawParams === "string" ? JSON.parse(rawParams) : rawParams;
  } catch (e) {
    console.error("Invalid params format:", rawParams);
  }
  useEffect(() => {
    const interval = setInterval(() => {




     // console.log("namespace:", nodes);


    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function checkUsid() {

    if (!usid) {
      const raw = await get_usid();
      try {
        const parsed = JSON.parse(raw); // => { result: "\"yyuxcvthlkaq136b3rfw0nt5k\"" }
        usid = JSON.parse(parsed.result); // => "yyuxcvthlkaq136b3rfw0nt5k"
      } catch (e) {
        console.error("Failed to parse USID response:", e);
        usid = "unknown";
      }

      localStorage.setItem("usid", usid);
      console.log("New usid set: ", usid);
    }

  }
  window.update_environment = function (envString) {
    try {
      const env = typeof envString === 'string' ? JSON.parse(envString) : envString;
      console.log("Parsed environment:", env);
      checkUsid();
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
            commands: subData.commands, // nested modules
            params: subData.params
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
          operation, commands, params
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
          commands,
          params
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

      console.log(sortedNodes)
      for (const { id, label, value, type, definition, position, moduleName, commands, params } of sortedNodes) {
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
          if (type?.startsWith("array[{") || value?.startsWith("table")) return "Table";
          if (type?.includes("action")) return "Action";
          if (definition) return "Definition";

          return "Variable";
        })();

        let newNode;

        function parseParamValueOutput(input) {
          if (!input || typeof input !== "string") return null;

          const result = [];

          // Updated regex:
          // Match (param:"value") or (param:value) followed by -> output (with or without semicolon)
          const regex = /\(\s*(\w+):\s*(?:"(.*?)"|([^\s")]+))\s*\)\s*->\s*([^;]+);?/g;

          let match;
          while ((match = regex.exec(input)) !== null) {
            const param = match[1];
            const quotedValue = match[2];
            const unquotedValue = match[3];
            const output = match[4];

            result.push({
              param,
              value: quotedValue !== undefined ? `"${quotedValue}"` : unquotedValue,
              output: output.trim() + ';', // always add semicolon to keep consistent
            });
          }

          return result.length > 0 ? result : null;
        }






        const parsedValue = parseParamValueOutput(value);
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


          const paramTables = {};

          try {
            const tableText = value?.trim();
            const regex = /\(\s*(\w+):\s*(.+?)\s*\)\s*->\s*(\[[^\]]*\])/g;
            let match;
            let matchedAny = false;

            while ((match = regex.exec(tableText)) !== null) {
              matchedAny = true;
              const paramKey = `${match[2]}`; // e.g. "usid:1311..."
              const jsonArray = match[3]
                .replace(/(\w+):/g, '"$1":') // ensure object keys are quoted
                .replace(/'/g, '"'); // fix single quotes if any

              try {

                const parsedRows = JSON.parse(jsonArray);
                if (Array.isArray(parsedRows)) {
                  paramTables[paramKey] = parsedRows;
                }
              } catch (err) {
                console.warn("Could not parse rows for param:", paramKey, err);
              }
            }

            // Fallback: old table format (e.g. table[{...}])

            if (!matchedAny && tableText?.startsWith("table[")) {
              const valuePattern = /^table\[(.+)\]$/;
              const valueMatch = tableText.match(valuePattern);
              if (valueMatch) {
                
                const jsonRows = `[${valueMatch[1]}]`.replace(/(\w+):/g, '"$1":');
                const parsedRows = JSON.parse(jsonRows);
                if (Array.isArray(parsedRows)) {
                  paramTables["Default"] = parsedRows;
                }
              }

            } else if (!matchedAny && tableText?.startsWith("[")) {
              try {
                // Preprocess to quote keys and stringify any non-JSON-safe values
                const jsonSafeText = tableText
                  // Quote all unquoted object keys
                  .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
                  // Stringify any value that looks like a function or complex expression (e.g., contains `=>` or `{}`)
                  .replace(/:\s*((\([^)]*\)\s*=>\s*)?action\s*{[^}]*})/g, (match, val) => {
                    return `: "${val.replace(/"/g, '\\"')}"`;
                  });

                const parsed = JSON.parse(jsonSafeText);
                if (Array.isArray(parsed)) {
                  paramTables["Default"] = parsed;
                }
              } catch (err) {
                console.error("Failed to parse raw array-like table:", err);
              }
            }
          } catch (e) {
            console.warn("Failed to parse table:", e);
          }

          newNode = {
            id,
            type: "Table",
            position,
            data: {
              label,
              columns,
              paramTables,
              moduleName,
              parsedValue,

            },
          };

        } else if (nodeType === "Action") {
          newNode = {
            id,
            type: "Action",
            position,
            data: { label, action: definition, value: value, parsedValue, moduleName }
          };

        } else if (nodeType === "Module") {

          newNode = {
            id,
            type: "Module",
            position,
            data: { label, value, params }
          };


        } else {
          newNode = {
            id,
            type: nodeType,
            position,
            data: { label, value, definition, parsedValue, moduleName }
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

    if (!node) return;

    //  Extract module ID from node ID (everything except final label)
    const moduleId = source.includes("@")
      ? source.split("@").at(-1)
      : "root";

    if (dependencies.length === 0) {


      if ((node.type === "Definition" || node.type === "HTML") && node.data?.definition) {
        const referencedLabels = [
          ...new Set(node.data.definition.match(/\b[A-Za-z_]\w*\b/g) || []),
        ].filter((label) => label !== node.data.label); // avoid self-reference

        edges.forEach((edge) => {
          if (edge.target === source) {
            const fromNode = findNodeById(environments, edge.source);
            const fromLabel = fromNode?.data?.label;

            // Only remove the edge if it's not actually referenced
            if (fromLabel && !referencedLabels.includes(fromLabel)) {
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
              removeEdge(edge.id, moduleId); //  pass moduleId
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
                moduleId //  pass moduleId
              );
            }
          }
        }
      }

      setSelectedNodeId(null);
      return;
    }


    // Handle backend dependency response
    for (const target of dependencies) {

      const targetNode = findNodeById(environments, target);

      if (!targetNode) continue;

      let id = `${source}->${target}`;

      let type = "default";

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
        }, moduleId); //  pass module
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

    switch (selectedNode.type) {
      case 'Variable':
        message = `var ${editFormData.label} = ${editFormData.value}`;
        break;

      case 'Definition':
        if (editFormData.definitionType === "Expression") {
          message = `def ${editFormData.label} = ${editFormData.definition}`;
        } else if (editFormData.definitionType === "Size") {
          message = `def ${editFormData.label} = foreach(x in ${editFormData.targetNodeLabel} with y = 0) y + 1`;
        } else if (editFormData.definitionType === "Mapping") {
          const mappingEntries = (editFormData.mappings || []).map((pair) => {
            const isColumn = varNodes
              .find((n) => n.id === editFormData.targetNodeId)
              ?.columns?.some((col) => col.name === pair.column);

            const mappedValue = isColumn ? `r.${pair.column}` : pair.column;
            return `${pair.alias}: ${mappedValue}`;
          });

          message = `def ${editFormData.label} = map( r in ${editFormData.targetNodeLabel}) { ${mappingEntries.join(", ")} }`;
        }
        break;

      case 'HTML':
        message = `def ${editFormData.label} = ${editFormData.definition}`;
        break;

      case 'Table':
        const { columns } = editFormData;
        if (!columns || columns.length === 0) {
          alert("Table name or columns missing.");
          return;
        }
        const formattedColumns = columns.map(col => `${col.name}:${col.type}`).join(", ");
        message = `table ${editFormData.label} { ${formattedColumns} }`;
        break;

      case 'Action':
        if (selectedTab == "Advanced") {
          send_message_to_server(`def ${editFormData.label} = ${editFormData.action} `)
          setSelectedNode(null);
          setEditFormData({});
          setSelectedTab("Basic");
          return;
        }
        const paramNames = [];
        const formattedValues = Object.entries(editFormData.values || {})
          .map(([key, val]) => {
            let trimmed = String(val).trim();

            if (trimmed.startsWith('""') && trimmed.endsWith('""')) {
              trimmed = `"${trimmed.slice(2, -2)}"`;
            }

            if (trimmed.startsWith("in")) {
              paramNames.push(trimmed);
            }

            return `${key}: ${trimmed}`;
          })
          .join(", ");

        let condition = editFormData.condition || "";

        if (condition) {
          const matches = condition.match(/\bin\w+\b/g);
          if (matches) paramNames.push(...matches);

          const targetLabelRegex = new RegExp(`\\b${editFormData.targetNodeLabel}\\b`, "g");
          condition = condition.replace(targetLabelRegex, "a");
        }

        const paramList = paramNames.join(" ");

        if (editFormData.actionType === "Assign") {
          message = `def ${editFormData.label} = action { ${editFormData.targetNodeLabel} := ${editFormData.expression}}`;
        } else if (editFormData.actionType === "Insert") {
          message = `def ${editFormData.label}${paramList ? ` ${paramList}` : ""} = action { insert {${formattedValues}} into ${editFormData.targetNodeLabel}}`;
        } else if (editFormData.actionType === "Update") {
          message = `def ${editFormData.label}${paramList ? ` ${paramList}` : ""} = action { update a in ${editFormData.targetNodeLabel} with {${formattedValues}} where ${condition} }`;
        } else if (editFormData.actionType === "Delete") {
          message = `def ${editFormData.label}${paramList ? ` ${paramList}` : ""} = action { delete a in ${editFormData.targetNodeLabel} where ${condition}}`;
        } else {
          message = `def ${editFormData.label} = action { ${editFormData.targetNodeLabel} := [] }`;
        }
        break;

      case 'Module':
        message = `module ${editFormData.label} {}`;
        break;

      default:
        console.warn("Unsupported node type:", selectedNode.type);
        return;
    }

    const wrappedMessage = currentEnvId === 'root'
      ? message
      : wrapInNestedModules(message);

    send_message_to_server(wrappedMessage);

    setSelectedNode(null);
    setEditFormData({});
    
  };


  const handleDelete = () => {
    if (!selectedNode) return;
    let message = 'delete ' + selectedNode.id + '';
    send_message_to_server(message);

    //removeNode(selectedNode.id);
    setSelectedNode(null); // Close modal
    setEditFormData({}); // Reset form
    setSelectedTab("Basic")
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


      const defaultData = {
        Variable: { label: "var1", value: 1 },
        Definition: { label: "def1", definition: "", },
        Action: {
          label: "",
          actionType: "",
          targetNodeId: "",
          values: {},     // For Insert/Update
          condition: "",
          // For Update/Delete
        },
        Table: { label: "tab", columns: [{ name: "", type: "string" }], rows: [] },
        HTML: { label: "page", definition: "<p>'Enter HTML here'</p>" },
        Module: { label: "mod<type param>*" },
      };

      setFormData(defaultData[type] || { label: "" });
    },
    [screenToFlowPosition, type]
  );


  const handleEditCancel = () => {
    setSelectedNode(null);
    setEditFormData({});
    setSelectedTab("Basic")
  };

  const handleFetchAllValues = () => {
    const values = Object.values(paramInputs).map(val => `${val}`).join(" ");

    for (const node of nodes) {

      send_message_to_server(`${node.id} ${values}`);
    }
  };
  const handleFetchValue = () => {
    const values = Object.values(paramInputs).map(val => `${val}`).join(" ");


    send_message_to_server(`${fetchNodeId} ${values}`);
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
    console.log(newNode)

    let message = '';

    switch (pendingNode.type) {
      case 'Variable':
        message = `var ${formData.label} = ${formData.value}`;
        break;
      case 'Definition':
        console.log(formData)
        if (formData.definitionType == "Expression") {
          message = `def ${formData.label} = ${formData.definition}`;
        } else if (formData.definitionType == "Size") {
          message = `def ${formData.label} = foreach(x in ${formData.targetNodeLabel} with y = 0) y + 1`;
        } else if (formData.definitionType == "Mapping") {
          console
          const mappingEntries = (formData.mappings || []).map((pair) => {
            const isColumn = varNodes
              .find((n) => n.id === formData.targetNodeId)
              ?.columns?.some((col) => col.name === pair.column);

            const mappedValue = isColumn ? `r.${pair.column}` : pair.column;
            return `${pair.alias}: ${mappedValue}`;
          });

          message = `def ${formData.label} = map( r in ${formData.targetNodeLabel}) { ${mappingEntries.join(", ")}}`;
        }
        console.log(message)

        break;
      case 'HTML':
        // message = `def ${formData.label} = ${formData.definition}`;

        message = `def ${formData.label} = <div class="template1" id="${formData.label}"><h3 class="main-title">"${formData.label}"</h3></div>`;
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
        if (selectedTab == "Advanced") {
          send_message_to_server(`def ${formData.label} = ${formData.action} `)
          setPendingNode(null);
          setFormData({});
          setSelectedTab("Basic")
          return;
        }
        const paramNames = [];
        const formattedValues = Object.entries(formData.values || {})
          .map(([key, val]) => {
            let trimmed = String(val).trim();

            // If surrounded by double-double quotes, unwrap to single quoted
            if (trimmed.startsWith('""') && trimmed.endsWith('""')) {
              trimmed = `"${trimmed.slice(2, -2)}"`;
            }

            // Track parameters if they start with "in"
            if (trimmed.startsWith("in")) {
              paramNames.push(trimmed);
            }

            return `${key}: ${trimmed}`;
          })
          .join(", ");

        let condition = formData.condition || "";

        // Extract params from condition
        if (condition) {

          const matches = condition.match(/\bin\w+\b/g);
          if (matches) paramNames.push(...matches);

          // Replace targetNodeLabel with alias 'a' in the condition
          const targetLabelRegex = new RegExp(`\\b${formData.targetNodeLabel}\\b`, "g");
          condition = condition.replace(targetLabelRegex, "a");
        }

        const paramList = paramNames.join(" ");

        if (formData.actionType === "Assign") {
          message = `def ${formData.label} = action { ${formData.targetNodeLabel} := ${formData.expression}}`;

        } else if (formData.actionType === "Insert") {
          message = `def ${formData.label}${paramList ? ` ${paramList}` : ""} = action { insert {${formattedValues}} into ${formData.targetNodeLabel}}`;

        } else if (formData.actionType === "Update") {
          message = `def ${formData.label}${paramList ? ` ${paramList}` : ""} = action { update a in ${formData.targetNodeLabel} with {${formattedValues}} where ${condition} }`;

        } else if (formData.actionType === "Delete") {
          message = `def ${formData.label}${paramList ? ` ${paramList}` : ""} = action { delete a in ${formData.targetNodeLabel} where ${condition}}`;

        } else {
          message = `def ${formData.label} = action { ${formData.targetNodeLabel} := [] }`;
        }
        console.log(message)
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

    console.log(message)
    send_message_to_server(nestedMessage);

    setPendingNode(null);
    setFormData({});
  };



  const onNodeDoubleClick = (_, node) => {
    setSelectedNode(node);
    setEditFormData(node.data);
  };
  const onNodeClick = (_, node) => {

    setFetchNodeId(node.id);

  }
  const onPaneClick = (_, event) => {
    setFetchNodeId(null)
  }

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

        message = `var ${newNodeData.label} = ${newNodeData.value}`;

        send_message_to_server(message);
      } else if (newNodeType === 'Definition') {

        message = `def ${newNodeData.label} = ${newNodeData.definition}`;

        send_message_to_server(message);
      }
      // Update nodes and edges
      addNode(newNode, currentEnvId);

      if (fromNodeType === 'Action')
        addEdge(newEdge);

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
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '20px',
        backgroundColor: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#333',
        zIndex: 1000,
        display: 'flex',
        gap: '12px',
      }}>
        <div><strong>Namespace:</strong> {namespace}</div>
        <div><strong>USID:</strong> {usid}</div>
      </div>
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

            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd}
            onDrop={onDrop}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onPaneClick={onPaneClick}
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
            {(currentEnvId !== "root" && findNodeByLabel(environments, currentEnvId).data.params) && (
              <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '15px',
                backgroundColor: '#fff',
                padding: '10px 12px',
                borderRadius: '8px',
                boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#333',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 1000,
                width: '220px',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Module {currentEnvId}</div>

                {
                  Object.entries(parsedParams).map(([paramName, paramType]) => (
                    <input
                      key={paramName}
                      type="text"
                      placeholder={` ${paramName} (${paramType})`}
                      value={paramInputs[paramName] || ""}
                      onChange={(e) => handleParamChange(paramName, e.target.value)}
                      style={{
                        padding: "6px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        fontSize: "14px",
                      }}
                    />
                  ))}


                <button
                  onClick={() => handleFetchAllValues(paramInputs)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#00bcd4",
                    color: "white",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  Fetch All Node Values
                </button>

                <button
                  onClick={() => handleFetchValue(paramInputs)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#00bcd4",
                    color: "white",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  Fetch Selected Node Value
                </button>
              </div>
            )}


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
            {/* Tab Navigation */}


            {pendingNode.type === "Table" ? (
              <>
                {/* Table Name Input */}
                <label style={{ display: "block", marginBottom: "10px" }}>
                  Table Name:
                  <input
                    value={formData.label || ""}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    style={styles.input}
                    required
                  />
                </label>

                <h4>Columns:</h4>
                {formData.columns.map((col, index) => (
                  <div key={index} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <input
                      placeholder="Column Name"
                      value={col.name || ""}
                      onChange={(e) => handleColumnChange(index, "name", e.target.value)}
                      style={styles.input}
                    />
                    <select
                      value={col.type || "string"}
                      onChange={(e) => handleColumnChange(index, "type", e.target.value)}
                      style={styles.input}
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    <button onClick={() => handleDeleteColumn(index)} style={styles.deleteButton}>
                      ✖
                    </button>
                  </div>
                ))}
                <button onClick={handleAddColumn} style={styles.button}>
                  + Add Column
                </button>
              </>
            ) : pendingNode.type === "Action" ? (
              <>
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  {["Basic", "Advanced"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      style={{
                        padding: "5px 10px",
                        borderTop: "none",
                        borderLeft: "none",
                        borderRight: "none",
                        borderBottom: selectedTab === tab ? "2px solid black" : "1px solid transparent",
                        fontWeight: selectedTab === tab ? "bold" : "normal",
                        backgroundColor: "transparent", // safer than "none"
                        color: "#000", // ensure text is visible
                        cursor: "pointer",
                        outline: "none",
                      }}

                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <label style={{ display: "block", marginBottom: "10px" }}>
                    Action Name:
                    <input
                      value={formData.label || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder="Name your Action"
                      style={styles.input}
                    />
                  </label>
                {selectedTab === "Advanced" && (
                  <>
                  Definition:
                    <textarea
                      value={formData.action || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, action: e.target.value });

                        // Auto-grow the textarea
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      placeholder="Define your Action"
                      style={{
                        ...styles.input,
                        resize: "none",       // prevent manual resizing
                        overflow: "hidden",   // hide scrollbars
                        minHeight: "40px",    // starting height
                      }}
                      required
                    />
                  </>
                )}

                {selectedTab === "Basic" && (
                  <>
                    {/* Target Node Dropdown */}
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Target Node:
                      <select
                        value={formData.targetNodeId || ""}
                        onChange={(e) => {
                          const newTargetId = e.target.value;
                          const target = varNodes.find((n) => n.id === newTargetId);
                          const targetType = target?.type;

                          let newActionType = formData.actionType;
                          if (targetType === "Variable" && newActionType !== "Assign") {
                            newActionType = "Assign";

                          } else if (targetType === "Table") {
                            newActionType = "Insert";
                          }

                          setFormData({
                            ...formData,
                            targetNodeId: newTargetId,
                            targetNodeLabel: target?.label,
                            actionType: newActionType,
                            values: {},
                            condition: "",
                            expression: "",
                          });
                        }}
                        style={styles.input}
                      >
                        <option value="">-- Select Target --</option>
                        {varNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.label} ({node.type})
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Action Type Dropdown */}
                    {formData.targetNodeId && (
                      <label style={{ display: "block", marginBottom: "10px" }}>
                        Action Type:
                        <select
                          value={formData.actionType}
                          onChange={(e) =>
                            setFormData({ ...formData, actionType: e.target.value, values: {} })
                          }
                          style={styles.input}
                        >
                          {(() => {
                            const targetType = varNodes.find(n => n.id === formData.targetNodeId)?.type;
                            if (targetType === "Variable") {
                              return <option value="Assign">Assign</option>;
                            }
                            if (targetType === "Table") {
                              return ["Insert", "Update", "Delete", "Clear"].map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ));
                            }
                            return null;
                          })()}
                        </select>
                      </label>
                    )}

                    {/* Additional Fields */}
                    {(() => {
                      const targetNode = varNodes.find((n) => n.id === formData.targetNodeId);
                      const isTable = targetNode?.type === "Table";
                      const columns = targetNode?.columns || [];

                      switch (formData.actionType) {
                        case "Insert":
                        case "Update":
                          return (
                            <>
                              <h4>Values:</h4>
                              {columns.map((col, idx) => (
                                <label key={idx} style={{ display: "block", marginBottom: "10px" }}>
                                  {col.name}:
                                  <input
                                    value={formData.values?.[col.name] || ""}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        values: {
                                          ...formData.values,
                                          [col.name]: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="To use params, start with in (e.g. inParam)"
                                    style={styles.input}
                                  />
                                </label>
                              ))}
                              {formData.actionType === "Update" && (
                                <label style={{ display: "block", marginBottom: "10px" }}>
                                  <h4>Condition:</h4>
                                  <input
                                    value={formData.condition || ""}
                                    onChange={(e) =>
                                      setFormData({ ...formData, condition: e.target.value })
                                    }
                                    placeholder="Condition to update table entries"
                                    style={styles.input}
                                  />
                                </label>
                              )}
                            </>
                          );
                        case "Delete":
                          return (
                            <label style={{ display: "block", marginBottom: "10px" }}>
                              <h4>Condition:</h4>
                              <input
                                value={formData.condition || ""}
                                onChange={(e) =>
                                  setFormData({ ...formData, condition: e.target.value })
                                }
                                placeholder="Condition to delete table entries"
                                style={styles.input}
                              />
                            </label>
                          );
                        case "Clear":
                          return <p>This action will clear all rows in the target table.</p>;
                        case "Assign":
                          return (
                            <label style={{ display: "block", marginBottom: "10px" }}>
                              Expression:
                              <input
                                value={formData.expression || ""}
                                placeholder="Changes to make (e.g. varName +1)"
                                onChange={(e) =>
                                  setFormData({ ...formData, expression: e.target.value })
                                }
                                style={styles.input}
                              />
                            </label>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </>
                )}
              </>

            ) : pendingNode.type === "Definition" ? (
              <>

                <label style={{ display: "block", marginBottom: "10px" }}>
                  Definition Name:
                  <input
                    value={formData.label || ""}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Name your Definition"
                    style={styles.input}
                    required
                  />
                </label>
                <label style={{ display: "block", marginBottom: "10px" }}>
                  Definition Type:
                  <select
                    value={formData.definitionType || "Default"}
                    onChange={(e) => setFormData({ ...formData, definitionType: e.target.value })}
                    style={styles.input}
                  >
                    <option value="Default">--Select Type--</option>
                    <option value="Expression">Expression</option>
                    <option value="Size">Size</option>
                    <option value="Mapping">Mapping</option>
                  </select>
                </label>

                {/* Expression */}
                {formData.definitionType === "Expression" && (
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    Expression:
                    <input
                      value={formData.expression || ""}
                      onChange={(e) => setFormData({ ...formData, expression: e.target.value })}
                      placeholder="Write an expression"
                      style={styles.input}
                    />
                  </label>
                )}

                {/* Size */}
                {formData.definitionType === "Size" && (
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    Target:
                    <select
                      value={formData.targetNodeId || ""}
                      onChange={(e) => {
                        const newTarget = varNodes.find((n) => n.id === e.target.value);
                        setFormData({
                          ...formData,
                          targetNodeId: e.target.value,
                          targetNodeLabel: newTarget?.label,
                        });
                      }}
                      style={styles.input}
                    >
                      <option value="">-- Select Target --</option>
                      {varNodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.label} ({node.type})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {/* Mapping */}
                {formData.definitionType === "Mapping" && (
                  <>
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Target:
                      <select
                        value={formData.targetNodeId || ""}
                        onChange={(e) => {
                          const target = varNodes.find((n) => n.id === e.target.value);
                          setFormData({
                            ...formData,
                            targetNodeId: e.target.value,
                            targetNodeLabel: target?.label,
                            mappings: [], // Reset mappings on target change
                          });
                        }}
                        style={styles.input}
                      >
                        <option value="">-- Select Target --</option>
                        {varNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.label} ({node.type})
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* Mapping entries */}
                    {formData.mappings?.map((pair, idx) => (
                      <div
                        key={idx}
                        style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}
                      >
                        <input
                          placeholder="Alias (e.g. x)"
                          value={pair.alias || ""}
                          onChange={(e) => {
                            const updated = [...formData.mappings];
                            updated[idx].alias = e.target.value;
                            setFormData({ ...formData, mappings: updated });
                          }}
                          style={styles.input}
                        />
                        <select
                          value={pair.column || ""}
                          onChange={(e) => {
                            const updated = [...formData.mappings];
                            updated[idx].column = e.target.value;
                            setFormData({ ...formData, mappings: updated });
                          }}
                          style={styles.input}
                        >
                          <option value="">-- Select Column or Expression --</option>

                          <optgroup label="Attributes">
                            {varNodes
                              .find((n) => n.id === formData.targetNodeId)
                              ?.columns?.map((col) => (
                                <option key={col.name} value={col.name}>
                                  {col.name}
                                </option>
                              ))}
                          </optgroup>

                          <optgroup label="Expressions">
                            {nodes
                              .filter((n) => n.id !== formData.targetNodeId)
                              .map((node) => (
                                <option key={node.id} value={node.data.label}>
                                  {node.data.label} ({node.type})
                                </option>
                              ))}
                          </optgroup>
                        </select>
                        <button
                          onClick={() => {
                            const updated = [...formData.mappings];
                            updated.splice(idx, 1);
                            setFormData({ ...formData, mappings: updated });
                          }}
                          style={styles.deleteButton}
                        >
                          ✖
                        </button>
                      </div>
                    ))}

                    {/* Add new mapping */}
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          mappings: [...(formData.mappings || []), { alias: "", column: "" }],
                        })
                      }
                      style={styles.button}
                    >
                      + Add Mapping
                    </button>
                  </>
                )}
              </>
            ) : (
              // Default form fallback
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

            {/* Confirm / Cancel Buttons */}
            <div style={styles.buttonContainer}>
              <button onClick={() =>{ setPendingNode(null)
                setSelectedTab("Basic")
              }} style={styles.cancel_button}>
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
              ) : selectedNode.type === "Action" ? (
                <>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    {["Basic", "Advanced"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        style={{
                          padding: "5px 10px",
                          borderTop: "none",
                          borderLeft: "none",
                          borderRight: "none",
                          borderBottom: selectedTab === tab ? "2px solid black" : "1px solid transparent",
                          fontWeight: selectedTab === tab ? "bold" : "normal",
                          backgroundColor: "transparent", // safer than "none"
                          color: "#000", // ensure text is visible
                          cursor: "pointer",
                          outline: "none",
                        }}

                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  
                  {/* Action Name */}
                  
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    Action Name:
                    <input
                      value={editFormData.label || ""}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, label: e.target.value })
                      }
                      placeholder="Name your Action"
                      style={styles.input}
                    />
                  </label>
                  {selectedTab === "Advanced" && (
                    <>
                    Definition:
                      <textarea
                        value={editFormData.action || ""}
                        onChange={(e) => {
                          setEditFormData({ ...editFormData, action: e.target.value });

                          // Auto-grow the textarea
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        placeholder="Define your Action"
                        style={{
                          ...styles.input,
                          resize: "none",       // prevent manual resizing
                          overflow: "hidden",   // hide scrollbars
                          minHeight: "40px",    // starting height
                        }}
                        required
                      />
                    </>
                  )}
                   {selectedTab === "Basic" && (
                    <>
                  {/* Target Node Dropdown */}
                  <label style={styles.label}>
                    Target Node:
                    <select
                      value={editFormData.targetNodeId || ""}
                      onChange={(e) => {
                        const newTargetId = e.target.value;
                        const target = varNodes.find((n) => n.id === newTargetId);

                        setEditFormData((prev) => ({
                          ...prev,
                          targetNodeId: newTargetId,
                          targetNodeLabel: target?.label,
                        }));
                      }}
                      style={styles.input}
                    >
                      <option value="">-- Select Target --</option>
                      {varNodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.label} ({node.type})
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Action Type Dropdown */}
                  {editFormData.targetNodeId && (
                    <label style={styles.label}>
                      Action Type:
                      <select
                        value={editFormData.actionType}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, actionType: e.target.value, values: {} })
                        }
                        style={styles.input}
                      >
                        {(() => {
                          const targetType = varNodes.find(n => n.id === editFormData.targetNodeId)?.type;

                          if (targetType === "Variable") {
                            return <option value="Assign">Assign</option>;
                          }
                          if (targetType === "Table") {
                            return ["Manual", "Insert", "Update", "Delete", "Clear"].map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ));
                          }
                          return null;
                        })()}
                      </select>
                    </label>
                  )}

                  {/* Values / Condition / Expression Based on Action Type */}
                  {(() => {
                    const targetNode = varNodes.find((n) => n.id === editFormData.targetNodeId);
                    const columns = targetNode?.columns || [];

                    switch (editFormData.actionType) {
                      case "Insert":
                      case "Update":
                        return (
                          <>
                            <h4>Values:</h4>
                            {columns.map((col, idx) => (
                              <label key={idx} style={styles.label}>
                                {col.name}:
                                <input
                                  value={editFormData.values?.[col.name] || ""}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      values: {
                                        ...editFormData.values,
                                        [col.name]: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder='To use params, start with "in" (e.g. inParam)'
                                  style={styles.input}
                                />
                              </label>
                            ))}
                            {editFormData.actionType === "Update" && (
                              <label style={styles.label}>
                                <h4>Condition:</h4>
                                <input
                                  value={editFormData.condition || ""}
                                  onChange={(e) =>
                                    setEditFormData({ ...editFormData, condition: e.target.value })
                                  }
                                  placeholder="Condition to update table entries"
                                  style={styles.input}
                                />
                              </label>
                            )}
                          </>
                        );
                      case "Delete":
                        return (
                          <label style={styles.label}>
                            <h4>Condition:</h4>
                            <input
                              value={editFormData.condition || ""}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, condition: e.target.value })
                              }
                              placeholder="Condition to delete table entries"
                              style={styles.input}
                            />
                          </label>
                        );
                      case "Clear":
                        return <p>This action will clear all rows in the target table.</p>;
                      case "Assign":
                        return (
                          <label style={styles.label}>
                            Expression:
                            <input
                              value={editFormData.expression || ""}
                              placeholder="Changes to make (e.g. variable + 1)"
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, expression: e.target.value })
                              }
                              style={styles.input}
                            />
                          </label>
                        );
                      default:
                        return null;
                    }
                  })()}
                </>)}
                </>
              ) : selectedNode.type === "Definition" ? (
                <>
                  <div style={{ marginBottom: "10px" }}>
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
                  </div>
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    Definition Name:
                    <input
                      value={editFormData.label || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, label: e.target.value })}
                      placeholder="Name your Definition"
                      style={styles.input}
                      required
                    />
                  </label>
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    Definition Type:
                    <select
                      value={editFormData.definitionType || "Default"}
                      onChange={(e) => setEditFormData({ ...editFormData, definitionType: e.target.value })}
                      style={styles.input}
                    >
                      <option value="Default">--Select Type--</option>
                      <option value="Expression">Expression</option>
                      <option value="Size">Size</option>
                      <option value="Mapping">Mapping</option>
                    </select>
                  </label>

                  {/* Expression */}
                  {editFormData.definitionType === "Expression" && (
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Expression:
                      <input
                        value={editFormData.definition || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, definition: e.target.value })}
                        placeholder="Write an expression"
                        style={styles.input}
                      />
                    </label>
                  )}

                  {/* Size */}
                  {editFormData.definitionType === "Size" && (
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      Target:
                      <select
                        value={editFormData.targetNodeId || ""}
                        onChange={(e) => {
                          const newTarget = varNodes.find((n) => n.id === e.target.value);
                          setEditFormData({
                            ...editFormData,
                            targetNodeId: e.target.value,
                            targetNodeLabel: newTarget?.label,
                          });
                        }}
                        style={styles.input}
                      >
                        <option value="">-- Select Target --</option>
                        {varNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.label} ({node.type})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Mapping */}
                  {editFormData.definitionType === "Mapping" && (
                    <>
                      <label style={{ display: "block", marginBottom: "10px" }}>
                        Target:
                        <select
                          value={editFormData.targetNodeId || ""}
                          onChange={(e) => {
                            const target = varNodes.find((n) => n.id === e.target.value);
                            setEditFormData({
                              ...editFormData,
                              targetNodeId: e.target.value,
                              targetNodeLabel: target?.label,
                              mappings: [], // Reset mappings on target change
                            });
                          }}
                          style={styles.input}
                        >
                          <option value="">-- Select Target --</option>
                          {varNodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.label} ({node.type})
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* Mapping entries */}
                      {editFormData.mappings?.map((pair, idx) => (
                        <div
                          key={idx}
                          style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}
                        >
                          <input
                            placeholder="Alias (e.g. x)"
                            value={pair.alias || ""}
                            onChange={(e) => {
                              const updated = [...editFormData.mappings];
                              updated[idx].alias = e.target.value;
                              setEditFormData({ ...editFormData, mappings: updated });
                            }}
                            style={styles.input}
                          />
                          <select
                            value={pair.column || ""}
                            onChange={(e) => {
                              const updated = [...editFormData.mappings];
                              updated[idx].column = e.target.value;
                              setEditFormData({ ...editFormData, mappings: updated });
                            }}
                            style={styles.input}
                          >
                            <option value="">-- Select Column or Expression --</option>

                            <optgroup label="Attributes">
                              {varNodes
                                .find((n) => n.id === editFormData.targetNodeId)
                                ?.columns?.map((col) => (
                                  <option key={col.name} value={col.name}>
                                    {col.name}
                                  </option>
                                ))}
                            </optgroup>

                            <optgroup label="Expressions">
                              {nodes
                                .filter((n) => n.id !== editFormData.targetNodeId)
                                .map((node) => (
                                  <option key={node.id} value={node.data.label}>
                                    {node.data.label} ({node.type})
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <button
                            onClick={() => {
                              const updated = [...editFormData.mappings];
                              updated.splice(idx, 1);
                              setEditFormData({ ...editFormData, mappings: updated });
                            }}
                            style={styles.deleteButton}
                          >
                            ✖
                          </button>
                        </div>
                      ))}

                      {/* Add new mapping */}
                      <button
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            mappings: [...(editFormData.mappings || []), { alias: "", column: "" }],
                          })
                        }
                        style={styles.button}
                      >
                        + Add Mapping
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>


                  {/* Generic Editing for Other Node Types */}
                  {["label", "definition", "action", "content", "value"]
                    .filter((key) => {
                      if (
                        (key === "value" &&
                          (selectedNode.type === "Definition" ||
                            selectedNode.type === "HTML" ||
                            selectedNode.type === "Action")) ||
                        (selectedNode.type === "Action" && key === "definition")
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

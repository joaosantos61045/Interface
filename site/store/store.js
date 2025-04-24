import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import Console from '../console';

// Initial data for nodes and edges
const initialNodes = [
 /* {
    id: "1",
    type: "Table", // Changed to Table node
    data: {
      label: "Table Node",
      columns: [
        { name: "Column 1", type: "text" },
        { name: "Column 2", type: "text" },
        { name: "Column 3", type: "text" }
      ],
      rows: [
        ["Row 1, Col 1", "Row 1, Col 2", "Row 1, Col 3"], // Example row
        ["Row 2, Col 1", "Row 2, Col 2", "Row 2, Col 3"]  // Example row
      ]
    },
    position: { x: 250, y: 5 },
  },
  {
    id: 'X',
    type: 'Variable',
    data: {
      label: 'X',
      value: 3,
    },
    position: { x: 700, y: 100 },
  },*/
];



const initialEdges = [
];

// Create Zustand store
const useStore = create((set, get) => ({
  // Store for nodes and edges
  nodes: initialNodes,
  edges: initialEdges,
  activeFilters: new Set(['Variable', 'Definition', 'Action', 'Table', 'HTML']),
  toggleFilter: (type) =>
    set((state) => {
      const newFilters = new Set(state.activeFilters);
      newFilters.has(type) ? newFilters.delete(type) : newFilters.add(type);
      return { activeFilters: newFilters };
    }),
  // Handles changes for nodes
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  // Handles changes for edges
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  // Handles connection of edges between nodes
  onConnect: (connection) => {
    const { nodes, edges } = get();
    
    // Find source and target nodes
    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    let markerEnd = { type: "arrow", color: "rgb(85, 86, 87)" };
    let action = "";
    if (!sourceNode || !targetNode) return; // Ensure nodes exist
  
    // Determine edge type based on source and target types
    let edgeType = "default"; // Default edge type
  
    if (sourceNode.type === "Action" && (targetNode.type === "Variable" || targetNode.type === "Table")) {
      edgeType = "action";
      action=sourceNode.data.action;
      // Update the Action node's target field to the label of the target node
      get().updateNode(sourceNode.id, { target: targetNode.data.label });
    }
  
    // Create the new edge with the determined type
    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      data: {
        action: action, // Assign action to the edge data
      },
      target:targetNode.id,
      type: edgeType, // Assign calculated edge type
      markerEnd: markerEnd, // Assign calculated marker end
    };
   
    // Add the new edge to the state
    set({ edges: addEdge(newEdge, edges) });
  },  
  

  // Set the entire list of nodes
  setNodes: (nodes) => {
    set({ nodes });
  },

  // Set the entire list of edges
  setEdges: (edges) => {
    set({ edges });
  },

  // Add a new node to the existing list
  addNode: (node) => {
    set((state) => {
      const updatedNodes = [...state.nodes, node];
      const existingEdges = state.edges;
      
      let newEdges = [];
  
      //  Add edges if the node is a Definition or HTML and references any existing node (not just variables)
      if ((node.type === "Definition" || node.type === "HTML") && node.data.definition) {
        const referencedLabels = [...new Set(node.data.definition.match(/\b[A-Za-z_]\w*\b/g))] || [];
      
        referencedLabels.forEach((label) => {
          // Skip self-referencing edge
          if (label === node.data.label) return;
      
          const sourceNode = updatedNodes.find((n) => n.data.label === label);
      
          if (sourceNode) {
            const edgeExists = existingEdges.some(
              (edge) => edge.source === sourceNode.id && edge.target === node.id
            );
      
            if (!edgeExists) {
              newEdges.push({
                id: `edge-${sourceNode.id}-${node.id}`,
                source: sourceNode.id,
                target: node.id,
              });
            }
          }
        });
      }
  
      //  Handle Action nodes: edge from action to target if label matches
      if (node.type === "Action" && node.data.action) {
        const actionText = node.data.action;
        let targetLabel = null;
        console.log("Action Text:", actionText);
        // Match all possible forms of assign
        const patterns = [
          /([a-zA-Z_]\w*)\s*:=/,                          // a := e
          /insert\s+.+\s+into\s+([a-zA-Z_]\w*)/,          // insert e into a
          /update\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+with/,    // update x in a with e
          /delete\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+where/    // delete x in a where e
        ];
      
        for (const pattern of patterns) {
          const match = actionText.match(pattern);
          
          if (match) {
            targetLabel = match[1];
            break;
          }
        }
      
        if (targetLabel) {
          const targetNode = get().nodes.find((n) => n.data?.label === targetLabel);
          
          if (targetNode) {
            const edgeExists = get().edges.some(
              (edge) => edge.source === node.id && edge.target === targetNode.id
            );
            
            if (!edgeExists) {
              newEdges.push({
                id: `edge-${node.id}-${targetNode.id}`,
                source: node.id,
                target: targetNode.id,
                type: "action",
                data: {
                  action: node.data.action,
                },
              });
            }
          }
        }
      }
      
      
      return {
        nodes: updatedNodes.map((n) => (n.id === node.id ? node : n)),
        edges: [...existingEdges, ...newEdges],
      };
    });
  },
  

  addVariable: (variable) => {
    set({ variables: [...get().variables, variable] });
  },
  // Remove a node by its ID
  removeNode: (nodeId) => {
    set({ nodes: get().nodes.filter(node => node.id !== nodeId) });
  },

  // Add a new edge to the existing list
  addEdge: (edge) => {
   
    set({ edges: [...get().edges, edge] });
  },

  // Remove an edge by its ID
  removeEdge: (edgeId) => {
    set({ edges: get().edges.filter(edge => edge.id !== edgeId) });
  },

  // Update a specific node by its ID
  updateNode: (nodeId, data) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
  if (node.id !== nodeId) return node;

  const isTable = node.type === "Table";
  const existingData = node.data || {};
  const mergedData = { ...existingData, ...data };

  if (isTable && typeof data.value === "string" && data.value.startsWith("table[")) {
    const valuePattern = /^table\[(.*)\]$/; // allow empty inner brackets
    const valueMatch = data.value.match(valuePattern);

    if (valueMatch) {
      const content = valueMatch[1].trim();
      console.log("Parsed content:", content); // Debugging line
      if (content === "") {
        mergedData.rows = []; // Explicitly set to empty array
      } else {
        const rowString = `[${content}]`; // wrap to make JSON-like
        try {
          const parsedRows = JSON.parse(rowString.replace(/(\w+)\s*:/g, '"$1":'));
          if (Array.isArray(parsedRows)) {
            mergedData.rows = parsedRows;
          }
        } catch (e) {
          console.warn("Failed to parse table rows from value:", data.value);
        }
      }
    }
  }

  return { ...node, data: mergedData };
});

  
      let existingEdges = state.edges;
      let newEdges = [];
  
      // Update edges for Definition and HTML nodes
      updatedNodes.forEach((defNode) => {
        if ((defNode.type === "Definition" || defNode.type === "HTML") && defNode.data.definition) {
          const referencedLabels = [...new Set(defNode.data.definition.match(/\b[A-Za-z_]\w*\b/g))] || [];
  
          // Remove outdated edges where source's label is no longer referenced
          existingEdges = existingEdges.filter((edge) => {
            if (edge.target === defNode.id) {
              const sourceNode = updatedNodes.find((n) => n.id === edge.source);
              if (
                sourceNode &&
                sourceNode.data?.label &&
                sourceNode.data.label !== defNode.data.label
              ) {
                return referencedLabels.includes(sourceNode.data.label);
              }
            }
            return true;
          });
  
          // Add missing edges from any node with matching label
          referencedLabels.forEach((label) => {
            if (label === defNode.data.label) return; // skip self-referencing
            const sourceNode = updatedNodes.find((n) => n.data?.label === label);
            if (sourceNode) {
              const edgeExists = existingEdges.some(
                (edge) => edge.source === sourceNode.id && edge.target === defNode.id
              );
              if (!edgeExists) {
                newEdges.push({
                  id: `edge-${sourceNode.id}-${defNode.id}`,
                  source: sourceNode.id,
                  target: defNode.id,
                });
              }
            }
          });
        }
      });
  
      // Update edges for Action nodes
      // Update edges for Action nodes targeting labeled nodes
updatedNodes.forEach((actionNode) => {
  if (actionNode.type === "Action" && actionNode.data.action) {
    const actionText = actionNode.data.action;
    let targetLabel = null;

    // Try each form in order of priority
    const patterns = [
      /([a-zA-Z_]\w*)\s*:=/,                          // a := e
      /insert\s+.+\s+into\s+([a-zA-Z_]\w*)/,          // insert e into a
      /update\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+with/,    // update x in a with e
      /delete\s+\w+\s+in\s+([a-zA-Z_]\w*)\s+where/    // delete x in a where e
    ];

    for (const pattern of patterns) {
      const match = actionText.match(pattern);
      if (match) {
        targetLabel = match[1];
        break;
      }
    }

    if (targetLabel) {
      const targetNode = updatedNodes.find(
        (n) => n.data?.label === targetLabel
      );

      // Remove outdated edges
      existingEdges = existingEdges.filter((edge) => {
        if (edge.source === actionNode.id && edge.type === "action") {
          const target = updatedNodes.find((n) => n.id === edge.target);
          return !(target && target.data?.label !== targetLabel);
        }
        return true;
      });

      // Add or update edge
      if (targetNode) {
        const edgeExists = existingEdges.some(
          (edge) =>
            edge.source === actionNode.id &&
            edge.target === targetNode.id &&
            edge.type === "action"
        );

        if (!edgeExists) {
          newEdges.push({
            id: `edge-${actionNode.id}-${targetNode.id}`,
            source: actionNode.id,
            target: targetNode.id,
            type: "action",
            data: {
              action: actionNode.data.action,
            },
          });
        } else {
          // Replace outdated action edge with updated one
          existingEdges = existingEdges.filter(
            (edge) =>
              !(edge.source === actionNode.id && edge.target === targetNode.id)
          );

          newEdges.push({
            id: `edge-${actionNode.id}-${targetNode.id}`,
            source: actionNode.id,
            target: targetNode.id,
            type: "action",
            data: {
              action: actionNode.data.action,
            },
          });
        }
      }
    }
  }
});

  
      return {
        nodes: updatedNodes,
        edges: [...existingEdges, ...newEdges],
      };
    });
  },
  
  
  
  
  
  
  


  // Update a specific edge by its ID
  updateEdge: (edgeId, data) => {
    const updatedEdges = get().edges.map(edge =>
      edge.id === edgeId ? { ...edge, ...data } : edge
    );
    set({ edges: updatedEdges });
  },
  checkExists: (nodeId) => {
    if (nodeId) {
      const existingNode = get().nodes.find(node => node.data.label === nodeId);
      
      if (existingNode) {
        // Node with the same label exists, remove it
        get().removeNode(existingNode.id);  // Access `removeNode` using `get()`
      }
    }
  }
}));

export default useStore;

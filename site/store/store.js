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
  
    if (!sourceNode || !targetNode) return; // Ensure nodes exist
  
    // Determine edge type based on source and target types
    let edgeType = "default"; // Default edge type
  
    if (sourceNode.type === "Action" && (targetNode.type === "Variable" || targetNode.type === "Table")) {
      edgeType = "action";
  
      // Update the Action node's target field to the label of the target node
      get().updateNode(sourceNode.id, { target: targetNode.data.label });
    }
  
    // Create the new edge with the determined type
    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
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
      console.log("Existing Edges:", existingEdges);
      let newEdges = [];
  
      // 🔗 Add edges if the node is a Definition or HTML and references any existing node (not just variables)
      if ((node.type === "Definition" || node.type === "HTML") && node.data.definition) {
        const referencedLabels = [...new Set(node.data.definition.match(/\b[A-Za-z_]\w*\b/g))] || [];

        console.log("Referenced Labels:", referencedLabels);
        referencedLabels.forEach((label) => {
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
  
      // 🔗 Handle Action nodes: edge from action to target if label matches
      if (node.type === "Action" && node.data.target) {
        const targetNode = updatedNodes.find((n) => n.data.label === node.data.target);
  
        if (targetNode) {
          const edgeExists = existingEdges.some(
            (edge) => edge.source === node.id && edge.target === targetNode.id
          );
  
          if (!edgeExists) {
            newEdges.push({
              id: `edge-${node.id}-${targetNode.id}`,
              source: node.id,
              target: targetNode.id,
              type: "action",
            });
          }
        }
      }
      console.log("New Edge:", newEdges);
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
      const updatedNodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
      
      let existingEdges = state.edges;
      let newEdges = [];
  
      // Update edges for Definition nodes
      updatedNodes.forEach((defNode) => {
        if ((defNode.type === "Definition" || defNode.type === "HTML") && defNode.data.definition) {
          const referencedLabels = [...new Set(defNode.data.definition.match(/\b[A-Za-z_]\w*\b/g))] || [];
  
          // Remove outdated edges where source's label is no longer referenced
          existingEdges = existingEdges.filter((edge) => {
            if (edge.target === defNode.id) {
              const sourceNode = updatedNodes.find((n) => n.id === edge.source);
              if (sourceNode && sourceNode.data?.label) {
                return referencedLabels.includes(sourceNode.data.label);
              }
            }
            return true;
          });
  
          // Add missing edges from any node with matching label
          referencedLabels.forEach((label) => {
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
  
      //  Update edges for Action nodes targeting labeled nodes
      updatedNodes.forEach((actionNode) => {
        if (actionNode.type === "Action" && actionNode.data.target) {
          const targetNode = updatedNodes.find(
            (n) => n.data?.label === actionNode.data.target
          );
  
          //  Remove outdated edges
          existingEdges = existingEdges.filter((edge) => {
            if (edge.source === actionNode.id) {
              const target = updatedNodes.find((n) => n.id === edge.target);
              return !(target && target.data?.label !== actionNode.data.target);
            }
            return true;
          });
  
          //  Add missing edge
          if (targetNode) {
            const edgeExists = existingEdges.some(
              (edge) => edge.source === actionNode.id && edge.target === targetNode.id
            );
  
            if (!edgeExists) {
              newEdges.push({
                id: `edge-${actionNode.id}-${targetNode.id}`,
                source: actionNode.id,
                target: targetNode.id,
                type: "action",
              });
            }
          }
        }
      });
      console.log("New Edge3:", newEdges);
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

import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';

// Initial data for nodes and edges
const initialNodes = [
  {
    id: "1",
    type: "input",
    data: { label: "Input Node" },
    position: { x: 250, y: 5 },
  },
  {
    id: '2',
    type: 'variable',
    data: {
      label: 'Variable Node',
      value: 'some value',
      onChange: (value) => console.log('Variable Name Change: ', value),
      onValueChange: (value) => console.log('Variable Value Change: ', value),
    },
    position: { x: 200, y: 200 },
  },
];

const initialEdges = [
  {
    id: 'edge-button',
    source: '1',
    target: '2',
    type: 'action',
  },
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
    set({
      edges: addEdge(connection, get().edges),
    });
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
    set({ nodes: [...get().nodes, node] });
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
    const updatedNodes = get().nodes.map(node =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    set({ nodes: updatedNodes });
  },

  // Update a specific edge by its ID
  updateEdge: (edgeId, data) => {
    const updatedEdges = get().edges.map(edge =>
      edge.id === edgeId ? { ...edge, ...data } : edge
    );
    set({ edges: updatedEdges });
  },
}));

export default useStore;

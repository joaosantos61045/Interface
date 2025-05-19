import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { current } from "@reduxjs/toolkit";
import { env } from "process";
import Dagre from '@dagrejs/dagre';
// Helper function to create empty environments (modules, etc.)
const createEmptyEnv = (id, label = "Module") => ({
  id,
  label,
  nodes: [],
  edges: [],
  children: {},
});
const defaultSize = { width: 180, height: 40 };
let usid = localStorage.getItem("usid");
function applyLayoutToEnv(env) {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR', // or 'TB', whichever you prefer
    nodesep: 100,
    ranksep: 100,
    marginx: 20,
    marginy: 20,
  });

  (env.edges || []).forEach((edge) => g.setEdge(edge.source, edge.target));

  (env.nodes || []).forEach((n) =>
    g.setNode(n.id, {
      width: n.measured?.width ?? defaultSize.width,
      height: n.measured?.height ?? defaultSize.height,
    }),
  );

  Dagre.layout(g);

  env.nodes = env.nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - (n.measured?.width ?? defaultSize.width) / 2,
        y: pos.y - (n.measured?.height ?? defaultSize.height) / 2,
      },
    };
  });
}
const useStore = create((set, get) => ({
  environments: {
    root: createEmptyEnv("root", "Root"), // root environment
  },
  currentEnvId: "root", // Current environment ID
  pathStack: ["root"], // Used for breadcrumb navigation later
  paramInputs: {},
  layoutRequested: false,
  fetchNodeId: null,

  setFetchNodeId: (id) => set({ fetchNodeId: id }),
requestLayout: () => set({ layoutRequested: true }),

clearLayoutRequest: () => set({ layoutRequested: false }),

setParamInput: (key, value) =>{
  set((state) => ({
    paramInputs: {
      ...state.paramInputs,
      [key]: value,
    },
  }))

},
  resetParamInputs: () => set({ paramInputs: {} }),
  activeFilters: new Set([
    "Variable",
    "Definition",
    "Action",
    "Table",
    "HTML",
    "Module",
  ]),

  toggleFilter: (type) =>
    set((state) => {
      const newFilters = new Set(state.activeFilters);
      newFilters.has(type) ? newFilters.delete(type) : newFilters.add(type);
      return { activeFilters: newFilters };
    }),

  // Get current environment (no parent-child relationships needed)
  getCurrentEnv: () => get().environments[get().currentEnvId],
  getEnv: (envId) => get().environments[envId],
  // Set nodes for the current environment
  setNodes: (nodes) => {
    const envId = get().currentEnvId;
    set((state) => {
      state.environments[envId].nodes = nodes;
      return { environments: { ...state.environments } };
    });
  },

  // Set edges for the current environment
  setEdges: (edges) => {
    const envId = get().currentEnvId;
    set((state) => {
      state.environments[envId].edges = edges;
      return { environments: { ...state.environments } };
    });
  },

  onNodesChange: (changes) => {
    const env = get().getCurrentEnv();
    const updated = applyNodeChanges(changes, env.nodes);
    get().setNodes(updated);
  },

  onEdgesChange: (changes) => {
    const env = get().getCurrentEnv();
    const updated = applyEdgeChanges(changes, env.edges);
    get().setEdges(updated);
  },

  // Handle connections (edges) between nodes
  onConnect: (connection) => {
    const env = get().getCurrentEnv();
    const nodes = env.nodes;
    const edges = env.edges;

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    let edgeType = "default";
    let action = "";

    if (
      sourceNode.type === "Action" &&
      (targetNode.type === "Variable" || targetNode.type === "Table")
    ) {
      edgeType = "action";
      action = sourceNode.data.action;
    }

    const newEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      data: { action },
      type: edgeType,
      markerEnd: { type: "arrow", color: "rgb(85, 86, 87)" },
    };

    get().setEdges(addEdge(newEdge, edges));
  },

  // Add a new node
  addNode: (node, envId, parentId = null) => {
  set((state) => {
    if (!state.environments[envId]) {
      state.environments[envId] = createEmptyEnv(envId);
    }
    const env = state.environments[envId];
    if (env.nodes.some((n) => n.id === node.id)) return {};

    if (parentId && state.environments[parentId]) {
      const parentEnv = state.environments[parentId];
      if (!parentEnv.children[envId]) {
        parentEnv.children[envId] = state.environments[envId];
      }
    }

    const updatedNodes =
      node.type === 'Module' ? [node, ...env.nodes] : [...env.nodes, node];
    env.nodes = updatedNodes.map((n) => (n.id === node.id ? node : n));

    applyLayoutToEnv(env);

    return { environments: { ...state.environments } };
  });
},



  // Remove a node by ID
  removeNode: (nodeId) => {
    const state = get();
    const env = state.getCurrentEnv();
    const nodeToRemove = env.nodes.find((node) => node.id === nodeId);

    // Remove the node from the current environment
    const updatedNodes = env.nodes.filter((node) => node.id !== nodeId);
    state.setNodes(updatedNodes);
    console.log("Removing node:", nodeToRemove);
    if (nodeToRemove?.type === "Module") {
      // Delete the associated environment from `environments`
      const environments = { ...state.environments };
      console.log("Deleting environment:", environments[nodeId]);
      delete environments[nodeId];

      // Also remove from parent's children
      for (const envKey in environments) {
        const childEnv = environments[envKey];
        if (childEnv.children && childEnv.children[nodeId]) {
          console.log("Deleting child environment:", childEnv.children[nodeId]);
          delete childEnv.children[nodeId];
        }
      }

      set({ environments });
    }
  },


  // Add a new edge
  addEdge: (edge, envId) => {
  set((state) => {
    const env = state.environments[envId];
    if (!env) return {};

    if (env.edges.some((e) => e.id === edge.id)) return {};

    env.edges = [...(env.edges || []), edge];

    applyLayoutToEnv(env);

    return { environments: { ...state.environments } };
  });
},

  // Remove an edge by ID
  removeEdge: (edgeId, envId) => {
    const envs = get().environments;
    const env = envs[envId];
    if (!env) return;
    env.edges = env.edges.filter((e) => e.id !== edgeId);
    set({ environments: { ...envs } });
  },

  // Update a specific node by its ID
  updateNode: (nodeId, data) => {
    const env = get().getCurrentEnv();
    const updatedNodes = env.nodes.map((node) => {
      if (node.id !== nodeId) return node;

      const isTable = node.type === "Table";
      const mergedData = { ...node.data, ...data };

      if (isTable && typeof data.value === "string" && data.value.startsWith("table[")) {
        try {
          const content = data.value.match(/^table\[(.*)\]$/)[1].trim();
          mergedData.rows = content
            ? JSON.parse(`[${content}]`.replace(/(\w+):/g, '"$1":'))
            : [];
        } catch (e) {
          console.warn("Failed to parse table:", e);
        }
      }

      return { ...node, data: mergedData };
    });

    get().setNodes(updatedNodes);
  },

  // Update an edge by its ID
  updateEdge: (edgeId, data) => {
    const env = get().getCurrentEnv();
    const updatedEdges = env.edges.map((e) =>
      e.id === edgeId ? { ...e, ...data } : e
    );
    get().setEdges(updatedEdges);
  },

  // Check if a node exists based on its label
  checkExists: (label) => {
    if (!label) return;
    const env = get().getCurrentEnv();
    const found = env.nodes.find((n) => n.data.label === label);
    if (found) get().removeNode(found.id);
  },

  // Enter a module (environment)
  enterModule: (moduleId) => {
    const envId = get().currentEnvId;
    const currentEnv = get().environments[envId];

    // If the module doesn't have a child env, create it
    if (!currentEnv.children[moduleId]) {
      currentEnv.children[moduleId] = createEmptyEnv(moduleId);
    }

    // Update state to enter the new environment
    set((state) => {
      return {
        currentEnvId: moduleId,
        environments: {
          ...state.environments,
          [moduleId]: currentEnv.children[moduleId],
        },
        pathStack: [...state.pathStack, moduleId],
      };
    });
    get().resetParamInputs();
    get().requestLayout();
  },
  setEnv: (envId) => {

    const path = get().pathStack;
    const index = path.indexOf(envId);

    if (index !== -1) {
      set({
        currentEnvId: envId,
        pathStack: path.slice(0, index + 1),
      });
      console.log("Setting environment to:", envId);
      get().resetParamInputs();
      get().requestLayout();
    }
  },

  // Exit the current module and return to the previous environment
  exitModule: () => {
    const path = [...get().pathStack];
    if (path.length > 1) {
      path.pop();
      const newEnvId = path[path.length - 1];
      set({
        currentEnvId: newEnvId,
        pathStack: path,
      });
    }
  },


}));

export default useStore;

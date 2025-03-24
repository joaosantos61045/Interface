import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
  list: [], // Nodes will be stored here
};

const nodeSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: {
    setNodes: (state, action) => {
      state.list = action.payload; // Replace all nodes
    },
    updateNode: (state, action) => {
      const { id, data } = action.payload;
      const node = state.list.find((n) => n.id === id);
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },
  },
});

export const { setNodes, updateNode } = nodeSlice.actions;
export const actionLoadNodes = () => async (dispatch) => {
    // Example: Load initial nodes from an API, localStorage, or define them manually
    const initialNodes = [
      {
        id: "1",
        type: "input",
        data: { label: "Input Node" },
        position: { x: 250, y: 5 },
      },
      {
        id: "2",
        type: "variable",
        data: {
          label: "Variable Node",
          value: "some value",
        },
        position: { x: 200, y: 200 },
      },
    ];
  
    dispatch(setNodes(initialNodes));
  };
export default nodeSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";


const initialState = {
  curr: [{
    id: "1",
    type: "input",
    data: { label: "Input Node" },
    position: { x: 250, y: 5 },
  },
  {id: '2',
  type: 'variable',
  data: {
    label: 'Variable Node',
    value: 'some value',
    onChange: (value) => console.log('Variable Name Change: ', value),
    onValueChange: (value) => console.log('Variable Value Change: ', value),
  },position: { x: 200, y: 200 }}], // Stores the variable nodes
  loading: false,
};

const variableSlice = createSlice({
  name: "variables",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setVariables: (state, action) => {
      state.curr = action.payload;
      state.loading = false;
    },
  },
});

const { setLoading, setVariables } = variableSlice.actions;

// Async action to fetch variable nodes from API
export const actionLoadVariables = () => async (dispatch) => {
  dispatch(setLoading(true));
  executeAppAPI(false, (api) => {
    api
      .getVariables() // Replace with your actual API function
      .then((variables) => {
        dispatch(setVariables(variables));
      });
  });
};

export default variableSlice.reducer;

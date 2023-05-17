import { createSlice } from "@reduxjs/toolkit";

const toolkitSlice = createSlice({
  name: "toolkit",
  initialState: {
    count: 0,
    pattern: "01",
    delaysArrayState: [],
  },
  reducers: {
    increment(state) {
      state.count = state.count + 1;
    },
    decrement(state) {
      state.count = state.count - 1;
    },
    setPattern(state, action) {
      state.pattern = action.payload;
    },
    setDelaysArray(state, action) {
      state.delaysArray = action.payload;
    },
  },
});

export default toolkitSlice.reducer;
export const { increment, decrement, setPattern, setDelaysArray } =
  toolkitSlice.actions;

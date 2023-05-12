import { createSlice } from "@reduxjs/toolkit";

const toolkitSlice = createSlice({
  name: "toolkit",
  initialState: {
    count: 0,
    todos: "",
  },
  reducers: {
    increment(state) {
      state.count = state.count + 1;
    },
    decrement(state) {
      state.count = state.count - 1;
    },
    addTodo(state, action) {
      state.todos = action.payload;
    },
  },
});

export default toolkitSlice.reducer;
export const { increment, decrement, addTodo } = toolkitSlice.actions;

import { createSlice } from "@reduxjs/toolkit";

const initialCurrent = {
  name: "period",
      value: "01"}

  const initialState = {
  name: "period",
      value: "01"}

  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
};

// Action creators are generated for each case reducer function
export const { increment, decrement, incrementByAmount } = periodSlice.actions;

export default periodSlice.reducer;

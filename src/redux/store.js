import { combineReducers, configureStore } from "@reduxjs/toolkit";
import toolkitSlice from "./toolkitSlice";

const rootReducer = combineReducers({
  filters: toolkitSlice,
});

export const store = configureStore({
  reducer: rootReducer,
});

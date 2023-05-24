import { combineReducers, configureStore } from "@reduxjs/toolkit";
import filtersSlice from "./filtersSlice";

const rootReducer = combineReducers({
  filters: filtersSlice,
});

export const store = configureStore({
  reducer: rootReducer,
});

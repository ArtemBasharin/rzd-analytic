import { combineReducers, configureStore } from "@reduxjs/toolkit";
import filtersSlice from "./filtersSlice";

const rootReducer = combineReducers({
  filters: filtersSlice,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }),
});

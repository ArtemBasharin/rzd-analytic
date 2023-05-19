import { createSlice } from "@reduxjs/toolkit";

const toolkitSlice = createSlice({
  name: "filters",
  initialState: {
    count: 0,
    regexpPattern: "01",
    failsArrayState: [],
    delaysArrayState: [],
    durationsArrayState: [],
    subunitsArrayState: [],
    subunitsDurationArrayState: [],
    reasonsArrayState: [],
  },
  reducers: {
    increment(state) {
      state.count = state.count + 1;
    },
    decrement(state) {
      state.count = state.count - 1;
    },
    setPattern(state, action) {
      let periodStr = "";
      let period = action.payload;
      if (period.length < 3) {
        periodStr = `${period}`;
      } else {
        let tempArr = period.split("-").map((el) => Number(el));
        let resultArr = [];
        for (let i = tempArr[0]; i <= tempArr[1]; ++i) {
          i < 10 ? resultArr.push("0" + i) : resultArr.push(i);
        }
        periodStr = resultArr.join("|");
      }
      state.regexpPattern = periodStr;
      console.log("slice", periodStr);
    },
    setDelaysArray(state, action) {
      state.delaysArray = action.payload;
    },
  },
});

export default toolkitSlice.reducer;
export const { increment, decrement, setPattern, setDelaysArray } =
  toolkitSlice.actions;

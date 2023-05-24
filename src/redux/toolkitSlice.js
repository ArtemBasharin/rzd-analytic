import { createSlice } from "@reduxjs/toolkit";
let date = new Date();

const toolkitSlice = createSlice({
  name: "filters",
  initialState: {
    minValue: 0,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
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
      state.minValue = state.minValue + 1;
    },

    decrement(state) {
      state.minValue = state.minValue - 1;
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
    },

    setMinValue(state, action) {
      state.minValue = action.payload;
    },

    setDelaysArray(state, action) {
      state.delaysArray = action.payload;
    },
  },
});

export default toolkitSlice.reducer;
export const { increment, decrement, setPattern, setMinValue, setDelaysArray } =
  toolkitSlice.actions;

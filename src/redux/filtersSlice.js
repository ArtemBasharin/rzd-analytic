import { createSlice } from "@reduxjs/toolkit";
// import { getUnitedArr } from "../components/arrGenerators/combiner";
let date = new Date();

const filtersSlice = createSlice({
  name: "filters",
  initialState: {
    minValue: 0,
    currentYear: date.getFullYear(),
    pastYear: date.getFullYear() - 1,
    regexpPattern: "01",
    unitedArrayState: [],
  },
  reducers: {
    increment(state) {
      state.minValue = state.minValue + 1;
    },

    decrement(state) {
      state.minValue = state.minValue - 1;
    },

    setPattern(state, action) {
      let period = action.payload;
      let pattern = "";
      if (period.length < 3) {
        pattern = `${period}`;
      } else {
        let arr = period.split("-").map((el) => Number(el));
        let resultArr = [];
        for (let i = arr[0]; i <= arr[1]; ++i) {
          i < 10 ? resultArr.push("0" + i) : resultArr.push(i);
        }
        pattern = resultArr.join("|");
      }
      state.regexpPattern = pattern;
    },

    setMinValue(state, action) {
      state.minValue = action.payload;
    },

    // setUnitedArrayState(state) {
    //   state.delaysArray = getUnitedArr(
    //     state.minValue,
    //     state.currentYear,
    //     state.pastYear,
    //     state.regexpPattern
    //   );
    // },
  },
});

export default filtersSlice.reducer;
export const { increment, decrement, setPattern, setMinValue } =
  filtersSlice.actions;

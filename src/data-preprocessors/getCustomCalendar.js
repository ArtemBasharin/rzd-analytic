export const getCustomCalendar = (step, dateStart, dateEnd) => {
  let result = [];
  let start = new Date(...[dateStart]);
  let end = new Date(...[dateEnd]);
  if (start < end) {
    while (start <= end) {
      // console.log("календарь", start, dateStart);
      let val = start.setDate(start.getDate() + step);
      result.push(val);
    }
  }
  // if (start > end) result.slice(-1);
  // console.log("resultCal", result);
  return result;
};

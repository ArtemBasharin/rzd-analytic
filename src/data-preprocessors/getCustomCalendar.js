export const getCustomCalendar = (step, dateStart, dateEnd) => {
  let result = [];
  if (dateStart < dateEnd) {
    while (dateStart <= dateEnd) {
      // console.log("dateStart", dateStart);
      // console.log("dateEnd", dateEnd);
      let val = dateStart.setDate(dateStart.getDate() + step);
      console.log("dateStart + step", val);
      result.push(val);
    }
    if (dateStart > dateEnd) result.slice(-1);
  }
  console.log("resultCal", result);
  return result;
};

import axios from "axios";
import dummyArr from "../data-preprocessors/dummyArr";

axios.defaults.baseURL = "http://localhost:3001";
axios.defaults.timeout = 120000;

const getViolationsArray = (startDate, endDate) => {
  let params = {
    "fromYear": new Date(startDate).getFullYear() - 1,
    "toYear": new Date(endDate).getFullYear(),
  };

  axios
    .get("/violations", { params })
    .then(function (res) {
      return res.data;
    })
    .catch(function (error) {
      console.log("axios.get error:", error);
      return dummyArr;
    });
};

const postViolationsArray = (arr) => {
  axios
    .post("/add-bulk-of-violations", arr)
    .then(function (res) {
      console.log("post response:", res.data);
    })
    .catch(function (error) {
      console.log("axios.post error:", error);
    })
    .finally(function () {});
};

const deleteCollection = () => {
  axios
    .delete("/violations")
    .then(function (res) {
      console.log("post response:", res.data);
    })
    .catch(function (error) {
      console.log("axios.post error:", error);
    })
    .finally(function () {});
};

export { getViolationsArray, postViolationsArray, deleteCollection };

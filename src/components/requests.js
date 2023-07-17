import axios from "axios";

// let date = new Date();

axios.defaults.baseURL = "http://localhost:3001";
axios.defaults.timeout = 120000;

const getViolationsArray = (params) => {
  axios
    .get(
      "/violations",
      { params }
      // {
      //   method: "GET",
      //   headers: { "Content-Type": "application/json" },
      // }
    )
    .then(function (res) {
      console.log("DB length is now:", res.data.length);
      // console.log(res);
    })
    .catch(function (error) {
      console.log("axios.get error:", error);
    })
    .finally(function () {});
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

export { getViolationsArray, postViolationsArray };

import axios from "axios";

// let date = new Date();

axios.defaults.baseURL = "http://localhost:3001";

const getViolationsArray = (params) => {
  axios
    .get("/violations", { params })
    .then(function (res) {
      console.log("Violations.length is:", res.data);
      return res.data;
    })
    .catch(function (error) {
      console.log("axios.get error:", error);
    })
    .finally(function () {});
};

const postViolationsArray = (arr) => {
  axios
    .post("/add-bulk-of-violations", arr, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Access-Control-Allow-Origin": "*",
      },
    })
    .then(function (res) {
      console.log("post.length is:", res.data.length);
    })
    .catch(function (error) {
      console.log("axios.post error:", error);
    })
    .finally(function () {});
};

export { getViolationsArray, postViolationsArray };

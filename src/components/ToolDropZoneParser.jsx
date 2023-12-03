import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

import * as XLSX from "xlsx/xlsx.mjs";
import { postViolationsArray } from "../config/requests";
import { guiltyUnit, guiltyNew } from "../config/config";

let initialData = [];

function DropZoneParser() {
  const onDrop = useCallback((acceptedFiles) => {
    const reader = new FileReader();
    reader.readAsBinaryString(acceptedFiles[0]);
    reader.onload = function (e) {
      var data = e.target.result;
      var workbook = XLSX.read(data, {
        type: "binary",
        cellDates: true,
      });
      var result = {};
      workbook.SheetNames.forEach(function (sheetName) {
        var roa = XLSX.utils.sheet_to_row_object_array(
          workbook.Sheets[sheetName]
        );
        if (roa.length > 0) {
          result[sheetName] = roa;
        }
      });

      // let importedObject = JSON.stringify(result, null, 4);
      // let importedObject = JSON.stringify(result, null, 4);
      let resultArray;

      for (let i in result) {
        if (!resultArray) {
          resultArray = result[i];
        }
      }

      initialData = resultArray;

      // const filterArray = (arr) => {
      //   let result = [];
      //   arr.forEach((el) => {
      //     if (el["ID отказа"] || el["#"]) {
      //       if (el[guiltyNew]) {
      //         el[guiltyNew] = el[guiltyNew].replace(/З-СИБ$/, "");
      //       }
      //       if (el[guiltyUnit]) {
      //         el[guiltyUnit] = el[guiltyUnit].replace(/З-СИБ$/, "");
      //       }
      //     }
      //     result.push(el);
      //   });
      //   return result;
      // };

      postViolationsArray(resultArray);
      // console.log("resultArray.length is", filterArray(resultArray).length);
      console.log("resultArray.length is", resultArray.length);
    };
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
  });

  return (
    <>
      <div
        {...getRootProps({
          className: `dropzone 
          ${isDragAccept && "dropzoneAccept"} 
          ${isDragReject && "dropzoneReject"}`,
        })}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag'n'drop zone</p>
        )}
      </div>
    </>
  );
}

export default DropZoneParser;
export { initialData };

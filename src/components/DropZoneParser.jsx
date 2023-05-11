import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";

import * as XLSX from "xlsx/xlsx.mjs";

let initialData = [];

function DropZoneParser() {
  const onDrop = useCallback((acceptedFiles) => {
    console.log("acceptedFiles[0]:", acceptedFiles[0]);
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

      console.log("parsedXLSData:", JSON.stringify(result, null, 4));
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

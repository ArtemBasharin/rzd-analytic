import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

import * as XLSX from "xlsx/xlsx.mjs";
import { postViolationsArray } from "../utils/requests";
import { guiltyUnit, guiltyNew } from "../utils/config";

let initialData: any[] = [];

function DropZoneParser() {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const reader = new FileReader();
    reader.readAsBinaryString(acceptedFiles[0]);
    reader.onload = function (e) {
      var data = e.target!.result;
      var workbook = XLSX.read(data, {
        type: "binary",
        cellDates: true,
      });
      var result: Record<string, any> = {};
      workbook.SheetNames.forEach(function (sheetName: string) {
        var roa = XLSX.utils.sheet_to_row_object_array(
          workbook.Sheets[sheetName],
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

      const filterArray = (arr: any[]) => {
        let result: any[] = [];
        arr.forEach((el: any) => {
          if (el["ID отказа"] || el["#"]) {
            if (el[guiltyNew]) {
              el[guiltyNew] = el[guiltyNew].replace(/Московская,$/, "");
            }
            if (el[guiltyUnit]) {
              el[guiltyUnit] = el[guiltyUnit].replace(/Московская,$/, "");
            }
          }
          result.push(el);
        });
        return result;
      };

      postViolationsArray(filterArray(resultArray));
      // console.log("resultArray.length is", filterArray(resultArray).length);
      console.log("Length of the sent array:", resultArray.length);
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

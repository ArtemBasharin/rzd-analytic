import { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { useDispatch } from "react-redux";

import * as XLSX from "xlsx/xlsx.mjs";
import { describeBulkUpload, postViolationsArray } from "../utils/requests";
import { guiltyUnit, guiltyNew } from "../utils/config";
import { pushToast, updateToast } from "../utils/toast";
import { loadViolationsIntoStore } from "../utils/loadViolations";
import type { AppDispatch } from "../redux/store";

let initialData: any[] = [];

function DropZoneParser() {
  const [pending, setPending] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      pushToast("Файл не выбран", "fail");
      return;
    }

    const noticeId = pushToast(`Читаем «${file.name}»…`, "info", true);
    setPending(true);
    const reader = new FileReader();
    reader.onerror = function () {
      setPending(false);
      updateToast(noticeId, "Не удалось прочитать файл", "fail");
    };
    reader.onload = async function (e) {
      try {
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

        let resultArray: any[] | undefined;

        for (let i in result) {
          if (!resultArray) {
            resultArray = result[i];
          }
        }

        if (!resultArray || resultArray.length === 0) {
          updateToast(noticeId, "Файл пустой или не распознан", "fail");
          return;
        }

        initialData = resultArray;

        const filterArray = (arr: any[]) => {
          let rows: any[] = [];
          arr.forEach((el: any) => {
            if (el["ID отказа"] || el["#"]) {
              if (typeof el[guiltyNew] === "string") {
                el[guiltyNew] = el[guiltyNew].replace(/Московская,$/, "");
              }
              if (typeof el[guiltyUnit] === "string") {
                el[guiltyUnit] = el[guiltyUnit].replace(/Московская,$/, "");
              }
            }
            rows.push(el);
          });
          return rows;
        };

        const rows = filterArray(resultArray);
        console.log("Length of the sent array:", rows.length);
        const summary = await postViolationsArray(rows, noticeId);
        const notice = describeBulkUpload(summary, rows.length);
        const wrote =
          Number(summary?.upsertedCount ?? 0) > 0 ||
          Number(summary?.modifiedCount ?? 0) > 0;
        if (notice.status === "success" && wrote) {
          updateToast(noticeId, "Обновление данных…", "info", true);
          try {
            await loadViolationsIntoStore(dispatch, { fallbackToDummy: false });
          } catch (loadError) {
            console.log("reload after upload failed:", loadError);
            updateToast(
              noticeId,
              "Файл загружен, но графики не обновились. Обновите страницу.",
              "fail",
            );
            return;
          }
        }
        updateToast(noticeId, notice.message, notice.status);
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          console.log("file parse error:", error);
          updateToast(noticeId, "Не удалось прочитать файл", "fail");
        }
      } finally {
        setPending(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    disabled: pending,
    multiple: false,
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
        {pending ? (
          <p>Загрузка…</p>
        ) : isDragActive ? (
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

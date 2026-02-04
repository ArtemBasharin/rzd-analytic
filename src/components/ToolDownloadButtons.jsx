import * as htmlToImage from "html-to-image";
import { FaCopy, FaDownload } from "react-icons/fa6";
import { useSelector } from "react-redux";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function DownloadButtons(props) {
  const toolPalette = useSelector((state) => state.filters.toolPalette);

  function downloadElementAsSVG() {
    const selectedElement = props.reference.current;
    htmlToImage
      .toSvg(selectedElement)
      .then(function (dataUrl) {
        const link = document.createElement("a");
        link.download = "slide.svg";
        link.href = dataUrl;
        link.click();
      })
      .catch(function (error) {
        console.error("Failed to save the image: ", error);
      });
  }

  function downloadElementAsPNG() {
    const selectedElement = props.reference.current;
    if (selectedElement) {
      htmlToImage
        .toPng(selectedElement)
        .then(function (dataUrl) {
          const link = document.createElement("a");
          link.download = "slide.png";
          link.href = dataUrl;
          link.click();
        })
        .catch(function (error) {
          console.error("Failed to save the image: ", error);
        });
    }
  }

  // const downloadElementAsDOCX = () => {
  //   // Получаем элемент DOM, который вы хотите скачать в .docx
  //   const domElement = document.getElementById("text_report");

  //   // Создаем объект документа .docx
  //   const doc = new Document();

  //   // Создаем абзац с содержимым элемента DOM и добавляем его в документ
  //   const paragraph = new Paragraph(domElement.textContent);
  //   doc.addParagraph(paragraph);

  //   // Преобразуем документ в буфер для загрузки
  //   Packer.toBlob(doc).then((blob) => {
  //     // Сохраняем буфер как файл .docx и предлагаем пользователю скачать его
  //     saveAs(blob, "yourFileName.docx");
  //   });
  // };

  const copyToBufferAsText = () => {
    const textContainer = document.getElementById("text_report");
    const tempContainer = document.createElement("div");

    tempContainer.appendChild(textContainer.cloneNode(true));
    document.body.appendChild(tempContainer);

    const styleElements = document.head.querySelectorAll(
      "style, link[rel='stylesheet']",
    );
    styleElements.forEach((styleElement) => {
      const clone = styleElement.cloneNode(true);
      tempContainer.appendChild(clone);
    });

    const range = document.createRange();
    range.selectNode(tempContainer);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    try {
      document.execCommand("copy");
      console.log("HTML-код успешно скопирован в буфер обмена");
    } catch (e) {
      console.error("Ошибка при копировании HTML-кода:", e);
    }

    window.getSelection().removeAllRanges();
    document.body.removeChild(tempContainer);
  };

  async function downloadTableAsExcel() {
    const table = document.getElementById("stations_container");

    if (!table) {
      console.error(`Таблица  не найдена.`);
      return;
    }

    // Создаем рабочую книгу и лист
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    let rowIndex = 1;
    // Перебираем строки таблицы
    const rows = table.querySelectorAll("tr");

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll("td, th");
      const excelRow = worksheet.addRow(
        [...cells].map((cell) => cell.textContent || ""),
      );

      let cellIndexOffset = 0; // для учёта colSpan
      // Применяем стили для каждой ячейки
      cells.forEach((cell, cellIndex) => {
        const rowSpan = parseInt(cell.getAttribute("rowSpan") || "1", 10);
        const colSpan = parseInt(cell.getAttribute("colSpan") || "1", 10);

        // Если у ячейки есть rowSpan или colSpan, учитываем сдвиг индексов
        const excelCellIndex = cellIndex + 1 + cellIndexOffset;
        const excelCell = excelRow.getCell(excelCellIndex);

        // Устанавливаем значение
        excelCell.value = cell.textContent || "";

        // Стили текста (жирный, курсив, подчеркивание)
        const fontWeight = window.getComputedStyle(cell).fontWeight;
        const fontStyle = window.getComputedStyle(cell).fontStyle;
        const textDecoration = window.getComputedStyle(cell).textDecorationLine;

        excelCell.style.font = {
          bold: fontWeight === "bold" || parseInt(fontWeight, 10) >= 700,
          italic: fontStyle === "italic",
          underline: textDecoration.includes("underline"),
          color: { argb: rgbToArgb(window.getComputedStyle(cell).color) },
        };

        // Цвет заливки
        const bgColor = window.getComputedStyle(cell).backgroundColor;
        if (bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
          excelCell.style.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rgbToArgb(bgColor) },
          };
        }

        // Границы
        excelCell.style.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Выравнивание
        excelCell.style.alignment = {
          horizontal: window.getComputedStyle(cell).textAlign,
          vertical: "middle",
        };

        // Обрабатываем объединённые ячейки (rowSpan, colSpan)
        if (rowSpan > 1 || colSpan > 1) {
          worksheet.mergeCells(
            rowIndex, // строка начала
            excelCellIndex, // столбец начала
            rowIndex + rowSpan - 1, // строка конца
            excelCellIndex + colSpan - 1, // столбец конца
          );

          cellIndexOffset += colSpan - 1; // Сдвигаем индекс для colSpan
        }
      });

      rowIndex++; // Переходим к следующей строке
    });

    // Генерация и сохранение файла
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      "Таблица.xlsx",
    );
  }

  function rgbToArgb(rgb) {
    const result = rgb.match(/\d+/g)?.map(Number);
    if (!result || result.length < 3) return "FFFFFFFF"; // Белый по умолчанию

    const [r, g, b] = result;
    const alpha =
      result[3] !== undefined
        ? Math.round(Number(result[3]) * 255)
            .toString(16)
            .padStart(2, "0")
        : "FF";
    return `${alpha}${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  return (
    <div className="buttons-copy_container">
      {toolPalette.kind !== "report" && (
        <button className="button-copy" onClick={downloadElementAsSVG}>
          <FaDownload className="button-copy_icon" />
          SVG
        </button>
      )}

      {toolPalette.kind !== "report" && (
        <button className="button-copy" onClick={downloadElementAsPNG}>
          <FaDownload className="button-copy_icon" />
          PNG
        </button>
      )}

      {/* <button className="button-copy" onClick={downloadElementAsDOCX}>
        <FaDownload className="button-copy_icon" />
        PNG
      </button> */}

      {toolPalette.kind === "report" && (
        <button
          className="button-copy"
          id="text_copy"
          onClick={copyToBufferAsText}
        >
          <FaCopy className="button-copy_icon" />
          DOC
        </button>
      )}

      {toolPalette.kind === "report" && (
        <button
          className="button-copy"
          id="text_copy"
          onClick={downloadTableAsExcel}
        >
          <FaCopy className="button-copy_icon" />
          XLS
        </button>
      )}
    </div>
  );
}

export default DownloadButtons;

import * as htmlToImage from "html-to-image";
import { FaCopy, FaDownload } from "react-icons/fa6";
import { useSelector } from "react-redux";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/** Селектор диаграмм Sankey в отчёте — перед копированием в Word заменяем на PNG (Word 2007+ плохо понимает SVG в HTML). */
const REPORT_SANKEY_SVG_SELECTOR = "svg.sankey-diagram--report";

const SANKEY_CAPTURE_PIXEL_RATIO = 2;

/**
 * Стили отчёта внутри фрагмента для буфера: Word не подтягивает внешние CSS из <link>.
 * Дублирует report.css + подсказки для таблиц в MS Word.
 */
const REPORT_WORD_EMBEDDED_CSS = `
.text_container {
  font-family: "Times New Roman", Times, serif;
  text-align: justify;
  white-space: pre-wrap;
  line-height: 21.5px;
  text-indent: 42.3px;
}
.text_paragraph {
  text-indent: 42.3px;
  font-size: 14pt;
  white-space: pre-wrap;
  text-align: justify;
  line-height: 21.5px;
}
.text_report_units_heading {
  margin: 0 0 21.5px;
}
/* Без красной строки у блока с диаграммой — иначе Word даёт отступ первой строки у картинки */
.text_report_sankey_unit {
  text-indent: 0 !important;
}
.text_report_sankey_unit .text_paragraph.text_inner {
  margin: 0;
}
.text_report_sankey_unit .sankey-diagram--report,
.text_report_sankey_unit img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  margin: 6px 0 21.5px;
  box-sizing: border-box;
  text-indent: 0 !important;
}
.text_inner {
  font-family: "Times New Roman", Times, serif;
  white-space: pre-wrap;
  text-align: justify;
  line-height: 21.5px;
  text-indent: 42.3px;
}
.text_unit { font-weight: 700; }
.text_increase { color: #d10000; }
.text_decrease { color: #008006; }
table, th, td {
  border-spacing: 0;
  border: 1px solid black;
  border-collapse: collapse;
  text-align: center;
  mso-border-alt: solid black 0.5pt;
}
/* Одинарный межстрочный интервал; отступы ячейки только слева/справа 1 mm */
table.table_bold th,
table.table_bold td {
  white-space: normal !important;
  word-wrap: break-word !important;
  line-height: 1 !important;
  padding: 0 1mm !important;
  box-sizing: border-box !important;
  vertical-align: middle !important;
}
/* Только таблицы: без красной строки; ширина колонок задаётся JS (colgroup) + table-layout:fixed */
.table_bold,
.text_container > table {
  margin: 6px 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  text-indent: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  box-sizing: border-box !important;
  border: 1px solid black;
}
table caption,
table thead,
table tbody,
table tfoot,
table tr,
table th,
table td {
  text-indent: 0 !important;
  margin-left: 0 !important;
}
.table_bold_right { border-right: 1px solid black; }
.table_fill {
  background-color: #d8d8d8;
  line-height: 1;
}
.text_header { font-weight: bold; }
table { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
`;

/** Свойства, переносимые в style="" для совместимости с Word */
const WORD_EXPORT_COMPUTED_PROPS = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "color",
  "text-align",
  "text-indent",
  "line-height",
  "text-decoration",
  "text-decoration-line",
  "white-space",
  "vertical-align",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "background-color",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-collapse",
  "width",
  "height",
  "display",
  "max-width",
];

/**
 * Дублирует вычисленные стили в инлайн — при вставке в Word не используются внешние таблицы стилей.
 * @param {HTMLElement} el
 */
function copyComputedPresentationToInline(el) {
  if (!(el instanceof HTMLElement)) return;
  if (el.tagName === "STYLE" || el.tagName === "SCRIPT") return;

  if (el.id === "text_report") {
    el.style.height = "auto";
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
    el.style.marginBottom = "12px";
  }

  const cs = window.getComputedStyle(el);
  const tag = el.tagName;
  const isTable = tag === "TABLE";
  const isTableCell = tag === "TD" || tag === "TH";
  const isTablePart =
    isTable ||
    isTableCell ||
    tag === "CAPTION" ||
    tag === "THEAD" ||
    tag === "TBODY" ||
    tag === "TFOOT" ||
    tag === "TR";

  for (const prop of WORD_EXPORT_COMPUTED_PROPS) {
    if (isTable && (prop === "width" || prop === "max-width")) continue;
    if (
      isTablePart &&
      (prop === "text-indent" ||
        prop === "margin-left" ||
        prop === "margin-right")
    ) {
      continue;
    }
    if (
      isTableCell &&
      (prop === "padding-top" ||
        prop === "padding-right" ||
        prop === "padding-bottom" ||
        prop === "padding-left" ||
        prop === "line-height" ||
        prop === "height")
    ) {
      continue;
    }
    /* Фиксированная height на tr/table — Word раздувает строки; пересчёт до colgroup давал неверные px */
    if (
      prop === "height" &&
      (tag === "TABLE" ||
        tag === "TBODY" ||
        tag === "THEAD" ||
        tag === "TFOOT" ||
        tag === "TR" ||
        tag === "CAPTION")
    ) {
      continue;
    }
    const v = cs.getPropertyValue(prop);
    if (v === "" || v == null) continue;
    if (prop === "width" || prop === "height") {
      if (v === "auto" || v === "0px") continue;
    }
    el.style.setProperty(prop, v);
  }
}

function inlineComputedStylesDeep(root) {
  if (!(root instanceof HTMLElement)) return;
  copyComputedPresentationToInline(root);
  root.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement) copyComputedPresentationToInline(node);
  });
}

/** Word наследует text-indent с .text_container на блок диаграммы и PNG — сбрасываем после инлайна. */
function applyWordExportSankeyUnitsTextIndentZero(root) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll(".text_report_sankey_unit").forEach((el) => {
    if (el instanceof HTMLElement)
      el.style.setProperty("text-indent", "0", "important");
  });
  root.querySelectorAll(".text_report_sankey_unit img").forEach((el) => {
    if (el instanceof HTMLElement)
      el.style.setProperty("text-indent", "0", "important");
  });
}

/** Нулевой отступ и ширина по окну — только для таблиц (абзацы и диаграммы не трогаем). */
function applyWordExportTableLayoutOnly(root) {
  if (!(root instanceof HTMLElement)) return;
  root
    .querySelectorAll("table, caption, thead, tbody, tfoot, tr, th, td")
    .forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.setProperty("text-indent", "0", "important");
      el.style.setProperty("margin-left", "0", "important");
    });
  root.querySelectorAll("table").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.setProperty("margin", "6px 0", "important");
    el.style.setProperty("margin-right", "0", "important");
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("max-width", "100%", "important");
    el.style.setProperty("box-sizing", "border-box", "important");
    el.setAttribute("width", "100%");
  });
}

/**
 * Веса логических колонок по тексту ячеек (учёт rowspan/colspan), как «автоподбор по содержимому».
 * @param {HTMLTableElement} table
 * @returns {number[]}
 */
function tableLogicalColumnWeights(table) {
  const numRows = table.rows.length;
  if (numRows === 0) return [];

  let ncol = 0;
  for (let r = 0; r < numRows; r++) {
    let sum = 0;
    for (const cell of table.rows[r].cells) sum += cell.colSpan || 1;
    ncol = Math.max(ncol, sum);
  }
  if (ncol === 0) return [];

  const weights = new Array(ncol).fill(0);
  const blocked = Array.from({ length: numRows }, () =>
    Array(ncol).fill(false),
  );

  function addScores(r, c, cs, rs, cell) {
    const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
    let w = Math.min(120, Math.max(text.length, 2));
    if (cell.querySelector(".text_increase, .text_decrease")) w += 6;
    const per = w / cs;
    for (let cc = 0; cc < cs; cc++) {
      if (c + cc < ncol) weights[c + cc] += per;
    }
    for (let rr = r; rr < r + rs; rr++) {
      for (let cc = c; cc < c + cs; cc++) {
        if (rr < numRows && cc < ncol) blocked[rr][cc] = true;
      }
    }
  }

  for (let r = 0; r < numRows; r++) {
    let c = 0;
    const row = table.rows[r];
    for (let i = 0; i < row.cells.length; i++) {
      while (c < ncol && blocked[r][c]) c++;
      const cell = row.cells[i];
      const cs = cell.colSpan || 1;
      const rs = cell.rowSpan || 1;
      addScores(r, c, cs, rs, cell);
      c += cs;
    }
  }

  return weights;
}

/**
 * Проценты ширины колонок для Word: без доминирования первой колонки, минимум на колонку.
 * @param {number[]} weights
 * @returns {number[]}
 */
function weightsToColumnPercents(weights) {
  if (!weights.length) return [];
  let w = weights.map((x) => Math.max(x, 0.5));
  const sumAll = w.reduce((a, b) => a + b, 0);
  if (w[0] > sumAll * 0.34) w[0] = sumAll * 0.22;
  const sum = w.reduce((a, b) => a + b, 0);
  let pct = w.map((x) => (x / sum) * 100);
  const minPct = 7;
  pct = pct.map((p) => Math.max(p, minPct));
  const sum2 = pct.reduce((a, b) => a + b, 0);
  return pct.map((p) => (p / sum2) * 100);
}

/**
 * @param {HTMLTableElement} table
 * @param {number[]} percents
 */
function applyColgroupPercentWidths(table, percents) {
  if (!(table instanceof HTMLTableElement) || percents.length === 0) return;
  let colgroup = table.getElementsByTagName("colgroup")[0];
  if (!colgroup || colgroup.parentElement !== table) {
    colgroup = document.createElement("colgroup");
    const first = table.firstChild;
    if (first) table.insertBefore(colgroup, first);
    else table.appendChild(colgroup);
  }
  colgroup.replaceChildren();
  percents.forEach((p) => {
    const col = document.createElement("col");
    const v = `${p.toFixed(2)}%`;
    col.style.width = v;
    col.setAttribute("width", v);
    colgroup.appendChild(col);
  });
  table.style.setProperty("table-layout", "fixed", "important");
  table.style.setProperty("width", "100%", "important");
  table.setAttribute("width", "100%");
}

/**
 * Пары table.table_bold в клоне и на экране — одинаковый порядок в #text_report.
 */
function applyWordExportTableColumnAutofit(cloneRoot, sourceRoot) {
  const srcList = Array.from(sourceRoot.querySelectorAll("table.table_bold"));
  const dstList = Array.from(cloneRoot.querySelectorAll("table.table_bold"));
  const n = Math.min(srcList.length, dstList.length);
  for (let i = 0; i < n; i++) {
    const src = srcList[i];
    const dst = dstList[i];
    if (!(src instanceof HTMLTableElement) || !(dst instanceof HTMLTableElement))
      continue;
    const weights = tableLogicalColumnWeights(src);
    if (weights.length === 0) continue;
    const percents = weightsToColumnPercents(weights);
    applyColgroupPercentWidths(dst, percents);
  }
}

/** Одинарный line-height; отступы ячейки 1 mm только слева/справа (и для Word). */
function applyWordExportTableCellLineAndPadding(root) {
  if (!(root instanceof HTMLElement)) return;
  root
    .querySelectorAll("table.table_bold th, table.table_bold td")
    .forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.setProperty("line-height", "1", "important");
      el.style.setProperty("padding", "0 1mm", "important");
      el.style.setProperty("box-sizing", "border-box", "important");
      el.style.setProperty("vertical-align", "middle", "important");
      el.style.setProperty("height", "auto", "important");
    });
  root.querySelectorAll("table.table_bold tr").forEach((el) => {
    if (el instanceof HTMLElement) el.style.removeProperty("height");
  });
}

/**
 * Снимает PNG с видимых SVG в sourceRoot, подставляет <img> в клон (cloneRoot) для буфера.
 * Клон вне экрана даёт другой layout → неверный rect и «сжатый» toPng с width/height;
 * Word вставляет картинку по атрибутам — в итоге шрифт выглядел в 2 раза мельче.
 *
 * @param {HTMLElement} cloneRoot — клон отчёта для копирования
 * @param {HTMLElement} sourceRoot — живой #text_report на экране
 */
async function replaceSankeySvgsWithWordFriendlyImages(cloneRoot, sourceRoot) {
  const cloneSvgs = Array.from(
    cloneRoot.querySelectorAll(REPORT_SANKEY_SVG_SELECTOR),
  );
  const sourceSvgs = Array.from(
    sourceRoot.querySelectorAll(REPORT_SANKEY_SVG_SELECTOR),
  );
  const n = Math.min(cloneSvgs.length, sourceSvgs.length);
  if (cloneSvgs.length !== sourceSvgs.length) {
    console.warn(
      "Число диаграмм в клоне и в отчёте не совпало при копировании",
    );
  }
  for (let i = 0; i < n; i++) {
    const placeholderSvg = cloneSvgs[i];
    const liveSvg = sourceSvgs[i];
    const rect = liveSvg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || liveSvg.clientWidth || 0));
    const h = Math.max(1, Math.round(rect.height || liveSvg.clientHeight || 0));
    try {
      const dataUrl = await htmlToImage.toPng(liveSvg, {
        backgroundColor: "#ffffff",
        pixelRatio: SANKEY_CAPTURE_PIXEL_RATIO,
        cacheBust: true,
      });
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "Диаграмма";
      img.setAttribute("width", String(w));
      img.setAttribute("height", String(h));
      img.setAttribute("border", "0");
      img.style.display = "block";
      img.style.width = `${w}px`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.margin = "6px 0 21.5px";
      placeholderSvg.parentNode?.replaceChild(img, placeholderSvg);
    } catch (err) {
      console.error("Не удалось преобразовать диаграмму в PNG для буфера:", err);
    }
  }
}

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

  const copyToBufferAsText = async () => {
    const textContainer = document.getElementById("text_report");
    if (!textContainer) {
      console.error("Элемент #text_report не найден");
      return;
    }

    const tempContainer = document.createElement("div");
    tempContainer.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-99999px";
    tempContainer.style.top = "0";
    tempContainer.style.width = `${Math.max(400, textContainer.offsetWidth || 0)}px`;
    tempContainer.style.backgroundColor = "#ffffff";

    const reportClone = textContainer.cloneNode(true);
    tempContainer.appendChild(reportClone);

    const exportStyleEl = document.createElement("style");
    exportStyleEl.setAttribute("type", "text/css");
    exportStyleEl.textContent = REPORT_WORD_EMBEDDED_CSS;
    tempContainer.insertBefore(exportStyleEl, reportClone);

    document.body.appendChild(tempContainer);

    await replaceSankeySvgsWithWordFriendlyImages(tempContainer, textContainer);

    applyWordExportTableLayoutOnly(reportClone);
    applyWordExportTableColumnAutofit(reportClone, textContainer);
    applyWordExportTableCellLineAndPadding(reportClone);

    inlineComputedStylesDeep(reportClone);

    tempContainer.querySelectorAll("img").forEach((img) => {
      if (img instanceof HTMLElement) copyComputedPresentationToInline(img);
    });

    applyWordExportSankeyUnitsTextIndentZero(reportClone);

    const range = document.createRange();
    range.selectNode(tempContainer);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    try {
      const ok = document.execCommand("copy");
      if (ok) {
        console.log("Отчёт скопирован в буфер (текст + диаграммы как изображения)");
      } else {
        await copyReportHtmlViaClipboardApi(tempContainer);
      }
    } catch (e) {
      console.error("Ошибка при копировании:", e);
      try {
        await copyReportHtmlViaClipboardApi(tempContainer);
      } catch (e2) {
        console.error("Запасной способ буфера обмена не сработал:", e2);
      }
    }

    window.getSelection().removeAllRanges();
    document.body.removeChild(tempContainer);
  };

  /** Word понимает text/html с картинками data:image/png; MS Office с 2007. */
  async function copyReportHtmlViaClipboardApi(container) {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      return;
    }
    const inner = container.innerHTML;
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style type="text/css">${REPORT_WORD_EMBEDDED_CSS}</style></head><body>${inner}</body></html>`;
    const plain = container.innerText || "";
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    console.log("Отчёт скопирован через Clipboard API");
  }

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

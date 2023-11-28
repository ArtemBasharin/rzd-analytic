import React from "react";
import * as htmlToImage from "html-to-image";
// import { saveAs } from "file-saver";
// import { Document, Packer, Paragraph } from "docx";
import { FaCopy, FaDownload } from "react-icons/fa6";
import { useSelector } from "react-redux";

function DownloadButtons(props) {
  const toolPalette = useSelector((state) => state.filters.toolPalette);

  function downloadElementAsSVG() {
    const selectedElement = props.reference.current;
    console.log(selectedElement);
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
    // Создаем клон элемента с текстом и стилями
    tempContainer.appendChild(textContainer.cloneNode(true));

    // Стилизуем временный контейнер (необязательно)
    // tempContainer.style.position = "absolute";
    // tempContainer.style.left = "-9999px";
    // tempContainer.style.width = "1px";
    // tempContainer.style.height = "1px";
    // tempContainer.style.overflow = "hidden";

    document.body.appendChild(tempContainer);

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
    </div>
  );
}

export default DownloadButtons;

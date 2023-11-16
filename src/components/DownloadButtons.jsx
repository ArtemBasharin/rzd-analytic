import React from "react";
import * as htmlToImage from "html-to-image";
import { FaDownload } from "react-icons/fa6";

function DownloadButtons(props) {
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
  return (
    <div className="buttons-copy_container">
      <button className="button-copy" onClick={downloadElementAsSVG}>
        <FaDownload className="button-copy_icon" />
        SVG
      </button>
      <button className="button-copy" onClick={downloadElementAsPNG}>
        <FaDownload className="button-copy_icon" />
        PNG
      </button>
    </div>
  );
}

export default DownloadButtons;

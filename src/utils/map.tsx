import React, { useEffect, useImperativeHandle, useRef, useState } from "react";

type Props = {
  className?: string;
};

const SvgMap = React.forwardRef<SVGSVGElement, Props>(({ className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch("/map.svg")
      .then((response) => response.text())
      .then((rawSvg) => {
        if (!isMounted) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawSvg, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg) return;

        svg.classList.add("map-highorder");
        if (className) svg.classList.add(className);

        setSvgMarkup(svg.outerHTML);
      })
      .catch(() => {
        if (isMounted) setSvgMarkup("");
      });

    return () => {
      isMounted = false;
    };
  }, [className]);

  useImperativeHandle(ref, () => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) return svg as SVGSVGElement;
    return document.createElementNS("http://www.w3.org/2000/svg", "svg");
  });

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
  );
});

export default SvgMap;

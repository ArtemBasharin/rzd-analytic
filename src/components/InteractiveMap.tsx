import { useEffect, useRef } from "react";
import { SvgMap } from "../utils/map";

const InteractiveMap = () => {
  const svgRef = useRef(null);

  useEffect(() => {}, []);
  return <SvgMap ref={svgRef} />;
};

export default InteractiveMap;

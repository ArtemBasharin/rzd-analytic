import { ChartStyle } from "./types";

export interface ColorPalette {
  id: string;
  label: string;
  colors: string[];
}

/** Presets similar to Power BI / modern BI theme chips. */
export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "traffic",
    label: "Светофор",
    colors: ["#E53935", "#FB8C00", "#43A047", "#1E88E5", "#8E24AA"],
  },
  {
    id: "ocean",
    label: "Океан",
    colors: ["#01579B", "#0288D1", "#26C6DA", "#80DEEA", "#004D40"],
  },
  {
    id: "warm",
    label: "Тёплый",
    colors: ["#BF360C", "#E65100", "#FF8F00", "#F9A825", "#C62828"],
  },
  {
    id: "cool",
    label: "Холодный",
    colors: ["#283593", "#5C6BC0", "#7986CB", "#9FA8DA", "#C5CAE9"],
  },
  {
    id: "mono",
    label: "Моно",
    colors: ["#212121", "#424242", "#616161", "#757575", "#9E9E9E"],
  },
  {
    id: "pastel",
    label: "Пастель",
    colors: ["#EF9A9A", "#FFCC80", "#A5D6A7", "#90CAF9", "#CE93D8"],
  },
  {
    id: "corporate",
    label: "Корп.",
    colors: ["#0D47A1", "#1565C0", "#1976D2", "#42A5F5", "#90CAF9"],
  },
  {
    id: "contrast",
    label: "Контраст",
    colors: ["#D50000", "#FF6D00", "#FFD600", "#00C853", "#2962FF"],
  },
];

export function findPalette(id: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === id) ?? COLOR_PALETTES[0];
}

export function styleFromPalette(paletteId: string, prev?: ChartStyle): ChartStyle {
  const pal = findPalette(paletteId);
  return {
    ...(prev ?? {
      strokeColor: "#1a1a1a",
      strokeWidth: 0,
      shadow: false,
      rounded: true,
      showGrid: true,
      showYAxis: true,
    }),
    paletteId: pal.id,
    fillColors: [...pal.colors],
  };
}

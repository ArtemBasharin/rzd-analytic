interface SankeyNode {
  name?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  names: (string | null)[];
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export {};

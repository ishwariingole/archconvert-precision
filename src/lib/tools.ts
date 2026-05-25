export type Tool = { id: string; name: string; description: string; costInr: number; badge?: string };

export const TOOLS: Tool[] = [
  { id: "grey", name: "Grey Scaling", costInr: 50,
    description: "Converts your drawing to a clean professional greyscale output, ready for documentation and printing." },
  // { id: "grey-hatch", name: "Grey Scaling + Remove Hatches", costInr: 50,
  //   description: "Greyscales the drawing and removes all hatch patterns, producing a minimal clean line drawing." },
  // { id: "grey-layer", name: "Grey Scaling + 5 Layer Creation", costInr: 50,
  //   description: "Greyscales and restructures your drawing into 5 organised CAD layers for better file management." },
  // { id: "grey-hatch-layer", name: "Grey Scaling + Remove Hatches + 5 Layer Creation", costInr: 50,
  //   badge: "Complete Pipeline",
  //   description: "Complete pipeline — greyscale, hatch removal, and full 5-layer CAD structuring in a single pass." },
];

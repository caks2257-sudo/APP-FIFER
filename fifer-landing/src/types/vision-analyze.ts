export type VisionSuggestedAction = { id: string; label: string };

export type VisionAnalyzeResponse = {
  extractedText: string;
  suggestedActions: VisionSuggestedAction[];
  source: "gemini" | "mock";
};

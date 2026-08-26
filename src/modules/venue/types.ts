import type { MapPoiCategory } from "@/modules/venue/categories";

export type DetectedPoiProposal = {
  name: string;
  category: MapPoiCategory;
  x: number;
  y: number;
  standCode: string | null;
  confidence: number | null;
};

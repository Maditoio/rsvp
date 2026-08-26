export const MAP_POI_CATEGORIES = [
  "entrance",
  "exit",
  "registration",
  "main_stage",
  "session_room",
  "meeting_room",
  "toilet",
  "accessible_toilet",
  "coffee",
  "food",
  "networking",
  "vip",
  "exhibition",
  "exhibitor_stand",
  "first_aid",
  "prayer_room",
  "parking",
  "lift",
  "stairs",
  "information",
  "cloakroom",
] as const;

export type MapPoiCategory = (typeof MAP_POI_CATEGORIES)[number];

export const MAP_POI_CATEGORY_LABELS: Record<MapPoiCategory, string> = {
  entrance: "Entrance",
  exit: "Exit",
  registration: "Registration",
  main_stage: "Main stage",
  session_room: "Session room",
  meeting_room: "Meeting room",
  toilet: "Toilet",
  accessible_toilet: "Accessible toilet",
  coffee: "Coffee",
  food: "Food",
  networking: "Networking",
  vip: "VIP area",
  exhibition: "Exhibition",
  exhibitor_stand: "Exhibitor stand",
  first_aid: "First aid",
  prayer_room: "Prayer room",
  parking: "Parking",
  lift: "Lift",
  stairs: "Stairs",
  information: "Information desk",
  cloakroom: "Cloakroom",
};

export function isMapPoiCategory(value: string): value is MapPoiCategory {
  return (MAP_POI_CATEGORIES as readonly string[]).includes(value);
}

export function mapPoiCategoryLabel(category: string) {
  if (isMapPoiCategory(category)) return MAP_POI_CATEGORY_LABELS[category];
  return category;
}

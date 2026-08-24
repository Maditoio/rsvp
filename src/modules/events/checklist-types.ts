export type ChecklistPhase = "customize" | "launch" | "organize" | "follow_up";

export type ChecklistItem = {
  id: string;
  phase: ChecklistPhase;
  title: string;
  description: string;
  href: string;
  optional?: boolean;
  complete: boolean;
};

export type ChecklistResult = {
  items: ChecklistItem[];
  completed: number;
  total: number;
  percent: number;
};

export const CHECKLIST_PHASES: {
  id: ChecklistPhase;
  label: string;
}[] = [
  { id: "customize", label: "Customize" },
  { id: "launch", label: "Launch" },
  { id: "organize", label: "Organize" },
  { id: "follow_up", label: "Follow up" },
];

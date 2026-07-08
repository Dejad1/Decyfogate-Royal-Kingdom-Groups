// Class structure and curriculum, transcribed from the build brief
// sections 2.1 and 2.2. Every level uses the standard 3-arm pattern
// (A/B/C). For Royal Kingdom College, arm A/B/C doubles as the SS
// department track (Science/Arts/Commercial) -- a common real-world
// pattern that also gives a clean way to scope elective subject-teacher
// links to the right units. JSS arms carry no department meaning.

export interface LevelDef {
  name: string;
  order: number;
  units: string[];
  /** SS only: department per arm, used to select elective subjects. */
  departmentByUnit?: Record<string, "Science" | "Arts" | "Commercial">;
}

export const NURSERY_PRIMARY_LEVELS: LevelDef[] = [
  { name: "Reception 1", order: 1, units: ["A", "B", "C"] },
  { name: "Reception 2", order: 2, units: ["A", "B", "C"] },
  { name: "Nursery 1", order: 3, units: ["A", "B", "C"] },
  { name: "Nursery 2", order: 4, units: ["A", "B", "C"] },
  { name: "Nursery 3", order: 5, units: ["A", "B", "C"] },
  { name: "Primary 1", order: 6, units: ["A", "B", "C"] },
  { name: "Primary 2", order: 7, units: ["A", "B", "C"] },
  { name: "Primary 3", order: 8, units: ["A", "B", "C"] },
  { name: "Primary 4", order: 9, units: ["A", "B", "C"] },
  { name: "Primary 5", order: 10, units: ["A", "B", "C"] },
  { name: "Primary 6", order: 11, units: ["A", "B", "C"] },
];

const SS_DEPARTMENT_BY_UNIT = { A: "Science", B: "Arts", C: "Commercial" } as const;

export const SECONDARY_LEVELS: LevelDef[] = [
  { name: "JSS 1", order: 1, units: ["A", "B", "C"] },
  { name: "JSS 2", order: 2, units: ["A", "B", "C"] },
  { name: "JSS 3", order: 3, units: ["A", "B", "C"] },
  { name: "SS 1", order: 4, units: ["A", "B", "C"], departmentByUnit: SS_DEPARTMENT_BY_UNIT },
  { name: "SS 2", order: 5, units: ["A", "B", "C"], departmentByUnit: SS_DEPARTMENT_BY_UNIT },
  { name: "SS 3", order: 6, units: ["A", "B", "C"], departmentByUnit: SS_DEPARTMENT_BY_UNIT },
];

export const JSS_CORE_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Civic Education",
  "Business Studies",
  "Computer Studies/ICT",
  "French",
  "Christian Religious Studies",
  "Physical and Health Education",
  "Home Economics",
  "Agricultural Science",
  "Yoruba Language",
  "Fine Arts",
  "Music",
];

// Compulsory across every SS student regardless of department.
export const SS_COMPULSORY_SUBJECTS = ["English Language", "Mathematics", "Civic Education"];

export const SS_DEPARTMENT_SUBJECTS: Record<"Science" | "Arts" | "Commercial", string[]> = {
  Science: ["Physics", "Chemistry", "Biology", "Further Mathematics", "Agricultural Science", "Geography"],
  Arts: ["Literature in English", "Government", "Christian Religious Studies", "History", "Fine Arts"],
  Commercial: ["Commerce", "Financial Accounting", "Economics", "Marketing"],
};

// Department tag stored on the Subject row itself. Subjects that are core
// at JSS level (Agricultural Science, Christian Religious Studies, Fine
// Arts) but also appear as an SS department elective keep department=null
// since one Subject row is shared across both contexts.
export const SUBJECT_DEPARTMENT: Record<string, "Science" | "Arts" | "Commercial" | null> = {
  Physics: "Science",
  Chemistry: "Science",
  Biology: "Science",
  "Further Mathematics": "Science",
  Geography: "Science",
  "Literature in English": "Arts",
  Government: "Arts",
  History: "Arts",
  Commerce: "Commercial",
  "Financial Accounting": "Commercial",
  Economics: "Commercial",
  Marketing: "Commercial",
};

export function allCollegeSubjectNames(): string[] {
  const names = new Set<string>(JSS_CORE_SUBJECTS);
  Object.values(SS_DEPARTMENT_SUBJECTS).forEach((list) => list.forEach((s) => names.add(s)));
  return Array.from(names);
}

// Each bundle becomes one Subject Teacher, teaching all listed subjects.
// 18 bundles total, matching the brief's "roughly 15-20 across the
// subject list" -- teachers are shared across JSS and SS wherever a
// subject appears in both (e.g. English Language, Agricultural Science),
// which is exactly how a real secondary school staffs a subject
// department instead of hiring a separate specialist per level.
export const SUBJECT_TEACHER_BUNDLES: string[][] = [
  ["English Language", "Literature in English"],
  ["Mathematics", "Further Mathematics"],
  ["Basic Science", "Biology"],
  ["Basic Technology", "Physics"],
  ["Chemistry", "Agricultural Science"],
  ["Social Studies", "Government"],
  ["Civic Education"],
  ["Business Studies", "Commerce", "Financial Accounting"],
  ["Computer Studies/ICT"],
  ["French"],
  ["Christian Religious Studies"],
  ["Physical and Health Education"],
  ["Home Economics", "Marketing"],
  ["Yoruba Language"],
  ["Fine Arts"],
  ["Music"],
  ["History", "Economics"],
  ["Geography"],
];

/** Subjects a given class unit's students take, driven by level + department. */
export function subjectsForUnit(level: LevelDef, unitName: string): string[] {
  if (!level.departmentByUnit) {
    return JSS_CORE_SUBJECTS;
  }
  const department = level.departmentByUnit[unitName];
  return [...SS_COMPULSORY_SUBJECTS, ...SS_DEPARTMENT_SUBJECTS[department]];
}

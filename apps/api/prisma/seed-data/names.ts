import { intBetween, pick, Rng } from "./rng";

// Realistic Nigerian name pools spanning the country's major naming
// traditions, so 51 class rosters don't read as five names copy-pasted.
// Surnames are pooled separately from first names and mixed across
// ethnicities (as commonly happens in real Lagos/Abuja private schools
// through intermarriage) rather than kept in strict matching triples.

const YORUBA_MALE_FIRST = [
  "Ayodele", "Oluwaseun", "Babatunde", "Adewale", "Oluwafemi", "Adeyemi",
  "Olumide", "Ayomide", "Kayode", "Tunde", "Segun", "Femi", "Damilare",
  "Gbenga", "Oluwatobi", "Bolaji", "Tobiloba", "Adebayo", "Oluwadamilare", "Korede",
];
const YORUBA_FEMALE_FIRST = [
  "Folake", "Bisi", "Yemisi", "Temitope", "Funmilayo", "Aduke", "Omolara",
  "Bukola", "Kemi", "Titilayo", "Morenike", "Adenike", "Iyabo", "Toyin",
  "Ronke", "Feyisayo", "Oluwaseun", "Abisola", "Simisola", "Ifeoluwa",
];
const YORUBA_SURNAMES = [
  "Ogunleye", "Afolabi", "Adebayo", "Oyelaran", "Fashola", "Balogun",
  "Adegoke", "Oyelakin", "Sanni", "Bakare", "Ogundipe", "Fagbenle",
  "Akintola", "Adeniran", "Familusi", "Fasanya", "Owolabi", "Adeyemi",
  "Oduya", "Ojo",
];

const IGBO_MALE_FIRST = [
  "Chukwuemeka", "Chidi", "Obinna", "Ikenna", "Chinedu", "Emeka", "Kelechi",
  "Uchenna", "Nnamdi", "Chibuzor", "Chukwudi", "Ebuka", "Onyekachi",
  "Chijioke", "Ifeanyi", "Tochukwu", "Kenechukwu", "Somtochukwu",
];
const IGBO_FEMALE_FIRST = [
  "Adaeze", "Chiamaka", "Ngozi", "Amarachi", "Chinwe", "Ifeoma", "Nkechi",
  "Adaobi", "Ogechi", "Chidinma", "Chinyere", "Uzoamaka", "Nneka",
  "Somkele", "Chimamanda", "Ejiro", "Zikoranachukwuka", "Kosisochukwu",
];
const IGBO_SURNAMES = [
  "Okafor", "Okonkwo", "Eze", "Nwosu", "Okoye", "Chukwu", "Obi", "Nwankwo",
  "Onyeka", "Anyanwu", "Iwu", "Ezeh", "Igwe", "Madu", "Okeke", "Nwachukwu",
];

const HAUSA_MALE_FIRST = [
  "Abubakar", "Ibrahim", "Musa", "Yusuf", "Ahmad", "Aliyu", "Sani", "Bello",
  "Usman", "Suleiman", "Nuhu", "Garba", "Lawal", "Idris", "Isah", "Auwal",
];
const HAUSA_FEMALE_FIRST = [
  "Amina", "Fatima", "Zainab", "Hauwa", "Aisha", "Halima", "Maryam",
  "Safiya", "Rukayya", "Khadija", "Hafsat", "Zulaihat", "Rahma", "Bilkisu",
  "Asmau", "Jamila",
];
const HAUSA_SURNAMES = [
  "Mohammed", "Abdullahi", "Yusuf", "Ibrahim", "Sani", "Usman", "Garba",
  "Aliyu", "Suleiman", "Danjuma", "Lawal", "Bello", "Adamu", "Shehu", "Musa",
];

const ENGLISH_MALE_FIRST = [
  "David", "Daniel", "Samuel", "Emmanuel", "Joseph", "Michael", "Success",
  "Divine", "Praise", "Godswill", "Victor", "Andrew", "Anthony",
];
const ENGLISH_FEMALE_FIRST = [
  "Grace", "Faith", "Joy", "Precious", "Victoria", "Elizabeth", "Blessing",
  "Peace", "Favour", "Mercy", "Gift", "Charity",
];
const ENGLISH_SURNAMES = [
  "Williams", "Johnson", "Okoro", "James", "Peters", "Thomas", "Edwards",
  "Nwachukwu", "Braimoh", "Cole", "Coker", "Da-Silva",
];

const GUARDIAN_RELATIONSHIPS_PRIMARY = ["Mother", "Father"];
const GUARDIAN_RELATIONSHIPS_SECONDARY = ["Aunt", "Uncle", "Grandmother", "Grandfather", "Guardian", "Elder Sibling"];

const ALL_SURNAMES = [...YORUBA_SURNAMES, ...IGBO_SURNAMES, ...HAUSA_SURNAMES, ...ENGLISH_SURNAMES];

export interface GeneratedPerson {
  fullName: string;
  gender: "MALE" | "FEMALE";
}

// Weighted so the roster reads like a real Lagos/Abuja private school:
// Yoruba/Igbo majority, meaningful Hausa and English/Christian minority.
function ethnicityBucket(rng: Rng): "YORUBA" | "IGBO" | "HAUSA" | "ENGLISH" {
  const r = rng();
  if (r < 0.38) return "YORUBA";
  if (r < 0.68) return "IGBO";
  if (r < 0.84) return "HAUSA";
  return "ENGLISH";
}

export function generatePerson(rng: Rng, gender?: "MALE" | "FEMALE"): GeneratedPerson {
  const resolvedGender = gender ?? (rng() < 0.5 ? "MALE" : "FEMALE");
  const bucket = ethnicityBucket(rng);

  const firstPool =
    bucket === "YORUBA"
      ? resolvedGender === "MALE" ? YORUBA_MALE_FIRST : YORUBA_FEMALE_FIRST
      : bucket === "IGBO"
      ? resolvedGender === "MALE" ? IGBO_MALE_FIRST : IGBO_FEMALE_FIRST
      : bucket === "HAUSA"
      ? resolvedGender === "MALE" ? HAUSA_MALE_FIRST : HAUSA_FEMALE_FIRST
      : resolvedGender === "MALE" ? ENGLISH_MALE_FIRST : ENGLISH_FEMALE_FIRST;

  const firstName = pick(rng, firstPool);
  // Surnames mixed across pools independent of first-name ethnicity --
  // intermarriage and adoption make this the realistic case, not the edge case.
  const surname = pick(rng, ALL_SURNAMES);

  return { fullName: `${firstName} ${surname}`, gender: resolvedGender };
}

export function generatePhone(rng: Rng): string {
  const prefixes = ["0803", "0805", "0806", "0810", "0813", "0814", "0816", "0703", "0706", "0802", "0812", "0902", "0901", "0705"];
  const prefix = pick(rng, prefixes);
  const rest = String(intBetween(rng, 0, 9999999)).padStart(7, "0");
  return `${prefix}${rest}`;
}

export function pickGuardianRelationship(rng: Rng, isPrimary: boolean): string {
  return isPrimary ? pick(rng, GUARDIAN_RELATIONSHIPS_PRIMARY) : pick(rng, GUARDIAN_RELATIONSHIPS_SECONDARY);
}

export function slugifyForEmail(fullName: string, disambiguator: string | number): string {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${base}.${disambiguator}`;
}

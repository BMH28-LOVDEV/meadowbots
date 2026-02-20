const TEAM_MEMBERS = [
  "Alex Gianelloni",
  "Chantelle Wong",
  "Cole Schubert",
  "Gabriel Efendi",
  "Benjamin Hale",
  "Max Tran",
  "Travis Quinn",
  "Zoe GK",
  "Clara Tsang",
  "Kayleb Hauge",
  "Julian Chaudhry",
  "Mason Howard",
  "Heath Wells",
  "Michael Xie",
  "Jason Xie",
  "Jaden Gilmore",
  "Rock Kuperman",
  "Naila Nauman",
  "William Hu",
  "Lucas Zhang",
  "Isabelle Liang",
  "Jude Trujillo",
];

// Explicit alternate names/aliases
const ALIASES: Record<string, string> = {
  "maxwell": "Max Tran",
  "maxwell tran": "Max Tran",
  "ben": "Benjamin Hale",
  "ben hale": "Benjamin Hale",
  "will": "William Hu",
  "will hu": "William Hu",
};

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findTeamMember(input: string): string | null {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return null;

  if (
    normalizedInput === "meadowbot master" ||
    normalizedInput === "master meadowbot" ||
    normalizedInput === "master"
  ) return "MeadowBot Master";

  // Check explicit aliases
  if (ALIASES[normalizedInput]) return ALIASES[normalizedInput];

  // Match full name, first name, or last name (case-insensitive)
  for (const member of TEAM_MEMBERS) {
    const normalizedMember = normalize(member);
    const parts = normalizedMember.split(" ");
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    if (
      normalizedInput === normalizedMember ||
      normalizedInput === firstName ||
      normalizedInput === lastName
    ) {
      return member;
    }
  }

  return null;
}

export { TEAM_MEMBERS };

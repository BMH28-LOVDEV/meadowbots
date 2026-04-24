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
  "alexander": "Alex Gianelloni",
  "alexander gianelloni": "Alex Gianelloni",
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

  if (
    normalizedInput === "dashboard" ||
    normalizedInput === "scout dashboard" ||
    normalizedInput === "viewer"
  ) return "Scout Dashboard";

  if (
    normalizedInput === "lockdown" ||
    normalizedInput === "lock down" ||
    normalizedInput === "emergency"
  ) return "Lockdown";

  if (
    normalizedInput === "lets go" ||
    normalizedInput === "letsgo" ||
    normalizedInput === "lets go" ||
    normalizedInput === "go" ||
    normalizedInput === "celebrate" ||
    normalizedInput === "celebration" ||
    normalizedInput === "party"
  ) return "Lets Go";

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
      normalizedInput === lastName ||
      normalizedInput === `${firstName} ${lastName[0]}`
    ) {
      return member;
    }
  }

  return null;
}

// Drive team members — not eligible for scouting assignments
export const DRIVE_TEAM = [
  "William Hu",
  "Rock Kuperman",
  "Isabelle Liang",
  "Benjamin Hale",
  "Max Tran",
  "Cole Schubert",
  "Heath Wells",
  "Mason Howard",
  "Naila Nauman",
];

export { TEAM_MEMBERS };

const KNOWN_TEAM_NAMES: Record<string, string> = {
  "254": "The Cheesy Poofs",
};

// Title-case a team name entered by scouters (e.g. "meadowBOTS" -> "Meadowbots")
export function titleCaseTeamName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function resolveTeamName(teamNumber: string | null | undefined, teamName: string | null | undefined): string {
  return titleCaseTeamName(teamName) || KNOWN_TEAM_NAMES[(teamNumber || "").trim()] || "";
}

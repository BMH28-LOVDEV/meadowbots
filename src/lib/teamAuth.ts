// Fuzzy name matching for team members
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
];

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z ]/g, "") // remove non-alpha except spaces
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function findTeamMember(input: string): string | null {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return null;

  // Master account
  if (normalizedInput === "master data") return "Master Data";

  let bestMatch: string | null = null;
  let bestScore = Infinity;

  for (const member of TEAM_MEMBERS) {
    const normalizedMember = normalize(member);
    const parts = normalizedMember.split(" ");
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1]?.[0] ?? "";

    // Build candidate strings to match against
    const candidates = [
      normalizedMember,                        // full name
      `${firstName} ${lastInitial}`,           // first name + last initial
      firstName,                               // first name only
    ];

    for (const candidate of candidates) {
      const distance = levenshtein(normalizedInput, candidate);
      const threshold = Math.max(2, Math.floor(candidate.length * 0.35));

      if (distance < bestScore && distance <= threshold) {
        bestScore = distance;
        bestMatch = member;
      }
    }
  }

  return bestMatch;
}

export { TEAM_MEMBERS };

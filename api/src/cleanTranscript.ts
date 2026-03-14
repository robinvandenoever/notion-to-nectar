// NOTE: keep in sync with project-bee/services/api/src/cleanTranscript.ts
type Transform = (text: string) => string;

// ---------------------------------------------------------------------------
// Individual transforms
// ---------------------------------------------------------------------------

function stripFillerWords(text: string): string {
  return text.replace(/\b(um+|uh+|hmm+)\b/gi, "");
}

function normalizePercent(text: string): string {
  // "80 percent" | "80 per cent" → "80%"
  // Number-word phase ("eighty percent") is deferred until real recording data
  // is available to validate against.
  return text.replace(/(\d+)\s+per\s?cent\b/gi, "$1%");
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, first: 1,
  two: 2, second: 2,
  three: 3, third: 3,
  four: 4, fourth: 4,
  five: 5, fifth: 5,
  six: 6, sixth: 6,
  seven: 7, seventh: 7,
  eight: 8, eighth: 8,
  nine: 9, ninth: 9,
  ten: 10, tenth: 10,
  eleven: 11, eleventh: 11,
  twelve: 12, twelfth: 12,
  thirteen: 13, thirteenth: 13,
  fourteen: 14, fourteenth: 14,
  fifteen: 15, fifteenth: 15,
  sixteen: 16, sixteenth: 16,
  seventeen: 17, seventeenth: 17,
  eighteen: 18, eighteenth: 18,
  nineteen: 19, nineteenth: 19,
  twenty: 20, twentieth: 20,
};

const NUMBER_WORD_PATTERN = Object.keys(NUMBER_WORDS).join("|");

function normalizeFrameReferences(text: string): string {
  // Pass 1: "frames seven and eight" → "Frame 7 and Frame 8"
  // Must run before pass 2 so the compound pattern is consumed first.
  text = text.replace(
    new RegExp(
      `\\bframes?\\s+(?:number\\s+)?(${NUMBER_WORD_PATTERN})\\s+and\\s+(${NUMBER_WORD_PATTERN})\\b`,
      "gi"
    ),
    (_match, a, b) => `Frame ${NUMBER_WORDS[a.toLowerCase()]} and Frame ${NUMBER_WORDS[b.toLowerCase()]}`
  );
  // Pass 2: "frame two" | "frame number two" → "Frame 2"
  text = text.replace(
    new RegExp(`\\bframes?\\s+(?:number\\s+)?(${NUMBER_WORD_PATTERN})\\b`, "gi"),
    (_match, word) => `Frame ${NUMBER_WORDS[word.toLowerCase()]}`
  );
  // Pass 3: "second frame" → "Frame 2"
  text = text.replace(
    new RegExp(`\\b(${NUMBER_WORD_PATTERN})\\s+frames?\\b`, "gi"),
    (_match, word) => `Frame ${NUMBER_WORDS[word.toLowerCase()]}`
  );
  return text;
}

function normalizeEOQVariants(text: string): string {
  // Stub — tune against real recordings after utterance pipeline is in place
  return text
    .replace(/\bE\.O\.Q\.?\b/gi, "EOQ")
    .replace(/\bee[\s-]oh[\s-]queue\b/gi, "EOQ")
    .replace(/\beoq\b/gi, "EOQ");
}

// Lookup map with \b word-boundary replacement.
// Stub with confirmed Deepgram mishearings only.
// Do not guess — expand after benchmark runs confirm specific mishearings.
const VOCAB_MAP: Record<string, string> = {
  brute: "brood",
};

function correctDomainVocabulary(text: string): string {
  return Object.entries(VOCAB_MAP).reduce(
    (t, [wrong, right]) => t.replace(new RegExp(`\\b${wrong}\\b`, "gi"), right),
    text
  );
}

function collapseWhitespace(text: string): string {
  // Preserve intentional newlines; collapse only spaces and tabs
  return text.replace(/[ \t]+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

const transforms: Transform[] = [
  stripFillerWords,
  // normalizePercent,
  normalizeFrameReferences,
  normalizeEOQVariants,
  correctDomainVocabulary,
  collapseWhitespace, // always last
];

export function cleanTranscript(text: string): string {
  return transforms.reduce((t, fn) => fn(t), text);
}

export function cleanUtterances<T extends { transcript: string }>(utterances: T[]): T[] {
  return utterances.map(u => ({ ...u, transcript: cleanTranscript(u.transcript) }));
}

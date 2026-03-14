// NOTE: keep in sync with project-bee/services/api/src/cleanTranscript.ts
type Transform = (text: string) => string;

// ---------------------------------------------------------------------------
// Individual transforms
// ---------------------------------------------------------------------------

function stripFillerWords(text: string): string {
  return text.replace(/\b(um+|uh+|hmm+)\b/gi, "");
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

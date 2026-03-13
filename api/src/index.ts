import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import express from "express";
import cors from "cors";
import multer from "multer";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createDeepgram } from "@deepgram/sdk";
import { getPool } from "./db.js";

const app = express();
const pool = getPool();

app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:5173"],
  })
);
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

/**
 * ---------------------------
 * Basic endpoints
 * ---------------------------
 */

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/hives", async (_req, res) => {
  const result = await pool.query(
    "select id, name, apiary_name, frame_count, created_at from hives order by created_at desc"
  );
  res.json({ hives: result.rows });
});

const CreateHiveSchema = z.object({
  name: z.string().min(1),
  apiaryName: z.string().optional(),
  frameCount: z.number().int().min(1).optional(),
});

app.post("/hives", async (req, res) => {
  const parsed = CreateHiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { name, apiaryName, frameCount } = parsed.data;

  const result = await pool.query(
    "insert into hives (name, apiary_name, frame_count) values ($1, $2, $3) returning id, name, apiary_name, frame_count, created_at",
    [name, apiaryName ?? null, frameCount ?? 10]
  );

  res.status(201).json({ hive: result.rows[0] });
});

const UpdateHiveSchema = z.object({
  name: z.string().min(1).optional(),
  apiaryName: z.string().optional(),
  frameCount: z.number().int().min(1).optional(),
});

app.patch("/hives/:id", async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const parsed = UpdateHiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { name, apiaryName, frameCount } = parsed.data;

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(name); }
  if (apiaryName !== undefined) { updates.push(`apiary_name = $${values.length + 1}`); values.push(apiaryName); }
  if (frameCount !== undefined) { updates.push(`frame_count = $${values.length + 1}`); values.push(frameCount); }

  if (updates.length === 0) {
    return res.status(400).json({ error: "no_fields_to_update" });
  }

  values.push(id);
  const result = await pool.query(
    `update hives set ${updates.join(", ")} where id = $${values.length} returning id, name, apiary_name, frame_count, created_at`,
    values
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ hive: result.rows[0] });
});

app.delete("/hives/:id", async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const result = await pool.query("delete from hives where id = $1 returning id", [id]);

  if (!result.rows.length) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ deleted: true });
});

/**
 * ---------------------------
 * 1) Transcription (audio -> text)
 * ---------------------------
 */
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return res.status(500).json({ error: "server_missing_deepgram_key" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }

    const deepgram = createDeepgram(process.env.DEEPGRAM_API_KEY);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      req.file.buffer,
      { model: "nova-2", mimetype: req.file.mimetype || "audio/webm", utterances: true }
    );

    if (error) throw error;

    const transcriptText =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    const utterances = (result?.results?.utterances ?? []).map((u: any) => ({
      start: u.start,
      end: u.end,
      transcript: u.transcript,
    }));

    res.json({ transcriptText, utterances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "transcription_failed" });
  }
});

/**
 * ---------------------------
 * 2) Extraction (text -> structured report)
 * ---------------------------
 */

const FrameSideSchema = z.object({
  empty: z.boolean().optional(),

  comb_built_pct: z.number().min(0).max(100).optional(),

  honey_pct: z.number().min(0).max(100).optional(),
  honey_capped_pct: z.number().min(0).max(100).optional(),

  brood_pct: z.number().min(0).max(100).optional(),
  pollen_pct: z.number().min(0).max(100).optional(),

  eggs: z.boolean().optional(),
  larvae: z.boolean().optional(),

  notes: z.string().optional(),
});

const FrameReportSchema = z.object({
  frame_number: z.number().int().min(1),
  outside: FrameSideSchema.optional(),
  inside: FrameSideSchema.optional(),
  notes: z.string().optional(),
});

const ExtractResponseSchema = z.object({
  frames: z.array(FrameReportSchema),

  totals: z.object({
    frames_reported: z.number().int().min(0),
    honey_equiv_frames: z.number().min(0).optional(),
    brood_equiv_frames: z.number().min(0).optional(),
    pollen_equiv_frames: z.number().min(0).optional(),
  }),

  queen: z
    .object({
      mentioned: z.boolean(),
      eoq: z.boolean().optional(),
      status_note: z.string().optional(),
    })
    .optional(),

  questions: z.array(z.string()).default([]),
});

const UtteranceSchema = z.object({
  start: z.number(),
  end: z.number(),
  transcript: z.string(),
});

const ExtractBodySchema = z.object({
  transcriptText: z.string().min(1),
  frameCount: z.number().int().min(1).optional(),
  utterances: z.array(UtteranceSchema).optional(),
});

type Utterance = { start: number; end: number; transcript: string };
type ChunkResult = { intro: string[]; frames: Map<number, string[]>; outro: string[] };

function chunkUtterancesByFrame(utterances: Utterance[]): ChunkResult {
  const intro: string[] = [];
  const outro: string[] = [];
  const frames = new Map<number, string[]>();
  let currentFrame: number | null = null;

  // Find index of the last utterance that contains any frame mention
  let lastFrameIdx = -1;
  for (let i = utterances.length - 1; i >= 0; i--) {
    if (/\bframe(?:\s+number)?\s+(\d+)\b/i.test(utterances[i].transcript)) {
      lastFrameIdx = i;
      break;
    }
  }

  for (let i = 0; i < utterances.length; i++) {
    const u = utterances[i];
    const allMatches = [...u.transcript.matchAll(/\bframe(?:\s+number)?\s+(\d+)\b/gi)];

    if (allMatches.length > 0) {
      // Assign utterance to every frame mentioned (e.g. "Frames 7 and 8 are honey")
      const mentioned = new Set(allMatches.map((m) => parseInt(m[1], 10)));
      for (const frameNum of mentioned) {
        const existing = frames.get(frameNum) ?? [];
        existing.push(u.transcript);
        frames.set(frameNum, existing);
      }
      // Subsequent utterances without a frame mention continue under the last one
      currentFrame = parseInt(allMatches[allMatches.length - 1][1], 10);
    } else if (currentFrame === null) {
      intro.push(u.transcript);
    } else if (i > lastFrameIdx) {
      // After the last frame mention — global closing remarks, not frame-local facts
      outro.push(u.transcript);
    } else {
      const existing = frames.get(currentFrame) ?? [];
      existing.push(u.transcript);
      frames.set(currentFrame, existing);
    }
  }

  return { intro, frames, outro };
}

function formatChunkedInput(result: ChunkResult, frameCount?: number): string {
  const parts: string[] = [];

  if (frameCount !== undefined) {
    parts.push(`Frame count (if known): ${frameCount}`);
  }

  if (result.intro.length > 0) {
    parts.push(`General notes:\n${result.intro.map((t) => `"${t}"`).join("\n")}`);
  }

  const entries = Array.from(result.frames.entries()).sort(([a], [b]) => a - b);
  for (const [frameNum, texts] of entries) {
    parts.push(`Frame ${frameNum}:\n${texts.map((t) => `"${t}"`).join("\n")}`);
  }

  if (result.outro.length > 0) {
    parts.push(`Closing notes:\n${result.outro.map((t) => `"${t}"`).join("\n")}`);
  }

  return parts.join("\n\n");
}

/**
 * Regex fallback (kept so the app still works if LLM fails/quota/etc.)
 */
function extractWithRegex(transcriptText: string) {
  type FrameSide = z.infer<typeof FrameSideSchema>;
  type FrameReport = z.infer<typeof FrameReportSchema>;

  const frames: FrameReport[] = [];

  const chunks = transcriptText
    .replace(/\n/g, " ")
    .split(/(?=Frame\s+number\s+\d+|Frame\s+\d+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const match = chunk.match(/Frame\s+(?:number\s+)?(\d+)/i);
    if (!match) continue;

    const frame_number = Number(match[1]);
    const lower = chunk.toLowerCase();

    const outside: FrameSide = {};
    const inside: FrameSide = {};

    const pct = (re: RegExp) => {
      const m = chunk.match(re);
      return m ? Number(m[1]) : undefined;
    };

    if (lower.includes("empty")) {
      const hasOutside = lower.includes("on the outside");
      const hasInside = lower.includes("on the inside");
      if (hasOutside) outside.empty = true;
      if (hasInside) inside.empty = true;
      if (!hasOutside && !hasInside) {
        outside.empty = true;
        inside.empty = true;
      }
    }

    const combPct =
      pct(/comb[^0-9]{0,30}about\s+(\d+)\s*%/i) ?? pct(/comb[^0-9]{0,30}(\d+)\s*%/i);
    if (combPct !== undefined) {
      if (lower.includes("on the inside")) inside.comb_built_pct = combPct;
      else if (lower.includes("on the outside")) outside.comb_built_pct = combPct;
      else {
        outside.comb_built_pct = combPct;
        inside.comb_built_pct = combPct;
      }
    }

    const honeyPct =
      lower.includes("half of it honey") ? 50 : pct(/(\d+)\s*%\s*(?:of\s*)?frame\s+is\s+honey/i);
    if (honeyPct !== undefined) {
      if (lower.includes("on the inside")) inside.honey_pct = honeyPct;
      else if (lower.includes("on the outside")) outside.honey_pct = honeyPct;
      else {
        outside.honey_pct = honeyPct;
        inside.honey_pct = honeyPct;
      }
    }

    const capped =
      lower.includes("capped") ||
      lower.includes("fully capped") ||
      lower.includes("kept") ||
      lower.includes("fully kept");

    const uncapped =
      lower.includes("not capped") ||
      lower.includes("uncapped") ||
      lower.includes("not kept") ||
      lower.includes("unkept");

    if (capped && !uncapped) {
      const val = honeyPct ?? 100;
      outside.honey_capped_pct = val;
      inside.honey_capped_pct = val;
    }

    const broodPct =
      pct(/(\d+)\s*%\s*(?:of\s*)?frame\s+is\s+brood/i) ??
      (lower.includes("half of it is brood") ? 50 : undefined);

    if (broodPct !== undefined) {
      const hasOutside = lower.includes("on the outside");
      const hasInside = lower.includes("on the inside");
      if (hasOutside) outside.brood_pct = broodPct;
      if (hasInside) inside.brood_pct = broodPct;
      if (!hasOutside && !hasInside) {
        outside.brood_pct = broodPct;
        inside.brood_pct = broodPct;
      }
    }

    if (lower.includes("eggs")) {
      outside.eggs = true;
      inside.eggs = true;
    }
    if (lower.includes("larvae") || lower.includes("larva")) {
      outside.larvae = true;
      inside.larvae = true;
    }

    const frame: FrameReport = { frame_number, notes: chunk };
    if (Object.keys(outside).length) frame.outside = outside;
    if (Object.keys(inside).length) frame.inside = inside;

    frames.push(frame);
  }

  const queenMentioned =
    transcriptText.toLowerCase().includes("queen") || transcriptText.toLowerCase().includes("eoq");

  const questions = queenMentioned
    ? []
    : ["Did you see the queen (EOQ) or evidence of a laying queen (fresh eggs)?"];

  return {
    frames,
    totals: { frames_reported: frames.length },
    queen: { mentioned: queenMentioned },
    questions,
  };
}

/**
 * LLM extraction: transcript -> strict JSON -> validate -> return
 */
async function extractWithLLM(transcriptText: string, frameCount?: number, utterances?: Utterance[]) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build structured input when utterance chunks cover ≥2 frames
  let userContent: string;
  if (utterances && utterances.length > 0) {
    const chunked = chunkUtterancesByFrame(utterances);
    if (chunked.frames.size >= 2) {
      userContent = formatChunkedInput(chunked, frameCount);
    } else {
      userContent = `Frame count (if known): ${frameCount ?? "unknown"}\n\nTranscript:\n${transcriptText}`;
    }
  } else {
    userContent = `Frame count (if known): ${frameCount ?? "unknown"}\n\nTranscript:\n${transcriptText}`;
  }

  const system = `
You must respond with only raw JSON. Do not use markdown fences, do not include any explanation, just the raw JSON object.

Goal: extract a beekeeping inspection into frames with inside/outside structure.

JSON shape:
{
  "frames": [
    {
      "frame_number": number,
      "outside"?: { ... },
      "inside"?: { ... },
      "notes"?: string
    }
  ],
  "totals": {
    "frames_reported": number,
    "honey_equiv_frames"?: number,
    "brood_equiv_frames"?: number,
    "pollen_equiv_frames"?: number
  },
  "queen"?: { "mentioned": boolean, "eoq"?: boolean, "status_note"?: string },
  "questions": string[]
}

Interpretation rules:
- A frame must be explicitly mentioned: "Frame 3" / "Frame number 3".
- "on the outside" -> outside, "on the inside" -> inside.
- "empty" -> empty:true
- "fully capped"/"fully kept"/"capped"/"kept" -> honey_capped_pct:100 (if honey present)
- "not capped"/"unkept"/"not kept" -> honey_capped_pct:0 or omit
- Convert "half" => 50.
- Percentages are 0..100.

Totals:
- frames_reported = number of frames emitted.
- honey_equiv_frames = sum of honey_pct across all sides / 200.
  (two sides = one full frame). Same for brood/pollen.

Questions:
- If queen/EOQ not mentioned, ask: "Did you see the queen (EOQ) or evidence of a laying queen (fresh eggs)?"
`.trim();

  const completion = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    temperature: 0,
    system,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  const raw =
    completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text as string)
      .join("") || "{}";
  const cleaned = raw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM extract returned non-JSON text: ${cleaned.slice(0, 300)}`);
  }

  const validated = ExtractResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`LLM JSON failed validation: ${validated.error.message}`);
  }

  return validated.data;
}

app.post("/extract", async (req, res) => {
  const parsed = ExtractBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { transcriptText, frameCount, utterances } = parsed.data;

  try {
    const result = await extractWithLLM(transcriptText, frameCount, utterances);
    console.log("LLM extract OK: frames =", result.frames.length);
    return res.json(result);
  } catch (err) {
    console.warn("LLM extract failed, falling back to regex:", err);
    const fallback = extractWithRegex(transcriptText);
    return res.json(fallback);
  }
});

/**
 * ---------------------------
 * Inspections
 * ---------------------------
 */

app.get("/version", (_req, res) => {
  res.json({ version: "1.0.0" });
});

const CreateInspectionSchema = z.object({
  hiveId: z.string().min(1),
  recordedAtLocal: z.string(),
  transcriptText: z.string(),
  extract: z.any(),
});

app.get("/inspections", async (req, res) => {
  const hiveId = typeof req.query.hiveId === "string" ? req.query.hiveId : undefined;

  if (!hiveId) {
    return res.status(400).json({ error: "missing_hiveId" });
  }

  if (!z.string().uuid().safeParse(hiveId).success) {
    return res.status(400).json({ error: "invalid_hiveId" });
  }

  try {
    const result = await pool.query(
      `select id, hive_id, recorded_at_local, status, transcript_text, extract_json, created_at
       from inspections where hive_id = $1 order by created_at desc`,
      [hiveId]
    );

    const inspections = result.rows.map((row) => {
      let extract: Record<string, unknown> = {};
      if (row.extract_json != null) {
        extract = typeof row.extract_json === "string"
          ? (() => { try { return JSON.parse(row.extract_json); } catch { return {}; } })()
          : row.extract_json;
      }
      return {
        id: row.id,
        hiveId: row.hive_id,
        recordedAtLocal: row.recorded_at_local,
        status: row.status ?? "ready",
        transcriptText: row.transcript_text ?? "",
        extract,
        createdAt: row.created_at,
      };
    });

    return res.json({ inspections });
  } catch (err: any) {
    console.error("list_inspections_failed", err);
    return res.status(500).json({ error: "list_inspections_failed" });
  }
});

app.post("/inspections", async (req, res) => {
  const parsed = CreateInspectionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
  }

  const { hiveId, recordedAtLocal, transcriptText, extract } = parsed.data;

  try {
    const extractJson =
      typeof extract === "object" && extract !== null
        ? JSON.stringify(extract)
        : typeof extract === "string"
          ? extract
          : "{}";

    const result = await pool.query(
      `insert into inspections (hive_id, recorded_at_local, transcript_text, extract_json)
       values ($1, $2, $3, $4::jsonb)
       returning id`,
      [hiveId, recordedAtLocal || null, transcriptText || null, extractJson]
    );

    const row = result.rows[0];
    return res.status(201).json({
      inspectionId: row?.id ?? null,
    });
  } catch (err: any) {
    console.error("create_inspection_failed", {
      message: err?.message,
      stack: err?.stack,
      code: (err as any)?.code,
    });
    return res.status(500).json({ error: "create_inspection_failed", message: err?.message });
  }
});

app.delete("/inspections/:id", async (req, res) => {
  const id = req.params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return res.status(400).json({ error: "invalid_id" });
  }

  const result = await pool.query("delete from inspections where id = $1 returning id", [id]);

  if (!result.rows.length) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({ deleted: true });
});

app.get("/inspections/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "missing_inspection_id" });
  }

  try {
    const result = await pool.query(
      `select id, hive_id, recorded_at_local, status, transcript_text, extract_json, created_at
       from inspections where id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: "not_found" });
    }

    // extract_json → extract: ensure object (parse string, null → {})
    let extract: Record<string, unknown> = {};
    if (row.extract_json != null) {
      if (typeof row.extract_json === "string") {
        try {
          extract = JSON.parse(row.extract_json) as Record<string, unknown>;
        } catch {
          extract = {};
        }
      } else if (typeof row.extract_json === "object") {
        extract = row.extract_json as Record<string, unknown>;
      }
    }

    const inspection = {
      id: row.id,
      hiveId: row.hive_id,
      recordedAtLocal: row.recorded_at_local ?? null,
      status: row.status ?? "completed",
      transcriptText: row.transcript_text ?? "",
      extract,
      createdAt: row.created_at,
    };

    return res.json({ inspection });
  } catch (err: any) {
    const pgErr = err as { code?: string; message?: string; stack?: string };
    console.error("get_inspection_failed", {
      message: pgErr?.message,
      code: pgErr?.code,
      stack: pgErr?.stack,
    });
    return res.status(500).json({ error: "get_inspection_failed" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => console.log(`API running on port ${port}`));
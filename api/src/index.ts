import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import express from "express";
import cors from "cors";
import multer from "multer";
import { z } from "zod";
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
 * Whisper is ASR (speech-to-text), not "semantic extraction".
 * ---------------------------
 */
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }

    // Convert Buffer -> Uint8Array -> File for FormData
    const bytes = new Uint8Array(req.file.buffer);
    const file = new File([bytes], req.file.originalname || "inspection.m4a", {
      type: req.file.mimetype || "application/octet-stream",
    });

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("file", file);

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return res.status(500).json({ error: "transcription_failed", details: errText });
    }

    const data = (await resp.json()) as { text?: string };
    res.json({ transcriptText: data.text ?? "" });
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

const ExtractBodySchema = z.object({
  transcriptText: z.string().min(1),
  frameCount: z.number().int().min(1).optional(),
});

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
 * Helper: Extract text content from the OpenAI Responses API JSON.
 * The Responses API returns an "output" array with message items.
 * We robustly gather any text parts we can find.
 */
function getResponseTextFromResponsesApi(data: any): string {
  // Some SDKs/tools may include output_text; use it if present.
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const outputs = Array.isArray(data?.output) ? data.output : [];
  const chunks: string[] = [];

  for (const item of outputs) {
    // Typical: item.type === "message" and item.content is an array
    const contentArr = Array.isArray(item?.content) ? item.content : [];
    for (const c of contentArr) {
      // Known shapes seen in Responses API:
      // { type: "output_text", text: "..." }
      // { type: "text", text: "..." }
      if (typeof c?.text === "string" && c.text.trim()) {
        chunks.push(c.text);
      }
      // Some variants:
      if (typeof c?.content === "string" && c.content.trim()) {
        chunks.push(c.content);
      }
    }
  }

  return chunks.join("\n").trim();
}

/**
 * LLM extraction: transcript -> strict JSON -> validate -> return
 */
async function extractWithLLM(transcriptText: string, frameCount?: number) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

  // Start cheap; once working, we can bump models.
  const model = process.env.EXTRACT_MODEL || "gpt-4o-mini";

  const system = `
Return ONLY valid JSON.

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
`;

  const user = `Frame count (if known): ${frameCount ?? "unknown"}

Transcript:
${transcriptText}
`;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Request JSON-only output (but we still parse robustly)
      text: { format: { type: "json_object" } },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM extract failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json();

  const jsonText = getResponseTextFromResponsesApi(data);
  if (!jsonText) {
    throw new Error("LLM extract returned empty text");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Useful debug when model returned almost-json
    throw new Error(`LLM extract returned non-JSON text: ${jsonText.slice(0, 300)}`);
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

  const { transcriptText, frameCount } = parsed.data;

  try {
    const result = await extractWithLLM(transcriptText, frameCount);
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
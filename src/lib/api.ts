// src/lib/api.ts
// Thin client for the Railway API.
// All network calls throw useful errors on non-2xx so UI never fails silently.

export type ApiHiveRow = {
  id: string;
  name: string;
  apiary_name: string | null;
  created_at: string;
};
export type Hive = ApiHiveRow;

export type CreateHiveInput = {
  name: string;
  apiaryName?: string;
};

export type CreateInspectionInput = {
  hiveId: string;
  recordedAtLocal: string; // YYYY-MM-DD
  transcriptText: string;
  extract: any; // JSON returned by /extract
};

export type ApiInspectionRow = {
  id: string;
  hive_id: string;
  recorded_at_local: string | null;
  transcript_text: string | null;
  extract_json: any | null;
  created_at: string;
};

export type Inspection = {
  id: string;
  hiveId: string;
  recordedAtLocal: string | null;
  createdAt: string;
  transcriptText: string;
  extract: any;
};

export type InspectionListItem = {
  id: string;
  hiveId: string;
  recordedAtLocal: string | null;
  status: string;
  transcriptText: string;
  extract: any;
  createdAt: string;
};

function getApiBaseUrl() {
  const v = (import.meta as any)?.env?.VITE_API_BASE_URL;
  return (v && String(v).trim()) || "https://api-production-fb9f.up.railway.app";
}

async function readJsonOrText(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, init);

  if (!res.ok) {
    const body = await readJsonOrText(res);
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.error || JSON.stringify(body);
    throw new Error(`API ${res.status} ${res.statusText}: ${msg}`);
  }

  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizeInspection(row: ApiInspectionRow): Inspection {
  return {
    id: row.id,
    hiveId: row.hive_id,
    recordedAtLocal: row.recorded_at_local ?? null,
    createdAt: row.created_at,
    transcriptText: row.transcript_text ?? "",
    extract: row.extract_json ?? {},
  };
}

// -------------------
// Hives
// -------------------
export async function getHives(): Promise<ApiHiveRow[]> {
  const data = await request("/hives");
  return (data?.hives ?? []) as ApiHiveRow[];
}

export async function createHive(input: CreateHiveInput): Promise<ApiHiveRow> {
  const data = await request("/hives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data?.hive as ApiHiveRow;
}

// -------------------
// Transcribe + Extract
// -------------------
export async function transcribeAudio(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);

  const data = await request("/transcribe", {
    method: "POST",
    body: form,
  });

  return String(data?.transcriptText ?? "");
}

export async function extractFromTranscript(transcriptText: string): Promise<any> {
  const data = await request("/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcriptText }),
  });
  return data;
}

// -------------------
// Inspections
// -------------------
export async function createInspection(
  input: CreateInspectionInput
): Promise<{ inspectionId: string }> {
  const data = await request("/inspections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return { inspectionId: String(data?.inspectionId ?? "") };
}

export async function getInspectionsByHive(hiveId: string): Promise<InspectionListItem[]> {
  const data = await request(`/inspections?hiveId=${encodeURIComponent(hiveId)}`);
  return (data?.inspections ?? []) as InspectionListItem[];
}

// Fetch a single inspection by ID (refresh-safe InspectionReport)
// API returns camelCase: { inspection: { id, hiveId, recordedAtLocal, status, transcriptText, extract, createdAt } }
export async function getInspection(inspectionId: string): Promise<Inspection> {
  const data = await request(`/inspections/${encodeURIComponent(inspectionId)}`);
  const insp = data?.inspection as {
    id: string;
    hiveId?: string;
    hive_id?: string;
    recordedAtLocal?: string | null;
    recorded_at_local?: string | null;
    transcriptText?: string;
    transcript_text?: string;
    extract?: unknown;
    extract_json?: unknown;
    createdAt?: string;
    created_at?: string;
  };
  if (!insp) return { id: "", hiveId: "", recordedAtLocal: null, createdAt: "", transcriptText: "", extract: {} };
  return {
    id: insp.id,
    hiveId: insp.hiveId ?? insp.hive_id ?? "",
    recordedAtLocal: insp.recordedAtLocal ?? insp.recorded_at_local ?? null,
    createdAt: insp.createdAt ?? insp.created_at ?? "",
    transcriptText: insp.transcriptText ?? insp.transcript_text ?? "",
    extract: insp.extract ?? insp.extract_json ?? {},
  };
}
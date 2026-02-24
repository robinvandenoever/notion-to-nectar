// src/lib/api.ts
// Thin API client for the local Express backend.
// Keeps names simple for UI: getHives(), createHive(), and Hive type.

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export type Hive = {
  id: string;
  name: string;
  apiary_name: string | null;
  created_at: string;
};

export async function getHives(): Promise<Hive[]> {
  const resp = await fetch(`${API_BASE}/hives`);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`GET /hives failed (${resp.status}): ${text}`);
  }
  const data = (await resp.json()) as { hives: Hive[] };
  return data.hives;
}

export async function createHive(input: { name: string; apiaryName?: string }): Promise<Hive> {
  const resp = await fetch(`${API_BASE}/hives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`POST /hives failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { hive: Hive };
  return data.hive;
}
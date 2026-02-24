import React from "react";

type AnyObj = Record<string, any>;
export type FrameReport = AnyObj;

export type CombinedFrame = {
  frame: number;

  honey_pct?: number;
  brood_pct?: number;
  pollen_pct?: number;

  empty?: boolean;
  eggs?: boolean;
  larvae?: boolean;

  drone?: boolean;
  queen_cells?: boolean;

  notes?: string;
};

function clampPct(v: any): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}

function pick(obj: AnyObj | undefined, keys: string[]) {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined) return obj[k];
  return undefined;
}

function getSide(frame: AnyObj, which: "outside" | "inside"): AnyObj | undefined {
  return (
    pick(frame, [which]) ??
    pick(frame, [which === "outside" ? "outsideSide" : "insideSide"]) ??
    pick(frame, [which === "outside" ? "outside_face" : "inside_face"]) ??
    undefined
  );
}

function getFrameNumber(frame: AnyObj): number | undefined {
  const n = pick(frame, ["frame_number", "frameNumber", "frame", "number"]);
  const out = typeof n === "number" ? n : typeof n === "string" ? Number(n) : NaN;
  return Number.isFinite(out) ? out : undefined;
}

function avg(a?: number, b?: number): number | undefined {
  const av = clampPct(a);
  const bv = clampPct(b);
  if (typeof av === "number" && typeof bv === "number") return (av + bv) / 2;
  if (typeof av === "number") return av;
  if (typeof bv === "number") return bv;
  return undefined;
}

function pctFromNotes(notes: string, kind: "honey" | "brood" | "pollen"): number | undefined {
  const n = notes.toLowerCase();

  // explicit: "80% brood"
  const explicit = n.match(/(\d{1,3})\s*%\s*(?:of\s*)?(?:this\s*)?(?:frame\s*)?(?:is\s*)?\b(honey|brood|pollen)\b/);
  if (explicit && explicit[2] === kind) return clampPct(explicit[1]);

  // "half ... honey/brood/pollen"
  if (n.includes("half") && n.includes(kind)) return 50;

  // honey: "fully kept/capped" implies 100 honey (at least as a working assumption)
  if (kind === "honey") {
    if (n.includes("fully capped") || n.includes("fully kept") || n.includes("fully sealed")) return 100;
    if (n.includes("capped") || n.includes("kept") || n.includes("sealed")) return 100;
  }

  // brood: "healthy brood pattern" often implies brood present but % unknown → don’t guess %
  // pollen: don’t guess %

  return undefined;
}

function boolFromNotes(notes: string, kind: "eggs" | "larvae" | "drone" | "queen_cells" | "empty"): boolean | undefined {
  const n = notes.toLowerCase();

  if (kind === "empty") {
    return (
      n.includes("completely empty") ||
      n.includes("frame is empty") ||
      n.match(/\bis empty\b/) !== null
    );
  }

  if (kind === "eggs") return n.includes("egg") || n.includes("eggs");
  if (kind === "larvae") return n.includes("larva") || n.includes("larvae");
  if (kind === "drone") return n.includes("drone") || n.includes("drones");
  if (kind === "queen_cells") return n.includes("queen cell") || n.includes("queen cells") || n.includes("q cell") || n.includes("q.cells") || n.includes("qc");

  return undefined;
}

function boolFromSide(side: AnyObj | undefined, keys: string[]): boolean | undefined {
  const v = pick(side, keys);
  return typeof v === "boolean" ? v : undefined;
}

export function combineFrameSides(frames: FrameReport[]): CombinedFrame[] {
  return (frames ?? [])
    .map((f) => {
      const frameNum = getFrameNumber(f);
      if (!frameNum) return null;

      const outside = getSide(f, "outside") ?? {};
      const inside = getSide(f, "inside") ?? {};
      const notes = String(pick(f, ["notes", "note", "raw", "rawText"]) ?? "");

      // Prefer extractor-provided % fields
      const outHoney = avg(
        clampPct(pick(outside, ["honey_pct", "honeyPct", "honeyPercent"])),
        clampPct(pick(outside, ["honey_capped_pct", "honeyCappedPct"]))
      );
      const inHoney = avg(
        clampPct(pick(inside, ["honey_pct", "honeyPct", "honeyPercent"])),
        clampPct(pick(inside, ["honey_capped_pct", "honeyCappedPct"]))
      );
      let honey = avg(outHoney, inHoney);

      const outBrood = clampPct(pick(outside, ["brood_pct", "broodPct", "broodPercent"]));
      const inBrood = clampPct(pick(inside, ["brood_pct", "broodPct", "broodPercent"]));
      let brood = avg(outBrood, inBrood);

      const outPollen = clampPct(pick(outside, ["pollen_pct", "pollenPct", "pollenPercent"]));
      const inPollen = clampPct(pick(inside, ["pollen_pct", "pollenPct", "pollenPercent"]));
      let pollen = avg(outPollen, inPollen);

      // Fill missing % from notes heuristics (conservative)
      if (honey === undefined) honey = pctFromNotes(notes, "honey");
      if (brood === undefined) brood = pctFromNotes(notes, "brood");
      if (pollen === undefined) pollen = pctFromNotes(notes, "pollen");

      // Booleans from extractor OR notes
      const eggs =
        boolFromSide(outside, ["eggs", "hasEggs"]) ??
        boolFromSide(inside, ["eggs", "hasEggs"]) ??
        boolFromNotes(notes, "eggs") ??
        false;

      const larvae =
        boolFromSide(outside, ["larvae", "hasLarvae"]) ??
        boolFromSide(inside, ["larvae", "hasLarvae"]) ??
        boolFromNotes(notes, "larvae") ??
        false;

      const drone =
        boolFromSide(outside, ["drone", "drones", "hasDrones"]) ??
        boolFromSide(inside, ["drone", "drones", "hasDrones"]) ??
        boolFromNotes(notes, "drone") ??
        false;

      const queen_cells =
        boolFromSide(outside, ["queen_cells", "queenCells", "qCells"]) ??
        boolFromSide(inside, ["queen_cells", "queenCells", "qCells"]) ??
        boolFromNotes(notes, "queen_cells") ??
        false;

      // Empty only if explicit (notes) OR both sides empty
      const explicitEmpty = boolFromNotes(notes, "empty") ?? false;
      const outEmpty = boolFromSide(outside, ["empty", "isEmpty"]);
      const inEmpty = boolFromSide(inside, ["empty", "isEmpty"]);
      const bothEmpty = outEmpty === true && inEmpty === true;
      const empty = explicitEmpty || bothEmpty;

      return {
        frame: frameNum,
        honey_pct: honey,
        brood_pct: brood,
        pollen_pct: pollen,
        empty,
        eggs,
        larvae,
        drone,
        queen_cells,
        notes,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.frame - b.frame) as CombinedFrame[];
}

function PctCell({ value }: { value?: number }) {
  if (typeof value !== "number") return <span className="text-muted-foreground">—</span>;
  const pct = Math.round(value);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 tabular-nums">{pct}%</span>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BoolEmoji({ value }: { value?: boolean }) {
  if (typeof value === "undefined") return <span className="text-muted-foreground">—</span>;
  return <span>{value ? "✅" : "—"}</span>;
}

export function FrameDataTable({ frames }: { frames: FrameReport[] }) {
  const combined = combineFrameSides(frames);

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-serif whitespace-nowrap">Frame</th>
            <th className="text-left p-3 font-serif whitespace-nowrap">🍯 Honey</th>
            <th className="text-left p-3 font-serif whitespace-nowrap">🟫 Brood</th>
            <th className="text-left p-3 font-serif whitespace-nowrap">🌼 Pollen</th>
            <th className="text-center p-3 font-serif whitespace-nowrap">⬜ Empty</th>
            <th className="text-center p-3 font-serif whitespace-nowrap">🥚 Eggs</th>
            <th className="text-center p-3 font-serif whitespace-nowrap">🐛 Larvae</th>
            <th className="text-center p-3 font-serif whitespace-nowrap">🧔 Drone</th>
            <th className="text-center p-3 font-serif whitespace-nowrap">👑 Q.Cells</th>
          </tr>
        </thead>

        <tbody>
          {combined.map((row) => (
            <tr key={row.frame} className="border-b last:border-b-0">
              <td className="p-3 font-medium whitespace-nowrap">{row.frame}</td>
              <td className="p-3 min-w-[220px]"><PctCell value={row.honey_pct} /></td>
              <td className="p-3 min-w-[220px]"><PctCell value={row.brood_pct} /></td>
              <td className="p-3 min-w-[220px]"><PctCell value={row.pollen_pct} /></td>
              <td className="p-3 text-center"><BoolEmoji value={row.empty} /></td>
              <td className="p-3 text-center"><BoolEmoji value={row.eggs} /></td>
              <td className="p-3 text-center"><BoolEmoji value={row.larvae} /></td>
              <td className="p-3 text-center"><BoolEmoji value={row.drone} /></td>
              <td className="p-3 text-center"><BoolEmoji value={row.queen_cells} /></td>
            </tr>
          ))}

          {combined.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-muted-foreground">
                No frame rows could be built from the extracted data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
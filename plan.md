# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Add a delete button to the inspection report page so users can permanently remove an inspection. Follows the exact same UX pattern as hive delete on the Edit Hive page: ghost button below a divider, confirmation modal, then navigate away on success.

## Critical Decisions
- **Skip store update** — `InspectionReport.tsx` fetches directly from the API and holds state locally; there is nothing to remove from the Zustand store after deletion.
- **Navigate to hive detail on success** — `inspection.hiveId` is already available on the loaded inspection object, so we can navigate to `/hive/:hiveId` without any extra data fetching.
- **Same delete pattern as hive** — UUID validation + 404 check in both API files, identical AlertDialog layout in the frontend.

## Tasks

- [x] 🟩 **Step 1: Production API — add DELETE /inspections/:id**
  - [x] 🟩 Add endpoint after existing `GET /inspections/:id` in `project-bee/services/api/src/index.ts`
  - [x] 🟩 Validate UUID, delete row, return `{ deleted: true }` or 404

- [x] 🟩 **Step 2: Local dev API — add DELETE /inspections/:id**
  - [x] 🟩 Mirror same endpoint in `notion-to-nectar/api/src/index.ts`

- [x] 🟩 **Step 3: API client — add deleteInspection()**
  - [x] 🟩 Add `deleteInspection(id: string): Promise<void>` to `src/lib/api.ts`

- [x] 🟩 **Step 4: UI — add delete button + confirmation modal**
  - [x] 🟩 Import `AlertDialog` components and `deleteInspection` in `src/pages/InspectionReport.tsx`
  - [x] 🟩 Add `deleting` state
  - [x] 🟩 Add `handleDelete` function: call `deleteInspection(inspectionId)`, then `navigate(\`/hive/${inspection.hiveId}\`)`
  - [x] 🟩 Render ghost button + AlertDialog below a divider at the bottom of the page
  - [x] 🟩 Modal text: "Removing this inspection report is permanent and cannot be undone."

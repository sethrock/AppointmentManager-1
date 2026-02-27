# Conversation Create Feature Plan

## Goal

Add a new "Conversation Create" workflow that starts from the current `New Appointment` entry point on:

- `/dashboard`
- `/appointments` (UI label "Appointments")

The user can provide conversation evidence (paste text, upload files, drag/drop files), and AI will prefill the full **Appointment Details** form so the user can review and save.

---

## Desired User Experience

### 1) Entry point changes

Replace the single "New Appointment" action with a menu that has:

1. `New Appointment` (current manual flow, unchanged)
2. `Conversation Create` (new flow)

Apply this in both existing pages:

- `client/src/pages/dashboard.tsx`
- `client/src/pages/appointments/index.tsx`

### 2) New Conversation Create page

Route: `/appointments/conversation-create`

Main sections:

1. **Input Sources**
   - Paste SMS/MMS text
   - Upload or drag/drop files:
     - WhatsApp chat `.zip`
     - Conversation `.csv`
     - Conversation screenshots/photos (`.jpg`, `.jpeg`, `.png`, `.webp`)
2. **Upload/Parsing Results**
   - Show detected file types
   - Show extracted message counts and parse warnings
3. **AI Extracted Appointment Draft**
   - Show parsed fields + confidence + missing fields
   - Let user review/edit before save
4. **Prefilled Appointment Details Form**
   - Reuse existing appointment form UI and validation
   - Save through existing appointment creation API

### 3) Save behavior

Do **not** auto-create appointments from AI output.
Always require user review + confirmation before saving.

---

## Current Codebase Touchpoints (Implementation Anchors)

- `client/src/pages/dashboard.tsx` currently links `New Appointment` button to `/appointments/new`.
- `client/src/pages/appointments/index.tsx` currently links `New Appointment` button to `/appointments/new`.
- `client/src/App.tsx` holds route registration (add new protected route).
- `client/src/pages/appointments/new.tsx` uses `AppointmentForm` and POSTs to `/api/appointments`.
- `client/src/components/appointment/AppointmentForm.tsx` is the existing complete Appointment Details form.
- `server/routes.ts` has `POST /api/appointments` with `insertAppointmentSchema` validation.
- `shared/schema.ts` defines `insertAppointmentSchema` and all appointment fields.

---

## Functional Requirements

### A) Inputs supported

1. **Plain pasted text** (SMS/MMS transcript)
2. **WhatsApp export zip**
   - Parse exported chat text from archive
   - Capture attachment references where possible
3. **CSV conversations**
   - Support common columns (timestamp, sender, message/body, phone/contact)
4. **Screenshots/photos**
   - OCR and/or vision extraction from images

### B) AI extraction output

AI must return:

- Appointment field values mapped to schema
- Confidence score per field
- Missing required fields list
- Extraction notes (assumptions/ambiguities)

### C) Save flow

- Client validates with existing `AppointmentForm` constraints
- User edits any uncertain fields
- Save via existing `/api/appointments`

---

## Proposed Technical Design

### 1) Frontend

### Components/pages to add

- `client/src/pages/appointments/conversation-create.tsx`
- `client/src/components/appointment/ConversationCreateUploader.tsx`
- `client/src/components/appointment/ConversationCreatePreview.tsx`
- `client/src/components/appointment/ConversationCreateResult.tsx`

### Existing files to update

- `client/src/pages/dashboard.tsx`
  - Replace button-link with dropdown menu trigger
- `client/src/pages/appointments/index.tsx`
  - Same dropdown menu pattern
- `client/src/App.tsx`
  - Add protected route for `/appointments/conversation-create`

### UI behavior

- Reuse drag/drop interaction pattern from provider photo upload UX.
- Show clear status states: `uploading`, `parsing`, `analyzing`, `ready`, `error`.
- Allow removing/replacing files before AI run.
- Allow "Try AI Again" after prompt/version changes.

### 2) Backend API

Add new endpoints under a dedicated namespace:

- `POST /api/conversation-create/parse`
  - Multipart + pasted text payload
  - Returns normalized conversation payload
- `POST /api/conversation-create/extract`
  - Runs AI extraction from normalized payload
  - Returns structured appointment draft + confidence/missing fields
- (Optional) `POST /api/conversation-create/create`
  - If we want server-side final create orchestration
  - Can defer and reuse existing `/api/appointments` from client

### 3) Backend services

Add service modules:

- `server/services/conversationCreateService.ts`
- `server/services/conversationParsers/whatsappZipParser.ts`
- `server/services/conversationParsers/csvConversationParser.ts`
- `server/services/conversationParsers/textConversationParser.ts`
- `server/services/conversationParsers/imageOcrParser.ts`
- `server/services/ai/conversationAppointmentExtractionService.ts`

### 4) File upload handling

Use `multer` with strict validation:

- Allowed file types: `.zip`, `.csv`, `.txt`, `.jpg`, `.jpeg`, `.png`, `.webp`
- Enforce size limits and max file count
- Sanitize filenames
- Store temporary files under `uploads/conversation-create/...`
- Delete temp files after parse/extract completion

### 5) AI model strategy

Use the existing Anthropic dependency and add a dedicated extraction service.

Prompt requirements:

- Include exact appointment schema field definitions (from `insertAppointmentSchema`)
- Include enum/value constraints where relevant (e.g., `callType`, `dispositionStatus`)
- Require strict JSON output format
- Require no hallucinated fields
- Include confidence and missing-fields metadata

Validation gate:

- Validate AI output with zod before returning to UI
- If invalid, return actionable errors and fallback suggestions

---

## Data Mapping Strategy (Conversation -> Appointment Form)

High-confidence candidate mappings:

- `clientName` from contact/chat header context
- `phoneNumber` from sender identifiers where available
- `provider` from direct mentions/signatures
- `startDate` + `startTime` from explicit scheduled date/time text
- `callType` from "incall/outcall" language
- `streetAddress/city/state/zipCode` from location messages (out-call only)
- `grossRevenue/depositAmount/paymentProcessUsed` from money/payment messages
- `clientNotes/appointmentNotes` from extracted summary of relevant context

Required field enforcement before save:

- `setBy`
- `provider`
- `marketingChannel`
- `callType`
- `startDate`
- `startTime`

If AI cannot confidently populate required fields, block save and prompt user review.

---

## Security, Privacy, and Reliability

- Do not log full raw conversation content in server logs.
- Keep stored raw content minimal and time-limited.
- Add a retention policy for temp uploads and intermediate parse output.
- Validate MIME + extension + size (defense in depth).
- Prevent zip traversal and unsupported archive members.
- Add rate limiting for AI extraction endpoint.
- Add graceful fallback when AI provider is unavailable.

---

## Delivery Phases

### Phase 1 - UX Entry + Scaffolding

- Add dropdown menu with `Conversation Create` option in dashboard + appointments pages.
- Add new route/page shell.
- Add upload zone and pasted text input UI.

### Phase 2 - Parsing Layer

- Implement text, CSV, and WhatsApp zip parsers.
- Implement image OCR parser (basic) and normalize all sources into one message model.
- Return parser diagnostics to UI.

### Phase 3 - AI Extraction + Prefill

- Implement AI extraction service and endpoint.
- Add JSON schema-constrained output and zod validation.
- Prefill `AppointmentForm` with extracted values + confidence indicators.

### Phase 4 - Hardening + QA

- Add error handling, retries, and timeout logic.
- Add audit metadata (no sensitive payloads).
- Add test coverage and end-to-end QA with sample files.

---

## Testing Plan

### Automated

1. Parser unit tests
   - WhatsApp zip variants
   - CSV column format variants
   - OCR parser smoke tests
2. AI extraction contract tests
   - Output shape validation against expected schema
   - Missing/ambiguous field behavior
3. API integration tests
   - Upload -> parse -> extract flow
   - Validation and error paths

### Manual

1. Dashboard and appointments entry menus show both actions.
2. Drag/drop and file picker both work.
3. Paste-only workflow works without file uploads.
4. AI prefill appears in the appointment form and can be edited.
5. Save creates appointment via existing endpoint.

---

## Acceptance Criteria

1. Users can start Conversation Create from both `/dashboard` and `/appointments`.
2. Users can paste text and/or upload supported conversation formats.
3. System extracts appointment draft data and displays confidence + missing fields.
4. Users can review/edit before saving.
5. Appointment saves successfully using existing appointment pipeline.
6. Upload security controls and temp-file cleanup are in place.

---

## Open Decisions (Confirm before build)

1. Should images be required in MVP, or shipped as Phase 2 after text/csv/zip?
2. Should raw uploaded conversation files be persisted for audit, or deleted after parse?
3. Should we support multi-file merge into one appointment draft in MVP?
4. Should Conversation Create save directly to appointment, or always route through editable form review?

Recommended defaults for MVP:

- Include images (best effort OCR), but allow feature flag fallback.
- Delete raw files after processing unless explicitly retained.
- Support multi-file merge.
- Always require human review before final save.

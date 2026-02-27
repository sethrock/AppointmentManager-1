# Conversation Create — Feature Plan

## Overview

**Conversation Create** is a new appointment-creation flow that lets users upload or paste conversation data (SMS/MMS texts, WhatsApp chat exports, CSV spreadsheets, and screenshots/photos) and uses an AI model to automatically extract appointment details and populate the existing `AppointmentForm`.

The feature is accessed from a new **dropdown menu** on the "New Appointment" button that appears on both `/dashboard` and `/appointments`.

---

## 1. UX Flow

### 1.1 Entry Point — Dropdown on "New Appointment"

**Current behaviour:** The "New Appointment" button on `/dashboard` (`client/src/pages/dashboard.tsx`, line 105-110) and `/appointments` (`client/src/pages/appointments/index.tsx`, line 100-104) is a plain `<Button asChild>` wrapping a `<Link href="/appointments/new">`. Clicking it navigates directly to the new-appointment form.

**New behaviour:** Replace the single button with a **split-button / dropdown menu** using the existing `DropdownMenu` component (`client/src/components/ui/dropdown-menu.tsx`). The dropdown will have two items:

| Menu Item | Action |
|---|---|
| **New Appointment** | Navigate to `/appointments/new` (current behaviour) |
| **Conversation Create** | Navigate to `/appointments/new?mode=conversation` |

Both pages (`dashboard.tsx` and `appointments/index.tsx`) need the same change, so the dropdown should be extracted into a shared component (e.g., `client/src/components/appointment/NewAppointmentButton.tsx`).

### 1.2 Conversation Create Page

The route is the existing `/appointments/new` with the query parameter `?mode=conversation`. The `NewAppointment` page (`client/src/pages/appointments/new.tsx`) will detect this parameter and render a **two-step wizard** instead of the bare form:

#### Step 1 — Upload / Paste Conversations

A full-page upload area with the following input methods:

| Input Method | Accepted Formats | Implementation Notes |
|---|---|---|
| **Paste SMS/MMS text** | Plain text (pasted into a `<Textarea>`) | User pastes raw copy-pasted text conversation |
| **Upload WhatsApp chat export** | `.zip` files containing WhatsApp's `_chat.txt` + optional media | WhatsApp "Export Chat" produces a `.zip`; backend unzips and parses `_chat.txt` |
| **Upload CSV spreadsheet** | `.csv` files | Columns may vary; AI model will interpret column semantics |
| **Upload screenshots / photos** | `.png`, `.jpg`, `.jpeg`, `.webp` | Sent to AI vision model for OCR + extraction |

The upload area will support:
- Drag-and-drop (using the HTML5 Drag and Drop API)
- Click-to-browse file picker
- Multiple file selection
- A dedicated "Paste Text" textarea that expands when focused

Each uploaded file appears as a card/chip showing filename, type badge, size, and a remove button.

A prominent **"Analyze Conversation"** button submits everything to the backend.

#### Step 2 — Review & Edit Pre-filled Form

After AI processing, the standard `AppointmentForm` renders with all extractable fields pre-populated. A banner at the top shows:
- Which fields the AI filled and its confidence
- A note to review and correct before saving

The user reviews, edits if needed, and clicks "Save Appointment" as usual.

---

## 2. Supported Input Formats — Parsing Details

### 2.1 SMS/MMS Plain Text

Users paste raw copied text. No strict format is required; the AI model will interpret free-form text. However, common patterns include:

```
[timestamp] sender: message
```

The backend sends the raw text directly to the AI prompt.

### 2.2 WhatsApp `.zip` Export

WhatsApp's "Export Chat" produces a `.zip` containing:
- `_chat.txt` — the conversation in `[dd/mm/yyyy, hh:mm:ss] Sender: Message` format
- Optional attached media files (images, voice notes, etc.)

**Backend processing:**
1. Accept the `.zip` via multer
2. Unzip using Node.js `unzipper` or built-in `zlib` + `tar` (WhatsApp uses standard zip)
3. Read `_chat.txt` and send to AI
4. If images are included, also send them to the AI vision model for additional context

### 2.3 CSV Spreadsheets

Accept `.csv` files. The server already has CSV parsing utilities (`server/utils/csv.ts`). The raw CSV content (or a reasonable excerpt) is passed to the AI model along with instructions to identify which columns map to appointment fields.

### 2.4 Screenshots / Photos

Accept image files (`.png`, `.jpg`, `.jpeg`, `.webp`). These are sent to the AI model's vision capability for OCR and data extraction. Multiple images can be sent in a single request.

---

## 3. AI Integration

### 3.1 Model Selection

The project already has `@anthropic-ai/sdk` (`^0.37.0`) as a dependency. Use the **Claude API** (Anthropic) with vision support for all extraction tasks.

**Required secret:** `ANTHROPIC_API_KEY` (add to Cursor Dashboard secrets and document in `AGENTS.md`).

### 3.2 Extraction Prompt Design

The AI prompt will:
1. Receive the conversation content (text, CSV rows, or images)
2. Be instructed to extract values for **every field** in the appointment schema
3. Return a structured JSON object matching the `InsertAppointment` type

**Target extraction fields** (from `shared/schema.ts` appointments table):

| Field | Type | AI Extraction Notes |
|---|---|---|
| `setBy` | `string` | Identify the agent/setter from context; default to empty if ambiguous |
| `provider` | `string` | Look for provider name mentions |
| `marketingChannel` | `string` | Look for how the client found the service |
| `clientName` | `string` | Extract client's name from conversation |
| `phoneNumber` | `string` | Extract phone number |
| `clientUsesEmail` | `boolean` | True if an email address is found |
| `clientEmail` | `string` | Extract email address if present |
| `callType` | `string` | `"in-call"` or `"out-call"` based on conversation |
| `streetAddress` | `string` | Extract if out-call location mentioned |
| `addressLine2` | `string` | Extract if present |
| `city` | `string` | Extract city |
| `state` | `string` | Extract state (2-letter code) |
| `zipCode` | `string` | Extract zip code |
| `outcallDetails` | `string` | Any additional location notes |
| `startDate` | `string` | Extract appointment date (format: `YYYY-MM-DD`) |
| `startTime` | `string` | Extract appointment time (format: `HH:MM`) |
| `endDate` | `string` | Extract or calculate from duration |
| `endTime` | `string` | Extract or calculate from duration |
| `callDuration` | `number` | Extract duration in hours |
| `grossRevenue` | `number` | Extract price/rate discussed |
| `travelExpense` | `number` | Extract if discussed |
| `hostingExpense` | `number` | Extract if discussed |
| `depositAmount` | `number` | Extract deposit amount if discussed |
| `depositReceivedBy` | `string` | Who received the deposit |
| `paymentProcessUsed` | `string` | Extract payment method discussed |
| `hasClientNotes` | `boolean` | True if the AI generates notes |
| `clientNotes` | `string` | Any notable client information from conversation |

The prompt must instruct the model to:
- Return only fields it can confidently extract
- Use `null` for fields it cannot determine
- Include a `_confidence` object with per-field confidence scores (`high`, `medium`, `low`)
- Never fabricate data — only extract what is explicitly or strongly implied

### 3.3 API Endpoint

```
POST /api/conversation-create/analyze
```

**Request:** `multipart/form-data`
- `pastedText` (string, optional) — raw pasted conversation text
- `files` (file[], optional) — uploaded files (`.zip`, `.csv`, `.png`, `.jpg`, `.webp`)

**Response:**
```json
{
  "extractedData": { /* partial InsertAppointment */ },
  "confidence": {
    "clientName": "high",
    "phoneNumber": "high",
    "startDate": "medium",
    ...
  },
  "rawConversation": "parsed/cleaned conversation text",
  "warnings": ["Could not determine provider", ...]
}
```

### 3.4 Processing Pipeline

```
Upload received
  ├─ Text input → pass directly to prompt
  ├─ .zip file  → unzip → extract _chat.txt → pass text to prompt
  │                      → extract images    → pass to vision prompt
  ├─ .csv file  → parse CSV → pass rows to prompt
  └─ Images     → pass to vision prompt (OCR + extraction)
       │
       ▼
  Combine all extracted text/data
       │
       ▼
  Send to Claude API with structured extraction prompt
       │
       ▼
  Parse JSON response → validate against schema
       │
       ▼
  Return to frontend
```

---

## 4. Technical Implementation Plan

### 4.1 New Files to Create

| File | Purpose |
|---|---|
| `client/src/components/appointment/NewAppointmentButton.tsx` | Shared dropdown button component |
| `client/src/components/appointment/ConversationUpload.tsx` | Upload/paste UI for Step 1 |
| `client/src/components/appointment/ConversationReview.tsx` | Review banner + pre-filled form wrapper for Step 2 |
| `server/services/conversationCreateService.ts` | Backend service: file processing, AI prompt, response parsing |
| `server/services/whatsappParser.ts` | WhatsApp `.zip` extraction and `_chat.txt` parsing |

### 4.2 Files to Modify

| File | Changes |
|---|---|
| `client/src/pages/dashboard.tsx` | Replace "New Appointment" `<Button>` with `<NewAppointmentButton />` |
| `client/src/pages/appointments/index.tsx` | Replace "New Appointment" `<Button>` with `<NewAppointmentButton />` |
| `client/src/pages/appointments/new.tsx` | Detect `?mode=conversation` query param; conditionally render conversation wizard vs. plain form |
| `client/src/components/appointment/AppointmentForm.tsx` | Accept optional `initialData` prop (already supported) — no schema changes needed |
| `server/routes.ts` | Add `POST /api/conversation-create/analyze` endpoint |
| `server/middleware/upload.ts` | Add a new multer config for conversation file uploads (`.zip`, `.csv`, images) |
| `package.json` | Add `unzipper` (or `adm-zip`) dependency for `.zip` extraction |
| `AGENTS.md` | Document `ANTHROPIC_API_KEY` as a required secret |

### 4.3 No Schema Changes Required

The existing `appointments` table schema covers all fields that the AI will extract. No database migrations are needed.

### 4.4 Dependencies to Add

| Package | Purpose |
|---|---|
| `adm-zip` | Extract WhatsApp `.zip` exports (lightweight, no native deps) |
| `@types/adm-zip` | TypeScript types for adm-zip |

The `@anthropic-ai/sdk` is already installed.

---

## 5. Implementation Phases

### Phase 1 — Dropdown Button & Routing (Frontend)
1. Create `NewAppointmentButton.tsx` with dropdown menu
2. Replace buttons in `dashboard.tsx` and `appointments/index.tsx`
3. Update `appointments/new.tsx` to read `?mode=conversation` and conditionally render

### Phase 2 — Upload UI (Frontend)
1. Build `ConversationUpload.tsx` with:
   - Drag-and-drop zone
   - File picker (multi-select)
   - Paste textarea
   - File card list with remove functionality
   - "Analyze Conversation" submit button with loading state
2. Integrate into the conversation wizard in `appointments/new.tsx`

### Phase 3 — Backend Processing Pipeline
1. Add multer config in `server/middleware/upload.ts` for conversation files
2. Create `whatsappParser.ts` for `.zip` handling
3. Create `conversationCreateService.ts`:
   - File type detection and routing
   - Text extraction from all input types
   - Claude API prompt construction and execution
   - Response parsing and validation
4. Add route in `server/routes.ts`

### Phase 4 — AI Prompt Engineering
1. Design and iterate on the extraction prompt
2. Handle multi-file/multi-format inputs in a single prompt
3. Add confidence scoring
4. Test with real SMS, WhatsApp, CSV, and screenshot samples

### Phase 5 — Review UI & Form Pre-fill (Frontend)
1. Build `ConversationReview.tsx` showing extraction results
2. Pass extracted data as `initialData` to `AppointmentForm`
3. Show confidence indicators per field
4. Show warnings for missing/ambiguous fields

### Phase 6 — Testing & Polish
1. End-to-end testing with each input format
2. Error handling for malformed files, API failures, rate limits
3. Loading states and progress indicators
4. Mobile responsiveness
5. Edge cases: empty conversations, multi-language text, very long conversations (token limits)

---

## 6. Edge Cases & Error Handling

| Scenario | Handling |
|---|---|
| No extractable data found | Show warning, allow manual form fill |
| AI rate limit / API error | Show error toast, allow retry |
| File too large | Reject at multer level (configurable limit, default 25MB per file) |
| Unsupported file type | Reject with descriptive error message |
| WhatsApp `.zip` missing `_chat.txt` | Fall back to sending any found `.txt` files; warn if none found |
| CSV with unknown columns | Let AI interpret; include column headers in prompt |
| Very long conversation (>token limit) | Truncate to most recent N messages with a note to the AI |
| Multiple conversations uploaded | Combine all into a single prompt context |
| Image OCR fails / low quality | Include warning in response; mark affected fields as low confidence |
| Ambiguous dates (e.g., "next Tuesday") | AI resolves relative to current date; flag as medium confidence |

---

## 7. Security Considerations

- All uploaded files are processed server-side and not stored permanently (temp directory, cleaned up after processing)
- File type validation at both frontend and backend (MIME type + extension)
- Zip bomb protection: limit uncompressed size and file count from `.zip` archives
- Sanitize all AI-extracted text before inserting into the database (existing Zod validation handles this)
- Rate limit the `/api/conversation-create/analyze` endpoint to prevent API cost abuse
- The `ANTHROPIC_API_KEY` is stored as a server-side secret and never exposed to the frontend

---

## 8. Future Enhancements (Out of Scope for V1)

- **Batch processing**: Upload multiple conversations to create multiple appointments at once
- **Template learning**: The AI learns from corrected fields to improve future extractions
- **Direct messaging integration**: Connect to Twilio/WhatsApp Business API to pull conversations directly
- **Voice message transcription**: Transcribe audio files from WhatsApp exports
- **Client auto-matching**: Match extracted phone numbers / names against the existing `clients` table and auto-link
- **Conversation history**: Store the original conversation text with the appointment for reference

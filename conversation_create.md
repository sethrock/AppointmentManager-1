# Conversation Create Feature

## Overview

"Conversation Create" is a new appointment creation method that allows users to upload or paste conversation data (SMS/MMS texts, WhatsApp chat exports, CSV spreadsheets, and screenshots/photos of conversations). An AI model (Anthropic Claude) analyzes the conversation content and automatically fills out the entire Appointment Details form with accurate, extracted information.

## User Flow

### 1. Entry Point — "New Appointment" Button Dropdown

**Current Behavior:** The "New Appointment" button on `/dashboard` and `/appointments` navigates directly to `/appointments/new`.

**New Behavior:** The button becomes a split/dropdown button with two options:
- **Manual Create** — navigates to `/appointments/new` (existing behavior)
- **Conversation Create** — navigates to `/appointments/new/conversation`

The dropdown appears on both the Dashboard page and the Appointments list page.

### 2. Conversation Create Page (`/appointments/new/conversation`)

A dedicated page with a clean upload interface where the user can provide conversation data through multiple input methods:

#### Input Methods

| Method | Description | Format |
|--------|-------------|--------|
| **Paste Text** | User pastes SMS/MMS or chat text directly into a large text area | Plain text |
| **WhatsApp Export** | Upload or drag-and-drop a WhatsApp chat `.zip` file | `.zip` file containing `_chat.txt` and optional media |
| **CSV Upload** | Upload or drag-and-drop a `.csv` spreadsheet of conversation data | `.csv` file |
| **Screenshot/Photo Upload** | Upload or drag-and-drop screenshots or photos of conversations | `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic` |

#### UI Layout
- Tab-based interface for switching between input methods (Paste Text | Upload File | Upload Screenshot)
- Drag-and-drop zone with visual feedback for file uploads
- Support for multiple file uploads at once
- File preview/thumbnail display after upload
- "Analyze Conversation" button to trigger AI processing
- Loading state with progress indicator while AI processes

### 3. AI Processing

Once the user submits conversation data:

1. **Text Input**: Sent directly to the AI model
2. **WhatsApp .zip**: Server extracts `_chat.txt` from the zip, parses the text content
3. **CSV Files**: Server parses the CSV and formats it as readable conversation text
4. **Screenshots/Photos**: Sent to AI model using vision capabilities (image analysis)

The AI model (Anthropic Claude) receives the conversation content along with a structured prompt that instructs it to extract all relevant appointment details.

#### AI Extraction Targets

The AI will attempt to extract and map the following fields from the conversation:

| Form Field | What AI Looks For |
|------------|-------------------|
| `clientName` | Client's name mentioned in conversation |
| `phoneNumber` | Phone number if visible |
| `clientEmail` | Email address if mentioned |
| `callType` | Whether the appointment is in-call or out-call based on context |
| `streetAddress`, `city`, `state`, `zipCode` | Location details for out-calls |
| `startDate` | Appointment date discussed |
| `startTime` | Appointment time discussed |
| `endDate` | End date if discussed |
| `endTime` | End time if discussed |
| `callDuration` | Duration discussed (in hours) |
| `grossRevenue` | Price/rate discussed |
| `depositAmount` | Deposit amount if mentioned |
| `clientNotes` | Any special requests, preferences, or important notes |
| `marketingChannel` | Platform the conversation originated from (if identifiable) |
| `outcallDetails` | Specific outcall instructions (hotel name, room number, etc.) |

#### AI Response Format

The AI returns a structured JSON object matching the appointment form schema. Fields that cannot be determined from the conversation are left as `null` or empty.

### 4. Form Pre-fill and Review

After AI processing:
- User is redirected to the standard `/appointments/new` form
- All extracted fields are pre-populated in the form
- Fields the AI couldn't determine are left empty for manual entry
- A banner at the top indicates "Form auto-filled from conversation — please review before submitting"
- User can edit any field before final submission
- The existing form submission flow handles the rest (database save, calendar, email notifications)

## Technical Architecture

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NewAppointmentDropdown` | `client/src/components/appointment/NewAppointmentDropdown.tsx` | Dropdown button replacing the current "New Appointment" link |
| `ConversationCreate` | `client/src/pages/appointments/conversation-create.tsx` | Main page for conversation upload and processing |

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/conversation/analyze` | POST | Receives conversation data (text, files, images), processes with AI, returns extracted appointment fields |

### Server Services

| Service | Location | Purpose |
|---------|----------|---------|
| `conversationService.ts` | `server/services/conversationService.ts` | Handles file parsing (zip extraction, CSV parsing), constructs AI prompts, calls Anthropic API, returns structured data |

### File Processing Pipeline

```
User Input
    ├── Plain Text → Direct to AI
    ├── .zip File → Extract _chat.txt → Parse → Send to AI
    ├── .csv File → Parse rows → Format as conversation → Send to AI
    └── Images → Send to AI with vision capability
         ↓
    AI Model (Claude)
         ↓
    Structured JSON Response
         ↓
    Pre-fill Appointment Form
```

### Dependencies

- **Already Installed**: `@anthropic-ai/sdk` (Anthropic Claude SDK)
- **Already Installed**: `multer` (file upload handling)
- **Needs Install**: `jszip` (for WhatsApp .zip extraction)
- **Already Available**: CSV parsing via built-in logic

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude model access |

## Implementation Tasks

### Task 1: Create the Dropdown Button Component
- Replace the single "New Appointment" button on Dashboard and Appointments pages
- Add dropdown with two options: "Manual Create" and "Conversation Create"
- Maintain existing styling (gradient, icons)

### Task 2: Create the Conversation Create Page
- Build the upload/paste interface with tabs
- Implement drag-and-drop file upload zone
- Add file type validation and preview
- Handle multiple file uploads
- Add the "Analyze Conversation" button with loading states

### Task 3: Build the Backend Conversation Analysis Endpoint
- Create `POST /api/conversation/analyze` route
- Handle multipart form data (text + files)
- Implement file processing (zip extraction, CSV parsing)
- Construct AI prompt with conversation content
- Call Anthropic Claude API
- Return structured appointment data

### Task 4: Create the Conversation Service
- WhatsApp `.zip` file extraction and text parsing
- CSV file parsing and formatting
- Image handling for vision API
- AI prompt engineering for accurate field extraction
- Response validation and mapping to appointment schema

### Task 5: Connect AI Output to Appointment Form
- Pass extracted data as pre-fill values to the existing AppointmentForm
- Add review banner indicating auto-filled data
- Ensure all form validation still works with pre-filled data

### Task 6: Testing and Refinement
- Test with sample SMS conversations
- Test with WhatsApp export files
- Test with CSV conversation data
- Test with screenshot images
- Verify form pre-fill accuracy
- Handle edge cases (incomplete data, multiple appointments in one conversation, etc.)

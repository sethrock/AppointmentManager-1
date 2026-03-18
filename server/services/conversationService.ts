import Anthropic from "@anthropic-ai/sdk";
import JSZip from "jszip";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedAppointmentData {
  clientName?: string;
  phoneNumber?: string;
  clientEmail?: string;
  clientUsesEmail?: boolean;
  callType?: string;
  streetAddress?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  outcallDetails?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  callDuration?: number;
  grossRevenue?: number;
  depositAmount?: number;
  clientNotes?: string;
  marketingChannel?: string;
  provider?: string;
  hasClientNotes?: boolean;
  isRebookRequest?: boolean;
  rebookClientName?: string;
}

const SYSTEM_PROMPT = `You are an AI assistant that extracts appointment booking details from conversations OR processes rebook/repeat appointment requests. You will receive text from SMS/MMS messages, WhatsApp chats, CSV data, screenshots of conversations, or direct instructions from a user.

Your job is to extract ALL relevant appointment details and return them as a structured JSON object. Be thorough and accurate.

REBOOK/REPEAT DETECTION:
If the input mentions rebooking, repeating, or creating a new appointment for an existing client by name (e.g., "Rebook Michael Brandon Ponsoll for Friday at 3pm", "New appointment for John Smith on March 25 at 2pm", "Same client Jane Doe, book her for next Tuesday 5pm"), then:
- Set "isRebookRequest" to true
- Set "rebookClientName" to the client's name exactly as mentioned
- Extract the new date and time into startDate and startTime
- Extract any other NEW details mentioned (if they say a different duration, rate, call type, etc.)
- Leave fields as null if they are not explicitly mentioned (the system will fill them from the existing record)

Here are the fields you need to extract (use null for any field you cannot determine):

- clientName: The client's name (first and last if available)
- phoneNumber: The client's phone number (digits only, no formatting)
- clientEmail: The client's email address
- clientUsesEmail: true if an email was provided or mentioned
- callType: Either "in-call" or "out-call" based on context
- streetAddress: Street address for out-calls
- addressLine2: Apartment/suite number for out-calls
- city: City for out-calls
- state: US state abbreviation for out-calls (e.g., "CA", "NY")
- zipCode: ZIP code for out-calls
- outcallDetails: Any specific details about the out-call location (hotel name, room number, gate code, parking instructions, etc.)
- startDate: The appointment date in YYYY-MM-DD format
- startTime: The appointment start time in HH:MM format (24-hour)
- endDate: The appointment end date in YYYY-MM-DD format (same as startDate if not specified)
- endTime: The appointment end time in HH:MM format (24-hour)
- callDuration: Duration in hours (e.g., 1, 1.5, 2, 2.5, 3)
- grossRevenue: The total price/rate discussed (number only, no $ sign)
- depositAmount: The deposit amount if mentioned (number only)
- clientNotes: Any special requests, preferences, or important notes about the client
- marketingChannel: The platform the conversation originated from. Must be one of: "Private Delights", "Eros", "Tryst", "P411", "Slixa", "Instagram", "X", "Referral". Infer from context clues if possible.
- provider: The provider's name if mentioned
- isRebookRequest: true if this is a request to rebook/repeat an existing client, false otherwise
- rebookClientName: The client's name to look up if this is a rebook request

Important rules:
1. For dates, try to determine the actual calendar date. If the conversation says "tomorrow" or "next Tuesday", try to calculate the actual date based on any timestamps in the conversation. Today's date will be provided in the message.
2. For times, always use 24-hour format (e.g., 14:00 not 2:00 PM).
3. If a duration is mentioned (e.g., "1 hour", "2 hours"), calculate the end time from the start time.
4. Phone numbers should be 10 digits, no formatting.
5. For state, use the 2-letter abbreviation.
6. Extract ALL notes and special requests into clientNotes.
7. If the conversation mentions a specific website or app where they connected, map it to the marketingChannel options.

Return ONLY a valid JSON object with these fields. Use null for any field you cannot confidently determine. Do not include any explanation or markdown formatting - just the raw JSON object.`;

export async function extractFromText(conversationText: string): Promise<ExtractedAppointmentData> {
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today's date is ${today} (${dayOfWeek}). Here is the conversation/request to analyze:\n\n${conversationText}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI model");
  }

  return parseAIResponse(textContent.text);
}

export async function extractFromImages(
  imageBuffers: { data: Buffer; mediaType: string }[]
): Promise<ExtractedAppointmentData> {
  const imageContent: Anthropic.Messages.ContentBlockParam[] = imageBuffers.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: img.data.toString("base64"),
    },
  }));

  imageContent.push({
    type: "text" as const,
    text: "Please analyze these conversation screenshot(s) and extract all appointment booking details.",
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: imageContent,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from AI model");
  }

  return parseAIResponse(textContent.text);
}

export async function extractTextFromZip(zipBuffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(zipBuffer);
  let chatText = "";

  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.endsWith(".txt") && !file.dir) {
      chatText += await file.async("text");
      chatText += "\n";
    }
  }

  if (!chatText.trim()) {
    throw new Error("No text content found in the zip file. Make sure it contains a WhatsApp chat export.");
  }

  return chatText;
}

export function parseCSVToConversation(csvContent: string): string {
  const lines = csvContent.split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file appears to be empty or has no data rows.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const conversationLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const entry: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (idx < values.length) {
        entry[header] = values[idx];
      }
    });

    const dateCol = entry["date"] || entry["timestamp"] || entry["time"] || "";
    const senderCol = entry["sender"] || entry["from"] || entry["name"] || entry["contact"] || "";
    const messageCol = entry["message"] || entry["text"] || entry["body"] || entry["content"] || "";

    if (messageCol) {
      const prefix = [dateCol, senderCol].filter(Boolean).join(" - ");
      conversationLines.push(prefix ? `${prefix}: ${messageCol}` : messageCol);
    }
  }

  if (conversationLines.length === 0) {
    throw new Error("No conversation messages found in the CSV file.");
  }

  return conversationLines.join("\n");
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseAIResponse(responseText: string): ExtractedAppointmentData {
  let jsonStr = responseText.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  const result: ExtractedAppointmentData = {};

  if (parsed.clientName) result.clientName = String(parsed.clientName);
  if (parsed.phoneNumber) result.phoneNumber = String(parsed.phoneNumber).replace(/\D/g, "");
  if (parsed.clientEmail) {
    result.clientEmail = String(parsed.clientEmail);
    result.clientUsesEmail = true;
  }
  if (parsed.callType && ["in-call", "out-call"].includes(parsed.callType)) {
    result.callType = parsed.callType;
  }
  if (parsed.streetAddress) result.streetAddress = String(parsed.streetAddress);
  if (parsed.addressLine2) result.addressLine2 = String(parsed.addressLine2);
  if (parsed.city) result.city = String(parsed.city);
  if (parsed.state) result.state = String(parsed.state);
  if (parsed.zipCode) result.zipCode = String(parsed.zipCode);
  if (parsed.outcallDetails) result.outcallDetails = String(parsed.outcallDetails);
  if (parsed.startDate) result.startDate = String(parsed.startDate);
  if (parsed.startTime) result.startTime = String(parsed.startTime);
  if (parsed.endDate) result.endDate = String(parsed.endDate);
  if (parsed.endTime) result.endTime = String(parsed.endTime);
  if (parsed.callDuration != null) result.callDuration = Number(parsed.callDuration);
  if (parsed.grossRevenue != null) result.grossRevenue = Number(parsed.grossRevenue);
  if (parsed.depositAmount != null) result.depositAmount = Number(parsed.depositAmount);
  if (parsed.clientNotes) {
    result.clientNotes = String(parsed.clientNotes);
    result.hasClientNotes = true;
  }
  if (parsed.marketingChannel) result.marketingChannel = String(parsed.marketingChannel);
  if (parsed.provider) result.provider = String(parsed.provider);
  if (parsed.isRebookRequest) result.isRebookRequest = true;
  if (parsed.rebookClientName) result.rebookClientName = String(parsed.rebookClientName);

  return result;
}

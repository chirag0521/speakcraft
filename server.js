import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// Prioritized list of Gemini models.
// gemini-3.5-flash-lite and gemini-flash-lite-latest respond in ~1.8-2.2 seconds with high availability.
// Full models (gemini-3.5-flash, gemini-3.8-flash) act as high-quality fallbacks.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_MODELS = [
  PRIMARY_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

function extractOrRepairJSON(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const cleaned = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 1. Direct parse
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  // 2. Extract outermost { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      JSON.parse(slice);
      return slice;
    } catch {}
  }

  // 3. Auto-close truncated JSON if cut off
  if (firstBrace !== -1) {
    let candidate = cleaned.slice(firstBrace).replace(/,\s*$/, "");
    try {
      let inString = false;
      let escaped = false;
      let openBraces = 0;
      let openBrackets = 0;
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === "{") openBraces++;
          else if (ch === "}") openBraces--;
          else if (ch === "[") openBrackets++;
          else if (ch === "]") openBrackets--;
        }
      }
      let repaired = candidate;
      if (inString) repaired += '"';
      while (openBrackets > 0) {
        repaired += "]";
        openBrackets--;
      }
      while (openBraces > 0) {
        repaired += "}";
        openBraces--;
      }
      JSON.parse(repaired);
      return repaired;
    } catch {}
  }

  return null;
}

async function generateWithGemini(system, userText, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 500, error: "GEMINI_API_KEY is not set on the server." };
  }

  // Ensure ample token limit so detailed coaching feedback or reasoning is never truncated
  const outputTokens = Math.max(Number(maxTokens) || 0, 2500);

  let lastStatus = 500;
  let lastErrorMessage = "Unknown error communicating with Gemini API";

  for (const model of FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    // Fast failover: at most 2 attempts per model before switching to the next healthy model
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system || "" }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
            generationConfig: {
              maxOutputTokens: outputTokens,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const candidate = data.candidates?.[0];
          const text =
            (candidate?.content?.parts &&
              candidate.content.parts.map((p) => p.text || "").join("")) ||
            "";

          const validJSON = extractOrRepairJSON(text);
          if (validJSON) {
            return { success: true, text: validJSON };
          }

          console.warn(
            `[Gemini API] ${model} returned unparseable text (finishReason: ${candidate?.finishReason}). Trying fallback model...`
          );
          break; // Try next fallback model
        }

        lastStatus = response.status;
        lastErrorMessage = data.error?.message || `Gemini API returned status ${response.status}`;

        // Retryable on 503 (High demand) or 429 (Rate limit)
        const isRetryable = response.status === 503 || response.status === 429 || response.status >= 500;

        if (isRetryable && attempt < maxAttempts) {
          const delay = 400 + Math.round(Math.random() * 200);
          console.warn(`[Gemini API] ${model} returned ${response.status}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Move to the next model in the fallback list quickly
        console.warn(`[Gemini API] ${model} failed with ${response.status}: ${lastErrorMessage}. Trying fallback model...`);
        break;
      } catch (err) {
        lastStatus = 500;
        lastErrorMessage = err.message;
        if (attempt < maxAttempts) {
          const delay = 400 + Math.round(Math.random() * 200);
          console.warn(`[Gemini API] Network error on ${model}. Retrying in ${delay}ms...`, err.message);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }
  }

  const friendlyMessage =
    lastStatus === 503
      ? "The AI coach is currently experiencing high demand. Please try again in a few moments."
      : lastStatus === 429
      ? "Rate limit exceeded. Please wait a moment before trying again."
      : lastErrorMessage;

  return { status: lastStatus, error: friendlyMessage };
}

// The frontend (client/src/App.jsx) was originally written for Anthropic's
// Messages API shape: it POSTs { model, max_tokens, system, messages } and
// expects back { content: [{ type: "text", text }] }. Rather than touch
// that code, this endpoint translates both directions so the app never
// has to know which provider is actually behind it.
app.post("/api/chat", async (req, res) => {
  const { system, messages, max_tokens } = req.body;
  const userText = (messages && messages[0] && messages[0].content) || "";

  const result = await generateWithGemini(system, userText, max_tokens);

  if (!result.success) {
    return res.status(result.status || 500).json({ error: result.error });
  }

  res.json({ content: [{ type: "text", text: result.text }] });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "client", "dist");

app.use(express.static(clientDist));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SpeakCraft server running on port ${PORT}`));

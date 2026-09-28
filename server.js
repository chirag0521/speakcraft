import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// Free-tier Gemini models. Google can experience temporary high-demand spikes (HTTP 503)
// or rate limits (HTTP 429). We define a prioritized list of models and automatic retries.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const FALLBACK_MODELS = [
  PRIMARY_MODEL,
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

async function generateWithGemini(system, userText, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: 500, error: "GEMINI_API_KEY is not set on the server." };
  }

  let lastStatus = 500;
  let lastErrorMessage = "Unknown error communicating with Gemini API";

  for (const model of FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system || "" }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
            generationConfig: { maxOutputTokens: maxTokens || 1000 },
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const text =
            (data.candidates &&
              data.candidates[0] &&
              data.candidates[0].content &&
              data.candidates[0].content.parts &&
              data.candidates[0].content.parts.map((p) => p.text || "").join("")) ||
            "";
          return { success: true, text };
        }

        lastStatus = response.status;
        lastErrorMessage = data.error?.message || `Gemini API returned status ${response.status}`;

        // Retryable on 503 (Overloaded/Service Unavailable), 429 (Rate Limit), or 500+
        const isRetryable = response.status === 503 || response.status === 429 || response.status >= 500;

        if (isRetryable && attempt < maxAttempts) {
          const delay = Math.round(800 * Math.pow(1.8, attempt - 1) + Math.random() * 300);
          console.warn(`[Gemini API] ${model} attempt ${attempt} returned ${response.status}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // If not retryable or max attempts exhausted for this model, try next fallback model
        console.warn(`[Gemini API] ${model} failed with ${response.status}: ${lastErrorMessage}. Trying fallback model...`);
        break;
      } catch (err) {
        lastStatus = 500;
        lastErrorMessage = err.message;
        if (attempt < maxAttempts) {
          const delay = Math.round(800 * Math.pow(1.8, attempt - 1) + Math.random() * 300);
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

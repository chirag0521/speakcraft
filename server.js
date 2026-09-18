import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// Free-tier Gemini model. Google renames/retires free models fairly often —
// if this one ever 404s, check https://ai.google.dev/gemini-api/docs/models
// for the current model, then set GEMINI_MODEL in your .env (or Render env
// vars) to override this default without touching code.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

// The frontend (client/src/App.jsx) was originally written for Anthropic's
// Messages API shape: it POSTs { model, max_tokens, system, messages } and
// expects back { content: [{ type: "text", text }] }. Rather than touch
// that code, this endpoint translates both directions so the app never
// has to know which provider is actually behind it.
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });
  }

  const { system, messages, max_tokens } = req.body;
  const userText = (messages && messages[0] && messages[0].content) || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system || "" }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: max_tokens || 1000 },
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini API error" });
    }

    const text =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.map((p) => p.text || "").join("")) ||
      "";

    // Reshape into the envelope the frontend already expects.
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "client", "dist");

app.use(express.static(clientDist));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SpeakCraft server running on port ${PORT}`));

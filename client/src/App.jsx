import React, { useState, useEffect, useRef } from "react";

// 5-Color Palette:
// 1. CHINA ROSE: #A24C61 (162, 76, 97)
// 2. KOBI: #E2A9C0 (226, 169, 192)
// 3. QUEEN PINK: #E1C9D5 (225, 201, 213)
// 4. CHOCOLATE KISSES: #411528 (65, 21, 40)
// 5. PERSIAN PLUM: #710C21 (113, 12, 33)

const CHINA_ROSE = "#A24C61";
const KOBI = "#E2A9C0";
const QUEEN_PINK = "#E1C9D5";
const CHOCOLATE_KISSES = "#411528";
const PERSIAN_PLUM = "#710C21";

// Semantic token mapping
const INK = "#1A0610";          // Deep midnight plum/chocolate canvas backdrop
const INK_2 = CHOCOLATE_KISSES; // #411528 - Primary card & surface background
const PAPER = CHOCOLATE_KISSES; // #411528 - Container & card surface
const PAPER_DIM = "#2C0A1A";    // Deep inset fields & input backgrounds
const GOLD = KOBI;              // #E2A9C0 - Highlight accent, active buttons, John glow
const SAGE = CHINA_ROSE;        // #A24C61 - Primary interactive accent, button & ring
const TEXT_DARK = QUEEN_PINK;   // #E1C9D5 - Primary body and readable text
const RUST = KOBI;              // #E2A9C0 - Stat scores & emphasis
const CRIMSON = PERSIAN_PLUM;   // #710C21 - Active recording state, deep planet core

const MODES = [
  {
    id: "story",
    label: "Storytelling",
    tagline: "Turn a plain fact into a scene someone wants to hear.",
    prompts: [
      "Tell me about the last time a plan of yours completely fell apart.",
      "Describe your journey from your hometown to where you are now, like you're telling it to a stranger on a train.",
      "Recount a mistake you made at work or college, and how you fixed it.",
      "Tell me about a person who changed how you think about something.",
      "Describe the morning of the most stressful exam or interview you've had.",
      "Tell a story about a time you had to learn something completely new, fast.",
    ],
  },
  {
    id: "polite",
    label: "Polite Ask",
    tagline: "Get a yes without sounding like you're begging or ordering.",
    prompts: [
      "Ask your manager for two extra days on a deadline.",
      "Ask a senior engineer to review your code even though they're clearly busy.",
      "Ask a shopkeeper to hold an item for you until evening.",
      "Ask your professor to explain a topic again after class.",
      "Ask a stranger to switch train seats with you so you can sit with a friend.",
    ],
  },
  {
    id: "request",
    label: "Firm Request",
    tagline: "State what you need clearly, with no wiggle room, but no rudeness.",
    prompts: [
      "Tell a vendor the delivery is late for the third time and you need a fixed date today.",
      "Tell a teammate their part of the project is blocking everyone and you need it by tomorrow morning.",
      "Tell a landlord a repair has been pending for two weeks and needs to happen this week.",
      "Tell a client the current scope has changed and the price needs to change with it.",
    ],
  },
  {
    id: "command",
    label: "Commanding",
    tagline: "Give direction like someone who's actually in charge of the outcome.",
    prompts: [
      "You're leading a team of three on a deadline today. Assign the remaining tasks.",
      "A junior keeps skipping code reviews. Tell them this stops now, without being cruel.",
      "You're running a fire-drill-style incident call. Direct three people on what to do in the next ten minutes.",
      "Brief a new intern on the one rule they must never break in your codebase.",
    ],
  },
  {
    id: "free",
    label: "Free Practice",
    tagline: "No prompt. Say whatever's on your mind, out loud, in English.",
    prompts: ["Talk about anything — your day, an opinion, a plan for the week."],
  },
  {
    id: "humor",
    label: "Humor & Wit",
    tagline: "Land a joke, take a joke, and think of the funny line before the moment's gone.",
    prompts: [
      "Your friend shows up an hour late and says 'traffic.' Give a witty comeback.",
      "Someone at work jokes that your code never compiles on the first try. Respond with a self-deprecating joke.",
      "Tell a short, funny story about the most awkward thing that happened to you this month.",
      "Your interviewer asks 'so, tell me something interesting about yourself' — answer it with a bit of humor, not just facts.",
      "A friend teases you for being bad at cricket/football. Make a playful comeback that gets a laugh, not an argument.",
      "Describe your typical Monday morning in a humorous two-minute routine.",
    ],
  },
  {
    id: "pushback",
    label: "Handling Pushback",
    tagline: "Someone pushes back. Hold your ground without caving or getting defensive.",
    prompts: [
      "You told a client the price is fixed. They say 'the other company is cheaper.' Respond without just repeating the same line.",
      "Your manager pushes back on your time estimate, saying it's 'too slow.' Defend it with reasoning, not defensiveness.",
      "A teammate says your idea 'won't work' in front of the group. Respond without backing down or getting heated.",
      "An interviewer challenges an answer you gave: 'are you sure that's the best approach?' Respond with confidence, not panic.",
      "Your landlord says the pending repair 'isn't that urgent.' Push back while staying respectful.",
    ],
  },
  {
    id: "negotiation",
    label: "Negotiation",
    tagline: "Read what the other side actually needs, and find a version of the ask that works for both.",
    prompts: [
      "You're negotiating your starting salary and the recruiter says the number is fixed. Try for something else instead of just accepting.",
      "Two teammates disagree on which tech stack to use, and you need to broker a decision everyone can live with.",
      "You want extra vacation days but your manager only offers half. Find a version of the ask that works for both of you.",
      "You're splitting rent unevenly with roommates because your room is smaller. Make the case for it.",
      "A client wants a discount on your freelance rate. Find a way to say yes that still protects your work's value.",
    ],
  },
  {
    id: "sales",
    label: "Sales Call",
    tagline: "Open strong, handle the objection, and actually ask for the close.",
    prompts: [
      "Cold-call opening: you have 15 seconds before they hang up. Introduce yourself and your product in a way that earns 30 more seconds.",
      "The prospect says 'we're happy with our current provider.' Respond without arguing or sounding desperate.",
      "The prospect says 'send me some information and I'll get back to you' — that's usually a polite no. Get a real next step instead.",
      "You're mid-pitch and the prospect says 'this sounds expensive.' Handle the price objection.",
      "Close the call: the prospect seems interested but hasn't committed. Ask for the next step directly.",
      "A prospect asks a tough technical question you don't fully know the answer to. Handle it without losing credibility.",
    ],
  },
];

function dayNumber() {
  return Math.floor(Date.now() / 86400000);
}

async function callClaude(systemPrompt, userText) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const data = await res.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
}

function safeParseJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

const COACH_NAME = "John";

const COACH_BASE =
  "You are John, a warm, direct, encouraging human English speaking coach with a good sense of humor, sitting across from your student in a live spoken session (their side is typed, but meant as spoken practice). You are ALWAYS the coach — never the manager, shopkeeper, teammate, or any other character from the practice scenario, EXCEPT in the one specific case covered below for 'challenge'. You speak TO the student ABOUT their attempt at that scenario, the way a real coach would after they rehearse a line. Address them by name occasionally and naturally if you're given one, not in every line. You're allowed to be a little playful or funny in how you phrase feedback when it fits naturally — a light quip, a wry aside — but never at the student's expense, and never forced; humor should never get in the way of clear, useful correction. Respond ONLY with a JSON object, no preamble, no markdown fences: {\"corrected\": string, \"fixes\": [{\"said\": string, \"better\": string, \"why\": string, \"category\": string}], \"vocab\": [{\"insteadOf\": string, \"word\": string, \"meaning\": string, \"example\": string, \"useWhen\": string}], \"tip\": string, \"challenge\": string, \"followUp\": string}. 'corrected' is a natural rewrite of their latest turn only, keeping their voice and facts — this is what you'd say 'try it like this instead'. 'fixes' lists up to 4 concrete swaps as 'you said X, say Y instead' with a one-line reason; 'category' is a short 2-3 word label for the TYPE of mistake (e.g. 'wrong preposition', 'verb tense', 'subject-verb agreement', 'word order', 'article usage', 'run-on sentence') so the same kind of mistake can be tracked over time — reuse the same category label consistently for the same underlying error type, don't invent a new phrasing each time. 'vocab' lists up to 3 stronger, more expressive words to upgrade what the student said. For each item: 'insteadOf' MUST be the exact word or phrase the student used that could be upgraded, 'word' MUST be the richer word John suggests using instead, 'meaning' MUST be explained in very clear, simple, plain English that is easy to understand, 'example' MUST be a realistic conversational sentence showing how to use the word, and 'useWhen' is one short line on when to reach for this word. 'tip' is one sentence of coaching advice specific to what they said. 'challenge': the message will tell you the student's current difficulty level for this mode, 1 to 5. If it is 3 or higher, briefly step OUT of the coach role and write ONE short, realistic, resistant line AS the other person in the scenario (skeptical, impatient, dismissive, or pushing back) reacting to the student's corrected line — this simulates a harder version of the conversation. If the level is below 3, leave 'challenge' as an empty string. 'followUp' is always back in the coach's own voice: a short, warm, spoken reaction under 30 words — if there's a 'challenge', tell them to respond to it; otherwise acknowledge something they did well or fix in one breath, then push them to try the line again or ask one short coaching question. It should sound like a real coach talking, not a written note.";

const MODE_SYSTEM = {
  story: COACH_BASE + " Focus area: storytelling — pacing, a strong opening line, concrete detail, cutting filler.",
  polite: COACH_BASE + " Focus area: polite requests — getting to yes without sounding stiff, weak, or blunt.",
  request: COACH_BASE + " Focus area: firm requests — being direct and clear without sounding apologetic or aggressive.",
  command: COACH_BASE + " Focus area: giving direction like a team lead — confident and clear without being harsh.",
  free: COACH_BASE + " Focus area: general fluency and clarity — whatever would most help them sound natural.",
  humor:
    COACH_BASE +
    " Focus area: humor and wit — this is the one mode where being funny IS the skill, not just the delivery style. Judge whether their line actually lands: is the timing right, is there a real twist or surprise, is it too long or over-explained, does the setup waste words the punchline needs? 'corrected' should be a funnier, tighter version of their actual attempt — same idea, better joke. 'fixes' should point out where a joke died because of pacing, wrong word order, or too much setup, not just grammar. 'vocab' can include comedic techniques or sharper words, not just vocabulary. 'tip' is one line of real comedy-writing advice (rule of three, misdirection, cutting to the punchline, understatement). 'followUp' can react like someone who actually just heard the joke — genuinely amused, mildly unimpressed, or asking them to top it — and can nudge them to try a punchier version.",
  pushback:
    COACH_BASE +
    " Focus area: handling pushback and objections — staying calm and addressing the actual objection someone raised, instead of repeating the same line louder, getting defensive, or caving immediately. Good answers acknowledge the objection specifically before responding to it. 'corrected' should show a version that engages with what the other person actually said. 'tip' should flag if they ignored the objection, sounded defensive, or folded too easily.",
  negotiation:
    COACH_BASE +
    " Focus area: negotiation and reading the room — finding a version of the ask that gives the other side something too, instead of just repeating the original demand, and noticing what the other party's real constraint or interest might be. 'corrected' should show a version that trades or reframes rather than just insisting. 'tip' should flag if they left value on the table, gave in too fast, or didn't address what the other side actually cares about.",
  sales:
    COACH_BASE +
    " Focus area: sales calls — a clear, honest value proposition, handling real objections without arguing or caving, and always ending with a concrete next step instead of a vague one. 'corrected' should tighten their pitch or objection response — cut filler, lead with the benefit, ask for something specific. 'tip' should flag if they buried the ask, argued with the objection instead of addressing it, or ended the call without a clear next step. Never coach dishonest claims, fake urgency, or pressure tactics — the goal is a confident, credible pitch, not a manipulative one.",
};

const SCORECARD_SYSTEM =
  "You are John, the student's English speaking and social intelligence coach, writing an end-of-session review. You'll get a compact log of what the student said this session and the mistake categories flagged along the way. Respond ONLY with JSON, no preamble, no markdown fences: {\"scores\": {\"fluency\": number, \"grammar\": number, \"vocabulary\": number, \"pronunciation\": number, \"confidence\": number, \"clarity\": number, \"assertiveness\": number, \"persuasiveness\": number, \"activeListening\": number, \"socialIntelligence\": number}, \"topMistakes\": [string, string, string], \"betterPhrases\": [string, string, string], \"habitToStop\": string, \"habitToDevelop\": string, \"skillToPracticeTomorrow\": string, \"nextChallenge\": string, \"spoken\": string}. Every score is an integer 1-10, judged only from what's visible in the log; pronunciation and activeListening can't really be judged from text, so estimate them conservatively around 6-7 unless the log clearly suggests otherwise — never fabricate confident precision you don't have grounds for. 'topMistakes' and 'betterPhrases' must be concrete and drawn from the actual log, not generic advice. 'habitToStop' and 'habitToDevelop' are one short phrase each. 'skillToPracticeTomorrow' names one specific thing (e.g. 'holding your ground when someone pushes back twice'). 'nextChallenge' is one sentence describing a slightly harder version of today's scenario for next time. 'spoken' is a short, warm, spoken closing line under 35 words — name the single biggest thing to work on next, not the whole list, the way a coach sends you off after a real session.";

const MODE_ORDER = ["story", "polite", "request", "command", "humor", "pushback", "negotiation", "free", "sales"];

function pickVoice(voiceList) {
  const list =
    voiceList && voiceList.length > 0
      ? voiceList
      : typeof window !== "undefined" && window.speechSynthesis
      ? window.speechSynthesis.getVoices()
      : [];
  if (!list || list.length === 0) return null;

  // 1. Prioritize modern high-fidelity Natural/Online male voices for maximum clarity & volume
  const preferredMaleNames = [
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Ryan Online (Natural) - English (United Kingdom)",
    "Google UK English Male",
    "Microsoft Christopher Online (Natural) - English (United States)",
    "Microsoft Andrew Online (Natural) - English (United States)",
    "Microsoft Brian Online (Natural) - English (United States)",
    "Microsoft Eric Online (Natural) - English (United States)",
    "Microsoft Steffan Online (Natural) - English (United States)",
    "Microsoft David Desktop - English (United States)",
    "Microsoft David - English (United States)",
    "Microsoft Mark - English (United States)",
    "Microsoft George - English (United Kingdom)",
    "Google US English",
    "Daniel",
    "Alex",
    "Oliver",
    "Arthur",
    "Fred",
  ];

  for (const name of preferredMaleNames) {
    const v = list.find((item) => item.name === name);
    if (v) return v;
  }

  // 2. Next priority: any voice with "Natural" or "Online" that is male
  const naturalMale = list.find((v) => {
    const lower = v.name.toLowerCase();
    const isEn = v.lang && v.lang.toLowerCase().startsWith("en");
    return (
      isEn &&
      (lower.includes("natural") || lower.includes("online")) &&
      (lower.includes("guy") ||
        lower.includes("ryan") ||
        lower.includes("male") ||
        lower.includes("david") ||
        lower.includes("andrew") ||
        lower.includes("george") ||
        lower.includes("christopher") ||
        lower.includes("brian"))
    );
  });
  if (naturalMale) return naturalMale;

  const maleKeywords = [
    "male",
    "david",
    "mark",
    "guy",
    "ryan",
    "daniel",
    "alex",
    "george",
    "james",
    "oliver",
    "fred",
    "andrew",
    "brian",
    "eric",
    "steffan",
  ];
  const femaleKeywords = [
    "female",
    "zira",
    "hazel",
    "susan",
    "samantha",
    "victoria",
    "karen",
    "jenny",
    "sonia",
    "libby",
    "natasha",
    "aria",
    "ava",
  ];

  const englishVoices = list.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));

  // 3. First priority: English voice matching a male keyword
  const detectedMale = englishVoices.find((v) => {
    const lower = v.name.toLowerCase();
    const hasMale = maleKeywords.some((k) => lower.includes(k));
    const hasFemale = femaleKeywords.some((k) => lower.includes(k));
    return hasMale && !hasFemale;
  });
  if (detectedMale) return detectedMale;

  // 4. Second priority: English voice that does not have female keywords
  const nonFemale = englishVoices.find((v) => {
    const lower = v.name.toLowerCase();
    return !femaleKeywords.some((k) => lower.includes(k));
  });
  if (nonFemale) return nonFemale;

  return englishVoices[0] || list[0];
}


export default function SpeakCraft() {
  const [mode, setMode] = useState(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [thread, setThread] = useState([]); // {user, corrected, fixes, vocab, tip, followUp}
  const [streak, setStreak] = useState(1);
  const [lastPracticeDay, setLastPracticeDay] = useState(null);
  const [vocabBank, setVocabBank] = useState([]);
  const [mistakesBank, setMistakesBank] = useState([]);
  const [showReminder, setShowReminder] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy reminder text");
  const [speechOn, setSpeechOn] = useState(true);
  const [voices, setVoices] = useState([]);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [studentName, setStudentName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [modeDifficulty, setModeDifficulty] = useState({});
  const [lastFocus, setLastFocus] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const silenceTimerRef = useRef(null);
  const bottomRef = useRef(null);
  const transcriptAccumRef = useRef("");
  const autoListenRef = useRef(true);
  const handleSubmitRef = useRef(null);
  const [autoListen, setAutoListen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTypeFallback, setShowTypeFallback] = useState(false);
  const autoStartTimerRef = useRef(null);

  // Real-time voice rhythm levels (0 to 1) for driving Saturn's rings
  const [userVoiceLevel, setUserVoiceLevel] = useState(0);
  const [johnVoiceLevel, setJohnVoiceLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechIdRef = useRef(0);

  function cancelSpeech() {
    speechIdRef.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
    setJohnVoiceLevel(0);
  }

  const currentMode = mode ? MODES.find((m) => m.id === mode) : null;

  async function deleteVocabWord(wordToDelete) {
    const updated = vocabBank.filter(
      (v) => (v.word || "").toLowerCase() !== wordToDelete.toLowerCase()
    );
    setVocabBank(updated);
    try {
      const s = await window.storage.get("speakcraft:progress");
      const current = s && s.value ? JSON.parse(s.value) : {};
      current.vocabBank = updated;
      await window.storage.set("speakcraft:progress", JSON.stringify(current));
    } catch (e) {}
  }

  async function clearAllVocab() {
    setVocabBank([]);
    try {
      const s = await window.storage.get("speakcraft:progress");
      const current = s && s.value ? JSON.parse(s.value) : {};
      current.vocabBank = [];
      await window.storage.set("speakcraft:progress", JSON.stringify(current));
    } catch (e) {}
  }

  // John's speaking rhythm simulation: multi-harmonic cadence matching speech syllables and intonations
  useEffect(() => {
    if (!isSpeaking) {
      setJohnVoiceLevel(0);
      return;
    }
    let animId;
    const t0 = performance.now();
    const step = (now) => {
      const elapsed = (now - t0) / 1000;
      // Speech syllable cadence ~3.4 Hz + intonation ~1.3 Hz + sentence contour ~0.6 Hz
      const rhythm =
        0.48 +
        0.32 * Math.sin(elapsed * 2 * Math.PI * 3.4) * Math.cos(elapsed * 2 * Math.PI * 1.3) +
        0.14 * Math.sin(elapsed * 2 * Math.PI * 0.65);
      const clamped = Math.max(0.1, Math.min(1.0, rhythm));
      setJohnVoiceLevel(clamped);
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (currentMode) {
      setPromptIdx(dayNumber() % currentMode.prompts.length);
      setThread([]);
    }
  }, [mode]);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage.get("speakcraft:progress");
        if (s && s.value) {
          const parsed = JSON.parse(s.value);
          parsed.streak = 1;
          try {
            await window.storage.set("speakcraft:progress", JSON.stringify(parsed));
          } catch (err) {}
          setStreak(1);
          setLastPracticeDay(parsed.lastPracticeDay ?? null);
          setVocabBank(parsed.vocabBank || []);
          setMistakesBank(parsed.mistakesBank || []);
        } else {
          setStreak(1);
        }
      } catch (e) {
        setStreak(1);
      }
      try {
        const n = await window.storage.get("speakcraft:name");
        if (n && n.value) setStudentName(n.value);
      } catch (e) {}
      try {
        const d = await window.storage.get("speakcraft:difficulty");
        if (d && d.value) setModeDifficulty(JSON.parse(d.value));
      } catch (e) {}
      try {
        const f = await window.storage.get("speakcraft:lastfocus");
        if (f && f.value) setLastFocus(JSON.parse(f.value));
      } catch (e) {}
    })();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => setVoices(window.speechSynthesis.getVoices());
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }

    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SR) {
      setMicSupported(true);
    } else {
      setMicSupported(false);
    }

    return () => {
      cancelSpeech();
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    autoListenRef.current = autoListen;
  }, [autoListen]);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, loading]);

  function speak(line, onEnd) {
    if (!speechOn || !line) {
      setIsSpeaking(false);
      setJohnVoiceLevel(0);
      if (onEnd) onEnd();
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      setJohnVoiceLevel(0);
      if (onEnd) onEnd();
      return;
    }

    // Cancel any previous speech and ensure synthesizer is unpaused
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}

    const currentId = ++speechIdRef.current;
    setIsSpeaking(true);

    const utter = new SpeechSynthesisUtterance(line);
    const availableVoices =
      voices.length > 0
        ? voices
        : typeof window !== "undefined" && window.speechSynthesis
        ? window.speechSynthesis.getVoices()
        : [];
    const v = pickVoice(availableVoices);
    if (v) utter.voice = v;

    // Louder and clearer voice acoustics:
    utter.volume = 1.0; // Maximum loudness
    utter.rate = 0.98;  // Clear, articulate enunciation
    utter.pitch = 1.04; // Bright, resonant clarity avoiding muffled bass

    utter.onstart = () => {
      if (speechIdRef.current === currentId) {
        setIsSpeaking(true);
      }
    };
    utter.onboundary = () => {
      if (speechIdRef.current === currentId) {
        setJohnVoiceLevel((prev) => Math.min(1, prev + 0.35));
      }
    };
    utter.onend = () => {
      if (speechIdRef.current === currentId) {
        setIsSpeaking(false);
        setJohnVoiceLevel(0);
        if (onEnd) onEnd();
      }
    };
    utter.onerror = () => {
      if (speechIdRef.current === currentId) {
        setIsSpeaking(false);
        setJohnVoiceLevel(0);
      }
    };

    try {
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn("speechSynthesis.speak failed:", e);
      setIsSpeaking(false);
      setJohnVoiceLevel(0);
      if (onEnd) onEnd();
    }
  }

  function stopListening() {
    cancelSpeech();
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isListeningRef.current = false;
    setListening(false);
    setUserVoiceLevel(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }

  function stopAndSubmit() {
    cancelSpeech();
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isListeningRef.current = false;
    setListening(false);
    setUserVoiceLevel(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      micStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }
    const captured = (liveTranscriptRef.current || transcriptAccumRef.current).trim();
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    transcriptAccumRef.current = "";
    setText("");
    if (captured && handleSubmitRef.current) {
      handleSubmitRef.current(captured);
    }
  }

  async function startListening() {
    cancelSpeech();
    stopListening();

    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setMicSupported(false);
      return;
    }
    setMicSupported(true);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        setMicPermissionDenied(false);

        // Connect Web Audio Analyser for real-time user voice rhythm
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.45;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkUserVoice = () => {
            if (!isListeningRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 1; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / (dataArray.length - 1);
            // Normalized speech loudness
            const norm = Math.min(1, Math.max(0, (avg - 8) / 38));
            setUserVoiceLevel((prev) => prev * 0.6 + norm * 0.4);
            animFrameRef.current = requestAnimationFrame(checkUserVoice);
          };
          animFrameRef.current = requestAnimationFrame(checkUserVoice);
        }
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setMicPermissionDenied(true);
          setListening(false);
          return;
        }
      }
    }

    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      transcriptAccumRef.current = "";
      liveTranscriptRef.current = "";
      setLiveTranscript("");

      rec.onstart = () => {
        setListening(true);
        isListeningRef.current = true;
        setMicPermissionDenied(false);
      };

      rec.onresult = (e) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + " ";
          } else {
            interimStr += res[0].transcript;
          }
        }
        const combined = (finalStr + interimStr).trim();
        transcriptAccumRef.current = combined;
        liveTranscriptRef.current = combined;
        setLiveTranscript(combined);
        setText(combined);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (combined.split(" ").length >= 2) {
          silenceTimerRef.current = setTimeout(() => {
            stopAndSubmit();
          }, 2500);
        }
      };

      rec.onerror = (e) => {
        console.warn("SpeechRecognition error:", e.error);
        if (e.error === "no-speech") {
          return;
        }
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicPermissionDenied(true);
          stopListening();
        }
      };

      rec.onend = () => {
        if (isListeningRef.current) {
          try {
            rec.start();
          } catch (err) {
            setListening(false);
            isListeningRef.current = false;
          }
        } else {
          setListening(false);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setListening(true);
      isListeningRef.current = true;
    } catch (e) {
      console.error("SpeechRecognition start failed:", e);
      setListening(false);
      isListeningRef.current = false;
    }
  }

  function toggleMic() {
    cancelSpeech();
    if (isSpeaking) {
      startListening();
      return;
    }
    if (listening) {
      if (liveTranscriptRef.current.trim() || transcriptAccumRef.current.trim()) {
        stopAndSubmit();
      } else {
        stopListening();
      }
    } else {
      startListening();
    }
  }

  async function saveProgress(next) {
    try {
      await window.storage.set("speakcraft:progress", JSON.stringify(next));
    } catch (e) {}
  }

  async function saveName() {
    const n = nameDraft.trim();
    if (!n) return;
    setStudentName(n);
    try {
      await window.storage.set("speakcraft:name", n);
    } catch (e) {}
    startSession(n);
  }

  function skipName() {
    setStudentName("");
    startSession("");
  }

  function buildGreeting(name, currentStreak, focus) {
    const nm = name ? `Hi ${name}, ` : "Hi, ";
    const intro = `I'm ${COACH_NAME}, your coach. `;
    let body;
    if (currentStreak > 1) {
      body = `Welcome back! You're on a ${currentStreak}-day streak — let's keep that momentum going today.`;
    } else {
      body = `Welcome to SpeakCraft! You're on Day 1 — let's get started and practice your English speaking today.`;
    }
    const focusLine =
      focus && focus.skillToPracticeTomorrow
        ? ` Last time, the big thing to work on was ${focus.skillToPracticeTomorrow.toLowerCase()} — let's put that to work today.`
        : "";
    return nm + intro + body + focusLine;
  }

  const AVG_SESSION_MS = 6 * 60 * 1000; // ~6 minutes feels like a natural single practice call
  const AVG_TURN_CAP = 10; // or 10 exchanges, whichever comes first
  const sessionStartRef = useRef(null);

  function beginConversation(name) {
    sessionStartRef.current = Date.now();
    cancelSpeech();
    setSessionStarted(true);
    setMode(null); // Default to no skill / natural casual conversation!

    const nm = name ? `${name}` : "";
    const welcomeLine = nm
      ? `Hi ${nm}! How's your day going so far?`
      : `Hi! I'm John. How's your day going so far?`;

    setThread([{ user: null, followUp: welcomeLine }]);
    speak(welcomeLine, () => {
      if (autoListenRef.current && micSupported) startListening();
    });
  }

  async function startSession(explicitName) {
    const n = typeof explicitName === "string" ? explicitName : studentName;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicPermissionDenied(false);
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setMicPermissionDenied(true);
        }
      }
    }
    beginConversation(n);
  }

  function speakPrompt() {
    if (currentMode && currentMode.prompts && currentMode.prompts[promptIdx]) {
      speak(currentMode.prompts[promptIdx]);
    } else {
      speak("How's your day going so far?");
    }
  }

  async function runModeIntro(modeId) {
    clearTimeout(autoStartTimerRef.current);
    cancelSpeech();
    setMode(modeId);
    const targetMode = MODES.find((m) => m.id === modeId);
    const idx = dayNumber() % targetMode.prompts.length;
    const promptText = targetMode.prompts[idx];
    setPromptIdx(idx);

    const introLine = `Let's switch to ${targetMode.label}. ${promptText}`;
    setThread((t) => [...t, { user: null, followUp: introLine }]);
    speak(introLine, () => {
      if (autoListenRef.current && micSupported) startListening();
    });
  }

  async function switchToCasualChat() {
    clearTimeout(autoStartTimerRef.current);
    cancelSpeech();
    setMode(null);
    const line = "Sure, let's just chat freely! What's on your mind?";
    setThread((t) => [...t, { user: null, followUp: line }]);
    speak(line, () => {
      if (autoListenRef.current && micSupported) startListening();
    });
  }

  const ENDING_PATTERNS = /\b(bye|goodbye|good bye|see you|that's all|thats all|i'm done|im done|i am done|stop for today|that's it for today|thats it for today|end session|finish session)\b/i;

  async function handleSubmit(overrideText) {
    const source = typeof overrideText === "string" ? overrideText : text;
    if (!source.trim() || loading) return;
    clearTimeout(autoStartTimerRef.current);
    cancelSpeech();
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stopListening();
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    setLoading(true);
    setError(null);
    const userTurn = source.trim();
    setText("");

    const historyLines = thread
      .slice(-4)
      .map((t) => (t.user ? `Student: "${t.user}"` : "") + (t.followUp ? ` | John: "${t.followUp}"` : ""))
      .filter(Boolean)
      .join("\n");
    const nameLine = studentName ? `The student's name is ${studentName}.\n` : "";

    const systemPrompt =
      mode && MODE_SYSTEM[mode]
        ? MODE_SYSTEM[mode]
        : COACH_BASE +
          " Focus area: natural, friendly everyday conversation. Talk with the student like a real human having a warm, authentic conversation (ask how their day is going, react genuinely to what they share, share your own thoughts, ask natural follow-up questions). Keep the conversation going back and forth like two real people talking, while still offering helpful vocabulary upgrades in the background JSON.";

    const promptContext = currentMode
      ? `Practice prompt: ${currentMode.prompts[promptIdx] || ""}\n`
      : "Context: Natural, friendly open-ended human conversation between John and the student.\n";

    const difficultyLevel = mode ? (modeDifficulty[mode] || 2) : 2;
    const composed = `${nameLine}${promptContext}Current difficulty level: ${difficultyLevel} out of 5.\n${historyLines}\nTheir latest reply: "${userTurn}"`;

    try {
      const raw = await callClaude(systemPrompt, composed);
      const parsed = safeParseJSON(raw);
      if (!parsed) throw new Error("Could not read the reply. Try again.");

      const today = dayNumber();
      let newStreak = streak;
      if (lastPracticeDay === null || today - lastPracticeDay > 1) newStreak = 1;
      else if (today - lastPracticeDay === 1) newStreak = streak + 1;

      const newWords = (parsed.vocab || []).filter(
        (v) => !vocabBank.some((b) => b.word.toLowerCase() === v.word.toLowerCase())
      );
      const newBank = [...vocabBank, ...newWords].slice(-60);

      let mBank = mistakesBank.slice();
      (parsed.fixes || []).forEach((f) => {
        const saidKey = (f.said || "").trim().toLowerCase();
        const catKey = (f.category || "general").trim().toLowerCase();
        const existingIdx = mBank.findIndex(
          (m) => m.said.trim().toLowerCase() === saidKey || m.category.trim().toLowerCase() === catKey
        );
        if (existingIdx >= 0) {
          mBank[existingIdx] = {
            ...mBank[existingIdx],
            said: f.said,
            better: f.better,
            why: f.why,
            category: f.category || mBank[existingIdx].category,
            count: (mBank[existingIdx].count || 1) + 1,
          };
        } else {
          mBank.push({ said: f.said, better: f.better, why: f.why, category: f.category || "general", count: 1 });
        }
      });
      mBank = mBank.sort((a, b) => b.count - a.count).slice(0, 40);

      const fixCount = (parsed.fixes || []).length;
      const newDifficulty = { ...modeDifficulty };
      if (mode) {
        const cur = newDifficulty[mode] || 2;
        if (fixCount <= 1) newDifficulty[mode] = Math.min(5, cur + 1);
        else if (fixCount >= 3) newDifficulty[mode] = Math.max(1, cur - 1);
        else newDifficulty[mode] = cur;
        setModeDifficulty(newDifficulty);
        await window.storage.set("speakcraft:difficulty", JSON.stringify(newDifficulty)).catch(() => {});
      }

      setStreak(newStreak);
      setLastPracticeDay(today);
      setVocabBank(newBank);
      setMistakesBank(mBank);
      await saveProgress({ streak: newStreak, lastPracticeDay: today, vocabBank: newBank, mistakesBank: mBank });

      const entry = { user: userTurn, ...parsed };
      setThread((t) => [...t, entry]);

      const elapsed = Date.now() - (sessionStartRef.current || Date.now());
      const turnCount = thread.length + 1;
      const shouldEnd =
        ENDING_PATTERNS.test(userTurn) || elapsed >= AVG_SESSION_MS || turnCount >= AVG_TURN_CAP;

      const afterReply = shouldEnd
        ? () => setTimeout(() => finishSession([...thread, entry]), 400)
        : () => {
            if (autoListenRef.current && micSupported) startListening();
          };

      // John speaks one single, clear, punchy coaching turn
      const replyLine = parsed.challenge || parsed.followUp || parsed.tip || "Great work! Keep going.";
      speak(replyLine, afterReply);

      if (shouldEnd) clearTimeout(autoStartTimerRef.current);
    } catch (e) {
      setError(e.message || "Something went wrong reaching the coach.");
      if (autoListenRef.current && micSupported) startListening();
    } finally {
      setLoading(false);
    }
  }

  async function finishSession(finalThread) {
    const log = finalThread
      .map(
        (t, i) =>
          `Turn ${i + 1} — Student said: "${t.user}" | Mistake categories flagged: ${
            (t.fixes || []).map((f) => f.category).join(", ") || "none"
          } | Vocab suggested: ${(t.vocab || []).map((v) => v.word).join(", ") || "none"}`
      )
      .join("\n");
    if (!log.trim()) return;
    setScoringLoading(true);
    try {
      const modeLabel = currentMode ? currentMode.label : "Casual Conversation";
      const raw = await callClaude(SCORECARD_SYSTEM, `Mode: ${modeLabel}\n${log}`);
      const parsed = safeParseJSON(raw);
      if (parsed) {
        setScorecard(parsed);
        await window.storage.set("speakcraft:lastfocus", JSON.stringify(parsed)).catch(() => {});
        setLastFocus(parsed);
        speak(parsed.spoken);
      }
    } catch (e) {
      // silent — session review is a bonus, not critical path
    } finally {
      setScoringLoading(false);
    }
  }

  function newPrompt() {
    if (!currentMode) {
      setThread([]);
      setScorecard(null);
      setError(null);
      return;
    }
    const list = currentMode.prompts;
    let next = Math.floor(Math.random() * list.length);
    if (list.length > 1 && next === promptIdx) next = (next + 1) % list.length;
    setPromptIdx(next);
    setThread([]);
    setScorecard(null);
    setError(null);
  }

  const reminderText =
    "Daily English practice — 10 minutes. Open SpeakCraft, pick a mode, say today's prompt out loud, and keep the conversation going.";

  function copyReminder() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reminderText).then(() => {
        setCopyLabel("Copied");
        setTimeout(() => setCopyLabel("Copy reminder text"), 1500);
      });
    }
  }

  const activeVoiceLevel = isSpeaking ? johnVoiceLevel : listening ? userVoiceLevel : 0;

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: ${INK};
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
      <div
        style={{
          fontFamily: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
          background: INK,
          color: TEXT_DARK,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "28px 18px 40px",
          boxSizing: "border-box",
        }}
      >
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: `1px solid rgba(225, 201, 213, 0.3)`,
            paddingBottom: 14,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 28, letterSpacing: 0.2, color: QUEEN_PINK, fontWeight: 700 }}>SpeakCraft</div>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                color: QUEEN_PINK,
                opacity: 0.9,
                marginTop: 2,
              }}
            >
              Your speaking coach — corrects you, hears you out, and helps you land a joke too.
            </div>
          </div>
          <div style={{ textAlign: "right", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", background: "rgba(225, 201, 213, 0.1)", border: `1px solid rgba(225, 201, 213, 0.35)`, borderRadius: 8, padding: "6px 12px" }}>
              <div style={{ fontSize: 22, color: QUEEN_PINK, fontWeight: 700, lineHeight: 1 }}>
                {streak}
              </div>
              <div style={{ fontSize: 11, color: QUEEN_PINK, opacity: 0.85, marginTop: 2 }}>day streak</div>
            </div>
          </div>
        </div>

        {!studentName && !sessionStarted && (
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              background: CHOCOLATE_KISSES,
              border: `1.5px solid rgba(225, 201, 213, 0.4)`,
              color: TEXT_DARK,
              borderRadius: 8,
              padding: "20px 20px",
              marginBottom: 16,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
            }}
          >
            <span style={{ fontSize: 14, color: QUEEN_PINK }}>What should your coach call you?</span>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Your name"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                padding: "7px 10px",
                borderRadius: 4,
                border: `1px solid ${QUEEN_PINK}`,
                background: PAPER_DIM,
                color: QUEEN_PINK,
              }}
            />
            <button
              onClick={saveName}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                padding: "7px 16px",
                borderRadius: 4,
                border: "none",
                background: QUEEN_PINK,
                color: CHOCOLATE_KISSES,
                boxShadow: "0 0 14px rgba(225, 201, 213, 0.4)",
                cursor: "pointer",
              }}
            >
              Start
            </button>
            <button
              onClick={skipName}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
                padding: "7px 14px",
                borderRadius: 4,
                border: `1px solid rgba(225, 201, 213, 0.35)`,
                background: "transparent",
                color: QUEEN_PINK,
                cursor: "pointer",
              }}
            >
              Skip
            </button>
          </div>
        )}

        {studentName && !sessionStarted && (
          <div
            style={{
              background: CHOCOLATE_KISSES,
              border: `1.5px solid rgba(225, 201, 213, 0.4)`,
              color: TEXT_DARK,
              borderRadius: 8,
              padding: "26px 22px",
              marginBottom: 16,
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ fontSize: 19, lineHeight: 1.5, marginBottom: 18, color: QUEEN_PINK, fontWeight: 500 }}>
              "{buildGreeting(studentName, streak, lastFocus)}"
            </div>
            <button
              onClick={() => startSession()}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 14.5,
                fontWeight: 700,
                padding: "11px 26px",
                borderRadius: 8,
                border: "none",
                background: QUEEN_PINK,
                color: CHOCOLATE_KISSES,
                boxShadow: "0 0 22px rgba(225, 201, 213, 0.5), 0 4px 12px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            >
              🔊 Start today's session
            </button>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 11.5,
                color: QUEEN_PINK,
                opacity: 0.85,
                marginTop: 12,
              }}
            >
              Phones and browsers need a tap before audio starts — this is that tap.
            </div>
          </div>
        )}

        {sessionStarted && (
        <>
        <style>{`
          @keyframes saturnIdleOrbit {
            0%, 100% { transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
            50% { transform: translate(-50%, -50%) rotate(-7deg) scale(1.02); }
          }
          @keyframes saturnGlowRhythm {
            0%, 100% { box-shadow: 0 0 16px 4px rgba(162, 76, 97, 0.5); }
            50% { box-shadow: 0 0 34px 10px rgba(226, 169, 192, 0.85); }
          }
        `}</style>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginBottom: 4 }}>
          <button
            onClick={() => setSpeechOn((s) => !s)}
            title="Toggle spoken replies"
            style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11.5, background: "none", border: "none", color: speechOn ? KOBI : CHINA_ROSE, cursor: "pointer", padding: 0 }}
          >
            {speechOn ? "🔊 voice on" : "🔇 voice off"}
          </button>
          {micSupported && (
            <button
              onClick={() => setAutoListen((a) => !a)}
              title="Toggle auto-listen after the coach speaks"
              style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11.5, background: "none", border: "none", color: autoListen ? KOBI : CHINA_ROSE, cursor: "pointer", padding: 0 }}
            >
              {autoListen ? "🎧 auto-listen on" : "🎧 auto-listen off"}
            </button>
          )}
        </div>

        {/* Saturn voice-agent visual with dynamic rhythm rings & John header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: isSpeaking || listening ? 36 : 18 }}>
          {/* Coach Name */}
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              color: KOBI,
              textTransform: "uppercase",
              marginBottom: 12,
              textAlign: "center",
              textShadow: "0 0 16px rgba(226, 169, 192, 0.55)",
            }}
          >
            John
          </div>

          <div
            onClick={toggleMic}
            title={listening ? "Click when done speaking" : isSpeaking ? "Click to interrupt & speak" : "Click to speak"}
            style={{ position: "relative", width: 240, height: 180, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Outer Atmospheric Halo Ring */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 275,
                height: 80,
                border: `1.5px solid ${isSpeaking ? "rgba(226, 169, 192, 0.75)" : listening ? QUEEN_PINK : "rgba(225, 201, 213, 0.5)"}`,
                borderRadius: "50%",
                transform: `translate(-50%, -50%) rotate(${-8 + (activeVoiceLevel - 0.5) * 6}deg) scale(${1 + activeVoiceLevel * 0.22}, ${1 + activeVoiceLevel * 0.16})`,
                opacity: 0.4 + activeVoiceLevel * 0.55,
                zIndex: 1,
                boxShadow: activeVoiceLevel > 0.05 ? `0 0 ${16 + activeVoiceLevel * 24}px ${isSpeaking ? "rgba(226, 169, 192, 0.6)" : "rgba(225, 201, 213, 0.7)"}` : "0 0 12px rgba(225, 201, 213, 0.25)",
                transition: "transform 0.08s ease-out, opacity 0.08s ease-out, box-shadow 0.08s ease-out",
                pointerEvents: "none",
              }}
            />

            {/* Main Saturn Ring (moves dynamically with speaking rhythm) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 236,
                height: 64,
                border: `${3 + activeVoiceLevel * 2.5}px solid ${isSpeaking ? KOBI : QUEEN_PINK}`,
                borderRadius: "50%",
                transform: `translate(-50%, -50%) rotate(${-8 + (activeVoiceLevel - 0.5) * 8}deg) scale(${1 + activeVoiceLevel * 0.18}, ${1 + activeVoiceLevel * 0.13})`,
                opacity: 0.9 + activeVoiceLevel * 0.1,
                zIndex: 1,
                boxShadow:
                  activeVoiceLevel > 0.05
                    ? `0 0 ${16 + activeVoiceLevel * 28}px ${3 + activeVoiceLevel * 8}px ${isSpeaking ? "rgba(226, 169, 192, 0.8)" : "rgba(225, 201, 213, 0.85)"}`
                    : "0 0 16px 2px rgba(225, 201, 213, 0.45)",
                transition: "transform 0.08s ease-out, box-shadow 0.08s ease-out, border 0.08s ease-out",
                pointerEvents: "none",
              }}
            />

            {/* Inner Crepe Accent Ring */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 175,
                height: 48,
                border: `1px dashed ${isSpeaking ? "rgba(226, 169, 192, 0.65)" : "rgba(225, 201, 213, 0.6)"}`,
                borderRadius: "50%",
                transform: `translate(-50%, -50%) rotate(${-8 + (activeVoiceLevel - 0.5) * 6}deg) scale(${1 + activeVoiceLevel * 0.14}, ${1 + activeVoiceLevel * 0.1})`,
                opacity: 0.45 + activeVoiceLevel * 0.4,
                zIndex: 1,
                transition: "transform 0.08s ease-out, opacity 0.08s ease-out",
                pointerEvents: "none",
              }}
            />

            {/* Saturn Core Sphere — Pure celestial planet, NO icons inside */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 100,
                height: 100,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle at 35% 28%, ${QUEEN_PINK} 0%, ${KOBI} 32%, ${PERSIAN_PLUM} 68%, ${CHOCOLATE_KISSES} 100%)`,
                zIndex: 2,
                boxShadow:
                  activeVoiceLevel > 0.05
                    ? `0 0 ${16 + activeVoiceLevel * 28}px ${4 + activeVoiceLevel * 10}px ${isSpeaking ? "rgba(226, 169, 192, 0.85)" : "rgba(225, 201, 213, 0.9)"}`
                    : "0 0 18px 3px rgba(225, 201, 213, 0.35), 0 0 24px rgba(113, 12, 33, 0.55)",
                transition: "box-shadow 0.08s ease-out",
              }}
            />
          </div>

          {/* Interactive Mic / Control Button */}
          {micSupported && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                onClick={toggleMic}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 14.5,
                  fontWeight: 700,
                  padding: "11px 26px",
                  borderRadius: 24,
                  border: listening ? `1.5px solid ${QUEEN_PINK}` : isSpeaking ? `1.5px solid ${QUEEN_PINK}` : `1.5px solid rgba(255, 255, 255, 0.45)`,
                  background: listening ? PERSIAN_PLUM : isSpeaking ? CHOCOLATE_KISSES : QUEEN_PINK,
                  color: listening ? "#FFFFFF" : isSpeaking ? QUEEN_PINK : CHOCOLATE_KISSES,
                  cursor: "pointer",
                  boxShadow: listening ? "0 0 24px rgba(113, 12, 33, 0.85), 0 0 10px rgba(225, 201, 213, 0.5)" : "0 0 20px rgba(225, 201, 213, 0.45), 0 4px 14px rgba(0, 0, 0, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                {isSpeaking ? (
                  <>Tap to interrupt</>
                ) : listening ? (
                  <>Done speaking</>
                ) : (
                  <>🎙️ Tap to Speak</>
                )}
              </button>
            </div>
          )}

          {/* Mic permission denied error */}
          {micPermissionDenied && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 16px",
                background: "rgba(113, 12, 33, 0.35)",
                border: `1px solid ${PERSIAN_PLUM}`,
                borderRadius: 8,
                fontSize: 13,
                color: KOBI,
                textAlign: "center",
                maxWidth: 520,
              }}
            >
              Microphone permission is blocked. Please allow microphone access in your browser settings (click the lock/mic icon in your address bar), or type below.
            </div>
          )}

          {!isSpeaking && !listening && (
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12.5,
                color: QUEEN_PINK,
                opacity: 0.85,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Tap the mic above to speak, or pick a skill below
            </div>
          )}
        </div>

        {/* Text & conversation thread — only displayed when neither is speaking, keeping the screen clean during voice dialogue */}
        {!isSpeaking && !listening && (
          <div>
            {/* Skill picker */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              <button
                onClick={switchToCasualChat}
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 13,
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: `1.5px solid ${mode === null ? QUEEN_PINK : "rgba(225, 201, 213, 0.35)"}`,
                  background: mode === null ? QUEEN_PINK : "rgba(65, 21, 40, 0.65)",
                  color: mode === null ? CHOCOLATE_KISSES : QUEEN_PINK,
                  boxShadow: mode === null ? "0 0 16px rgba(225, 201, 213, 0.45)" : "none",
                  cursor: "pointer",
                  fontWeight: mode === null ? 700 : 500,
                  transition: "all 0.15s ease",
                }}
              >
                💬 Casual Chat
              </button>
              {MODE_ORDER.map((id) => {
                const m = MODES.find((mm) => mm.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => (mode === id ? switchToCasualChat() : runModeIntro(id))}
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontSize: 13,
                      padding: "8px 16px",
                      borderRadius: 20,
                      border: `1.5px solid ${mode === id ? QUEEN_PINK : "rgba(225, 201, 213, 0.35)"}`,
                      background: mode === id ? QUEEN_PINK : "rgba(65, 21, 40, 0.65)",
                      color: mode === id ? CHOCOLATE_KISSES : QUEEN_PINK,
                      boxShadow: mode === id ? "0 0 16px rgba(225, 201, 213, 0.45)" : "none",
                      cursor: "pointer",
                      fontWeight: mode === id ? 700 : 500,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div ref={bottomRef} />

            {loading && (
              <div
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 13.5,
                  color: KOBI,
                  marginBottom: 16,
                  textAlign: "center",
                  letterSpacing: 0.3,
                }}
              >
                ✦ John is listening and thinking of a reply...
              </div>
            )}

            {/* Instructions */}
            {thread.length <= 1 && (
              <div
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 12.5,
                  color: QUEEN_PINK,
                  opacity: 0.85,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {micSupported
                  ? `Speak clearly into your microphone — tap the mic button anytime to talk or send.`
                  : "Voice input isn't available in this browser — type your replies below instead."}
              </div>
            )}

            {micSupported && !showTypeFallback && (
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <button
                  onClick={() => setShowTypeFallback(true)}
                  style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 11.5,
                    background: "none",
                    border: "none",
                    color: CHINA_ROSE,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  prefer typing instead?
                </button>
              </div>
            )}

            {(!micSupported || showTypeFallback) && (
              <div style={{ marginBottom: 10 }}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Type your reply and press Enter..."
                  rows={2}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 14.5,
                    padding: 14,
                    borderRadius: 6,
                    border: `1px solid rgba(162, 76, 97, 0.4)`,
                    background: CHOCOLATE_KISSES,
                    color: QUEEN_PINK,
                    resize: "vertical",
                  }}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                marginBottom: 22,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
              }}
            >
              <button
                onClick={() => finishSession(thread)}
                disabled={scoringLoading || thread.length <= 1}
                style={{
                  background: "none",
                  border: "none",
                  color: thread.length <= 1 ? "rgba(225, 201, 213, 0.3)" : QUEEN_PINK,
                  textDecoration: "underline",
                  cursor: thread.length <= 1 ? "default" : "pointer",
                  padding: 0,
                }}
              >
                {scoringLoading ? "reviewing the conversation..." : "finish & get my review"}
              </button>
              <button
                onClick={() => setShowReminder((s) => !s)}
                style={{ background: "none", border: "none", color: QUEEN_PINK, textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                set a daily reminder
              </button>
            </div>
          </div>
        )}

        {scorecard && (
          <div
            style={{
              background: CHOCOLATE_KISSES,
              border: `1.5px solid rgba(225, 201, 213, 0.4)`,
              color: TEXT_DARK,
              borderRadius: 8,
              padding: "20px 20px",
              marginBottom: 22,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11.5, background: "rgba(225, 201, 213, 0.15)", border: `1px solid ${QUEEN_PINK}`, padding: "4px 10px", borderRadius: 12, color: QUEEN_PINK, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Session review
              </span>
            </div>

            {scorecard.scores && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                {Object.entries(scorecard.scores).map(([k, v]) => (
                  <div key={k} style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11.5, textAlign: "center", background: "rgba(225, 201, 213, 0.08)", border: "1px solid rgba(225, 201, 213, 0.35)", padding: "8px 12px", borderRadius: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: QUEEN_PINK }}>{v}</div>
                    <div style={{ color: QUEEN_PINK, opacity: 0.85, textTransform: "capitalize" }}>
                      {k.replace(/([A-Z])/g, " $1")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {scorecard.topMistakes && scorecard.topMistakes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: QUEEN_PINK }}>
                  Areas to improve
                </div>
                {scorecard.topMistakes.map((m, i) => (
                  <div key={i} style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, marginBottom: 4, color: QUEEN_PINK }}>
                    • {m}
                  </div>
                ))}
              </div>
            )}

            {scorecard.betterPhrases && scorecard.betterPhrases.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: QUEEN_PINK }}>
                  Better words & phrases to use
                </div>
                {scorecard.betterPhrases.map((p, i) => (
                  <div key={i} style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, marginBottom: 4, color: QUEEN_PINK }}>
                    • {p}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 12.5, lineHeight: 1.7, color: QUEEN_PINK }}>
              {scorecard.habitToStop && (
                <div>
                  <b style={{ color: QUEEN_PINK }}>Stop:</b> {scorecard.habitToStop}
                </div>
              )}
              {scorecard.habitToDevelop && (
                <div>
                  <b style={{ color: QUEEN_PINK }}>Develop:</b> {scorecard.habitToDevelop}
                </div>
              )}
              {scorecard.skillToPracticeTomorrow && (
                <div>
                  <b style={{ color: QUEEN_PINK }}>Practice tomorrow:</b> {scorecard.skillToPracticeTomorrow}
                </div>
              )}
              {scorecard.nextChallenge && (
                <div>
                  <b style={{ color: QUEEN_PINK }}>Next challenge:</b> {scorecard.nextChallenge}
                </div>
              )}
            </div>
          </div>
        )}

        {showReminder && (
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              background: CHOCOLATE_KISSES,
              border: `1.5px solid rgba(225, 201, 213, 0.4)`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 22,
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: 8, color: QUEEN_PINK }}>
              This runs in your browser, so it can't send you a WhatsApp message or email on its
              own. Add this as a recurring reminder in your phone's reminder app, Google Calendar,
              or a WhatsApp "message yourself" reminder:
            </div>
            <div
              style={{
                background: INK,
                border: `1.5px solid ${QUEEN_PINK}`,
                padding: "10px 12px",
                borderRadius: 4,
                color: QUEEN_PINK,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {reminderText}
            </div>
            <button
              onClick={copyReminder}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                background: QUEEN_PINK,
                border: "none",
                color: CHOCOLATE_KISSES,
                borderRadius: 4,
                padding: "6px 14px",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(225, 201, 213, 0.4)",
              }}
            >
              {copyLabel}
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              color: KOBI,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}



        {/* Vocab bank */}
        {vocabBank.length > 0 && (
          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: QUEEN_PINK,
                marginBottom: 12,
                borderTop: `1px solid rgba(225, 201, 213, 0.3)`,
                paddingTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: QUEEN_PINK }}>
                  Your vocabulary upgrades
                </span>
                <span
                  style={{
                    background: "rgba(225, 201, 213, 0.15)",
                    border: `1px solid ${QUEEN_PINK}`,
                    borderRadius: 12,
                    padding: "1px 8px",
                    fontSize: 11.5,
                    color: QUEEN_PINK,
                    fontWeight: 700,
                  }}
                >
                  {vocabBank.length}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 11.5, color: QUEEN_PINK, opacity: 0.8, fontWeight: 400 }}>
                  tap 🔊 to hear pronunciation
                </span>
                <button
                  onClick={clearAllVocab}
                  style={{
                    background: "none",
                    border: "none",
                    color: QUEEN_PINK,
                    fontSize: 11.5,
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Clear all vocabulary words"
                >
                  clear all
                </button>
              </div>
            </div>

            <div
              className="no-scrollbar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 520,
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                paddingRight: 4,
              }}
            >
              {vocabBank
                .slice()
                .reverse()
                .map((v, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      background: CHOCOLATE_KISSES,
                      border: `1.5px solid rgba(225, 201, 213, 0.35)`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    {/* Header: What you used -> John's suggested upgrade */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        {v.insteadOf ? (
                          <>
                            <span style={{ fontSize: 11.5, color: CHINA_ROSE, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                              Instead of:
                            </span>
                            <span style={{ color: QUEEN_PINK, opacity: 0.7, fontSize: 13.5, textDecoration: "line-through", marginRight: 4 }}>
                              "{v.insteadOf}"
                            </span>
                            <span style={{ color: KOBI, fontSize: 13 }}>→</span>
                            <span style={{ fontSize: 11.5, color: QUEEN_PINK, textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 2, fontWeight: 700 }}>
                              Use:
                            </span>
                            <span
                              style={{
                                background: "rgba(225, 201, 213, 0.18)",
                                border: `1.5px solid ${QUEEN_PINK}`,
                                borderRadius: 6,
                                padding: "3px 10px",
                                color: QUEEN_PINK,
                                fontSize: 15,
                                fontWeight: 700,
                                letterSpacing: 0.3,
                                display: "inline-flex",
                                alignItems: "center",
                                boxShadow: "0 0 10px rgba(225, 201, 213, 0.25)",
                              }}
                            >
                              {v.word}
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 11.5, color: QUEEN_PINK, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                              Suggested word:
                            </span>
                            <span
                              style={{
                                background: "rgba(225, 201, 213, 0.18)",
                                border: `1.5px solid ${QUEEN_PINK}`,
                                borderRadius: 6,
                                padding: "3px 10px",
                                color: QUEEN_PINK,
                                fontSize: 15,
                                fontWeight: 700,
                                letterSpacing: 0.3,
                                display: "inline-flex",
                                alignItems: "center",
                                boxShadow: "0 0 10px rgba(225, 201, 213, 0.25)",
                              }}
                            >
                              {v.word}
                            </span>
                          </>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => speak(v.word + (v.example ? ". " + v.example : ""))}
                          style={{
                            background: "rgba(225, 201, 213, 0.15)",
                            border: `1px solid ${QUEEN_PINK}`,
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 12,
                            color: QUEEN_PINK,
                          }}
                          title={`Listen to John pronounce "${v.word}"`}
                        >
                          🔊
                        </button>
                        <button
                          onClick={() => deleteVocabWord(v.word)}
                          style={{
                            background: "rgba(225, 201, 213, 0.08)",
                            border: "1px solid rgba(225, 201, 213, 0.35)",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 12,
                            color: QUEEN_PINK,
                            transition: "all 0.15s ease",
                          }}
                          title={`Delete "${v.word}" from your vocabulary bank`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Meaning in simple English */}
                    {v.meaning && (
                      <div style={{ fontSize: 13, color: QUEEN_PINK, lineHeight: 1.45, marginTop: 4 }}>
                        <span style={{ color: QUEEN_PINK, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4, marginRight: 6 }}>
                          Meaning:
                        </span>
                        {v.meaning}
                      </div>
                    )}

                    {/* Example in a sentence */}
                    {v.example && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          background: "rgba(225, 201, 213, 0.08)",
                          borderRadius: 6,
                          borderLeft: `3px solid ${QUEEN_PINK}`,
                          border: `1px solid rgba(225, 201, 213, 0.25)`,
                          fontSize: 13,
                          color: QUEEN_PINK,
                          fontStyle: "italic",
                          lineHeight: 1.45,
                        }}
                      >
                        <span style={{ fontStyle: "normal", fontWeight: 700, color: QUEEN_PINK, fontSize: 11.5, marginRight: 6 }}>
                          Example:
                        </span>
                        "{v.example}"
                      </div>
                    )}

                    {/* When to use */}
                    {v.useWhen && (
                      <div style={{ marginTop: 6, fontSize: 11.5, color: QUEEN_PINK, opacity: 0.85, lineHeight: 1.4 }}>
                        <span style={{ color: QUEEN_PINK, fontWeight: 700, marginRight: 4 }}>
                          💡 When to reach for this:
                        </span>
                        {v.useWhen}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>
      </div>
    </>
  );
}

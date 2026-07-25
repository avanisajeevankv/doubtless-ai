const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const path    = require('path');

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Increase limits to allow image transfers
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── AI Client Setup: Groq (primary, free) + Gemini (fallback) ────────────────
let groqClient = null;
let genAI      = null;
let useMock    = false;
let aiProvider = 'mock';

// --- Groq (primary: free tier, no daily limits) ---
const groqKey = process.env.GROQ_API_KEY;
if (groqKey && groqKey !== 'your_groq_api_key_here') {
  try {
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: groqKey });
    aiProvider = 'groq';
    console.log('✅ Groq AI initialized (primary live mode).');
  } catch (err) {
    console.error('❌ Groq init failed:', err.message);
  }
}

// --- Gemini (used for image queries) ---
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
  try {
    const { GoogleGenAI } = require('@google/genai');
    genAI = new GoogleGenAI({ apiKey: geminiKey });
    if (aiProvider === 'mock') aiProvider = 'gemini';
    console.log('✅ Gemini API initialized (multimodal mode).');
  } catch (err) {
    console.error('❌ Gemini init failed:', err.message);
  }
}

if (aiProvider === 'mock') {
  console.warn('⚠️  No AI keys found — running in DEMO/MOCK mode.');
  useMock = true;
}

function parseJSONFromAI(text) {
  let clean = text.trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace  = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(clean);
}

app.get('/health', (_req, res) => {
  res.json({ status: 'UP', mode: useMock ? 'mock' : 'live', provider: aiProvider, ts: Date.now() });
});

// ─── Dynamic Mock Response Generator (Multimodal & Text) ────────────────────
function getMockDoubtResponse(question, nativeLanguage, difficulty, hasImage) {
  const q = question.toLowerCase();
  let topic = hasImage ? "Uploaded Diagram/Problem" : "Academic Concept";
  
  if (q.includes("quantum")) topic = "Quantum Computing";
  else if (q.includes("photoelectric") || q.includes("einstein") || q.includes("light")) topic = "Photoelectric Effect";
  else if (q.includes("recursion") || q.includes("stack") || q.includes("programming")) topic = "Recursion in Programming";

  let nativeExplanation = "";
  let keyTerms = [];

  if (nativeLanguage.toLowerCase() === "hindi") {
    nativeExplanation = `कठिनाई स्तर: ${difficulty}. ${hasImage ? "अपलोड की गई छवि के संदर्भ में, " : ""}**${topic}** एक अत्यंत महत्वपूर्ण शैक्षणिक विषय है। इस विषय में दो महत्वपूर्ण आयाम शामिल हैं: वैचारिक परिभाषा और इसके गणितीय नियम। छवि में दिखाए गए पैटर्न/प्रश्नों को देखकर यह स्पष्ट है कि इसके व्यावहारिक अनुप्रयोग विभिन्न वैज्ञानिक शाखाओं में काम आते हैं।`;
    keyTerms = [
      { term: "Structure", nativeTranslation: "संरचना", definition: "The arrangement of and relations between the parts of something." },
      { term: "Logic", nativeTranslation: "तर्क", definition: "Reasoning conducted according to strict principles of validity." },
      { term: "Application", nativeTranslation: "अनुप्रयोग", definition: "The practical use of a concept or system." }
    ];
  } else if (nativeLanguage.toLowerCase() === "tamil") {
    nativeExplanation = `நிலை: ${difficulty}. ${hasImage ? "பதிவேற்றப்பட்ட படத்தின் படி, " : ""}**${topic}** என்பது ஒரு முக்கியமான அறிவியல் கோட்பாடு ஆகும். இதைப் பற்றி நாம் ஆராயும்போது, இதன் அடிப்படை வடிவமைப்பு மற்றும் கணித சூத்திரங்களை நாம் தெளிவாகப் புரிந்து கொள்ள வேண்டும்.`;
    keyTerms = [
      { term: "Structure", nativeTranslation: "அமைப்பு", definition: "The arrangement of and relations between the parts of something." },
      { term: "Logic", nativeTranslation: "தருக்கமுறை", definition: "Reasoning conducted according to strict principles of validity." },
      { term: "Application", nativeTranslation: "பயன்பாடு", definition: "The practical use of a concept or system." }
    ];
  } else if (nativeLanguage.toLowerCase() === "kannada") {
    nativeExplanation = `ಮಟ್ಟ: ${difficulty}. ${hasImage ? "ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾದ ಚಿತ್ರದ ಆಧಾರದ ಮೇಲೆ, " : ""}**${topic}** ಒಂದು ಮಹತ್ವದ ಶೈಕ್ಷಣಿಕ ಪರಿಕಲ್ಪನೆಯಾಗಿದೆ. ಈ ತತ್ವವು ನಮ್ಮ ದಿನನಿತ್ಯದ ಆವಿಷ್ಕಾರಗಳಿಗೆ ಆಧಾರವಾಗಿದ್ದು, ಚಿತ್ರದಲ್ಲಿನ ಉದಾಹರಣೆಯು ಇದರ ಕಾರ್ಯವೈಖರಿಯನ್ನು ವಿವರಿಸುತ್ತದೆ.`;
    keyTerms = [
      { term: "Structure", nativeTranslation: "ರಚನೆ", definition: "The arrangement of and relations between the parts of something." },
      { term: "Logic", nativeTranslation: "ತರ್ಕಶಾಸ್ತ್ರ", definition: "Reasoning conducted according to strict principles of validity." },
      { term: "Application", nativeTranslation: "ಅನ್ವಯಿಕೆ", definition: "The practical use of a concept or system." }
    ];
  } else {
    nativeExplanation = `[${nativeLanguage}] Explanation for **${topic}** (${difficulty} mode). ${hasImage ? "Analyzing the uploaded image details: " : ""}The core mechanics involve systematic step-by-step resolution. In ${nativeLanguage}, this corresponds to standard college formulations.`;
    keyTerms = [
      { term: "Structure", nativeTranslation: "Structure", definition: "The arrangement of parts." },
      { term: "Logic", nativeTranslation: "Logic", definition: "Systematic reasoning principles." },
      { term: "Application", nativeTranslation: "Application", definition: "Practical use." }
    ];
  }

  return {
    englishExplanation: `Difficulty: **${difficulty}**. ${hasImage ? "Based on the uploaded image and description: " : ""}We are looking at **${topic}**. If you examine the underlying mechanics, it relies on structured transitions and operations. Under ${difficulty} guidelines, we provide direct analytical definitions, showing how these principles govern the system step-by-step.`,
    nativeExplanation: nativeExplanation,
    keyTerms: keyTerms,
    quiz: [
      {
        question: `Which core element is essential for solving problems related to ${topic}?`,
        options: [
          "A) Continuous observation without alteration.",
          "B) Consistent logical rules and step-by-step evaluation.",
          "C) Discarding math completely in favor of guessing.",
          "D) Relying solely on classical physics models."
        ],
        correctAnswer: "B",
        explanation: "Consistent rules and systematic logic are necessary to reach correct solutions."
      },
      {
        question: `How does adding a visual model or image (like in this solve) assist our evaluation?`,
        options: [
          "A) It replaces the need for any text descriptions.",
          "B) It offers concrete reference points for abstract formulas.",
          "C) It translates all languages automatically.",
          "D) It increases the difficulty parameters arbitrarily."
        ],
        correctAnswer: "B",
        explanation: "Visual representations clarify abstract mathematical systems and coordinate directions."
      },
      {
        question: `What is the best way to double-check solutions for ${topic}?`,
        options: [
          "A) Refracting the query into bilingual definitions to verify core concepts.",
          "B) Guessing the opposite of your first choice.",
          "C) Skipping the comprehension check questions.",
          "D) Using only one language at all times."
        ],
        correctAnswer: "A",
        explanation: "Refracting the problem bilingually ensures you understand both the linguistic terms and the math."
      }
    ]
  };
}

// ─── Route: Solve Doubt (Multimodal) ──────────────────────────────────────────
app.post('/api/solve-doubt', async (req, res) => {
  const { question, nativeLanguage, difficulty, imageBase64, imageMimeType } = req.body;
  if (!question?.trim() && !imageBase64) {
    return res.status(400).json({ error: 'Either a question text or an image is required.' });
  }

  const lang = nativeLanguage || 'Hindi';
  const diff = difficulty || 'Standard';
  const hasImage = !!(imageBase64 && imageMimeType);

  if (useMock) {
    await new Promise(r => setTimeout(r, 1600));
    return res.json(getMockDoubtResponse(question || "Image-based Doubt", lang, diff, hasImage));
  }

  const prompt = `
You are "Doubtless AI", a premier bilingual academic tutor for college students.
The student has submitted an academic query.
${question ? `Student Question/Description: "${question}"` : ''}
${hasImage ? `An image is attached. It may contain printed text, textbook screenshots, or hand-written mathematical equations, notes, formulas, or diagrams. Carefully analyze the image, transcribe the text/handwriting, and solve the problem.` : ''}

Please solve this doubt and provide an explanation under these parameters:
1. Native Language/Locale: "${lang}"
2. Difficulty/Level: "${diff}"
   - "Beginner": Use simple, intuitive analogies and everyday examples.
   - "Standard": Use college freshman level textbook explanations with clear steps.
   - "Advanced": Provide graduate-level technical depth and LaTeX formulas.

Respond with ONLY a valid JSON object matching this schema:
{
  "englishExplanation": "A detailed explanation in English using markdown formatting. Transcribe any equations or notes in the image first.",
  "nativeExplanation": "The matching explanation in ${lang}. Keep key English technical terms in brackets next to native words.",
  "keyTerms": [
    { "term": "English term", "nativeTranslation": "Translation in ${lang}", "definition": "Short definition" }
  ],
  "quiz": [
    {
      "question": "A multiple choice question testing understanding.",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "Why this is correct."
    }
  ]
}

Rules:
- Generate exactly 3 keyTerms.
- Generate exactly 3 quiz questions.
- correctAnswer must be exactly one letter: A, B, C, or D.
- Return ONLY the JSON. No markdown code fences. No extra text.
`;

  try {
    let text = '';

    // ── Groq (primary: free, fast, text questions) ─────────────────────────
    if (groqClient && !hasImage) {
      console.log('Groq request: ' + question + ' [' + lang + '/' + diff + ']');
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      });
      text = completion.choices[0]?.message?.content || '';
      console.log('Groq response received.');
    }

    // ── Gemini (used for images, or if Groq not set up) ────────────────────
    else if (genAI) {
      console.log('Gemini request: "' + question + '" image=' + hasImage);
      
      let contentsPayload;
      if (hasImage) {
        contentsPayload = [
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType
            }
          }
        ];
      } else {
        contentsPayload = prompt;
      }

      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contentsPayload,
        config: { responseMimeType: 'application/json' }
      });
      text = result.text;
      console.log('Gemini response received.');
    }

    else {
      throw new Error('No AI provider available.');
    }

    const data = parseJSONFromAI(text);
    res.json(data);

  } catch (err) {
    console.error('solve-doubt error:', err.message || err);
    const mockData = getMockDoubtResponse(question || 'Image-based Doubt', lang, diff, hasImage);
    mockData._fallback = true;
    mockData.errorMessage = err.message || String(err);
    return res.json(mockData);
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('══════════════════════════════════════════════');
  console.log('  Doubtless AI  ->  http://localhost:' + PORT);
  console.log('  Mode          ->  ' + (useMock ? 'DEMO (mock)' : 'LIVE (' + aiProvider.toUpperCase() + ')'));
  console.log('══════════════════════════════════════════════');
});



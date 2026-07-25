// ============================================================================
// Doubtless Sound FX Synthesizer (Web Audio API)
// ============================================================================
let soundEnabled = true;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.2, startDelay = 0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  } catch (e) { /* audio fallback */ }
}

const SFX = {
  click: () => playTone(580, 'sine', 0.06, 0.04),
  success: () => {
    playTone(523.25, 'triangle', 0.15, 0.08, 0);
    playTone(659.25, 'triangle', 0.15, 0.08, 0.06);
    playTone(783.99, 'triangle', 0.22, 0.08, 0.12);
  },
  wrong: () => {
    playTone(290, 'sawtooth', 0.12, 0.06, 0);
    playTone(190, 'sawtooth', 0.22, 0.06, 0.06);
  },
  flip: () => playTone(400, 'triangle', 0.12, 0.04),
  loader: () => playTone(800, 'sine', 0.04, 0.015),
  bookmark: () => playTone(880, 'sine', 0.1, 0.06)
};

// ============================================================================
// State Management
// ============================================================================
let appState = {
  theme: 'dark',
  sound: true,
  history: [], // Solved doubts
  activeId: null
};

// Image selection variables
let attachedImageBase64 = null;
let attachedImageMimeType = null;

function loadState() {
  const saved = localStorage.getItem('doubtless_state');
  if (saved) {
    try {
      appState = { ...appState, ...JSON.parse(saved) };
    } catch (e) { /* fresh state */ }
  }
  
  // Theme initialization
  document.documentElement.setAttribute('data-theme', appState.theme);
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = appState.theme === 'dark' 
      ? '<i class="fa-solid fa-moon"></i>' 
      : '<i class="fa-solid fa-sun"></i>';
  }

  // Sound initialization
  soundEnabled = appState.sound;
  const soundBtn = document.getElementById('toggle-sound-btn');
  if (soundBtn) {
    soundBtn.innerHTML = soundEnabled 
      ? '<i class="fa-solid fa-volume-high"></i>' 
      : '<i class="fa-solid fa-volume-xmark"></i>';
  }

  updateStats();
  renderHistory();
}

function saveState() {
  localStorage.setItem('doubtless_state', JSON.stringify(appState));
}

function updateStats() {
  const solvedEl = document.getElementById('stat-solved');
  const langsEl = document.getElementById('stat-langs');
  const bookmarksEl = document.getElementById('stat-bookmarks');

  if (solvedEl) solvedEl.textContent = appState.history.length;
  
  if (langsEl) {
    const uniqueLangs = new Set(appState.history.map(item => item.nativeLanguage));
    langsEl.textContent = uniqueLangs.size;
  }
  
  if (bookmarksEl) {
    const savedCount = appState.history.filter(item => item.saved).length;
    bookmarksEl.textContent = savedCount;
  }
}

// ============================================================================
// Dictation & Voice Recognition (Speech-to-Text)
// ============================================================================
let recognition = null;
let isListening = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported.");
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
      micBtn.classList.add('listening');
      micBtn.innerHTML = '<i class="fa-solid fa-stop"></i> <span>Stop</span>';
    }
    // Show voice wave
    document.getElementById('voice-wave').classList.remove('hidden');
    showToast("Listening... Speak clearly.", "info");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const inputArea = document.getElementById('doubt-input');
    if (inputArea) {
      inputArea.value = inputArea.value ? inputArea.value + " " + transcript : transcript;
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    showToast("Voice input failed: " + event.error, "error");
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };
}

function startListening() {
  if (recognition) {
    const selectedLang = document.getElementById('native-lang-select').value;
    const langCodes = {
      "Hindi": "hi-IN",
      "Kannada": "kn-IN",
      "Tamil": "ta-IN",
      "Telugu": "te-IN",
      "Malayalam": "ml-IN",
      "Bengali": "bn-IN",
      "Marathi": "mr-IN",
      "Gujarati": "gu-IN",
      "Urdu": "ur-PK"
    };
    recognition.lang = langCodes[selectedLang] || "en-US";
    
    try {
      recognition.start();
    } catch (e) { /* Already running */ }
  }
}

function stopListening() {
  isListening = false;
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.classList.remove('listening');
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> <span>Speak</span>';
  }
  document.getElementById('voice-wave').classList.add('hidden');
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) { /* Already stopped */ }
  }
}

// ============================================================================
// Text-to-Speech Engine (Speech Synthesis)
// ============================================================================
let activeUtterance = null;
let currentSpeakerBtn = null;

// Pre-load voices as soon as browser is ready (fixes empty getVoices() on first call)
let cachedVoices = [];
function loadVoices() {
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) cachedVoices = v;
}
loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

const synthLocales = {
  "english":   "en-US",
  "hindi":     "hi-IN",
  "kannada":   "kn-IN",
  "tamil":     "ta-IN",
  "telugu":    "te-IN",
  "malayalam": "ml-IN",
  "bengali":   "bn-IN",
  "marathi":   "mr-IN",
  "gujarati":  "gu-IN",
  "urdu":      "ur-IN"
};

function getBestVoice(langCode) {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const langBase = langCode.split('-')[0]; // e.g. "hi" from "hi-IN"

  // 1. Exact match  e.g. hi-IN
  let v = voices.find(v => v.lang === langCode);
  if (v) return v;

  // 2. Same base language  e.g. any "hi-*"
  v = voices.find(v => v.lang.startsWith(langBase));
  if (v) return v;

  return null; // browser will use default
}

function speakText(text, langName, button) {
  // If already speaking, stop it
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (currentSpeakerBtn) {
      currentSpeakerBtn.classList.remove('speaking');
      currentSpeakerBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
    }
    if (currentSpeakerBtn === button) {
      currentSpeakerBtn = null;
      return; // toggle off
    }
  }

  const langCode  = synthLocales[langName.toLowerCase()] || 'en-US';
  // Strip markdown symbols before speaking
  const cleanText = text.replace(/[#*`_~>]/g, '').replace(/\n+/g, ' ').trim();

  function doSpeak() {
    activeUtterance        = new SpeechSynthesisUtterance(cleanText);
    activeUtterance.lang   = langCode;
    activeUtterance.rate   = 0.92;
    activeUtterance.pitch  = 1;

    const voice = getBestVoice(langCode);
    if (voice) {
      activeUtterance.voice = voice;
    } else if (langCode !== 'en-US') {
      // No native voice found — warn user
      showToast('No ' + langName + ' voice installed on this device. Install it in Windows Settings → Time & Language → Speech.', 'error');
    }

    activeUtterance.onstart = () => {
      button.classList.add('speaking');
      button.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
      currentSpeakerBtn = button;
    };
    activeUtterance.onend = () => {
      button.classList.remove('speaking');
      button.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
      currentSpeakerBtn = null;
    };
    activeUtterance.onerror = () => {
      button.classList.remove('speaking');
      button.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
      currentSpeakerBtn = null;
    };

    window.speechSynthesis.speak(activeUtterance);
  }

  // If voices not yet loaded, wait and retry once
  if (cachedVoices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
      doSpeak();
    };
    // Also trigger immediately in case event already fired
    loadVoices();
    if (cachedVoices.length > 0) doSpeak();
  } else {
    doSpeak();
  }
}

// ============================================================================
// Image Attachment & Handler
// ============================================================================
function handleImageSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast("Please upload an image file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    attachedImageBase64 = evt.target.result.split(',')[1];
    attachedImageMimeType = file.type;

    // Show preview
    const previewBox = document.getElementById('image-preview-box');
    const previewImg = document.getElementById('image-preview');
    previewImg.src = evt.target.result;
    previewBox.classList.remove('hidden');
    
    showToast("Image attached successfully!", "success");
  };
  reader.readAsDataURL(file);
}

function clearAttachedImage() {
  attachedImageBase64 = null;
  attachedImageMimeType = null;
  document.getElementById('image-preview-box').classList.add('hidden');
  document.getElementById('image-preview').src = '#';
  document.getElementById('image-upload').value = ''; // reset element
}

// ============================================================================
// Health Checks
// ============================================================================
async function checkServerHealth() {
  try {
    const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data.mode === 'mock') {
      document.getElementById('demo-banner').classList.remove('hidden');
    } else {
      document.getElementById('demo-banner').classList.add('hidden');
    }
    document.getElementById('offline-banner').classList.add('hidden');
  } catch (e) {
    document.getElementById('offline-banner').classList.remove('hidden');
  }
}

// ============================================================================
// Submit solver
// ============================================================================
async function solveDoubt() {
  const inputEl = document.getElementById('doubt-input');
  const langSelect = document.getElementById('native-lang-select');
  const diffSelect = document.getElementById('difficulty-select');

  const question = inputEl.value.trim();
  if (!question && !attachedImageBase64) {
    showToast("Please enter a question or attach an image!", "error");
    return;
  }

  const nativeLanguage = langSelect.value;
  const difficulty = diffSelect.value;

  // Toggle View panels
  document.getElementById('welcome-panel').classList.add('hidden');
  document.getElementById('solution-panel').classList.add('hidden');
  document.getElementById('solve-loader').classList.remove('hidden');

  let loaderInterval = setInterval(() => SFX.loader(), 200);

  try {
    const response = await fetch('/api/solve-doubt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        nativeLanguage,
        difficulty,
        imageBase64: attachedImageBase64,
        imageMimeType: attachedImageMimeType
      })
    });

    if (!response.ok) {
      throw new Error(`Solving failed: ${response.statusText}`);
    }

    const data = await response.json();
    clearInterval(loaderInterval);
    SFX.success();

    if (data._fallback) {
      const msg = data.errorMessage ? `: ${data.errorMessage}` : ". Loaded Demo answer instead.";
      showToast("⚠️ Image solver API error" + msg, "warning");
    }

    // Reset attachments
    clearAttachedImage();
    inputEl.value = '';

    // Create item
    const newItem = {
      id: 'doubt_' + Date.now(),
      question: question || "Image solved doubt",
      difficulty,
      nativeLanguage,
      englishExplanation: data.englishExplanation,
      nativeExplanation: data.nativeExplanation,
      keyTerms: data.keyTerms,
      quiz: data.quiz,
      saved: false,
      timestamp: Date.now()
    };

    appState.history.unshift(newItem);
    appState.activeId = newItem.id;
    saveState();
    updateStats();
    renderHistory();
    displaySolution(newItem);

  } catch (err) {
    clearInterval(loaderInterval);
    SFX.wrong();
    document.getElementById('solve-loader').classList.add('hidden');
    document.getElementById('welcome-panel').classList.remove('hidden');
    showToast("Doubtless Solve failed: " + err.message, "error");
  }
}

// ============================================================================
// Solution presentation renders
// ============================================================================
function displaySolution(item) {
  document.getElementById('solve-loader').classList.add('hidden');
  document.getElementById('welcome-panel').classList.add('hidden');

  const solutionPanel = document.getElementById('solution-panel');
  solutionPanel.classList.remove('hidden');

  document.getElementById('solution-title').textContent = item.question;
  document.getElementById('solution-difficulty-badge').textContent = `${item.difficulty} Level`;
  document.getElementById('native-lang-title').textContent = item.nativeLanguage;

  const starBtn = document.getElementById('star-btn');
  starBtn.className = item.saved ? 'star-btn saved' : 'star-btn';
  starBtn.innerHTML = item.saved ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';

  document.getElementById('explanation-english-content').innerHTML = mdToHtml(item.englishExplanation);
  document.getElementById('explanation-native-content').innerHTML = mdToHtml(item.nativeExplanation);

  const vocabContainer = document.getElementById('vocab-container');
  vocabContainer.innerHTML = '';
  (item.keyTerms || []).forEach(term => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `
      <div class="vocab-header">
        <span class="vocab-eng">${term.term}</span>
        <span class="vocab-nat">${term.nativeTranslation}</span>
      </div>
      <p class="vocab-def">${term.definition}</p>
    `;
    vocabContainer.appendChild(card);
  });

  renderQuiz(item.quiz);

  const engTTS = document.getElementById('tts-english-btn');
  const natTTS = document.getElementById('tts-native-btn');
  
  engTTS.onclick = () => speakText(item.englishExplanation, "english", engTTS);
  natTTS.onclick = () => speakText(item.nativeExplanation, item.nativeLanguage, natTTS);

  // Scroll main panels down to visual zone
  window.scrollTo({
    top: solutionPanel.offsetTop - 40,
    behavior: 'smooth'
  });
}

function renderQuiz(quizList) {
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';

  (quizList || []).forEach((q, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'quiz-card-container';
    
    let optionsHtml = q.options.map(opt => {
      const letter = opt.charAt(0);
      return `<button class="quiz-choice-btn" data-letter="${letter}">${escapeHtml(opt)}</button>`;
    }).join('');

    wrapper.innerHTML = `
      <div class="quiz-card" id="quiz-card-${i}">
        <div class="card-front">
          <span class="quiz-q-num">Question ${i + 1}</span>
          <p class="quiz-q-text">${escapeHtml(q.question)}</p>
          <div class="quiz-choices">
            ${optionsHtml}
          </div>
        </div>
        <div class="card-back" id="quiz-back-${i}"></div>
      </div>
    `;

    wrapper.querySelectorAll('.quiz-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-letter');
        flipQuizCard(i, selected, q);
      });
    });

    container.appendChild(wrapper);
  });
}

function flipQuizCard(index, selectedLetter, quizItem) {
  SFX.flip();
  const card = document.getElementById(`quiz-card-${index}`);
  const back = document.getElementById(`quiz-back-${index}`);
  
  const isCorrect = selectedLetter.toUpperCase() === quizItem.correctAnswer.toUpperCase();
  
  if (isCorrect) {
    SFX.success();
    back.className = 'card-back correct';
    back.innerHTML = `
      <div class="quiz-result-header">
        <i class="fa-solid fa-circle-check"></i> Correct!
      </div>
      <p class="quiz-feedback-text">${escapeHtml(quizItem.explanation)}</p>
      <button class="flip-back-btn" onclick="flipQuizBack(${index})">Back</button>
    `;
  } else {
    SFX.wrong();
    back.className = 'card-back incorrect';
    back.innerHTML = `
      <div class="quiz-result-header">
        <i class="fa-solid fa-circle-xmark"></i> Incorrect
      </div>
      <p class="quiz-feedback-text">You chose ${selectedLetter}. Correct: ${quizItem.correctAnswer}.<br>${escapeHtml(quizItem.explanation)}</p>
      <button class="flip-back-btn" onclick="flipQuizBack(${index})">Try Again</button>
    `;
  }

  card.classList.add('flipped');
}

window.flipQuizBack = function(index) {
  SFX.flip();
  const card = document.getElementById(`quiz-card-${index}`);
  if (card) card.classList.remove('flipped');
};

// ============================================================================
// Bookmark Star & History
// ============================================================================
function renderHistory() {
  const listEl = document.getElementById('history-list');
  const showSavedOnly = document.getElementById('bookmarks-only-checkbox').checked;
  
  if (!listEl) return;
  listEl.innerHTML = '';

  let filtered = appState.history;
  if (showSavedOnly) {
    filtered = filtered.filter(item => item.saved);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = showSavedOnly 
      ? '<p class="empty-state">No saved doubts found.</p>'
      : '<p class="empty-state">No solved history found.</p>';
    return;
  }

  filtered.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `history-item${item.id === appState.activeId ? ' active' : ''}`;
    
    itemEl.innerHTML = `
      <div class="history-info">
        <span class="history-q">${escapeHtml(item.question)}</span>
        <div class="history-meta-row">
          <span class="history-lang">${item.nativeLanguage}</span>
          <span class="history-diff">${item.difficulty}</span>
        </div>
      </div>
      <button class="history-actions-btn${item.saved ? ' active' : ''}" title="Star/Bookmark">
        <i class="fa-${item.saved ? 'solid' : 'regular'} fa-star"></i>
      </button>
    `;

    itemEl.addEventListener('click', (e) => {
      if (e.target.closest('.history-actions-btn')) {
        e.stopPropagation();
        SFX.bookmark();
        item.saved = !item.saved;
        saveState();
        updateStats();
        renderHistory();
        if (appState.activeId === item.id) {
          const starBtn = document.getElementById('star-btn');
          starBtn.className = item.saved ? 'star-btn saved' : 'star-btn';
          starBtn.innerHTML = item.saved ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
        }
        return;
      }
      SFX.click();
      appState.activeId = item.id;
      document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
      itemEl.classList.add('active');
      displaySolution(item);
    });

    listEl.appendChild(itemEl);
  });
}

// ============================================================================
// Listeners & bindings
// ============================================================================
function bindEvents() {
  // Theme toggle
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    SFX.click();
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', appState.theme);
    document.getElementById('theme-toggle-btn').innerHTML = appState.theme === 'dark'
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
    saveState();
  });

  // Sound toggle
  document.getElementById('toggle-sound-btn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    appState.sound = soundEnabled;
    document.getElementById('toggle-sound-btn').innerHTML = soundEnabled
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';
    SFX.click();
    saveState();
  });

  // Solve Action
  document.getElementById('solve-btn').addEventListener('click', () => {
    SFX.click();
    solveDoubt();
  });

  // Mic dictation click
  document.getElementById('mic-btn').addEventListener('click', () => {
    SFX.click();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  // File selectors trigger
  document.getElementById('attachment-btn').addEventListener('click', () => {
    SFX.click();
    document.getElementById('image-upload').click();
  });

  // File upload input change
  document.getElementById('image-upload').addEventListener('change', handleImageSelect);

  // Remove preview button
  document.getElementById('remove-image-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    SFX.click();
    clearAttachedImage();
  });

  // Bookmarks check switch
  document.getElementById('bookmarks-only-checkbox').addEventListener('change', () => {
    SFX.click();
    renderHistory();
  });

  // Star detail button
  document.getElementById('star-btn').addEventListener('click', () => {
    SFX.bookmark();
    const activeItem = appState.history.find(item => item.id === appState.activeId);
    if (activeItem) {
      activeItem.saved = !activeItem.saved;
      saveState();
      updateStats();
      renderHistory();
      
      const starBtn = document.getElementById('star-btn');
      starBtn.className = activeItem.saved ? 'star-btn saved' : 'star-btn';
      starBtn.innerHTML = activeItem.saved ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }
  });
}

// ============================================================================
// Formatting utilities
// ============================================================================
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mdToHtml(md) {
  if (!md) return '';
  return md
    // Math formulas (LaTeX)
    .replace(/\\\[([\s\S]+?)\\\]/g, '<div class="math-block">$$$1$$</div>')
    .replace(/\\\(([\s\S]+?)\\\)/g, '<span class="math-inline">$$$1$$</span>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<div')) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join('');
}

function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  toast.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-info-circle'}"></i><span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// Init App
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindEvents();
  initSpeechRecognition();
  checkServerHealth();
  
  setInterval(checkServerHealth, 6000);
});

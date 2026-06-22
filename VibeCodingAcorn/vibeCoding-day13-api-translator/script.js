/**
 * Gemini AirTranslate Controller (script.js)
 * Handles Speech Recognition, Gemini API generateContent, Sentiment Gauge updates, and TTS.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Storage Key Constants
  const STORAGE_KEY = 'gemini_api_key';
  const DEMO_MODE_KEY = 'gemini_demo_mode';
  const HISTORY_KEY = 'gemini_translate_history';

  // Elements
  const el = {
    srcText: document.getElementById('src-text'),
    targetText: document.getElementById('target-text'),
    outputPlaceholder: document.getElementById('output-placeholder-text'),
    srcLang: document.getElementById('src-lang'),
    targetLang: document.getElementById('target-lang'),
    btnTranslate: document.getElementById('btn-translate-manual'),
    btnMic: document.getElementById('btn-mic'),
    btnClearSrc: document.getElementById('btn-clear-src'),
    btnTts: document.getElementById('btn-tts'),
    btnCopyTarget: document.getElementById('btn-copy-target'),
    btnApiSettings: document.getElementById('btn-api-settings'),
    micBadge: document.getElementById('mic-badge'),
    detectedBadge: document.getElementById('detected-badge'),
    detectedLangName: document.getElementById('detected-lang-name'),
    srcCharCount: document.getElementById('src-char-count'),
    loader: document.getElementById('translator-loader'),
    
    // Sentiment
    sentimentBadge: document.getElementById('sentiment-badge-display'),
    sentimentEmoji: document.getElementById('sentiment-emoji'),
    sentimentText: document.getElementById('sentiment-text'),
    sentimentExplanation: document.getElementById('sentiment-explanation-text'),
    meterPos: document.getElementById('meter-positive'),
    meterNeu: document.getElementById('meter-neutral'),
    meterNeg: document.getElementById('meter-negative'),
    valPos: document.getElementById('val-positive'),
    valNeu: document.getElementById('val-neutral'),
    valNeg: document.getElementById('val-negative'),

    // Modal
    apiModal: document.getElementById('api-modal'),
    apiKeyForm: document.getElementById('api-key-form'),
    keyInput: document.getElementById('gemini-key-input'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    toastContainer: document.getElementById('toast-container'),

    // Premium UI Extensions
    btnSwap: document.getElementById('btn-swap-languages'),
    demoModeToggle: document.getElementById('demo-mode-toggle'),
    voiceWaveform: document.getElementById('voice-waveform'),
    historyList: document.getElementById('history-list'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    trendFillPos: document.getElementById('trend-fill-pos'),
    trendFillNeu: document.getElementById('trend-fill-neu'),
    trendFillNeg: document.getElementById('trend-fill-neg'),
    trendPctPos: document.getElementById('trend-pct-pos'),
    trendPctNeu: document.getElementById('trend-pct-neu'),
    trendPctNeg: document.getElementById('trend-pct-neg'),
    trendStatsSummary: document.getElementById('trend-stats-summary-text')
  };

  // State Variables
  let isRecording = false;
  let recognition = null;
  let translateTimeout = null;

  // Initialize Speech Recognition
  initSpeechRecognition();

  // Initialize API Key Modal and History logic
  checkApiKeyOnLoad();

  // Event Listeners
  el.btnApiSettings.addEventListener('click', openApiModal);
  el.btnCloseModal.addEventListener('click', closeApiModal);
  el.apiKeyForm.addEventListener('submit', saveApiKey);
  
  el.demoModeToggle.addEventListener('change', () => {
    const demoModeChecked = el.demoModeToggle.checked;
    localStorage.setItem(DEMO_MODE_KEY, demoModeChecked ? 'true' : 'false');
    if (demoModeChecked) {
      el.keyInput.placeholder = '데모 모드 활성화됨 (입력 불필요)';
    } else {
      el.keyInput.placeholder = 'AIzaSy...';
    }
  });

  el.btnSwap.addEventListener('click', swapLanguages);
  el.btnClearHistory.addEventListener('click', clearAllHistory);
  
  el.srcText.addEventListener('input', () => {
    updateCharCount();
    // Auto-translate with 800ms debounce
    clearTimeout(translateTimeout);
    if (el.srcText.value.trim() !== '') {
      translateTimeout = setTimeout(performTranslation, 800);
    } else {
      clearOutput();
    }
  });

  el.btnClearSrc.addEventListener('click', () => {
    el.srcText.value = '';
    updateCharCount();
    clearOutput();
    showToast('입력 창을 비웠습니다.', 'info');
  });

  el.btnTranslate.addEventListener('click', performTranslation);

  el.btnCopyTarget.addEventListener('click', () => {
    if (!el.targetText.textContent) return;
    navigator.clipboard.writeText(el.targetText.textContent)
      .then(() => {
        showToast('번역 텍스트가 복사되었습니다.', 'success');
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 }
        });
      })
      .catch(() => showToast('클립보드 복사에 실패했습니다.', 'error'));
  });

  el.btnTts.addEventListener('click', speakTranslation);

  // Microphone toggle button
  el.btnMic.addEventListener('click', toggleSpeechRecognition);

  // Initialize controls
  updateCharCount();

  /* ==========================================================================
     Speech Recognition Logic
     ========================================================================== */
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      el.btnMic.disabled = true;
      el.btnMic.title = '이 브라우저는 음성 인식을 지원하지 않습니다.';
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecording = true;
      el.btnMic.classList.add('recording');
      el.micBadge.classList.remove('hidden');
      el.voiceWaveform.classList.remove('hidden');
      showToast('음성 인식을 시작합니다. 마이크에 말씀해 주세요.', 'info');
    };

    recognition.onend = () => {
      isRecording = false;
      el.btnMic.classList.remove('recording');
      el.micBadge.classList.add('hidden');
      el.voiceWaveform.classList.add('hidden');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      el.btnMic.classList.remove('recording');
      el.micBadge.classList.add('hidden');
      el.voiceWaveform.classList.add('hidden');
      
      if (event.error === 'not-allowed') {
        showToast('마이크 사용 권한이 거부되었습니다.', 'error');
      } else {
        showToast(`음성 인식 오류: ${event.error}`, 'error');
      }
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      const currentVal = el.srcText.value.trim();
      el.srcText.value = currentVal ? currentVal + ' ' + speechToText : speechToText;
      updateCharCount();
      showToast('음성을 텍스트로 변환했습니다.', 'success');
      performTranslation();
    };
  }

  function toggleSpeechRecognition() {
    if (!recognition) {
      showToast('이 브라우저는 음성 입력을 지원하지 않습니다.', 'error');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      // Set lang based on selected source language
      const selectedSrc = el.srcLang.value;
      recognition.lang = selectedSrc === 'auto' ? 'ko-KR' : getLangLocaleCode(selectedSrc);
      recognition.start();
    }
  }

  function getLangLocaleCode(langCode) {
    const localeMap = {
      ko: 'ko-KR',
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE'
    };
    return localeMap[langCode] || 'ko-KR';
  }

  /* ==========================================================================
     API Key Configuration Modal
     ========================================================================== */
  function checkApiKeyOnLoad() {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    const demoModeActive = localStorage.getItem(DEMO_MODE_KEY) === 'true';
    
    el.demoModeToggle.checked = demoModeActive;
    if (demoModeActive) {
      el.keyInput.placeholder = '데모 모드 활성화됨 (입력 불필요)';
    }
    
    if (savedKey) {
      el.keyInput.value = savedKey;
    }
    
    if (!savedKey && !demoModeActive) {
      openApiModal();
    }
    
    // Render translation history and trend statistics on load
    renderHistory();
  }

  function openApiModal() {
    el.apiModal.classList.remove('hidden');
  }

  function closeApiModal() {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    const demoModeActive = localStorage.getItem(DEMO_MODE_KEY) === 'true';
    if (!savedKey && !demoModeActive) {
      showToast('Gemini API Key 또는 데모 모드가 지정되지 않아 번역이 작동하지 않을 수 있습니다.', 'error');
    }
    el.apiModal.classList.add('hidden');
  }

  function saveApiKey(e) {
    e.preventDefault();
    const newKey = el.keyInput.value.trim();
    const demoModeChecked = el.demoModeToggle.checked;
    
    localStorage.setItem(DEMO_MODE_KEY, demoModeChecked ? 'true' : 'false');
    
    if (newKey) {
      localStorage.setItem(STORAGE_KEY, newKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    if (!newKey && !demoModeChecked) {
      showToast('API Key를 입력하거나 데모 모드를 활성화해 주세요.', 'error');
      return;
    }
    
    showToast('설정이 성공적으로 저장되었습니다.', 'success');
    el.apiModal.classList.add('hidden');
    
    // If there is text, perform translation immediately
    if (el.srcText.value.trim() !== '') {
      performTranslation();
    }
  }

  /* ==========================================================================
     Gemini API Translation & Sentiment Orchestration
     ========================================================================== */
  async function performTranslation() {
    const textToTranslate = el.srcText.value.trim();
    if (!textToTranslate) return;

    const apiKey = localStorage.getItem(STORAGE_KEY);
    const isDemoMode = el.demoModeToggle.checked;
    
    if (!apiKey && !isDemoMode) {
      showToast('먼저 Gemini API Key를 설정하거나 데모 모드를 켜주세요.', 'error');
      openApiModal();
      return;
    }

    // Show loaders
    el.loader.classList.remove('hidden');
    el.outputPlaceholder.textContent = '번역 및 감정을 분석하는 중입니다...';
    el.outputPlaceholder.classList.remove('hidden');
    el.targetText.classList.add('hidden');
    
    // Disable buttons
    el.btnTts.disabled = true;
    el.btnCopyTarget.disabled = true;

    const sourceLangValue = el.srcLang.value;
    const targetLangCode = el.targetLang.value;
    const targetLangName = el.targetLang.options[el.targetLang.selectedIndex].text;

    // 1. Handle Demo Mode (Mock Translator)
    if (isDemoMode) {
      try {
        // Simulate networking delay (800ms)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockTrans = generateMockTranslation(textToTranslate, sourceLangValue, targetLangCode);
        const mockSentiment = generateMockSentiment(textToTranslate);
        
        const result = {
          translatedText: mockTrans,
          originalLanguage: mockSentiment.originalLanguage,
          sentiment: mockSentiment.sentiment,
          sentimentExplanation: mockSentiment.explanation,
          sentimentScores: mockSentiment.scores
        };
        
        renderResults(result);
        
        // Save to History
        saveToHistory({
          timestamp: Date.now(),
          srcText: textToTranslate,
          translatedText: result.translatedText,
          srcLang: sourceLangValue === 'auto' ? (mockSentiment.originalLanguage === 'Korean' ? 'ko' : 'en') : sourceLangValue,
          targetLang: targetLangCode,
          sentiment: result.sentiment,
          sentimentExplanation: result.sentimentExplanation,
          sentimentScores: result.sentimentScores
        });
        
      } catch (mockErr) {
        console.error('Demo Mode error:', mockErr);
        showToast('데모 번역 생성 중 오류가 발생했습니다.', 'error');
      } finally {
        el.loader.classList.add('hidden');
      }
      return;
    }

    // 2. Handle Real Mode (Gemini API)
    // Prompt containing structured JSON demand
    const prompt = `You are an expert translator and sentiment analyzer.
Translate the following input text into the target language: "${targetLangName}".
Also, analyze the overall sentiment (positive, neutral, or negative) of the original text. Provide estimation scores (percentages summing to 100) for all three sentiments.

Return ONLY a valid JSON object matching the following schema. Do not wrap it in markdown code blocks or add any additional commentary:
{
  "translatedText": "the translated content string",
  "originalLanguage": "the detected original language name (e.g., English, Korean)",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentExplanation": "한글로 작성된 간결한 감정분석의 근거/해석 (e.g. '행복함과 긍정적인 형용사들이 다수 관찰됩니다.')",
  "sentimentScores": {
    "positive": integer (0 to 100),
    "neutral": integer (0 to 100),
    "negative": integer (0 to 100)
  }
}

Original Text to translate:
"${textToTranslate}"`;

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates[0].content.parts[0].text;
      
      // Parse JSON from response
      const result = JSON.parse(rawText.trim());

      // Update UI with Results
      renderResults(result);

      // Save to History
      saveToHistory({
        timestamp: Date.now(),
        srcText: textToTranslate,
        translatedText: result.translatedText,
        srcLang: sourceLangValue === 'auto' ? (result.originalLanguage === 'Korean' || result.originalLanguage === 'ko' ? 'ko' : 'en') : sourceLangValue,
        targetLang: targetLangCode,
        sentiment: result.sentiment,
        sentimentExplanation: result.sentimentExplanation,
        sentimentScores: result.sentimentScores
      });

    } catch (err) {
      console.error('Translation execution failed:', err);
      let errorMsg = '번역 중 오류가 발생했습니다.';
      if (err.message.includes('API key not valid')) {
        errorMsg = '유효하지 않은 API 키입니다. 설정을 확인해 주세요.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMsg = '네트워크 연결 상태를 확인해 주세요.';
      } else {
        errorMsg = `오류: ${err.message}`;
      }
      showToast(errorMsg, 'error');
      
      el.outputPlaceholder.textContent = '오류가 발생하여 번역을 완료하지 못했습니다.';
      // Reset UI elements
      clearSentimentUI();
    } finally {
      el.loader.classList.add('hidden');
    }
  }

  function renderResults(result) {
    // 1. Translated Text
    el.outputPlaceholder.classList.add('hidden');
    el.targetText.textContent = result.translatedText;
    el.targetText.classList.remove('hidden');

    // Enable utilities
    el.btnTts.disabled = false;
    el.btnCopyTarget.disabled = false;

    // 2. Language Detected Badge
    if (result.originalLanguage) {
      el.detectedLangName.textContent = result.originalLanguage;
      el.detectedBadge.classList.remove('hidden');
    } else {
      el.detectedBadge.classList.add('hidden');
    }

    // 3. Sentiment Indicator Badge
    const sentiment = result.sentiment || 'neutral';
    el.sentimentBadge.className = `sentiment-indicator-badge ${sentiment}`;
    
    let emoji = '😐';
    let text = '중립';
    if (sentiment === 'positive') {
      emoji = '😊';
      text = '긍정적';
    } else if (sentiment === 'negative') {
      emoji = '😢';
      text = '부정적';
    }
    el.sentimentEmoji.textContent = emoji;
    el.sentimentText.textContent = text;

    // 4. Sentiment Scores Gauges
    const scores = result.sentimentScores || { positive: 0, neutral: 100, negative: 0 };
    
    // Normalize to ensure total is approx 100
    const posVal = Math.min(100, Math.max(0, parseInt(scores.positive) || 0));
    const neuVal = Math.min(100, Math.max(0, parseInt(scores.neutral) || 0));
    const negVal = Math.min(100, Math.max(0, parseInt(scores.negative) || 0));

    el.meterPos.style.width = `${posVal}%`;
    el.meterNeu.style.width = `${neuVal}%`;
    el.meterNeg.style.width = `${negVal}%`;

    el.valPos.textContent = `${posVal}%`;
    el.valNeu.textContent = `${neuVal}%`;
    el.valNeg.textContent = `${negVal}%`;

    // 5. Sentiment Explanation text
    el.sentimentExplanation.textContent = result.sentimentExplanation || '이 텍스트에 대한 상세 감정 분석이 제공되지 않았습니다.';
  }

  /* ==========================================================================
     Mock Mode Generation Rules
     ========================================================================== */
  function generateMockTranslation(text, srcLang, targetLang) {
    const cleanText = text.trim();
    
    // Static mapped templates for key demonstration phrases
    const phrases = {
      "안녕하세요": { en: "Hello", ja: "こんにちは", zh: "你好", es: "Hola", fr: "Bonjour", de: "Hallo" },
      "반갑습니다": { en: "Nice to meet you", ja: "はじめまして", zh: "很高兴见到你", es: "Gusto en conocerte", fr: "Enchanté", de: "Freut mich, Sie kennenzulernen" },
      "안녕하세요, 오늘 날씨가 참 좋네요.": {
        en: "Hello, the weather is really nice today.",
        ja: "こんにちは、今日の天気はとてもいいですね。",
        zh: "你好，今天的天气真好。",
        es: "Hola, el clima está muy lindo hoy.",
        fr: "Bonjour, le temps est très beau aujourd'hui.",
        de: "Hallo, das Wetter ist heute wirklich schön."
      },
      "hello, the weather is really nice today.": {
        ko: "안녕하세요, 오늘 날씨가 정말 좋네요.",
        ja: "こんにちは、今日の天気はとてもいいですね。",
        zh: "你好，今天的天气真好。",
        es: "Hola, el clima está muy lindo hoy.",
        fr: "Bonjour, le temps est très beau aujourd'hui.",
        de: "Hallo, das Wetter ist heute wirklich schön."
      },
      "사랑해요": { en: "I love you", ja: "愛しています", zh: "我爱你", es: "Te amo", fr: "Je t'aime", de: "Ich liebe dich" },
      "배고파요": { en: "I'm hungry", ja: "お腹が空きました", zh: "我饿了", es: "Tengo hambre", fr: "J'ai faim", de: "Ich habe Hunger" },
      "감사합니다": { en: "Thank you", ja: "ありがとうございます", zh: "谢谢", es: "Gracias", fr: "Merci", de: "Danke" },
      "슬프고 속상해요": { en: "I feel sad and upset", ja: "悲しくて悔しいです", zh: "我感到悲伤和难过", es: "Me siento triste y molesto", fr: "Je me sens triste et bouleversé", de: "Ich bin traurig und verärgert" }
    };
    
    const lowerText = cleanText.toLowerCase();
    for (const key in phrases) {
      if (key.toLowerCase() === lowerText) {
        if (phrases[key][targetLang]) return phrases[key][targetLang];
      }
    }
    
    // Dynamic fallback generator
    const targetLangs = {
      ko: "한국어",
      en: "영어(English)",
      ja: "일본어(Japanese)",
      zh: "중국어(Chinese)",
      es: "스페인어(Spanish)",
      fr: "프랑스어(French)",
      de: "독일어(German)"
    };
    const targetLangName = targetLangs[targetLang] || targetLang.toUpperCase();
    
    if (targetLang === 'ko') {
      return `[데모 번역] ${cleanText}`;
    } else if (targetLang === 'en') {
      let simulated = cleanText
        .replace(/오늘/g, "today")
        .replace(/날씨/g, "weather")
        .replace(/좋다|좋아요|좋은/g, "good")
        .replace(/나쁘다|나쁜/g, "bad")
        .replace(/커피/g, "coffee")
        .replace(/친구/g, "friend")
        .replace(/행복/g, "happy");
      return `[Demo Translated] ${simulated}`;
    } else {
      return `[Demo translation to ${targetLangName}] ${cleanText}`;
    }
  }

  function generateMockSentiment(text) {
    const posKeywords = ["좋", "행복", "기쁨", "사랑", "감사", "최고", "대박", "happy", "great", "nice", "love", "thanks", "awesome", "beautiful", "good"];
    const negKeywords = ["슬프", "화난", "짜증", "싫", "미워", "최악", "실패", "아프", "sad", "angry", "bad", "hate", "fail", "hurt", "terrible", "worst"];
    
    let posCount = 0;
    let negCount = 0;
    
    posKeywords.forEach(k => {
      if (text.toLowerCase().includes(k)) posCount += 2;
    });
    
    negKeywords.forEach(k => {
      if (text.toLowerCase().includes(k)) negCount += 2;
    });
    
    let sentiment = "neutral";
    let explanation = "텍스트의 뉘앙스가 전반적으로 차분하고 객관적인 사실을 서술하고 있습니다.";
    let scores = { positive: 10, neutral: 80, negative: 10 };
    
    if (posCount > negCount) {
      sentiment = "positive";
      explanation = "긍정적인 의미를 가진 단어들과 감탄사들이 풍부하게 쓰여 문장 전반에서 화자의 만족감과 행복감이 느껴집니다.";
      scores = { positive: 82, neutral: 13, negative: 5 };
    } else if (negCount > posCount) {
      sentiment = "negative";
      explanation = "부정적인 상태를 표현하거나 아쉬움을 나타내는 어조가 포함되어 있습니다. 문맥이 우울하거나 불편한 상태를 암시합니다.";
      scores = { positive: 4, neutral: 12, negative: 84 };
    } else {
      const randomPos = 8 + Math.floor(Math.random() * 8);
      const randomNeg = 8 + Math.floor(Math.random() * 8);
      scores = { positive: randomPos, neutral: 100 - (randomPos + randomNeg), negative: randomNeg };
    }
    
    // Detect original language
    let originalLanguage = "English";
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
      originalLanguage = "Korean";
    } else if (/[\u3040-\u30ff\u31f0-\u31ff\u4e00-\u9faf]/.test(text)) {
      originalLanguage = "Japanese";
    }
    
    return {
      sentiment,
      explanation,
      scores,
      originalLanguage
    };
  }

  /* ==========================================================================
     Dual Language and Text Swap
     ========================================================================== */
  function swapLanguages() {
    const srcLangVal = el.srcLang.value;
    const targetLangVal = el.targetLang.value;
    const srcTextVal = el.srcText.value.trim();
    const targetTextVal = el.targetText.textContent.trim();
    
    let newSrcLang = targetLangVal;
    let newTargetLang = srcLangVal;
    
    if (srcLangVal === 'auto') {
      const detectedLangText = el.detectedLangName.textContent.trim();
      const reverseMap = {
        '한국어': 'ko', 'Korean': 'ko',
        '영어': 'en', 'English': 'en',
        '일본어': 'ja', 'Japanese': 'ja',
        '중국어': 'zh', 'Chinese': 'zh',
        '스페인어': 'es', 'Spanish': 'es',
        '프랑스어': 'fr', 'French': 'fr',
        '독일어': 'de', 'German': 'de'
      };
      newSrcLang = reverseMap[detectedLangText] || targetLangVal;
      newTargetLang = 'ko';
    }
    
    if (newSrcLang === newTargetLang) {
      newTargetLang = newSrcLang === 'ko' ? 'en' : 'ko';
    }
    
    el.srcLang.value = newSrcLang;
    el.targetLang.value = newTargetLang;
    
    const isTargetEmpty = el.targetText.classList.contains('hidden') || !targetTextVal || targetTextVal.startsWith('번역');
    
    if (isTargetEmpty) {
      el.srcText.value = '';
      clearOutput();
    } else {
      el.srcText.value = targetTextVal;
      updateCharCount();
      performTranslation();
    }
    
    showToast('언어와 텍스트 방향을 서로 전환했습니다.', 'success');
  }

  /* ==========================================================================
     Translation History System
     ========================================================================== */
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(item) {
    let history = getHistory();
    if (history.length > 0 && history[0].srcText === item.srcText && history[0].targetLang === item.targetLang) {
      return;
    }
    history.unshift(item);
    if (history.length > 10) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function deleteHistoryItem(index) {
    let history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    showToast('선택한 번역 기록을 삭제했습니다.', 'info');
  }

  function clearAllHistory() {
    const history = getHistory();
    if (history.length === 0) return;
    
    if (confirm('모든 번역 및 감정 분석 기록을 삭제하시겠습니까?')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      showToast('전체 번역 기록을 초기화했습니다.', 'success');
    }
  }

  function renderHistory() {
    const history = getHistory();
    el.historyList.innerHTML = '';
    
    if (history.length === 0) {
      el.historyList.innerHTML = '<li class="history-empty">저장된 번역 기록이 없습니다.</li>';
      updateTrendStats([]);
      return;
    }
    
    history.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const timeStr = new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const srcLangName = getLangName(item.srcLang);
      const targetLangName = getLangName(item.targetLang);
      
      let sentimentEmoji = '😐';
      if (item.sentiment === 'positive') sentimentEmoji = '😊';
      if (item.sentiment === 'negative') sentimentEmoji = '😢';

      li.innerHTML = `
        <div class="history-item-header">
          <div class="history-item-langs">${srcLangName} ➔ ${targetLangName}</div>
          <div class="history-item-meta">
            <span class="history-item-sentiment" title="감정: ${item.sentiment}">${sentimentEmoji}</span>
            <span class="history-item-time">${timeStr}</span>
            <button class="btn-delete-history-item" data-index="${index}" title="기록 삭제">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>
        <div class="history-item-content">
          <div class="history-text-preview src">${escapeHtml(item.srcText)}</div>
          <div class="history-text-preview target">${escapeHtml(item.translatedText)}</div>
        </div>
      `;
      
      li.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-history-item') || e.target.closest('.btn-delete-history-item i')) return;
        loadHistoryItem(item);
      });
      
      el.historyList.appendChild(li);
    });
    
    el.historyList.querySelectorAll('.btn-delete-history-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'));
        deleteHistoryItem(idx);
      });
    });

    lucide.createIcons();
    updateTrendStats(history);
  }

  function loadHistoryItem(item) {
    el.srcText.value = item.srcText;
    el.srcLang.value = item.srcLang;
    el.targetLang.value = item.targetLang;
    updateCharCount();
    
    const result = {
      translatedText: item.translatedText,
      originalLanguage: getLangName(item.srcLang),
      sentiment: item.sentiment,
      sentimentExplanation: item.sentimentExplanation,
      sentimentScores: item.sentimentScores
    };
    
    renderResults(result);
    showToast('선택한 번역 기록을 복원했습니다.', 'success');
  }

  function getLangName(langCode) {
    const names = {
      auto: '자동감지',
      ko: '한국어',
      en: '영어',
      ja: '일본어',
      zh: '중국어',
      es: '스페인어',
      fr: '프랑스어',
      de: '독일어'
    };
    return names[langCode] || langCode;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updateTrendStats(history) {
    if (!history || history.length === 0) {
      el.trendFillPos.style.width = '0%';
      el.trendFillNeu.style.width = '100%';
      el.trendFillNeg.style.width = '0%';
      
      el.trendPctPos.textContent = '0%';
      el.trendPctNeu.textContent = '100%';
      el.trendPctNeg.textContent = '0%';
      
      el.trendStatsSummary.textContent = '아직 누적된 데이터가 없습니다. 번역을 진행하여 감정을 분석해 보세요!';
      return;
    }
    
    const total = history.length;
    let pos = 0, neu = 0, neg = 0;
    
    history.forEach(item => {
      if (item.sentiment === 'positive') pos++;
      else if (item.sentiment === 'negative') neg++;
      else neu++;
    });
    
    const posPct = Math.round((pos / total) * 100);
    const negPct = Math.round((neg / total) * 100);
    const neuPct = 100 - (posPct + negPct);
    
    el.trendFillPos.style.width = `${posPct}%`;
    el.trendFillNeu.style.width = `${neuPct}%`;
    el.trendFillNeg.style.width = `${negPct}%`;
    
    el.trendPctPos.textContent = `${posPct}%`;
    el.trendPctNeu.textContent = `${neuPct}%`;
    el.trendPctNeg.textContent = `${negPct}%`;
    
    let dominant = '중립';
    let dominantPct = neuPct;
    
    if (posPct > neuPct && posPct > negPct) {
      dominant = '긍정적(😊)';
      dominantPct = posPct;
    } else if (negPct > neuPct && negPct > posPct) {
      dominant = '부정적(😢)';
      dominantPct = negPct;
    }
    
    el.trendStatsSummary.innerHTML = `최근 번역 기록 ${total}건 중, <strong>${dominant} (${dominantPct}%)</strong> 감정이 가장 큰 비중을 차지합니다.`;
  }

  /* ==========================================================================
     Text To Speech (TTS) Logic
     ========================================================================== */
  function speakTranslation() {
    const textToSpeak = el.targetText.textContent;
    if (!textToSpeak) return;

    // Stop currently active TTS first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const targetLangCode = el.targetLang.value;

    // Try to find native voice matching the target language locale
    const locale = getLangLocaleCode(targetLangCode);
    utterance.lang = locale;

    // Fetch voices and try to match
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(targetLangCode) || v.lang === locale);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onerror = (e) => {
      console.error('TTS execution error:', e);
      showToast('음성 출력 중 오류가 발생했습니다.', 'error');
    };

    window.speechSynthesis.speak(utterance);
    showToast('음성을 재생하고 있습니다.', 'info');
  }

  // Pre-load voices if supported
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {};
  }

  /* ==========================================================================
     Helper Utility Functions
     ========================================================================== */
  function updateCharCount() {
    const len = el.srcText.value.length;
    el.srcCharCount.textContent = len;
  }

  function clearOutput() {
    el.outputPlaceholder.textContent = '번역 결과가 여기에 표시됩니다.';
    el.outputPlaceholder.classList.remove('hidden');
    el.targetText.classList.add('hidden');
    el.targetText.textContent = '';
    el.detectedBadge.classList.add('hidden');
    el.btnTts.disabled = true;
    el.btnCopyTarget.disabled = true;
    clearSentimentUI();
  }

  function clearSentimentUI() {
    el.sentimentBadge.className = 'sentiment-indicator-badge neutral';
    el.sentimentEmoji.textContent = '😐';
    el.sentimentText.textContent = '대기 중';
    el.sentimentExplanation.textContent = '텍스트를 입력하고 번역을 진행하면 Gemini AI의 심층 뉘앙스 분석 결과가 이곳에 채워집니다.';
    
    el.meterPos.style.width = '0%';
    el.meterNeu.style.width = '100%';
    el.meterNeg.style.width = '0%';

    el.valPos.textContent = '0%';
    el.valNeu.textContent = '100%';
    el.valNeg.textContent = '0%';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;

    el.toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'lucide' } });

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
});

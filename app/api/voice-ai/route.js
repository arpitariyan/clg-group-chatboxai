import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { detectEmotion, generateEmotionalPrompt, getEmotionalVoiceParams, generateEmotionalSSMLText, analyzeSentenceEmotions } from '@/lib/emotionUtils';

// Helper function to get Gemini API keys with failover support
function getGeminiApiKeys() {
  const keys = [
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY_5
  ].filter(key => key && key.trim() !== '');

  return keys;
}

// Helper function to call Google Gemini API with automatic key failover
async function callGemini(prompt) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  let lastError = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('All Gemini API keys failed');
}

// Helper function to detect creator-related queries (supports multiple languages)
function isCreatorQuery(query) {
  const normalizedQuery = query.toLowerCase().trim();

  const creatorPatterns = [
    // English - explicit patterns for "who created you" variations
    /^who\s+(created|made|built|developed|designed)\s+you\??$/i,
    /^who\s+created\s+you\??$/i,
    /who\s+(created|made|built|developed|designed)\s+you/i,
    /who\s+(is\s+your|are\s+your)\s+(creator|maker|developer|builder)/i,
    /who\s+are\s+you\s+(created|made|built)\s+by/i,
    /what\s+(company|organization|team)\s+(created|made|built|developed)\s+you/i,
    /who\s+is\s+behind\s+you/i,
    /who\s+owns\s+you/i,
    /what\s+(is\s+your|are\s+your)\s+(origin|source)/i,
    /who\s+(founded|started)\s+you/i,
    /what\s+(company|organization)\s+do\s+you\s+belong\s+to/i,
    /who\s+is\s+your\s+(parent|owner)/i,

    // Spanish
    /qu[ií][eé]n\s+te\s+(cre[oó]|hizo|construy[oó]|desarroll[oó])/i,
    /qu[ií][eé]n\s+es\s+tu\s+(creador|fabricante|desarrollador)/i,

    // French
    /qui\s+t['']as\s+(cr[eé][eé]|fait|construit|d[eé]velopp[eé])/i,
    /qui\s+est\s+ton\s+(cr[eé]ateur|fabricant|d[eé]veloppeur)/i,

    // German
    /wer\s+hat\s+dich\s+(erstellt|gemacht|gebaut|entwickelt)/i,
    /wer\s+ist\s+dein\s+(sch[oö]pfer|hersteller|entwickler)/i,

    // Italian
    /chi\s+ti\s+ha\s+(creato|fatto|costruito|sviluppato)/i,
    /chi\s+[eè]\s+il\s+tuo\s+(creatore|produttore|sviluppatore)/i,

    // Portuguese
    /quem\s+te\s+(criou|fez|construiu|desenvolveu)/i,
    /quem\s+[eé]\s+seu\s+(criador|fabricante|desenvolvedor)/i,

    // Chinese (simplified)
    /谁\s*(创造|创建|制造|开发|设计)\s*了\s*你/i,
    /你的\s*(创造者|开发者|制造者)\s*是\s*谁/i,

    // Japanese
    /誰\s*が\s*あなた\s*を\s*(作った|作成した|開発した|設計した)/i,
    /あなた\s*の\s*(作成者|開発者|製造者)\s*は\s*誰/i,

    // Arabic
    /من\s+(أنشأك|صنعك|بناك|طورك)/i,
    /من\s+هو\s+(مبدعك|صانعك|مطورك)/i,

    // Hindi
    /तुम्हें\s*(किसने|कौन)\s*(बनाया|सृजित\s*किया|विकसित\s*किया)/i,
    /तुम्हारा\s*(निर्माता|विकासकर्ता|निर्माणकर्ता)\s*कौन\s*है/i,
  ];

  return creatorPatterns.some(pattern => pattern.test(normalizedQuery));
}

// Helper function to generate creator response
async function generateCreatorResponse(language = 'en') {
  // Direct natural responses: "ChatBox AI created me." in all languages
  const directResponses = {
    en: "ChatBox AI created me.",
    es: "ChatBox AI me creó.",
    fr: "ChatBox AI m'a créé.",
    de: "ChatBox AI hat mich erstellt.",
    it: "ChatBox AI mi ha creato.",
    pt: "ChatBox AI me criou.",
    zh: "ChatBox AI 创造了我。",
    ja: "ChatBox AIが私を作成しました。",
    ar: "ChatBox AI أنشأني.",
    hi: "ChatBox AI ने मुझे बनाया।"
  };

  // Return direct response immediately for voice conversation (simple and clear)
  return directResponses[language] || directResponses.en;
}

// Helper function to detect language from text (simple detection)
function detectLanguage(text) {
  const normalizedText = text.toLowerCase().trim();

  // Simple keyword-based detection
  const languageIndicators = {
    es: /\b(qu[ií][eé]n|t[uú]|es|de|la|el|un|una|con|para|por|sobre|como|est[aá]|este|esta)\b/i,
    fr: /\b(qui|tu|est|de|la|le|un|une|avec|pour|par|sur|comme|est|ce|cette)\b/i,
    de: /\b(wer|du|ist|der|die|das|ein|eine|mit|für|über|wie|ist|dieser)\b/i,
    it: /\b(chi|tu|è|di|la|il|un|una|con|per|da|su|come|è|questo)\b/i,
    pt: /\b(quem|você|é|de|a|o|um|uma|com|para|por|sobre|como|está|este)\b/i,
    zh: /[\u4e00-\u9fff]/,
    ja: /[\u3040-\u309f\u30a0-\u30ff]/,
    ar: /[\u0600-\u06ff]/,
    hi: /[\u0900-\u097f]/
  };

  for (const [lang, pattern] of Object.entries(languageIndicators)) {
    if (pattern.test(normalizedText)) {
      return lang;
    }
  }

  return 'en'; // Default to English
}

export async function POST(req) {
  try {
    const { query, language, conversationHistory = [] } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Detect language if not provided
    const detectedLanguage = language || detectLanguage(query);

    // Check if this is a creator query
    if (isCreatorQuery(query)) {
      const response = await generateCreatorResponse(detectedLanguage);
      return NextResponse.json({
        response: response,
        language: detectedLanguage,
        isCreatorQuery: true
      });
    }

    // Build conversation context
    const conversationContext = conversationHistory.length > 0
      ? conversationHistory.slice(-5).map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n') + '\n\n'
      : '';

    // Detect emotion from user query to generate emotionally intelligent responses
    const { emotion, intensity } = detectEmotion(query);

    // Create a prompt for voice conversation - short and natural responses with emotional context
    let voicePrompt = `${conversationContext}User asks: "${query}"

Please provide a short, clear, and natural voice response (2-4 sentences maximum). 
- Sound like you're having a real conversation
- Be concise and to the point
- Don't use markdown formatting or special characters
- Use natural, conversational language
- If the user is speaking in a language other than English, respond in that same language

Response:`;

    // Enhance prompt with emotional context for more human-like responses
    voicePrompt = generateEmotionalPrompt(voicePrompt, emotion, intensity);

    // Add specific instruction for natural, expressive speech
    voicePrompt += `\n\nIMPORTANT: Your response should be naturally expressive and emotional. Use varied sentence structures, natural pauses (commas), and conversational rhythm. Avoid robotic or formulaic language. Speak as a real person would speak with genuine emotion.`;

    // Generate AI response using Gemini
    const aiResponse = await callGemini(voicePrompt);

    // Clean up the response for voice output
    // Remove markdown, extra formatting, etc.
    let cleanedResponse = aiResponse
      .replace(/[#*_`\[\]()]/g, '') // Remove markdown symbols
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // If response is too long, try to shorten it
    if (cleanedResponse.length > 500) {
      // Get first sentence or two
      const sentences = cleanedResponse.split(/[.!?]+/).filter(s => s.trim());
      cleanedResponse = sentences.slice(0, 2).join('. ').trim() + '.';
    }

    // Apply emotional text preprocessing for natural speech patterns
    const emotionallyEnhancedText = generateEmotionalSSMLText(cleanedResponse, emotion, intensity);

    // Analyze sentence-level emotions for fine-grained control
    const sentenceEmotions = analyzeSentenceEmotions(cleanedResponse);

    return NextResponse.json({
      response: cleanedResponse,
      emotionalText: emotionallyEnhancedText,  // Text with emotional pauses and emphasis
      language: detectedLanguage,
      isCreatorQuery: false,
      emotion: emotion,
      emotionIntensity: intensity,
      voiceParams: getEmotionalVoiceParams(emotion, intensity),
      sentenceEmotions: sentenceEmotions  // Sentence-level emotion breakdown
    });

  } catch (error) {
    console.error('Voice AI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process voice query' },
      { status: 500 }
    );
  }
}


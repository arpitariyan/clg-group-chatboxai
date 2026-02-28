// Emotion detection and voice parameter adjustment utilities
// This module adds emotional intelligence to voice responses

/**
 * Detect emotional context from text
 * Returns emotion type and intensity (0-1)
 */
export function detectEmotion(text) {
  const lowerText = text.toLowerCase();

  // Enhanced emotional keyword patterns with more nuanced detection
  const emotionPatterns = {
    excited: {
      keywords: ['amazing', 'awesome', 'fantastic', 'wonderful', 'incredible', 'love', 'great', 'excellent', 'perfect', 'thrilled', 'delighted', 'fabulous', 'spectacular', 'outstanding', 'stunning', 'yay', 'woohoo', 'yes!'],
      intensity: 0.85,
      negativeKeywords: ['not', 'never', 'dont'],
      contextBoost: ['really', 'so', 'very', 'extremely', 'absolutely']
    },
    joyful: {
      keywords: ['happy', 'joy', 'glad', 'lovely', 'beautiful', 'smile', 'laugh', 'fun', 'enjoy', 'wonderful', 'blessed', 'grateful', 'cheerful', 'delighted', 'pleased'],
      intensity: 0.75,
      negativeKeywords: ['not', 'never'],
      contextBoost: ['so', 'very', 'really']
    },
    sad: {
      keywords: ['sorry', 'sad', 'unfortunate', 'disappointing', 'upset', 'regret', 'painful', 'difficult', 'struggle', 'hurt', 'heartbroken', 'miserable', 'depressed', 'devastated', 'down'],
      intensity: 0.7,
      negativeKeywords: ['not', 'bit'],
      contextBoost: ['really', 'so', 'very', 'deeply']
    },
    empathetic: {
      keywords: ['understand', 'feel', 'care', 'help', 'support', 'together', 'there for you', 'hear you', 'listen', 'compassion', 'concern', 'comfort', 'with you'],
      intensity: 0.75,
      negativeKeywords: [],
      contextBoost: ['truly', 'deeply', 'completely']
    },
    encouraging: {
      keywords: ['can do', 'believe', 'possible', 'try', 'confident', 'strong', 'capable', 'achieve', 'succeed', 'winner', 'champion', 'unstoppable', 'you got this'],
      intensity: 0.8,
      negativeKeywords: ['not', 'never', 'cant'],
      contextBoost: ['absolutely', 'definitely', 'totally']
    },
    calm: {
      keywords: ['relax', 'peace', 'calm', 'breathe', 'slow', 'gentle', 'ease', 'comfortable', 'serene', 'tranquil', 'meditate', 'mindful', 'soothing'],
      intensity: 0.65,
      negativeKeywords: ['not', 'no'],
      contextBoost: ['just', 'simply', 'gently']
    },
    thoughtful: {
      keywords: ['think', 'consider', 'perhaps', 'maybe', 'interesting', 'curious', 'wonder', 'fascinating', 'contemplate', 'reflect', 'ponder', 'analyze', 'hmm'],
      intensity: 0.65,
      negativeKeywords: [],
      contextBoost: ['quite', 'rather', 'somewhat']
    },
    surprised: {
      keywords: ['wow', 'surprising', 'unexpected', 'didn\'t expect', 'astonished', 'shocked', 'whoa', 'unbelievable', 'incredible', 'stunning', 'oh my'],
      intensity: 0.75,
      negativeKeywords: [],
      contextBoost: ['so', 'really', 'very', 'totally']
    },
    playful: {
      keywords: ['haha', 'hehe', 'funny', 'joke', 'playful', 'silly', 'hilarious', 'laugh', 'witty', 'cheeky', 'lol', 'kidding'],
      intensity: 0.7,
      negativeKeywords: [],
      contextBoost: ['so', 'really', 'quite']
    },
    passionate: {
      keywords: ['passionate', 'love', 'adore', 'desire', 'yearning', 'deeply', 'intensely', 'devoted', 'enthusiastic', 'fervent'],
      intensity: 0.8,
      negativeKeywords: ['not', 'dont'],
      contextBoost: ['so', 'very', 'extremely', 'truly']
    },
    anxious: {
      keywords: ['worried', 'anxious', 'nervous', 'stress', 'concerned', 'fear', 'afraid', 'scared', 'panic', 'overwhelmed', 'uneasy'],
      intensity: 0.7,
      negativeKeywords: ['not', 'little'],
      contextBoost: ['really', 'so', 'very', 'quite']
    },
    grateful: {
      keywords: ['thank', 'grateful', 'appreciate', 'blessed', 'fortunate', 'gratitude', 'thanks'],
      intensity: 0.7,
      negativeKeywords: [],
      contextBoost: ['so', 'very', 'really', 'truly']
    }
  };

  // Count exclamation marks for intensity boosting
  const exclamationCount = (text.match(/!/g) || []).length;
  const intensityBoost = Math.min(exclamationCount * 0.1, 0.3);

  let detectedEmotions = [];

  for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
    const matches = pattern.keywords.filter(keyword => lowerText.includes(keyword)).length;

    // Check for negation that might reduce intensity
    const hasNegation = pattern.negativeKeywords.some(neg => lowerText.includes(neg));

    // Check for context boosters
    const contextBoostCount = pattern.contextBoost?.filter(booster => lowerText.includes(booster)).length || 0;
    const contextMultiplier = 1 + (contextBoostCount * 0.15);

    if (matches > 0) {
      let intensity = pattern.intensity * (matches / pattern.keywords.length) * contextMultiplier;
      if (hasNegation) intensity *= 0.5; // Reduce intensity if negated
      intensity = Math.min(intensity + intensityBoost, 1);

      detectedEmotions.push({ emotion, intensity });
    }
  }

  // If multiple emotions detected, blend them or pick the strongest
  if (detectedEmotions.length === 0) {
    return { emotion: 'natural', intensity: 0.5 };
  } else if (detectedEmotions.length === 1) {
    return detectedEmotions[0];
  } else {
    // Sort by intensity and return the strongest emotion
    detectedEmotions.sort((a, b) => b.intensity - a.intensity);
    return detectedEmotions[0];
  }
}

/**
 * Get voice parameters based on detected emotion
 * Adjusts pitch, rate, and volume for emotional expression
 */
export function getEmotionalVoiceParams(emotion, intensity = 0.5) {
  const baseParams = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };

  // Enhanced voice parameters with more nuanced human-like characteristics
  // Intensity now has more impact on parameter variations
  const emotionalParams = {
    excited: {
      rate: 1.15 + (intensity * 0.2),      // Faster, more energetic (1.15-1.35)
      pitch: 1.3 + (intensity * 0.3),      // Much higher pitch (1.3-1.6)
      volume: 1.0,
      timbre: 'bright',                     // Bright, energetic timbre
      variation: 0.08                       // Higher variation for excitement
    },
    joyful: {
      rate: 1.08 + (intensity * 0.12),     // Moderately faster (1.08-1.20)
      pitch: 1.15 + (intensity * 0.2),     // Moderately higher (1.15-1.35)
      volume: 1.0,
      timbre: 'warm',                       // Warm, inviting timbre
      variation: 0.06
    },
    sad: {
      rate: 0.75 - (intensity * 0.15),     // Slower, more reflective (0.60-0.75)
      pitch: 0.80 - (intensity * 0.18),    // Lower pitch (0.62-0.80)
      volume: 0.85 - (intensity * 0.1),    // Softer volume
      timbre: 'soft',                       // Soft, gentle timbre
      variation: 0.04
    },
    empathetic: {
      rate: 0.90 - (intensity * 0.08),     // Slightly slower (0.82-0.90)
      pitch: 0.90 - (intensity * 0.1),     // Slightly lower (0.80-0.90)
      volume: 0.92,
      timbre: 'warm',                       // Warm, caring timbre
      variation: 0.05
    },
    encouraging: {
      rate: 1.05 + (intensity * 0.12),     // Moderately faster (1.05-1.17)
      pitch: 1.12 + (intensity * 0.18),    // Moderately higher (1.12-1.30)
      volume: 1.0,
      timbre: 'bright',                     // Bright, uplifting timbre
      variation: 0.07
    },
    calm: {
      rate: 0.75 - (intensity * 0.15),     // Much slower for calm (0.60-0.75)
      pitch: 0.92 - (intensity * 0.1),     // Slightly lower (0.82-0.92)
      volume: 0.95,
      timbre: 'soft',                       // Soft, soothing timbre
      variation: 0.03
    },
    thoughtful: {
      rate: 0.85 - (intensity * 0.1),      // Slower, contemplative (0.75-0.85)
      pitch: 0.98 - (intensity * 0.05),    // Nearly normal pitch (0.93-0.98)
      volume: 0.92,
      timbre: 'warm',                       // Warm, thoughtful timbre
      variation: 0.04
    },
    surprised: {
      rate: 1.12 + (intensity * 0.15),     // Faster, animated (1.12-1.27)
      pitch: 1.25 + (intensity * 0.25),    // Much higher (1.25-1.50)
      volume: 1.0,
      timbre: 'bright',                     // Bright, expressive timbre
      variation: 0.09
    },
    playful: {
      rate: 1.08 + (intensity * 0.12),     // Slightly faster (1.08-1.20)
      pitch: 1.18 + (intensity * 0.17),    // Slightly higher (1.18-1.35)
      volume: 1.0,
      timbre: 'bright',                     // Playful timbre
      variation: 0.07
    },
    passionate: {
      rate: 1.10 + (intensity * 0.15),     // Faster, intense (1.10-1.25)
      pitch: 1.20 + (intensity * 0.22),    // Higher pitch (1.20-1.42)
      volume: 1.0,
      timbre: 'warm',                       // Warm, passionate timbre
      variation: 0.08
    },
    anxious: {
      rate: 1.02 + (intensity * 0.12),     // Slightly faster, nervous (1.02-1.14)
      pitch: 1.08 + (intensity * 0.14),    // Slightly higher pitch (1.08-1.22)
      volume: 0.90,
      timbre: 'bright',                     // Slightly strained timbre
      variation: 0.10                       // High variation for anxiety
    },
    grateful: {
      rate: 0.92 - (intensity * 0.07),     // Slightly slower (0.85-0.92)
      pitch: 1.03 + (intensity * 0.12),    // Slightly higher (1.03-1.15)
      volume: 0.95,
      timbre: 'warm',                       // Warm, grateful timbre
      variation: 0.05
    },
    natural: {
      ...baseParams,
      variation: 0.04
    }
  };

  const params = emotionalParams[emotion] || baseParams;

  // Add small random micro-variations to make speech more human-like
  const variation = params.variation || 0.04;
  const microVariation = {
    rate: (Math.random() - 0.5) * variation,
    pitch: (Math.random() - 0.5) * (variation * 0.6),
    volume: (Math.random() - 0.5) * (variation * 0.3)
  };

  return {
    rate: Math.max(0.5, Math.min(2.0, params.rate + microVariation.rate)),
    pitch: Math.max(0.5, Math.min(2.0, params.pitch + microVariation.pitch)),
    volume: Math.max(0.5, Math.min(1.0, params.volume + microVariation.volume))
    // timbre is for future enhancement with more advanced audio APIs
  };
}

/**
 * Generate emotional prompt enhancement for AI responses
 * Adds context to the prompt to encourage emotional, human-like responses
 */
export function generateEmotionalPrompt(basePrompt, emotion, intensity) {
  // Enhanced emotional instructions for more human-like, nuanced responses
  const emotionalInstructions = {
    excited: "Respond with genuine enthusiasm and infectious energy! Express your excitement authentically. Use varied punctuation and convey real joy. Sound like someone who just heard great news and can't contain their excitement!",

    joyful: "Respond with warmth, positivity, and genuine delight. Your tone should be uplifting and optimistic. Show happiness naturally, like a close friend sharing in someone's joy. Use appreciative and kind language.",

    sad: "Respond with genuine empathy and emotional understanding. Acknowledge the person's feelings deeply. Use a caring, gentle tone that shows you truly understand their pain. Be supportive without being dismissive of their emotions.",

    empathetic: "Respond with deep compassion and active listening. Show that you truly hear and understand what they're saying. Use validating language that makes them feel heard and supported. Demonstrate genuine care and concern.",

    encouraging: "Respond in an uplifting, motivating, and confident way. Build their confidence and belief in themselves. Use empowering language that inspires action. Sound like a supportive mentor or coach who believes in their potential.",

    calm: "Respond in a soothing, peaceful, and tranquil way. Your tone should be reassuring and grounding. Help them feel safe and at ease. Use gentle, measured language that promotes relaxation and inner peace.",

    thoughtful: "Respond thoughtfully and reflectively, showing careful consideration. Your tone should be contemplative and analytical. Take time with your words, as if genuinely pondering their question. Sound wise and thoughtful.",

    surprised: "Respond with genuine surprise, wonder, and curiosity! Express authentic astonishment at what they've shared. Let your surprise be evident in your tone. Sound genuinely intrigued and captivated.",

    playful: "Respond with humor, light-heartedness, and playful energy! Use witty or clever responses that show you're enjoying the conversation. Sound fun and engaging, like talking with a friend who makes you smile.",

    passionate: "Respond with intensity, fervor, and genuine passion! Your tone should convey deep care and devotion to the topic. Sound like someone who truly cares about this with their whole heart. Express your intensity authentically.",

    anxious: "Respond with understanding and gentle reassurance. Your tone should acknowledge the concern while offering calm support. Show that you understand the worry without amplifying it. Be a calming presence.",

    grateful: "Respond with genuine appreciation and thankfulness. Your tone should be warm and express true gratitude. Sound like someone who is deeply appreciative and acknowledging their role. Be sincere and heartfelt.",

    natural: "Respond naturally and conversationally, as a genuine, helpful friend would. Be authentic, warm, and engaging. Sound like a real person having a real conversation."
  };

  const instruction = emotionalInstructions[emotion] || emotionalInstructions.natural;

  return `${basePrompt}

${instruction}

IMPORTANT: Make your response sound like a REAL PERSON with genuine feelings, natural speech patterns, and authentic emotions. 
- Use natural pacing and pauses
- Let your emotion shine through naturally
- Sound conversational and human, not robotic
- Express yourself as you truly feel, not as an AI
- Use natural language variations and imperfections that make it human`;
}

/**
 * Add natural human-like characteristics to speech
 * Includes breathing patterns, hesitations, and natural pauses
 */
export function addNaturalSpeechCharacteristics(text, emotion, intensity) {
  let enhancedText = text;

  // Add natural pauses based on emotion (more sophisticated than basic)
  const naturalPauses = {
    excited: {
      // Less pausing, more flow with occasional emphasis pauses
      patterns: [
        { find: /\b(amazing|incredible|awesome|fantastic)\b/gi, replace: '$& —' }
      ]
    },
    sad: {
      // More pauses, slower delivery with heavy breathing
      patterns: [
        { find: /([.!?])\s+([A-Z])/g, replace: '$1... $2' },
        { find: /,\s+/g, replace: ', ... ' }
      ]
    },
    thoughtful: {
      // Contemplative pauses with hesitations
      patterns: [
        { find: /,\s+/g, replace: ', ... ' },
        { find: /\b(I think|perhaps|maybe)\b/gi, replace: '... $&' }
      ]
    },
    calm: {
      // Slow, deliberate pacing with gentle pauses
      patterns: [
        { find: /,\s+/g, replace: ', ... ' },
        { find: /([.!?])\s+/g, replace: '$1... ' },
        { find: /\b(breathe|relax|calm)\b/gi, replace: '... $& ...' }
      ]
    },
    anxious: {
      // Quick, nervous pacing with minimal pauses
      patterns: [
        { find: /\s+/g, replace: ' ' },
        { find: /\b(worried|anxious|nervous)\b/gi, replace: '$&, ' }
      ]
    },
    empathetic: {
      // Warm, caring pauses
      patterns: [
        { find: /\b(understand|feel|care)\b/gi, replace: '... $&' },
        { find: /([.!?])\s+/g, replace: '$1 ... ' }
      ]
    },
    grateful: {
      // Warm, appreciative pacing
      patterns: [
        { find: /\b(thank|grateful|appreciate)\b/gi, replace: '... $& ...' }
      ]
    }
  };

  const pausePatterns = naturalPauses[emotion]?.patterns || [];
  pausePatterns.forEach(({ find, replace }) => {
    enhancedText = enhancedText.replace(find, replace);
  });

  // Add natural speech fillers based on emotion (more varied and context-aware)
  const speechFillers = {
    thoughtful: {
      starters: ['Well, ', 'You know, ', 'I think, ', 'Let me see, '],
      probability: 0.15 * intensity
    },
    playful: {
      starters: ['Oh, ', 'Hey, ', 'You know, '],
      probability: 0.12 * intensity
    },
    anxious: {
      starters: ['Um, ', 'Well, ', 'I mean, '],
      probability: 0.18 * intensity
    },
    empathetic: {
      starters: ['You see, ', 'I understand, ', 'Listen, '],
      probability: 0.14 * intensity
    },
    surprised: {
      starters: ['Wow! ', 'Oh my! ', 'Gosh, '],
      probability: 0.2 * intensity
    }
  };

  // Add fillers at beginning for natural speech
  if (speechFillers[emotion] && Math.random() < speechFillers[emotion].probability) {
    const fillers = speechFillers[emotion].starters;
    const filler = fillers[Math.floor(Math.random() * fillers.length)];
    enhancedText = filler + enhancedText.charAt(0).toLowerCase() + enhancedText.slice(1);
  }

  // Add emotional context words to enhance expressiveness
  const emotionalEnhancements = {
    excited: {
      words: ['really', 'absolutely', 'totally'],
      positions: ['before_adjective'],
      probability: 0.1 * intensity
    },
    joyful: {
      words: ['so', 'really', 'very'],
      positions: ['before_adjective'],
      probability: 0.08 * intensity
    },
    empathetic: {
      words: ['truly', 'genuinely', 'deeply'],
      positions: ['before_verb'],
      probability: 0.12 * intensity
    }
  };

  // Apply emotional enhancements sparingly
  if (emotionalEnhancements[emotion] && Math.random() < emotionalEnhancements[emotion].probability) {
    const enhancement = emotionalEnhancements[emotion];
    const word = enhancement.words[Math.floor(Math.random() * enhancement.words.length)];
    // Simple enhancement by adding to first suitable position
    enhancedText = enhancedText.replace(/\b(good|great|nice|wonderful|important)\b/i, `${word} $1`);
  }

  return enhancedText;
}

/**
 * Analyze emotions at sentence level for fine-grained voice control
 * Returns array of {text, emotion, intensity} for each sentence
 */
export function analyzeSentenceEmotions(text) {
  // Split text into sentences while preserving punctuation
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  return sentences.map(sentence => {
    const { emotion, intensity } = detectEmotion(sentence);
    return {
      text: sentence.trim(),
      emotion,
      intensity
    };
  });
}

/**
 * Generate emotionally-rich text with strategic pauses and emphasis
 * Simulates SSML-like behavior through text preprocessing for browser TTS
 */
export function generateEmotionalSSMLText(text, emotion, intensity = 0.5) {
  let enhancedText = text;

  // Emotion-specific text transformations for natural speech
  const emotionTransforms = {
    excited: {
      // Add emphasis through strategic punctuation
      addEmphasis: true,
      pauseStyle: 'minimal',
      breathPoints: ['beginning'],
      emphasisWords: ['amazing', 'incredible', 'awesome', 'fantastic', 'wonderful', 'great']
    },
    joyful: {
      addEmphasis: true,
      pauseStyle: 'light',
      breathPoints: ['mid'],
      emphasisWords: ['happy', 'joy', 'beautiful', 'lovely', 'delightful']
    },
    sad: {
      addEmphasis: false,
      pauseStyle: 'heavy',
      breathPoints: ['beginning', 'mid', 'end'],
      slowWords: ['sorry', 'sad', 'difficult', 'painful', 'hurt']
    },
    empathetic: {
      addEmphasis: false,
      pauseStyle: 'thoughtful',
      breathPoints: ['mid'],
      slowWords: ['understand', 'feel', 'care', 'support', 'here']
    },
    encouraging: {
      addEmphasis: true,
      pauseStyle: 'motivating',
      breathPoints: ['mid'],
      emphasisWords: ['can', 'will', 'strong', 'capable', 'believe', 'achieve']
    },
    calm: {
      addEmphasis: false,
      pauseStyle: 'slow',
      breathPoints: ['beginning', 'mid', 'end'],
      slowWords: ['relax', 'breathe', 'peace', 'calm', 'gentle', 'ease']
    },
    thoughtful: {
      addEmphasis: false,
      pauseStyle: 'contemplative',
      breathPoints: ['mid'],
      slowWords: ['think', 'consider', 'perhaps', 'maybe', 'wonder']
    },
    surprised: {
      addEmphasis: true,
      pauseStyle: 'quick',
      breathPoints: ['beginning'],
      emphasisWords: ['wow', 'surprising', 'unexpected', 'amazing', 'incredible']
    },
    playful: {
      addEmphasis: true,
      pauseStyle: 'bouncy',
      breathPoints: [],
      emphasisWords: ['fun', 'funny', 'hilarious', 'playful', 'silly']
    },
    passionate: {
      addEmphasis: true,
      pauseStyle: 'intense',
      breathPoints: ['mid'],
      emphasisWords: ['love', 'passionate', 'deeply', 'intensely', 'devoted']
    },
    anxious: {
      addEmphasis: false,
      pauseStyle: 'quick',
      breathPoints: ['beginning'],
      slowWords: ['worried', 'anxious', 'nervous', 'concerned']
    },
    grateful: {
      addEmphasis: false,
      pauseStyle: 'warm',
      breathPoints: ['beginning', 'end'],
      emphasisWords: ['thank', 'grateful', 'appreciate', 'blessed']
    },
    natural: {
      addEmphasis: false,
      pauseStyle: 'normal',
      breathPoints: [],
      emphasisWords: []
    }
  };

  const transform = emotionTransforms[emotion] || emotionTransforms.natural;

  // Add natural pauses based on emotion
  const pausePatterns = {
    heavy: { comma: '... ', period: '... ', question: '... ', exclamation: '... ' },
    thoughtful: { comma: '... ', period: '... ', question: '... ', exclamation: '. ' },
    contemplative: { comma: '... ', period: '... ', question: '... ', exclamation: '. ' },
    slow: { comma: '... ', period: '... ', question: '... ', exclamation: '... ' },
    light: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    minimal: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    quick: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    bouncy: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    motivating: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    intense: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' },
    warm: { comma: ', ', period: '. ', question: '? ', exclamation: '. ' },
    normal: { comma: ', ', period: '. ', question: '? ', exclamation: '! ' }
  };

  const pauses = pausePatterns[transform.pauseStyle] || pausePatterns.normal;

  // Replace punctuation with emotion-appropriate pauses
  if (transform.pauseStyle !== 'normal' && transform.pauseStyle !== 'minimal') {
    enhancedText = enhancedText
      .replace(/,\s+/g, pauses.comma)
      .replace(/\.\s+/g, pauses.period)
      .replace(/\?\s+/g, pauses.question)
      .replace(/!\s+/g, pauses.exclamation);
  }

  // Add subtle emphasis to key words by repeating vowels slightly (simulates emphasis)
  if (transform.emphasisWords && transform.emphasisWords.length > 0 && intensity > 0.6) {
    transform.emphasisWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      enhancedText = enhancedText.replace(regex, match => {
        // Add emphasis through context (can't modify pronunciation directly in browser TTS)
        return match;
      });
    });
  }

  return enhancedText.trim();
}

/**
 * Add emotional variance to speech parameters over time
 * Simulates natural voice variations that real humans have
 */
export function getVariantVoiceParams(baseParams, emotion, variation = 0.05) {
  // Add small random variations to make speech more human-like
  const variance = {
    rate: baseParams.rate + (Math.random() - 0.5) * variation,
    pitch: baseParams.pitch + (Math.random() - 0.5) * (variation * 0.5),
    volume: Math.max(0.5, Math.min(1.0, baseParams.volume + (Math.random() - 0.5) * variation))
  };

  return variance;
}

/**
 * Generate emotional micro-expressions (future enhancement for animation)
 */
export function getEmotionalAnimation(emotion, intensity) {
  const animations = {
    excited: {
      orbIntensity: 2.8 + (intensity * 0.5),
      orbVolume: 0.85 + (intensity * 0.15),
      color: 'rgb(34, 197, 94)',     // Green
      animation: 'pulse'
    },
    joyful: {
      orbIntensity: 2.2 + (intensity * 0.3),
      orbVolume: 0.75 + (intensity * 0.15),
      color: 'rgb(234, 179, 8)',     // Yellow/Gold
      animation: 'wave'
    },
    sad: {
      orbIntensity: 1.3 - (intensity * 0.2),
      orbVolume: 0.4 - (intensity * 0.1),
      color: 'rgb(59, 130, 246)',    // Blue
      animation: 'gentle'
    },
    empathetic: {
      orbIntensity: 1.8 - (intensity * 0.1),
      orbVolume: 0.65 - (intensity * 0.05),
      color: 'rgb(236, 72, 153)',    // Pink/Rose
      animation: 'gentle'
    },
    encouraging: {
      orbIntensity: 2.3 + (intensity * 0.2),
      orbVolume: 0.8 + (intensity * 0.1),
      color: 'rgb(168, 85, 247)',    // Purple
      animation: 'wave'
    },
    calm: {
      orbIntensity: 1.0 + (intensity * 0.1),
      orbVolume: 0.3 + (intensity * 0.1),
      color: 'rgb(6, 182, 212)',     // Cyan
      animation: 'smooth'
    },
    thoughtful: {
      orbIntensity: 1.6 - (intensity * 0.1),
      orbVolume: 0.55 - (intensity * 0.05),
      color: 'rgb(192, 132, 250)',   // Purple
      animation: 'gentle'
    },
    surprised: {
      orbIntensity: 2.6 + (intensity * 0.4),
      orbVolume: 0.9 + (intensity * 0.1),
      color: 'rgb(236, 72, 153)',    // Pink
      animation: 'burst'
    },
    playful: {
      orbIntensity: 2.2 + (intensity * 0.2),
      orbVolume: 0.75 + (intensity * 0.1),
      color: 'rgb(249, 115, 22)',    // Orange
      animation: 'bounce'
    },
    passionate: {
      orbIntensity: 2.5 + (intensity * 0.3),
      orbVolume: 0.85 + (intensity * 0.15),
      color: 'rgb(239, 68, 68)',     // Red
      animation: 'pulse'
    },
    anxious: {
      orbIntensity: 1.9 + (intensity * 0.2),
      orbVolume: 0.65 + (intensity * 0.15),
      color: 'rgb(251, 146, 60)',    // Orange
      animation: 'flicker'
    },
    grateful: {
      orbIntensity: 1.9 + (intensity * 0.1),
      orbVolume: 0.7 + (intensity * 0.1),
      color: 'rgb(34, 197, 94)',     // Green
      animation: 'gentle'
    },
    natural: {
      orbIntensity: 1.2,
      orbVolume: 0.05,
      color: 'rgb(255, 255, 255)',   // White
      animation: 'normal'
    }
  };

  return animations[emotion] || animations.natural;
}

/**
 * Select the best voice for emotional expression
 * Prioritizes voices that match the emotion and language
 */
export function selectEmotionalVoice(language, emotion, allVoices) {
  if (!allVoices || allVoices.length === 0) return null;

  const langCode = language.split('-')[0];

  // Voice preferences for emotions
  const voicePreferences = {
    excited: { preferred: 'female', pitch: 'high' },      // Energetic
    joyful: { preferred: 'female', pitch: 'high' },       // Warm
    sad: { preferred: 'female', pitch: 'low' },           // Empathetic
    empathetic: { preferred: 'female', pitch: 'low' },    // Warm and caring
    encouraging: { preferred: 'female', pitch: 'high' },  // Motivating
    calm: { preferred: 'female', pitch: 'low' },          // Soothing
    thoughtful: { preferred: 'female', pitch: 'medium' }, // Balanced
    surprised: { preferred: 'female', pitch: 'high' },    // Expressive
    natural: { preferred: 'any', pitch: 'medium' }
  };

  const preference = voicePreferences[emotion] || voicePreferences.natural;

  // Find voices matching the language
  const matchingVoices = allVoices.filter(voice =>
    voice.lang.startsWith(langCode) || voice.lang === language
  );

  if (matchingVoices.length === 0) {
    return allVoices[0]; // Fallback to first available
  }

  // Return first matching voice (browser usually orders them by quality)
  return matchingVoices[0];
}

/**
 * Get emotional response template
 * Provides structure for emotionally intelligent responses
 */
export function getEmotionalResponseTemplate(emotion) {
  const templates = {
    excited: "That's absolutely {action}! I'm thrilled {reason}. This is truly {descriptor}!",
    joyful: "How wonderful! I'm so glad {reason}. This is really {descriptor}.",
    sad: "I understand how that feels... {empathy}. But here's what we can do: {solution}",
    empathetic: "I hear you. That sounds {descriptor}. Here's what I'm thinking: {solution}",
    encouraging: "You've got this! {support}. Remember, {affirmation}.",
    calm: "Let's take a moment here. {perspective}. Everything's going to be alright.",
    thoughtful: "That's an interesting point. When you consider {analysis}, {insight}.",
    surprised: "Wow, I didn't expect that! {reaction}. This is quite {descriptor}!",
    natural: "Here's what I think: {content}."
  };

  return templates[emotion] || templates.natural;
}

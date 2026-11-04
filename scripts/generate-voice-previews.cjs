const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY in .env.local");
  process.exit(1);
}

const PREVIEW_TEXT = "Hey! I'm here. How can I help you today?";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

const voices = [
  { id: 'voice-1', voiceId: process.env.ELEVENLABS_VOICE_1_ID || '21m00Tcm4TlvDq8ikWAM' },
  { id: 'voice-2', voiceId: process.env.ELEVENLABS_VOICE_2_ID || 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'voice-3', voiceId: process.env.ELEVENLABS_VOICE_3_ID || 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'voice-4', voiceId: process.env.ELEVENLABS_VOICE_4_ID || 'VR6AewLTigWG4xVOuG7A' },
  { id: 'voice-5', voiceId: process.env.ELEVENLABS_VOICE_5_ID || 'N2lLspCBkWGWmqPjvh14' },
];

const outputDir = path.join(__dirname, '..', 'public', 'voice-previews');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generatePreview(voice) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: PREVIEW_TEXT,
      model_id: MODEL_ID,
      voice_settings: {
        stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.35'),
        similarity_boost: parseFloat(process.env.ELEVENLABS_SIMILARITY || '0.75'),
        style: parseFloat(process.env.ELEVENLABS_STYLE || '0.25'),
        use_speaker_boost: process.env.ELEVENLABS_SPEAKER_BOOST === 'true'
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_96`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`API Error ${res.statusCode}: ${errorData}`));
        });
        return;
      }

      const filePath = path.join(outputDir, `${voice.id}.mp3`);
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Generated preview for ${voice.id}`);
        resolve();
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function main() {
  for (const voice of voices) {
    try {
      console.log(`Generating preview for ${voice.id} (ElevenLabs Voice ID: ${voice.voiceId})...`);
      await generatePreview(voice);
    } catch (err) {
      console.error(`Failed to generate ${voice.id}:`, err.message);
    }
  }
  console.log("All previews generated.");
}

main();

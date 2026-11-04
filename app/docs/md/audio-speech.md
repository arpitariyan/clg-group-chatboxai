# Audio & Speech (TTS)

ChatboxAI provides a state-of-the-art Text-to-Speech (TTS) endpoint to convert text into lifelike spoken audio. 

```text
POST https://chatboxai.co.in/api/v1/audio/speech
```

---

## 1. Supported Models

| Tier | Model ID | Description |
| :--- | :--- | :--- |
| **Free** | `tts-1` | Standard quality. Optimized for real-time applications and speed. |
| **Paid** | `tts-1-hd` | High definition. Optimized for studio-quality audio, podcasts, and media. |

*(Note: Free models are subject to the global 300 requests/day limit).*

---

## 2. Available Voices

Both models support the following 6 standard voices:

- `alloy` (Neutral, versatile)
- `echo` (Warm, rounded)
- `fable` (Expressive, British-leaning)
- `onyx` (Deep, authoritative)
- `nova` (Energetic, female)
- `shimmer` (Clear, soft female)

---

## 3. Basic Implementation

The API returns a binary audio file (usually an MP3). You must handle the response as an `arrayBuffer` or stream to save it to disk or play it in the browser.

### Example (Node.js)

```javascript
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

async function generateSpeech() {
  const speechFile = path.resolve("./speech.mp3");

  const response = await client.audio.speech.create({
    model: "tts-1", // Free model
    voice: "alloy",
    input: "Welcome to ChatboxAI! This is a demonstration of our Text-to-Speech API.",
  });

  // Convert the response to a Buffer and save to disk
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  console.log(`Audio saved to ${speechFile}`);
}

generateSpeech();
```

---

## 4. Supported Output Formats

By default, the API returns an `mp3` file. You can change this using the `response_format` parameter.

Supported formats:
- `mp3` (Default, best for web and general use)
- `opus` (Best for low-latency streaming)
- `aac` (Best for iOS apps)
- `flac` (Lossless, best for `tts-1-hd` archival)
- `wav` (Uncompressed, best for raw audio processing)

```javascript
const response = await client.audio.speech.create({
  model: "tts-1-hd", // Paid high-definition model
  voice: "nova",
  input: "Generating lossless audio.",
  response_format: "flac", // Request FLAC format
});
```

---

## 5. Streaming Audio

For long text inputs, waiting for the entire audio file to generate can cause UI lag. The API supports chunked transfer encoding, allowing you to begin playing the audio before the entire file is fully generated.

If you are using the official OpenAI Node SDK, streaming is handled natively by piping the response data into a stream (e.g., streaming directly to an Express.js response object or saving to a file in chunks).

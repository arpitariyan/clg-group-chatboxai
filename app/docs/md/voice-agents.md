# Voice Agents

Build real-time voice-enabled AI agents with speech-in, speech-out capabilities.

## Architecture

A voice agent pipeline:
1. **Capture audio** from microphone (browser/mobile)
2. **Transcribe** to text with Whisper
3. **Process** with a chat model
4. **Synthesize** response to speech
5. **Play** audio back to user

## End-to-End Example

```javascript
async function voiceAgent(audioBlob) {
  // 1. Transcribe user speech
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");

  const transcriptionRes = await fetch("https://chatboxai.co.in/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CHATBOXAI_API_KEY}` },
    body: formData,
  });
  const { text: userText } = await transcriptionRes.json();

  // 2. Generate AI response
  const chatRes = await client.chat.completions.create({
    model: "chatboxai/gpt-oss-20b",
    messages: [
      { role: "system", content: "You are a helpful voice assistant. Be concise — responses will be spoken aloud." },
      { role: "user", content: userText },
    ],
  });
  const responseText = chatRes.choices[0].message.content;

  // 3. Convert to speech
  const speechRes = await fetch("https://chatboxai.co.in/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHATBOXAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: responseText,
      voice: "nova",
    }),
  });

  return speechRes.arrayBuffer();
}
```

## Browser Microphone Capture

```javascript
async function recordAudio(durationMs = 5000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  await new Promise((r) => setTimeout(r, durationMs));
  recorder.stop();

  await new Promise((r) => { recorder.onstop = r; });
  stream.getTracks().forEach((t) => t.stop());

  return new Blob(chunks, { type: "audio/webm" });
}
```

## Latency Optimization

For low-latency voice interactions:
- Use `tts-1` (not `tts-1-hd`) for faster synthesis
- Use `chatboxai/gpt-oss-20b` for fast reasoning
- Stream TTS audio as it's generated
- Keep system prompts short
- Limit response length with `max_tokens: 150`

## Voice Selection Guide

| Voice | Best for |
|-------|----------|
| `nova` | Friendly assistants, customer support |
| `onyx` | Professional, authoritative contexts |
| `alloy` | Neutral, all-purpose |
| `shimmer` | Upbeat, positive interactions |

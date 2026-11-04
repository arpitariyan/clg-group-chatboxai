# Images & Vision

ChatboxAI supports both **Image Generation** (creating images from text) and **Vision** (understanding images provided to the chat model).

---

## 1. Image Generation

Use the `images/generations` endpoint to generate high-quality images from text prompts.

```text
POST https://chatboxai.co.in/api/v1/images/generations
```

### Supported Models

| Tier | Model ID | Use Case | Cost per Image |
| :--- | :--- | :--- | :--- |
| **Free** | `chatboxai/image-flux-schnell` | Rapid prototyping, fast concept art. | $0.00 |
| **Paid** | `chatboxai/image-flux-dev` | Ultra-high quality, production-ready visuals. | $0.01 |
| **Paid** | `chatboxai/image-stable-diffusion-3.5` | Artistic, stylized, complex prompts. | $0.008 |
| **Paid** | `chatboxai/image-sdxl` | Cinematic, photographic realism. | $0.006 |

### Test via Postman / Thunder Client (Quick Test)

If you are testing via an API client, make sure to use the **`prompt`** field (NOT `messages`). Image models do not accept chat formats.

- **Method**: `POST`
- **URL**: `https://chatboxai.co.in/api/v1/images/generations`
- **Headers**:
  - `Authorization`: `Bearer cbx_live_YOUR_API_KEY`
  - `Content-Type`: `application/json`
- **Body (JSON)**:
  ```json
  {
    "model": "chatboxai/image-flux-schnell",
    "prompt": "A futuristic city skyline at sunset, cyberpunk style, highly detailed 8k.",
    "n": 1,
    "size": "1024x1024"
  }
  ```

### Example Request (Node.js)

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/api/v1",
});

async function generateImage() {
  const response = await client.images.generate({
    model: "chatboxai/image-flux-dev", // Paid, high-quality model
    prompt: "A futuristic city skyline at sunset, cyberpunk style, highly detailed 8k.",
    n: 1,
    size: "1024x1024",
  });

  // The API returns a URL to the generated image
  console.log("Image URL:", response.data[0].url);
}

generateImage();
```

---

## 2. Vision (Image Analysis)

You can pass images into compatible chat models to analyze visual content, read text from images (OCR), or understand charts.

### Supported Vision Models
- `chatboxai/gemini-2.5-flash` (Free)
- `chatboxai/gemini-2.5-pro` (Paid)
- `chatboxai/claude-4.5-sonnet` (Paid)
- `chatboxai/llama-3.2-90b-vision` (Paid)

### Passing Images as URLs

You can provide an array of content inside the user message, passing both text and a public image URL.

```javascript
const response = await client.chat.completions.create({
  model: "chatboxai/gemini-2.5-flash", // Free vision model
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        {
          type: "image_url",
          image_url: {
            url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
          },
        },
      ],
    },
  ],
});

console.log(response.choices[0].message.content); 
// Output: "This is the official logo for React, a JavaScript library..."
```

### Passing Images as Base64

If the image is local (on the user's device or server), you must convert it to a Base64 string.

```javascript
import fs from "fs";

// 1. Read the image and convert to Base64
const imageBuffer = fs.readFileSync("./chart.png");
const base64Image = imageBuffer.toString("base64");
const mimeType = "image/png";

// 2. Pass to the API
const response = await client.chat.completions.create({
  model: "chatboxai/claude-4.5-sonnet", // High-end paid reasoning
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Explain the trend in this chart." },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ],
});
```

---

## 3. Best Practices for Vision

- **Downscale before sending:** Very large images consume massive amounts of tokens (and therefore credits). Resize images to a maximum of `1024x1024` before converting to Base64 to save money.
- **Use clear prompts:** Tell the model exactly what to look for (e.g., "Extract the total amount from this receipt").
- **Combine with Structured Output:** You can ask the model to look at an image and return the data as a strict JSON object.

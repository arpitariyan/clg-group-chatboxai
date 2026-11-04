import OpenAI from 'openai';
import sharp from 'sharp';
import { databases, storage, DB_ID, BUCKET_ID, ID, getPublicFileUrl, createAppwriteFile } from '../services/appwrite-admin.js';
import { IMAGE_GENERATION_COLLECTION_ID } from '../services/appwrite-collections.js';

const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';
const HF_MAX_RETRIES = 3;
const HF_RETRY_DELAY_MS = 20000;

const getA4FApiKeys = () => [
  process.env.A4F_API_KEY,
  process.env.A4F_API_KEY_2,
  process.env.A4F_API_KEY_3,
  process.env.A4F_API_KEY_4,
].filter((key) => key && key.trim() !== '');

function decodeBase64Image(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;

  let data = base64String.trim();
  if (data.includes(',')) {
    data = data.split(',')[1] || data;
  }

  try {
    return Buffer.from(data, 'base64');
  } catch {
    return null;
  }
}

async function downloadImageBuffer(imageUrl) {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function extractImageBufferFromA4FResponse(response) {
  const firstItem = response?.data?.[0] || response?.output?.[0] || response?.images?.[0] || null;
  if (!firstItem) return null;

  const directBase64 = firstItem.b64_json || firstItem.base64 || firstItem.image_base64 || firstItem.imageBase64 || null;
  const decoded = decodeBase64Image(directBase64);
  if (decoded) return decoded;

  const imageUrl = firstItem.url || firstItem.imageUrl || firstItem.output || null;
  return await downloadImageBuffer(imageUrl);
}

async function tryImageGeneration(keys, requestData) {
  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.a4f.co/v1',
      });

      const response = await client.images.generate(requestData);
      return { success: true, response, keyIndex: i + 1 };
    } catch (error) {
      lastError = error;
      if (String(error?.message || '').includes('quota') || String(error?.message || '').includes('429') || String(error?.message || '').includes('rate limit')) {
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}

async function generateWithHuggingFace(prompt, modelId, width, height) {
  const apiKey = [process.env.HF_API_KEY, process.env.HF_API_KEY_2, process.env.HF_API_KEY_3, process.env.HF_API_KEY_4].find((value) => value && value.trim());
  if (!apiKey) {
    throw new Error('No Hugging Face API key configured.');
  }

  const payload = {
    inputs: prompt,
    parameters: { width, height },
  };

  let lastError = null;
  for (let attempt = 0; attempt < HF_MAX_RETRIES; attempt++) {
    const response = await fetch(`${HF_API_BASE}/${modelId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    const text = await response.text().catch(() => '');
    lastError = new Error(text || response.statusText || 'Hugging Face generation failed');
    if (response.status !== 503) {
      break;
    }

    if (attempt < HF_MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, HF_RETRY_DELAY_MS));
    }
  }

  throw lastError || new Error('Hugging Face generation failed.');
}

export async function generateImageBytes(prompt, model = 'provider-4/imagen-4', size = '1024x1024') {
  const [width, height] = String(size || '1024x1024').split('x').map((value) => Number(value));
  const dimensions = Number.isFinite(width) && Number.isFinite(height) ? { width, height } : { width: 1024, height: 1024 };

  const a4fKeys = getA4FApiKeys();
  if (a4fKeys.length > 0) {
    const result = await tryImageGeneration(a4fKeys, {
      model,
      prompt,
      n: 1,
      size,
    });

    if (result.success) {
      const imageBuffer = await extractImageBufferFromA4FResponse(result.response);
      if (imageBuffer) {
        return imageBuffer;
      }

      console.warn('[image-generation] A4F returned an image result that could not be decoded or downloaded. Falling back to Hugging Face.');
    }
  }

  // Fallback to the repo's Hugging Face-based generator so Canva can still receive
  // a real asset even if A4F is unavailable.
  return await generateWithHuggingFace(prompt, 'black-forest-labs/FLUX.1-schnell', dimensions.width, dimensions.height);
}

export async function generateImageAsset({ prompt, projectId = null, userEmail = null, libId = null, model = 'provider-4/imagen-4', size = '1024x1024' }) {
  if (!prompt) {
    throw new Error('prompt is required');
  }

  const imageBuffer = await generateImageBytes(prompt, model, size);
  const processedImageBuffer = await sharp(imageBuffer).png({ quality: 90, compressionLevel: 9 }).toBuffer();

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const fileName = `generated_${timestamp}_${randomStr}.png`;

  const inputFile = createAppwriteFile(processedImageBuffer, fileName, 'image/png');
  const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), inputFile);
  const publicUrl = getPublicFileUrl(uploaded.$id);

  if (projectId) {
    try {
      await databases.createDocument(DB_ID, IMAGE_GENERATION_COLLECTION_ID, ID.unique(), {
        project_id: projectId,
        image_url: publicUrl,
        file_id: uploaded.$id,
        type: 'generated',
        prompt,
        model,
        size,
        userEmail,
        libId,
      });
    } catch {
      // Do not fail if persistence is unavailable.
    }
  }

  return {
    success: true,
    url: publicUrl,
    fileId: uploaded.$id,
    fileName,
    prompt,
  };
}
/**
 * ChatBoxAI SDK for Image Generation and Editing
 * 
 * This SDK provides a simple interface to generate and edit images using the ChatBoxAI v1.0 model.
 * 
 * @module chatboxai-sdk
 * @version 1.0.0
 */

const CHATBOXAI_ENDPOINT = process.env.CHATBOXAI_ENDPOINT || "https://mkoqvjgqhwejcpternmm.supabase.co/functions/v1/generate-image";

/**
 * ChatBoxAI Class for image generation and editing
 */
class ChatBoxAI {
  /**
   * Initialize ChatBoxAI with API key
   * @param {string} apiKey - Your ChatBoxAI API key (format: cbai_xxxxxxxxxxxxxxxxx)
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ChatBoxAI API key is required. Please provide CHATBOXAI_API_KEY in your .env file.');
    }
    this.apiKey = apiKey;
    this.endpoint = CHATBOXAI_ENDPOINT;
    this.model = "chatboxai v1.0";
  }

  /**
   * Generate an image from a text prompt
   * @param {string} prompt - The text prompt describing the image to generate
   * @param {string} [aspectRatio="1:1"] - The aspect ratio (1:1, 16:9, 9:16, 4:5, 3:2, 21:9)
   * @returns {Promise<Object>} The response object containing imageUrl and metadata
   * @throws {Error} If the request fails
   */
  async generateImage(prompt, aspectRatio = "1:1") {
    if (!prompt || prompt.trim() === "") {
      throw new Error("Prompt cannot be empty");
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: JSON.stringify({ prompt, aspectRatio })
      });

      if (!response.ok) {
        let error;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            error = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (e) {
          error = { error: "Unknown error" };
        }
        throw new Error(error.error || `ChatBoxAI API error: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        throw new Error(`Invalid response type. Expected JSON, got ${contentType || 'unknown'}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Edit an existing image with a new prompt
   * @param {string} imageBase64 - The image as base64 data URI (e.g., "data:image/png;base64,...")
   * @param {string} prompt - The text prompt describing the edits
   * @param {string} [aspectRatio="1:1"] - The aspect ratio for the edited image
   * @returns {Promise<Object>} The response object containing the edited imageUrl and metadata
   * @throws {Error} If the request fails
   */
  async editImage(imageBase64, prompt, aspectRatio = "1:1") {
    if (!imageBase64 || !imageBase64.includes("base64,")) {
      throw new Error("Image must be in base64 data URI format (e.g., 'data:image/png;base64,...')");
    }

    if (!prompt || prompt.trim() === "") {
      throw new Error("Prompt cannot be empty");
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: JSON.stringify({ prompt, aspectRatio, image: imageBase64 })
      });

      if (!response.ok) {
        let error;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            error = await response.json();
          } else {
            error = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (e) {
          error = { error: "Unknown error" };
        }
        throw new Error(error.error || `ChatBoxAI API error: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        throw new Error(`Invalid response type. Expected JSON, got ${contentType || 'unknown'}`);
      }
    } catch (error) {
      throw new Error(`Failed to edit image: ${error.message}`);
    }
  }

  /**
   * Convert a file to base64 data URI (browser environment)
   * @param {File} file - The file object from input
   * @returns {Promise<string>} The base64 data URI
   * @throws {Error} If the conversion fails
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }

  /**
   * Get supported aspect ratios and their resolutions
   * @returns {Object} Object containing aspect ratios as keys and resolutions as values
   */
  static getSupportedAspectRatios() {
    return {
      "1:1": "1024×1024",
      "16:9": "1920×1080",
      "9:16": "1080×1920",
      "4:5": "1080×1350",
      "3:2": "1536×1024",
      "21:9": "2520×1080"
    };
  }

  /**
   * Validate if an aspect ratio is supported
   * @param {string} aspectRatio - The aspect ratio to validate
   * @returns {boolean} True if supported, false otherwise
   */
  static isValidAspectRatio(aspectRatio) {
    const supported = Object.keys(this.getSupportedAspectRatios());
    return supported.includes(aspectRatio);
  }
}

export default ChatBoxAI;

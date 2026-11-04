# Documentation Update Phase 2: Core Concepts

## Summary of Changes
This document outlines the major updates made to the "Core Concepts" section of the ChatboxAI documentation. The goal was to ensure high technical accuracy, provide production-ready code examples, and explicitly clarify the distinction and usage between Free tier and Paid tier models across all capabilities.

### Updated Pages

1. **`text-generation.md`**
   - Restructured to explain core mechanics: prompt structure, context history, and temperature control.
   - Added explicit Free vs Paid model mapping (`llama-3.3-70b` for Free, `claude-4.5-sonnet` for Paid).
   - Added a clear warning regarding the 300 requests/day limit on Free models.

2. **`code-generation.md`**
   - Detailed practical coding workflows: writing code, reviewing/debugging, and generating unit tests.
   - Clarified the ideal models for coding tasks: `qwen3-32b` (Free) for snippets and `qwen3-coder` (Paid) for heavy-duty software engineering.
   - Emphasized the use of low temperatures (0.1 - 0.2) to prevent syntax hallucinations.

3. **`images-vision.md`**
   - Segregated the documentation into Image Generation (`POST /api/v1/images/generations`) and Vision (image analysis via chat models).
   - Defined exact pricing for image models (e.g., FLUX Schnell is Free, FLUX Dev is $0.01).
   - Provided robust Node.js examples demonstrating how to pass images via Base64 buffers vs Public URLs.

4. **`audio-speech.md`**
   - Detailed the `POST /api/v1/audio/speech` TTS endpoint.
   - Explicitly mapped the `tts-1` (Free) and `tts-1-hd` (Paid) models.
   - Added examples of saving the binary audio Buffer directly to disk using the `fs` module in Node.js.

5. **`structured-output.md`**
   - Explained the `response_format: { type: "json_object" }` flag.
   - Added advanced documentation on enforcing exact schemas using `json_schema`.
   - Reminded developers to wrap JSON parsing in `try/catch` and utilize schema validation libraries like `zod`.

6. **`function-calling.md`**
   - Simplified the explanation of the function calling loop (Define -> Model Requests -> Local Execution -> Return Result -> Final Answer).
   - Provided a complete, end-to-end weather API example in Node.js.
   - Advised using highly capable models (like `llama-3.3-70b` or `claude-4.5-sonnet`) for accurate tool execution.

7. **`responses-api.md`**
   - Detailed the custom Responses API structure (`input`, `instructions`, `output_text`).
   - Highlighted the differences and benefits compared to the standard `chat/completions` endpoint.
   - Maintained consistency with `chatboxai.co.in` domains and updated the code snippets to reflect accurate models.

8. **`tools-usage.md`**
   - Differentiated Built-in Tools (Web Search, Code Interpreter) from Custom Function Calling.
   - Explained that built-in tools run securely on ChatboxAI infrastructure.
   - Showed how to mix built-in tools and custom functions in a single request.

## Result
The Core Concepts documentation is now fully aligned with the production standards set in Phase 1. Developers have clear, actionable, and secure guidelines for leveraging the full multi-modal power of the ChatboxAI platform while understanding exactly how the billing and Free tier limits apply to their usage.

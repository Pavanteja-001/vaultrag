const { GoogleGenerativeAI } = require('@google/generative-ai');

// Model chain: 2.5-flash primary, 2.0-flash fallback. Both support vision on v1beta.
// 1.5-flash is NOT supported on v1beta (this SDK version) so excluded.
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const TIMEOUT_MS = 50000;

class VisionProcessingError extends Error {
  constructor(message) {
    super(message || 'Vision processing failed');
    this.name = 'VisionProcessingError';
  }
}

let genAI;
const getGenAI = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Analyzes a UI mockup image and returns a structured text description.
 * imageBuffer: Buffer, mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
 * Throws VisionProcessingError on timeout or failure — caller marks mockup as "pending".
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseMockup = async (imageBuffer, mimeType = 'image/png') => {
  const ai = getGenAI();

  const imageData = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  };

  const prompt = `Analyze this UI mockup image and provide a detailed, structured description for developers.

Include:
1. Layout structure (header, sidebar, main content area, footer)
2. UI components present (buttons, forms, tables, modals, cards, navigation)
3. Data fields and their types (text inputs, dropdowns, checkboxes)
4. Labels, headings, and placeholder text visible
5. Color scheme and visual hierarchy
6. Interactive elements (buttons, links, toggles)
7. Implied API endpoints or data requirements

Format as a structured description that a developer can use to implement this UI.`;

  let lastErr;
  for (const modelName of VISION_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new VisionProcessingError('Vision API timeout')), TIMEOUT_MS)
        );
        const result = await Promise.race([
          model.generateContent([prompt, imageData]),
          timeoutPromise,
        ]);
        const text = result.response.text();
        if (!text || text.trim().length < 10) throw new VisionProcessingError('Empty or invalid vision response');
        console.log(`[Vision] success with ${modelName} attempt ${attempt}`);
        return text;
      } catch (err) {
        lastErr = err;
        const isRetryable = err.message?.includes('503') || err.message?.includes('overloaded') ||
          err.message?.includes('high demand') || err.message?.includes('429') ||
          err.message?.includes('quota') || (err instanceof VisionProcessingError && err.message === 'Vision API timeout');
        console.warn(`[Vision] ${modelName} attempt ${attempt} failed: ${err.message?.slice(0, 120)}`);
        if (isRetryable && attempt === 1) {
          await sleep(5000); // wait 5s before retry / next model
          continue;
        }
        break; // non-retryable or second attempt — try next model
      }
    }
  }

  throw new VisionProcessingError(lastErr?.message || 'All vision models failed');
};

module.exports = { parseMockup, VisionProcessingError };

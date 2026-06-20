const { GoogleGenerativeAI } = require('@google/generative-ai');

// Flash tier only — Pro is paid-only as of April 2026
const VISION_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 30000;

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
const parseMockup = async (imageBuffer, mimeType = 'image/png') => {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: VISION_MODEL });

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

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new VisionProcessingError('Vision API timeout')), TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([
      model.generateContent([prompt, imageData]),
      timeoutPromise,
    ]);
    const text = result.response.text();
    if (!text || text.trim().length < 10) {
      throw new VisionProcessingError('Empty or invalid vision response');
    }
    return text;
  } catch (err) {
    if (err instanceof VisionProcessingError) throw err;
    throw new VisionProcessingError(err.message);
  }
};

module.exports = { parseMockup, VisionProcessingError };

const { GoogleGenerativeAI } = require('@google/generative-ai');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

let genAI;
const getGenAI = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Embeds text using Gemini gemini-embedding-001.
 * Explicitly requests 768 output dimensions to match the Atlas vector index.
 * Returns an array of 768 numbers.
 */
const embedText = async (text) => {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });

  const values = result.embedding.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${values?.length}`);
  }

  return values;
};

module.exports = { embedText };

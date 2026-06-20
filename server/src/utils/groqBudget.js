const Config = require('../models/Config');

const DAILY_LIMIT = parseInt(process.env.GROQ_DAILY_LIMIT || '1000', 10);
const BUDGET_DOC_ID = 'daily_budget';

class BudgetExceededError extends Error {
  constructor() {
    super('Daily AI query limit reached, resets at midnight UTC.');
    this.name = 'BudgetExceededError';
    this.statusCode = 429;
  }
}

const getNextMidnightUTC = () => {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight;
};

const resetIfNewDay = async (doc) => {
  const now = new Date();
  if (now >= doc.resetAt) {
    doc.count = 0;
    doc.resetAt = getNextMidnightUTC();
    await doc.save();
  }
  return doc;
};

const checkBudget = async () => {
  let doc = await Config.findById(BUDGET_DOC_ID);
  if (!doc) {
    doc = await Config.create({ _id: BUDGET_DOC_ID, count: 0, resetAt: getNextMidnightUTC() });
  }
  doc = await resetIfNewDay(doc);
  if (doc.count >= DAILY_LIMIT) {
    throw new BudgetExceededError();
  }
};

const incrementBudget = async () => {
  await Config.findByIdAndUpdate(
    BUDGET_DOC_ID,
    { $inc: { count: 1 } },
    { upsert: true }
  );
};

module.exports = { checkBudget, incrementBudget, BudgetExceededError };

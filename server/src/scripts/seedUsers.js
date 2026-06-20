require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SEED_USERS = [
  { email: 'l1@vaultrag.dev', password: 'password123', role: 1 },
  { email: 'l2@vaultrag.dev', password: 'password123', role: 2 },
  { email: 'l3@vaultrag.dev', password: 'password123', role: 3 },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await User.findOneAndUpdate(
      { email: u.email },
      { email: u.email, passwordHash, role: u.role, isActive: true },
      { upsert: true, new: true }
    );
    console.log(`✅ Seeded: ${u.email} (L${u.role})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * seed.js — One-time script to import existing JSON vendor & user data into MongoDB.
 * Run ONCE after setting up MongoDB:  node db/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const crypto   = require('crypto');
const path     = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cognidispatch';

// ── Schemas (inline for seeder independence) ─────────────────────────────────
const UserSchema = new mongoose.Schema({
  id: String, name: String, email: String, phone: String,
  address: String, lat: Number, lng: Number, balance: Number, passwordHash: String
});

const VendorSchema = new mongoose.Schema({
  id: String, name: String, technician: String, phone: String, email: String,
  category: String, address: String,
  location: { type: { type: String }, coordinates: [Number] },
  lat: Number, lng: Number, available: Boolean, busy: Boolean,
  balance: Number, completed_jobs: Number, rating: Number,
  rating_count: Number, passwordHash: String
});
VendorSchema.index({ location: '2dsphere' });

const DispatchSchema = new mongoose.Schema({
  id: String, socketId: String, userId: String, userName: String,
  vendorId: String, vendorName: String, technicianName: String,
  category: String, urgency: String, amount: Number, status: String,
  otp: String, rating: Number, targetLat: Number, targetLng: Number,
  vendorLat: Number, vendorLng: Number, summary: String,
  mitigationSteps: [String], timestamp: Date
});

const User     = mongoose.model('User',     UserSchema);
const Vendor   = mongoose.model('Vendor',   VendorSchema);
const Dispatch = mongoose.model('Dispatch', DispatchSchema);

// ── Load existing JSON data ───────────────────────────────────────────────────
const usersData    = require('./users.json');
const vendorsData  = require('./vendors.json');
const dispatchData = require('./dispatches.json');

async function seed() {
  console.log('🌱 CogniDispatch MongoDB Seeder starting...');
  console.log('📡 Connecting to:', MONGODB_URI.split('@').pop());

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB');

  // ── Seed Users ─────────────────────────────────────
  console.log(`\n👤 Seeding ${usersData.length} users...`);
  for (const user of usersData) {
    const exists = await User.findOne({ id: user.id });
    if (exists) {
      console.log(`  ⏭  User ${user.id} (${user.email}) already exists — skipping`);
      continue;
    }
    await User.create(user);
    console.log(`  ✅ Inserted user: ${user.name} (${user.email})`);
  }

  // ── Seed Vendors ────────────────────────────────────
  console.log(`\n🔧 Seeding ${vendorsData.length} vendors...`);
  for (const vendor of vendorsData) {
    const exists = await Vendor.findOne({ id: vendor.id });
    if (exists) {
      console.log(`  ⏭  Vendor ${vendor.id} (${vendor.name}) already exists — skipping`);
      continue;
    }
    // Build GeoJSON location from lat/lng
    const lat = Number(vendor.lat) || 8.53633;
    const lng = Number(vendor.lng) || 76.88329;
    await Vendor.create({
      ...vendor,
      lat,
      lng,
      location: { type: 'Point', coordinates: [lng, lat] }
    });
    console.log(`  ✅ Inserted vendor: ${vendor.name} (${vendor.category})`);
  }

  // ── Seed Dispatches (historical) ────────────────────
  console.log(`\n🚨 Seeding ${dispatchData.length} dispatches...`);
  for (const dispatch of dispatchData) {
    const exists = await Dispatch.findOne({ id: dispatch.id });
    if (exists) {
      console.log(`  ⏭  Dispatch ${dispatch.id} already exists — skipping`);
      continue;
    }
    await Dispatch.create(dispatch);
    console.log(`  ✅ Inserted dispatch: ${dispatch.id} (${dispatch.status})`);
  }

  console.log('\n🎉 Seeding complete! MongoDB is ready for CogniDispatch.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});

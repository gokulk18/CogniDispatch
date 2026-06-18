const express = require('express');
const dbAdapter = require('../../shared').dbAdapter;
const router = express.Router();

// Helper to convert degrees to radians
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

// Haversine formula to compute distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lng2 - lng1);
  const a = Math.pow(Math.sin(deltaPhi / 2), 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.pow(Math.sin(deltaLambda / 2), 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/vendors/match
router.post('/match', async (req, res) => {
  const { lat, lng, category, userId, userName } = req.body;

  if (lat === undefined || lng === undefined || !category) {
    return res.status(400).json({ error: "lat, lng, and category fields are required." });
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return res.status(400).json({ error: "lat and lng must be valid numbers." });
  }

  try {
    const vendors = await dbAdapter.Vendors.find();

    // Filter: available, not busy, matching category
    const availableCategoryVendors = vendors.filter(vendor =>
      vendor.available === true &&
      vendor.busy === false &&
      vendor.category.toUpperCase() === category.toUpperCase()
    );

    if (availableCategoryVendors.length === 0) {
      return res.status(404).json({ error: `No active contractors are available for specialty category ${category}.` });
    }

    const io = req.io;

    // Map distances and online status
    const vendorsWithMetrics = availableCategoryVendors.map(vendor => {
      const distanceMeters = haversineDistance(numLat, numLng, vendor.lat, vendor.lng);
      const roomName = `room_v_${vendor.id}`;
      const activeSockets = io ? io.sockets.adapter.rooms.get(roomName) : null;
      const isOnline = activeSockets && activeSockets.size > 0;
      return { ...vendor, distanceMeters: parseFloat(distanceMeters.toFixed(2)), isOnline: !!isOnline };
    });

    // Filter strictly within a 10km (10,000 meters) radius
    const localVendors = vendorsWithMetrics.filter(vendor => vendor.distanceMeters <= 10000);

    if (localVendors.length === 0) {
      return res.status(404).json({ error: `No active contractors are available within a 10km radius of your location for category ${category}.` });
    }

    // Sort strictly by distance to find the absolute nearest vendor
    localVendors.sort((a, b) => a.distanceMeters - b.distanceMeters);

    let closestVendor = localVendors[0];

    // Mark vendor busy immediately
    await dbAdapter.Vendors.update(closestVendor.id, { busy: true });

    return res.json({ vendor: closestVendor, matched: true });

  } catch (err) {
    return res.status(500).json({ error: "Failed to query database or process matching", detail: err.message });
  }
});

// GET /api/vendors/active-job/:id
router.get('/active-job/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const active = await dbAdapter.Dispatches.findActiveByVendorId(id);
    if (!active) return res.json({ hasJob: false });
    return res.json({ hasJob: true, dispatch: active });
  } catch (err) {
    return res.status(500).json({ error: "Failed to check active jobs", detail: err.message });
  }
});

// PUT /api/vendors/complete-job
router.put('/complete-job', async (req, res) => {
  const { dispatchId, rating } = req.body;

  if (!dispatchId) {
    return res.status(400).json({ error: "dispatchId is required." });
  }

  try {
    const dispatch = await dbAdapter.Dispatches.findById(dispatchId);
    if (!dispatch) {
      return res.status(404).json({ error: "Dispatch record not found." });
    }

    const techId = dispatch.vendorId;
    const vendor = await dbAdapter.Vendors.findById(techId);
    if (!vendor) {
      return res.status(404).json({ error: "Associated responder unit not found." });
    }

    const numericRating    = rating ? Number(rating) : 5;
    const totalAmount      = dispatch.amount || 0;
    const vendorPayout     = Math.round(totalAmount * 0.8);
    const newCompletedCount = (vendor.completed_jobs || 0) + 1;
    const newRatingCount    = (vendor.rating_count || 1) + 1;
    const newAvgRating      = parseFloat((((vendor.rating || 4.5) * (newRatingCount - 1) + numericRating) / newRatingCount).toFixed(2));
    const newBalance        = (vendor.balance || 0) + vendorPayout;

    await dbAdapter.Vendors.update(techId, {
      busy: false,
      completed_jobs: newCompletedCount,
      rating_count: newRatingCount,
      rating: newAvgRating,
      balance: newBalance
    });

    const updatedDispatch = await dbAdapter.Dispatches.update(dispatchId, {
      status: 'COMPLETED',
      rating: numericRating
    });

    return res.json({
      success: true,
      message: "Razorpay transaction authorized securely! Job completed successfully.",
      payoutAmount: vendorPayout,
      dispatch: updatedDispatch
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed to complete service call billing loop", detail: err.message });
  }
});

// GET /api/vendors/profile/:id
router.get('/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const vendor = await dbAdapter.Vendors.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: "Technician profile not found." });
    }
    const cleanProfile = { ...vendor };
    delete cleanProfile.passwordHash;
    return res.json({ success: true, profile: cleanProfile });
  } catch (err) {
    return res.status(500).json({ error: "Failed to read technician profile", detail: err.message });
  }
});

module.exports = router;

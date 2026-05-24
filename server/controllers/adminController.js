const express = require('express');
const dbAdapter = require('../db/dbAdapter');
const router = express.Router();

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    const [vendors, dispatches] = await Promise.all([
      dbAdapter.Vendors.find(),
      dbAdapter.Dispatches.find()
    ]);

    const activeDispatches      = dispatches.filter(d => d.status !== 'COMPLETED' && d.status !== 'CANCELLED').length;
    const completedDispatches   = dispatches.filter(d => d.status === 'COMPLETED');
    const platformCommissions   = completedDispatches.reduce((acc, d) => acc + ((d.amount || 0) * 0.2), 0);
    const totalAvailableVendors = vendors.filter(v => v.available && !v.busy).length;

    const categoryDistribution = { PLUMBING: 0, ELECTRICAL: 0, HVAC: 0, STRUCTURAL: 0 };
    dispatches.forEach(d => {
      const cat = (d.category || '').toUpperCase();
      if (categoryDistribution[cat] !== undefined) categoryDistribution[cat]++;
    });

    res.json({
      success: true,
      metrics: {
        activeDispatches,
        completedDispatchesCount: completedDispatches.length,
        platformCommissions: Math.round(platformCommissions),
        totalAvailableVendors,
        totalVendorsCount: vendors.length,
        categoryDistribution
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to gather admin metrics", detail: err.message });
  }
});

// GET /api/admin/vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await dbAdapter.Vendors.find();
    const cleanVendors = vendors.map(v => { const c = { ...v }; delete c.passwordHash; return c; });
    res.json({ success: true, vendors: cleanVendors });
  } catch (err) {
    res.status(500).json({ error: "Failed to query vendor listings", detail: err.message });
  }
});

// POST /api/admin/vendors
router.post('/vendors', async (req, res) => {
  const { name, phone, email, category, technician, lat, lng, address, password } = req.body;

  if (!name || !phone || !category || !technician || !password) {
    return res.status(400).json({ error: "Missing required registration parameters (name, phone, category, technician, password)" });
  }

  try {
    const duplicated = await dbAdapter.Vendors.findByPhone(phone);
    if (duplicated) {
      return res.status(400).json({ error: "Responder phone number is already registered." });
    }

    const newVendor = await dbAdapter.Vendors.create({
      name, technician, phone,
      email: email || '',
      category: category.toUpperCase(),
      lat: lat !== undefined ? Number(lat) : 8.52412,
      lng: lng !== undefined ? Number(lng) : 76.87245,
      address: address || 'Trivandrum, India',
      password
    });

    delete newVendor.passwordHash;

    res.json({
      success: true,
      message: "New responder unit successfully deployed into the CogniDispatch system!",
      vendor: newVendor
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to inject vendor responder", detail: err.message });
  }
});

// PUT /api/admin/vendors/:id
router.put('/vendors/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updated = await dbAdapter.Vendors.update(id, updates);
    if (!updated) return res.status(404).json({ error: "Technician unit not found." });
    delete updated.passwordHash;
    res.json({ success: true, vendor: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to modify vendor credentials", detail: err.message });
  }
});

// GET /api/admin/dispatches
router.get('/dispatches', async (req, res) => {
  try {
    const dispatches = await dbAdapter.Dispatches.find();
    res.json({ success: true, dispatches });
  } catch (err) {
    res.status(500).json({ error: "Failed to list active routes", detail: err.message });
  }
});

module.exports = router;

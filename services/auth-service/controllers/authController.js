const express = require('express');
const dbAdapter = require('cognidispatch-shared').dbAdapter;
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { role, email, password, name, phone, address, lat, lng, category } = req.body;

  if (!role || !email || !password || !name) {
    return res.status(400).json({ error: "Missing required signup fields (role, email, password, name)" });
  }

  try {
    if (role.toUpperCase() === 'HOMEOWNER') {
      const existingUser = await dbAdapter.Users.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered as a Homeowner." });
      }

      const newUser = await dbAdapter.Users.create({
        email,
        password,
        name,
        phone: phone || '',
        address: address || 'Trivandrum, India',
        lat: lat !== undefined ? Number(lat) : 8.53633,
        lng: lng !== undefined ? Number(lng) : 76.88329
      });

      return res.json({
        success: true,
        message: "Homeowner signed up successfully!",
        session: {
          id: newUser.id,
          role: 'HOMEOWNER',
          name: newUser.name,
          email: newUser.email,
          coords: { lat: newUser.lat, lng: newUser.lng }
        }
      });

    } else if (role.toUpperCase() === 'TECHNICIAN') {
      const existingTech = await dbAdapter.Vendors.findByPhone(phone);
      if (existingTech) {
        return res.status(400).json({ error: "Phone number is already registered to a technician." });
      }

      if (!category) {
        return res.status(400).json({ error: "Technician must specify a specialty category." });
      }

      const newTech = await dbAdapter.Vendors.create({
        name: name + ' Emergency Support',
        technician: name,
        phone,
        email,
        password,
        category: category.toUpperCase(),
        address: address || 'Pattom, Trivandrum, Kerala',
        lat: lat !== undefined ? Number(lat) : 8.52412,
        lng: lng !== undefined ? Number(lng) : 76.87245
      });

      return res.json({
        success: true,
        message: "Technician registered successfully!",
        session: {
          id: newTech.id,
          role: 'TECHNICIAN',
          name: newTech.technician,
          agencyName: newTech.name,
          category: newTech.category,
          coords: { lat: newTech.lat, lng: newTech.lng }
        }
      });

    } else {
      return res.status(400).json({ error: "Invalid registration role specified." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Registration process failed", detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { role, email, password, phone } = req.body;

  if (!role || !password) {
    return res.status(400).json({ error: "Role and password are required." });
  }

  try {
    const inputHash = dbAdapter.hashPassword(password);

    if (role.toUpperCase() === 'HOMEOWNER') {
      if (!email) return res.status(400).json({ error: "Email is required for Homeowner login." });
      const user = await dbAdapter.Users.findByEmail(email);
      if (!user || user.passwordHash !== inputHash) {
        return res.status(401).json({ error: "Invalid homeowner email or password." });
      }
      return res.json({
        success: true,
        session: {
          id: user.id,
          role: 'HOMEOWNER',
          name: user.name,
          email: user.email,
          coords: { lat: user.lat, lng: user.lng }
        }
      });

    } else if (role.toUpperCase() === 'TECHNICIAN') {
      if (!phone) return res.status(400).json({ error: "Phone number is required for technician login." });
      const tech = await dbAdapter.Vendors.findByPhone(phone);
      if (!tech || tech.passwordHash !== inputHash) {
        return res.status(401).json({ error: "Invalid technician phone number or password." });
      }
      return res.json({
        success: true,
        session: {
          id: tech.id,
          role: 'TECHNICIAN',
          name: tech.technician,
          agencyName: tech.name,
          category: tech.category,
          coords: { lat: tech.lat, lng: tech.lng }
        }
      });

    } else if (role.toUpperCase() === 'ADMIN') {
      if (!email) return res.status(400).json({ error: "Admin email is required." });
      const defaultAdminEmail    = 'admin@cognidispatch.com';
      const defaultAdminEmailAlt = 'admin@cogidispatch.com';
      const defaultAdminHash     = dbAdapter.hashPassword('admin123');
      const loginEmail           = email.toLowerCase();

      if ((loginEmail !== defaultAdminEmail && loginEmail !== defaultAdminEmailAlt) || inputHash !== defaultAdminHash) {
        return res.status(401).json({ error: "Invalid administrative credentials." });
      }
      return res.json({
        success: true,
        session: {
          id: 'admin_root',
          role: 'ADMIN',
          name: 'Chief Dispatch Commander',
          email: defaultAdminEmail
        }
      });

    } else {
      return res.status(400).json({ error: "Invalid login portal role." });
    }
  } catch (err) {
    return res.status(500).json({ error: "Login auth process encountered a system failure", detail: err.message });
  }
});

module.exports = router;

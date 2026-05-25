const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const adminController = require('./controllers/adminController');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());

app.get('/api/admin/health', (req, res) => res.json({ status: "online", service: "admin-service" }));
app.use('/api/admin', adminController);

const PORT = process.env.PORT || 5004;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Service listening on port ${PORT}`);
});

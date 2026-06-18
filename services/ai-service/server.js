const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const aiController = require('./controllers/aiController');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/ai/health', (req, res) => res.json({ status: "online", service: "ai-service" }));
// Mount at /api/ai for cleaner path-based routing in App Gateway
app.use('/api/ai', aiController);

const PORT = process.env.PORT || 5003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Service listening on port ${PORT}`);
});

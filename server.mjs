import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/storage', (_req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json(null);
  try {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
  } catch {
    res.json(null);
  }
});

app.post('/api/storage', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`API server on :${PORT}`));

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import solveRoutes from './routes/solve.js';
import reoptimizeRoutes from './routes/reoptimize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', solveRoutes);
app.use('/api', reoptimizeRoutes);

// Serve frontend build in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

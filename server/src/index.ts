import express from 'express';
import cors from 'cors';
import solveRoutes from './routes/solve.js';
import reoptimizeRoutes from './routes/reoptimize.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', solveRoutes);
app.use('/api', reoptimizeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

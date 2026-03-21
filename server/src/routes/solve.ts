import { Router, type Request, type Response } from 'express';
import { generateExplanation } from '../services/openai.js';

const router = Router();
const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';

/** GET /api/courses — list all available courses */
router.get('/courses', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${SOLVER_URL}/courses`);
    const data = await resp.json();
    res.json(data);
  } catch {
    res.status(502).json({ error: 'Solver service unavailable' });
  }
});

/** POST /api/solve — find ranked schedules for selected courses */
router.post('/solve', async (req: Request, res: Response) => {
  const { course_ids, preferences } = req.body;

  if (!Array.isArray(course_ids) || course_ids.length === 0) {
    res.status(400).json({ error: 'course_ids must be a non-empty array' });
    return;
  }

  try {
    const resp = await fetch(`${SOLVER_URL}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_ids, preferences }),
    });
    const data = await resp.json();

    // Generate explanation for the best schedule
    let explanation: string | null = null;
    if (data.schedules?.length > 0) {
      try {
        explanation = await generateExplanation(
          data.schedules[0].sections,
          null,
          preferences || {},
          null,
        );
      } catch {
        // Non-critical — return schedules without explanation
      }
    }

    res.json({ ...data, explanation });
  } catch {
    res.status(502).json({ error: 'Solver service unavailable' });
  }
});

export default router;

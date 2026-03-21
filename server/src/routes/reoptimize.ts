import { Router, type Request, type Response } from 'express';
import {
  parsePreferences,
  generateExplanation,
  type ParsedPreferences,
} from '../services/openai.js';

const router = Router();
const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';

/**
 * POST /api/reoptimize
 *
 * Flow:
 * 1. Parse NL prompt into structured preferences via OpenAI
 * 2. Merge with existing preferences
 * 3. Call solver with updated preferences
 * 4. Generate explanation comparing old vs new schedule
 */
router.post('/reoptimize', async (req: Request, res: Response) => {
  const { prompt, course_ids, required_ids, wanted_ids, blocked_slots, current_preferences, current_schedule } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }
  if (!Array.isArray(course_ids) || course_ids.length === 0) {
    res.status(400).json({ error: 'course_ids must be a non-empty array' });
    return;
  }

  try {
    // Step 1: Parse NL prompt into structured preferences
    const existingPrefs: ParsedPreferences = current_preferences || {};
    const updatedPrefs = await parsePreferences(prompt, existingPrefs);

    // Step 2: Call solver with updated preferences
    const solverResp = await fetch(`${SOLVER_URL}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_ids, required_ids, wanted_ids, blocked_slots, preferences: updatedPrefs }),
    });
    const solverData = await solverResp.json();

    if (!solverData.schedules || solverData.schedules.length === 0) {
      res.json({
        schedules: [],
        preferences: updatedPrefs,
        explanation:
          'No valid schedules found with these constraints. Try relaxing some preferences.',
      });
      return;
    }

    // Step 3: Generate explanation
    const bestSchedule = solverData.schedules[0].sections;
    const explanation = await generateExplanation(
      bestSchedule,
      current_schedule || null,
      updatedPrefs,
      prompt,
    );

    res.json({
      schedules: solverData.schedules,
      preferences: updatedPrefs,
      explanation,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Reoptimize error:', message);

    // If OpenAI fails, still try to solve with existing preferences
    if (message.includes('OpenAI') || message.includes('API')) {
      try {
        const solverResp = await fetch(`${SOLVER_URL}/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_ids,
            preferences: current_preferences || {},
            required_ids, wanted_ids, blocked_slots,
          }),
        });
        const solverData = await solverResp.json();
        res.json({
          schedules: solverData.schedules,
          preferences: current_preferences || {},
          explanation:
            'Could not parse your request. Showing schedules with current preferences.',
        });
        return;
      } catch {
        // Both failed
      }
    }

    res.status(500).json({ error: 'Failed to reoptimize: ' + message });
  }
});

export default router;

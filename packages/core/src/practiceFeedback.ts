/**
 * Deterministic, learner-facing feedback for a practice session.
 * No network calls and no AI involvement: the same stats always produce the
 * same diagnosis.
 */

export interface PracticeSessionStats {
  total: number;
  correct: number;
  wrongVariety: number;
  varjya: number;
  vadiHits: number;
  noteCounts: Record<string, number>;
}

export interface RagaGrammarContext {
  name?: string | null;
  vadi?: string | null;
  samvadi?: string | null;
  varjyaSwaras?: string[] | null;
}

export interface PracticeFeedbackItem {
  code: string;
  severity: 'high' | 'medium' | 'low' | 'positive';
  message: string;
  hint: string;
}

export interface PracticeDiagnosis {
  score: number;
  headline: string;
  summary: string;
  items: PracticeFeedbackItem[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function diagnosePracticeSession(
  stats: PracticeSessionStats,
  grammar?: RagaGrammarContext
): PracticeDiagnosis {
  const total = Number.isFinite(stats.total) ? stats.total : 0;
  const correct = Number.isFinite(stats.correct) ? stats.correct : 0;
  const ragaName = grammar?.name?.trim() || 'this raga';
  const vadi = grammar?.vadi?.trim();
  const varjyaSwaras = grammar?.varjyaSwaras?.filter(Boolean) ?? [];

  const score = total > 0 ? clamp(Math.round((correct / total) * 100), 0, 100) : 0;

  if (total <= 0) {
    return {
      score: 0,
      headline: 'No notes detected',
      summary: 'We could not hear any notes. Move closer to the mic and try again.',
      items: [
        {
          code: 'no-notes',
          severity: 'high',
          message: 'No notes were detected in this session.',
          hint: 'Move closer to the mic, sing or play a few clear notes, then retry.',
        },
      ],
    };
  }

  const items: PracticeFeedbackItem[] = [];

  if (stats.varjya > 0) {
    const avoid = varjyaSwaras.length > 0 ? ` such as ${varjyaSwaras.join(', ')}` : '';
    items.push({
      code: 'varjya',
      severity: 'high',
      message: `You played ${stats.varjya} varjya (avoided) note${stats.varjya === 1 ? '' : 's'}.`,
      hint: `Avoid varjya swaras${avoid} in ${ragaName}; stay within the raga's allowed notes.`,
    });
  }

  if (stats.wrongVariety > 0) {
    items.push({
      code: 'wrong-variety',
      severity: 'high',
      message: `${stats.wrongVariety} note${stats.wrongVariety === 1 ? '' : 's'} had the wrong swara variety.`,
      hint: `Check ${ragaName}'s scale and use the correct komal or shuddha swaras.`,
    });
  }

  if (stats.vadiHits === 0 && total >= 5) {
    const focus = vadi ? ` The vadi is ${vadi}.` : '';
    items.push({
      code: 'vadi-missing',
      severity: 'medium',
      message: vadi ? `You did not land on the vadi (${vadi}).` : 'You did not emphasize the vadi.',
      hint: `Try to return to the vadi more often so ${ragaName} sounds clearly established.${focus}`,
    });
  }

  const distinctSwaraCount = Object.entries(stats.noteCounts ?? {}).filter(
    ([, count]) => count > 0
  ).length;
  if (total >= 8 && distinctSwaraCount < 4) {
    items.push({
      code: 'coverage',
      severity: 'low',
      message: `You played only ${distinctSwaraCount} distinct swara${distinctSwaraCount === 1 ? '' : 's'}.`,
      hint: 'Explore at least four different swaras to build fluency in the raga.',
    });
  }

  if (score >= 80) {
    items.push({
      code: 'strong-session',
      severity: 'positive',
      message: `Strong session — ${score}% of your notes were on target.`,
      hint: 'Keep practicing this phrase set and try a new stage for more variety.',
    });
  } else if (score >= 60) {
    items.push({
      code: 'progressing',
      severity: 'positive',
      message: `You are making progress with ${score}% correct notes.`,
      hint: 'Review the notes above, then repeat the exercise to make it stick.',
    });
  } else {
    items.push({
      code: 'keep-building',
      severity: score >= 40 ? 'medium' : 'low',
      message: `You got ${score}% of your notes right in this session.`,
      hint: 'Slow down, listen to the drone, and try the phrase again one step at a time.',
    });
  }

  const hasHighIssues = items.some(item => item.severity === 'high');
  const headline = hasHighIssues
    ? 'Focus on raga rules'
    : score >= 80
      ? 'Strong session!'
      : score >= 60
        ? 'Nice progress'
        : 'Keep building';

  const summary = hasHighIssues
    ? `You scored ${score}%. Work through the highlighted issues to make your practice in ${ragaName} more accurate.`
    : score >= 80
      ? `You scored ${score}%. Great accuracy — keep this momentum going.`
      : score >= 60
        ? `You scored ${score}%. A few small fixes will make this sound even better.`
        : `You scored ${score}%. Take it slowly and build accuracy note by note.`;

  return { score, headline, summary, items };
}

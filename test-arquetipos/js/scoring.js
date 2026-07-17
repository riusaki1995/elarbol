/**
 * Motor de cálculo R.A.Í.C.E.S.™
 * Puntos por arquetipo + afinidad + skills + nivel
 */

const TIEBREAK_SKILLS = ['Monetización', 'Retención', 'Liderazgo'];

export function emptyScores(archetypes) {
  const scores = {};
  for (const a of archetypes) scores[a.name] = 0;
  return scores;
}

export function emptySkills(skillNames) {
  const skills = {};
  for (const s of skillNames) skills[s] = 0;
  return skills;
}

/**
 * @param {Array<{questionId:number, letter:string, archetype:string, skills?:string[]}>} answers
 * @param {{archetypes:any[], skills:string[], levels:any[]}} catalog
 */
export function calculateResult(answers, catalog) {
  const scores = emptyScores(catalog.archetypes);
  const skillRaw = emptySkills(catalog.skills);
  let skillHits = 0;

  for (const ans of answers) {
    if (ans.archetype && scores[ans.archetype] !== undefined) {
      scores[ans.archetype] += 1;
    }
    const sk = ans.skills || [];
    for (const s of sk) {
      if (skillRaw[s] !== undefined) {
        skillRaw[s] += 1;
        skillHits += 1;
      }
    }
  }

  const total = answers.length || 1;
  const ranked = Object.entries(scores)
    .map(([name, score]) => ({
      name,
      score,
      affinity: Math.round((score / total) * 100)
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  // Empate en principal: prioriza skills de tiebreak
  let primary = ranked[0];
  let secondary = ranked[1] || ranked[0];
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    const scoreA = TIEBREAK_SKILLS.reduce((n, s) => n + (skillRaw[s] || 0), 0);
    // Recalcular con sesgo leve: ya empatados, usa orden de letters A→H del catálogo
    const order = catalog.archetypes.map((a) => a.name);
    ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return order.indexOf(a.name) - order.indexOf(b.name);
    });
    primary = ranked[0];
    secondary = ranked[1];
    void scoreA;
  }

  const maxSkill = Math.max(1, ...Object.values(skillRaw));
  const skills = {};
  for (const [k, v] of Object.entries(skillRaw)) {
    skills[k] = Math.round((v / maxSkill) * 100);
  }

  const skillEntries = Object.entries(skills).sort((a, b) => b[1] - a[1]);
  const topStrengths = skillEntries.slice(0, 3).map(([name, value]) => ({ name, value }));
  const topWeaknesses = skillEntries.slice(-3).reverse().map(([name, value]) => ({ name, value }));

  const affinity = primary.affinity;
  const level = catalog.levels.find((l) => affinity >= l.min && affinity <= l.max) || catalog.levels[0];
  const archetype = catalog.archetypes.find((a) => a.name === primary.name);

  return {
    scores,
    ranked,
    primary: primary.name,
    secondary: secondary.name,
    affinity,
    level,
    nextLevel: level.next,
    skills,
    topStrengths,
    topWeaknesses,
    archetype,
    secondaryArchetype: catalog.archetypes.find((a) => a.name === secondary.name),
    totalAnswers: total
  };
}

export function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

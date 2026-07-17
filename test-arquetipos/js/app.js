import { calculateResult, formatDuration } from './scoring.js';

const state = {
  catalog: null,
  questions: [],
  dataReady: false,
  dataPromise: null,
  user: { name: '', email: '', whatsapp: '', tiktok: '' },
  answers: [],
  index: 0,
  startedAt: 0,
  result: null,
  saved: false
};

const $ = (sel) => document.querySelector(sel);
const screens = {
  welcome: $('#screen-welcome'),
  data: $('#screen-data'),
  quiz: $('#screen-quiz'),
  analyze: $('#screen-analyze'),
  result: $('#screen-result')
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/** Carga diferida: no bloquea la pantalla de bienvenida */
function ensureData() {
  if (state.dataReady) return Promise.resolve();
  if (state.dataPromise) return state.dataPromise;

  state.dataPromise = Promise.all([
    fetch('./data/archetypes.json').then((r) => r.json()),
    fetch('./data/questions.json').then((r) => r.json())
  ]).then(([catalog, qData]) => {
    state.catalog = catalog;
    state.questions = qData.questions;
    state.dataReady = true;
  });

  return state.dataPromise;
}

function startFromWelcome() {
  // Precarga en segundo plano al pasar a datos
  ensureData().catch((err) => console.error(err));
  showScreen('data');
}

async function startQuiz(e) {
  e.preventDefault();
  const name = $('#input-name').value.trim();
  const email = $('#input-email').value.trim();
  const whatsapp = $('#input-whatsapp').value.trim();
  const tiktok = $('#input-tiktok').value.trim();
  if (!name || !email || !whatsapp) {
    toast('Completa nombre, correo y WhatsApp');
    return;
  }

  const btn = e.submitter || $('#form-data button[type="submit"]');
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Cargando…';

  try {
    await ensureData();
  } catch (err) {
    console.error(err);
    toast('No se pudo cargar el test');
    btn.disabled = false;
    btn.textContent = prev;
    return;
  }

  btn.disabled = false;
  btn.textContent = prev;

  state.user = { name, email, whatsapp, tiktok };
  state.answers = [];
  state.index = 0;
  state.startedAt = Date.now();
  state.saved = false;
  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  const total = state.questions.length;
  const pct = Math.round((state.index / total) * 100);
  $('#progress-fill').style.width = `${pct}%`;
  $('#progress-label').textContent = `Pregunta ${state.index + 1} de ${total}`;
  $('#progress-pct').textContent = `${pct}%`;
  $('#question-text').textContent = q.question;

  const frag = document.createDocumentFragment();
  const wrap = document.createElement('div');
  wrap.innerHTML = q.answers
    .map(
      (a) => `
      <button type="button" class="answer-btn" data-letter="${a.letter}">
        <span class="answer-letter">${a.letter}</span>
        <span>${a.text}</span>
      </button>`
    )
    .join('');
  while (wrap.firstChild) frag.appendChild(wrap.firstChild);
  const answersEl = $('#answers');
  answersEl.replaceChildren(frag);

  $('#btn-back').disabled = state.index === 0;
  $('#btn-back').style.opacity = state.index === 0 ? '0.35' : '1';
}

function selectAnswer(letter) {
  const q = state.questions[state.index];
  const ans = q.answers.find((a) => a.letter === letter);
  if (!ans) return;

  state.answers[state.index] = {
    questionId: q.id,
    letter: ans.letter,
    archetype: ans.archetype,
    skills: ans.skills || q.skills || []
  };

  if (state.index >= state.questions.length - 1) {
    finishQuiz();
  } else {
    state.index += 1;
    renderQuestion();
  }
}

function goBack() {
  if (state.index === 0) return;
  state.index -= 1;
  renderQuestion();
}

async function finishQuiz() {
  showScreen('analyze');
  const steps = [...document.querySelectorAll('#analyze-steps li')];
  steps.forEach((li) => li.classList.remove('on'));

  // Más corto para no sentir “trabado”
  for (let i = 0; i < steps.length; i++) {
    await wait(320);
    steps[i].classList.add('on');
  }
  await wait(280);

  state.result = calculateResult(state.answers, state.catalog);
  renderResult();
  showScreen('result');
  // Guardar en background (no bloquea UI)
  persist().catch((err) => console.warn(err));
}

async function persist() {
  if (state.saved) return;
  const { saveResult } = await import('./storage.js');
  const durationMs = Date.now() - state.startedAt;
  const payload = {
    name: state.user.name,
    email: state.user.email,
    whatsapp: state.user.whatsapp,
    tiktok: state.user.tiktok || null,
    durationMs,
    durationLabel: formatDuration(durationMs),
    answers: state.answers,
    scores: state.result.scores,
    primary: state.result.primary,
    secondary: state.result.secondary,
    affinity: state.result.affinity,
    level: state.result.level,
    skills: state.result.skills,
    topStrengths: state.result.topStrengths,
    topWeaknesses: state.result.topWeaknesses,
    ranked: state.result.ranked
  };
  const res = await saveResult(payload);
  state.saved = true;
  if (res.local) toast('Resultado guardado en este dispositivo');
}

function renderResult() {
  const r = state.result;
  const a = r.archetype;
  $('#result-user').textContent = state.user.name;
  $('#result-archetype').textContent = a.name;
  $('#result-archetype').style.color = a.color || 'var(--tk-cyan)';
  $('#result-badge').style.borderColor = a.color || 'var(--tk-cyan)';
  $('#result-badge-dot').style.background = a.color || 'var(--tk-cyan)';
  $('#result-tagline').textContent = a.tagline;
  $('#result-desc').textContent = a.description;
  $('#result-affinity').textContent = `${r.affinity}%`;
  $('#result-level').textContent = r.level.label;
  $('#result-next').textContent = r.nextLevel;
  $('#result-secondary').textContent = r.secondary;

  $('#result-strengths').innerHTML = r.topStrengths
    .map((s) => `<li><strong>${s.name}</strong> · ${s.value}%</li>`)
    .join('');
  $('#result-weaknesses').innerHTML = r.topWeaknesses
    .map((s) => `<li><strong>${s.name}</strong> · ${s.value}%</li>`)
    .join('');

  $('#result-monetization').textContent = a.monetization;
  $('#result-stream').textContent = a.howToStream;
  $('#result-community').textContent = a.community;
  $('#result-donors').textContent = a.donors;
  $('#result-schedule').textContent = a.idealSchedule;
  $('#result-duration').textContent = a.idealDuration;
  $('#result-frequency').textContent = a.idealFrequency;
  $('#result-pk').textContent = a.pkType;
  $('#result-errors').innerHTML = a.errorsToAvoid.map((e) => `<li>${e}</li>`).join('');
  $('#result-plan').innerHTML = `
    <li><strong>Días 1–30:</strong> ${a.plan90Days.d1_30}</li>
    <li><strong>Días 31–60:</strong> ${a.plan90Days.d31_60}</li>
    <li><strong>Días 61–90:</strong> ${a.plan90Days.d61_90}</li>`;
  $('#result-open').textContent = a.openLive;
  $('#result-close').textContent = a.closeLive;
  $('#result-grow').textContent = a.grow;
  $('#result-avoid').textContent = a.avoid;

  $('#result-skills').innerHTML = Object.entries(r.skills)
    .sort((x, y) => y[1] - x[1])
    .map(
      ([name, value]) => `
      <div class="skill-row">
        <span>${name}</span>
        <div class="skill-bar"><span style="width:${value}%"></span></div>
        <span>${value}%</span>
      </div>`
    )
    .join('');

  $('#result-compare').innerHTML = r.ranked
    .map((item) => {
      const arch = state.catalog.archetypes.find((x) => x.name === item.name);
      const color = arch?.color || '#25f4ee';
      return `
        <div class="compare-row">
          <span>${item.name}</span>
          <div class="compare-bar"><span style="width:${item.affinity}%;background:${color}"></span></div>
          <span>${item.affinity}%</span>
        </div>`;
    })
    .join('');
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function onPdf() {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const { downloadResultPdf } = await import('./pdf.js');
    await downloadResultPdf(state, state.result);
    toast('PDF descargado');
  } catch (err) {
    console.error(err);
    toast('No se pudo generar el PDF');
  }
}

async function onShare() {
  try {
    const { shareWrappedCard } = await import('./share.js');
    await shareWrappedCard(state, state.result);
    toast('Listo para compartir');
  } catch (err) {
    console.error(err);
    toast('No se pudo compartir la imagen');
  }
}

function restart() {
  state.answers = [];
  state.index = 0;
  state.result = null;
  state.saved = false;
  showScreen('welcome');
}

document.addEventListener('DOMContentLoaded', () => {
  // UI inmediata — sin esperar JSON ni Firebase
  showScreen('welcome');

  $('#btn-start').addEventListener('click', startFromWelcome);
  $('#form-data').addEventListener('submit', startQuiz);
  $('#btn-back').addEventListener('click', goBack);
  $('#btn-pdf').addEventListener('click', onPdf);
  $('#btn-share').addEventListener('click', onShare);
  $('#btn-restart').addEventListener('click', restart);

  // Un solo listener (delegación) para respuestas
  $('#answers').addEventListener('click', (e) => {
    const btn = e.target.closest('.answer-btn');
    if (!btn) return;
    selectAnswer(btn.dataset.letter);
  });
});

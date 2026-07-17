import { calculateResult, formatDuration } from './scoring.js';
import { saveResult } from './storage.js';
import { downloadResultPdf } from './pdf.js';
import { shareWrappedCard } from './share.js';

const state = {
  catalog: null,
  questions: [],
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

async function loadData() {
  const [archRes, qRes] = await Promise.all([
    fetch('./data/archetypes.json'),
    fetch('./data/questions.json')
  ]);
  state.catalog = await archRes.json();
  const qData = await qRes.json();
  state.questions = qData.questions;

  const letters = $('#method-letters');
  letters.innerHTML = state.catalog.method.letters
    .map((l) => `<div class="letter-chip" title="${l.meaning}">${l.letter}</div>`)
    .join('');
}

function startFromWelcome() {
  showScreen('data');
}

function startQuiz(e) {
  e.preventDefault();
  const name = $('#input-name').value.trim();
  const email = $('#input-email').value.trim();
  const whatsapp = $('#input-whatsapp').value.trim();
  const tiktok = $('#input-tiktok').value.trim();
  if (!name || !email || !whatsapp) {
    toast('Completa nombre, correo y WhatsApp');
    return;
  }
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
  $('#answers').innerHTML = q.answers
    .map(
      (a) => `
      <button type="button" class="answer-btn" data-letter="${a.letter}">
        <span class="answer-letter">${a.letter}</span>
        <span>${a.text}</span>
      </button>`
    )
    .join('');

  $('#answers').querySelectorAll('.answer-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectAnswer(btn.dataset.letter));
  });

  $('#btn-back').disabled = state.index === 0;
  $('#btn-back').style.opacity = state.index === 0 ? '0.35' : '1';
}

function selectAnswer(letter) {
  const q = state.questions[state.index];
  const ans = q.answers.find((a) => a.letter === letter);
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
  for (let i = 0; i < steps.length; i++) {
    await wait(700);
    steps[i].classList.add('on');
  }
  await wait(600);

  state.result = calculateResult(state.answers, state.catalog);
  await persist();
  renderResult();
  showScreen('result');
}

async function persist() {
  if (state.saved) return;
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
  if (res.local) toast('Resultado guardado en este dispositivo (Firestore pendiente de reglas)');
}

function renderResult() {
  const r = state.result;
  const a = r.archetype;
  $('#result-user').textContent = state.user.name;
  $('#result-archetype').textContent = a.name;
  $('#result-archetype').style.color = a.color;
  $('#result-badge').style.borderColor = a.color;
  $('#result-badge-dot').style.background = a.color;
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

  const skillHtml = Object.entries(r.skills)
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
  $('#result-skills').innerHTML = skillHtml;

  const compareHtml = r.ranked
    .map((item) => {
      const arch = state.catalog.archetypes.find((x) => x.name === item.name);
      const color = arch?.color || '#39ff14';
      return `
        <div class="compare-row">
          <span>${item.name}</span>
          <div class="compare-bar"><span style="width:${item.affinity}%;background:${color}"></span></div>
          <span>${item.affinity}%</span>
        </div>`;
    })
    .join('');
  $('#result-compare').innerHTML = compareHtml;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function onPdf() {
  try {
    await downloadResultPdf(state, state.result);
    toast('PDF descargado');
  } catch (err) {
    console.error(err);
    toast('No se pudo generar el PDF');
  }
}

async function onShare() {
  try {
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

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    toast('Error cargando el test');
    return;
  }

  $('#btn-start').addEventListener('click', startFromWelcome);
  $('#form-data').addEventListener('submit', startQuiz);
  $('#btn-back').addEventListener('click', goBack);
  $('#btn-pdf').addEventListener('click', onPdf);
  $('#btn-share').addEventListener('click', onShare);
  $('#btn-restart').addEventListener('click', restart);

  showScreen('welcome');
});

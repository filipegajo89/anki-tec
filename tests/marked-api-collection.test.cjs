const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const sourcePath = path.join(__dirname, '..', 'tec-to-anki-raw.user.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const ok = json => ({ ok: true, status: 200, json });
const contextFor = (questions, currentNumber = 1) => ({
  key: 'caderno:111', currentNumber, total: questions.length,
  currentId: String(questions[currentNumber - 1].idQuestao),
});

function question(number) {
  return {
    idQuestao: 700000 + number, bancaSigla: 'CEBRASPE', concursoAno: 2026,
    cargoSigla: 'Auditor', nomeMateria: 'Direito Tributário', nomeAssunto: `Assunto ${number}`,
    tipoQuestao: 'MULTIPLA_ESCOLHA', enunciado: `<p>Enunciado da questão ${number}: obrigação.</p>`,
    alternativas: ['<p>Principal</p>', '<p>Acessória</p>'],
    numeroAlternativaCorreta: '1', alternativaSelecionada: '2', correcaoQuestao: false,
  };
}

function comment(id) {
  return { comentario: {
    nomeProfessor: 'Professora Ágata',
    textoComentario: `<p>Comentário próprio da questão #${id}: ação e obrigação.</p>`,
  } };
}

/** Run the real production helpers without startup, UI navigation or services. */
function harness(t, { questions = [question(1), question(2), question(3)], storage = new Map(), currentNumber = 1 } = {}) {
  const context = contextFor(questions, currentNumber);
  const dom = new JSDOM(`<!doctype html><body><div class="questao" ng-controller="ResolverController"><div class="questao-cabecalho"><a href="/questoes/${context.currentId}">#${context.currentId}</a></div><p>Questão ${currentNumber} de ${questions.length}</p><div class="questao-enunciado" tec-formatar-html="vm.questao.enunciado"></div></div></body>`, {
    url: 'https://www.tecconcursos.com.br/questoes/cadernos/111/resolver',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true, get() { return this.textContent; }, set(value) { this.textContent = value; },
  });
  const controller = { caderno: { idCaderno: 111, totalQuestoes: questions.length }, questao: questions[currentNumber - 1], questoes: questions };
  window.unsafeWindow = window;
  window.angular = { element: () => ({ scope: () => ({ vm: controller }) }) };
  window.GM_getValue = (key, fallback) => storage.has(key) ? clone(storage.get(key)) : clone(fallback);
  window.GM_setValue = (key, value) => storage.set(key, clone(value));
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = () => { throw new Error('Marked collection must not call AI, Anki or Obsidian'); };
  window.fetch = async () => { throw new Error('Unexpected real network request'); };
  window.console = { log() {}, warn() {}, error() {} };
  const source = fs.readFileSync(sourcePath, 'utf8');
  const startup = source.lastIndexOf('  if (document.readyState');
  assert.ok(startup > 0, 'production automatic startup marker must remain identifiable');
  vm.runInContext(source.slice(0, startup) + `
    window.__markedApiTest = {
      run: (name, ...args) => eval(name)(...args),
      override: (name, value) => { eval(name + ' = value'); },
    };
  })();`, dom.getInternalVMContext(), { filename: sourcePath });
  const api = window.__markedApiTest;
  api.override('delay', async () => {});
  api.override('waitTecAction', async (_kind, shouldContinue = () => true) => shouldContinue());
  api.override('waitTecExportAction', async (_min, _max, shouldContinue = () => true) => shouldContinue());
  api.override('updateStatusDot', async () => {});
  for (const name of ['navigateToNextQuestion', 'navigateToPrevQuestion', 'navigateToQuestionNumber', 'ensureCommentExpanded', 'generateCards']) {
    api.override(name, () => { throw new Error(`API collection must not invoke ${name}`); });
  }
  return {
    window, controller, storage, context, questions,
    run: (name, ...args) => api.run(name, ...args),
    override: (name, value) => api.override(name, value),
  };
}

function seed(h, entries) {
  h.storage.set('tecQuestionMap:v1:' + h.context.key, { total: h.context.total, entries: clone(entries) });
}

function stubTec(h, transform = null) {
  const paths = [], ordinals = [], professorIds = [];
  let active = 0, maximumActive = 0;
  h.override('fetchTecExportJson', async path => {
    paths.push(path);
    active++;
    maximumActive = Math.max(maximumActive, active);
    await Promise.resolve();
    try {
      const ordinal = path.match(/^\/api\/cadernos\/111\/questoes\/(\d+)\?atualizarCronometro=false$/)?.[1];
      const professorId = path.match(/^\/api\/questoes\/(\d+)\/comentario(?:\?|$)/)?.[1];
      const response = ordinal ? ok({ questao: h.questions[Number(ordinal) - 1] })
        : professorId ? ok(comment(professorId)) : null;
      if (ordinal) ordinals.push(Number(ordinal));
      if (professorId) professorIds.push(professorId);
      assert.ok(response, `unexpected endpoint ${path}`);
      return transform ? transform({ path, ordinal: Number(ordinal) || null, professorId, response, paths }) : response;
    } finally { active--; }
  });
  return { paths, ordinals, professorIds, maximumActive: () => maximumActive };
}

test('API collection recovers twelve retained choices including hidden orphan IDs without navigating the DOM', async t => {
  const h = harness(t, { questions: Array.from({ length: 12 }, (_, i) => question(i + 1)), currentNumber: 5 });
  const entries = Object.fromEntries(h.questions.map((q, i) => [i < 4 ? String(i + 1) : `id:${q.idQuestao}`, {
    id: String(q.idQuestao), selected: true, result: 'err', number: i < 4 ? i + 1 : 4,
  }]));
  seed(h, entries);
  const targets = clone(h.run('getMarkedQuestions', h.context));
  assert.equal(targets.length, 12);
  const calls = stubTec(h);
  const before = h.window.document.body.innerHTML;
  const result = await h.run('collectMarkedQuestionsViaApi', targets, h.context, { shouldContinue: () => true });
  assert.equal(result.cancelled, false);
  assert.equal(result.missing.length, 0);
  assert.equal(result.collected.length, 12);
  assert.deepEqual(clone(result.collected).map(q => String(q.id)).sort(), h.questions.map(q => String(q.idQuestao)).sort());
  assert.equal(new Set(calls.ordinals).size, 12);
  assert.equal(calls.ordinals.length, 12, 'each ordinal must be fetched once during reconciliation');
  assert.equal(calls.professorIds.length, 12);
  assert.equal(calls.maximumActive(), 1, 'TEC requests must remain sequential');
  assert.equal(h.window.document.body.innerHTML, before, 'collection must not replace the question shown');
  assert.equal(h.run('getMarkedQuestions', h.context).length, 12, 'collection must preserve explicit choices before saving cards');
  for (const q of result.collected) {
    assert.ok(q.comentario.includes(`#${q.id}`), 'professor comments must remain paired by verified ID');
    assert.equal(q.selecaoManual, true);
  }
});

test('verified ordinary positions collect only selected ordinals and retain every choice', async t => {
  const h = harness(t, { questions: Array.from({ length: 8 }, (_, i) => question(i + 1)) });
  seed(h, { 2: { id: '700002', selected: true }, 7: { id: '700007', selected: true } });
  const calls = stubTec(h);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }, { number: 7, id: '700007' }], h.context, { shouldContinue: () => true });
  assert.deepEqual(calls.ordinals.slice().sort((a, b) => a - b), [2, 7]);
  assert.equal(result.missing.length, 0);
  assert.equal(result.collected.length, 2);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('a foreign ID is never treated as the selected question or sent to the professor endpoint', async t => {
  const h = harness(t);
  seed(h, { 'id:999999': { id: '999999', selected: true, number: 1 } });
  const calls = stubTec(h);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '999999' }], h.context, { shouldContinue: () => true });
  assert.equal(result.collected.length, 0);
  assert.equal(result.missing.length, 1);
  assert.equal(String(result.missing[0].id), '999999');
  assert.ok(result.missing[0].reason, 'unresolved choices need a concrete diagnostic');
  assert.deepEqual(calls.professorIds, [], 'nonselected questions discovered during scans need no professor request');
  assert.equal(new Set(calls.ordinals).size, calls.ordinals.length);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('cancellation after a base response stops further requests and preserves unresolved choices', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
  let active = true;
  const calls = stubTec(h, ({ response }) => { active = false; return response; });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }, { number: 2, id: '700002' }], h.context, { shouldContinue: () => active });
  assert.equal(result.cancelled, true);
  assert.equal(calls.paths.length, 1);
  assert.equal(calls.professorIds.length, 0);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('session failure stops scanning immediately instead of converting foreign or missing data into cards', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
  const calls = stubTec(h, () => ({ ok: false, status: 401, json: null, sessionExpired: true, error: 'Sessão expirada' }));
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }, { number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(calls.paths.length, 1);
  assert.equal(calls.professorIds.length, 0);
  assert.equal(result.collected.length, 0);
  assert.equal(result.missing.length, 2);
  assert.ok(result.missing.every(item => item.reason));
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('a returned notebook mismatch stops collection before any professor request', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ response }) => ({ ...response, json: { ...response.json, caderno: { idCaderno: 222 } } }));
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }, { number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(calls.paths.length, 1);
  assert.deepEqual(calls.professorIds, []);
  assert.equal(result.collected.length, 0);
  assert.equal(result.missing.length, 2);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('an absent answer key does not invent A or fetch a comment for an unusable question', async t => {
  const q = question(1);
  delete q.numeroAlternativaCorreta;
  const h = harness(t, { questions: [q] });
  seed(h, { 1: { id: '700001', selected: true } });
  const calls = stubTec(h);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }], h.context, { shouldContinue: () => true });
  assert.equal(result.collected.length, 0);
  assert.equal(result.missing.length, 1);
  assert.match(result.missing[0].reason, /gabarito/i);
  assert.deepEqual(calls.professorIds, []);
  assert.equal(h.run('buildMarkedQuestionData', q, null, h.context).gabarito, '');
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('incomplete marked collection blocks the generation flow and leaves every choice selected', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 'id:999999': { id: '999999', selected: true, number: 2 } });
  stubTec(h);
  const messages = [];
  let generationFlows = 0;
  h.override('getQuestionMapContext', () => h.context);
  h.override('syncQuestionMap', () => {});
  h.override('showLoadingToast', () => h.window.document.createElement('div'));
  h.override('showToast', message => messages.push(message));
  h.override('processCollectedQuestions', () => { generationFlows++; });
  await h.run('processMarkedQuestions');
  assert.equal(generationFlows, 0);
  assert.ok(messages.some(message => message.includes('999999') && /marcações foram mantidas/i.test(message)), 'the missing selected ID must be diagnosed while generation stays blocked');
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('the adapter accepts string answer numbers and keeps comment, result and question ID coherent', t => {
  const h = harness(t);
  const q = question(2);
  const data = h.run('buildMarkedQuestionData', q, comment(q.idQuestao), h.context);
  assert.equal(String(data.id), '700002');
  assert.equal(data.gabarito, 'A');
  assert.equal(data.respostaAluno, 'B');
  assert.equal(data.errou, true);
  assert.equal(data.tipo, 'multipla_escolha');
  assert.equal(data.alternativas[0].correta, true);
  assert.equal(data.alternativas[1].selecionada, true);
  assert.ok(data.comentario.includes('#700002'));
  assert.ok(data.enunciado.includes('questão 2'));
  assert.equal(data.url, 'https://www.tecconcursos.com.br/questoes/700002');
  assert.equal(data.selecaoManual, true);
});

test('position reconciliation moves IDs atomically and does not transfer or delete orphan selections', t => {
  const h = harness(t);
  seed(h, {
    1: { id: '700002', selected: true, result: 'err' },
    2: { id: '700001', selected: false, result: 'ok' },
    'id:700003': { id: '700003', selected: true, number: 1 },
    'id:999999': { id: '999999', selected: true, number: 2 },
  });
  const observed = new h.window.Map(h.questions.map((q, i) => [i + 1, q]));
  h.run('reconcileQuestionMapPositions', observed, h.context);
  const state = clone(h.run('loadQuestionMap', h.context));
  assert.equal(state.entries['1'].id, '700001');
  assert.equal(state.entries['1'].selected, false);
  assert.equal(state.entries['2'].id, '700002');
  assert.equal(state.entries['2'].selected, true);
  assert.equal(state.entries['3'].id, '700003');
  assert.equal(state.entries['3'].selected, true);
  const chosen = clone(h.run('getMarkedQuestions', h.context));
  assert.deepEqual(chosen.map(item => item.id).sort(), ['700002', '700003', '999999']);
  assert.equal(Object.values(state.entries).filter(entry => entry.id === '700002').length, 1);
});

test('the map exposes retained orphan IDs and lets the user unmark only the chosen question', t => {
  const h = harness(t);
  seed(h, {
    1: { id: '700001', selected: true, result: 'err', custom: 'preserve ordinary entry' },
    'id:700002': { id: '700002', selected: true, number: 1, custom: 'preserve unmarked entry' },
    'id:700003': { id: '700003', selected: true, number: 1, custom: 'preserve other orphan' },
  });
  h.run('injectToolbar');
  h.run('toggleQuestionMap');
  const pending = h.window.document.getElementById('tec-map-pending');
  assert.ok(pending, 'retained choices need a visible place outside the numeric grid');
  assert.equal(pending.hidden, false);
  assert.ok(pending.querySelector('summary').textContent.includes('2'));
  const checkboxes = [...pending.querySelectorAll('input[data-unplaced-id]')];
  assert.deepEqual(checkboxes.map(input => input.dataset.unplacedId).sort(), ['700002', '700003']);
  assert.ok(checkboxes.every(input => input.checked && !input.disabled));
  assert.equal(h.run('getMarkedQuestions', h.context).length, 3);

  const chosen = pending.querySelector('input[data-unplaced-id="700002"]');
  chosen.checked = false;
  chosen.dispatchEvent(new h.window.Event('change', { bubbles: true }));
  const state = clone(h.run('loadQuestionMap', h.context));
  assert.equal(state.entries['id:700002'].selected, false);
  assert.equal(state.entries['id:700002'].custom, 'preserve unmarked entry');
  assert.equal(state.entries['1'].selected, true);
  assert.equal(state.entries['1'].custom, 'preserve ordinary entry');
  assert.equal(state.entries['id:700003'].selected, true);
  assert.equal(state.entries['id:700003'].custom, 'preserve other orphan');
  assert.deepEqual(clone(h.run('getMarkedQuestions', h.context)).map(item => item.id).sort(), ['700001', '700003']);
  assert.equal(pending.querySelector('input[data-unplaced-id="700002"]'), null);
  assert.equal(pending.querySelector('input[data-unplaced-id="700003"]').checked, true);
});

test('an unknown ordinal and a retained known ID resolving to the same question enter generation once', async t => {
  const h = harness(t);
  seed(h, {
    1: { selected: true },
    'id:700001': { id: '700001', selected: true, number: 2 },
  });
  const calls = stubTec(h);
  const messages = [], generationInputs = [];
  h.override('getQuestionMapContext', () => h.context);
  h.override('syncQuestionMap', () => {});
  h.override('showLoadingToast', () => h.window.document.createElement('div'));
  h.override('showToast', message => messages.push(message));
  h.override('processCollectedQuestions', questions => { generationInputs.push(clone(questions)); });
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2, 'legacy storage can describe one choice in two ways');
  await h.run('processMarkedQuestions');
  assert.equal(generationInputs.length, 1, 'duplicate descriptions must not trigger a collected-count mismatch');
  assert.equal(generationInputs[0].length, 1);
  assert.equal(generationInputs[0][0].id, '700001');
  assert.deepEqual(calls.professorIds, ['700001']);
  assert.deepEqual(calls.ordinals, [1, 2]);
  assert.ok(!messages.some(message => /Não foi possível|Nenhuma questão foi coletada/i.test(message)));
  assert.deepEqual(clone(h.run('getMarkedQuestions', h.context)), [{ number: 1, id: '700001' }]);
});

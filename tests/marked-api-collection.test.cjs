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
  const controller = { caderno: { idCaderno: 111, totalQuestoes: questions.length,
    numeroQuestaoAtual: currentNumber, numeroTotalQuestoes: questions.length }, questao: questions[currentNumber - 1], questoes: questions };
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
    navigate: number => {
      assert.ok(questions[number - 1], 'the simulated current question must exist');
      controller.questao = questions[number - 1];
      controller.caderno.numeroQuestaoAtual = number;
      const link = window.document.querySelector('.questao-cabecalho a');
      link.href = `/questoes/${controller.questao.idQuestao}`;
      link.textContent = `#${controller.questao.idQuestao}`;
      window.document.querySelector('p').textContent = `Questão ${number} de ${questions.length}`;
      window.document.querySelector('.questao-enunciado').innerHTML = controller.questao.enunciado;
    },
    run: (name, ...args) => api.run(name, ...args),
    override: (name, value) => api.override(name, value),
  };
}

function seed(h, entries) {
  h.storage.set('tecQuestionMap:v1:' + h.context.key, { total: h.context.total, entries: clone(entries) });
}

function stubTec(h, transform = null) {
  const paths = [], ordinals = [], professorIds = [], performanceIds = [], guards = [];
  let active = 0, maximumActive = 0;
  let serverPosition = h.context.currentNumber;
  h.override('fetchTecExportJson', async (path, shouldContinue = () => true) => {
    guards.push(shouldContinue());
    assert.equal(guards.at(-1), true, 'no request may start after its supplied continuation guard rejects it');
    paths.push(path);
    active++;
    maximumActive = Math.max(maximumActive, active);
    await Promise.resolve();
    try {
      const ordinal = path.match(/^\/api\/cadernos\/111\/questoes\/(\d+)\?atualizarCronometro=false$/)?.[1];
      const professorId = path.match(/^\/api\/questoes\/(\d+)\/comentario(?:\?|$)/)?.[1];
      const performanceId = path.match(/^\/api\/questoes\/(\d+)\/desempenho$/)?.[1];
      const response = ordinal ? ok({ questao: h.questions[Number(ordinal) - 1] })
        : professorId ? ok(comment(professorId))
          : performanceId ? ok({ desempenho: { desempenhoAluno: { quantidadeErros: 0 } } }) : null;
      if (ordinal) ordinals.push(Number(ordinal));
      if (professorId) professorIds.push(professorId);
      if (performanceId) performanceIds.push(performanceId);
      assert.ok(response, `unexpected endpoint ${path}`);
      const result = transform ? await transform({ path, ordinal: Number(ordinal) || null, professorId, performanceId, response, paths }) : response;
      if (ordinal && result.ok) serverPosition = Number(ordinal);
      return result;
    } finally { active--; }
  });
  return { paths, ordinals, professorIds, performanceIds, guards, maximumActive: () => maximumActive,
    serverPosition: () => serverPosition, setServerPosition: number => { serverPosition = number; } };
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
  assert.equal(new Set(calls.ordinals.slice(0, -1)).size, 12);
  assert.equal(calls.ordinals.length, 13, 'each ordinal is fetched once for reconciliation plus one final restoration');
  assert.equal(calls.ordinals.at(-1), 5);
  assert.equal(calls.serverPosition(), 5, 'the server resume marker must still point at the displayed question');
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
  assert.deepEqual(calls.ordinals.slice(0, -1).sort((a, b) => a - b), [2, 7]);
  assert.equal(calls.ordinals.at(-1), 1);
  assert.equal(calls.serverPosition(), 1);
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
  assert.equal(new Set(calls.ordinals.slice(0, -1)).size, calls.ordinals.length - 1);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('cancellation after a successful base response still restores the server marker and preserves choices', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true }, 3: { id: '700003', selected: true } });
  let active = true;
  const calls = stubTec(h, ({ response }) => { active = false; return response; });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }, { number: 3, id: '700003' }], h.context, { shouldContinue: () => active });
  assert.equal(result.cancelled, true);
  assert.equal(result.collected.length, 0, 'the base response cancelled before it entered the observed map');
  assert.deepEqual(calls.ordinals, [2, 1], 'only the independent cleanup request may follow cancellation');
  assert.deepEqual(calls.guards, [true, true], 'the final restore must not use the stopped batch continuation guard');
  assert.equal(calls.serverPosition(), 1);
  assert.equal(calls.professorIds.length, 0);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('cancellation after the server changed position but before a successful response still restores it', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  let active = true;
  const calls = stubTec(h, ({ ordinal, response }) => {
    if (ordinal === 2) {
      calls.setServerPosition(2); // the server already processed the GET when its response was aborted
      active = false;
      return { ok: false, status: 0, cancelled: true, error: 'Coleta interrompida' };
    }
    return response;
  });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => active });
  assert.equal(result.cancelled, true);
  assert.equal(result.collected.length, 0);
  assert.deepEqual(calls.ordinals, [2, 1]);
  assert.equal(calls.serverPosition(), 1);
  assert.deepEqual(calls.professorIds, []);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('cancelling before any base request requires no server restoration request', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => false });
  assert.equal(result.cancelled, true);
  assert.deepEqual(calls.paths, []);
  assert.equal(calls.serverPosition(), 1);
});

test('restoration uses the newly opened question when the user moves within the same notebook', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ performanceId, response }) => {
    if (performanceId) h.navigate(3);
    return response;
  });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(result.missing.length, 0);
  assert.equal(result.collected.length, 1);
  assert.deepEqual(calls.ordinals, [2, 3], 'cleanup must respect the user current question instead of resetting the initial position');
  assert.equal(calls.serverPosition(), 3);
  assert.equal(h.run('getQuestionMapContext').currentId, '700003');
  assert.equal(h.run('getQuestionMapContext').currentNumber, 3);
});

test('one additional restore follows a question change while the first restore is in flight', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ ordinal, response, paths }) => {
    if (ordinal === 1 && paths.length > 1) h.navigate(3);
    return response;
  });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(result.missing.length, 0);
  assert.deepEqual(calls.ordinals, [2, 1, 3]);
  assert.equal(calls.serverPosition(), 3);
});

test('changing notebooks during collection skips restoration in the notebook the user left', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ performanceId, response }) => {
    if (performanceId) h.window.history.replaceState({}, '', '/questoes/cadernos/222/resolver');
    return response;
  });
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, {
    shouldContinue: () => h.run('getQuestionMapContext').key === h.context.key,
  });
  assert.equal(result.cancelled, true);
  assert.deepEqual(calls.ordinals, [2], 'cleanup must not query the notebook after the user has left it');
  assert.equal(calls.paths.at(-1), '/api/questoes/700002/desempenho');
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('a restore response must confirm the displayed question ID without discarding collected data', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ ordinal, response, paths }) => ordinal === 1 && paths.length > 1
    ? ok({ questao: { ...h.questions[0], idQuestao: 999999 } }) : response);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(result.collected.length, 1);
  assert.equal(result.collected[0].id, '700002');
  assert.equal(result.missing.length, 1);
  assert.match(result.missing[0].reason, /ID.*restaurar/i);
  assert.deepEqual(calls.ordinals, [2, 1]);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 1);
});

test('session failure stops scanning immediately instead of converting foreign or missing data into cards', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
  const calls = stubTec(h, () => ({ ok: false, status: 401, json: null, sessionExpired: true, error: 'Sessão expirada' }));
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }, { number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(calls.paths.length, 1, 'a session refusal must never trigger an additional restore request');
  assert.equal(calls.professorIds.length, 0);
  assert.equal(result.collected.length, 0);
  assert.ok(result.missing.length >= 2);
  assert.ok(result.missing.every(item => item.reason));
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('a returned notebook mismatch stops collection before any professor request', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ response }) => ({ ...response, json: { ...response.json, caderno: { idCaderno: 222 } } }));
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }, { number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(calls.paths.length, 2, 'the rejected notebook identity may be followed only by a guarded restore');
  assert.deepEqual(calls.professorIds, []);
  assert.equal(result.collected.length, 0);
  assert.ok(result.missing.length >= 2);
  assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
});

test('a session or quota refusal after an earlier successful base request prevents restoration requests', async t => {
  for (const status of [401, 429]) {
    const h = harness(t);
    seed(h, { 2: { id: '700002', selected: true }, 3: { id: '700003', selected: true } });
    const calls = stubTec(h, ({ ordinal, response }) => ordinal === 3
      ? { ok: false, status, json: null, error: status === 401 ? 'Sessão expirada' : 'Limite de consultas' } : response);
    const result = await h.run('collectMarkedQuestionsViaApi', h.run('getMarkedQuestions', h.context), h.context, { shouldContinue: () => true });
    assert.deepEqual(calls.ordinals, [2, 3]);
    assert.equal(calls.serverPosition(), 2, 'the server changed before refusal, but the refusal forbids another request');
    assert.equal(calls.paths.length, 2);
    assert.equal(result.collected.length, 0);
    assert.equal(result.missing.length, 2);
    assert.deepEqual(calls.professorIds, []);
    assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
  }
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

test('personal error history remains three when the same marked error is saved again', async t => {
  const h = harness(t);
  seed(h, { 2: { id: '700002', selected: true } });
  const calls = stubTec(h, ({ performanceId, response }) => performanceId
    ? ok({ desempenho: { desempenhoGeral: { erros: 99 }, desempenhoAluno: { quantidadeErros: '3' } } }) : response);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 2, id: '700002' }], h.context, { shouldContinue: () => true });
  assert.equal(result.missing.length, 0);
  assert.equal(result.collected.length, 1);
  const data = result.collected[0];
  assert.equal(data.errou, true);
  assert.equal(data.vezesErradoTec, 3);
  assert.deepEqual(calls.performanceIds, ['700002'], 'personal history must be fetched by the selected ID, not the open question');

  const settings = { obsidianMethod: 'rest', obsidianBasePath: 'TEC', obsidianPort: 27123, obsidianToken: 'offline-only' };
  h.override('getSetting', key => settings[key]);
  let note = '---\nvezes_errado: 3\n---\n';
  const writes = [];
  h.override('gmFetch', async (url, options) => {
    assert.equal(url, `http://127.0.0.1:27123/vault/${encodeURIComponent('TEC/Direito Tributário/Assunto 2/Q700002')}.md`);
    if (options.method === 'GET') return { ok: true, status: 200, text: async () => note };
    assert.equal(options.method, 'PUT');
    note = options.body;
    writes.push(note);
    return { ok: true, status: 204 };
  });
  await h.run('saveToObsidian', data, { cards: [], erro_identificado: '' });
  await h.run('saveToObsidian', data, { cards: [], erro_identificado: '' });
  assert.equal(writes.length, 2);
  assert.ok(writes.every(body => /^vezes_errado: 3$/m.test(body)), 'reprocessing must not inflate the existing personal error count');
});

test('only a nonnegative integer personal count is accepted from the performance endpoint', async t => {
  const h = harness(t);
  seed(h, { 1: { id: '700001', selected: true } });
  const targets = [{ number: 1, id: '700001' }];
  for (const count of [0, '0', 3, '3']) {
    stubTec(h, ({ performanceId, response }) => performanceId
      ? ok({ desempenho: { desempenhoAluno: { quantidadeErros: count } } }) : response);
    const result = await h.run('collectMarkedQuestionsViaApi', targets, h.context, { shouldContinue: () => true });
    assert.equal(result.collected[0].vezesErradoTec, Number(count));
    assert.equal(result.missing.length, 0);
  }
  for (const count of [undefined, null, '', '   ', 'foo', true, false, -1, '-1', 1.5, '1.5', {}, [], Infinity, NaN]) {
    stubTec(h, ({ performanceId, response }) => performanceId
      ? ok({ quantidadeErros: 77, desempenho: { quantidadeErros: 88,
        desempenhoGeral: { erros: 99 }, desempenhoAluno: { quantidadeErros: count } } }) : response);
    const result = await h.run('collectMarkedQuestionsViaApi', targets, h.context, { shouldContinue: () => true });
    assert.equal(result.collected[0].vezesErradoTec, null, `invalid personal count ${String(count)} must not borrow the global count`);
    assert.equal(result.missing.length, 0, 'an unavailable count must not make a usable question incomplete');
  }
});

test('a question with a verified embedded history needs no separate performance request', async t => {
  const q = question(1);
  q.resolucoes = Array.from({ length: 3 }, () => ({ data: '05/10/2026', correcao: false }));
  const h = harness(t, { questions: [q] });
  seed(h, { 1: { id: '700001', selected: true } });
  const calls = stubTec(h);
  const result = await h.run('collectMarkedQuestionsViaApi', [{ number: 1, id: '700001' }], h.context, { shouldContinue: () => true });
  assert.equal(result.collected[0].vezesErradoTec, 3);
  assert.deepEqual(calls.performanceIds, []);
});

test('ordinary performance unavailability preserves null without blocking marked collection', async t => {
  for (const status of [404, 500]) {
    const h = harness(t);
    seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
    const calls = stubTec(h, ({ performanceId, response }) => performanceId
      ? { ok: false, status, json: null, error: 'Desempenho indisponível' } : response);
    const result = await h.run('collectMarkedQuestionsViaApi', h.run('getMarkedQuestions', h.context), h.context, { shouldContinue: () => true });
    assert.equal(result.cancelled, false);
    assert.equal(result.missing.length, 0);
    assert.equal(result.collected.length, 2);
    assert.ok(result.collected.every(q => q.vezesErradoTec === null));
    assert.deepEqual(calls.professorIds, ['700001', '700002']);
    assert.equal(calls.performanceIds.length, status === 500 ? 4 : 2, 'a transient failure retries once and then keeps the question usable');
    assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
  }
});

test('performance session and quota failures stop the batch and preserve every mark', async t => {
  const failures = [
    ...[401, 402, 403, 429].map(status => ({ ok: false, status, json: null, error: 'Consulta recusada' })),
    { ok: false, status: 200, json: null, sessionExpired: true, error: 'Resposta não JSON' },
    { ok: false, status: 400, json: null, error: 'Limite diário alcançado' },
    { ok: false, status: 400, json: null, error: 'Sessão expirada' },
    { ok: false, status: 400, json: null, error: 'Quota exceeded' },
    { ok: false, status: 200, json: { mensagem: 'Limite de cota diária' } },
    { ok: false, status: 500, json: { mensagem: 'Cota diária de consultas atingida' } },
    { ok: false, status: 500, json: null, sessionExpired: true, error: 'Resposta não JSON' },
    { ok: false, status: 0, json: null, error: 'quota exceeded' },
  ];
  for (const failure of failures) {
    const h = harness(t);
    seed(h, { 1: { id: '700001', selected: true }, 2: { id: '700002', selected: true } });
    const calls = stubTec(h, ({ performanceId, response }) => performanceId ? failure : response);
    let generationFlows = 0;
    h.override('getQuestionMapContext', () => h.context);
    h.override('syncQuestionMap', () => {});
    h.override('showToast', () => {});
    h.override('processCollectedQuestions', () => { generationFlows++; });
    await h.run('processMarkedQuestions');
    assert.equal(generationFlows, 0, `fatal performance ${failure.status}/${failure.error} must block partial generation`);
    assert.deepEqual(calls.performanceIds, ['700001']);
    assert.deepEqual(calls.professorIds, ['700001']);
    assert.equal(calls.paths.at(-1), '/api/questoes/700001/desempenho', 'no further TEC request may follow a session or quota failure');
    assert.equal(h.run('getMarkedQuestions', h.context).length, 2);
  }
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
  assert.deepEqual(calls.ordinals, [1, 2, 1]);
  assert.ok(!messages.some(message => /Não foi possível|Nenhuma questão foi coletada/i.test(message)));
  assert.deepEqual(clone(h.run('getMarkedQuestions', h.context)), [{ number: 1, id: '700001' }]);
});

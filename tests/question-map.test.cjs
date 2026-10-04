const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const sourcePath = path.join(__dirname, '..', 'tec-to-anki-raw.user.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

function question(id, correct = true) {
  return {
    idQuestao: id, bancaSigla: 'CEBRASPE', concursoAno: 2026,
    nomeMateria: 'Direito Tributário', nomeAssunto: 'Obrigação tributária',
    enunciado: '<p>A obrigação principal surge com o fato gerador.</p>',
    tipoQuestao: 'CERTO_ERRADO', alternativas: ['Certo', 'Errado'],
    numeroAlternativaCorreta: 1,
    alternativaSelecionada: correct == null ? 0 : correct ? 1 : 2,
    correcaoQuestao: correct,
  };
}

/** Execute the production IIFE, excluding only its automatic startup.
 * Dependencies are replaced inside the IIFE for offline integration tests;
 * the selection, extraction, orchestration and generation functions are real.
 */
function harness(t, options = {}) {
  const storage = options.storage || new Map();
  const questions = options.questions || [question(500001), question(500002, false), question(500003, null)];
  const cadernoId = options.cadernoId || 104859318;
  const dom = new JSDOM('<!doctype html><body><div ng-controller="ResolverController"><p id="question-position"></p><div class="questao-enunciado" tec-formatar-html="vm.questao.enunciado"></div></div></body>', {
    url: options.url || `https://www.tecconcursos.com.br/questoes/cadernos/${cadernoId}/resolver`,
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true, get() { return this.textContent; }, set(value) { this.textContent = value; },
  });
  const controller = { caderno: { idCaderno: cadernoId, totalQuestoes: questions.length }, questoes: questions };
  let position = 1;
  const navigation = [], nativeJumps = [], arrowMoves = [];
  function navigate(number) {
    position = Math.max(1, Math.min(questions.length, number));
    navigation.push(position);
    controller.questao = questions[position - 1];
    window.document.getElementById('question-position').textContent = `Questão ${position} de ${questions.length}`;
    window.document.querySelector('.questao-enunciado').innerHTML = controller.questao.enunciado;
  }
  navigate(options.position || 1);
  window.document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { arrowMoves.push(1); navigate(position + 1); }
    if (event.key === 'ArrowLeft') { arrowMoves.push(-1); navigate(position - 1); }
  });
  if (options.nativeJump) {
    const control = window.document.createElement('button');
    control.title = 'Acessar questão pelo número';
    window.document.body.appendChild(control);
    if (options.nativeJump === 'labelledby') {
      control.removeAttribute('title');
      const label = window.document.createElement('span');
      label.id = 'native-jump-label';
      label.textContent = 'Acessar questão pelo número';
      label.hidden = true;
      window.document.body.appendChild(label);
      control.setAttribute('aria-labelledby', label.id);
    }
    control.addEventListener('click', () => {
      const dialog = window.document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.innerHTML = `<h3>Acessar questão por número</h3><p>Deseja acessar qual questão do caderno? (número entre 1 e ${questions.length})</p><input type="text" value="${position}"><button>OK</button><button>CANCELAR</button>`;
      window.document.body.appendChild(dialog);
      const [confirm, cancel] = dialog.querySelectorAll('button');
      confirm.addEventListener('click', () => {
        const number = Number(dialog.querySelector('input').value);
        nativeJumps.push(number);
        if (options.nativeJump !== 'fails') navigate(number);
        dialog.remove();
      });
      cancel.addEventListener('click', () => dialog.remove());
    });
  }
  window.unsafeWindow = window;
  window.angular = { element: () => ({ scope: () => ({ vm: controller }) }) };
  window.GM_getValue = (key, fallback) => storage.has(key) ? clone(storage.get(key)) : clone(fallback);
  window.GM_setValue = (key, value) => storage.set(key, clone(value));
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = () => { throw new Error('Unexpected network request in offline test'); };
  window.confirm = () => true;
  window.prompt = () => { throw new Error('Manual selection must not ask for the number of errors'); };
  window.console = { log() {}, warn() {}, error() {} };

  const source = fs.readFileSync(sourcePath, 'utf8');
  const startup = source.lastIndexOf('  if (document.readyState');
  assert.ok(startup > 0, 'production automatic startup marker must remain identifiable');
  const instrumented = source.slice(0, startup) + `
    window.__tecTest = {
      run: (name, ...args) => eval(name)(...args),
      override: (name, value) => { eval(name + ' = value'); },
      read: name => eval(name),
    };
  })();`;
  vm.runInContext(instrumented, dom.getInternalVMContext(), { filename: sourcePath });
  const api = window.__tecTest;
  api.override('delay', async () => {});
  api.override('updateStatusDot', async () => {});
  return { window, document: window.document, storage, controller, questions, navigate, navigation, nativeJumps, arrowMoves, api,
    run: (name, ...args) => api.run(name, ...args),
    override: (name, value) => api.override(name, value),
  };
}

test('manual choice of a correct answer survives navigation and reload without changing its result', t => {
  const h = harness(t);
  const context = h.run('getQuestionMapContext');
  assert.equal(context.key, 'caderno:104859318');
  assert.equal(context.currentNumber, 1);
  assert.equal(context.total, 3);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  assert.equal(h.run('extractQuestionData').errou, false);
  assert.equal(h.controller.questao.correcaoQuestao, true);
  h.navigate(2);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 2, true);
  h.navigate(1);
  h.run('syncQuestionMap');
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [1, 2]);

  const refreshed = harness(t, { storage: h.storage, position: 1 });
  refreshed.run('syncQuestionMap');
  assert.deepEqual(clone(refreshed.run('getMarkedQuestions')).map(q => q.number), [1, 2]);
  assert.equal(refreshed.run('extractQuestionData').errou, false);
  refreshed.run('setQuestionCardSelection', 1, false);
  assert.deepEqual(clone(refreshed.run('getMarkedQuestions')).map(q => q.number), [2]);
});

test('choice made before answering is retained after the answer arrives', t => {
  const h = harness(t, { position: 3 });
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 3, true);
  h.controller.questao.correcaoQuestao = true;
  h.controller.questao.alternativaSelecionada = 1;
  h.run('syncQuestionMap');
  assert.equal(h.run('loadQuestionMap', h.run('getQuestionMapContext')).entries['3'].selected, true);
  assert.equal(h.run('extractQuestionData').errou, false);
});

test('a standalone question remains selectable from its URL when Angular is unavailable', t => {
  const h = harness(t, { url: 'https://www.tecconcursos.com.br/questoes/500001' });
  h.window.angular = undefined;
  const context = h.run('getQuestionMapContext');
  assert.equal(context.key, 'questao:500001');
  assert.equal(context.currentId, '500001');
  assert.equal(context.currentNumber, 1);
  assert.equal(context.total, 1);
  h.run('injectToolbar');
  h.run('syncQuestionMap');
  const checkbox = h.document.getElementById('tec-mark-current');
  assert.equal(checkbox.disabled, false);
  checkbox.checked = true;
  checkbox.dispatchEvent(new h.window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(h.run('getMarkedQuestions')), [{ number: 1, id: '500001' }]);
});

test('the same question belongs to an independent selection in each caderno', t => {
  const storage = new Map();
  const first = harness(t, { storage, cadernoId: 111 });
  first.run('syncQuestionMap');
  first.run('setQuestionCardSelection', 1, true);
  const second = harness(t, { storage, cadernoId: 222 });
  second.run('syncQuestionMap');
  assert.equal(second.run('getMarkedQuestions').length, 0);
  second.run('setQuestionCardSelection', 2, true);
  assert.deepEqual(clone(first.run('getMarkedQuestions')).map(q => q.number), [1]);
  assert.deepEqual(clone(second.run('getMarkedQuestions')).map(q => q.number), [2]);
});

test('a known marked question follows its ID when the caderno is reordered and can be unmarked', t => {
  const h = harness(t);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  const original = h.questions[0];
  h.questions[0] = h.questions[1];
  h.questions[1] = original;
  h.navigate(1);
  h.run('syncQuestionMap');
  assert.equal(h.run('getMarkedQuestions').length, 1);
  assert.equal(h.run('getMarkedQuestions')[0].id, '500001');
  h.navigate(2);
  h.run('syncQuestionMap');
  assert.deepEqual(clone(h.run('getMarkedQuestions')), [{ number: 2, id: '500001' }]);
  h.run('setQuestionCardSelection', 2, false);
  assert.equal(h.run('getMarkedQuestions').length, 0);
});

test('question map opens from the toolbar and current checkbox persists the choice', t => {
  const h = harness(t);
  h.run('injectToolbar');
  const button = h.document.getElementById('tec-btn-map');
  assert.ok(button);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  button.click();
  const panel = h.document.getElementById('tec-question-map');
  assert.ok(panel);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  const checkbox = h.document.getElementById('tec-mark-current');
  assert.ok(checkbox);
  checkbox.checked = true;
  checkbox.dispatchEvent(new h.window.Event('change', { bubbles: true }));
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [1]);
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  button.click();
  assert.equal(h.document.getElementById('tec-mark-current').checked, true);
});

test('More tools closes with Escape and outside interaction and shares space with the map', t => {
  const h = harness(t);
  h.run('injectToolbar');
  const more = h.document.getElementById('tec-btn-more');
  const menu = h.document.getElementById('tec-tools-menu');
  const map = h.document.getElementById('tec-btn-map');
  assert.ok(more);
  assert.ok(menu.hidden);
  assert.equal(more.getAttribute('aria-controls'), menu.id);
  assert.equal(more.getAttribute('aria-expanded'), 'false');

  more.click();
  assert.equal(menu.hidden, false);
  assert.equal(more.getAttribute('aria-expanded'), 'true');
  const action = h.document.getElementById('tec-btn-save');
  action.focus();
  action.dispatchEvent(new h.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(menu.hidden);
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  assert.equal(h.document.activeElement, more);

  more.click();
  const outside = h.document.createElement('button');
  h.document.body.appendChild(outside);
  outside.focus();
  outside.dispatchEvent(new h.window.MouseEvent('pointerdown', { bubbles: true }));
  outside.click();
  assert.ok(menu.hidden);
  assert.equal(more.getAttribute('aria-expanded'), 'false');
  assert.equal(h.document.activeElement, outside);

  more.click();
  map.click();
  const panel = h.document.getElementById('tec-question-map');
  assert.ok(menu.hidden);
  assert.equal(panel.hidden, false);
  assert.equal(map.getAttribute('aria-expanded'), 'true');
  more.click();
  assert.equal(menu.hidden, false);
  assert.ok(panel.hidden);
  assert.equal(map.getAttribute('aria-expanded'), 'false');
});

test('choosing a More tools action after toolbar reinsertion invokes it once and closes the disclosure', t => {
  const h = harness(t);
  let invoked = 0;
  h.override('processBatchQuestions', async () => { invoked++; });
  h.run('injectToolbar');
  h.document.getElementById('tec-anki-toolbar').remove();
  h.run('injectToolbar');
  const more = h.document.getElementById('tec-btn-more');
  const menu = h.document.getElementById('tec-tools-menu');
  more.click();
  assert.equal(menu.hidden, false);
  const action = h.document.getElementById('tec-btn-batch');
  action.dispatchEvent(new h.window.MouseEvent('pointerdown', { bubbles: true }));
  assert.equal(menu.hidden, false, 'reinserted toolbar controls must not count as outside interaction');
  action.click();
  assert.equal(invoked, 1);
  assert.ok(menu.hidden);
  assert.equal(more.getAttribute('aria-expanded'), 'false');
});

test('automatic click invokes a delegated handler once even with Angular and jQuery available', t => {
  const h = harness(t);
  const button = h.document.createElement('button');
  h.document.body.appendChild(button);
  let clicks = 0, angularClicks = 0, jqueryClicks = 0;
  h.document.addEventListener('click', () => clicks++);
  h.window.angular.element = () => ({ triggerHandler: () => angularClicks++, scope: () => ({ $apply() {} }) });
  h.window.jQuery = () => ({ trigger: () => jqueryClicks++ });
  h.run('realClick', button);
  assert.equal(clicks, 1);
  assert.equal(angularClicks, 0);
  assert.equal(jqueryClicks, 0);
});

test('keyboard navigation triggers one keydown and keyup without skipping a question', t => {
  const h = harness(t);
  const counts = { keydown: 0, keypress: 0, keyup: 0 };
  for (const type of Object.keys(counts)) h.document.addEventListener(type, () => counts[type]++);
  h.run('simulateKey', 'ArrowRight', 39);
  assert.deepEqual(counts, { keydown: 1, keypress: 0, keyup: 1 });
  assert.equal(h.controller.questao.idQuestao, 500002);
});

test('automatic pacing is variable within each range and stops promptly after cancellation', async t => {
  const h = harness(t);
  h.window.Math.random = () => 0;
  assert.equal(h.run('randomTecDelay', 'navigate'), 1200);
  assert.equal(h.run('randomTecDelay', 'comment'), 650);
  h.window.Math.random = () => 0.99999;
  assert.equal(h.run('randomTecDelay', 'navigate'), 2800);
  assert.equal(h.run('randomTecDelay', 'comment'), 1400);
  const chunks = [];
  let running = true;
  h.override('delay', async ms => { chunks.push(ms); running = false; });
  assert.equal(await h.run('waitTecAction', 'navigate', () => running), false);
  assert.deepEqual(chunks, [100]);
  assert.equal(await h.run('waitTecAction', 'navigate', () => false), false);
  assert.deepEqual(chunks, [100]);
});

function offlinePipeline(h, decision = 'save') {
  const events = [];
  h.override('ensureCommentExpanded', async () => {});
  h.override('countExistingAnkiCards', async () => 0);
  h.override('fetchExistingCardFronts', async () => null);
  h.override('callAI', async () => assert.fail('marked generation must retain the configured dual pipeline'));
  h.override('callDualPipeline', async q => {
    events.push({ stage: 'dual', id: q.id, errou: q.errou });
    return { materia: q.materia, subtopico: q.assunto, erro_identificado: 'Conceito', cards: [{ tipo: 'qa', frente: 'Quando surge a obrigação principal?', verso: 'Com o fato gerador.' }] };
  });
  h.override('showBatchReviewModal', async (results, errors) => {
    assert.equal(events.some(event => event.stage === 'anki' || event.stage === 'obsidian'), false,
      'no external save may precede card review');
    events.push({ stage: 'review', ids: results.map(r => r.questionData.id), errors: errors.length });
    return decision;
  });
  h.override('addCardsToAnki', async (result, q) => {
    assert.equal(events.some(event => event.stage === 'review'), true);
    events.push({ stage: 'anki', id: q.id });
    return { added: result.cards.length, total: result.cards.length, deckName: 'Teste' };
  });
  h.override('saveToObsidian', async q => {
    assert.equal(events.some(event => event.stage === 'review'), true);
    events.push({ stage: 'obsidian', id: q.id });
    return { method: 'rest' };
  });
  return events;
}

async function confirmCollectionSelection(h, expectedCount = 2) {
  // Allow the real asynchronous navigation/extraction flow to reach its modal.
  for (let attempt = 0; attempt < 100; attempt++) {
    const button = h.document.querySelector('.tec-modal-overlay [data-action="generate"]');
    if (button) {
      const checkboxes = [...h.document.querySelectorAll('.tec-batch-select-item input[type="checkbox"]')];
      assert.equal(checkboxes.length, expectedCount);
      assert.ok(checkboxes.every(checkbox => checkbox.checked), 'explicitly marked correct answers must remain selected');
      button.click();
      return;
    }
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('marked collection did not reach its selection review');
}

test('marked collection visits only selected questions and uses dual generation before review and save', async t => {
  const h = harness(t, { questions: [question(500001), question(500002, false), question(500003)], position: 2 });
  const events = offlinePipeline(h);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  h.run('setQuestionCardSelection', 3, true);
  const processing = h.run('processMarkedQuestions');
  await confirmCollectionSelection(h);
  await processing;
  assert.deepEqual(events.filter(e => e.stage === 'dual'), [
    { stage: 'dual', id: '500001', errou: false },
    { stage: 'dual', id: '500003', errou: false },
  ]);
  assert.deepEqual(events.filter(e => e.stage === 'anki').map(e => e.id), ['500001', '500003']);
  assert.deepEqual(events.filter(e => e.stage === 'obsidian').map(e => e.id), ['500001', '500003']);
  assert.equal(events.find(e => e.stage === 'review').errors, 0);
  assert.equal(h.run('getMarkedQuestions').length, 0, 'successful saves clear the completed selections');
});

test('cancelling marked card review prevents every Anki and Obsidian save', async t => {
  const h = harness(t, { questions: [question(500001), question(500002, false), question(500003)] });
  const events = offlinePipeline(h, 'cancel');
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  h.run('setQuestionCardSelection', 3, true);
  const processing = h.run('processMarkedQuestions');
  await confirmCollectionSelection(h);
  await processing;
  assert.equal(events.filter(e => e.stage === 'dual').length, 2);
  assert.equal(events.filter(e => e.stage === 'review').length, 1);
  assert.equal(events.some(e => e.stage === 'anki' || e.stage === 'obsidian'), false);
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [1, 3]);
});

test('stopping during automatic navigation keeps selections and does not generate partial collection', async t => {
  const h = harness(t, { questions: [question(500001), question(500002, false), question(500003)] });
  const events = offlinePipeline(h);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  h.run('setQuestionCardSelection', 3, true);
  h.override('delay', async ms => {
    if (ms === 100) h.override('batchRunning', false);
  });
  await h.run('processMarkedQuestions');
  assert.equal(events.some(e => ['dual', 'review', 'anki', 'obsidian'].includes(e.stage)), false);
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [1, 3]);
  assert.equal(h.controller.questao.idQuestao, 500001);
  assert.equal(h.api.read('batchBusy'), false);
});

test('a failed external save keeps that question selected while successful questions are cleared', async t => {
  const h = harness(t, { questions: [question(500001), question(500002, false), question(500003)] });
  offlinePipeline(h);
  h.override('addCardsToAnki', async (result, q) => {
    if (q.id === '500001') throw new Error('Anki offline');
    return { added: result.cards.length, total: result.cards.length, deckName: 'Teste' };
  });
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  h.run('setQuestionCardSelection', 3, true);
  const processing = h.run('processMarkedQuestions');
  await confirmCollectionSelection(h);
  await processing;
  assert.deepEqual(clone(h.run('getMarkedQuestions')), [{ number: 1, id: '500001' }]);
});

test('the existing errors action retains its wrong-answer filter through the shared generation flow', async t => {
  const h = harness(t, { questions: [question(500001), question(500002, false), question(500003)] });
  const events = offlinePipeline(h);
  h.controller.caderno.totalErros = 1;
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 1, true);
  const processing = h.run('processBatchQuestions');
  await confirmCollectionSelection(h, 1);
  await processing;
  assert.deepEqual(events.filter(e => e.stage === 'dual'), [{ stage: 'dual', id: '500002', errou: true }]);
  assert.deepEqual(events.filter(e => e.stage === 'anki').map(e => e.id), ['500002']);
  assert.deepEqual(clone(h.run('getMarkedQuestions')), [{ number: 1, id: '500001' }]);
});

const notebook17 = () => Array.from({ length: 17 }, (_, index) => question(500001 + index));

test('native access by number jumps directly from question 5 to selected targets and restores 5', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: true });
  h.override('ensureCommentExpanded', async () => {});
  h.override('batchRunning', true);
  const result = await h.run('collectQuestionTargets', [{ number: 8, id: null }, { number: 17, id: null }], h.run('getQuestionMapContext'));
  assert.deepEqual(h.navigation, [5, 8, 17, 5]);
  assert.deepEqual(h.nativeJumps, [8, 17, 5]);
  assert.deepEqual(h.arrowMoves, []);
  assert.deepEqual(clone(result.collected).map(q => q.id), ['500008', '500017']);
  assert.ok(result.collected.every(q => q.errou === false));
  assert.equal(result.cancelled, false);
  assert.equal(result.missing.length, 0);
});

test('without native access the arrow fallback covers the minimum selected interval without visiting question 1', async t => {
  const h = harness(t, { questions: notebook17(), position: 5 });
  h.override('ensureCommentExpanded', async () => {});
  h.override('batchRunning', true);
  const result = await h.run('collectQuestionTargets', [{ number: 8, id: null }, { number: 17, id: null }], h.run('getQuestionMapContext'));
  assert.equal(Math.min(...h.navigation), 5);
  assert.equal(h.arrowMoves.length, 24);
  assert.equal(h.navigation.at(-1), 5);
  assert.deepEqual(clone(result.collected).map(q => q.id), ['500008', '500017']);
  assert.deepEqual(h.nativeJumps, []);
});

test('native access also recognizes an icon button named by its accessible label', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: 'labelledby' });
  h.override('ensureCommentExpanded', async () => {});
  h.override('batchRunning', true);
  const result = await h.run('collectQuestionTargets', [{ number: 8, id: null }], h.run('getQuestionMapContext'));
  assert.deepEqual(h.nativeJumps, [8, 5]);
  assert.deepEqual(h.arrowMoves, []);
  assert.equal(result.collected.length, 1);
});

test('the target route starts with a selected current question and otherwise approaches the nearest extreme', t => {
  const h = harness(t);
  const targets = [{ number: 2, id: '500002' }, { number: 5, id: '500005' }, { number: 17, id: '500017' }];
  assert.deepEqual(clone(h.run('planQuestionTargetRoute', targets, 5, 17)).map(q => q.number), [5, 2, 17]);
  assert.deepEqual(clone(h.run('planQuestionTargetRoute', targets, 15, 17)).map(q => q.number), [17, 5, 2]);
});

test('a complete roster verified against the current question locates a marked ID at its reordered ordinal', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: true });
  h.override('ensureCommentExpanded', async () => {});
  h.override('batchRunning', true);
  const result = await h.run('collectQuestionTargets', [{ number: 3, id: '500008' }], h.run('getQuestionMapContext'));
  assert.deepEqual(h.nativeJumps, [8, 5]);
  assert.deepEqual(clone(result.collected).map(q => q.id), ['500008']);
});

test('a native jump that fails confirmation never falls back to arrows or sends cards to AI', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: 'fails' });
  const events = offlinePipeline(h);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 8, true);
  await h.run('processMarkedQuestions');
  assert.deepEqual(h.nativeJumps, [8]);
  assert.deepEqual(h.arrowMoves, []);
  assert.equal(events.length, 0);
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [8]);
});

test('a missing marked ID prevents partial generation and retains all selections', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: true });
  const events = offlinePipeline(h);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 8, true);
  h.run('setQuestionCardSelection', 17, true);
  const key = `tecQuestionMap:v1:${h.run('getQuestionMapContext').key}`;
  const state = h.storage.get(key);
  state.entries['8'].id = '999999';
  await h.run('processMarkedQuestions');
  assert.deepEqual(h.navigation, [5, 8, 17, 5]);
  assert.equal(events.length, 0);
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [8, 17]);
});

test('stopping between direct jumps generates nothing and issues no return jump', async t => {
  const h = harness(t, { questions: notebook17(), position: 5, nativeJump: true });
  const events = offlinePipeline(h);
  h.run('syncQuestionMap');
  h.run('setQuestionCardSelection', 8, true);
  h.run('setQuestionCardSelection', 17, true);
  h.override('delay', async ms => {
    if (ms === 100 && h.navigation.includes(8)) h.override('batchRunning', false);
  });
  await h.run('processMarkedQuestions');
  assert.deepEqual(h.navigation, [5, 8]);
  assert.deepEqual(h.nativeJumps, [8]);
  assert.equal(events.length, 0);
  assert.deepEqual(clone(h.run('getMarkedQuestions')).map(q => q.number), [8, 17]);
});

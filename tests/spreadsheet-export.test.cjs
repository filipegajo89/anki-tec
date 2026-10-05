const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const sourcePath = path.join(__dirname, '..', 'tec-to-anki-raw.user.js');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const ok = json => ({ ok: true, status: 200, json });
const failed = (status, error = '') => ({ ok: false, status, json: { error }, error });

function apiQuestion(id = 500001) {
  return {
    idQuestao: id, bancaSigla: 'CEBRASPE', orgaoNome: 'Receita Federal',
    cargoSigla: 'Auditor Fiscal', concursoAno: 2026, nomeMateria: 'Direito Tributário',
    nomeAssunto: 'Obrigação tributária', tipoQuestao: 'MULTIPLA_ESCOLHA',
    enunciado: '<p>Qual obrigação surge com o fato gerador?</p>',
    alternativas: ['<p>Principal</p>', '<p>Acessória</p>'],
    numeroAlternativaCorreta: 1, alternativaSelecionada: 1, correcaoQuestao: true,
  };
}

function sections(overrides = {}) {
  return {
    comment: ok({ comentario: {
      nomeProfessor: 'Professora Ágata', textoComentario: '<p>Comentário completo: ação e obrigação.</p>',
      dataPublicacaoComentario: { '@class': 'sql-timestamp', $: '04/10/2026 08:30:00' },
    } }),
    performance: ok({ desempenho: {
      desempenhoGeral: { acertos: 0, erros: 0, tempoMedio: 0 }, dificuldade: 'Muito Fácil',
      desempenhoAluno: { quantidadeAcertos: 0, quantidadeErros: 0, resolucoes: [] },
    } }),
    forum: ok({ comentarios: { pageComentarios: { resultCount: 4, list: [
      { apelidoUsuario: 'Primeiro', dataPublicacao: '01/01/2026', quantidadeVoto: 1, comentario: '<p>Primeiro por data</p>' },
      { apelidoUsuario: 'Segundo', dataPublicacao: { '@class': 'sql-timestamp', $: '02/01/2026 10:00:00' }, quantidadeVoto: 90, comentario: '<p>Segundo por data</p>' },
      { apelidoUsuario: 'Terceiro', dataPublicacao: '03/01/2026', quantidadeVoto: 50, comentario: '<p>Terceiro por data</p>' },
      { apelidoUsuario: 'Quarto', dataPublicacao: '04/01/2026', quantidadeVoto: 100, comentario: '<p>Quarto por data</p>' },
    ] } } }),
    ...overrides,
  };
}

function harness(t, options = {}) {
  const storage = options.storage || new Map();
  const dom = new JSDOM('<!doctype html><body><div class="questao-enunciado" tec-formatar-html="vm.questao.enunciado"></div></body>', {
    url: 'https://www.tecconcursos.com.br/questoes/cadernos/111/resolver',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true, get() { return this.textContent; }, set(value) { this.textContent = value; },
  });
  window.unsafeWindow = window;
  const controller = { questao: apiQuestion(), caderno: { idCaderno: 111 } };
  window.angular = { element: () => ({ scope: () => ({ vm: controller }) }) };
  window.GM_getValue = (key, fallback) => storage.has(key) ? clone(storage.get(key)) : clone(fallback);
  window.GM_setValue = (key, value) => storage.set(key, clone(value));
  window.GM_registerMenuCommand = () => {};
  window.GM_addStyle = () => {};
  window.GM_xmlhttpRequest = () => { throw new Error('Export must not contact AI, Anki or Obsidian'); };
  window.fetch = async () => { throw new Error('Unexpected network request in offline export test'); };
  window.console = { log() {}, warn() {}, error() {} };
  window.AbortController = globalThis.AbortController;
  const source = fs.readFileSync(sourcePath, 'utf8');
  const startup = source.lastIndexOf('  if (document.readyState');
  assert.ok(startup > 0, 'production automatic startup marker must remain identifiable');
  vm.runInContext(source.slice(0, startup) + `
    window.__tecExportTest = {
      run: (name, ...args) => eval(name)(...args),
      override: (name, value) => { eval(name + ' = value'); },
    };
  })();`, dom.getInternalVMContext(), { filename: sourcePath });
  const api = window.__tecExportTest;
  api.override('delay', async () => {});
  return {
    window, controller, storage,
    run: (name, ...args) => api.run(name, ...args),
    override: (name, value) => api.override(name, value),
  };
}

function record(h, q = apiQuestion(), target = { number: 1, id: '500001' }, parts = sections(), order = 'votos') {
  return h.run('buildTecExportRecord', q, target, { key: 'caderno:111' }, parts, order);
}

// Read quoted CSV independently of the export implementation, including multiline cells.
function parseCsv(csv) {
  const text = csv.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ';') { row.push(field); field = ''; }
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  assert.equal(quoted, false, 'CSV must close every quoted cell');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

test('API export preserves zero performance values, raw history, accents and missing answer key', t => {
  const h = harness(t);
  const q = apiQuestion();
  delete q.numeroAlternativaCorreta;
  q.alternativaSelecionada = 0;
  const parts = sections();
  const result = record(h, q, undefined, parts);
  const serialized = JSON.stringify(result);
  assert.ok(!['A', 'Principal'].includes(result.alternativaCorreta || result.gabarito), 'absence must not invent answer A');
  assert.deepEqual(clone(result.rawQuestao), q);
  assert.deepEqual(clone(result.desempenho), parts.performance.json.desempenho);
  assert.equal(result.desempenho.desempenhoGeral.tempoMedio, 0);
  assert.equal(result.desempenho.desempenhoAluno.quantidadeErros, 0);
  assert.ok(serialized.includes('Obrigação tributária'));
  assert.equal(result.comentarioProfessor.professor, 'Professora Ágata');
  assert.equal(result.comentarioProfessor.data, '04/10/2026 08:30:00');
  assert.equal(result.status.questao, 'OK');
});

test('HTML export retains image references, decoded entities and CDATA content', t => {
  const h = harness(t);
  const html = '<p>ação &amp; obrigação</p><p>segunda linha</p><img src="https://cdn.example.test/figura.png" alt="fórmula"><![CDATA[Texto adicional: α < β]]>';
  const text = h.run('exportHtmlText', html);
  assert.ok(text.includes('ação & obrigação'));
  assert.ok(text.includes('segunda linha'));
  assert.ok(text.includes('https://cdn.example.test/figura.png'));
  assert.ok(text.includes('Texto adicional'));
  assert.ok(text.includes('α'));
  const result = record(h, apiQuestion(), undefined, sections({ comment: ok({ comentario: { textoComentario: html } }) }));
  assert.equal(result.comentarioProfessor.html, html);
  assert.ok(result.comentarioProfessor.texto.includes('figura.png'));
});

test('forum exports exactly two posts in the chosen date or vote order, never a third', t => {
  const h = harness(t);
  const byDate = record(h, apiQuestion(), undefined, sections(), 'data');
  const byVotes = record(h, apiQuestion(), undefined, sections(), 'votos');
  assert.equal(byDate.forum.length, 2);
  assert.deepEqual(clone(byDate.forum).map(post => post.usuario), ['Primeiro', 'Segundo']);
  assert.equal(byDate.forum[1].data, '02/01/2026 10:00:00');
  assert.equal(byVotes.forum.length, 2);
  assert.deepEqual(clone(byVotes.forum).map(post => post.usuario), ['Quarto', 'Segundo']);
  assert.ok(!JSON.stringify(byDate.forum).includes('Terceiro por data'));
});

test('both forum orders match TEC visibility: muted and minus-three posts are excluded while minus-two remains visible', t => {
  const h = harness(t);
  const parts = sections({ forum: ok({ comentarios: { pageComentarios: { resultCount: 4, list: [
    { apelidoUsuario: 'Silenciado', quantidadeVoto: 999, silenciado: true, comentario: '<p>Oculto por moderação</p>' },
    { apelidoUsuario: 'Menos três', quantidadeVoto: -3, silenciado: false, comentario: '<p>Oculto por pontuação</p>' },
    { apelidoUsuario: 'Menos dois', quantidadeVoto: -2, silenciado: false, comentario: '<p>Visível no limite</p>' },
    { apelidoUsuario: 'Positivo', quantidadeVoto: 10, silenciado: false, comentario: '<p>Visível com pontuação positiva</p>' },
  ] } } }) });
  for (const order of ['data', 'votos']) {
    const result = record(h, apiQuestion(), undefined, parts, order);
    assert.equal(result.forum.length, 2);
    assert.deepEqual(clone(result.forum).map(post => post.usuario), order === 'data'
      ? ['Menos dois', 'Positivo'] : ['Positivo', 'Menos dois']);
    assert.equal(result.forum.find(post => post.usuario === 'Menos dois').votos, -2);
    assert.ok(!JSON.stringify(result.forum).includes('Oculto'));
    assert.equal(result.status.forum, 'OK');
  }
});

test('optional endpoint failures retain the question and distinct diagnostic statuses', t => {
  const h = harness(t);
  const result = record(h, apiQuestion(), undefined, sections({
    comment: failed(400, 'Limite de comentários grátis atingido'),
    performance: failed(503, 'Indisponível temporariamente'),
    forum: failed(429, 'Muitas requisições'),
  }));
  assert.equal(result.status.questao, 'OK');
  assert.equal(result.rawQuestao.idQuestao, 500001);
  for (const field of ['comentario', 'desempenho', 'forum']) assert.notEqual(result.status[field], 'OK');
  assert.ok(result.diagnosticos.length >= 3);
  assert.ok(JSON.stringify(result).includes('Limite de comentários grátis atingido'));
  assert.ok(JSON.stringify(result).includes('429'));
});

test('HTTP 200 without a professor comment stays uncertain instead of silently complete', t => {
  const h = harness(t);
  const result = record(h, apiQuestion(), undefined, sections({ comment: ok({}) }));
  assert.equal(result.comentarioProfessor, null);
  assert.notEqual(result.status.comentario, 'OK');
});

test('a reordered caderno cannot attach another question to the selected ID', t => {
  const h = harness(t);
  const q = apiQuestion(900009);
  q.enunciado = '<p>CONTEUDO_DA_QUESTAO_ERRADA</p>';
  const result = record(h, q);
  assert.equal(String(result.idQuestao), '500001');
  assert.equal(result.rawQuestao, null);
  assert.notEqual(result.status.questao, 'OK');
  assert.ok(result.diagnosticos.length > 0);
  assert.ok(!JSON.stringify(result).includes('CONTEUDO_DA_QUESTAO_ERRADA'));
});

test('spreadsheet CSV round-trips Unicode, semicolons, quotes and multiline content with a BOM', t => {
  const h = harness(t);
  const result = record(h);
  const text = 'ação; revisão "80/20"\nsegunda linha\r\nterceira linha';
  result.enunciado = text;
  const csv = h.run('buildTecSpreadsheetCsv', [result]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.slice(1).startsWith('"'), 'CSV cells must be quoted');
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].length, rows[1].length);
  assert.ok(rows[1].includes(text));
  assert.ok(rows[1].some(value => value.includes('Professora Ágata')));
});

test('spreadsheet CSV shields formula prefixes in every user-supplied text column', t => {
  const h = harness(t);
  const result = record(h);
  const probes = ['=HYPERLINK("https://example.test")', '+SUM(1;1)', '-1+2', '@SUM(1)', '\t=1+1'];
  [result.enunciado, result.banca, result.orgao, result.cargo, result.assunto] = probes;
  result.comentarioProfessor.texto = '=WEBSERVICE("https://example.test")';
  result.forum[0].texto = '+SUM(3;4)';
  const rows = parseCsv(h.run('buildTecSpreadsheetCsv', [result]));
  for (const value of rows[1]) {
    assert.ok(!/^[\s\u0000-\u001f]*[=+@-]/.test(value), `unshielded formula cell: ${value}`);
  }
  for (const probe of probes) assert.ok(rows[1].some(value => value.includes(probe)), `preserve text of ${probe}`);
});

function stubCollector(h, options = {}) {
  const calls = [];
  let inFlight = 0, maxInFlight = 0;
  h.override('waitTecExportAction', async (_min, _max, shouldContinue = () => true) => Boolean(shouldContinue()));
  h.override('fetchTecExportJson', async (requestPath, shouldContinue = () => true) => {
    assert.ok(shouldContinue(), 'no request may start after cancellation');
    calls.push(requestPath);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    let response;
    const match = requestPath.match(/\/cadernos\/(\d+)\/questoes\/(\d+)/);
    if (match) response = ok({ questao: apiQuestion(options.mismatch ? 900009 : 500000 + Number(match[2])) });
    else if (/\/comentario(?:\?|$)/.test(requestPath)) response = sections().comment;
    else if (/\/desempenho(?:\?|$)/.test(requestPath)) response = sections().performance;
    else if (/\/comentarios-alunos\?/.test(requestPath)) response = sections().forum;
    else assert.fail(`unknown export endpoint ${requestPath}`);
    if (options.reply) response = options.reply(requestPath, response);
    if (options.onResponse) options.onResponse(requestPath, response);
    inFlight--;
    return response;
  });
  let navigation = 0;
  h.window.document.addEventListener('keydown', () => navigation++);
  for (const name of ['generateCards', 'addCardsToAnki', 'saveToObsidian', 'navigateToNextQuestion', 'navigateToPrevQuestion']) {
    h.override(name, () => { assert.fail(`spreadsheet export called ${name}`); });
  }
  return { calls, maxInFlight: () => maxInFlight, navigation: () => navigation };
}

test('collector requests each question and its optional sections sequentially without navigating or generating cards', async t => {
  const h = harness(t);
  const fake = stubCollector(h);
  const progress = [];
  const targets = [{ number: 1, id: '500001' }, { number: 2, id: '500002' }];
  const beforeQuestion = clone(h.controller.questao);
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111', total: 2 }, targets, {
    forumOrder: 'data', shouldContinue: () => true, onProgress: value => progress.push(value),
  });
  assert.equal(result.records.length, 2);
  assert.equal(result.completed, true);
  assert.equal(result.cancelled, false);
  assert.equal(fake.maxInFlight(), 1);
  assert.equal(fake.calls.length, 8);
  for (let i = 0; i < targets.length; i++) {
    const group = fake.calls.slice(i * 4, i * 4 + 4);
    assert.ok(group[0].includes(`/cadernos/111/questoes/${i + 1}?atualizarCronometro=false`));
    assert.ok(group[1].includes(`/questoes/${500001 + i}/comentario?`));
    assert.ok(group[2].includes(`/questoes/${500001 + i}/desempenho`));
    assert.ok(group[3].includes('ordenarPor=data'));
  }
  assert.equal(fake.navigation(), 0);
  assert.deepEqual(clone(h.controller.questao), beforeQuestion);
  assert.ok(progress.length > 0);
});

test('collector retains mismatch diagnostics and never fetches optional sections for the wrong ID', async t => {
  const h = harness(t);
  const fake = stubCollector(h, { mismatch: true });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }], { shouldContinue: () => true });
  assert.equal(fake.calls.length, 1);
  assert.equal(result.records.length, 1);
  assert.equal(String(result.records[0].idQuestao), '500001');
  assert.equal(result.records[0].rawQuestao, null);
  assert.notEqual(result.records[0].status.questao, 'OK');
});

test('cancelled collection keeps a checkpoint and stops before any later question request', async t => {
  const h = harness(t);
  let active = true;
  const fake = stubCollector(h);
  const targets = [{ number: 1, id: '500001' }, { number: 2, id: '500002' }];
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, {
    shouldContinue: () => active,
    onProgress: () => {
      if (fake.calls.some(requestPath => requestPath.includes('/comentarios-alunos?'))) active = false;
    },
  });
  assert.equal(result.cancelled, true);
  assert.equal(result.completed, false);
  assert.ok(result.records.length > 0, 'completed data survives a stop');
  assert.ok(!fake.calls.some(requestPath => requestPath.includes('/cadernos/111/questoes/2?')));
  const checkpoints = [...h.storage.entries()].filter(([key]) => key.startsWith('tecSpreadsheet:v1:'));
  assert.ok(checkpoints.length > 0);
  assert.ok(checkpoints.some(([, value]) => value.records.length === result.records.length));
});

test('export cache is isolated by caderno and forum ordering while a completed run can be resumed without refetching', async t => {
  const h = harness(t);
  const fake = stubCollector(h);
  const targets = [{ number: 1, id: '500001' }];
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'data', shouldContinue: () => true });
  assert.equal(first.records.length, 1);
  const firstCalls = fake.calls.length;
  const resumed = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'data', shouldContinue: () => true });
  assert.equal(resumed.records.length, 1);
  assert.equal(fake.calls.length, firstCalls, 'resume must reuse the checkpoint');
  await h.run('collectTecSpreadsheet', { key: 'caderno:222' }, targets, { forumOrder: 'data', shouldContinue: () => true });
  assert.ok(fake.calls.length > firstCalls, 'another caderno needs its own collection');
  const beforeVotes = fake.calls.length;
  await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', shouldContinue: () => true });
  assert.ok(fake.calls.length > beforeVotes, 'another forum order cannot reuse stale posts');
  assert.ok(h.storage.has('tecSpreadsheet:v1:caderno:111:data'));
  assert.ok(h.storage.has('tecSpreadsheet:v1:caderno:111:votos'));
  assert.ok(h.storage.has('tecSpreadsheet:v1:caderno:222:data'));
});

test('rate limiting pauses the collector with the question and quota checkpoint intact', async t => {
  const h = harness(t);
  const fake = stubCollector(h, {
    reply: (requestPath, response) => /\/comentario\?/.test(requestPath) ? failed(429, 'Limite temporário do TEC') : response,
  });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }, { number: 2, id: '500002' }], { shouldContinue: () => true });
  assert.equal(result.paused, true);
  assert.equal(result.completed, false);
  assert.equal(result.cancelled, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].status.questao, 'OK');
  assert.ok(result.reason.includes('429'));
  assert.ok(result.reason.includes('Limite temporário'));
  assert.equal(fake.calls.length, 2, 'quota must stop later endpoint requests');
  assert.equal(h.storage.get('tecSpreadsheet:v1:caderno:111:votos').records.length, 1);
});

test('a forbidden base request pauses before later targets instead of repeating an unauthorized session', async t => {
  const h = harness(t);
  const fake = stubCollector(h, {
    reply: (requestPath, response) => /\/cadernos\//.test(requestPath) ? failed(403, 'Sessão não autorizada') : response,
  });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }, { number: 2, id: '500002' }], { shouldContinue: () => true });
  assert.equal(result.paused, true);
  assert.equal(result.completed, false);
  assert.equal(fake.calls.length, 1);
  assert.equal(result.records.length, 1);
  assert.notEqual(result.records[0].status.questao, 'OK');
  assert.ok(result.reason);
  assert.ok(JSON.stringify(result.records[0].diagnosticos).includes('403'));
});

test('a professor quota opens a per-endpoint circuit while performance and forum continue', async t => {
  const h = harness(t);
  const fake = stubCollector(h, {
    reply: (requestPath, response) => /\/comentario\?/.test(requestPath) ? failed(400, 'Limite de comentários grátis atingido') : response,
  });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }, { number: 2, id: '500002' }], { shouldContinue: () => true });
  assert.equal(result.records.length, 2);
  assert.equal(fake.calls.filter(requestPath => /\/comentario\?/.test(requestPath)).length, 1);
  for (const row of result.records) {
    assert.equal(row.status.desempenho, 'OK');
    assert.equal(row.status.forum, 'OK');
    assert.notEqual(row.status.comentario, 'OK');
    assert.ok(JSON.stringify(row.diagnosticos).includes('Limite de comentários grátis atingido'));
  }
});

test('a resumed retry that pauses cannot erase previously successful downstream sections', async t => {
  const h = harness(t);
  const targets = [{ number: 1, id: '500001' }];
  stubCollector(h, {
    reply: (requestPath, response) => /\/comentario\?/.test(requestPath) ? failed(400, 'Comentário indisponível') : response,
  });
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { shouldContinue: () => true });
  assert.equal(first.records[0].status.desempenho, 'OK');
  assert.equal(first.records[0].status.forum, 'OK');
  const successfulPerformance = clone(first.records[0].desempenho);
  const successfulForum = clone(first.records[0].forum);
  const retry = stubCollector(h, {
    reply: (requestPath, response) => /\/comentario\?/.test(requestPath) ? failed(429, 'Limite temporário') : response,
  });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { resume: true, shouldContinue: () => true });
  assert.equal(result.paused, true);
  assert.equal(retry.calls.length, 1, 'retry only the unsuccessful section');
  assert.equal(result.records[0].status.desempenho, 'OK');
  assert.equal(result.records[0].status.forum, 'OK');
  assert.deepEqual(clone(result.records[0].desempenho), successfulPerformance);
  assert.deepEqual(clone(result.records[0].forum), successfulForum);
  const checkpoint = h.storage.get('tecSpreadsheet:v1:caderno:111:votos');
  assert.deepEqual(checkpoint.records[0].desempenho, successfulPerformance);
  assert.deepEqual(checkpoint.records[0].forum, successfulForum);
});

test('fresh collection replaces completed cached data and reflects an updated answer', async t => {
  const h = harness(t);
  const targets = [{ number: 1, id: '500001' }];
  const fake = stubCollector(h);
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { shouldContinue: () => true });
  assert.equal(first.records[0].resultado, 'Acerto');
  const firstCalls = fake.calls.length;
  const refreshedFake = stubCollector(h, {
    reply: (requestPath, response) => {
      if (/\/cadernos\//.test(requestPath)) {
        response.json.questao.correcaoQuestao = false;
        response.json.questao.alternativaSelecionada = 2;
      }
      return response;
    },
  });
  const refreshed = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { resume: false, shouldContinue: () => true });
  assert.equal(refreshedFake.calls.length, firstCalls);
  assert.equal(refreshed.records[0].resultado, 'Erro');
  assert.equal(refreshed.records[0].respostaAluno, 'B');
});

test('cancelled retries leave successful sections in the saved checkpoint', async t => {
  const h = harness(t);
  const targets = [{ number: 1, id: '500001' }];
  stubCollector(h, {
    reply: (requestPath, response) => /\/comentario\?/.test(requestPath) ? failed(400, 'Comentário indisponível') : response,
  });
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { shouldContinue: () => true });
  const performance = clone(first.records[0].desempenho);
  const forum = clone(first.records[0].forum);
  let active = true;
  const retry = stubCollector(h);
  const stopped = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, {
    resume: true, shouldContinue: () => active,
    onProgress: () => { active = false; },
  });
  assert.equal(stopped.cancelled, true);
  assert.equal(stopped.completed, false);
  assert.equal(retry.calls.length, 0);
  assert.deepEqual(clone(stopped.records[0].desempenho), performance);
  assert.deepEqual(clone(stopped.records[0].forum), forum);
  const checkpoint = h.storage.get('tecSpreadsheet:v1:caderno:111:votos');
  assert.deepEqual(checkpoint.records[0].desempenho, performance);
  assert.deepEqual(checkpoint.records[0].forum, forum);
});

test('a transient optional error retries that endpoint once without overlapping requests', async t => {
  const h = harness(t);
  let performanceAttempts = 0;
  const fake = stubCollector(h, {
    reply: (requestPath, response) => {
      if (/\/desempenho$/.test(requestPath) && ++performanceAttempts === 1) return failed(503, 'Tente mais tarde');
      return response;
    },
  });
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }], { shouldContinue: () => true });
  assert.equal(result.completed, true);
  assert.equal(result.records[0].status.desempenho, 'OK');
  assert.equal(performanceAttempts, 2);
  assert.equal(fake.calls.length, 5);
  assert.equal(fake.maxInFlight(), 1);
});

test('export fetch uses the existing TEC session and preserves HTTP quota diagnostics', async t => {
  const h = harness(t);
  const calls = [];
  h.window.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: false, status: 402, text: async () => JSON.stringify({ error: 'Limite diário atingido', urlRedirect: '/assinar?ltd=true' }) };
  };
  const result = await h.run('fetchTecExportJson', '/api/questoes/500001/desempenho', () => true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.credentials, 'include');
  assert.ok(calls[0].options.signal, 'request must be abortable');
  assert.equal(new URL(calls[0].url, h.window.location.href).origin, h.window.location.origin);
  assert.equal(result.ok, false);
  assert.equal(result.status, 402);
  assert.equal(result.json.error, 'Limite diário atingido');
});

test('an HTML login response is reported as an expired session rather than an empty optional section', async t => {
  const h = harness(t);
  h.window.fetch = async () => ({
    ok: true, status: 200, redirected: true, url: 'https://www.tecconcursos.com.br/login',
    text: async () => '<!doctype html><html><body>Faça login</body></html>',
  });
  const result = await h.run('fetchTecExportJson', '/api/questoes/500001/desempenho', () => true);
  assert.equal(result.ok, false);
  assert.equal(result.sessionExpired, true);
});

test('export fetch does not start a request after cancellation or send credentials to another origin', async t => {
  const h = harness(t);
  let calls = 0;
  h.window.fetch = async () => { calls++; return { ok: true, status: 200, text: async () => '{}' }; };
  const cancelled = await h.run('fetchTecExportJson', '/api/questoes/500001/desempenho', () => false);
  assert.equal(cancelled.ok, false);
  assert.equal(calls, 0);
  let failure;
  try { failure = await h.run('fetchTecExportJson', 'https://another.example.test/api/questoes/500001', () => true); }
  catch (err) { failure = err; }
  assert.equal(calls, 0, 'authenticated export must be restricted to the TEC origin');
  assert.ok(failure && (failure instanceof Error || !failure.ok));
});

test('stopping an in-flight export request aborts it and reports cancellation', async t => {
  const h = harness(t);
  let active = true, aborted = false;
  h.window.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
    active = false;
  });
  const response = await h.run('fetchTecExportJson', '/api/questoes/500001/desempenho', () => active);
  assert.equal(aborted, true);
  assert.equal(response.ok, false);
  assert.equal(response.cancelled, true);
});

test('a failing vote endpoint falls back to date once and uses that order for later questions in the collection', async t => {
  const h = harness(t);
  const fake = stubCollector(h, {
    reply: (requestPath, response) => requestPath.includes('ordenarPor=pontos&')
      ? failed(500, 'Resposta não JSON') : response,
  });
  const targets = [{ number: 1, id: '500001' }, { number: 2, id: '500002' }];
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', shouldContinue: () => true });
  assert.equal(result.completed, true);
  assert.equal(result.paused, false);
  assert.equal(fake.calls.filter(requestPath => requestPath.includes('ordenarPor=pontos&')).length, 1);
  assert.equal(fake.calls.filter(requestPath => requestPath.includes('ordenarPor=data&')).length, 2);
  for (const row of result.records) {
    assert.equal(row.status.comentario, 'OK');
    assert.equal(row.status.desempenho, 'OK');
    assert.equal(row.status.forum, 'OK');
    assert.equal(row.forumOrdemEfetiva, 'data');
    assert.deepEqual(clone(row.forum).map(post => post.usuario), ['Primeiro', 'Segundo']);
    assert.ok(row.diagnosticos.some(message => /Ordenação por votos indisponível.*dois primeiros por data/i.test(message)));
  }
  const checkpoint = h.storage.get('tecSpreadsheet:v1:caderno:111:votos');
  assert.ok(checkpoint.records.every(row => row.forumOrdemEfetiva === 'data'));
  const csvRows = parseCsv(h.run('buildTecSpreadsheetCsv', result.records));
  const effectiveOrder = csvRows[0].findIndex(header => /ordem.*f[oó]rum|f[oó]rum.*ordem/i.test(header));
  assert.ok(effectiveOrder >= 0, 'CSV must identify the actual forum order');
  assert.ok(csvRows[1][effectiveOrder].toLowerCase().includes('data'));
  assert.ok(!/mais votad/i.test(csvRows[1][effectiveOrder]), 'date fallback cannot claim the most-voted posts');
});

test('the most-voted choice uses the TEC pontos parameter and completes without a fallback', async t => {
  const h = harness(t);
  const fake = stubCollector(h);
  const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }], { forumOrder: 'votos', shouldContinue: () => true });
  assert.equal(result.completed, true);
  assert.equal(result.paused, false);
  const forumRequests = fake.calls.filter(requestPath => requestPath.includes('/comentarios-alunos?'));
  assert.equal(forumRequests.length, 1);
  assert.ok(forumRequests[0].includes('ordenarPor=pontos&pagina=1'));
  assert.ok(!forumRequests[0].includes('ordenarPor=votos&'), 'internal choice name is not the TEC API value');
  assert.ok(!fake.calls.some(requestPath => requestPath.includes('ordenarPor=data&')));
  assert.equal(result.records[0].forumOrdem, 'votos');
  assert.equal(result.records[0].forumOrdemEfetiva, 'votos');
  assert.deepEqual(clone(result.records[0].forum).map(post => post.usuario), ['Quarto', 'Segundo']);
  assert.ok(!result.records[0].diagnosticos.some(message => /Ordenação por votos indisponível/i.test(message)));
});

test('successful date-fallback forum data and its diagnostic survive retrying another section', async t => {
  const h = harness(t);
  const targets = [{ number: 1, id: '500001' }];
  stubCollector(h, {
    reply: (requestPath, response) => {
      if (/\/comentario\?/.test(requestPath)) return failed(400, 'Comentário indisponível');
      if (requestPath.includes('ordenarPor=pontos&')) return failed(500, 'Resposta não JSON');
      return response;
    },
  });
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', shouldContinue: () => true });
  assert.equal(first.records[0].status.forum, 'OK');
  assert.equal(first.records[0].forumOrdemEfetiva, 'data');
  const forum = clone(first.records[0].forum);
  const retry = stubCollector(h);
  const resumed = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', resume: true, shouldContinue: () => true });
  assert.equal(resumed.completed, true);
  assert.equal(retry.calls.length, 1, 'only the failed professor section should be retried');
  assert.ok(retry.calls[0].includes('/comentario?'));
  assert.equal(resumed.records[0].forumOrdemEfetiva, 'data');
  assert.deepEqual(clone(resumed.records[0].forum), forum);
  assert.ok(resumed.records[0].diagnosticos.some(message => /Ordenação por votos indisponível.*dois primeiros por data/i.test(message)));
});

test('date fallback preference is scoped to one collection rather than leaking into a fresh export', async t => {
  const h = harness(t);
  const targets = [{ number: 1, id: '500001' }];
  const unavailable = stubCollector(h, {
    reply: (requestPath, response) => requestPath.includes('ordenarPor=pontos&') ? failed(500, 'Resposta não JSON') : response,
  });
  const first = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', shouldContinue: () => true });
  assert.equal(first.records[0].forumOrdemEfetiva, 'data');
  assert.equal(unavailable.calls.filter(requestPath => requestPath.includes('ordenarPor=pontos&')).length, 1);
  const available = stubCollector(h);
  const fresh = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, targets, { forumOrder: 'votos', resume: false, shouldContinue: () => true });
  assert.ok(available.calls.some(requestPath => requestPath.includes('ordenarPor=pontos&')));
  assert.ok(!available.calls.some(requestPath => requestPath.includes('ordenarPor=data&')));
  assert.equal(fresh.records[0].forumOrdemEfetiva, 'votos');
  assert.ok(!fresh.records[0].diagnosticos.some(message => /Ordenação por votos indisponível/i.test(message)));
});

test('authentication errors and rate limits do not trigger a forum ordering fallback', async t => {
  for (const status of [401, 429]) {
    await t.test(`HTTP ${status}`, async t => {
      const h = harness(t);
      const fake = stubCollector(h, {
        reply: (requestPath, response) => requestPath.includes('ordenarPor=pontos&')
          ? failed(status, status === 401 ? 'Sessão expirada' : 'Limite de requisições') : response,
      });
      const result = await h.run('collectTecSpreadsheet', { key: 'caderno:111' }, [{ number: 1, id: '500001' }], { forumOrder: 'votos', shouldContinue: () => true });
      assert.equal(result.paused, true);
      assert.equal(result.completed, false);
      assert.equal(fake.calls.filter(requestPath => requestPath.includes('ordenarPor=pontos&')).length, 1);
      assert.ok(!fake.calls.some(requestPath => requestPath.includes('ordenarPor=data&')));
      assert.equal(result.records[0].status.comentario, 'OK');
      assert.equal(result.records[0].status.desempenho, 'OK');
      assert.notEqual(result.records[0].status.forum, 'OK');
    });
  }
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const sourcePath = path.join(__dirname, '..', 'tec-to-anki-raw.user.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const key = 'test-credential-never-logged';
const jsonResponse = value => ({ ok: true, status: 200, json: async () => value });

function harness(t) {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://www.tecconcursos.com.br/questoes/cadernos/111', runScripts: 'outside-only',
  });
  t.after(() => dom.window.close());
  const { window } = dom;
  const storage = new Map();
  const logs = [];
  window.GM_getValue = (name, fallback) => storage.has(name) ? storage.get(name) : fallback;
  window.GM_setValue = (name, value) => storage.set(name, value);
  window.GM_addStyle = () => {};
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = () => { throw new Error('Unexpected real network request'); };
  window.unsafeWindow = window;
  window.console = Object.fromEntries(['log', 'warn', 'error'].map(method => [method, (...args) => logs.push(args.join(' '))]));
  const startup = source.lastIndexOf('  if (document.readyState');
  assert.ok(startup > 0);
  vm.runInContext(source.slice(0, startup) + `
    window.__aiTest = {
      run: (name, ...args) => eval(name)(...args),
      override: (name, value) => { eval(name + ' = value'); },
    };
  })();`, dom.getInternalVMContext(), { filename: sourcePath });
  const api = window.__aiTest;
  api.run('setSetting', 'opencodeService', 'go');
  api.run('setSetting', 'opencodeGoApiKey', key);
  api.override('delay', async () => {});
  return { ...api, logs };
}

for (const model of ['claude-haiku-5-5', 'minimax-m2.7', 'qwen3.8-flash']) {
  test(`${model}: test and generation authenticate using the Messages protocol`, async t => {
    const h = harness(t);
    const requests = [];
    h.override('gmFetch', async (url, options) => {
      requests.push({ url, ...options, body: JSON.parse(options.body) });
      return jsonResponse({ content: [{ type: 'thinking', thinking: 'Do not treat this as the answer' }, { type: 'text', text: '{"ok":true}' }] });
    });
    assert.equal(await h.run('testOpencodeModelAccess', key, 'go', model, 'Creator'), model);
    const generated = await h.run('callOpencodeModel', model, 'Return JSON.', 'Return {"ok":true}.');
    assert.equal(generated.result.ok, true);
    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.equal(request.url, 'https://opencode.ai/zen/go/v1/messages');
      assert.equal(request.headers['x-api-key'], key);
      assert.equal(request.headers['anthropic-version'], '2023-06-01');
      assert.equal(request.headers.Authorization, undefined);
      assert.match(request.headers['x-opencode-session'], /^ses_/);
      assert.match(request.headers['User-Agent'], /^tec-to-anki\//);
      assert.equal(request.body.response_format, undefined);
    }
    assert.equal(requests[0].headers['x-opencode-session'], requests[1].headers['x-opencode-session']);
    assert.ok(h.logs.every(log => !log.includes(key)));
  });
}

for (const [model, route] of [['gpt-6-luna', 'responses'], ['deepseek-v4-pro', 'chat/completions'], ['glm-5.2', 'chat/completions']]) {
  test(`${model}: connection test preserves Bearer auth and permits native reasoning`, async t => {
    const h = harness(t);
    let request;
    h.override('gmFetch', async (url, options) => {
      request = { url, ...options, body: JSON.parse(options.body) };
      return jsonResponse(route === 'responses' ? { output_text: '{"ok":true}' } : { choices: [{ message: { content: '{"ok":true}' } }] });
    });
    assert.equal(await h.run('testOpencodeModelAccess', key, 'go', model, 'Creator'), model);
    assert.equal(request.url, `https://opencode.ai/zen/go/v1/${route}`);
    assert.equal(request.headers.Authorization, `Bearer ${key}`);
    assert.equal(request.headers['x-api-key'], undefined);
    assert.equal(request.body.thinking, undefined);
    assert.equal(request.body.max_tokens ?? request.body.max_output_tokens, 2048);
  });
}

test('training policy errors explain privacy and do not block unrelated models', t => {
  const h = harness(t);
  const err = h.run('classifyApiError', 403, 'Account.TrainingNotAllowed', 'This Go model trains on request data.', {
    provider: 'opencode', service: 'go', model: 'muse-spark-1.3-contributor',
  });
  assert.equal(err.kind, 'privacy');
  assert.equal(err.providerFatal, false);
  assert.equal(err.retryable, false);
  assert.match(err.message, /pedidos e respostas para treinamento/);
  assert.match(err.message, /Settings → Privacy/);
  assert.doesNotMatch(err.message, /chave.*inválida/i);
});

test('auth errors preserve provider detail and distinguish missing headers from invalid keys', t => {
  const h = harness(t);
  const context = { provider: 'opencode', service: 'go', model: 'claude-haiku-5-5' };
  const missing = h.run('classifyApiError', 401, 'AuthError', 'Missing API key.', context);
  assert.equal(missing.kind, 'request_auth');
  assert.equal(missing.providerFatal, false);
  assert.match(missing.message, /Missing API key/);
  const invalid = h.run('classifyApiError', 401, 'AuthError', 'Invalid API key.', context);
  assert.equal(invalid.providerFatal, true);
  const blocked = h.run('classifyApiError', 403, 'Forbidden', 'This model is not available in your region.', context);
  assert.equal(blocked.providerFatal, false);
  assert.match(blocked.message, /not available in your region/);
});

test('connection diagnostics identify the failed role and model', async t => {
  const h = harness(t);
  h.override('refreshOpencodeModelCatalog', async () => ({ ok: true, count: 45 }));
  h.override('testOpencodeModelAccess', async (_key, service, model) => {
    if (model === 'deepseek-v4-pro') throw h.run('classifyApiError', 429, 'RateLimitError', 'Weekly limit reached', { provider: 'opencode', service, model });
    return model;
  });
  await assert.rejects(h.run('testOpencodeAccess', key, 'go', 'gpt-6-luna', 'deepseek-v4-pro'), err => {
    assert.match(err.message, /^Auditor deepseek-v4-pro:/);
    assert.equal(err.status, 429);
    assert.equal(err.kind, 'rate_limit');
    return true;
  });
});

test('a model absent from the current catalog is never tested through a silent substitute', async t => {
  const h = harness(t);
  h.override('refreshOpencodeModelCatalog', async () => ({ ok: true, count: 45 }));
  h.override('testOpencodeModelAccess', async () => { throw new Error('No substitute may be called'); });
  await assert.rejects(h.run('testOpencodeAccess', key, 'go', 'removed-model', 'deepseek-v4-pro'), err => {
    assert.equal(err.kind, 'model_unavailable');
    assert.match(err.message, /^Creator removed-model não está no catálogo/);
    return true;
  });
});

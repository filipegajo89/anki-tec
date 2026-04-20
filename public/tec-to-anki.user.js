// ==UserScript==
// @name         TEC → Anki + Obsidian
// @namespace    tec-anki-obsidian
// @version      1.0.0
// @description  Extrai questões do TEC Concursos, gera flashcards com Gemini AI e salva no Anki + Obsidian
// @author       filipegajo
// @match        https://www.tecconcursos.com.br/*
// @match        https://tecconcursos.com.br/*
// @match        *://www.tecconcursos.com.br/*
// @match        *://tecconcursos.com.br/*
// @icon         https://www.tecconcursos.com.br/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      127.0.0.1
// @connect      localhost
// @connect      generativelanguage.googleapis.com
// @connect      openrouter.ai
// @connect      www.tecconcursos.com.br
// @connect      tecconcursos.com.br
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                    1. CONFIGURATION                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  const DEFAULTS = {
    aiProvider: 'gemini', // 'gemini' or 'openrouter'
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',
    geminiModel: 'gemini-2.5-flash',
    openrouterApiKey: 'YOUR_OPENROUTER_API_KEY_HERE',
    openrouterModel: 'qwen/qwen3-235b-a22b-2507',
    obsidianVault: 'Filipe - Obs',
    obsidianToken: 'YOUR_OBSIDIAN_TOKEN_HERE',
    obsidianPort: 27123,
    obsidianBasePath: 'TEC',
    obsidianMethod: 'rest', // 'rest', 'uri', 'clipboard'
    ankiDeckPrefix: 'Erros Filipe',
    ankiModelName: 'TEC Concursos',
    enableAnki: true,
    enableObsidian: true,
    showPreview: true,
    pipelineMode: 'single', // 'single' or 'dual'
    creatorModel: 'moonshotai/kimi-k2.5',
    auditorModel: 'google/gemini-3.1-pro-preview',
    pipelineCostTotal: 0, // cumulative cost in USD
  };

  function getSetting(key) {
    return GM_getValue(key, DEFAULTS[key]);
  }
  function setSetting(key, value) {
    GM_setValue(key, value);
  }

  // Auto-migrate deprecated models
  const DEPRECATED_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-preview-04-17'];
  if (DEPRECATED_MODELS.includes(getSetting('geminiModel'))) {
    setSetting('geminiModel', 'gemini-2.5-flash');
    console.log('\uD83D\uDD04 Modelo Gemini migrado para gemini-2.5-flash');
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                    2. CSS STYLES                             \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  GM_addStyle(`
    /* \u2500\u2500 Floating Toolbar \u2500\u2500 */
    #tec-anki-toolbar {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      display: flex; align-items: center; gap: 6px;
      background: #1a1a2e; border-radius: 14px; padding: 6px 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,.35); font-family: system-ui, sans-serif;
      transition: opacity .2s; user-select: none;
    }
    #tec-anki-toolbar button {
      border: none; border-radius: 10px; padding: 8px 14px; cursor: pointer;
      font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 5px;
      transition: background .15s, transform .1s;
    }
    #tec-anki-toolbar button:active { transform: scale(.96); }
    .tec-btn-primary { background: #4361ee; color: #fff; }
    .tec-btn-primary:hover { background: #3a56d4; }
    .tec-btn-batch { background: #f72585; color: #fff; }
    .tec-btn-batch:hover { background: #d61f6f; }
    .tec-btn-icon { background: transparent !important; color: #aaa; font-size: 18px !important; padding: 8px !important; }
    .tec-btn-icon:hover { color: #fff; }
    .tec-status-dot {
      width: 10px; height: 10px; border-radius: 50%; margin-left: 4px;
      background: #888; transition: background .3s;
    }
    .tec-status-dot.green { background: #06d6a0; }
    .tec-status-dot.yellow { background: #ffd166; }
    .tec-status-dot.red { background: #ef476f; }

    /* \u2500\u2500 Toast \u2500\u2500 */
    #tec-toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 100000;
      display: flex; flex-direction: column; gap: 8px; pointer-events: none;
    }
    .tec-toast {
      background: #1a1a2e; color: #fff; padding: 12px 20px; border-radius: 10px;
      font-size: 13px; font-family: system-ui, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,.3); pointer-events: auto;
      animation: tec-slide-in .3s ease; max-width: 380px; line-height: 1.4;
      display: flex; align-items: center; gap: 8px;
    }
    .tec-toast.success { border-left: 4px solid #06d6a0; }
    .tec-toast.error { border-left: 4px solid #ef476f; }
    .tec-toast.info { border-left: 4px solid #4361ee; }
    .tec-toast.warning { border-left: 4px solid #ffd166; }
    @keyframes tec-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    /* \u2500\u2500 Modal Overlay \u2500\u2500 */
    .tec-modal-overlay {
      position: fixed; inset: 0; z-index: 100001; background: rgba(0,0,0,.6);
      display: flex; align-items: center; justify-content: center;
      animation: tec-fade-in .2s ease;
    }
    @keyframes tec-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .tec-modal {
      background: #fff; border-radius: 16px; width: 700px; max-width: 92vw;
      max-height: 85vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,.25);
      font-family: system-ui, sans-serif; color: #1a1a2e;
    }
    .tec-modal-header {
      padding: 20px 24px; border-bottom: 1px solid #eee;
      display: flex; align-items: center; justify-content: space-between;
    }
    .tec-modal-header h2 { margin: 0; font-size: 18px; }
    .tec-modal-body { padding: 20px 24px; }
    .tec-modal-footer {
      padding: 16px 24px; border-top: 1px solid #eee;
      display: flex; justify-content: flex-end; gap: 10px;
    }
    .tec-modal-close {
      background: none; border: none; font-size: 22px; cursor: pointer;
      color: #999; padding: 4px 8px; border-radius: 6px;
    }
    .tec-modal-close:hover { background: #f5f5f5; color: #333; }
    .tec-modal .tec-btn {
      border: none; border-radius: 10px; padding: 10px 24px; cursor: pointer;
      font-size: 14px; font-weight: 600; transition: background .15s;
    }
    .tec-btn-save { background: #4361ee; color: #fff; }
    .tec-btn-save:hover { background: #3a56d4; }
    .tec-btn-cancel { background: #e9ecef; color: #495057; }
    .tec-btn-cancel:hover { background: #dee2e6; }

    /* \u2500\u2500 Modal Content \u2500\u2500 */
    .tec-meta-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;
      margin-bottom: 16px; font-size: 13px;
    }
    .tec-meta-grid .label { color: #888; font-weight: 500; }
    .tec-meta-grid .value { color: #1a1a2e; font-weight: 600; }
    .tec-section { margin-bottom: 16px; }
    .tec-section h3 { font-size: 14px; color: #4361ee; margin: 0 0 8px; }
    .tec-section .content {
      background: #f8f9fa; border-radius: 8px; padding: 12px;
      font-size: 13px; line-height: 1.5; max-height: 150px; overflow-y: auto;
    }
    .tec-card-preview {
      border: 1px solid #e9ecef; border-radius: 10px; padding: 12px;
      margin-bottom: 10px; background: #fafbfc;
    }
    .tec-card-preview .card-num {
      font-size: 11px; font-weight: 700; color: #4361ee;
      text-transform: uppercase; margin-bottom: 6px;
    }
    .tec-card-preview .card-front { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .tec-card-preview .card-back { font-size: 13px; color: #555; border-top: 1px dashed #ddd; padding-top: 6px; }
    .tec-error-badge {
      display: inline-block; background: #fff3cd; color: #856404;
      padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
      margin-bottom: 12px;
    }

    /* \u2500\u2500 Settings Panel \u2500\u2500 */
    .tec-settings .tec-field { margin-bottom: 14px; }
    .tec-settings label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 4px; }
    .tec-settings input, .tec-settings select {
      width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 13px; box-sizing: border-box; font-family: system-ui, sans-serif;
    }
    .tec-settings input:focus, .tec-settings select:focus { outline: none; border-color: #4361ee; }
    .tec-settings .tec-toggle {
      display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;
    }
    .tec-settings .tec-toggle input[type="checkbox"] { width: 18px; height: 18px; accent-color: #4361ee; }
    .tec-settings .tec-divider { border: none; border-top: 1px solid #eee; margin: 16px 0; }
    .tec-settings h3 { font-size: 13px; color: #4361ee; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* \u2500\u2500 Loading Spinner \u2500\u2500 */
    .tec-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff; border-radius: 50%; animation: tec-spin .6s linear infinite;
      display: inline-block;
    }
    @keyframes tec-spin { to { transform: rotate(360deg); } }

    /* \u2500\u2500 Progress Bar \u2500\u2500 */
    .tec-progress-bar {
      width: 100%; height: 4px; background: #e9ecef; border-radius: 2px;
      margin-top: 8px; overflow: hidden;
    }
    .tec-progress-fill {
      height: 100%; background: #4361ee; border-radius: 2px;
      transition: width .3s ease;
    }
  `);

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  3. UTILITY FUNCTIONS                        \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  /** Wrapper around GM_xmlhttpRequest that returns a fetch-like Promise */
  function gmFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: options.method || 'GET',
        url,
        data: options.body || null,
        headers: options.headers || {},
        timeout: options.timeout || 30000,
        onload(res) {
          resolve({
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            text: () => Promise.resolve(res.responseText),
            json: () => Promise.resolve(JSON.parse(res.responseText)),
          });
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Request timed out')),
      });
    });
  }

  function slugify(text) {
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-').toLowerCase();
  }

  function sanitizePath(text) {
    return text.replace(/[\\/:*?"<>|]/g, '-').trim();
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function waitForElement(selector, timeout = 5000, context = document) {
    return new Promise((resolve, reject) => {
      const el = context.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const found = context.querySelector(selector);
        if (found) { observer.disconnect(); resolve(found); }
      });
      observer.observe(context.body || context, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout: ${selector}`)); }, timeout);
    });
  }

  /**
   * Simulates a keyboard key press on the page.
   * Dispatches on multiple targets to ensure TEC's AngularJS handlers catch it.
   */
  function simulateKey(key, keyCode) {
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const opts = {
      key, keyCode, code, which: keyCode,
      charCode: key.length === 1 ? key.charCodeAt(0) : 0,
      bubbles: true, cancelable: true, composed: true,
    };
    // Blur any focused element so TEC's key handler recognizes the event
    try { document.activeElement?.blur(); } catch (_) { /* skip */ }

    // Dispatch on multiple targets \u2014 TEC's Angular may listen on any of these
    for (const target of [document, document.body, document.documentElement]) {
      try {
        target.dispatchEvent(new KeyboardEvent('keydown', opts));
        target.dispatchEvent(new KeyboardEvent('keypress', opts));
        target.dispatchEvent(new KeyboardEvent('keyup', opts));
      } catch (_) { /* skip */ }
    }

    // Also try via jQuery if available (TEC/AngularJS usually loads jQuery)
    try {
      const jq = unsafeWindow?.jQuery || unsafeWindow?.$ || window.jQuery || window.$;
      if (jq) {
        jq(document).trigger(jq.Event('keydown', { which: keyCode, keyCode, key }));
        jq(document).trigger(jq.Event('keypress', { which: keyCode, keyCode, key }));
        jq(document).trigger(jq.Event('keyup', { which: keyCode, keyCode, key }));
      }
    } catch (_) { /* jQuery not available */ }
  }

  /**
   * Performs a realistic click on an element:
   * 1. Native MouseEvent dispatch (mousedown \u2192 mouseup \u2192 click)
   * 2. AngularJS triggerHandler if available
   * 3. Standard .click() fallback
   */
  function realClick(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'instant', block: 'nearest' }); } catch (_) { /* skip */ }

    // Dispatch proper mouse event sequence
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseOpts = {
      bubbles: true, cancelable: true, composed: true,
      clientX: cx, clientY: cy, button: 0,
    };
    el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
    el.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
    el.dispatchEvent(new MouseEvent('click', mouseOpts));

    // Try Angular's triggerHandler
    try {
      const ng = unsafeWindow?.angular || window.angular;
      if (ng) {
        const ngEl = ng.element(el);
        ngEl.triggerHandler('click');
        // Also trigger Angular digest cycle
        const scope = ngEl.scope();
        if (scope && scope.$apply) {
          scope.$apply();
        }
      }
    } catch (_) { /* Angular not available or scope error */ }

    // Standard click as final fallback
    try { el.click(); } catch (_) { /* skip */ }
  }

  // Module-level variable to store the captured comment text
  let _capturedComment = '';

  /** Strip HTML tags and return plain text */
  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent.trim();
  }

  /** Try to extract a comment string from a JSON object (API response) */
  function extractCommentFromJson(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const props = ['texto', 'comentario', 'conteudo', 'content', 'text',
                   'textoComentario', 'comentarioProfessor', 'resolucao',
                   'textoResolucao', 'body', 'html', 'descricao'];
    // Direct properties
    for (const p of props) {
      if (typeof obj[p] === 'string' && obj[p].length > 30) return stripHtml(obj[p]);
    }
    // Array items
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = extractCommentFromJson(item);
        if (r) return r;
      }
    }
    // One-level nested
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        for (const p of props) {
          if (typeof val[p] === 'string' && val[p].length > 30) return stripHtml(val[p]);
        }
      }
    }
    return '';
  }

  /**
   * Captures the professor's comment using multiple strategies:
   *  1. Read directly from AngularJS scope (vm.questao.*)
   *  2. Call Angular controller methods that load/show the comment
   *  3. XHR interception + click "Ver resolu\u00E7\u00E3o" to capture API response
   *  4. Direct TEC API call with question ID
   *  5. DOM fallback: look for tec-formatar-html with comment attr
   */
  async function ensureCommentExpanded() {
    _capturedComment = '';

    const { scope, vm } = getAngularVm();

    // \u2500\u2500 Strategy 1: Direct property read from Angular scope \u2500\u2500
    console.log('\n\uD83D\uDCD6 Strategy 1: Leitura direta do Angular scope...');
    if (vm) {
      const commentProps = [
        'comentario', 'textoComentario', 'comentarioProfessor', 'comentarioTexto',
        'resolucao', 'textoResolucao', 'resolucaoTexto', 'comentarioDoComentario',
        'comentarioFormatado', 'textoComentarioFormatado',
        'comment', 'commentText', 'professorComment'
      ];

      const enunciado = vm.questao?.enunciado || '';

      // Check vm.questao properties
      if (vm.questao) {
        for (const prop of commentProps) {
          const val = vm.questao[prop];
          if (typeof val === 'string' && val.length > 30) {
            const plain = stripHtml(val);
            if (plain !== stripHtml(enunciado) && !plain.startsWith(stripHtml(enunciado).substring(0, 50))) {
              _capturedComment = plain;
              console.log(`\u2705 Coment\u00E1rio via vm.questao.${prop} (${plain.length} chars)`);
              return true;
            }
          }
        }

        // Check ALL string properties that might be the comment
        for (const [key, val] of Object.entries(vm.questao)) {
          if (typeof val === 'string' && val.length > 200 && key !== 'enunciado') {
            const plain = stripHtml(val);
            const enunciadoPlain = stripHtml(enunciado);
            if (plain !== enunciadoPlain && !plain.startsWith(enunciadoPlain.substring(0, 50))) {
              console.log(`\uD83D\uDD0E Poss\u00EDvel coment\u00E1rio em vm.questao.${key} (${plain.length} chars): "${plain.substring(0, 100)}..."`);
              _capturedComment = plain;
              console.log(`\u2705 Coment\u00E1rio via vm.questao.${key} (${plain.length} chars)`);
              return true;
            }
          }
        }

        // Check nested objects inside vm.questao
        for (const [key, val] of Object.entries(vm.questao)) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            for (const prop of commentProps) {
              const nested = val[prop];
              if (typeof nested === 'string' && nested.length > 30) {
                _capturedComment = stripHtml(nested);
                console.log(`\u2705 Coment\u00E1rio via vm.questao.${key}.${prop} (${_capturedComment.length} chars)`);
                return true;
              }
            }
          }
        }
      }

      // Check vm directly (string props)
      for (const prop of commentProps) {
        const val = vm[prop];
        if (typeof val === 'string' && val.length > 30) {
          _capturedComment = stripHtml(val);
          console.log(`\u2705 Coment\u00E1rio via vm.${prop} (${_capturedComment.length} chars)`);
          return true;
        }
      }

      // Check vm.comentario object (e.g. vm.comentario.textoComentario)
      if (vm.comentario && typeof vm.comentario === 'object') {
        for (const prop of commentProps) {
          const val = vm.comentario[prop];
          if (typeof val === 'string' && val.length > 30) {
            _capturedComment = stripHtml(val);
            console.log(`\u2705 Coment\u00E1rio via vm.comentario.${prop} (${_capturedComment.length} chars)`);
            return true;
          }
        }
      }
    }

    // \u2500\u2500 Strategy 2: Call Angular controller methods \u2500\u2500
    console.log('\n\uD83D\uDD27 Strategy 2: Chamando m\u00E9todos Angular...');
    if (vm) {
      const methodNames = [
        'mostrarComentario', 'abrirComentario', 'toggleComentario', 'verComentario',
        'mostrarResolucao', 'abrirResolucao', 'toggleResolucao', 'verResolucao',
        'exibirComentario', 'carregarComentario', 'loadComentario',
        'showComment', 'loadComment', 'toggleComment', 'mostrarComentarioTexto'
      ];

      for (const name of methodNames) {
        if (typeof vm[name] === 'function') {
          console.log(`  \uD83D\uDD27 Calling vm.${name}()...`);
          try {
            const result = vm[name]();
            if (result && typeof result.then === 'function') {
              await result;
            }
            try { scope.$apply(); } catch (_) { /* may already be in digest */ }
            await delay(2000);

            // Re-check scope for new comment data
            if (vm.questao) {
              for (const [key, val] of Object.entries(vm.questao)) {
                if (typeof val === 'string' && val.length > 100) {
                  const plain = stripHtml(val);
                  const enunciadoPlain = stripHtml(vm.questao.enunciado || '');
                  if (plain !== enunciadoPlain && !plain.startsWith(enunciadoPlain.substring(0, 50))) {
                    _capturedComment = plain;
                    console.log(`\u2705 Coment\u00E1rio after ${name}(): vm.questao.${key} (${plain.length} chars)`);
                    return true;
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`    \u26A0\uFE0F vm.${name}() error:`, err.message);
          }
        }
      }

      // Also try on scope directly
      for (const name of methodNames) {
        if (scope && typeof scope[name] === 'function' && typeof vm[name] !== 'function') {
          console.log(`  \uD83D\uDD27 Calling scope.${name}()...`);
          try {
            scope[name]();
            try { scope.$apply(); } catch (_) {}
            await delay(2000);
            if (vm.questao) {
              for (const [key, val] of Object.entries(vm.questao)) {
                if (typeof val === 'string' && val.length > 100) {
                  const plain = stripHtml(val);
                  const enunciadoPlain = stripHtml(vm.questao.enunciado || '');
                  if (plain !== enunciadoPlain) {
                    _capturedComment = plain;
                    console.log(`\u2705 Coment\u00E1rio after scope.${name}(): .${key} (${plain.length} chars)`);
                    return true;
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`    \u26A0\uFE0F scope.${name}() error:`, err.message);
          }
        }
      }
    }

    // \u2500\u2500 Strategy 3: XHR interception + click "Ver resolu\u00E7\u00E3o" \u2500\u2500
    console.log('\n\uD83D\uDCE1 Strategy 3: XHR intercept + click...');
    let capturedXhrUrl = null;
    let capturedXhrResponse = null;

    const origOpen = unsafeWindow.XMLHttpRequest.prototype.open;
    const origSend = unsafeWindow.XMLHttpRequest.prototype.send;

    unsafeWindow.XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._tecUrl = url;
      return origOpen.apply(this, [method, url, ...args]);
    };
    unsafeWindow.XMLHttpRequest.prototype.send = function(...args) {
      const self = this;
      this.addEventListener('load', function() {
        if (self._tecUrl) {
          console.log(`  \uD83D\uDCE1 XHR: ${self._tecUrl} (${self.status}) [${(self.responseText||'').length} chars]`);
          if (/coment|resoluc|questao|questoes/i.test(self._tecUrl) && self.responseText?.length > 50) {
            capturedXhrUrl = self._tecUrl;
            capturedXhrResponse = self.responseText;
          }
        }
      });
      return origSend.apply(this, args);
    };

    // Click "Ver resolu\u00E7\u00E3o" links
    const resolucaoLinks = [...document.querySelectorAll('a, button, span')].filter(el => {
      const txt = el.textContent.trim();
      return /ver resolu[\u00E7c]/i.test(txt) && txt.length < 40;
    });
    console.log(`  Links "Ver resolu\u00E7\u00E3o": ${resolucaoLinks.length}`);

    for (const link of resolucaoLinks) {
      console.log(`  Clicando: "${link.textContent.trim()}" <${link.tagName}>`);
      realClick(link);
    }
    // Also keyboard shortcut
    try { document.activeElement?.blur(); } catch (_) {}
    document.body.focus();
    simulateKey('o', 79);

    await delay(4000);

    // Restore XHR originals
    unsafeWindow.XMLHttpRequest.prototype.open = origOpen;
    unsafeWindow.XMLHttpRequest.prototype.send = origSend;

    if (capturedXhrResponse) {
      console.log(`  \uD83D\uDCE1 XHR capturado: ${capturedXhrResponse.length} chars de ${capturedXhrUrl}`);
      try {
        const data = JSON.parse(capturedXhrResponse);
        const text = extractCommentFromJson(data);
        if (text && text.length > 30) {
          _capturedComment = text;
          console.log(`\u2705 Coment\u00E1rio via XHR JSON (${text.length} chars)`);
          return true;
        }
      } catch {
        if (capturedXhrResponse.length > 50 && !capturedXhrResponse.startsWith('<!')) {
          _capturedComment = stripHtml(capturedXhrResponse);
          console.log(`\u2705 Coment\u00E1rio via XHR raw (${_capturedComment.length} chars)`);
          return true;
        }
      }
    }

    // Re-check Angular scope after clicking (the click may have populated it)
    if (vm?.questao) {
      console.log('  Re-checking Angular scope after click...');
      for (const [key, val] of Object.entries(vm.questao)) {
        if (typeof val === 'string' && val.length > 100) {
          const plain = stripHtml(val);
          const enunciadoPlain = stripHtml(vm.questao.enunciado || '');
          if (plain !== enunciadoPlain && !plain.startsWith(enunciadoPlain.substring(0, 50))) {
            _capturedComment = plain;
            console.log(`\u2705 Coment\u00E1rio via scope re-check: .${key} (${plain.length} chars)`);
            return true;
          }
        }
      }
    }

    // \u2500\u2500 Strategy 4: Direct TEC API call (known working endpoint) \u2500\u2500
    const questaoId = vm?.questao?.idQuestao ||
                      vm?.questao?.id ||
                      document.body.innerText.match(/#(\d{5,})/)?.[1] ||
                      window.location.pathname.match(/(\d{5,})/)?.[1];

    if (questaoId) {
      console.log(`\n\uD83D\uDCE1 Strategy 4: API direta (quest\u00E3o #${questaoId})...`);
      const apiUrls = [
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}/comentario?tokenPreVisualizacao=`,
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}/comentarios`,
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}`,
      ];

      for (const url of apiUrls) {
        try {
          console.log(`  \uD83D\uDCE1 GET ${url}`);
          const resp = await gmFetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/html',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
          if (resp.ok) {
            const text = await resp.text();
            console.log(`    \u2705 ${resp.status} \u2014 ${text.length} chars`);
            if (text.length > 50) {
              try {
                const data = JSON.parse(text);
                console.log(`    JSON keys: ${Object.keys(data).join(', ')}`);
                const comment = extractCommentFromJson(data);
                if (comment && comment.length > 30) {
                  _capturedComment = comment;
                  console.log(`\u2705 Coment\u00E1rio via API (${comment.length} chars)`);
                  return true;
                }
              } catch {
                // Maybe HTML \u2014 try parsing for comment section
                if (text.includes('comentario') || text.includes('resolucao')) {
                  const div = document.createElement('div');
                  div.innerHTML = text;
                  const commentEls = div.querySelectorAll('[tec-formatar-html*="coment"], .comentario-texto, .resolucao-texto');
                  for (const cel of commentEls) {
                    if (cel.textContent.trim().length > 30) {
                      _capturedComment = cel.textContent.trim();
                      console.log(`\u2705 Coment\u00E1rio via API HTML (${_capturedComment.length} chars)`);
                      return true;
                    }
                  }
                }
              }
            }
          } else {
            console.log(`    \u274C ${resp.status}`);
          }
        } catch (err) {
          console.log(`    \u274C ${err.message}`);
        }
      }
    }

    // \u2500\u2500 Strategy 5: DOM fallback \u2500\u2500
    console.log('\n\uD83D\uDD0D Strategy 5: DOM fallback...');
    const tecElements = document.querySelectorAll('[tec-formatar-html]');
    const enunciadoText = vm?.questao?.enunciado ||
                          document.querySelector('.questao-enunciado-texto')?.innerText?.trim() || '';
    const enunciadoPlain = stripHtml(enunciadoText);

    for (const el of tecElements) {
      const attr = el.getAttribute('tec-formatar-html') || '';
      const text = el.innerText.trim();
      console.log(`  [${attr}] \u2192 ${text.length} chars`);
      if (/coment/i.test(attr) && text.length > 30) {
        if (text !== enunciadoPlain && !text.startsWith(enunciadoPlain.substring(0, 50))) {
          _capturedComment = text;
          console.log(`\u2705 Coment\u00E1rio via DOM [${attr}] (${text.length} chars)`);
          return true;
        }
      }
    }
    for (const el of tecElements) {
      const text = el.innerText.trim();
      if (text.length > 200 && text !== enunciadoPlain &&
          !text.startsWith(enunciadoPlain.substring(0, 50))) {
        _capturedComment = text;
        console.log(`\u2705 Coment\u00E1rio via DOM gen\u00E9rico (${text.length} chars)`);
        return true;
      }
    }

    console.warn('\u23F0 Nenhum coment\u00E1rio capturado ap\u00F3s 5 estrat\u00E9gias.');
    return false;
  }

  function trySelect(selectors, context = document) {
    for (const sel of selectors) {
      try { const el = context.querySelector(sel); if (el) return el; } catch (_) { /* skip invalid */ }
    }
    return null;
  }

  function trySelectAll(selectors, context = document) {
    for (const sel of selectors) {
      try { const els = context.querySelectorAll(sel); if (els.length) return [...els]; } catch (_) { /* skip */ }
    }
    return [];
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                    4. TOAST SYSTEM                           \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  function ensureToastContainer() {
    let c = document.getElementById('tec-toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'tec-toast-container'; document.body.appendChild(c); }
    return c;
  }

  function showToast(message, type = 'info', duration = 4000) {
    const container = ensureToastContainer();
    const icons = { success: '\u2705', error: '\u274C', info: '\u2139\uFE0F', warning: '\u26A0\uFE0F' };
    const toast = document.createElement('div');
    toast.className = `tec-toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, duration);
    return toast;
  }

  function showLoadingToast(message) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = 'tec-toast info';
    toast.innerHTML = `<span class="tec-spinner"></span><span>${message}</span>`;
    container.appendChild(toast);
    return toast;
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  5. DOM EXTRACTION                           \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  const SEL = {
    questionText: [
      '.questao-enunciado-texto',
      '.questao-texto',
      '[class*="enunciado-texto"]',
    ],
    alternatives: [
      '.questao-enunciado-alternativas',
      'ul[class*="alternativa"]',
      'ol[class*="alternativa"]',
    ],
    altItem: [
      '.questao-enunciado-alternativa',
      'li[class*="alternativa"]',
      '[class*="alternativa-item"]',
    ],
    altLetter: [
      '.questao-enunciado-alternativa-opcao',
      '[class*="alternativa-opcao"]',
    ],
    altText: [
      '.questao-enunciado-alternativa-texto',
      '[class*="alternativa-texto"]',
    ],
    comment: [
      '[tec-formatar-html*="textoComentario"]',
      '[tec-formatar-html*="comentario"]',
      '.comentario-corpo',
      '[class*="comentario"] [class*="texto"]',
      'article[ng-if*="comentario"] .texto',
    ],
    materia: [
      'a[href*="materia"]',
      '[class*="materia"] a',
    ],
    assunto: [
      '.questao-assunto',
      '[class*="assunto"]',
    ],
  };

  /**
   * Gets the Angular scope vm for the current question.
   * Returns { scope, vm } or { scope: null, vm: null }.
   */
  function getAngularVm() {
    const ng = unsafeWindow?.angular;
    if (!ng) return { scope: null, vm: null };
    const anchorEl = document.querySelector('[tec-formatar-html]') ||
                     document.querySelector('.questao-corpo') ||
                     document.querySelector('.questao-enunciado') ||
                     document.querySelector('[ng-controller]');
    if (!anchorEl) return { scope: null, vm: null };
    try {
      const scope = ng.element(anchorEl).scope();
      const vm = scope?.vm || scope?.$ctrl || scope;
      return { scope, vm };
    } catch (_) {
      return { scope: null, vm: null };
    }
  }

  /**
   * Main extraction function \u2014 reads the current question.
   * Primary source: Angular scope (vm.questao) \u2014 always matches TEC exactly.
   * Fallback: DOM scraping for anything Angular doesn't provide.
   */
  function extractQuestionData() {
    const data = {
      id: null, banca: '', ano: '', cargo: '', concurso: '',
      materia: '', assunto: '', enunciado: '', tipo: '',
      alternativas: [], respostaAluno: '', gabarito: '',
      errou: false, comentario: '', url: window.location.href,
    };

    // \u2500\u2500 Try Angular scope first (most reliable) \u2500\u2500
    const { vm } = getAngularVm();
    const q = vm?.questao;

    if (q) {
      console.log('\uD83D\uDCCB Extra\u00E7\u00E3o via Angular scope (vm.questao)');

      // Metadata
      data.id = String(q.idQuestao || '');
      data.banca = q.bancaSigla || '';
      data.ano = String(q.concursoAno || '');
      data.cargo = q.cargoSigla || '';
      data.materia = q.nomeMateria || '';
      data.assunto = q.nomeAssunto || '';

      // Enunciado (Angular stores HTML, strip it for plain text)
      data.enunciado = stripHtml(q.enunciado || '');

      // Type
      if (q.tipoQuestao === 'CERTO_ERRADO') {
        data.tipo = 'certo_errado';
      } else if (q.tipoQuestao === 'MULTIPLA_ESCOLHA') {
        data.tipo = 'multipla_escolha';
      }

      // Alternatives
      if (Array.isArray(q.alternativas)) {
        const labels = data.tipo === 'certo_errado'
          ? ['Certo', 'Errado']
          : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        q.alternativas.forEach((alt, i) => {
          const texto = stripHtml(typeof alt === 'string' ? alt : (alt?.texto || alt?.descricao || ''));
          const letra = labels[i] || String(i + 1);
          const numAlt = i + 1; // 1-based
          data.alternativas.push({
            letra,
            texto,
            selecionada: q.alternativaSelecionada === numAlt,
            correta: q.numeroAlternativaCorreta === numAlt,
          });
        });
      }

      // Result
      data.errou = q.correcaoQuestao === false && q.alternativaSelecionada > 0;
      data.gabarito = data.alternativas.find(a => a.correta)?.letra || '';
      data.respostaAluno = data.alternativas.find(a => a.selecionada)?.letra || '';

    } else {
      // \u2500\u2500 Fallback: DOM scraping \u2500\u2500
      console.log('\uD83D\uDCCB Extra\u00E7\u00E3o via DOM (Angular scope indispon\u00EDvel)');

      const bodyText = document.body.innerText;

      // 1. Question ID + Metadata
      const metaRegex = /#(\d{5,})\s+(.+?)\s*[-\u2013]\s*(\d{4})\s*[-\u2013]\s*(.+?)(?:\s*\u00D7|\s*$)/m;
      const metaMatch = bodyText.match(metaRegex);
      if (metaMatch) {
        data.id = metaMatch[1];
        data.banca = metaMatch[2].trim();
        data.ano = metaMatch[3];
        data.cargo = metaMatch[4].trim();
      }
      if (!data.id) {
        const idFallback = bodyText.match(/#(\d{5,})/);
        if (idFallback) data.id = idFallback[1];
      }

      // 2. Mat\u00E9ria
      const materiaEl = trySelect(SEL.materia);
      if (materiaEl) {
        data.materia = materiaEl.textContent.trim();
      }

      // 3. Assunto
      const exibirBtn = [...document.querySelectorAll('a, button, span')].find(
        el => el.textContent.trim().match(/^\(?\s*Exibir\s*\)?$/i)
      );
      if (exibirBtn) { try { exibirBtn.click(); } catch (_) {} }

      const assuntoEl = trySelect(SEL.assunto);
      if (assuntoEl) {
        data.assunto = assuntoEl.textContent.replace(/Assunto:?\s*/i, '').replace(/\(?\s*Exibir\s*\)?/i, '').trim();
      }

      // 4. Enunciado
      const enunciadoEl = trySelect(SEL.questionText);
      if (enunciadoEl) {
        data.enunciado = enunciadoEl.innerText.trim();
      }

      // 5. Alternativas
      const altItems = trySelectAll(SEL.altItem);
      if (altItems.length > 0) {
        altItems.forEach(item => {
          const letterEl = trySelect(SEL.altLetter.map(s => s), item) || item.querySelector('label');
          const textEl = trySelect(SEL.altText.map(s => s), item) || item;
          const letra = letterEl ? letterEl.textContent.trim().replace(/[).\s]/g, '') : '';
          const texto = textEl ? textEl.innerText.trim() : item.innerText.trim();
          if (!letra && !texto) return;

          const classes = item.className + ' ' + (item.parentElement?.className || '');
          const isSelected = /selecionad|selected|marcad|active|escolhid/i.test(classes);
          const isCorrect = /corret|correct|gabarito|acert/i.test(classes);
          data.alternativas.push({ letra, texto, selecionada: isSelected, correta: isCorrect });
        });
      }

      // Detect type
      if (data.alternativas.length === 2 &&
          data.alternativas.some(a => /^(certo|c)$/i.test(a.texto || a.letra)) &&
          data.alternativas.some(a => /^(errado|e)$/i.test(a.texto || a.letra))) {
        data.tipo = 'certo_errado';
      } else if (data.alternativas.length >= 3) {
        data.tipo = 'multipla_escolha';
      }

      // 6. Result
      data.errou = !!bodyText.match(/Voc\u00EA errou/i);
      const gabaritoMatch = bodyText.match(/Gabarito:\s*(.+?)(?:\.|,|\s|$)/i);
      if (gabaritoMatch) data.gabarito = gabaritoMatch[1].trim();
      const selMatch = bodyText.match(/Voc\u00EA selecionou:\s*(.+?)(?:,|\.|$)/im);
      if (selMatch) data.respostaAluno = selMatch[1].trim();
      if (!data.gabarito) {
        const correta = data.alternativas.find(a => a.correta);
        if (correta) data.gabarito = correta.letra || correta.texto;
      }
    }

    // \u2500\u2500 7. Coment\u00E1rio do Professor (always from _capturedComment) \u2500\u2500
    if (_capturedComment && _capturedComment.length > 50) {
      data.comentario = _capturedComment;
      console.log(`\u2705 Coment\u00E1rio extra\u00EDdo (${_capturedComment.length} chars)`);
    } else {
      const tecElements = document.querySelectorAll('[tec-formatar-html]');
      const enunciadoText = data.enunciado || '';
      for (const el of tecElements) {
        const attr = el.getAttribute('tec-formatar-html') || '';
        const text = el.innerText.trim();
        if (/coment/i.test(attr) && text.length > 50) {
          data.comentario = text;
          break;
        }
      }
      if (!data.comentario) {
        data.comentario = '';
        console.log('\u2139\uFE0F Coment\u00E1rio do professor n\u00E3o encontrado.');
      }
    }

    // \u2500\u2500 8. Build question URL \u2500\u2500
    if (data.id) {
      data.url = `https://www.tecconcursos.com.br/questoes/${data.id}`;
    }

    console.log(`\uD83D\uDCCB Dados extra\u00EDdos: Q${data.id} | ${data.materia} > ${data.assunto} | ${data.tipo}`);
    return data;
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                   6. GEMINI API                              \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  const SYSTEM_PROMPT = `Voc\u00EA \u00E9 um especialista em concursos p\u00FAblicos e cria\u00E7\u00E3o de flashcards para Anki. Receba os dados de uma quest\u00E3o e crie flashcards cir\u00FArgicos conforme o cen\u00E1rio (quest\u00E3o errada OU acertada).

## O que fazer

1. Leia os dados da quest\u00E3o fornecidos
2. Verifique se o aluno ERROU ou ACERTOU a quest\u00E3o
3. Siga as instru\u00E7\u00F5es do cen\u00E1rio correspondente abaixo

---

## CEN\u00C1RIO 1: QUEST\u00C3O ERRADA

Identifique com precis\u00E3o:
- Qual alternativa o aluno marcou (a errada)
- Qual o gabarito correto
- POR QUE o aluno errou: qual confus\u00E3o, troca, ou lacuna espec\u00EDfica causou o erro

Crie 2-3 flashcards que corrigem EXATAMENTE essa confus\u00E3o.

### REGRA DE OURO: foque no MECANISMO DO ERRO, n\u00E3o no tema geral

O objetivo N\u00C3O \u00E9 ensinar o assunto de forma gen\u00E9rica. \u00C9 CORRIGIR a confus\u00E3o espec\u00EDfica que fez o aluno errar.

### Exemplos de erros comuns e como abordar:

**Erro por TROCA/INVERS\u00C3O de conceitos:**
Se a banca trocou as descri\u00E7\u00F5es de dois institutos, o card deve for\u00E7ar o aluno a DISTINGUIR X de Y. Fa\u00E7a cards comparativos.

**Erro por EXCE\u00C7\u00C3O desconhecida:**
Se o aluno generalizou uma regra que tem exce\u00E7\u00E3o, o card deve focar na exce\u00E7\u00E3o.

**Erro por CONFUS\u00C3O de compet\u00EAncia/sujeito:**
Se a banca trocou quem faz o qu\u00EA, o card deve testar: "Quem \u00E9 competente para X: A ou B?"

**Erro por PEGADINHA de reda\u00E7\u00E3o:**
Se um item parece certo mas tem uma palavra que o torna errado, o card deve focar nessa distin\u00E7\u00E3o sutil.

**Erro por GENERALIZA\u00C7\u00C3O (como "toda norma...", "sempre...", "nunca..."):**
Se o item generalizou uma regra que tem exce\u00E7\u00F5es, o card deve testar a regra vs exce\u00E7\u00E3o.

### Tipos de cards para quest\u00E3o ERRADA (em ordem de prioridade):

1. **Card da distin\u00E7\u00E3o (OBRIGAT\u00D3RIO):** Pergunta que for\u00E7a o aluno a distinguir os conceitos que ele CONFUNDIU.
2. **Card da regra correta:** Pergunta direta sobre o artigo, s\u00FAmula ou regra que fundamenta a resposta correta.
3. **Card da armadilha (se relevante):** "Verdadeiro ou falso" usando a mesma constru\u00E7\u00E3o enganosa da banca.

**No campo "erro_identificado":** descreva o mecanismo do erro (ex: "Confundiu compet\u00EAncia da Uni\u00E3o com a dos Estados").

---

## CEN\u00C1RIO 2: QUEST\u00C3O ACERTADA

Quando o aluno ACERTA mas pede cards, \u00E9 porque N\u00C3O teve certeza da resposta. O objetivo \u00E9 BLINDAR esse conhecimento.

Identifique com precis\u00E3o:
- Qual a PEGADINHA ou NUANCE da quest\u00E3o (o que a tornava dif\u00EDcil)
- Qual o detalhe sutil que a banca explorou para confundir
- Quais alternativas eram mais "sedutoras" e por qu\u00EA

### Tipos de cards para quest\u00E3o ACERTADA (em ordem de prioridade):

1. **Card da pegadinha (OBRIGAT\u00D3RIO):** Exponha a armadilha da banca. Se havia uma alternativa que PARECIA certa mas n\u00E3o era, o card deve testar por que ela est\u00E1 errada.
2. **Card da nuance:** Teste a distin\u00E7\u00E3o sutil que tornava a quest\u00E3o dif\u00EDcil. Se havia exce\u00E7\u00E3o, condi\u00E7\u00E3o, ou detalhe de reda\u00E7\u00E3o que mudava tudo, foque nisso.
3. **Card de refor\u00E7o (se relevante):** Pergunta que consolida a regra central com suas exce\u00E7\u00F5es ou condi\u00E7\u00F5es.

**No campo "erro_identificado":** descreva a pegadinha/nuance da quest\u00E3o (ex: "A alternativa B parecia correta por usar 'sempre que poss\u00EDvel', mas o art. X n\u00E3o admite exce\u00E7\u00E3o neste caso").

## Regras gerais para os flashcards

- O PRIMEIRO card SEMPRE deve atacar o ponto central: a confus\u00E3o (se errou) ou a pegadinha/nuance (se acertou)
- Perguntas no presente, ativas: "Qual...", "Quais...", "Verdadeiro ou falso:..."
- Use perguntas COMPARATIVAS quando o erro envolver troca de conceitos
- Respostas CONCISAS \u2014 m\u00E1ximo 3 linhas. Se precisar de lista, use bullets curtos
- NUNCA crie cards gen\u00E9ricos sobre o assunto. Cada card deve ter rela\u00E7\u00E3o direta com o motivo do erro
- NUNCA copie o enunciado da quest\u00E3o. O card deve testar o CONCEITO, n\u00E3o a quest\u00E3o espec\u00EDfica
- Se a quest\u00E3o envolver artigo de lei, cite o artigo no verso
- Gere 2 cards por padr\u00E3o. S\u00F3 gere 3 se houver uma distin\u00E7\u00E3o conceitual importante a mais
- materia: nome oficial como em editais (Direito Constitucional, Direito Tribut\u00E1rio, etc.)
- ATEN\u00C7\u00C3O na classifica\u00E7\u00E3o de mat\u00E9ria: classifique pelo CONTE\u00DADO T\u00C9CNICO do tema
- subtopico: espec\u00EDfico (ex: "Aplicabilidade das Normas - Art. 5\u00BA \u00A71\u00BA CF", n\u00E3o "Normas")

## Campos de cada card (OBRIGAT\u00D3RIO gerar TODOS)

Para cada card, gere QUATRO campos de conte\u00FAdo:

1. **frente_texto_limpo**: texto puro da pergunta, SEM qualquer HTML. Usado para auditoria.
2. **verso_texto_limpo**: texto puro da resposta, SEM qualquer HTML. Usado para auditoria.
3. **frente_html**: mesma pergunta, COM formata\u00E7\u00E3o HTML (tags <b>, <mark>, <span class="neg">, etc.)
4. **verso_html**: mesma resposta, COM formata\u00E7\u00E3o HTML.
5. **palavras_chave**: express\u00F5es can\u00F4nicas (plain text, separadas por |).

Os campos texto_limpo e html devem ter o MESMO conte\u00FAdo sem\u00E2ntico \u2014 a \u00FAnica diferen\u00E7a \u00E9 a presen\u00E7a de tags HTML.

## Formata\u00E7\u00E3o HTML dos campos frente_html e verso_html

Use HTML inline para destacar visualmente os elementos-chave dentro do texto dos cards. Isso \u00E9 FUNDAMENTAL para facilitar a memoriza\u00E7\u00E3o.

### Tags dispon\u00EDveis (use sempre que aplic\u00E1vel):

- **<b>texto</b>** \u2192 para termos jur\u00EDdicos centrais, nomes de princ\u00EDpios, institutos (ex: <b>legalidade tribut\u00E1ria</b>)
- **<span class="neg">texto</span>** \u2192 para NEGA\u00C7\u00D5ES, exce\u00E7\u00F5es, veda\u00E7\u00F5es, alertas (ex: <span class="neg">N\u00C3O exige lei para altera\u00E7\u00E3o de prazo</span>)
- **<mark>texto</mark>** \u2192 para palavras-chave cr\u00EDticas dentro da frase que o aluno deve gravar (ex: a legalidade \u00E9 sobre a <mark>forma</mark>; a anterioridade \u00E9 sobre o <mark>tempo</mark>)
- **<ul><li>texto</li></ul>** \u2192 para listas enumerativas (ex: atos que exigem lei: institui\u00E7\u00E3o, aumento, majora\u00E7\u00E3o de al\u00EDquota, altera\u00E7\u00E3o de base de c\u00E1lculo)
- **<span class="ref">texto</span>** \u2192 para refer\u00EAncias legais e artigos (ex: <span class="ref">CF art. 150, I</span>)

### Regras de formata\u00E7\u00E3o:
- Use <b> em TODA men\u00E7\u00E3o a conceitos jur\u00EDdicos importantes no verso
- Use <span class="neg"> SEMPRE que houver nega\u00E7\u00E3o, veda\u00E7\u00E3o, exce\u00E7\u00E3o ou contraste ("N\u00C3O", "vedado", "salvo", "exceto")
- Use <mark> com modera\u00E7\u00E3o (1-3 palavras por card) apenas nas palavras que s\u00E3o o N\u00DACLEO da distin\u00E7\u00E3o
- Na FRENTE do card, use <b> para o termo central da pergunta e <mark> para destaques pontuais
- Listas com <ul><li> s\u00E3o prefer\u00EDveis a texto corrido quando h\u00E1 3+ itens
- NUNCA use tags de formata\u00E7\u00E3o no campo palavras_chave (\u00E9 plain text)

## Palavras-chave consagradas

Para cada card, inclua no campo "palavras_chave" as EXPRESS\u00D5ES CAN\u00D4NICAS que identificam o conceito/instituto jur\u00EDdico abordado. S\u00E3o os termos consagrados na lei, doutrina ou jurisprud\u00EAncia que funcionam como "impress\u00E3o digital" daquele conceito \u2014 quando o aluno v\u00EA essas palavras num enunciado longo, deve imediatamente reconhecer de qual instituto se trata.

### O que S\u00C3O palavras-chave (exemplos por conceito):
- Capacidade contributiva \u2192 "circunst\u00E2ncias pessoais", "capacidade econ\u00F4mica real", "ser\u00E1 pessoal sempre que poss\u00EDvel"
- Princ\u00EDpio da legalidade tribut\u00E1ria \u2192 "somente a lei pode", "instituir ou aumentar tributo", "vedado \u00E0 Uni\u00E3o, Estados..."
- Imunidade rec\u00EDproca \u2192 "vedado cobrar impostos", "patrim\u00F4nio, renda ou servi\u00E7os uns dos outros"
- Devido processo legal \u2192 "contradit\u00F3rio e ampla defesa", "privado de seus bens", "sem o devido processo"
- Ato administrativo vinculado \u2192 "a Administra\u00E7\u00E3o DEVE", "preenchidos os requisitos", "direito subjetivo"

### O que N\u00C3O s\u00E3o palavras-chave:
- Palavras gen\u00E9ricas do tema: "STF", "imposto de renda", "dedu\u00E7\u00F5es", "tributo"
- Nomes de institutos: o nome do conceito em si n\u00E3o \u00E9 palavra-chave, s\u00E3o as express\u00F5es que SINALIZAM ele

### Regras:
- Liste 2-5 express\u00F5es por card (as mais recorrentes em provas para aquele conceito)
- Priorize trechos literais de artigos de lei ou s\u00FAmulas
- Se n\u00E3o houver express\u00F5es can\u00F4nicas claras para o conceito, deixe o campo vazio ("")`;

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Mat\u00E9ria do edital' },
      subtopico: { type: 'string', description: 'Subt\u00F3pico espec\u00EDfico' },
      erro_identificado: { type: 'string', description: 'Se errou: descri\u00E7\u00E3o do mecanismo do erro. Se acertou: descri\u00E7\u00E3o da pegadinha/nuance que tornava a quest\u00E3o dif\u00EDcil.' },
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            frente_texto_limpo: { type: 'string', description: 'Pergunta do flashcard em texto puro (sem HTML)' },
            verso_texto_limpo: { type: 'string', description: 'Resposta do flashcard em texto puro (sem HTML, max 3 linhas)' },
            frente_html: { type: 'string', description: 'Pergunta do flashcard com formata\u00E7\u00E3o HTML (<b>, <mark>, <span class="neg">, etc.)' },
            verso_html: { type: 'string', description: 'Resposta do flashcard com formata\u00E7\u00E3o HTML (<b>, <mark>, <span class="neg">, etc., max 3 linhas)' },
            palavras_chave: { type: 'string', description: 'Express\u00F5es can\u00F4nicas da lei/doutrina que identificam este conceito jur\u00EDdico, separadas por " | ". Vazio se n\u00E3o houver.' },
          },
          required: ['frente_texto_limpo', 'verso_texto_limpo', 'frente_html', 'verso_html', 'palavras_chave'],
        },
      },
    },
    required: ['materia', 'subtopico', 'erro_identificado', 'cards'],
  };

  function buildGeminiPrompt(q) {
    const altsText = q.alternativas.map(a => {
      let line = `${a.letra}) ${a.texto}`;
      if (a.selecionada) line += ' \u2190 ALUNO MARCOU ESTA';
      if (a.correta) line += ' \u2190 GABARITO CORRETO';
      return line;
    }).join('\n');

    return `## Dados da Quest\u00E3o ${q.errou ? 'Errada' : 'Acertada'}

**ID:** #${q.id || 'N/A'}
**Banca:** ${q.banca || 'N/A'}
**Ano:** ${q.ano || 'N/A'}
**Cargo:** ${q.cargo || 'N/A'}
**Mat\u00E9ria:** ${q.materia || 'N/A'}
**Assunto:** ${q.assunto || 'N/A'}
**Tipo:** ${q.tipo === 'certo_errado' ? 'Certo/Errado' : 'M\u00FAltipla Escolha'}

### Enunciado
${q.enunciado || 'N\u00E3o dispon\u00EDvel'}

### Alternativas
${altsText || 'N\u00E3o dispon\u00EDveis'}

### Resultado
- **Aluno marcou:** ${q.respostaAluno || 'N/A'}
- **Gabarito:** ${q.gabarito || 'N/A'}
- **Resultado:** ${q.errou ? 'ERROU \u274C' : 'ACERTOU \u2705'}

### Coment\u00E1rio do Professor
${q.comentario || 'N\u00E3o dispon\u00EDvel'}

---
Com base nas informa\u00E7\u00F5es acima, identifique o mecanismo do erro e crie 2-3 flashcards cir\u00FArgicos.`;
  }

  async function callGemini(questionData) {
    const apiKey = getSetting('geminiApiKey');
    const model = getSetting('geminiModel');
    if (!apiKey) throw new Error('API key do Gemini n\u00E3o configurada. Abra as configura\u00E7\u00F5es (\u2699\uFE0F).');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(questionData) }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const MAX_RETRIES = 3;
    let res;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      res = await gmFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeout: 45000,
      });

      if (res.ok) break;

      // Retry on 429 (rate limit) or 503 (overloaded)
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const waitSec = attempt * 5; // 5s, 10s
        console.warn(`\u26A0\uFE0F Gemini ${res.status} \u2014 tentativa ${attempt}/${MAX_RETRIES}, aguardando ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Resposta vazia do Gemini');

    const parsed = JSON.parse(text);
    // Normalize card fields for backward compat
    for (const card of (parsed.cards || [])) {
      if (card.frente_html && !card.frente) {
        card.frente = card.frente_html;
        card.verso = card.verso_html;
      }
      if (card.frente && !card.frente_html) {
        card.frente_html = card.frente;
        card.verso_html = card.verso;
        card.frente_texto_limpo = card.frente.replace(/<[^>]+>/g, '');
        card.verso_texto_limpo = card.verso.replace(/<[^>]+>/g, '');
      }
    }
    return parsed;
  }

  // ── OpenRouter (OpenAI-compatible) ──────────────────────────────────

  const OPENROUTER_MODELS = [
    { id: 'google/gemma-4-31b-it:free',          label: '\u2B50 Gemma 4 31B (GRATUITO)' },
    { id: 'qwen/qwen3-235b-a22b-2507',            label: 'Qwen3 235B ($0.07/M tok \u2014 recomendado)' },
    { id: 'openai/gpt-4o-mini',                  label: 'GPT-4o Mini ($0.39/M tok)' },
    { id: 'deepseek/deepseek-v3.2',              label: 'DeepSeek V3.2 ($0.41/M tok)' },
    { id: 'google/gemini-2.5-flash',             label: 'Gemini 2.5 Flash ($1.30/M tok)' },
    { id: 'anthropic/claude-3.5-haiku',          label: 'Claude 3.5 Haiku ($2.40/M tok)' },
    { id: 'anthropic/claude-haiku-4.5',          label: 'Claude Haiku 4.5 ($3.00/M tok)' },
  ];

  // Models for dual pipeline (creator + auditor)
  const PIPELINE_CREATOR_MODELS = [
    { id: 'moonshotai/kimi-k2.5',                label: 'Kimi K2.5 — IFEval 100% ($0.60/$2.00 M tok)' },
    { id: 'qwen/qwen3-235b-a22b-2507',            label: 'Qwen3 235B ($0.07/M tok)' },
    { id: 'deepseek/deepseek-v3.2',              label: 'DeepSeek V3.2 ($0.41/M tok)' },
  ];
  const PIPELINE_AUDITOR_MODELS = [
    { id: 'google/gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro Preview — GPQA 94.1% ($1.25/$10 M tok)' },
    { id: 'google/gemini-2.5-flash',             label: 'Gemini 2.5 Flash ($1.30/M tok)' },
    { id: 'anthropic/claude-haiku-4.5',          label: 'Claude Haiku 4.5 ($3.00/M tok)' },
  ];

  async function callOpenRouter(questionData) {
    const apiKey = getSetting('openrouterApiKey');
    const model = getSetting('openrouterModel');
    if (!apiKey) throw new Error('API key do OpenRouter n\u00E3o configurada. Abra as configura\u00E7\u00F5es (\u2699\uFE0F).');

    const schemaDescription = `Responda SOMENTE com JSON v\u00E1lido neste formato exato (sem markdown, sem coment\u00E1rios):
{
  "materia": "string - mat\u00E9ria do edital",
  "subtopico": "string - subt\u00F3pico espec\u00EDfico",
  "erro_identificado": "string - se errou: mecanismo do erro. Se acertou: pegadinha/nuance que tornava a quest\u00E3o dif\u00EDcil",
  "cards": [
    {
      "frente_texto_limpo": "string - pergunta em texto puro, sem HTML",
      "verso_texto_limpo": "string - resposta em texto puro, sem HTML (max 3 linhas)",
      "frente_html": "string - mesma pergunta com formata\u00E7\u00E3o HTML (<b>, <mark>, <span class=\\"neg\\">)",
      "verso_html": "string - mesma resposta com formata\u00E7\u00E3o HTML",
      "palavras_chave": "string - express\u00F5es can\u00F4nicas separadas por | . Vazio se n\u00E3o houver"
    }
  ]
}`;

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + schemaDescription },
        { role: 'user', content: buildGeminiPrompt(questionData) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    };

    const MAX_RETRIES = 5;
    let res;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      res = await gmFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/filipegajo89/anki-tec',
          'X-Title': 'TEC-to-Anki',
        },
        body: JSON.stringify(body),
        timeout: 60000,
      });

      if (res.ok) break;

      // Retry on 429 (rate limit) or 503 (overloaded) with progressive backoff
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const waitSec = res.status === 429 ? attempt * 8 : attempt * 5; // longer waits for rate limits
        console.warn(`\u26A0\uFE0F OpenRouter ${res.status} \u2014 tentativa ${attempt}/${MAX_RETRIES}, aguardando ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
    }

    const json = await res.json();

    // OpenRouter returns OpenAI-compatible format
    let content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia do OpenRouter');

    // Strip markdown code fences if model wrapped JSON in ```json ... ```
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    // Some models return extra text after (or before) the JSON object.
    // Extract the first valid JSON object from the response.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta do OpenRouter n\u00E3o cont\u00E9m JSON v\u00E1lido.');
    content = jsonMatch[0];

    // Parse and validate structure
    const parsed = JSON.parse(content);
    if (!parsed.materia || !parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Resposta do OpenRouter em formato inv\u00E1lido. Tente novamente.');
    }
    // Ensure every card has required fields (support both old and new format)
    for (const card of parsed.cards) {
      const hasNew = card.frente_html && card.verso_html;
      const hasOld = card.frente && card.verso;
      if (!hasNew && !hasOld) {
        throw new Error('Um ou mais flashcards est\u00E3o incompletos na resposta da IA.');
      }
      // Normalize: ensure both old and new field names exist for backward compat
      if (hasNew && !hasOld) {
        card.frente = card.frente_html;
        card.verso = card.verso_html;
      }
      if (hasOld && !hasNew) {
        card.frente_html = card.frente;
        card.verso_html = card.verso;
        card.frente_texto_limpo = card.frente.replace(/<[^>]+>/g, '');
        card.verso_texto_limpo = card.verso.replace(/<[^>]+>/g, '');
      }
    }
    return parsed;
  }

  // ── AI Dispatcher ───────────────────────────────────────────────────

  async function callAI(questionData) {
    const provider = getSetting('aiProvider');
    if (provider === 'openrouter') {
      return callOpenRouter(questionData);
    }
    return callGemini(questionData);
  }

  // ── Dual Pipeline (Creator → Filter → Auditor) ─────────────────────

  const AUDITOR_SYSTEM_PROMPT = `Você é um juiz jurídico implacável especializado em concursos públicos brasileiros. Sua função é AUDITAR flashcards gerados por outra IA para garantir precisão absoluta.

## Sua tarefa

Receba uma lista de flashcards (frente + verso em texto limpo) junto com o contexto da questão (banca, comentário do professor, gabarito). Para CADA card, avalie:

1. **Precisão jurídica:** O conteúdo está correto? Cita corretamente artigos, súmulas, jurisprudência?
2. **Coerência com o gabarito:** O card reflete corretamente o que a banca considerou certo/errado?
3. **Coerência com o comentário do professor:** O card contradiz o que o professor explicou?
4. **Clareza:** A pergunta é clara e a resposta é objetiva?
5. **Relevância:** O card ataca o ponto central (mecanismo do erro ou pegadinha)?

## Critérios de REJEIÇÃO (qualquer um = REJEITADO):
- Informação juridicamente incorreta ou desatualizada
- Contradição com o gabarito oficial ou comentário do professor
- Inversão de conceitos (atribuir a X o que é de Y)
- Resposta ambígua ou genérica demais
- Pergunta que não testa o conceito relevante

## Formato de resposta

Responda SOMENTE com JSON válido:
{
  "cards": [
    { "index": 0, "status": "APROVADO" },
    { "index": 1, "status": "REJEITADO", "justificativa": "string - razão precisa da rejeição" }
  ]
}

Seja RIGOROSO. Na dúvida, REJEITE. É melhor gerar de novo do que enviar um card incorreto ao Anki.`;

  /**
   * Call OpenRouter with a specific model (used by creator and auditor).
   * Returns parsed JSON response.
   */
  async function callOpenRouterWithModel(model, systemPrompt, userPrompt, extraBody = {}) {
    const apiKey = getSetting('openrouterApiKey');
    if (!apiKey) throw new Error('API key do OpenRouter não configurada.');

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      ...extraBody,
    };

    const MAX_RETRIES = 5;
    let res;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      res = await gmFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/filipegajo89/anki-tec',
          'X-Title': 'TEC-to-Anki',
        },
        body: JSON.stringify(body),
        timeout: 90000,
      });

      if (res.ok) break;

      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const waitSec = res.status === 429 ? attempt * 8 : attempt * 5;
        console.warn(`⚠️ OpenRouter ${res.status} — tentativa ${attempt}/${MAX_RETRIES}, aguardando ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    let content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia do OpenRouter');

    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido.');

    // Estimate cost from usage if available
    const usage = json?.usage;
    const costEstimate = usage ? { promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 } : null;

    const parsed = JSON.parse(jsonMatch[0]);
    parsed._usage = costEstimate;
    return parsed;
  }

  /**
   * Step 1: Call the Creator model to generate flashcards.
   */
  async function callCreator(questionData, feedback = null) {
    const model = getSetting('creatorModel');
    const schemaDescription = `Responda SOMENTE com JSON válido neste formato exato (sem markdown, sem comentários):
{
  "materia": "string - matéria do edital",
  "subtopico": "string - subtópico específico",
  "erro_identificado": "string - se errou: mecanismo do erro. Se acertou: pegadinha/nuance",
  "cards": [
    {
      "frente_texto_limpo": "string - pergunta em texto puro, sem HTML",
      "verso_texto_limpo": "string - resposta em texto puro, sem HTML (max 3 linhas)",
      "frente_html": "string - mesma pergunta com formatação HTML (<b>, <mark>, <span class=\\"neg\\">)",
      "verso_html": "string - mesma resposta com formatação HTML",
      "palavras_chave": "string - expressões canônicas separadas por | . Vazio se não houver"
    }
  ]
}`;

    let userPrompt = buildGeminiPrompt(questionData);
    if (feedback) {
      userPrompt += `\n\n---\n⚠️ ATENÇÃO: Uma auditoria anterior REJEITOU alguns cards. Corrija com base no feedback:\n${feedback}`;
    }

    const result = await callOpenRouterWithModel(
      model,
      SYSTEM_PROMPT + '\n\n' + schemaDescription,
      userPrompt
    );

    if (!result.materia || !result.cards || !Array.isArray(result.cards)) {
      throw new Error('Resposta do Creator em formato inválido.');
    }

    // Normalize fields
    for (const card of result.cards) {
      if (!card.frente_html && card.frente) {
        card.frente_html = card.frente;
        card.verso_html = card.verso;
        card.frente_texto_limpo = card.frente.replace(/<[^>]+>/g, '');
        card.verso_texto_limpo = card.verso.replace(/<[^>]+>/g, '');
      }
      card.frente = card.frente_html;
      card.verso = card.verso_html;
    }

    return result;
  }

  /**
   * Step 2: Filter creator output for auditor — extract texto_limpo + question context.
   * Reduces token payload from ~4100 to ~800 tokens.
   */
  function filterForAuditor(creatorResult, questionData) {
    const cards = creatorResult.cards.map((card, i) => ({
      index: i,
      frente: card.frente_texto_limpo,
      verso: card.verso_texto_limpo,
    }));

    return `## Cards para auditoria

${cards.map(c => `### Card ${c.index}
**Frente:** ${c.frente}
**Verso:** ${c.verso}`).join('\n\n')}

---
## Contexto da questão
- **Banca:** ${questionData.banca || 'N/A'}
- **Resultado:** ${questionData.errou ? 'ERROU ❌' : 'ACERTOU ✅'}
- **Gabarito:** ${questionData.gabarito || 'N/A'}
- **Resposta do aluno:** ${questionData.respostaAluno || 'N/A'}

### Comentário do Professor
${questionData.comentario || 'Não disponível'}`;
  }

  /**
   * Step 3: Call the Auditor model to validate cards.
   * Returns { cards: [{ index, status, justificativa? }] }
   */
  async function callAuditor(filteredPayload) {
    const model = getSetting('auditorModel');
    const result = await callOpenRouterWithModel(
      model,
      AUDITOR_SYSTEM_PROMPT,
      filteredPayload,
      { reasoning: { effort: 'high' } }
    );

    if (!result.cards || !Array.isArray(result.cards)) {
      throw new Error('Resposta do Auditor em formato inválido.');
    }
    return result;
  }

  /**
   * Track pipeline cost from usage data.
   */
  function trackPipelineCost(usage, model) {
    if (!usage) return 0;
    // Approximate pricing per 1M tokens (input/output) for known models
    const pricing = {
      'moonshotai/kimi-k2.5':           { input: 0.60, output: 2.00 },
      'google/gemini-3.1-pro-preview':   { input: 1.25, output: 10.00 },
      'qwen/qwen3-235b-a22b-2507':       { input: 0.07, output: 0.07 },
      'deepseek/deepseek-v3.2':          { input: 0.41, output: 0.41 },
      'google/gemini-2.5-flash':         { input: 0.15, output: 0.60 },
      'anthropic/claude-haiku-4.5':      { input: 0.80, output: 4.00 },
    };
    const p = pricing[model] || { input: 1, output: 3 };
    const cost = (usage.promptTokens * p.input + usage.completionTokens * p.output) / 1_000_000;
    const total = getSetting('pipelineCostTotal') + cost;
    setSetting('pipelineCostTotal', total);
    return cost;
  }

  /**
   * Full dual pipeline: Creator → Filter → Auditor → (retry if rejected) → final result.
   */
  async function callDualPipeline(questionData, onStatus = () => {}) {
    const apiKey = getSetting('openrouterApiKey');
    if (!apiKey) throw new Error('API key do OpenRouter não configurada para o pipeline dual.');

    let totalCost = 0;

    // ── Step 1: Creator ──
    onStatus('🧠 Creator gerando flashcards...');
    let creatorResult;
    try {
      creatorResult = await callCreator(questionData);
    } catch (err) {
      // Fallback: use auditor model as creator
      console.warn('⚠️ Creator falhou, usando modelo auditor como fallback:', err.message);
      onStatus('⚠️ Creator falhou — usando fallback...');
      const fallbackModel = getSetting('auditorModel');
      const origCreator = getSetting('creatorModel');
      setSetting('creatorModel', fallbackModel);
      try {
        creatorResult = await callCreator(questionData);
      } finally {
        setSetting('creatorModel', origCreator);
      }
      showToast('⚠️ Creator indisponível — cards gerados pelo modelo auditor (fallback).', 'warning', 5000);
    }
    if (creatorResult._usage) totalCost += trackPipelineCost(creatorResult._usage, getSetting('creatorModel'));

    console.log('📝 Creator result:', creatorResult.cards.length, 'cards');

    // ── Step 2: Filter ──
    onStatus('🔍 Filtrando para auditoria...');
    const filteredPayload = filterForAuditor(creatorResult, questionData);

    // ── Step 3: Auditor ──
    onStatus('⚖️ Auditor validando cards...');
    let auditorResult;
    try {
      auditorResult = await callAuditor(filteredPayload);
    } catch (err) {
      console.warn('⚠️ Auditor falhou, aceitando todos os cards:', err.message);
      showToast('⚠️ Auditor indisponível — cards aceitos sem validação.', 'warning', 5000);
      return creatorResult;
    }
    if (auditorResult._usage) totalCost += trackPipelineCost(auditorResult._usage, getSetting('auditorModel'));

    console.log('⚖️ Auditor result:', auditorResult.cards.map(c => `${c.index}:${c.status}`).join(', '));

    // ── Process auditor verdicts ──
    const approved = [];
    const rejected = [];
    for (const verdict of auditorResult.cards) {
      if (verdict.status === 'APROVADO') {
        approved.push(creatorResult.cards[verdict.index]);
      } else {
        rejected.push({ card: creatorResult.cards[verdict.index], justificativa: verdict.justificativa || 'Sem justificativa' });
      }
    }

    // ── Retry rejected cards once ──
    if (rejected.length > 0) {
      onStatus(`🔄 Regenerando ${rejected.length} card(s) rejeitado(s)...`);
      const feedback = rejected.map((r, i) => `Card ${i + 1}: ${r.justificativa}`).join('\n');

      try {
        const retryResult = await callCreator(questionData, feedback);
        if (retryResult._usage) totalCost += trackPipelineCost(retryResult._usage, getSetting('creatorModel'));

        // Re-audit the retried cards
        onStatus('⚖️ Re-auditando cards regenerados...');
        const retryFiltered = filterForAuditor(retryResult, questionData);
        let retryAudit;
        try {
          retryAudit = await callAuditor(retryFiltered);
          if (retryAudit._usage) totalCost += trackPipelineCost(retryAudit._usage, getSetting('auditorModel'));
        } catch {
          // If re-audit fails, accept retried cards
          approved.push(...retryResult.cards);
          retryAudit = null;
        }

        if (retryAudit) {
          for (const verdict of retryAudit.cards) {
            if (verdict.status === 'APROVADO') {
              approved.push(retryResult.cards[verdict.index]);
            } else {
              // Still rejected after retry — add with 'revisar' tag
              const card = retryResult.cards[verdict.index];
              card._needsReview = true;
              card._rejectReason = verdict.justificativa;
              approved.push(card);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Retry falhou, adicionando cards originais com tag revisar:', err.message);
        for (const r of rejected) {
          r.card._needsReview = true;
          r.card._rejectReason = r.justificativa;
          approved.push(r.card);
        }
      }
    }

    // Build final result
    const finalResult = {
      materia: creatorResult.materia,
      subtopico: creatorResult.subtopico,
      erro_identificado: creatorResult.erro_identificado,
      cards: approved,
      _pipelineCost: totalCost,
    };

    const reviewCount = approved.filter(c => c._needsReview).length;
    const costCents = (totalCost * 100).toFixed(1);
    let summaryMsg = `✅ Pipeline: ${approved.length} cards (custo: $${totalCost.toFixed(4)} / ${costCents}¢)`;
    if (reviewCount > 0) summaryMsg += ` | ⚠️ ${reviewCount} para revisão manual`;
    console.log(summaryMsg);

    return finalResult;
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  7. ANKI CONNECT                             \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  async function ankiInvoke(action, params = {}) {
    const res = await gmFetch('http://127.0.0.1:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: 6, params }),
      timeout: 10000,
    });
    const json = await res.json();
    if (json.error) throw new Error(`AnkiConnect: ${json.error}`);
    return json.result;
  }

  async function ankiIsConnected() {
    try {
      await ankiInvoke('version');
      return true;
    } catch { return false; }
  }

  async function ensureAnkiModel() {
    const modelName = getSetting('ankiModelName');
    const models = await ankiInvoke('modelNames');
    if (models.includes(modelName)) {
      // Migrate: add PalavrasChave field if missing
      try {
        const fields = await ankiInvoke('modelFieldNames', { modelName });
        if (!fields.includes('PalavrasChave')) {
          await ankiInvoke('modelFieldAdd', { modelName, fieldName: 'PalavrasChave', index: 2 });
          console.log('[TEC\u2192Anki] Campo PalavrasChave adicionado ao modelo existente');
        }
      } catch (e) { console.warn('[TEC\u2192Anki] N\u00E3o foi poss\u00EDvel migrar campo PalavrasChave:', e); }
      return;
    }

    await ankiInvoke('createModel', {
      modelName,
      inOrderFields: ['Frente', 'Verso', 'PalavrasChave', 'Contexto', 'Fonte', 'ErroIdentificado'],
      css: `.card {
  font-family: 'Segoe UI', system-ui, sans-serif;
  max-width: 620px; margin: 0 auto; padding: 28px;
  line-height: 1.7; color: #e8e8e8; background: #1e1e2e;
}
.frente { font-size: 1.2em; color: #60cdff; font-weight: 500; }
.verso { font-size: 1.05em; color: #d4d4d4; margin-top: 4px; line-height: 1.8; }
.verso b { color: #7ee8a2; font-weight: 600; }
.verso .neg { color: #ff6b6b; font-weight: 700; }
.verso mark { background: rgba(255, 230, 0, 0.25); color: #ffe066; padding: 1px 4px; border-radius: 3px; }
.verso .ref { color: #a0a0b8; font-style: italic; font-size: 0.9em; }
.verso ul { margin: 6px 0 6px 18px; padding: 0; }
.verso li { margin-bottom: 2px; }
.frente b { color: #60cdff; }
.frente mark { background: rgba(255, 230, 0, 0.2); color: #ffe066; padding: 1px 4px; border-radius: 3px; }
.palavras-chave { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.palavras-chave .kw { background: #2a2a4a; color: #c4b5fd; padding: 2px 10px;
  border-radius: 12px; font-size: 0.78em; border: 1px solid #4a4a6a; letter-spacing: 0.3px; }
.contexto { color: #a0a0b8; font-size: 0.82em; margin-bottom: 14px;
  padding-bottom: 10px; border-bottom: 1px solid #3a3a4e; letter-spacing: 0.3px; }
.fonte { color: #787890; font-size: 0.72em; margin-top: 20px; text-align: right; }
.erro { background: #3a3520; color: #ffd866; padding: 10px 14px; border-radius: 8px;
  font-size: 0.85em; margin-top: 14px; border-left: 3px solid #ffd866; }
hr { border: none; border-top: 1px solid #3a3a4e; margin: 18px 0; }
/* Modo claro */
.card.night_mode_off, :root[class*="light"] .card {
  color: #1a1a2e; background: #ffffff;
}
:root[class*="light"] .frente { color: #1a56db; }
:root[class*="light"] .verso { color: #2d2d2d; }
:root[class*="light"] .verso b { color: #2d6a4f; }
:root[class*="light"] .verso .neg { color: #d32f2f; }
:root[class*="light"] .verso mark { background: #fff59d; color: #1a1a2e; }
:root[class*="light"] .verso .ref { color: #6c757d; }
:root[class*="light"] .frente mark { background: #fff59d; color: #1a1a2e; }
:root[class*="light"] .palavras-chave .kw { background: #f3f0ff; color: #6d28d9; border-color: #ddd6fe; }
:root[class*="light"] .contexto { color: #6c757d; border-bottom-color: #eee; }
:root[class*="light"] .fonte { color: #adb5bd; }
:root[class*="light"] .erro { background: #fff3cd; color: #856404; border-left-color: #856404; }
:root[class*="light"] hr { border-top-color: #dee2e6; }`,
      cardTemplates: [{
        Name: 'Card',
        Front: '<div class="card"><div class="contexto">{{Contexto}}</div><div class="frente">{{Frente}}</div></div>',
        Back: `<div class="card">
<div class="contexto">{{Contexto}}</div>
<div class="frente">{{Frente}}</div>
<hr>
<div class="verso">{{Verso}}</div>
{{#PalavrasChave}}<div class="palavras-chave">\uD83D\uDD11 {{#PalavrasChave}}{{PalavrasChave}}{{/PalavrasChave}}</div>{{/PalavrasChave}}
{{#ErroIdentificado}}<div class="erro">\uD83D\uDCA1 {{ErroIdentificado}}</div>{{/ErroIdentificado}}
<div class="fonte">{{Fonte}}</div>
</div>`,
      }],
    });
  }

  async function ensureAnkiDeck(deckName) {
    await ankiInvoke('createDeck', { deck: deckName });
  }

  async function addCardsToAnki(aiResult, questionData) {
    const prefix = getSetting('ankiDeckPrefix');
    const modelName = getSetting('ankiModelName');
    const materia = questionData.materia || aiResult.materia || 'Geral';
    const subtopico = questionData.assunto || aiResult.subtopico || '';
    const deckName = subtopico
      ? `${prefix}::${sanitizePath(materia)}::${sanitizePath(subtopico)}`
      : `${prefix}::${sanitizePath(materia)}`;

    await ensureAnkiModel();
    await ensureAnkiDeck(deckName);

    const tags = [
      'tec',
      slugify(questionData.banca || 'sem-banca'),
      questionData.ano || '',
      slugify(materia),
      questionData.errou ? 'erro' : 'acerto',
    ].filter(Boolean);

    const fonte = questionData.id
      ? `Q#${questionData.id} | ${questionData.banca} ${questionData.ano} | ${questionData.cargo}`
      : questionData.url;
    const contexto = `${materia}${subtopico ? ' \u203A ' + subtopico : ''}`;

    const notes = aiResult.cards.map(card => {
      const cardTags = [...tags];
      if (card._needsReview) cardTags.push('revisar');
      if (getSetting('pipelineMode') === 'dual') cardTags.push('dual-pipeline');
      return {
        deckName,
        modelName,
        fields: {
          Frente: card.frente_html || card.frente,
          Verso: card.verso_html || card.verso,
          PalavrasChave: (card.palavras_chave || '').split(/\s*\|\s*/).filter(Boolean).map(kw => `<span class="kw">${kw.trim()}</span>`).join(' '),
          Contexto: contexto,
          Fonte: fonte,
          ErroIdentificado: aiResult.erro_identificado || '',
        },
        tags: cardTags,
        options: { allowDuplicate: false, duplicateScope: 'deck' },
      };
    });

    const results = await ankiInvoke('addNotes', { notes });
    const added = results.filter(r => r !== null).length;
    return { added, total: notes.length, deckName };
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                    8. OBSIDIAN                               \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  async function obsidianIsConnected() {
    try {
      const port = getSetting('obsidianPort');
      const token = getSetting('obsidianToken');
      if (!token) return false;
      const res = await gmFetch(`http://127.0.0.1:${port}/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000,
      });
      return res.ok || res.status === 200;
    } catch { return false; }
  }

  /** Remove excessive blank lines and whitespace from text (e.g. professor comments) */
  function cleanText(text) {
    if (!text) return '';
    return text
      .replace(/[ \t]+$/gm, '')       // trailing spaces per line
      .replace(/(\n\s*){3,}/g, '\n\n') // 3+ blank lines \u2192 1 blank line
      .replace(/^\s+/, '')              // leading whitespace
      .replace(/\s+$/, '');             // trailing whitespace
  }

  function buildObsidianNote(questionData, aiResult) {
    const materia = questionData.materia || aiResult?.materia || 'Geral';
    const subtopico = questionData.assunto || aiResult?.subtopico || '';
    const banca = questionData.banca || '';
    const ano = questionData.ano || '';
    const cargo = questionData.cargo || '';
    const id = questionData.id || 'sem-id';

    const altsMarkdown = questionData.alternativas.map(a => {
      let line = `- **${a.letra})** ${a.texto}`;
      if (a.selecionada && !a.correta) line += ' \u274C _(sua resposta)_';
      if (a.correta) line += ' \u2705 _(gabarito)_';
      return line;
    }).join('\n');

    const cardsTable = (aiResult?.cards || []).map((c, i) =>
      `| ${i + 1} | ${c.frente} | ${c.verso} | ${c.palavras_chave || ''} |`
    ).join('\n');

    const comentario = cleanText(questionData.comentario) || '_N\u00E3o dispon\u00EDvel_';
    const erroId = cleanText(aiResult?.erro_identificado) || '_N\u00E3o gerado_';

    return `---
id: "${id}"
materia: "${materia}"
subtopico: "${subtopico}"
banca: "${banca}"
ano: ${ano || '""'}
cargo: "${cargo}"
tags: [tec, ${slugify(materia)}, ${slugify(banca)}, ${questionData.errou ? 'erro' : 'acerto'}]
resultado: "${questionData.errou ? 'erro' : 'acerto'}"
data: ${todayISO()}
link: "${questionData.url}"
---
# Q${id} \u2014 ${subtopico || materia}
> **Banca:** ${banca} | **Ano:** ${ano} | **Cargo:** ${cargo}
> **Mat\u00E9ria:** [[${materia}]] | **Assunto:** ${subtopico}
> [\uD83D\uDD17 Ver no TEC](${questionData.url})

## Enunciado
${questionData.enunciado || '_N\u00E3o extra\u00EDdo_'}

## Alternativas
${altsMarkdown || '_N\u00E3o extra\u00EDdas_'}

## Resultado
- **Sua resposta:** ${questionData.respostaAluno || 'N/A'} ${questionData.errou ? '\u274C' : '\u2705'}
- **Gabarito:** ${questionData.gabarito || 'N/A'} \u2705

## Coment\u00E1rio do Professor
${comentario}

## ${questionData.errou ? '\uD83C\uDFAF Erro Identificado (IA)' : '\uD83D\uDD0D Pegadinha/Nuance Identificada (IA)'}
${erroId}

## \uD83D\uDCDD Flashcards Gerados
| # | Frente | Verso | Palavras-chave |
|---|--------|-------|----------------|
${cardsTable || '| - | _Nenhum_ | - | - |'}

---
_Gerado em ${todayISO()} via TEC\u2192Anki+Obsidian_
`;
  }

  async function saveToObsidian(questionData, aiResult) {
    const method = getSetting('obsidianMethod');
    const vault = getSetting('obsidianVault');
    const basePath = getSetting('obsidianBasePath');
    const materia = sanitizePath(questionData.materia || aiResult?.materia || 'Geral');
    const subtopico = sanitizePath(questionData.assunto || aiResult?.subtopico || 'Geral');
    const id = questionData.id || Date.now();
    const filePath = `${basePath}/${materia}/${subtopico}/Q${id}`;
    const content = buildObsidianNote(questionData, aiResult);

    if (method === 'rest') {
      const port = getSetting('obsidianPort');
      const token = getSetting('obsidianToken');
      if (!token) throw new Error('Token do Obsidian REST API n\u00E3o configurado.');

      const res = await gmFetch(`http://127.0.0.1:${port}/vault/${encodeURIComponent(filePath)}.md`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/markdown',
        },
        body: content,
        timeout: 10000,
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(`Obsidian REST API error: ${res.status}`);
      }
      return { path: `${filePath}.md`, method: 'rest' };
    }

    if (method === 'uri') {
      if (!vault) throw new Error('Nome do vault do Obsidian n\u00E3o configurado.');
      const encoded = encodeURIComponent(content.substring(0, 6000));
      const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encoded}&silent=true`;
      window.open(uri, '_blank');
      return { path: `${filePath}.md`, method: 'uri' };
    }

    // Fallback: clipboard
    await navigator.clipboard.writeText(content);
    return { path: null, method: 'clipboard' };
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  9. PREVIEW MODAL                            \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  function showPreviewModal(questionData, aiResult) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';

      const materia = questionData.materia || aiResult?.materia || '';
      const subtopico = questionData.assunto || aiResult?.subtopico || '';

      const cardsHTML = (aiResult?.cards || []).map((c, i) => `
        <div class="tec-card-preview">
          <div class="card-num">Card ${i + 1}</div>
          <div class="card-front">\uD83D\uDD39 ${c.frente}</div>
          <div class="card-back">\uD83D\uDCA1 ${c.verso}</div>
          ${c.palavras_chave ? `<div class="card-kw" style="font-size:11px;color:#c4b5fd;margin-top:4px">\uD83D\uDD11 ${c.palavras_chave}</div>` : ''}
        </div>
      `).join('');

      overlay.innerHTML = `
        <div class="tec-modal">
          <div class="tec-modal-header">
            <h2>\uD83D\uDCCB Quest\u00E3o #${questionData.id || '?'}</h2>
            <button class="tec-modal-close" data-action="close">\u00D7</button>
          </div>
          <div class="tec-modal-body">
            ${questionData.errou
              ? '<div class="tec-error-badge">\u274C Voc\u00EA errou esta quest\u00E3o</div>'
              : '<div class="tec-error-badge" style="background:#d4edda;color:#155724">\u2705 Acertou</div>'}

            <div class="tec-meta-grid">
              <span class="label">Banca</span><span class="value">${questionData.banca || '-'}</span>
              <span class="label">Ano</span><span class="value">${questionData.ano || '-'}</span>
              <span class="label">Cargo</span><span class="value">${questionData.cargo || '-'}</span>
              <span class="label">Mat\u00E9ria</span><span class="value">${materia || '-'}</span>
              <span class="label">Subt\u00F3pico</span><span class="value">${subtopico || '-'}</span>
              <span class="label">Tipo</span><span class="value">${questionData.tipo === 'certo_errado' ? 'Certo/Errado' : 'M\u00FAltipla Escolha'}</span>
              <span class="label">Resposta</span><span class="value">${questionData.respostaAluno || '-'} \u2192 Gabarito: ${questionData.gabarito || '-'}</span>
            </div>

            <div class="tec-section">
              <h3>${questionData.errou ? '\uD83C\uDFAF Erro Identificado pela IA' : '\uD83D\uDD0D Pegadinha/Nuance Identificada pela IA'}</h3>
              <div class="content">${aiResult?.erro_identificado || '<em>N\u00E3o gerado</em>'}</div>
            </div>

            <div class="tec-section">
              <h3>\uD83D\uDCDD Flashcards Gerados (${aiResult?.cards?.length || 0})</h3>
              ${cardsHTML || '<div class="content"><em>Nenhum card gerado</em></div>'}
            </div>

            <div class="tec-section" style="margin-bottom:0">
              <h3>\uD83D\uDCC4 Enunciado</h3>
              <div class="content">${questionData.enunciado?.substring(0, 500) || '<em>N\u00E3o extra\u00EDdo</em>'}${(questionData.enunciado?.length || 0) > 500 ? '...' : ''}</div>
            </div>
          </div>
          <div class="tec-modal-footer">
            <button class="tec-btn tec-btn-cancel" data-action="cancel">Cancelar</button>
            <button class="tec-btn tec-btn-save" data-action="save">\uD83D\uDCBE Salvar no Anki + Obsidian</button>
          </div>
        </div>
      `;

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action === 'close' || action === 'cancel') { overlay.remove(); resolve(false); }
        if (action === 'save') { overlay.remove(); resolve(true); }
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });

      document.body.appendChild(overlay);
    });
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                 10. SETTINGS PANEL                           \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  function showSettingsPanel() {
    const existing = document.querySelector('.tec-modal-overlay.tec-settings-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'tec-modal-overlay tec-settings-overlay';
    overlay.innerHTML = `
      <div class="tec-modal tec-settings" style="width:520px">
        <div class="tec-modal-header">
          <h2>\u2699\uFE0F Configura\u00E7\u00F5es \u2014 TEC\u2192Anki+Obsidian</h2>
          <button class="tec-modal-close" data-action="close">\u00D7</button>
        </div>
        <div class="tec-modal-body">

          <h3>\uD83E\uDD16 Provedor de IA</h3>
          <div class="tec-field">
            <label>Provedor</label>
            <select id="tec-cfg-ai-provider">
              <option value="gemini" ${getSetting('aiProvider') === 'gemini' ? 'selected' : ''}>Google Gemini (gratuito)</option>
              <option value="openrouter" ${getSetting('aiProvider') === 'openrouter' ? 'selected' : ''}>OpenRouter (multi-modelo)</option>
            </select>
          </div>

          <div id="tec-cfg-gemini-section">
            <div class="tec-field">
              <label>Gemini API Key</label>
              <input type="password" id="tec-cfg-gemini-key" value="${getSetting('geminiApiKey')}" placeholder="AIzaSy...">
            </div>
            <div class="tec-field">
              <label>Modelo Gemini</label>
              <select id="tec-cfg-gemini-model">
                <option value="gemini-2.5-flash" ${getSetting('geminiModel') === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash (recomendado)</option>
                <option value="gemini-2.5-pro" ${getSetting('geminiModel') === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro (mais preciso)</option>
                <option value="gemini-2.5-flash-lite" ${getSetting('geminiModel') === 'gemini-2.5-flash-lite' ? 'selected' : ''}>gemini-2.5-flash-lite (mais r\u00E1pido)</option>
              </select>
            </div>
          </div>

          <div id="tec-cfg-openrouter-section" style="display:none">
            <div class="tec-field">
              <label>OpenRouter API Key</label>
              <input type="password" id="tec-cfg-openrouter-key" value="${getSetting('openrouterApiKey')}" placeholder="sk-or-v1-...">
              <small style="color:#888;font-size:11px">Obtenha em <a href="https://openrouter.ai/keys" target="_blank" style="color:#60cdff">openrouter.ai/keys</a></small>
            </div>
            <div class="tec-field">
              <label>Modelo OpenRouter</label>
              <select id="tec-cfg-openrouter-model">
                ${OPENROUTER_MODELS.map(m => '<option value="' + m.id + '"' + (getSetting('openrouterModel') === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('')}
              </select>
            </div>
          </div>

          <hr class="tec-divider">
          <h3>\uD83D\uDD00 Pipeline Dual (Creator + Auditor)</h3>
          <div class="tec-field">
            <label>Modo</label>
            <select id="tec-cfg-pipeline-mode">
              <option value="single" ${getSetting('pipelineMode') === 'single' ? 'selected' : ''}>Single (1 modelo, sem auditoria)</option>
              <option value="dual" ${getSetting('pipelineMode') === 'dual' ? 'selected' : ''}>Dual (Creator \u2192 Auditor, mais preciso)</option>
            </select>
            <small style="color:#888;font-size:11px">Dual requer OpenRouter API key. Custo ~1.2\u00A2/quest\u00E3o.</small>
          </div>
          <div id="tec-cfg-pipeline-section" style="display:none">
            <div class="tec-field">
              <label>Modelo Creator</label>
              <select id="tec-cfg-creator-model">
                ${PIPELINE_CREATOR_MODELS.map(m => '<option value="' + m.id + '"' + (getSetting('creatorModel') === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('')}
              </select>
            </div>
            <div class="tec-field">
              <label>Modelo Auditor</label>
              <select id="tec-cfg-auditor-model">
                ${PIPELINE_AUDITOR_MODELS.map(m => '<option value="' + m.id + '"' + (getSetting('auditorModel') === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('')}
              </select>
            </div>
            <div class="tec-field" style="padding:8px;background:#1a2332;border-radius:6px;font-size:12px;color:#8899aa;">
              \uD83D\uDCB0 Custo acumulado: <strong style="color:#06d6a0">$${getSetting('pipelineCostTotal').toFixed(4)}</strong>
              <button id="tec-cfg-reset-cost" style="margin-left:8px;font-size:11px;padding:2px 8px;cursor:pointer;background:#2a3a4a;color:#60cdff;border:1px solid #3a4a5a;border-radius:4px;">Zerar</button>
            </div>
          </div>

          <hr class="tec-divider">
          <h3>\uD83D\uDCD3 Obsidian</h3>
          <div class="tec-field">
            <label>M\u00E9todo de salvamento</label>
            <select id="tec-cfg-obs-method">
              <option value="rest" ${getSetting('obsidianMethod') === 'rest' ? 'selected' : ''}>REST API (recomendado)</option>
              <option value="uri" ${getSetting('obsidianMethod') === 'uri' ? 'selected' : ''}>URI Scheme (sem plugin)</option>
              <option value="clipboard" ${getSetting('obsidianMethod') === 'clipboard' ? 'selected' : ''}>Copiar para clipboard</option>
            </select>
          </div>
          <div class="tec-field">
            <label>Nome do Vault</label>
            <input type="text" id="tec-cfg-obs-vault" value="${getSetting('obsidianVault')}" placeholder="MeuVault">
          </div>
          <div class="tec-field">
            <label>REST API Token (do plugin Local REST API)</label>
            <input type="password" id="tec-cfg-obs-token" value="${getSetting('obsidianToken')}" placeholder="Token do plugin">
          </div>
          <div class="tec-field">
            <label>Porta REST API</label>
            <input type="number" id="tec-cfg-obs-port" value="${getSetting('obsidianPort')}" placeholder="27123">
          </div>
          <div class="tec-field">
            <label>Pasta base dentro do vault</label>
            <input type="text" id="tec-cfg-obs-base" value="${getSetting('obsidianBasePath')}" placeholder="TEC">
          </div>

          <hr class="tec-divider">
          <h3>\uD83D\uDDC2\uFE0F Anki</h3>
          <div class="tec-field">
            <label>Prefixo do Deck</label>
            <input type="text" id="tec-cfg-anki-prefix" value="${getSetting('ankiDeckPrefix')}" placeholder="TEC">
          </div>
          <div class="tec-field">
            <label>Nome do Modelo (Note Type)</label>
            <input type="text" id="tec-cfg-anki-model" value="${getSetting('ankiModelName')}" placeholder="TEC Concursos">
          </div>

          <hr class="tec-divider">
          <h3>\u26A1 Comportamento</h3>
          <div class="tec-field">
            <label class="tec-toggle"><input type="checkbox" id="tec-cfg-preview" ${getSetting('showPreview') ? 'checked' : ''}> Mostrar preview antes de salvar</label>
          </div>
          <div class="tec-field">
            <label class="tec-toggle"><input type="checkbox" id="tec-cfg-enable-anki" ${getSetting('enableAnki') ? 'checked' : ''}> Salvar no Anki</label>
          </div>
          <div class="tec-field">
            <label class="tec-toggle"><input type="checkbox" id="tec-cfg-enable-obs" ${getSetting('enableObsidian') ? 'checked' : ''}> Salvar no Obsidian</label>
          </div>

          <div id="tec-cfg-status" style="margin-top:16px; padding:12px; background:#f8f9fa; border-radius:8px; font-size:12px; color:#555;">
            Clique em "Testar Conex\u00F5es" para verificar o status.
          </div>

        </div>
        <div class="tec-modal-footer">
          <button class="tec-btn tec-btn-cancel" data-action="test" style="background:#e8f4f8;color:#2196f3">\uD83D\uDD0C Testar Conex\u00F5es</button>
          <button class="tec-btn tec-btn-cancel" data-action="close">Cancelar</button>
          <button class="tec-btn tec-btn-save" data-action="save">\uD83D\uDCBE Salvar</button>
        </div>
      </div>
    `;

    // Show/hide provider sections based on selection
    const providerSelect = overlay.querySelector('#tec-cfg-ai-provider');
    const geminiSection = overlay.querySelector('#tec-cfg-gemini-section');
    const openrouterSection = overlay.querySelector('#tec-cfg-openrouter-section');
    function toggleProviderSections() {
      const isGemini = providerSelect.value === 'gemini';
      geminiSection.style.display = isGemini ? '' : 'none';
      openrouterSection.style.display = isGemini ? 'none' : '';
    }
    providerSelect.addEventListener('change', toggleProviderSections);
    toggleProviderSections(); // set initial state

    // Show/hide pipeline section based on mode
    const pipelineModeSelect = overlay.querySelector('#tec-cfg-pipeline-mode');
    const pipelineSection = overlay.querySelector('#tec-cfg-pipeline-section');
    function togglePipelineSection() {
      pipelineSection.style.display = pipelineModeSelect.value === 'dual' ? '' : 'none';
    }
    pipelineModeSelect.addEventListener('change', togglePipelineSection);
    togglePipelineSection();

    // Reset cost button
    const resetCostBtn = overlay.querySelector('#tec-cfg-reset-cost');
    if (resetCostBtn) {
      resetCostBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setSetting('pipelineCostTotal', 0);
        resetCostBtn.previousElementSibling?.remove();
        resetCostBtn.insertAdjacentHTML('beforebegin', '<strong style="color:#06d6a0">$0.0000</strong>');
        showToast('Contador de custo zerado.', 'info');
      });
    }

    overlay.addEventListener('click', async (e) => {
      const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close' || e.target === overlay) { overlay.remove(); }
      if (action === 'save') {
        setSetting('aiProvider', overlay.querySelector('#tec-cfg-ai-provider').value);
        setSetting('geminiApiKey', overlay.querySelector('#tec-cfg-gemini-key').value);
        setSetting('geminiModel', overlay.querySelector('#tec-cfg-gemini-model').value);
        setSetting('openrouterApiKey', overlay.querySelector('#tec-cfg-openrouter-key').value);
        setSetting('openrouterModel', overlay.querySelector('#tec-cfg-openrouter-model').value);
        setSetting('pipelineMode', overlay.querySelector('#tec-cfg-pipeline-mode').value);
        setSetting('creatorModel', overlay.querySelector('#tec-cfg-creator-model').value);
        setSetting('auditorModel', overlay.querySelector('#tec-cfg-auditor-model').value);
        setSetting('obsidianMethod', overlay.querySelector('#tec-cfg-obs-method').value);
        setSetting('obsidianVault', overlay.querySelector('#tec-cfg-obs-vault').value);
        setSetting('obsidianToken', overlay.querySelector('#tec-cfg-obs-token').value);
        setSetting('obsidianPort', parseInt(overlay.querySelector('#tec-cfg-obs-port').value) || 27124);
        setSetting('obsidianBasePath', overlay.querySelector('#tec-cfg-obs-base').value || 'TEC');
        setSetting('ankiDeckPrefix', overlay.querySelector('#tec-cfg-anki-prefix').value || 'TEC');
        setSetting('ankiModelName', overlay.querySelector('#tec-cfg-anki-model').value || 'TEC Concursos');
        setSetting('showPreview', overlay.querySelector('#tec-cfg-preview').checked);
        setSetting('enableAnki', overlay.querySelector('#tec-cfg-enable-anki').checked);
        setSetting('enableObsidian', overlay.querySelector('#tec-cfg-enable-obs').checked);
        showToast('Configura\u00E7\u00F5es salvas!', 'success');
        overlay.remove();
        updateStatusDot();
      }
      if (action === 'test') {
        const statusDiv = overlay.querySelector('#tec-cfg-status');
        statusDiv.innerHTML = '<span class="tec-spinner" style="border-color:rgba(0,0,0,.1);border-top-color:#4361ee"></span> Testando...';
        const [anki, obs] = await Promise.all([
          ankiIsConnected().catch(() => false),
          obsidianIsConnected().catch(() => false),
        ]);
        statusDiv.innerHTML = `
          <div>\uD83D\uDDC2\uFE0F AnkiConnect: ${anki ? '<span style="color:#06d6a0">\u2705 Conectado</span>' : '<span style="color:#ef476f">\u274C N\u00E3o conectado</span> \u2014 Verifique se o Anki est\u00E1 aberto com o add-on AnkiConnect (2055492159)'}</div>
          <div style="margin-top:4px">\uD83D\uDCD3 Obsidian REST API: ${obs ? '<span style="color:#06d6a0">\u2705 Conectado</span>' : '<span style="color:#ef476f">\u274C N\u00E3o conectado</span> \u2014 Verifique se o Obsidian est\u00E1 aberto com o plugin Local REST API'}</div>
        `;
      }
    });

    document.body.appendChild(overlay);
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  11. FLOATING TOOLBAR                        \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  let statusDot = null;

  function injectToolbar() {
    if (document.getElementById('tec-anki-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'tec-anki-toolbar';
    toolbar.innerHTML = `
      <button class="tec-btn-primary" id="tec-btn-save" title="Salvar quest\u00E3o atual (Shift+Enter)">
        \uD83D\uDCCB Salvar
      </button>
      <button class="tec-btn-batch" id="tec-btn-batch" title="Processar todos os erros do caderno">
        \uD83D\uDCCB Erros
      </button>
      <button class="tec-btn-icon" id="tec-btn-settings" title="Configura\u00E7\u00F5es">\u2699\uFE0F</button>
      <div class="tec-status-dot" id="tec-status-dot" title="Status das conex\u00F5es"></div>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('tec-btn-save').addEventListener('click', () => processCurrentQuestion());
    document.getElementById('tec-btn-batch').addEventListener('click', () => processBatchQuestions());
    document.getElementById('tec-btn-settings').addEventListener('click', () => showSettingsPanel());

    statusDot = document.getElementById('tec-status-dot');
    updateStatusDot();

    // Make toolbar draggable
    let startX, startY, origX, origY;
    function onDragMove(e) {
      toolbar.style.right = 'auto'; toolbar.style.bottom = 'auto';
      toolbar.style.left = (origX + e.clientX - startX) + 'px';
      toolbar.style.top = (origY + e.clientY - startY) + 'px';
    }
    function onDragEnd() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    }
    toolbar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      startX = e.clientX; startY = e.clientY;
      const rect = toolbar.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
      e.preventDefault();
    });
  }

  async function updateStatusDot() {
    if (!statusDot) return;
    try {
      const [anki, obs] = await Promise.all([
        ankiIsConnected().catch(() => false),
        obsidianIsConnected().catch(() => false),
      ]);
      statusDot.className = 'tec-status-dot';
      if (anki && obs) { statusDot.classList.add('green'); statusDot.title = 'Anki \u2705 | Obsidian \u2705'; }
      else if (anki || obs) { statusDot.classList.add('yellow'); statusDot.title = `Anki ${anki ? '\u2705' : '\u274C'} | Obsidian ${obs ? '\u2705' : '\u274C'}`; }
      else { statusDot.classList.add('red'); statusDot.title = 'Anki \u274C | Obsidian \u274C'; }
    } catch {
      statusDot.className = 'tec-status-dot red';
    }
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                12. MAIN ORCHESTRATION                        \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  let isProcessing = false;

  async function processCurrentQuestion() {
    if (isProcessing) { showToast('J\u00E1 processando uma quest\u00E3o...', 'warning'); return; }
    isProcessing = true;

    const saveBtn = document.getElementById('tec-btn-save');
    if (saveBtn) saveBtn.innerHTML = '<span class="tec-spinner"></span> Salvando...';

    let loadingToast = null;
    try {
      // Step 0: Expand professor comment if hidden
      loadingToast = showLoadingToast('\uD83D\uDCAC Expandindo coment\u00E1rio do professor...');
      await ensureCommentExpanded();
      loadingToast.remove();

      // Step 1: Extract
      loadingToast = showLoadingToast('\uD83D\uDD0D Extraindo dados da quest\u00E3o...');
      const questionData = extractQuestionData();

      if (!questionData.enunciado && !questionData.id) {
        throw new Error('N\u00E3o foi poss\u00EDvel extrair a quest\u00E3o. Verifique se voc\u00EA est\u00E1 na p\u00E1gina de uma quest\u00E3o respondida.');
      }

      loadingToast.remove();
      loadingToast = showLoadingToast('\uD83E\uDD16 Gerando flashcards com IA...');

      // Step 2: Generate flashcards with AI
      let aiResult = null;
      try {
        if (getSetting('pipelineMode') === 'dual') {
          aiResult = await callDualPipeline(questionData, (statusMsg) => {
            if (loadingToast) loadingToast.remove();
            loadingToast = showLoadingToast(statusMsg);
          });
        } else {
          aiResult = await callAI(questionData);
        }
      } catch (err) {
        console.error('AI error:', err);
        showToast(`Erro na IA: ${err.message}. Salvando sem flashcards.`, 'warning', 6000);
        aiResult = { materia: questionData.materia, subtopico: questionData.assunto, erro_identificado: '', cards: [] };
      }

      loadingToast.remove();
      loadingToast = null;

      // Step 3: Preview (optional)
      if (getSetting('showPreview')) {
        const confirmed = await showPreviewModal(questionData, aiResult);
        if (!confirmed) {
          showToast('Cancelado pelo usu\u00E1rio.', 'info');
          return;
        }
      }

      // Step 4: Save to Anki + Obsidian in parallel
      loadingToast = showLoadingToast('\uD83D\uDCBE Salvando no Anki e Obsidian...');
      const results = await Promise.allSettled([
        getSetting('enableAnki') ? addCardsToAnki(aiResult, questionData) : Promise.resolve(null),
        getSetting('enableObsidian') ? saveToObsidian(questionData, aiResult) : Promise.resolve(null),
      ]);

      loadingToast.remove();
      loadingToast = null;

      // Step 5: Show results
      const [ankiResult, obsResult] = results;
      const msgs = [];

      if (ankiResult.status === 'fulfilled' && ankiResult.value) {
        msgs.push(`\uD83D\uDDC2\uFE0F ${ankiResult.value.added}/${ankiResult.value.total} cards \u2192 ${ankiResult.value.deckName}`);
      } else if (ankiResult.status === 'rejected') {
        showToast(`Erro Anki: ${ankiResult.reason?.message}`, 'error', 6000);
      }

      if (obsResult.status === 'fulfilled' && obsResult.value) {
        const m = obsResult.value.method;
        if (m === 'rest') msgs.push('\uD83D\uDCD3 Nota salva no Obsidian');
        else if (m === 'uri') msgs.push('\uD83D\uDCD3 Nota aberta no Obsidian');
        else msgs.push('\uD83D\uDCCB Nota copiada para clipboard');
      } else if (obsResult.status === 'rejected') {
        showToast(`Erro Obsidian: ${obsResult.reason?.message}`, 'error', 6000);
      }

      if (msgs.length) {
        if (aiResult?._pipelineCost) {
          msgs.push(`\uD83D\uDCB0 Custo: ${(aiResult._pipelineCost * 100).toFixed(1)}\u00A2 (total: $${getSetting('pipelineCostTotal').toFixed(4)})`);
        }
        showToast(msgs.join('<br>'), 'success', 5000);
      }

    } catch (err) {
      console.error('TEC\u2192Anki error:', err);
      showToast(`Erro: ${err.message}`, 'error', 8000);
    } finally {
      if (loadingToast) loadingToast.remove();
      if (saveBtn) saveBtn.innerHTML = '\uD83D\uDCCB Salvar';
      isProcessing = false;
    }
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                13. BATCH PROCESSING                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  let batchRunning = false;

  /**
   * Navigate to the next question using TEC's keyboard shortcut "\u2192" (ArrowRight).
   * This is the most reliable method \u2014 works regardless of DOM structure.
   */
  function navigateToNextQuestion() {
    console.log('\u27A1\uFE0F Navegando: pressionando \u2192');
    simulateKey('ArrowRight', 39);
  }

  /**
   * Navigate to the previous question using TEC's keyboard shortcut "\u2190".
   */
  function navigateToPrevQuestion() {
    simulateKey('ArrowLeft', 37);
  }

  /**
   * Wait for TEC's SPA to finish transitioning to a new question.
   * Uses Angular scope (vm.questao.idQuestao) as primary detection.
   */
  async function waitForQuestionChange(previousId, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await delay(600);

      // Primary: Angular scope
      const { vm } = getAngularVm();
      const angularId = vm?.questao?.idQuestao ? String(vm.questao.idQuestao) : null;
      if (angularId && angularId !== previousId) {
        await delay(1000);
        return angularId;
      }

      // Fallback: DOM text
      const idMatch = document.body.innerText.match(/#(\d{5,})/);
      const domId = idMatch ? idMatch[1] : null;
      if (domId && domId !== previousId) {
        await delay(1000);
        return domId;
      }
    }
    return null; // Timeout \u2014 page didn't change
  }

  /**
   * Detect total errors in the caderno using multiple strategies.
   * Returns { totalErros, totalQuestoes, currentQ, method }
   */
  function detectCadernoErrors() {
    let totalErros = 0, totalQuestoes = 0, currentQ = 0;
    let method = 'none';
    const bodyText = document.body.innerText;

    // \u2500\u2500 1. Angular scope \u2014 caderno/prova/estatistica \u2500\u2500
    const { vm } = getAngularVm();
    if (vm) {
      const candidates = [vm, vm?.caderno, vm?.prova, vm?.resultado,
        vm?.estatistica, vm?.estatisticas, vm?.desempenho];
      for (const obj of candidates) {
        if (!obj || typeof obj !== 'object') continue;
        for (const k of ['totalErros', 'qtdErros', 'erros', 'quantidadeErros',
          'respostasErradas', 'incorretas', 'numErros', 'totalIncorretas']) {
          if (typeof obj[k] === 'number' && obj[k] > 0) {
            totalErros = obj[k]; method = `scope:${k}`; break;
          }
        }
        if (totalErros) break;
        for (const k of ['questoesErradas', 'erradas', 'idsErros']) {
          if (Array.isArray(obj[k]) && obj[k].length > 0) {
            totalErros = obj[k].length; method = `scope:${k}.length`; break;
          }
        }
        if (totalErros) break;
        for (const k of ['totalQuestoes', 'qtdQuestoes', 'total']) {
          if (typeof obj[k] === 'number' && obj[k] > 0) totalQuestoes = obj[k];
        }
      }
    }

    // \u2500\u2500 2. DOM text \u2014 tag visible on page ("4 Erros", "Erros: 4", etc.) \u2500\u2500
    if (!totalErros) {
      const patterns = [
        /(\d+)\s*Erros?\)?/i,
        /Erros?:?\s*(\d+)/i,
        /(\d+)\s*(?:quest[\u00F5o]es?\s+)?erradas?/i,
        /(\d+)\s*incorretas?/i,
      ];
      for (const pat of patterns) {
        const m = bodyText.match(pat);
        if (m && parseInt(m[1]) > 0) {
          totalErros = parseInt(m[1]); method = `dom:text`; break;
        }
      }
    }

    // \u2500\u2500 3. Aba Estat\u00EDsticas \u2014 look for the row "Erros   N" \u2500\u2500
    if (!totalErros) {
      // The Estat\u00EDsticas tab content may already be in DOM (hidden or active)
      const allText = document.body.innerText;
      // Pattern: "\u21AA Erros" followed by a number (from the stats table)
      const statsMatch = allText.match(/(?:\u21AA|\u2192|->)?\s*Erros\s+(\d+)/i) ||
                         allText.match(/Erros\s+(\d+)\s/i);
      if (statsMatch && parseInt(statsMatch[1]) > 0) {
        totalErros = parseInt(statsMatch[1]); method = 'dom:stats-tab';
      }
    }

    // \u2500\u2500 4. Question count \u2500\u2500
    if (!totalQuestoes) {
      const questInfoMatch = bodyText.match(/Quest[\u00E3a]o\s+(\d+)\s+de\s+(\d+)/i);
      if (questInfoMatch) {
        currentQ = parseInt(questInfoMatch[1]);
        totalQuestoes = parseInt(questInfoMatch[2]);
      }
    }

    console.log(`\uD83D\uDCCA detectCadernoErrors: erros=${totalErros}, total=${totalQuestoes}, method=${method}`);
    return { totalErros, totalQuestoes, currentQ, method };
  }

  async function processBatchQuestions() {
    if (batchRunning) { showToast('Batch j\u00E1 em andamento...', 'warning'); return; }

    // \u2500\u2500 Detect error count (multi-strategy) \u2500\u2500
    const cadernoInfo = detectCadernoErrors();
    let totalErros = cadernoInfo.totalErros;
    const totalQuestoes = cadernoInfo.totalQuestoes;
    const currentQNum = cadernoInfo.currentQ;

    // \u2500\u2500 Fallback: ask user to input manually \u2500\u2500
    if (!totalErros) {
      const input = prompt(
        '\u26A0\uFE0F N\u00E3o foi poss\u00EDvel detectar automaticamente o total de erros.\n\n' +
        'Isso pode acontecer quando as tags do caderno n\u00E3o est\u00E3o vis\u00EDveis.\n' +
        '\uD83D\uDCA1 Dica: veja na aba "Estat\u00EDsticas" do caderno.\n\n' +
        `Caderno com ${totalQuestoes || '?'} quest\u00F5es (quest\u00E3o ${currentQNum || '?'} atual).\n\n` +
        'Digite o n\u00FAmero de quest\u00F5es ERRADAS neste caderno:',
        ''
      );
      if (input === null) return; // User cancelled
      const parsed = parseInt(input.trim());
      if (!parsed || parsed <= 0 || isNaN(parsed)) {
        showToast('N\u00FAmero inv\u00E1lido. Batch cancelado.', 'warning', 4000);
        return;
      }
      totalErros = parsed;
      console.log(`\uD83D\uDCCA Total de erros informado manualmente: ${totalErros}`);
    }

    if (!confirm(
      `${cadernoInfo.method !== 'none' ? `Detectados ${totalErros} erros (${cadernoInfo.method})` : `Total informado: ${totalErros} erros`}` +
      ` neste caderno (${totalQuestoes || '?'} quest\u00F5es no total).\n` +
      `Voc\u00EA est\u00E1 na quest\u00E3o ${currentQNum || '?'} de ${totalQuestoes || '?'}.\n\n` +
      `Processar todas as quest\u00F5es erradas a partir da quest\u00E3o ATUAL?\n\n` +
      `\u26A0\uFE0F Isso pode levar alguns minutos. Mantenha o Anki aberto.\n` +
      `\uD83D\uDCA1 O script vai navegar quest\u00E3o por quest\u00E3o (\u2192) e processar s\u00F3 as erradas.`
    )) {
      return;
    }

    batchRunning = true;
    const batchBtn = document.getElementById('tec-btn-batch');
    if (batchBtn) batchBtn.innerHTML = '<span class="tec-spinner"></span> Batch...';
    let processed = 0, skipped = 0, errors = 0;
    const processedIds = new Set(); // Track processed question IDs to avoid duplicates

    // Create progress indicator
    const progressToast = document.createElement('div');
    progressToast.className = 'tec-toast info';
    progressToast.style.pointerEvents = 'auto';
    progressToast.innerHTML = `
      <div style="width:100%">
        <div>\uD83D\uDCCB Batch: <span id="tec-batch-count">0</span>/${totalErros} erros processados</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">Quest\u00E3o <span id="tec-batch-qnum">-</span> | Puladas: <span id="tec-batch-skipped">0</span></div>
        <div class="tec-progress-bar"><div class="tec-progress-fill" id="tec-batch-progress" style="width:0%"></div></div>
        <button id="tec-batch-stop" style="margin-top:8px;padding:4px 12px;border:1px solid #ef476f;background:transparent;color:#ef476f;border-radius:6px;cursor:pointer;font-size:12px;">\u23F9\uFE0F Parar</button>
      </div>
    `;
    ensureToastContainer().appendChild(progressToast);

    document.getElementById('tec-batch-stop').addEventListener('click', () => { batchRunning = false; });

    try {
      // Navigate through ALL questions in the caderno
      const maxIterations = (totalQuestoes || totalErros * 3) + 5;

      for (let i = 0; i < maxIterations && batchRunning; i++) {
        // Get current question ID (Angular scope first, then DOM)
        const { vm: loopVm } = getAngularVm();
        const currentBody = document.body.innerText;
        const currentId = loopVm?.questao?.idQuestao
          ? String(loopVm.questao.idQuestao)
          : (currentBody.match(/#(\d{5,})/)?.[1] || `unknown_${i}`);

        // Update progress display
        const qNumMatch = currentBody.match(/Quest[\u00E3a]o\s+(\d+)\s+de\s+(\d+)/i);
        const qNum = qNumMatch ? qNumMatch[1] : '?';
        const qTotal = qNumMatch ? qNumMatch[2] : '?';
        const qNumEl = document.getElementById('tec-batch-qnum');
        if (qNumEl) qNumEl.textContent = `${qNum}/${qTotal}`;

        // Check if this is a wrong question (Angular scope is more reliable)
        const { vm: batchVm } = getAngularVm();
        const isError = (batchVm?.questao?.correcaoQuestao === false) || /Voc\u00EA errou/i.test(currentBody);

        if (isError && !processedIds.has(currentId)) {
          processedIds.add(currentId);
          console.log(`\uD83D\uDCDD Batch: Processando Q${currentId} (erro ${processed + 1}/${totalErros})`);

          try {
            // Expand comment before extracting
            await ensureCommentExpanded();
            await delay(500);

            const qData = extractQuestionData();
            if (qData.enunciado || qData.id) {
              const aiResult = await callAI(qData);
              await Promise.allSettled([
                getSetting('enableAnki') ? addCardsToAnki(aiResult, qData) : Promise.resolve(null),
                getSetting('enableObsidian') ? saveToObsidian(qData, aiResult) : Promise.resolve(null),
              ]);
              processed++;
              console.log(`\u2705 Batch: Q${currentId} processada (${processed}/${totalErros})`);
            }
          } catch (err) {
            console.error(`\u274C Batch: Erro em Q${currentId}:`, err);
            errors++;
          }

          // Update progress UI
          document.getElementById('tec-batch-count').textContent = processed;
          document.getElementById('tec-batch-progress').style.width = `${(processed / totalErros) * 100}%`;

          // No need to close comment \u2014 navigation handles it
        } else if (!isError) {
          skipped++;
          const skippedEl = document.getElementById('tec-batch-skipped');
          if (skippedEl) skippedEl.textContent = skipped;
        }

        // Check if we've processed all errors
        if (processed >= totalErros) {
          console.log('\uD83C\uDF89 Batch: Todos os erros processados!');
          break;
        }

        // Navigate to next question using keyboard shortcut \u2192
        navigateToNextQuestion();

        // Wait for the page to transition to the next question
        const newId = await waitForQuestionChange(currentId, 10000);
        if (!newId) {
          // Page didn't change \u2014 we're probably at the last question
          console.log('\uD83D\uDCCD Batch: P\u00E1gina n\u00E3o mudou. \u00DAltima quest\u00E3o do caderno.');
          break;
        }
      }
    } finally {
      progressToast.remove();
      batchRunning = false;
      if (batchBtn) batchBtn.innerHTML = '\uD83D\uDCCB Erros';
      // Persistent toast \u2014 stays until user clicks \u2715
      const type = processed > 0 ? 'success' : 'warning';
      const icons = { success: '\u2705', warning: '\u26A0\uFE0F' };
      const finalToast = document.createElement('div');
      finalToast.className = `tec-toast ${type}`;
      finalToast.style.pointerEvents = 'auto';
      finalToast.innerHTML = `
        <span>${icons[type]}</span>
        <span>Batch finalizado!<br>\u2705 ${processed} processadas | \u274C ${errors} erros | \u23ED\uFE0F ${skipped} puladas (acertos)</span>
        <button style="background:none;border:none;color:inherit;font-size:18px;cursor:pointer;margin-left:8px;padding:2px 6px;opacity:.7;line-height:1;" title="Fechar">\u2715</button>
      `;
      finalToast.querySelector('button').addEventListener('click', () => {
        finalToast.style.opacity = '0';
        finalToast.style.transition = 'opacity .3s';
        setTimeout(() => finalToast.remove(), 300);
      });
      ensureToastContainer().appendChild(finalToast);
    }
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551              14. KEYBOARD SHORTCUTS                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  document.addEventListener('keydown', (e) => {
    // Shift+Enter \u2192 process current question
    if (e.shiftKey && e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Don't trigger if user is typing in an input
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();
      e.stopPropagation();
      processCurrentQuestion();
    }
  }, true);

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                 15. DISCOVERY MODE                           \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  function runDiscovery() {
    console.group('\uD83D\uDD0D TEC\u2192Anki Discovery Mode');
    console.log('=== Tentando extrair dados da quest\u00E3o ===');

    const data = extractQuestionData();
    console.log('Dados extra\u00EDdos:', data);

    console.log('\n=== Elementos encontrados ===');
    for (const [name, selectors] of Object.entries(SEL)) {
      const el = trySelect(selectors);
      console.log(`${name}: ${el ? '\u2705 ' + el.tagName + '.' + el.className : '\u274C n\u00E3o encontrado'}`);
      if (el) console.log(`  Seletores: ${selectors.join(', ')}`);
    }

    console.log('\n=== Todos os elementos com classes relevantes ===');
    const relevant = document.querySelectorAll('[class*="quest"], [class*="enunciado"], [class*="alternativa"], [class*="gabarito"], [class*="comentario"], [class*="materia"], [class*="assunto"]');
    relevant.forEach(el => {
      console.log(`<${el.tagName} class="${el.className}"> \u2014 ${el.innerText?.substring(0, 80)}...`);
    });

    console.log('\n=== Navega\u00E7\u00E3o (atalhos TEC) ===');
    console.log('\u2192 (ArrowRight) = Quest\u00E3o seguinte');
    console.log('\u2190 (ArrowLeft) = Quest\u00E3o anterior');
    console.log('o = Abre/Fecha coment\u00E1rio do professor');
    console.log('Coment\u00E1rio capturado?', _capturedComment ? `\u2705 (${_capturedComment.length} chars)` : '\u274C N\u00E3o');

    console.log('\n=== Elementos tec-formatar-html ===');
    document.querySelectorAll('[tec-formatar-html]').forEach(el => {
      const attr = el.getAttribute('tec-formatar-html');
      const text = el.innerText.trim();
      console.log(`  [tec-formatar-html="${attr}"] \u2192 ${text.length} chars | visible=${el.offsetParent !== null} | "${text.substring(0, 80)}..."`);
    });

    console.log('\n=== Bot\u00F5es/links com ng-click ===');
    document.querySelectorAll('[ng-click]').forEach(el => {
      const ngClick = el.getAttribute('ng-click');
      if (/proxim|next|avanc|anterior|prev|voltar|naveg/i.test(ngClick)) {
        console.log(`  <${el.tagName} class="${el.className}"> ng-click="${ngClick}" \u2192 "${el.textContent.trim().substring(0, 40)}"`);
      }
    });

    console.log('\n=== Links/bot\u00F5es "Ver resolu\u00E7\u00E3o" ===');
    const resolLinks = [...document.querySelectorAll('a, button, span')].filter(el =>
      /ver resolu|resolu\u00E7\u00E3o|coment\u00E1rio/i.test(el.textContent)
    );
    resolLinks.forEach(el => {
      console.log(`  <${el.tagName} class="${el.className}" href="${el.getAttribute('href') || ''}"> "${el.textContent.trim().substring(0, 50)}"`);
    });

    console.groupEnd();
    showToast('Discovery mode: veja o console (F12) para detalhes.', 'info', 5000);
    return data;
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  16. INITIALIZATION                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  GM_registerMenuCommand('\u2699\uFE0F Configura\u00E7\u00F5es', showSettingsPanel);
  GM_registerMenuCommand('\uD83D\uDD0D Discovery Mode (debug)', runDiscovery);
  GM_registerMenuCommand('\uD83D\uDCCB Salvar Quest\u00E3o Atual', processCurrentQuestion);

  function init() {
    // Check if we're on a relevant page (quest\u00F5es, estudo, caderno)
    const url = window.location.href;
    const isRelevant = /quest|estudo|caderno|resolver/i.test(url) ||
                       document.querySelector('[class*="questao"], [class*="enunciado"]');

    // Always inject the toolbar (it's small and non-intrusive)
    injectToolbar();

    // Log init
    console.log('\uD83D\uDE80 TEC\u2192Anki+Obsidian v1.0.0 carregado em:', window.location.href);

    // Show confirmation toast on load
    showToast('TEC\u2192Anki+Obsidian carregado! Use <b>Shift+Enter</b> ou o bot\u00E3o \uD83D\uDCCB', 'success', 4000);

    // Check connections periodically (every 2 min)
    updateStatusDot();
    setInterval(updateStatusDot, 120000);

    // Re-inject toolbar on SPA navigation (AngularJS) — debounced
    let _reinjectTimer = null;
    const observer = new MutationObserver(() => {
      if (_reinjectTimer) return;
      _reinjectTimer = setTimeout(() => {
        _reinjectTimer = null;
        if (!document.getElementById('tec-anki-toolbar')) injectToolbar();
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  // Wait for page to be ready, then init \u2014 try multiple strategies
  function tryInit() {
    if (document.body) {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryInit();
  } else {
    window.addEventListener('load', tryInit);
  }

})();

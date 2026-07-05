// ==UserScript==
// @name         TEC → Anki + Obsidian
// @namespace    tec-anki-obsidian
// @version      1.8.0
// @description  Extrai questões do TEC Concursos, gera flashcards com IA (Cloze nativo com travas anti-contaminação, answer-line legível) e salva no Anki + Obsidian
// @author       filipegajo
// @match        https://www.tecconcursos.com.br/*
// @match        https://tecconcursos.com.br/*
// @match        *://www.tecconcursos.com.br/*
// @match        *://tecconcursos.com.br/*
// @icon         https://www.tecconcursos.com.br/favicon.ico
// @updateURL    https://raw.githubusercontent.com/filipegajo89/anki-tec/main/public/tec-to-anki.user.js
// @downloadURL  https://raw.githubusercontent.com/filipegajo89/anki-tec/main/public/tec-to-anki.user.js
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
// @connect      opencode.ai
// @connect      api.opencode.ai
// @connect      www.tecconcursos.com.br
// @connect      tecconcursos.com.br
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                    1. CONFIGURATION                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  const SCRIPT_VERSION = '1.8.0';
  const UPDATE_URL = 'https://raw.githubusercontent.com/filipegajo89/anki-tec/main/public/tec-to-anki.user.js';

  const DEFAULTS = {
    aiProvider: 'gemini', // 'gemini', 'openrouter' or 'opencode'
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',
    geminiModel: 'gemini-2.5-flash',
    openrouterApiKey: 'YOUR_OPENROUTER_API_KEY_HERE',
    openrouterModel: 'qwen/qwen3-235b-a22b-2507',
    opencodeApiKey: 'YOUR_OPENCODE_API_KEY_HERE',
    opencodeModel: 'glm-5.1',
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
    askThoughts: true, // ask "qual foi seu raciocínio?" before generating cards
    maxCardsPerQuestion: 2, // upper bound of cards the AI may generate per question
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

    /* \u2500\u2500 Racioc\u00ednio do aluno \u2500\u2500 */
    .tec-thoughts-textarea {
      width: 100%; box-sizing: border-box; min-height: 90px; resize: vertical;
      padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 13px; font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a2e;
    }
    .tec-thoughts-textarea:focus { outline: none; border-color: #4361ee; }
    .tec-dup-badge {
      display: inline-block; background: #fff3cd; color: #856404;
      padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
    }

    /* \u2500\u2500 Batch selection \u2500\u2500 */
    .tec-batch-select-item {
      border: 1px solid #e9ecef; border-radius: 10px; margin-bottom: 10px;
      background: #fafbfc; overflow: hidden; transition: opacity .15s, border-color .15s;
    }
    .tec-batch-select-item.deselected { opacity: .45; }
    .tec-batch-select-item.selected { border-color: #4361ee; }
    .tec-batch-select-item .item-header {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; cursor: pointer;
    }
    .tec-batch-select-item .item-header input[type="checkbox"] {
      width: 18px; height: 18px; accent-color: #4361ee; margin-top: 1px; flex-shrink: 0; cursor: pointer;
    }
    .tec-batch-select-item .item-title { font-size: 13px; font-weight: 700; color: #1a1a2e; }
    .tec-batch-select-item .item-meta { font-size: 11px; color: #888; margin-top: 2px; }
    .tec-batch-select-item .item-snippet { font-size: 12px; color: #555; margin-top: 4px; line-height: 1.4; }
    .tec-batch-select-item .item-thoughts { padding: 0 12px 10px 40px; }
    .tec-batch-select-item .item-thoughts textarea {
      width: 100%; box-sizing: border-box; min-height: 34px; resize: vertical;
      padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px;
      font-size: 12px; font-family: system-ui, sans-serif; color: #1a1a2e;
    }
    .tec-batch-select-item .item-thoughts textarea:focus { outline: none; border-color: #4361ee; }

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

    /* ── Quick Thought Box (auto on wrong answer) ── */
    #tec-quick-thought {
      position: fixed; bottom: 88px; right: 24px; z-index: 99998;
      width: 320px; background: #1a1a2e; color: #fff; border-radius: 14px;
      box-shadow: 0 6px 24px rgba(0,0,0,.4); font-family: system-ui, sans-serif;
      border-left: 4px solid #ef476f; animation: tec-slide-in .3s ease; overflow: hidden;
    }
    #tec-quick-thought .qt-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px 6px; font-size: 13px; font-weight: 700;
    }
    #tec-quick-thought .qt-header .qt-qid { font-weight: 400; font-size: 11px; color: #aaa; }
    #tec-quick-thought .qt-close {
      background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer;
      padding: 0 4px; line-height: 1; border-radius: 6px;
    }
    #tec-quick-thought .qt-close:hover { color: #fff; }
    #tec-quick-thought textarea {
      width: calc(100% - 24px); margin: 0 12px; box-sizing: border-box;
      min-height: 70px; resize: vertical; padding: 8px 10px; border: none; border-radius: 8px;
      font-size: 13px; font-family: system-ui, sans-serif; line-height: 1.45;
      background: #14141f; color: #fff;
    }
    #tec-quick-thought textarea:focus { outline: 1px solid #4361ee; }
    #tec-quick-thought .qt-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px 12px; gap: 8px;
    }
    #tec-quick-thought .qt-saved { font-size: 11px; color: #06d6a0; opacity: 0; transition: opacity .2s; }
    #tec-quick-thought .qt-saved.show { opacity: 1; }
    #tec-quick-thought .qt-btns { display: flex; gap: 6px; }
    #tec-quick-thought button.qt-act {
      border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer;
      font-size: 12px; font-weight: 600;
    }
    #tec-quick-thought .qt-skip { background: #2a2a3e; color: #aaa; }
    #tec-quick-thought .qt-skip:hover { background: #34344a; color: #fff; }
    #tec-quick-thought .qt-save { background: #4361ee; color: #fff; }
    #tec-quick-thought .qt-save:hover { background: #3a56d4; }
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

  /** Decode all HTML entities (named + numeric) using a temporary DOM element */
  function decodeHtmlEntities(text) {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  /** Strip HTML tags and return plain text */
  function stripHtml(html) {
    if (!html) return '';
    return decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
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
                  _capturedComment = plain;
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
          return true;
        }
      }

      // Check vm.comentario object (e.g. vm.comentario.textoComentario)
      if (vm.comentario && typeof vm.comentario === 'object') {
        for (const prop of commentProps) {
          const val = vm.comentario[prop];
          if (typeof val === 'string' && val.length > 30) {
            _capturedComment = stripHtml(val);
              return true;
          }
        }
      }
    }

    // \u2500\u2500 Strategy 2: Call Angular controller methods \u2500\u2500
    if (vm) {
      const methodNames = [
        'mostrarComentario', 'abrirComentario', 'toggleComentario', 'verComentario',
        'mostrarResolucao', 'abrirResolucao', 'toggleResolucao', 'verResolucao',
        'exibirComentario', 'carregarComentario', 'loadComentario',
        'showComment', 'loadComment', 'toggleComment', 'mostrarComentarioTexto'
      ];

      for (const name of methodNames) {
        if (typeof vm[name] === 'function') {
              try {
            const result = vm[name]();
            if (result && typeof result.then === 'function') {
              await result;
            }
            try { scope.$apply(); } catch (_) { /* may already be in digest */ }
            await delay(800);

            // Re-check scope for new comment data
            if (vm.questao) {
              for (const [key, val] of Object.entries(vm.questao)) {
                if (typeof val === 'string' && val.length > 30) {
                  const plain = stripHtml(val);
                  const enunciadoPlain = stripHtml(vm.questao.enunciado || '');
                  if (plain !== enunciadoPlain && !plain.startsWith(enunciadoPlain.substring(0, 50))) {
                    _capturedComment = plain;
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
    let capturedXhrUrl = null;
    let capturedXhrResponse = null;

    const origOpen = unsafeWindow.XMLHttpRequest.prototype.open;
    const origSend = unsafeWindow.XMLHttpRequest.prototype.send;

    try {
      if (!origOpen._tecPatched) {
        const patchedOpen = function(method, url, ...args) {
          this._tecUrl = url;
          return origOpen.apply(this, [method, url, ...args]);
        };
        patchedOpen._tecPatched = true;
        unsafeWindow.XMLHttpRequest.prototype.open = patchedOpen;

        unsafeWindow.XMLHttpRequest.prototype.send = function(...args) {
          const self = this;
          this.addEventListener('load', function() {
            if (self._tecUrl && /coment|resoluc|questao|questoes/i.test(self._tecUrl) && self.responseText?.length > 50) {
              capturedXhrUrl = self._tecUrl;
              capturedXhrResponse = self.responseText;
            }
          });
          return origSend.apply(this, args);
        };
      }

      // Try multiple selectors to find the comment toggle button
      const commentSelectors = [
        'a[ng-click*="comentario"]',
        'button[ng-click*="comentario"]',
        'a[ng-click*="resolucao"]',
        'button[ng-click*="resolucao"]',
        '[ng-click*="mostrarComentario"]',
        '[ng-click*="toggleComentario"]',
        '[ng-click*="abrirComentario"]',
      ];
      for (const sel of commentSelectors) {
        const el = document.querySelector(sel);
        if (el) { realClick(el); break; }
      }

      const resolucaoLinks = [...document.querySelectorAll('a, button, span, div')].filter(el => {
        const txt = el.textContent.trim();
        return /ver resolu[\u00E7c]|resolu\u00E7\u00E3o comentada|coment\.rio do professor|exibir coment\.rio/i.test(txt) && txt.length < 60;
      });
      for (const link of resolucaoLinks) { realClick(link); }
      try { document.activeElement?.blur(); } catch (_) {}
      document.body.focus();
      simulateKey('o', 79);

      await delay(3500);
    } finally {
      unsafeWindow.XMLHttpRequest.prototype.open = origOpen;
      unsafeWindow.XMLHttpRequest.prototype.send = origSend;
    }

    if (capturedXhrResponse) {
      try {
        const data = JSON.parse(capturedXhrResponse);
        const text = extractCommentFromJson(data);
        if (text && text.length > 30) {
          _capturedComment = text;
          return true;
        }
      } catch {
        if (capturedXhrResponse.length > 50 && !capturedXhrResponse.startsWith('<!')) {
          _capturedComment = stripHtml(capturedXhrResponse);
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
              const resp = await gmFetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/html',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
          if (resp.ok) {
            const text = await resp.text();
              if (text.length > 50) {
              try {
                const data = JSON.parse(text);
                      const comment = extractCommentFromJson(data);
                if (comment && comment.length > 30) {
                  _capturedComment = comment;
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
                                  return true;
                    }
                  }
                }
              }
            }
          } else {
            }
        } catch (err) {
        }
      }
    }

    // \u2500\u2500 Strategy 5: DOM fallback \u2500\u2500
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

  // ── Per-question stored thoughts (raciocinio capturado na hora do erro) ──
  function thoughtKey(id) {
    return `tec_thought_${id}`;
  }

  /** Read the thought previously saved for a question id (empty string if none). */
  function getStoredThought(id) {
    if (!id) return '';
    return GM_getValue(thoughtKey(id), '') || '';
  }

  /** Persist (or clear, when empty) the thought attached to a question id. */
  function setStoredThought(id, text) {
    if (!id) return;
    const value = (text || '').trim();
    if (value) {
      GM_setValue(thoughtKey(id), value);
    } else {
      GM_setValue(thoughtKey(id), '');
    }
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
   * Classifica um item de histórico como resolução ('err' | 'ok') ou null.
   * Exige marcador de data/tempo para NÃO confundir com o array de alternativas
   * (que também tem campo `correta`).
   */
  function classifyResolucao(it) {
    if (!it || typeof it !== 'object') return null;
    // Objeto de QUESTÃO também tem correcaoQuestao + datas — não é uma resolução.
    // Sem este filtro, o array de questões de um caderno passa como histórico.
    if (it.idQuestao != null || (it.id != null && it.enunciado != null) || Array.isArray(it.alternativas)) return null;
    const hasDate = ['data', 'dataResolucao', 'dataHora', 'dataDeResolucao', 'criadoEm', 'dataResposta']
      .some(k => it[k] != null);
    const hasTime = ['tempo', 'tempoResolucao', 'tempoGasto', 'duracao', 'tempoEmSegundos']
      .some(k => it[k] != null);
    if (!hasDate && !hasTime) return null;
    for (const k of ['correcao', 'correcaoQuestao', 'acertou', 'correta', 'acerto', 'correto', 'resolvidaCorretamente']) {
      if (typeof it[k] === 'boolean') return it[k] ? 'ok' : 'err';
    }
    for (const k of ['resultado', 'situacao', 'status', 'correcaoTexto']) {
      const v = it[k];
      if (typeof v === 'string') {
        if (/errou|errad|incorret/i.test(v)) return 'err';
        if (/acert|corret/i.test(v)) return 'ok';
      }
    }
    return null;
  }

  /**
   * Lê o histórico REAL de resoluções do TEC desta questão e conta quantas
   * vezes o aluno ERROU. É a fonte de verdade para vezes_errado — inclui a
   * tentativa atual e erros anteriores ao próprio script.
   * Retorna um número >= 0, ou null se não foi possível determinar com confiança.
   */
  function extractTecErrorCount(q, vm) {
    // ── 1. Angular scope: procurar um array que pareça histórico de resoluções ──
    const containers = [q, vm?.questao, vm, vm?.desempenho, vm?.estatistica, vm?.estatisticas];
    for (const c of containers) {
      if (!c || typeof c !== 'object') continue;
      for (const key of Object.keys(c)) {
        // A CHAVE precisa parecer histórico de resoluções — sem isso, qualquer
        // array do controller (questões do caderno, comentários) vira candidato.
        if (!/resolu|histor|tentativ|desempenho|respost/i.test(key)) continue;
        const arr = c[key];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        // Só confia se TODOS os itens forem classificáveis como resolução
        // (com data/tempo) — evita falso-positivo com alternativas, tags, etc.
        let errs = 0, allOk = true;
        for (const it of arr) {
          const cls = classifyResolucao(it);
          if (!cls) { allOk = false; break; }
          if (cls === 'err') errs++;
        }
        if (allOk) {
          console.log(`📊 Histórico TEC via scope (${key}): ${errs} erro(s) em ${arr.length} resolução(ões)`);
          return errs;
        }
      }
    }

    // ── 2. DOM: painel "Meu Desempenho" DESTA questão (nunca o body inteiro —
    //    em páginas de listagem o body mistura o histórico de outras questões) ──
    const label = [...document.querySelectorAll('h1,h2,h3,h4,h5,strong,span,div,a,button')].find(el =>
      el.children.length === 0 && /^\s*meu\s+desempenho\s*$/i.test(el.textContent || ''));
    if (label) {
      let node = label.parentElement;
      for (let i = 0; node && i < 6; i++) {
        const txt = node.innerText || '';
        if (/\d{2}\/\d{2}\/\d{4}\s*[-–]\s*(Errou|Acertou)/i.test(txt)) {
          const errMatches = txt.match(/\d{2}\/\d{2}\/\d{4}\s*[-–]\s*Errou/gi) || [];
          const okMatches = txt.match(/\d{2}\/\d{2}\/\d{4}\s*[-–]\s*Acertou/gi) || [];
          console.log(`📊 Histórico TEC via DOM (painel): ${errMatches.length} erro(s) em ${errMatches.length + okMatches.length} resolução(ões)`);
          return errMatches.length;
        }
        node = node.parentElement;
      }
    }

    return null; // indeterminado → cai no incremento local
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

    // \u2500\u2500 9. Hist\u00F3rico REAL de erros no TEC (fonte de verdade do vezes_errado) \u2500\u2500
    data.vezesErradoTec = extractTecErrorCount(q, vm);

    console.log(`\uD83D\uDCCB Dados extra\u00EDdos: Q${data.id} | ${data.materia} > ${data.assunto} | ${data.tipo}`);
    return data;
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                   6. GEMINI API                              \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  const SYSTEM_PROMPT = `Você é um especialista em concursos públicos e criação de flashcards para Anki. A partir da questão, do comentário do professor e do "Erro Identificado", crie no máximo 2 flashcards focados exclusivamente na lacuna de conhecimento que causou o erro. Ignore conceitos da questão que o aluno já domina.

## Autoridade do conteúdo (REGRA SOBERANA)

A precisão jurídica vem EXCLUSIVAMENTE do comentário do professor e do gabarito oficial — eles são a autoridade soberana sobre o que é correto. O relato do aluno (quando houver) serve APENAS para identificar QUAL foi a dúvida/erro a atacar, NUNCA como fonte de doutrina. Se o relato contradisser o gabarito/comentário, o card segue o gabarito/comentário e corrige o aluno. Se o relato já estiver CORRETO, confirme-o — não o "super-corrija" para algo que o gabarito não sustenta.

Antes de finalizar, faça uma AUTOCHECAGEM e refaça se necessário:
1. Cada verso está de acordo com o gabarito e o comentário do professor?
2. O campo "erro_identificado" é coerente com o verso de TODOS os cards (nunca afirma o oposto do que o card ensina)?
3. Você inventou alguma "distinção" entre conceitos que na verdade são sinônimos/equivalentes? Se sim, troque por um card que ENSINA a equivalência.
4. Os cards são coerentes ENTRE SI (um não afirma o que o outro nega)?
5. Se o tema envolver prazos, o card trata do instituto certo — DECADÊNCIA (prazo para lançar/constituir) ou PRESCRIÇÃO (prazo para cobrar/executar)? Não troque um pelo outro.
6. A frente tem UMA resposta correta inequívoca? Leia a frente como se soubesse o assunto: se mais de uma resposta razoável caberia na lacuna, a frase está AMBÍGUA — adicione contexto/restrição à frase (NÃO um rótulo mais vago) até a resposta ser única.
7. Cada card Cloze tem só UMA lacuna {{ }}? Se há dois fatos a testar, faça dois cards.

## Princípio da Informação Mínima (Wozniak)

Aplique rigorosamente: cada card testa UMA ÚNICA informação — um prazo, uma exceção, uma palavra-chave, uma tese do STF. Nunca agrupe dois fatos num mesmo card.

**Evite enumerações:** se a questão cobrar uma lista de 3+ itens (requisitos, características, hipóteses), prefira criar 1 card por item em vez de 1 card com a lista inteira.

## Formato dos cards

### PRIORIDADE 1 — Cloze (lacunas)

Prefira SEMPRE este formato para regras, leis e jurisprudências. Escreva uma afirmação AUTOCONTIDA, que faça sentido mesmo sem a questão original. A lacuna entre {{ }} deve ser um RÓTULO GENÉRICO do que falta (ex: {{tipo}}, {{regra}}, {{conceito}}), nunca a resposta já preenchida (ex: {{N:N}}, {{igual para todas as contas}}).

#### Regra do Rótulo Genérico (obrigatório para Cloze)

O texto dentro de {{ }} deve indicar APENAS a CATEGORIA da informação, NUNCA sua identidade. O aluno que lê a frente NÃO pode deduzir a resposta pelo rótulo da lacuna. FORMA do rótulo: 1-2 palavras, sem pontuação e sem listas — rótulos com 3+ palavras ou pontuação são substituídos automaticamente por {{lacuna}} e o card perde a categoria.

❌ RUINS — rótulo é a resposta ou dá dica demais:
- {{finalidades essenciais}} → o rótulo é literalmente o conceito; quem lê já sabe o que procurar
- {{imunidade recíproca}} → o rótulo revela o instituto
- {{ anterioridade anual }} → o rótulo é o nome da regra

✅ BONS — rótulo genérico que oculta a resposta:
- {{condição}}, {{requisito}}, {{critério}} → quando falta um pré-requisito
- {{efeito}}, {{consequência}}, {{resultado}} → quando falta o desdobramento
- {{regra}}, {{tratamento}}, {{regime}} → quando falta como se aplica
- {{sujeito}}, {{competente}}, {{responsável}} → quando falta quem faz
- {{prazo}}, {{tempo}}, {{período}} → quando falta uma data/duração
- {{síntese}}, {{tese}}, {{entendimento}} → quando falta a conclusão de um julgado

DICA: antes de aceitar o rótulo, pergunte-se: "Se eu soubesse ZERO do assunto, esse rótulo me daria a resposta?" Se sim, troque por um mais genérico.

#### Equilíbrio anti-ambiguidade (igualmente obrigatório)

Há um segundo risco, oposto ao cueing: um rótulo genérico DEMAIS pode tornar a frente AMBÍGUA — várias respostas plausíveis cabem na lacuna e o aluno não sabe O QUE recuperar (e marca "errei" sobre um acerto). A especificidade NÃO deve vir do rótulo (que vazaria a resposta), mas do CONTEXTO da frase. Teste de mão dupla para toda lacuna:
1. Anti-cueing: o rótulo entrega a resposta? Se sim, generalize o rótulo.
2. Anti-ambiguidade: dado o resto da frase, existe UMA única resposta correta defensável? Se mais de uma caberia, ADICIONE contexto/restrição à frase (uma cláusula que fixe a dimensão exata), não um rótulo mais vago.

❌ Ambíguo: "A capitalização de juros é {{regra}} em contratos após 31/03/2000." (cabem "permitida", "vedada salvo pactuação", "condicionada"...)
✅ Inequívoco: "A capitalização de juros com periodicidade inferior a um ano é {{regra}} em contratos celebrados após 31/03/2000, segundo a Súmula 539 do STJ." (só "permitida" se encaixa)

❌ Ruim (Q&A genérico):
Frente: O que diz a Súmula 539 do STJ sobre juros?
Verso: É permitida a capitalização com periodicidade inferior a um ano.

✅ Bom (Cloze):
Frente: A capitalização de juros com periodicidade inferior a um ano é {{regra}} em contratos celebrados após 31/03/2000. (Súmula 539 STJ)
Verso: permitida

Em contratos após 31/03/2000, admite-se capitalização inferior a um ano. (Súmula 539 STJ)

#### Cloze de literalidade (lei seca) — CTN, CF, LC 87/96, LC 116/03, legislação estadual

Quando o comentário do professor citar o TEXTO de um dispositivo legal, a frente do card deve REPRODUZIR a redação literal do dispositivo — não parafrasear — com a lacuna exatamente no termo-pivô que as bancas trocam: verbo modal ("poderá" vs "deverá"), quantificador ("somente", "salvo disposição de lei em contrário"), sujeito competente ou prazo. Declare a esfera normativa na própria frase (norma geral do CTN / LC federal / lei estadual): provas de SEFAZ cobram exatamente a divergência entre a norma geral e a lei local. Nesses cards, palavras_chave = o trecho literal adjacente à lacuna.
✅ "Nos termos do CTN, art. 161, § 2º, os juros de mora {{regra}} na pendência de consulta formulada pelo devedor dentro do prazo legal." (verso: não se aplicam)

### PRIORIDADE 2 — Q&A cirúrgico

Use apenas quando Cloze não for natural. Regras obrigatórias:
- Pergunta sem pistas na formulação: NÃO use "Segundo o STF..." se isso entrega a resposta
- O verso deve abrir com a resposta curta e, se necessário, trazer 1 explicação breve logo abaixo para deixar o card autocontido
- Para fórmulas ou cálculos: prefira Cloze com a variável como lacuna; inclua um exemplo numérico concreto no verso para ancorar a memória

✅ Bom (Q&A):
Frente: Qual princípio veda cobrar tributo no mesmo exercício da lei que o criou?
Verso: Anterioridade anual.

Impede a cobrança no mesmo exercício da lei instituidora. (CF art. 150, III, b)

### PRIORIDADE 3 — Julgue (estilo certo/errado de banca)

Use para pegadinhas de redação e generalizações indevidas, principalmente quando a questão de origem for Certo/Errado (CEBRASPE). A frente traz UMA assertiva INÉDITA — uma paráfrase nova que embute a pegadinha que derrubou o aluno, NUNCA o enunciado original — precedida do comando "Julgue (C/E):". Regras obrigatórias:
- A assertiva deve ser plausível e ter EXATAMENTE 1 ponto de decisão (uma palavra/expressão que a torna certa ou errada)
- O verso NOMEIA a palavra-crítica: answer-line = "ERRADO — pivô: <termo>" (ou "CERTO — pivô: <termo>"); a explicação traz a regra correta
- Verso que não nomeia a palavra-crítica torna o card inválido (julgar C/E sem saber POR QUÊ é chute, não recuperação)

✅ Bom (Julgue):
Frente: Julgue (C/E): A concessão de anistia política é ato discricionário da Administração.
Verso: ERRADO — pivô: discricionário (é vinculado)

Comprovados os requisitos legais, é dever da Administração declará-la. (STF, RMS 25988)

## O que fazer

1. Leia os dados da questão fornecidos
2. Verifique se o aluno ERROU ou ACERTOU a questão
3. Siga as instruções do cenário correspondente abaixo

---

## CENÁRIO 1: QUESTÃO ERRADA

Identifique com precisão:
- Qual alternativa o aluno marcou (a errada)
- Qual o gabarito correto
- POR QUE o aluno errou: qual confusão, troca, ou lacuna específica causou o erro

Crie ATÉ 2 flashcards que corrigem EXATAMENTE essa lacuna.

ATENÇÃO: nem todo erro é uma "confusão entre dois conceitos distintos". O mecanismo pode ser, entre outros: troca/inversão entre X e Y; **falha em perceber que dois termos são SINÔNIMOS/equivalentes** (o aluno achou que eram diferentes); desconhecimento simples de uma regra; exceção desconhecida; pegadinha de redação; ou lapso de leitura. Identifique o mecanismo REAL antes de escolher o formato — NÃO force uma "distinção" onde não há duas coisas a distinguir.

### REGRA DE OURO: foque no MECANISMO DO ERRO, não no tema geral

O objetivo NÃO é ensinar o assunto de forma genérica. É CORRIGIR exatamente o que fez o aluno errar.

### Exemplos de erros comuns e como abordar:

**Erro por TROCA/INVERSÃO de conceitos:**
Se a banca trocou as descrições de dois institutos, o card deve forçar o aluno a DISTINGUIR X de Y. Prefira Cloze comparativo, mas use Q&A ou Julgue se o Cloze ficar artificial.

**Erro por EXCEÇÃO desconhecida:**
Se o aluno generalizou uma regra que tem exceção, o card deve focar na exceção via Cloze: "A regra X se aplica, EXCETO quando {{situação}}."

**Erro por CONFUSÃO de competência/sujeito:**
Se a banca trocou quem faz o quê, o card testa via Cloze com rótulo genérico: "É competente para instituir o ITCMD: {{ente competente}}." (verso: Estados e DF). NUNCA liste as opções dentro das chaves ("{{A ou B}}") — isso entrega a resposta pela metade e vaza no rótulo.

**Erro por PEGADINHA de redação:**
Se um item parece certo mas tem uma palavra que o torna errado, o card usa Cloze para fixar a palavra crítica.

**Erro por GENERALIZAÇÃO (como "toda norma...", "sempre...", "nunca..."):**
Cloze: "A regra X se aplica {{alcance}}." (verso: "sempre", "nunca" ou "salvo <exceção curta>"). Se a exceção não couber numa resposta curta, prefira um card Julgue com a generalização indevida como palavra-crítica.

**Erro por FALSA DISTINÇÃO (não perceber que dois termos são SINÔNIMOS/equivalentes):**
Quando o aluno tratou como diferentes dois termos que designam a MESMA coisa (ex.: "lançamento direto" e "lançamento de ofício"), o card deve ENSINAR a equivalência — NUNCA inventar uma distinção inexistente nem citar fundamentos diferentes para cada termo. Cloze com UMA lacuna só, deixando um dos termos visível: "Lançamento direto é sinônimo de lançamento {{modalidade}} (mesmo fundamento legal)." (verso: de ofício). NUNCA oculte os dois termos da equivalência ao mesmo tempo.

**Erro por DESCONHECIMENTO SIMPLES de uma regra (sem confusão com outro instituto):**
Quando o aluno apenas não sabia a regra/prazo/requisito, faça um card direto sobre a regra correta. Não há "X vs Y" a distinguir — não fabrique um.

**Questão de jurisprudência (STF/STJ):**
Prefira o sentido caso→tese: frente = situação fática do julgado, verso = tese fixada pelo tribunal. Se a tese for amplamente cobrada em provas, um segundo card tese→caso consolida o reconhecimento inverso. Regras obrigatórias:
- O verso usa o VERBO DE COMANDO exato do precedente ("é inconstitucional", "não incide", "compete", "é vedada") — é a DIREÇÃO da tese que a banca inverte para criar o item errado. A lacuna preferencial do Cloze é essa direção: "{{entendimento}}" sobre incide/não incide, constitucional/inconstitucional
- Identifique o precedente pelo rótulo canônico quando o comentário fornecer (Súmula nº X, Súmula Vinculante nº X, Tema de Repercussão Geral nº X, ADI nº X), em <span class="ref">
- NUNCA atribua uma tese sem dizer o tribunal — trocar STF por STJ é pegadinha clássica

### Tipos de cards para questão ERRADA (em ordem de prioridade):

1. **Card do mecanismo do erro (OBRIGATÓRIO):** ataque exatamente o mecanismo identificado. SE o erro foi confusão entre dois institutos, faça um card de distinção (force o aluno a distinguir X de Y). SE o erro foi não perceber que dois termos são sinônimos, faça um card que ENSINA a equivalência. SE foi desconhecimento simples, faça um card direto sobre a regra. Prefira Cloze, salvo se um Q&A ou Julgue ficar mais claro.
2. **Card da regra correta (se necessário):** Pergunta direta sobre o artigo, súmula ou regra que fundamenta a resposta correta.

**No campo "erro_identificado":** descreva o mecanismo REAL do erro, COERENTE com o que os cards ensinam e com o gabarito (ex.: "Confundiu competência da União com a dos Estados" OU "Não percebeu que 'lançamento direto' e 'de ofício' são sinônimos"). O erro_identificado NUNCA pode contradizer o verso de nenhum card, nem o gabarito, nem reproduzir uma premissa errada do relato do aluno.

---

## CENÁRIO 2: QUESTÃO ACERTADA

Quando o aluno ACERTA mas pede cards, é porque NÃO teve certeza da resposta. O objetivo é BLINDAR esse conhecimento.

Identifique com precisão:
- Qual a PEGADINHA ou NUANCE da questão (o que a tornava difícil)
- Qual o detalhe sutil que a banca explorou para confundir
- Quais alternativas eram mais "sedutoras" e por quê

### Tipos de cards para questão ACERTADA (em ordem de prioridade):

1. **Card da pegadinha (OBRIGATÓRIO):** Exponha a armadilha da banca. Use Cloze se ficar natural; caso contrário, use Q&A ou Julgue autocontido.
2. **Card da nuance (se necessário):** Teste a distinção sutil que tornava a questão difícil sem depender da redação da questão original.

**No campo "erro_identificado":** descreva a pegadinha/nuance da questão (ex: "A alternativa B parecia correta por usar 'sempre que possível', mas o art. X não admite exceção neste caso").

## Regras gerais para os flashcards

- **MÁXIMO 2 cards** — se a confusão for simples, 1 card basta
- O PRIMEIRO card SEMPRE deve atacar o ponto central: a confusão (se errou) ou a pegadinha/nuance (se acertou)
- O card precisa ser AUTOCONTIDO: quem o lê deve entender o erro e a distinção sem voltar à questão
- **Tipo**: indique no campo "tipo" se é "Cloze", "Q&A" ou "Julgue". Você pode combinar formatos (ex.: 1 Cloze + 1 Julgue) quando isso ensinar melhor
- **Cloze**: use {{rotulo_generico}} para marcar a informação oculta; nunca coloque a resposta dentro das chaves. O verso deve começar pela resposta curta e pode trazer 1 explicação breve logo abaixo
- **Cloze — a resposta PREENCHE a lacuna (crítico):** no Anki a lacuna {{ }} da frente é substituída pela RESPOSTA CURTA (a primeira linha do verso). Logo: (a) a resposta tem que ser um TERMO/EXPRESSÃO CURTA, NUNCA uma frase ou explicação — senão a lacuna fica preenchida com um parágrafo inteiro e a frase do card vira um amontoado ilegível; (b) ao preencher mentalmente a lacuna com a resposta, a frente deve formar UMA frase coerente, sem duplicar conteúdo; (c) a frente NÃO pode conter a resposta fora da lacuna (vazamento). A explicação/contraste vai SEMPRE depois, na explanation — nunca dentro da lacuna nem como a "resposta curta"
- **Uma lacuna por card Cloze:** use no MÁXIMO 1 lacuna {{ }} por card. Se a frase tem dois fatos a testar (ex.: uma regra E um prazo), faça dois cards, cada um com uma lacuna
- **Âncora para fatos áridos:** para PRAZOS, PERCENTUAIS e DATAS, inclua no verso 1 âncora concreta de 1 linha — um micro-exemplo datado (ex.: "FG em 2020 → decai em 31/12/2025") ou um contraste curto com o instituto vizinho (decadência = constituir / prescrição = cobrar). Só quando houver gancho natural; não invente mnemônico artificial
- **Q&A**: frente cirúrgica, verso começando pela resposta curta. Depois, se necessário, acrescente 1 explicação breve. Não use "Segundo o STF..." se isso entrega a resposta
- Use perguntas COMPARATIVAS quando o erro envolver troca de conceitos
- NUNCA crie cards genéricos sobre o assunto. Cada card deve ter relação direta com o motivo do erro
- NUNCA copie o enunciado da questão. O card deve testar o CONCEITO, não a questão específica
- Se a distinção importante não couber num Cloze limpo, prefira um Q&A ou Julgue curto e claro
- Se a questão envolver artigo de lei, cite o artigo no verso
- materia: nome oficial como em editais (Direito Constitucional, Direito Tributário, etc.)
- ATENÇÃO na classificação de matéria: classifique pelo CONTEÚDO TÉCNICO do tema
- subtopico: específico (ex: "Aplicabilidade das Normas - Art. 5º §1º CF", não "Normas")

## Formatação HTML dos campos frente e verso

Use HTML inline para destacar visualmente os elementos-chave dentro do texto dos cards. Isso é FUNDAMENTAL para facilitar a memorização.

### Tags disponíveis (use sempre que aplicável):

- **<b>texto</b>** → para termos jurídicos centrais, nomes de princípios, institutos (ex: <b>legalidade tributária</b>)
- **<span class="neg">texto</span>** → para NEGAÇÕES, exceções, vedações, alertas (ex: <span class="neg">NÃO exige lei para alteração de prazo</span>)
- **<mark>texto</mark>** → para palavras-chave críticas dentro da frase que o aluno deve gravar (ex: a legalidade é sobre a <mark>forma</mark>; a anterioridade é sobre o <mark>tempo</mark>)
- **<ul><li>texto</li></ul>** → para listas enumerativas (ex: atos que exigem lei: instituição, aumento, majoração de alíquota, alteração de base de cálculo)
- **<span class="ref">texto</span>** → para referências legais e artigos (ex: <span class="ref">CF art. 150, I</span>)
- **<div class="answer-line">texto</div>** → para a primeira linha do verso, com a resposta curta
- **<div class="explanation">texto</div>** → para a explicação breve que contextualiza a distinção

### Regras de formatação:
- Em cards Cloze: use <mark> na lacuna assim: <mark>{{rotulo_generico}}</mark> para destacar visualmente a informação oculta
- No verso, use SEMPRE a estrutura: <div class="answer-line">RESPOSTA CURTA</div> + <div class="explanation">explicação</div>. A answer-line é SÓ a resposta direta/termo — NO MÁXIMO uma oração curta (≈ até 12 palavras). NUNCA jogue o contraste/explicação inteiro na answer-line (senão vira um bloco enorme e ilegível). Para distinções, a answer-line traz só a conclusão curta; o detalhe vai na explanation, com <mark>/<b> nas palavras discriminantes
- **ORÇAMENTO DE DESTAQUE (evite poluição visual):** no MÁXIMO 1 <mark> por FACE do card — na FRENTE, o único <mark> é o da lacuna (<mark>{{rotulo}}</mark>); no VERSO, o único <mark> vai na feature discriminante (a palavra que diferencia X de Y ou a palavra-armadilha). Além disso: no MÁXIMO 2-3 <b> por card (só os conceitos centrais); <span class="neg"> apenas na negação/exceção que é o PIVÔ do erro. Se quase tudo está destacado, nada se destaca (o realce perde a função de guiar o olho).
- Em cards de distinção/pegadinha, o <mark> do verso deve cair na FEATURE DISCRIMINANTE (a palavra que diferencia X de Y, ou a palavra-armadilha) — não numa palavra qualquer
- Use <span class="neg"> para negação, vedação, exceção ou contraste ("NÃO", "vedado", "salvo", "exceto"), respeitando o orçamento acima
- Na FRENTE do card, use <b> para o termo central da pergunta e <mark> para destaques pontuais
- Listas com <ul><li> são preferíveis a texto corrido quando há 3+ itens
- NUNCA use tags de formatação no campo palavras_chave (é plain text)

## Palavras-chave consagradas

Para cada card, inclua no campo "palavras_chave" as EXPRESSÕES CANÔNICAS que identificam o conceito/instituto jurídico abordado. São os termos consagrados na lei, doutrina ou jurisprudência que funcionam como "impressão digital" daquele conceito — quando o aluno vê essas palavras num enunciado longo, deve imediatamente reconhecer de qual instituto se trata.

### O que SÃO palavras-chave (exemplos por conceito):
- Capacidade contributiva → "circunstâncias pessoais", "capacidade econômica real", "será pessoal sempre que possível"
- Princípio da legalidade tributária → "somente a lei pode", "instituir ou aumentar tributo", "vedado à União, Estados..."
- Imunidade recíproca → "vedado cobrar impostos", "patrimônio, renda ou serviços uns dos outros"
- Devido processo legal → "contraditório e ampla defesa", "privado de seus bens", "sem o devido processo"
- Ato administrativo vinculado → "a Administração DEVE", "preenchidos os requisitos", "direito subjetivo"

### O que NÃO são palavras-chave:
- Palavras genéricas do tema: "STF", "imposto de renda", "deduções", "tributo"
- Nomes de institutos: o nome do conceito em si não é palavra-chave, são as expressões que SINALIZAM ele

### Regras:
- Liste 1-2 expressões por card (somente as mais fortes e discriminativas)
- Priorize trechos literais de artigos de lei ou súmulas
- Se não houver expressões canônicas claras para o conceito, deixe o campo vazio ("")`;

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Mat\u00E9ria do edital' },
      subtopico: { type: 'string', description: 'Subt\u00F3pico espec\u00EDfico' },
      erro_identificado: { type: 'string', description: 'Se errou: descri\u00E7\u00E3o do mecanismo REAL do erro. Se acertou: pegadinha/nuance. DEVE ser coerente com o verso de TODOS os cards (jamais afirmar o oposto do que o card ensina) e com o gabarito; nunca reproduzir uma premissa errada do relato do aluno.' },
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['Cloze', 'Q&A', 'Julgue'], description: 'Formato do card: Cloze para afirmação autocontida com {{rotulo_generico}}, Q&A para pergunta direta ou distinção breve, Julgue para assertiva certo/errado com palavra-crítica nomeada no verso' },
            frente_texto_limpo: { type: 'string', description: 'Card autocontido em texto puro. Se for Cloze, use {{rotulo_generico}}, nunca a resposta preenchida.' },
            verso_texto_limpo: { type: 'string', description: '1ª linha = SÓ a resposta curta (termo/expressão, máx. 12 palavras). Depois LINHA EM BRANCO e a explicação breve em parágrafo separado. NUNCA misture explicação na 1ª linha.' },
            frente_html: { type: 'string', description: 'Mesmo conteúdo da frente com HTML e destaque visual; se for Cloze, use <mark>{{rotulo_generico}}</mark>.' },
            verso_html: { type: 'string', description: 'Verso em HTML, OBRIGATORIAMENTE com <div class="answer-line">APENAS a resposta curta</div> seguido de <div class="explanation">explicação breve</div>. A explicação NUNCA vai dentro da answer-line.' },
            palavras_chave: { type: 'string', description: 'Express\u00F5es can\u00F4nicas da lei/doutrina que identificam este conceito jur\u00EDdico, separadas por " | ". Vazio se n\u00E3o houver.' },
          },
          required: ['tipo', 'frente_texto_limpo', 'verso_texto_limpo', 'frente_html', 'verso_html', 'palavras_chave'],
        },
      },
    },
    required: ['materia', 'subtopico', 'erro_identificado', 'cards'],
  };

  /**
   * Contrato JSON dos criadores de card — fonte ÚNICA para os pipelines raw
   * (OpenRouter/OpenCode) e dual (creator). Divergência entre cópias já causou
   * regressão: o schema do dual sem as travas gerava answer-line com a
   * explicação inteira, que contaminava a lacuna do Cloze.
   */
  const CARD_JSON_CONTRACT = `Responda SOMENTE com JSON válido neste formato exato (sem markdown, sem comentários):
{
  "materia": "string - matéria do edital",
  "subtopico": "string - subtópico específico",
  "erro_identificado": "string - se errou: mecanismo REAL do erro. Se acertou: pegadinha/nuance. DEVE ser coerente com o verso de todos os cards e com o gabarito; nunca reproduza premissa errada do relato",
  "cards": [
    {
      "tipo": "string - Cloze, Q&A ou Julgue",
      "frente_texto_limpo": "string - card autocontido em texto puro; se for Cloze, use {{rotulo_generico}} e NUNCA a resposta preenchida",
      "verso_texto_limpo": "string - 1ª linha = SÓ a resposta curta (termo/expressão, máx. 12 palavras), depois LINHA EM BRANCO e a explicação breve em parágrafo separado. NUNCA misture explicação na 1ª linha",
      "frente_html": "string - mesma frente com HTML; se for Cloze, use <mark>{{rotulo_generico}}</mark>",
      "verso_html": "string - verso em HTML: <div class=\\"answer-line\\">APENAS a resposta curta</div> seguido de <div class=\\"explanation\\">explicação breve</div>; a explicação NUNCA vai dentro da answer-line",
      "palavras_chave": "string - 1 ou 2 expressões canônicas mais discriminativas, separadas por |. Vazio se não houver"
    }
  ]
}`;

  /** Perfis de pegadinha por banca — calibram o estilo do card à mecânica real da prova. */
  const BANCA_PROFILES = [
    {
      re: /cespe|cebraspe/i,
      nome: 'CEBRASPE',
      perfil: `- Mecânica típica: itens Certo/Errado com generalização indevida ("sempre", "somente", "apenas", "qualquer", "independentemente"), inversão de sujeito/competência e restrição ou ampliação indevida de rol.
- O card deve fixar o QUANTIFICADOR/palavra de alcance exata da norma e treinar a detecção da palavra que estraga o item.
- Quando a pegadinha for de redação, prefira 1 card Julgue com a palavra-crítica nomeada no verso.`,
    },
    {
      re: /fgv/i,
      nome: 'FGV',
      perfil: `- Mecânica típica: casos práticos com distratores sofisticados — troca de prazos, percentuais e sujeitos entre alternativas plausíveis.
- O card deve aplicar a regra a um mini-caso concreto e fixar o PAR correto-vs-isca (por que a alternativa sedutora está errada).
- Para prazos/percentuais/alíquotas, inclua a âncora numérica concreta no verso.`,
    },
    {
      re: /fcc/i,
      nome: 'FCC',
      perfil: `- Mecânica típica: literalidade de lei — a alternativa errada é quase a letra da lei com UMA palavra trocada ("poderá"→"deverá", "isento"→"imune", "lei"→"decreto").
- O card deve usar transcrição LITERAL do dispositivo com a lacuna exatamente no termo trocável (Cloze de literalidade).`,
    },
  ];

  function getBancaProfile(banca) {
    const b = BANCA_PROFILES.find(p => p.re.test(banca || ''));
    return b ? `
### Perfil da banca — ${b.nome} (calibre o estilo do card para a mecânica desta banca)
${b.perfil}
` : '';
  }

  function buildGeminiPrompt(q) {
    const maxCards = Math.max(1, parseInt(getSetting('maxCardsPerQuestion'), 10) || 2);
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
${getBancaProfile(q.banca)}
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
${q.cardsExistentes && q.cardsExistentes.length ? `
### \u26A0\uFE0F Cards que J\u00C1 EXISTEM para esta quest\u00E3o \u2014 e o aluno errou DE NOVO apesar deles
${q.cardsExistentes.map(f => `- ${f}`).join('\n')}

Estes cards N\u00C3O evitaram o novo erro: o encoding deles falhou. \u00C9 PROIBIDO repeti-los ou reformul\u00E1-los superficialmente. Gere um \u00E2ngulo NOVO: outro formato (se era Cloze, use Julgue ou Q&A de discrimina\u00E7\u00E3o), o sentido INVERSO do mapeamento (se o card antigo pergunta X\u2192Y, pergunte Y\u2192X), ou a exce\u00E7\u00E3o/nuance que o card antigo n\u00E3o cobre.
` : ''}${q.pensamentoAluno ? `
### \uD83D\uDCAD Alvo pedag\u00F3gico do aluno (use S\u00D3 para mirar o card)
O aluno descreveu o pr\u00F3prio racioc\u00EDnio ao responder esta quest\u00E3o:
"${q.pensamentoAluno}"

COMO USAR ESTE RELATO:
- Ele \u00E9 a melhor fonte sobre QUAL foi a d\u00FAvida/erro do aluno \u2014 use-o para DIRECIONAR o card ao ponto exato que o derrubou.
- Ele N\u00C3O \u00E9 fonte de doutrina. O aluno \u00E9 quem errou; o relato pode conter a premissa jur\u00EDdica equivocada que causou o erro.
- A CORRE\u00C7\u00C3O do conte\u00FAdo vem SEMPRE do coment\u00E1rio do professor + gabarito oficial, que PREVALECEM sobre qualquer afirma\u00E7\u00E3o jur\u00EDdica do relato.
- Se o relato contiver afirma\u00E7\u00E3o INCORRETA, o card deve CORRIGI-LA conforme o gabarito \u2014 NUNCA reproduzi-la. Se o relato j\u00E1 estiver CORRETO, confirme-o; n\u00E3o o "super-corrija".
` : ''}
---
\u26A0\uFE0F LIMITE DESTA QUEST\u00C3O: gere no M\u00C1XIMO ${maxCards} card(s). Este n\u00FAmero substitui qualquer limite mencionado nas instru\u00E7\u00F5es gerais. Continue respeitando o Princ\u00EDpio da Informa\u00E7\u00E3o M\u00EDnima \u2014 se menos cards j\u00E1 cobrirem a lacuna, gere menos; nunca invente cards s\u00F3 para atingir o limite.

Com base nas informa\u00E7\u00F5es acima, identifique ${q.errou ? 'o mecanismo do erro' : 'a pegadinha/nuance que tornava a quest\u00E3o dif\u00EDcil'} e crie no m\u00E1ximo ${maxCards} card(s) AUTOCONTIDOS${maxCards >= 2 ? ', podendo combinar formatos (Cloze, Q&A, Julgue) quando isso deixar a distin\u00E7\u00E3o mais clara' : ''}.`;
  }

  function normalizeKeywords(value) {
    return (value || '')
      .split(/\s*\|\s*/)
      .map(item => stripHtml(item).trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' | ');
  }

  function extractAnswerLabel(content) {
    return stripHtml(content || '')
      .replace(/\r/g, '')
      .split(/\n\s*\n/)[0]
      .split('\n')[0]
      .trim()
      .replace(/[.:;!]+$/, '')
      .toLowerCase();
  }

  function normalizeClozePlaceholder(text, answerText = '', wrapWithMark = false) {
    if (!text) return text;

    const answerLabel = extractAnswerLabel(answerText);

    let normalized = text.replace(/\{\{([^}]+)\}\}/g, (_, inner) => {
      const clean = stripHtml(inner).trim();
      if (!clean) return '{{lacuna}}';

      if (answerLabel && clean.toLowerCase() === answerLabel) {
        return '{{lacuna}}';
      }

      if (/^[A-Za-zÀ-ÿ0-9_-]{1,24}(?:\s+[A-Za-zÀ-ÿ0-9_-]{1,24})?$/.test(clean)) {
        return `{{${clean}}}`;
      }

      return '{{lacuna}}';
    });

    if (wrapWithMark && !/<mark>\s*\{\{/.test(normalized)) {
      normalized = normalized.replace(/\{\{([^}]+)\}\}/g, '<mark>{{$1}}</mark>');
    }

    return normalized;
  }

  function normalizeBackText(content) {
    return (content || '').trim().replace(/\n{3,}/g, '\n\n');
  }

  function formatCardBack(content) {
    if (!content) return content;

    const trimmed = content.trim();
    if (!trimmed || /class="answer-line"|class="explanation"/.test(trimmed)) {
      return trimmed;
    }

    const blocks = trimmed.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    if (!blocks.length) return trimmed;

    let answerLine = blocks.shift();

    // Modelo não separou com linha em branco: a 1ª LINHA é a resposta; o resto é explicação.
    const lines = answerLine.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      answerLine = lines.shift();
      blocks.unshift(lines.join('\n'));
    }

    // Resposta com a explicação embutida na MESMA linha ("vinculado. Comprovados os
    // requisitos..."): corta na 1ª frase e move o resto para a explicação. Só age em
    // linha longa (>12 palavras) para não quebrar respostas legítimas com "art. X".
    if (answerLine.split(/\s+/).length > 12) {
      const m = answerLine.match(/^(.{3,90}?[.;])\s+(?=[A-ZÀ-ÖØ-Ý(])([\s\S]+)$/);
      if (m) {
        answerLine = m[1].replace(/[.;]+$/, '');
        blocks.unshift(m[2]);
      }
    }

    answerLine = answerLine.replace(/\n/g, '<br>');
    const explanation = blocks.length
      ? `<div class="explanation">${blocks.map(block => `<div class="explanation-block">${block.replace(/\n/g, '<br>')}</div>`).join('')}</div>`
      : '';

    return `<div class="answer-line">${answerLine}</div>${explanation}`;
  }

  function normalizeGeneratedCard(card) {
    const normalized = { ...card };

    if (normalized.frente_html && !normalized.frente) {
      normalized.frente = normalized.frente_html;
      normalized.verso = normalized.verso_html;
    }
    if (normalized.frente && !normalized.frente_html) {
      normalized.frente_html = normalized.frente;
      normalized.verso_html = normalized.verso;
      normalized.frente_texto_limpo = normalized.frente.replace(/<[^>]+>/g, '');
      normalized.verso_texto_limpo = normalized.verso.replace(/<[^>]+>/g, '');
    }

    normalized.tipo = normalized.tipo || (/\{\{[^}]+\}\}/.test(normalized.frente_html || normalized.frente_texto_limpo || '') ? 'Cloze' : 'Q&A');

    if (normalized.tipo === 'Cloze') {
      const answerText = normalized.verso_texto_limpo || normalized.verso || normalized.verso_html || '';
      normalized.frente_texto_limpo = normalizeClozePlaceholder(normalized.frente_texto_limpo || '', answerText, false);
      normalized.frente_html = normalizeClozePlaceholder(normalized.frente_html || normalized.frente_texto_limpo || '', answerText, true);
    }

    normalized.verso_texto_limpo = normalizeBackText(normalized.verso_texto_limpo || normalized.verso || '');
    normalized.verso_html = formatCardBack(normalized.verso_html || normalized.verso || normalized.verso_texto_limpo);
    normalized.frente = normalized.frente_html;
    normalized.verso = normalized.verso_html;
    normalized.palavras_chave = normalizeKeywords(normalized.palavras_chave);
    return normalized;
  }

  function normalizeGeneratedResult(result) {
    if (!result || !Array.isArray(result.cards)) return result;
    result.cards = result.cards.map(normalizeGeneratedCard);
    return result;
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

    const result = normalizeGeneratedResult(JSON.parse(text));
    result._generatorModel = `gemini/${model}`;
    return result;
  }

  // ── Generic OpenAI-compatible API caller ────────────────────────────

  function parseOpenAIResponse(json) {
    let content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia da API');
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido.');
    return JSON.parse(jsonMatch[0]);
  }

  async function callOpenAICompatible(url, apiKey, body, extraHeaders = {}) {
    const MAX_RETRIES = 5;
    let res;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`🌐 OpenAI-compatible request → ${url} (tentativa ${attempt}/${MAX_RETRIES})`);
      res = await gmFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        timeout: 300000,
      });

      if (res.ok) break;

      if ((res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504) && attempt < MAX_RETRIES) {
        const waitSec = res.status === 429 ? attempt * 8 : attempt * 5;
        console.warn(`⚠️ ${res.status} — tentativa ${attempt}/${MAX_RETRIES}, aguardando ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`API error (${res.status}): ${errText}`);
    }

    return res.json();
  }

  async function callOpencode(questionData) {
    const apiKey = getSetting('opencodeApiKey');
    const model = getSetting('opencodeModel');
    const baseUrl = getOpencodeEndpoint(model);
    if (!apiKey) throw new Error('API key do OpenCode não configurada. Abra as configurações (⚙️).');

    const body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + CARD_JSON_CONTRACT },
        { role: 'user', content: buildGeminiPrompt(questionData) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    };

    const json = await callOpenAICompatible(baseUrl, apiKey, body);
    const usage = json?.usage;
    const costEstimate = usage ? { promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 } : null;

    const result = parseOpenAIResponse(json);
    if (!result.materia || !result.cards || !Array.isArray(result.cards)) {
      throw new Error('Resposta do OpenCode em formato inválido. Tente novamente.');
    }
    for (const card of result.cards) {
      const hasNew = card.frente_html && card.verso_html;
      const hasOld = card.frente && card.verso;
      if (!hasNew && !hasOld) {
        throw new Error('Um ou mais flashcards estão incompletos na resposta da IA.');
      }
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
    const normalized = normalizeGeneratedResult(result);
    normalized._generatorModel = `opencode/${model}`;
    if (costEstimate) normalized._usage = costEstimate;
    return normalized;
  }

  // ── OpenRouter (OpenAI-compatible) ──────────────────────────────────

  const OPENROUTER_MODELS = [
    { id: 'google/gemma-4-31b-it:free',          label: '\u2B50 Gemma 4 31B (GRATUITO)' },
    { id: 'qwen/qwen3.6-plus',                   label: '\uD83E\uDDE0 Qwen 3.6 Plus Thinking ($0.325/$1.95 M tok)' },
    { id: 'moonshotai/kimi-k2.6',                label: '\uD83E\uDDE0 Kimi K2.6 Thinking ($0.75/$3.50 M tok)' },
    { id: 'moonshotai/kimi-k2.5',                 label: '\uD83E\uDDE0 Kimi K2.5 Thinking ($0.60/M tok)' },
    { id: 'qwen/qwen3-235b-a22b-2507',            label: 'Qwen3 235B ($0.07/M tok \u2014 recomendado)' },
    { id: 'openai/gpt-4o-mini',                  label: 'GPT-4o Mini ($0.39/M tok)' },
    { id: 'deepseek/deepseek-v3.2',              label: 'DeepSeek V3.2 ($0.41/M tok)' },
    { id: 'google/gemini-2.5-flash',             label: 'Gemini 2.5 Flash ($1.30/M tok)' },
    { id: 'anthropic/claude-3.5-haiku',          label: 'Claude 3.5 Haiku ($2.40/M tok)' },
    { id: 'anthropic/claude-haiku-4.5',          label: 'Claude Haiku 4.5 ($3.00/M tok)' },
    { id: 'google/gemini-3.1-pro-preview',       label: '\u2B50 Gemini 3.1 Pro Preview \u2014 GPQA 94.1% ($1.25/$10 M tok)' },
  ];

  const OPENCODE_MODELS = [
    { id: 'glm-5.1',          label: 'GLM 5.1' },
    { id: 'glm-5',            label: 'GLM 5' },
    { id: 'kimi-k2.5',        label: 'Kimi K2.5' },
    { id: 'kimi-k2.6',        label: 'Kimi K2.6' },
    { id: 'deepseek-v4-pro',  label: 'DeepSeek V4 Pro' },
    { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { id: 'mimo-v2-pro',      label: 'MiMo V2 Pro' },
    { id: 'mimo-v2-omni',     label: 'MiMo V2 Omni' },
    { id: 'mimo-v2.5-pro',    label: 'MiMo V2.5 Pro' },
    { id: 'mimo-v2.5',        label: 'MiMo V2.5' },
    { id: 'minimax-m2.7',     label: 'MiniMax M2.7' },
    { id: 'minimax-m2.5',     label: 'MiniMax M2.5' },
    { id: 'qwen3.6-plus',     label: 'Qwen 3.6 Plus' },
    { id: 'qwen3.5-plus',     label: 'Qwen 3.5 Plus' },
  ];

  function getOpencodeEndpoint(model) {
    if (model === 'minimax-m2.7' || model === 'minimax-m2.5') {
      return 'https://opencode.ai/zen/go/v1/messages';
    }
    return 'https://opencode.ai/zen/go/v1/chat/completions';
  }

  // Models for dual pipeline (creator + auditor)
  const PIPELINE_CREATOR_MODELS = [
    { id: 'qwen/qwen3.6-plus',                   label: 'Qwen 3.6 Plus Thinking ($0.325/$1.95 M tok)' },
    { id: 'moonshotai/kimi-k2.6',                label: 'Kimi K2.6 Thinking ($0.75/$3.50 M tok)' },
    { id: 'moonshotai/kimi-k2.5',                label: 'Kimi K2.5 — IFEval 100% ($0.60/$2.00 M tok)' },
    { id: 'qwen/qwen3-235b-a22b-2507',            label: 'Qwen3 235B ($0.07/M tok)' },
    { id: 'deepseek/deepseek-v3.2',              label: 'DeepSeek V3.2 ($0.41/M tok)' },
    ...OPENCODE_MODELS.map(m => ({ id: m.id, label: m.label })),
  ];

  function getOpenRouterReasoningConfig(model) {
    if (!model) return null;

    if (model === 'qwen/qwen3.6-plus' || model === 'moonshotai/kimi-k2.6' || model.includes('kimi-k2')) {
      return { reasoning: { effort: 'high' } };
    }

    return null;
  }
  const PIPELINE_AUDITOR_MODELS = [
    { id: 'google/gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro Preview — GPQA 94.1% ($1.25/$10 M tok)' },
    { id: 'google/gemini-2.5-flash',             label: 'Gemini 2.5 Flash ($1.30/M tok)' },
    { id: 'anthropic/claude-haiku-4.5',          label: 'Claude Haiku 4.5 ($3.00/M tok)' },
    ...OPENCODE_MODELS.map(m => ({ id: m.id, label: m.label })),
  ];

  async function callOpenRouter(questionData) {
    const apiKey = getSetting('openrouterApiKey');
    const model = getSetting('openrouterModel');
    if (!apiKey) throw new Error('API key do OpenRouter n\u00E3o configurada. Abra as configura\u00E7\u00F5es (\u2699\uFE0F).');

    const body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + CARD_JSON_CONTRACT },
        { role: 'user', content: buildGeminiPrompt(questionData) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    };

    const reasoningConfig = getOpenRouterReasoningConfig(model);
    if (reasoningConfig) {
      Object.assign(body, reasoningConfig);
    }

    const json = await callOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', apiKey, body, {
      'HTTP-Referer': 'https://github.com/filipegajo89/anki-tec',
      'X-Title': 'TEC-to-Anki',
    });

    const usage = json?.usage;
    const costEstimate = usage ? { promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 } : null;

    const parsed = parseOpenAIResponse(json);
    if (!parsed.materia || !parsed.cards || !Array.isArray(parsed.cards)) {
      throw new Error('Resposta do OpenRouter em formato inv\u00E1lido. Tente novamente.');
    }
    for (const card of parsed.cards) {
      const hasNew = card.frente_html && card.verso_html;
      const hasOld = card.frente && card.verso;
      if (!hasNew && !hasOld) {
        throw new Error('Um ou mais flashcards est\u00E3o incompletos na resposta da IA.');
      }
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
    const normalized = normalizeGeneratedResult(parsed);
    normalized._generatorModel = model;
    if (costEstimate) normalized._usage = costEstimate;
    return normalized;
  }

  // ── AI Dispatcher ───────────────────────────────────────────────────

  async function callAI(questionData) {
    const provider = getSetting('aiProvider');
    if (provider === 'openrouter') {
      return callOpenRouter(questionData);
    }
    if (provider === 'opencode') {
      return callOpencode(questionData);
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
6. **Coerência com o erro_identificado:** O campo "erro_identificado" bate com o que os versos ensinam? Se ele afirma o OPOSTO de um verso (ex.: diz "X e Y são distintos" enquanto o verso diz "X e Y são sinônimos", ou nega o que o verso afirma), há contradição interna.
7. **Coerência entre cards:** Os cards são compatíveis entre si? Se um card afirma A e outro nega A, há contradição — rejeite o(s) card(s) conflitante(s).
8. **Decadência x prescrição:** Se o tema envolver prazos, o card trata do instituto correto (decadência = prazo para lançar/constituir; prescrição = prazo para cobrar/executar)? Trocar um pelo outro é erro grave.
9. **Frente inequívoca:** a frente tem UMA resposta correta defensável dado o contexto? Se a lacuna for ambígua (várias respostas razoáveis caberiam), o card é mal formulado — a frase precisa de mais contexto, não de rótulo mais vago.
10. **Cloze bem formado (crítico):** se a frente tem lacuna {{...}}, a RESPOSTA é a primeira linha do verso e ela PREENCHERÁ a lacuna no Anki. Verifique: (a) a resposta é um TERMO/EXPRESSÃO CURTA — NÃO uma frase, explicação ou parágrafo; (b) preenchendo a lacuna com a resposta, a frente forma UMA frase coerente, sem duplicar conteúdo; (c) a frente NÃO contém a resposta fora da lacuna (vazamento). Se a "resposta curta" for, na verdade, uma frase longa/explicação, ou se preencher a lacuna deixaria a frase embaralhada, REJEITE.
11. **answer-line curta (regra OBJETIVA):** a primeira linha do verso (answer-line) deve ser a resposta direta/termo. Se tiver MAIS DE 12 PALAVRAS, mais de uma oração, ou embutir a explicação/contraste, REJEITE. Quando o payload trouxer "Answer-line renderizada", audite ELA — é o que o Anki mostra e o que preenche a lacuna do Cloze.
12. **Rótulo da lacuna sem cueing:** o texto dentro de {{ }} na frente deve ser uma CATEGORIA genérica de 1-2 palavras ({{prazo}}, {{regra}}, {{ente competente}}). Se o rótulo entrega a resposta, lista opções ("{{A ou B}}") ou tem 3+ palavras/pontuação, REJEITE.
13. **1 lacuna, 1 fato:** card Cloze com 2 ou mais lacunas {{ }}, ou card que testa dois fatos independentes, REJEITE (peça a divisão em dois cards).
14. **Literalidade de lei seca:** se o card se apresenta como texto de dispositivo legal, confira a fidelidade ao trecho citado no comentário do professor. Paráfrase disfarçada de literalidade = REJEITADO.
15. **Direção da tese (jurisprudência):** o verbo de comando do card confere com o comentário (incide↔não incide, constitucional↔inconstitucional, pode↔não pode)? O tribunal está correto (STF↔STJ)? Inversão = REJEITADO.
16. **Julgue:** assertiva com mais de um ponto de decisão, ou verso que não NOMEIA a palavra-crítica que decide o item, REJEITE.

AUTORIDADE: a correção vem do gabarito + comentário do professor (soberanos). O relato do aluno serve SÓ para julgar relevância (se o card mira a dúvida certa); ele JAMAIS valida um card juridicamente incorreto.

## Critérios de REJEIÇÃO (qualquer um = REJEITADO):
- Informação juridicamente incorreta ou desatualizada
- Contradição com o gabarito oficial ou comentário do professor
- Inversão de conceitos (atribuir a X o que é de Y)
- Resposta ambígua ou genérica demais
- Pergunta que não testa o conceito relevante
- Contradição interna entre o verso de um card e o campo erro_identificado
- Contradição entre dois cards do mesmo lote
- Troca entre decadência e prescrição
- Frente ambígua (mais de uma resposta razoável cabe na lacuna)
- Cloze cuja resposta (1ª linha do verso) é uma frase/explicação longa em vez de um termo curto
- Cloze cuja frente revela a resposta fora da lacuna (vazamento)
- answer-line com o contraste/explicação inteiro em vez da resposta curta
- Card que reproduz uma premissa incorreta do relato do aluno em vez de corrigi-la

## Formato de resposta

Responda SOMENTE com JSON válido:
{
  "cards": [
    { "index": 0, "status": "APROVADO" },
    { "index": 1, "status": "REJEITADO", "justificativa": "string - razão precisa da rejeição" }
  ]
}

OBRIGATÓRIO: o array "cards" deve conter UM veredito para CADA card recebido (índices 0..N-1, sem omitir nenhum). Card sem veredito é tratado como falha sua.

Seja RIGOROSO. Na dúvida, REJEITE. É melhor gerar de novo do que enviar um card incorreto ao Anki.`;

  /**
   * Call OpenRouter with a specific model (used by creator and auditor).
   * Returns parsed JSON response.
   */
  function isOpencodeModel(model) {
    return OPENCODE_MODELS.some(m => m.id === model);
  }

  async function callOpenRouterWithModel(model, systemPrompt, userPrompt, extraBody = {}) {
    const isOpencode = isOpencodeModel(model);
    const apiKey = isOpencode ? getSetting('opencodeApiKey') : getSetting('openrouterApiKey');
    if (!apiKey) throw new Error(`API key do ${isOpencode ? 'OpenCode' : 'OpenRouter'} não configurada.`);

    const reasoningConfig = !isOpencode ? (getOpenRouterReasoningConfig(model) || {}) : {};
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      ...reasoningConfig,
      ...extraBody,
    };

    let json;
    if (isOpencode) {
      const baseUrl = getOpencodeEndpoint(model);
      json = await callOpenAICompatible(baseUrl, apiKey, body);
    } else {
      json = await callOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', apiKey, body, {
        'HTTP-Referer': 'https://github.com/filipegajo89/anki-tec',
        'X-Title': 'TEC-to-Anki',
      });
    }

    // Estimate cost from usage if available
    const usage = json?.usage;
    const costEstimate = usage ? { promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 } : null;

    const parsed = parseOpenAIResponse(json);
    parsed._usage = costEstimate;
    return parsed;
  }

  /**
   * Step 1: Call the Creator model to generate flashcards.
   */
  async function callCreator(questionData, feedback = null) {
    const model = getSetting('creatorModel');

    let userPrompt = buildGeminiPrompt(questionData);
    if (feedback) {
      userPrompt += `\n\n---\n⚠️ ATENÇÃO: Uma auditoria anterior REJEITOU alguns cards. Corrija com base no feedback:\n${feedback}`;
    }

    const result = await callOpenRouterWithModel(
      model,
      SYSTEM_PROMPT + '\n\n' + CARD_JSON_CONTRACT,
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
    const cards = creatorResult.cards.map((card, i) => {
      // A answer-line do verso_html é o que o Anki renderiza e o que preenche a
      // lacuna do Cloze — o auditor precisa vê-la, não só o texto limpo.
      const al = (card.verso_html || '').match(/<div class="answer-line">([\s\S]*?)<\/div>/i);
      const answerLineRender = al ? stripHtml(al[1]).replace(/\s+/g, ' ').trim() : '';
      return {
        index: i,
        frente: card.frente_texto_limpo,
        verso: card.verso_texto_limpo,
        answerLineRender,
      };
    });

    const altsResumo = (questionData.alternativas || []).map(a => {
      let line = `${a.letra}) ${(a.texto || '').slice(0, 120)}`;
      if (a.selecionada) line += ' ← ALUNO MARCOU';
      if (a.correta) line += ' ← GABARITO';
      return line;
    }).join('\n');

    return `## Cards para auditoria

${cards.map(c => `### Card ${c.index}
**Frente:** ${c.frente}
**Verso:** ${c.verso}${c.answerLineRender ? `
**Answer-line renderizada (1ª linha que o Anki mostra e que PREENCHE a lacuna do Cloze):** ${c.answerLineRender}` : ''}`).join('\n\n')}

### Campo "erro_identificado" (mecanismo do erro — DEVE ser coerente com os versos acima)
${creatorResult.erro_identificado || 'N/A'}

---
## Contexto da questão
- **Banca:** ${questionData.banca || 'N/A'}
- **Resultado:** ${questionData.errou ? 'ERROU ❌' : 'ACERTOU ✅'}
- **Gabarito:** ${questionData.gabarito || 'N/A'}
- **Resposta do aluno:** ${questionData.respostaAluno || 'N/A'}

### Enunciado (para auditar a coerência com o gabarito)
${(questionData.enunciado || 'Não disponível').slice(0, 700)}

### Alternativas
${altsResumo || 'Não disponíveis'}

### Comentário do Professor (AUTORIDADE de correção)
${questionData.comentario || 'Não disponível'}${questionData.pensamentoAluno ? `

### 💭 Relato do Aluno (apenas para entender QUAL erro o card deveria atacar)
${questionData.pensamentoAluno}

Use o relato SÓ para julgar se o card mira a dúvida certa (relevância). Ele NÃO é fonte de doutrina e NÃO valida um card incorreto: um card que "ataca a dúvida do relato" mas contém erro jurídico, contradiz o gabarito, ou reproduz a premissa errada do aluno deve ser REJEITADO.` : ''}`;
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
    const creatorModel = getSetting('creatorModel');
    const isOpencode = isOpencodeModel(creatorModel);
    const apiKey = isOpencode ? getSetting('opencodeApiKey') : getSetting('openrouterApiKey');
    if (!apiKey) throw new Error(`API key do ${isOpencode ? 'OpenCode' : 'OpenRouter'} não configurada para o pipeline dual.`);

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
      showToast('⚠️ Auditor indisponível — cards aceitos sem validação (marcados p/ revisão).', 'warning', 5000);
      for (const c of creatorResult.cards) { c._needsReview = true; c._rejectReason = 'Auditor indisponível — não validado'; }
      return normalizeGeneratedResult(creatorResult);
    }
    if (auditorResult._usage) totalCost += trackPipelineCost(auditorResult._usage, getSetting('auditorModel'));

    console.log('⚖️ Auditor result:', auditorResult.cards.map(c => `${c.index}:${c.status}`).join(', '));

    // ── Process auditor verdicts ──
    const approved = [];
    const rejected = [];
    const judged = new Set();
    for (const verdict of auditorResult.cards) {
      const card = creatorResult.cards[verdict.index];
      if (!card) continue; // índice inválido devolvido pelo auditor — ignora o veredito
      judged.add(verdict.index);
      if (verdict.status === 'APROVADO') {
        approved.push(card);
      } else {
        rejected.push({ card, justificativa: verdict.justificativa || 'Sem justificativa' });
      }
    }
    // Card sem veredito não pode sumir em silêncio: mantém, marcado para revisão manual.
    creatorResult.cards.forEach((card, i) => {
      if (judged.has(i)) return;
      card._needsReview = true;
      card._rejectReason = 'Auditor não emitiu veredito para este card';
      approved.push(card);
    });

    // Cards approved in round 1 were audited against the creator's erro_identificado;
    // only swap in the retry's version when ALL surviving cards come from the retry,
    // so the final 💡 box stays coherent with the cards actually kept.
    const round1ApprovedCount = approved.length;

    // ── Retry rejected cards once ──
    let retryErroIdentificado = null;
    if (rejected.length > 0) {
      onStatus(`🔄 Regenerando ${rejected.length} card(s) rejeitado(s)...`);
      // O criador do retry precisa VER o card rejeitado (não só a justificativa) e
      // saber o que já foi aprovado — senão gera duplicatas e contradições.
      const feedback = [
        `Cards REJEITADOS pela auditoria — gere um substituto para CADA um, corrigindo o problema apontado:`,
        ...rejected.map(r => `- Frente: "${r.card.frente_texto_limpo || r.card.frente || ''}"
  Verso: "${(r.card.verso_texto_limpo || r.card.verso || '').split('\n')[0]}"
  Motivo da rejeição: ${r.justificativa}`),
        approved.length
          ? `\nCards JÁ APROVADOS (NÃO os repita nem os contradiga; gere APENAS ${rejected.length} substituto(s)):
${approved.map(c => `- ${c.frente_texto_limpo || c.frente || ''}`).join('\n')}`
          : `\nGere APENAS ${rejected.length} card(s) substituto(s).`,
      ].join('\n');

      try {
        const retryResult = await callCreator(questionData, feedback);
        if (retryResult.erro_identificado) retryErroIdentificado = retryResult.erro_identificado;
        if (retryResult._usage) totalCost += trackPipelineCost(retryResult._usage, getSetting('creatorModel'));

        // Re-audit the retried cards
        onStatus('⚖️ Re-auditando cards regenerados...');
        const retryFiltered = filterForAuditor(retryResult, questionData);
        let retryAudit;
        try {
          retryAudit = await callAuditor(retryFiltered);
          if (retryAudit._usage) totalCost += trackPipelineCost(retryAudit._usage, getSetting('auditorModel'));
        } catch {
          // If re-audit fails, accept retried cards (flagged for manual review)
          for (const c of retryResult.cards) { c._needsReview = true; c._rejectReason = 'Re-auditoria indisponível — não validado'; }
          approved.push(...retryResult.cards);
          retryAudit = null;
        }

        if (retryAudit) {
          const retryJudged = new Set();
          for (const verdict of retryAudit.cards) {
            const card = retryResult.cards[verdict.index];
            if (!card) continue; // índice inválido — ignora
            retryJudged.add(verdict.index);
            if (verdict.status === 'APROVADO') {
              approved.push(card);
            } else {
              // Still rejected after retry — add with 'revisar' tag
              card._needsReview = true;
              card._rejectReason = verdict.justificativa;
              approved.push(card);
            }
          }
          retryResult.cards.forEach((card, i) => {
            if (retryJudged.has(i)) return;
            card._needsReview = true;
            card._rejectReason = 'Auditor não emitiu veredito para este card (retry)';
            approved.push(card);
          });
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
      erro_identificado: (round1ApprovedCount === 0 && retryErroIdentificado) ? retryErroIdentificado : creatorResult.erro_identificado,
      cards: approved,
      _pipelineCost: totalCost,
      _creatorModel: getSetting('creatorModel'),
      _auditorModel: getSetting('auditorModel'),
    };

    const reviewCount = approved.filter(c => c._needsReview).length;
    const costCents = (totalCost * 100).toFixed(1);
    let summaryMsg = `✅ Pipeline: ${approved.length} cards (custo: $${totalCost.toFixed(4)} / ${costCents}¢)`;
    if (reviewCount > 0) summaryMsg += ` | ⚠️ ${reviewCount} para revisão manual`;
    console.log(summaryMsg);

    // As redes de segurança (placeholder genérico, answer-line/explanation no verso,
    // tipo por regex) rodavam só no pipeline raw — o dual entregava cards crus ao Anki.
    return normalizeGeneratedResult(finalResult);
  }

  /**
   * Unified card generation: dual pipeline (Creator \u2192 Auditor) when configured,
   * single model otherwise. Used by both single-question and batch flows.
   */
  /** Frentes dos cards já criados para esta questão (alimenta o prompt anti-repetição). */
  async function fetchExistingCardFronts(questionId) {
    const ids = await ankiInvoke('findNotes', { query: `"Fonte:Q#${questionId} *"` });
    if (!Array.isArray(ids) || !ids.length) return null;
    const info = await ankiInvoke('notesInfo', { notes: ids.slice(0, 8) });
    const fronts = (info || [])
      .map(n => stripHtml(((n.fields || {}).Frente || (n.fields || {}).Text || {}).value || '')
        .replace(/\s+/g, ' ').trim().slice(0, 180))
      .filter(Boolean);
    return fronts.length ? fronts : null;
  }

  async function generateCards(questionData, onStatus = () => {}) {
    // Escalada anti-repetição (tratamento de leech do SuperMemo): se o aluno errou
    // DE NOVO uma questão que já tem cards, os cards existentes falharam — o prompt
    // os recebe e é proibido de reformulá-los; o novo card ataca por OUTRO ângulo.
    if (questionData.errou && questionData.id && !questionData.cardsExistentes) {
      questionData.cardsExistentes = await fetchExistingCardFronts(questionData.id)
        .catch(() => null);
    }
    if (getSetting('pipelineMode') === 'dual') {
      return callDualPipeline(questionData, onStatus);
    }
    return callAI(questionData);
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

  function getAnkiModelCss() {
    return `.card {
  font-family: 'Segoe UI', system-ui, sans-serif;
  max-width: 640px; margin: 0 auto; padding: 28px;
  line-height: 1.72; color: #e8e8e8; background: #1e1e2e;
}
.frente { font-size: 1.22em; color: #eef2ff; font-weight: 500; }
.frente b { color: #60a5fa; }
.frente mark { background: #fde047; color: #111827; padding: 1px 4px; border-radius: 3px; }
.verso { font-size: 1.02em; color: #d4d4d4; margin-top: 4px; }
.answer-line { font-size: 1.12em; font-weight: 700; color: #f3f4f6; margin: 0 0 10px; }
.answer-line mark { font-weight: 800; }
.explanation { color: #e5e7eb; line-height: 1.75; }
.explanation-block + .explanation-block { margin-top: 10px; }
.verso b { color: #93c5fd; font-weight: 700; }
.verso .neg { color: #fca5a5; font-weight: 800; }
.verso mark { background: rgba(253, 224, 71, 0.28); color: #fde68a; padding: 1px 4px; border-radius: 3px; }
.verso .ref { color: #a5b4fc; font-style: italic; font-size: 0.92em; }
.verso ul { margin: 8px 0 8px 18px; padding: 0; }
.verso li { margin-bottom: 4px; }
.palavras-chave {
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px;
  padding: 8px 10px; background: #23283d; border-left: 3px solid #60a5fa; border-radius: 8px;
}
.palavras-chave .kw {
  background: transparent; color: #c7d2fe; padding: 0;
  border: none; font-size: 0.82em; font-weight: 600; letter-spacing: 0.1px;
}
.contexto { color: #a0a0b8; font-size: 0.82em; margin-bottom: 14px;
  padding-bottom: 10px; border-bottom: 1px solid #3a3a4e; letter-spacing: 0.3px; }
.fonte { color: #787890; font-size: 0.72em; margin-top: 4px; text-align: right; }
.modelo { color: #6b7280; font-size: 0.68em; margin-top: 14px; text-align: right; font-style: italic; }
:root[class*="light"] .modelo { color: #9ca3af; }
.erro { background: #3a3520; color: #ffd866; padding: 10px 14px; border-radius: 8px;
  font-size: 0.85em; margin-top: 14px; border-left: 3px solid #ffd866; }
hr { border: none; border-top: 1px solid #3a3a4e; margin: 18px 0; }
.cloze { font-weight: 800; color: #fbbf24; }
.cloze-hint { color: #fbbf24; font-style: italic; }
/* Modo claro */
.card.night_mode_off, :root[class*="light"] .card {
  color: #1f2937; background: #ffffff;
}
:root[class*="light"] .frente { color: #111827; }
:root[class*="light"] .frente b { color: #1d4ed8; }
:root[class*="light"] .frente mark { background: #fde047; color: #111827; }
:root[class*="light"] .verso { color: #1f2937; }
:root[class*="light"] .answer-line { color: #111827; }
:root[class*="light"] .explanation { color: #111827; }
:root[class*="light"] .verso b { color: #1d4ed8; }
:root[class*="light"] .verso .neg { color: #b42318; }
:root[class*="light"] .verso mark { background: #fde68a; color: #111827; }
:root[class*="light"] .verso .ref { color: #6b7280; }
:root[class*="light"] .palavras-chave { background: #eef2ff; border-left-color: #4f46e5; }
:root[class*="light"] .palavras-chave .kw { color: #4338ca; }
:root[class*="light"] .contexto { color: #6b7280; border-bottom-color: #e5e7eb; }
:root[class*="light"] .fonte { color: #9ca3af; }
:root[class*="light"] .erro { background: #fff3cd; color: #856404; border-left-color: #856404; }
:root[class*="light"] .cloze { color: #b45309; }
:root[class*="light"] .cloze-hint { color: #b45309; }
:root[class*="light"] hr { border-top-color: #dee2e6; }`;
  }

  function getAnkiCardTemplate() {
    return {
      Name: 'Card',
      Front: '<div class="card"><div class="contexto">{{Contexto}}</div><div class="frente">{{Frente}}</div></div>',
      Back: `<div class="card">
<div class="contexto">{{Contexto}}</div>
<div class="frente">{{Frente}}</div>
<hr>
<div class="verso">{{Verso}}</div>
{{#PalavrasChave}}<div class="palavras-chave">{{PalavrasChave}}</div>{{/PalavrasChave}}
{{#ErroIdentificado}}<div class="erro">💡 {{ErroIdentificado}}</div>{{/ErroIdentificado}}
{{#Modelo}}<div class="modelo">🤖 {{Modelo}}</div>{{/Modelo}}
<div class="fonte">{{Fonte}}</div>
</div>`,
    };
  }

  /** Name of the native-Cloze companion note type (derived from the Basic one). */
  function getClozeModelName() {
    return `${getSetting('ankiModelName')} Cloze`;
  }

  /** Native Anki Cloze template: {{cloze:Text}} on both sides + extras on the back. */
  function getAnkiClozeTemplate() {
    return {
      Name: 'Cloze',
      Front: '<div class="card"><div class="contexto">{{Contexto}}</div><div class="frente">{{cloze:Text}}</div></div>',
      Back: `<div class="card">
<div class="contexto">{{Contexto}}</div>
<div class="frente">{{cloze:Text}}</div>
{{#BackExtra}}<hr><div class="verso">{{BackExtra}}</div>{{/BackExtra}}
{{#PalavrasChave}}<div class="palavras-chave">{{PalavrasChave}}</div>{{/PalavrasChave}}
{{#ErroIdentificado}}<div class="erro">💡 {{ErroIdentificado}}</div>{{/ErroIdentificado}}
{{#Modelo}}<div class="modelo">🤖 {{Modelo}}</div>{{/Modelo}}
<div class="fonte">{{Fonte}}</div>
</div>`,
    };
  }

  /** First line of the back (the short answer), used as the native cloze answer. */
  function extractShortAnswer(versoTextoLimpo) {
    return stripHtml(versoTextoLimpo || '')
      .replace(/\r/g, '')
      .split(/\n\s*\n/)[0]
      .split('\n')[0]
      .trim()
      .replace(/[.;:]+$/, '')
      .trim();
  }

  /** Cloze syntax uses :: and {{ }} as delimiters — strip them from the answer (never legitimate there). */
  function sanitizeClozeAnswer(answer) {
    return (answer || '').replace(/::/g, ':').replace(/[{}]/g, '').trim();
  }

  /**
   * The short term that fills the cloze blank. Prefer the answer-line content, fall
   * back to the first line of plain text, and keep ONLY the first sentence/clause —
   * the cloze answer must be a term, never an explanation paragraph.
   */
  function clozeAnswerFromCard(card) {
    const verso = card.verso_html || card.verso || '';
    const al = verso.match(/<div class="answer-line">([\s\S]*?)<\/div>/i);
    let ans = al ? stripHtml(al[1]) : extractShortAnswer(card.verso_texto_limpo || card.verso || '');
    ans = (ans || '').replace(/\s+/g, ' ').trim();
    // Keep only the first sentence/clause (drop anything after ". ", "; " or ": ").
    ans = ans.split(/(?:\.\s|;\s|:\s)/)[0].trim().replace(/[.,;:]+$/, '').trim();
    return ans;
  }

  /** Back Extra for a cloze card: explanation, plus any tail the answer-line carried beyond the answer. */
  function clozeBackExtra(card) {
    const verso = card.verso_html || card.verso || '';
    const expl = verso.match(/<div class="explanation">[\s\S]*$/i);
    if (expl) return expl[0];
    // No explanation block. Keep any detail the answer-line had beyond the first
    // sentence (the cloze answer); otherwise nothing — the reveal shows it in context.
    const al = verso.match(/<div class="answer-line">([\s\S]*?)<\/div>/i);
    if (al) {
      const tail = stripHtml(al[1]).replace(/\s+/g, ' ').trim()
        .split(/(?:\.\s|;\s)/).slice(1).join('. ').trim();
      return tail ? `<div class="explanation">${tail}</div>` : '';
    }
    return verso;
  }

  /**
   * Convert a pseudo-cloze card (statement with {{rotulo}} + separate short answer)
   * into a native Anki cloze field. Returns { text, backExtra } or null when it
   * can't / shouldn't (no placeholder, no answer, or a malformed/leaky answer) —
   * caller then falls back to the Basic type and flags the card for review.
   */
  function buildClozeFields(card) {
    const frente = card.frente_html || card.frente || '';
    if (!/\{\{[^}]+\}\}/.test(frente)) return null;
    const answer = sanitizeClozeAnswer(clozeAnswerFromCard(card));
    if (!answer) return null;

    // ── Travas anti-contaminação ──
    // 1. A resposta tem que ser um TERMO CURTO. Se vier longa (explicação inteira),
    //    não gera cloze (cai no Básico) para nunca produzir um card embaralhado.
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    if (answer.length > 80 || wordCount > 12) return null;
    // 2. Vazamento: se a frente (fora da lacuna) já contém a resposta, o cloze
    //    estaria estragado (resposta visível na frente). Não gera.
    if (answer.length >= 6) {
      const frenteSemLacuna = stripHtml(frente.replace(/\{\{[^}]+\}\}/g, ' ')).toLowerCase();
      if (frenteSemLacuna.includes(answer.toLowerCase())) return null;
    }

    let n = 0;
    const text = frente.replace(/\{\{([^}]+)\}\}/g, (_, label) => {
      n++;
      const clean = (label || '').replace(/<[^>]+>/g, '').trim() || 'lacuna';
      // First blank becomes the native cloze (answer revealed in context on the back).
      if (n === 1) return `{{c1::${answer}::${clean}}}`;
      // Extra blanks (should be rare — prompt enforces 1/card): show as a plain hint, no extra card.
      return `<span class="cloze-hint">[${clean}]</span>`;
    });

    // Drop a <mark> wrapping the cloze itself — the native .cloze styling already highlights it
    // (and yellow <mark> bg + gold cloze text would clash).
    const cleanText = text.replace(/<mark>\s*(\{\{c1::[\s\S]*?\}\})\s*<\/mark>/g, '$1');

    return { text: cleanText, backExtra: clozeBackExtra(card) };
  }

  /** Ensure the native-Cloze note type exists (create or refresh template/css). */
  async function ensureAnkiClozeModel() {
    const modelName = getClozeModelName();
    const models = await ankiInvoke('modelNames');
    const tpl = getAnkiClozeTemplate();
    const css = getAnkiModelCss();
    if (models.includes(modelName)) {
      try {
        await ankiInvoke('updateModelStyling', { model: { name: modelName, css } });
        await ankiInvoke('updateModelTemplates', {
          model: { name: modelName, templates: { [tpl.Name]: { Front: tpl.Front, Back: tpl.Back } } },
        });
      } catch (e) { console.warn('[TEC→Anki] Não foi possível atualizar o modelo Cloze:', e); }
      return;
    }
    await ankiInvoke('createModel', {
      modelName,
      inOrderFields: ['Text', 'BackExtra', 'PalavrasChave', 'Contexto', 'Fonte', 'ErroIdentificado', 'Modelo'],
      css,
      isCloze: true,
      cardTemplates: [tpl],
    });
    console.log(`[TEC→Anki] Note type Cloze nativo criado: ${modelName}`);
  }

  async function ensureAnkiModel() {
    const modelName = getSetting('ankiModelName');
    const models = await ankiInvoke('modelNames');
    const cardTemplate = getAnkiCardTemplate();
    const modelCss = getAnkiModelCss();
    if (models.includes(modelName)) {
      // Migrate: add PalavrasChave field if missing
      try {
        const fields = await ankiInvoke('modelFieldNames', { modelName });
        if (!fields.includes('PalavrasChave')) {
          await ankiInvoke('modelFieldAdd', { modelName, fieldName: 'PalavrasChave', index: 2 });
          console.log('[TEC\u2192Anki] Campo PalavrasChave adicionado ao modelo existente');
        }
        if (!fields.includes('Modelo')) {
          await ankiInvoke('modelFieldAdd', { modelName, fieldName: 'Modelo', index: 6 });
          console.log('[TEC\u2192Anki] Campo Modelo adicionado ao modelo existente');
        }
        await ankiInvoke('updateModelStyling', { model: { name: modelName, css: modelCss } });
        await ankiInvoke('updateModelTemplates', {
          model: {
            name: modelName,
            templates: {
              [cardTemplate.Name]: { Front: cardTemplate.Front, Back: cardTemplate.Back },
            },
          },
        });
      } catch (e) { console.warn('[TEC→Anki] Não foi possível migrar o modelo existente:', e); }
      return;
    }

    await ankiInvoke('createModel', {
      modelName,
      inOrderFields: ['Frente', 'Verso', 'PalavrasChave', 'Contexto', 'Fonte', 'ErroIdentificado', 'Modelo'],
      css: modelCss,
      cardTemplates: [cardTemplate],
    });
  }

  async function ensureAnkiDeck(deckName) {
    await ankiInvoke('createDeck', { deck: deckName });
    await ensureTecDeckPreset(deckName);
  }

  /**
   * Preset dedicado "TEC Erros" para os decks de erro (em vez de herdarem o
   * preset global): retenção-alvo maior (cards nascidos de erro real merecem
   * mais reviews), intervalo máximo no horizonte da prova e leech agressivo
   * (card que apanha 4x é problema de DESIGN — suspende para reformular).
   * Best-effort: falha silenciosa se a versão do Anki não suportar.
   */
  async function ensureTecDeckPreset(deckName) {
    try {
      let configId = parseInt(GM_getValue('tecDeckConfigId', 0), 10) || 0;
      const isNew = !configId;
      if (isNew) {
        configId = await ankiInvoke('cloneDeckConfigId', { name: 'TEC Erros', cloneFrom: 1 });
        if (!configId) return;
        GM_setValue('tecDeckConfigId', configId);
      }
      await ankiInvoke('setDeckConfigId', { decks: [deckName], configId });
      if (isNew) {
        const cfg = await ankiInvoke('getDeckConfig', { deck: deckName });
        if (cfg && cfg.id === configId) {
          cfg.desiredRetention = 0.92;           // FSRS: retenção-alvo acima do padrão 0.90
          if (cfg.rev) { cfg.rev.maxIvl = 180; cfg.rev.bury = true; }  // horizonte da prova + bury de irmãos
          if (cfg.new) cfg.new.bury = true;
          if (cfg.lapse) { cfg.lapse.leechFails = 4; cfg.lapse.leechAction = 0; } // 0 = suspender
          await ankiInvoke('saveDeckConfig', { config: cfg });
          console.log('[TEC→Anki] Preset "TEC Erros" criado (retenção 0.92, maxIvl 180, leech 4→suspender)');
        }
      }
    } catch (e) {
      console.warn('[TEC→Anki] Não foi possível aplicar o preset TEC Erros:', e.message || e);
    }
  }

  /**
   * Errou no TEC uma questão que JÁ tem cards no Anki: o TEC funciona como
   * sensor de esquecimento — os cards antigos ganham tag reincidente::N e
   * voltam para a revisão de HOJE. setDueDate sem "!" preserva o intervalo
   * (fica registrado como reagendamento manual, não corrompe o FSRS).
   */
  async function rescheduleRecurringCards(questionData) {
    const query = `"Fonte:Q#${questionData.id} *"`;
    const noteIds = await ankiInvoke('findNotes', { query });
    if (!Array.isArray(noteIds) || noteIds.length === 0) return;
    const n = (typeof questionData.vezesErradoTec === 'number' && questionData.vezesErradoTec > 0)
      ? questionData.vezesErradoTec : 2;
    await ankiInvoke('addTags', { notes: noteIds, tags: `reincidente::${n}` });
    const cardIds = await ankiInvoke('findCards', { query });
    if (Array.isArray(cardIds) && cardIds.length) {
      await ankiInvoke('setDueDate', { cards: cardIds, days: '0' });
      console.log(`⏰ Reincidência: ${cardIds.length} card(s) da Q#${questionData.id} voltaram para hoje (tag reincidente::${n})`);
      showToast(`⏰ Erro repetido na Q#${questionData.id} — ${cardIds.length} card(s) antigos voltaram para a revisão de hoje.`, 'warning', 5000);
    }
  }

  /**
   * Count Anki notes already created for this question (matches the Fonte field).
   * Returns 0 on any failure — duplicate detection is best-effort.
   */
  async function countExistingAnkiCards(questionId) {
    if (!questionId) return 0;
    try {
      const ids = await ankiInvoke('findNotes', { query: `"Fonte:Q#${questionId} *"` });
      return Array.isArray(ids) ? ids.length : 0;
    } catch { return 0; }
  }

  async function addCardsToAnki(aiResult, questionData) {
    const prefix = getSetting('ankiDeckPrefix');
    const modelName = getSetting('ankiModelName');
    const materia = questionData.materia || aiResult.materia || 'Geral';
    const subtopico = questionData.assunto || aiResult.subtopico || '';
    const deckName = subtopico
      ? `${prefix}::${sanitizePath(materia)}::${sanitizePath(subtopico)}`
      : `${prefix}::${sanitizePath(materia)}`;

    // Reincidência: precisa rodar ANTES do addNotes (só os cards antigos voltam p/ hoje)
    if (questionData.errou && questionData.id) {
      await rescheduleRecurringCards(questionData).catch(e => console.warn('[TEC→Anki] Reincidência falhou:', e.message || e));
    }

    const clozeModelName = getClozeModelName();
    await ensureAnkiModel();

    // Decide per card whether it becomes a native cloze; build payloads up front
    // so we only ensure the Cloze note type when it's actually used.
    const cardsToInsert = aiResult.cards.map(card => {
      // Detect cloze by the actual {{...}} placeholder, NOT card.tipo (the dual
      // pipeline never sets tipo). buildClozeFields returns null when there's no
      // placeholder, or when the answer is malformed/leaky (trava) → Basic fallback.
      const cloze = buildClozeFields(card);
      const looksCloze = /\{\{[^}]+\}\}/.test(card.frente_html || card.frente || '');
      if (looksCloze && !cloze) {
        card._needsReview = true;
        card._rejectReason = card._rejectReason || 'Cloze malformado (resposta longa ou vazada) — salvo como Básico para revisão';
        // No Básico o {{rotulo}} apareceria literal (Anki não processa cloze em
        // campos de nota comum) — vira uma lacuna legível: [rotulo].
        const toHint = (s) => (s || '')
          .replace(/<mark>\s*\{\{([^}]+)\}\}\s*<\/mark>/g, '<span class="cloze-hint">[$1]</span>')
          .replace(/\{\{([^}]+)\}\}/g, '<span class="cloze-hint">[$1]</span>');
        card.frente_html = toHint(card.frente_html || card.frente);
        card.frente = card.frente_html;
      }
      return { card, cloze };
    });
    if (cardsToInsert.some(c => c.cloze)) await ensureAnkiClozeModel();
    await ensureAnkiDeck(deckName);

    const tags = [
      'tec',
      slugify(questionData.banca || 'sem-banca'),
      questionData.ano || '',
      slugify(materia),
      questionData.errou ? 'erro' : 'acerto',
      `criado::${todayISO()}`, // data de criação do card (tag hierárquica)
    ].filter(Boolean);

    const fonte = questionData.id
      ? `Q#${questionData.id} | ${questionData.banca} ${questionData.ano} | ${questionData.cargo}`
      : questionData.url;
    const contexto = `${materia}${subtopico ? ' \u203A ' + subtopico : ''}`;

    const modeloStr = (() => {
      if (aiResult._creatorModel) {
        const creator = aiResult._creatorModel.split('/').pop();
        const auditor = (aiResult._auditorModel || '').split('/').pop();
        return auditor ? `${creator} → ${auditor}` : creator;
      }
      return (aiResult._generatorModel || '').split('/').pop();
    })();
    const palavrasChaveHtml = (card) => (card.palavras_chave || '')
      .split(/\s*\|\s*/).filter(Boolean).map(kw => `<span class="kw">${kw.trim()}</span>`).join(' ');

    const notes = cardsToInsert.map(({ card, cloze }) => {
      const cardTags = [...tags];
      if (card._needsReview) cardTags.push('revisar');
      if (getSetting('pipelineMode') === 'dual') cardTags.push('dual-pipeline');
      if (cloze) cardTags.push('cloze-nativo');
      if ((card.tipo || '').toLowerCase() === 'julgue') cardTags.push('julgue');
      const common = {
        PalavrasChave: palavrasChaveHtml(card),
        Contexto: contexto,
        Fonte: fonte,
        ErroIdentificado: aiResult.erro_identificado || '',
        Modelo: modeloStr,
      };
      if (cloze) {
        return {
          deckName,
          modelName: clozeModelName,
          fields: { Text: cloze.text, BackExtra: cloze.backExtra, ...common },
          tags: cardTags,
          options: { allowDuplicate: false, duplicateScope: 'deck' },
        };
      }
      return {
        deckName,
        modelName,
        fields: { Frente: card.frente_html || card.frente, Verso: card.verso_html || card.verso, ...common },
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

  /**
   * Consulta uma nota existente no Obsidian via REST API.
   * Retorna { exists: boolean, vezes_errado: number }.
   */
  async function getExistingNoteData(filePath) {
    const port = getSetting('obsidianPort');
    const token = getSetting('obsidianToken');
    if (!token) return { ok: false, exists: false, vezes_errado: 0 };

    try {
      const res = await gmFetch(`http://127.0.0.1:${port}/vault/${encodeURIComponent(filePath)}.md`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });

      // 404 = leitura OK, nota inexistente. Outros erros = falha de leitura.
      if (res.status === 404) return { ok: true, exists: false, vezes_errado: 0 };
      if (!res.ok) return { ok: false, exists: false, vezes_errado: 0 };

      const content = await res.text();
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) return { ok: true, exists: true, vezes_errado: 0 };

      const yaml = fmMatch[1];
      const vezesMatch = yaml.match(/vezes_errado:\s*(\d+)/);
      const vezes_errado = vezesMatch ? parseInt(vezesMatch[1], 10) : 0;

      return { ok: true, exists: true, vezes_errado: Math.max(0, vezes_errado) };
    } catch {
      return { ok: false, exists: false, vezes_errado: 0 };
    }
  }

  /**
   * Monta o array de tags do Obsidian incluindo tags de erro recorrente.
   * finalCount = total acumulado de erros (histórico), não só a tentativa atual.
   */
  function buildObsidianTags(questionData, finalCount) {
    const tags = [
      'tec',
      slugify(questionData.materia || 'geral'),
      slugify(questionData.banca || 'sem-banca'),
      questionData.errou ? 'erro' : 'acerto',
    ];

    if (finalCount >= 2) tags.push('erro-recorrente');
    if (finalCount >= 3) tags.push('erro-cronico');
    if (finalCount >= 5) tags.push('erro-critico');

    return tags.filter(Boolean);
  }

  function buildObsidianNote(questionData, aiResult, finalCount = 0) {
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

    const tags = buildObsidianTags(questionData, finalCount);
    const tagsYaml = tags.map(t => `"${t}"`).join(', ');

    const recorrenciaBadge = finalCount >= 2
      ? `\n> \u26A0\uFE0F **Erro recorrente:** voc\u00EA j\u00E1 errou esta quest\u00E3o ${finalCount}x\n`
      : '';

    return `---
id: "${id}"
materia: "${materia}"
subtopico: "${subtopico}"
banca: "${banca}"
ano: ${ano || '""'}
cargo: "${cargo}"
tags: [${tagsYaml}]
resultado: "${questionData.errou ? 'erro' : 'acerto'}"
vezes_errado: ${finalCount}
data: ${todayISO()}
link: "${questionData.url}"
---
# Q${id} \u2014 ${subtopico || materia}
> **Banca:** ${banca} | **Ano:** ${ano} | **Cargo:** ${cargo}
> **Mat\u00E9ria:** [[${materia}]] | **Assunto:** ${subtopico}
> [\uD83D\uDD17 Ver no TEC](${questionData.url})
${recorrenciaBadge}

## Enunciado
${questionData.enunciado || '_N\u00E3o extra\u00EDdo_'}

## Alternativas
${altsMarkdown || '_N\u00E3o extra\u00EDdas_'}

## Resultado
- **Sua resposta:** ${questionData.respostaAluno || 'N/A'} ${questionData.errou ? '\u274C' : '\u2705'}
- **Gabarito:** ${questionData.gabarito || 'N/A'} \u2705

${questionData.pensamentoAluno ? `## \uD83D\uDCAD Meu Racioc\u00EDnio
${cleanText(questionData.pensamentoAluno)}

` : ''}## Coment\u00E1rio do Professor
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

    // ── Contagem de erros: TEC é a fonte de verdade, com PISO ──
    // Prioridade 1: histórico real de resoluções do TEC (idempotente — reprocessar
    // não duplica). Mas o histórico pode vir DEFASADO (sem a tentativa atual) ou
    // PARCIAL (painel paginado), então nunca aceito abaixo do acumulado já gravado
    // na nota nem abaixo do erro atual.
    // Prioridade 2 (fallback): incremento local sobre a nota existente.
    let finalCount;
    const tecErros = questionData.vezesErradoTec;
    let existing = { ok: false, exists: false, vezes_errado: 0 };
    if (method === 'rest' && questionData.id) {
      existing = await getExistingNoteData(filePath);
      if (!existing.ok) {
        console.warn('⚠️ Não foi possível ler a nota existente — vezes_errado pode ficar impreciso nesta run.');
      }
    }
    const pisoAtual = questionData.errou ? 1 : 0;
    if (typeof tecErros === 'number') {
      finalCount = Math.max(tecErros, existing.ok ? existing.vezes_errado : 0, pisoAtual);
      console.log(`🎯 vezes_errado: TEC=${tecErros}, nota=${existing.ok ? existing.vezes_errado : '?'} → ${finalCount}`);
    } else {
      finalCount = existing.vezes_errado + pisoAtual;
      console.log(`↩️ vezes_errado por incremento local (TEC indisponível): ${existing.vezes_errado} → ${finalCount}`);
    }

    const content = buildObsidianNote(questionData, aiResult, finalCount);

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

  /**
   * Asks the user to describe their reasoning during the question, BEFORE the AI runs.
   * Resolves to: string (reasoning, possibly empty when skipped) or null (cancel everything).
   */
  function showThoughtsModal(questionData, existingCards = 0) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';

      const dupWarning = existingCards > 0
        ? `<div class="tec-dup-badge" style="margin-bottom:12px;">⚠️ Você já gerou ${existingCards} card(s) desta questão no Anki — duplicatas serão bloqueadas, mas cards parecidos podem passar.</div>`
        : '';

      overlay.innerHTML = `
        <div class="tec-modal" style="width:560px;">
          <div class="tec-modal-header">
            <h2>💭 Qual foi seu raciocínio? <span style="font-weight:400;font-size:13px;color:#888;">Questão #${questionData.id || '?'}</span></h2>
            <button class="tec-modal-close" data-action="cancel">×</button>
          </div>
          <div class="tec-modal-body">
            ${dupWarning}
            <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.5;">
              Descreva o que você pensou ao responder: em que você ficou em dúvida, o que confundiu, por que marcou ${questionData.respostaAluno || 'sua resposta'}.
              A IA usa isso para entender <b>o que</b> você errou e mirar o card na sua dúvida real. A correção do conteúdo vem sempre do gabarito e do comentário do professor.
            </p>
            <textarea class="tec-thoughts-textarea" id="tec-thoughts-input"
              placeholder="Ex: achei que a anterioridade também valia para alteração de prazo de pagamento... fiquei entre A e C e chutei.">${(questionData.pensamentoAluno || getStoredThought(questionData.id) || '').replace(/</g, '&lt;')}</textarea>
            <div style="margin-top:6px;font-size:11px;color:#999;">Ctrl+Enter gera os cards · Esc pula</div>
          </div>
          <div class="tec-modal-footer">
            <button class="tec-btn tec-btn-cancel" data-action="skip">⏭️ Pular</button>
            <button class="tec-btn tec-btn-save" data-action="generate">🤖 Gerar cards</button>
          </div>
        </div>
      `;

      const textarea = overlay.querySelector('#tec-thoughts-input');
      const finish = (value) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(value); };
      const submit = () => finish(textarea.value.trim());

      function onKey(e) {
        if (!document.body.contains(overlay)) { document.removeEventListener('keydown', onKey, true); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(''); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); submit(); }
      }
      document.addEventListener('keydown', onKey, true);

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action === 'cancel' || e.target === overlay) finish(null);
        else if (action === 'skip') finish('');
        else if (action === 'generate') submit();
      });

      document.body.appendChild(overlay);
      setTimeout(() => textarea.focus(), 50);
    });
  }

  function showPreviewModal(questionData, aiResult) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';

      const materia = questionData.materia || aiResult?.materia || '';
      const subtopico = questionData.assunto || aiResult?.subtopico || '';

      const cardItemHTML = (c, i) => `
        <div class="tec-card-preview" data-card-idx="${i}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div class="card-num">Card ${i + 1}</div>
            <button data-action="del-card" data-idx="${i}" title="Excluir este card" style="background:none;border:none;color:#ef476f;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:6px;line-height:1;">\uD83D\uDDD1\uFE0F</button>
          </div>
          <div class="card-front">\uD83D\uDD39 ${c.frente}</div>
          <div class="card-back">\uD83D\uDCA1 ${c.verso}</div>
          ${c.palavras_chave ? `<div class="card-kw" style="font-size:11px;color:#c4b5fd;margin-top:4px">\uD83D\uDD11 ${c.palavras_chave}</div>` : ''}
        </div>
      `;
      const renderCardsList = () => (aiResult?.cards?.length)
        ? aiResult.cards.map(cardItemHTML).join('')
        : '<div class="content"><em>Nenhum card \u2014 todos exclu\u00EDdos. Voc\u00EA ainda pode salvar (s\u00F3 a nota no Obsidian) ou cancelar.</em></div>';

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
              <h3>\uD83D\uDCDD Flashcards Gerados (<span id="tec-preview-cards-count">${aiResult?.cards?.length || 0}</span>)</h3>
              <div id="tec-preview-cards-list">${renderCardsList()}</div>
            </div>

            <div class="tec-section">
              <h3>\uD83D\uDCAD Meu Racioc\u00EDnio</h3>
              <textarea class="tec-thoughts-textarea" id="tec-preview-thoughts" style="min-height:60px;"
                placeholder="O card n\u00E3o captou sua d\u00FAvida real? Descreva (ou ajuste) seu racioc\u00EDnio e clique em Regenerar.">${(questionData.pensamentoAluno || '').replace(/</g, '&lt;')}</textarea>
              <button class="tec-btn" data-action="regen" style="margin-top:8px;background:#fff3cd;color:#856404;border:1px solid #ffd166;">\uD83D\uDD04 Regenerar cards com meu racioc\u00EDnio</button>
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

      const finish = (action) => {
        const pensamento = overlay.querySelector('#tec-preview-thoughts')?.value.trim() || '';
        overlay.remove();
        resolve({ action, pensamento });
      };

      overlay.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-action]');
        const action = trigger?.dataset.action;
        if (action === 'del-card') {
          const idx = parseInt(trigger.dataset.idx, 10);
          if (!isNaN(idx) && aiResult?.cards) {
            aiResult.cards.splice(idx, 1);
            const list = overlay.querySelector('#tec-preview-cards-list');
            const count = overlay.querySelector('#tec-preview-cards-count');
            if (list) list.innerHTML = renderCardsList();
            if (count) count.textContent = aiResult.cards.length;
          }
          return;
        }
        if (action === 'close' || action === 'cancel') finish('cancel');
        else if (action === 'save') finish('save');
        else if (action === 'regen') finish('regen');
        else if (e.target === overlay) finish('cancel');
      });

      document.body.appendChild(overlay);
    });
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                 10. SETTINGS PANEL                           \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  /**
   * Lets the user pick which wrong questions deserve cards before the AI runs.
   * Questions that already have Anki cards come deselected by default.
   * Each item has an optional "raciocínio" textarea fed into the AI prompt.
   * @param {Array<{questionData: object, existingCards: number}>} items
   * @returns {Promise<object[]|null>} selected questionData array, or null on cancel
   */
  function showBatchSelectionModal(items) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';
      overlay.style.zIndex = '100002';

      const itemsHTML = items.map((item, idx) => {
        const q = item.questionData;
        const isDup = item.existingCards > 0;
        const snippet = (q.enunciado || '').substring(0, 160);
        return `
          <div class="tec-batch-select-item ${isDup ? 'deselected' : 'selected'}" data-idx="${idx}">
            <div class="item-header">
              <input type="checkbox" data-idx="${idx}" ${isDup ? '' : 'checked'}>
              <div style="flex:1;min-width:0;">
                <div class="item-title">#${q.id || '?'} — ${q.materia || '-'} › ${q.assunto || '-'}
                  ${isDup ? `<span class="tec-dup-badge" style="margin-left:6px;padding:2px 8px;font-size:11px;">já tem ${item.existingCards} card(s)</span>` : ''}
                </div>
                <div class="item-meta">${q.banca || '-'} ${q.ano || ''} | Você marcou: <b>${q.respostaAluno || '?'}</b> → Gabarito: <b>${q.gabarito || '?'}</b></div>
                <div class="item-snippet">${snippet}${(q.enunciado || '').length > 160 ? '…' : ''}</div>
              </div>
            </div>
            <div class="item-thoughts">
              <textarea data-idx="${idx}" placeholder="💭 Seu raciocínio nesta questão (opcional — a IA usa para entender o que você errou e mirar o card)">${(q.pensamentoAluno || '').replace(/</g, '&lt;')}</textarea>
            </div>
          </div>
        `;
      }).join('');

      overlay.innerHTML = `
        <div class="tec-modal" style="width:760px;max-width:96vw;">
          <div class="tec-modal-header">
            <h2>🗂️ ${items.length} erradas encontradas — quais viram cards?</h2>
            <button class="tec-modal-close" data-action="cancel">×</button>
          </div>
          <div class="tec-modal-body" style="max-height:65vh;overflow-y:auto;">
            <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
              <button class="tec-btn tec-btn-cancel" data-action="all" style="padding:6px 14px;font-size:12px;">✅ Marcar todas</button>
              <button class="tec-btn tec-btn-cancel" data-action="none" style="padding:6px 14px;font-size:12px;">⬜ Desmarcar todas</button>
              <span style="font-size:12px;color:#888;">Desmarque o que você errou por besteira — não vira card.</span>
            </div>
            ${itemsHTML}
          </div>
          <div class="tec-modal-footer">
            <button class="tec-btn tec-btn-cancel" data-action="cancel">Cancelar</button>
            <button class="tec-btn tec-btn-save" data-action="generate">🤖 Gerar cards (<span id="tec-batch-sel-count">0</span>)</button>
          </div>
        </div>
      `;

      const checkboxes = [...overlay.querySelectorAll('input[type="checkbox"]')];
      const countEl = overlay.querySelector('#tec-batch-sel-count');
      const updateCount = () => {
        const n = checkboxes.filter(cb => cb.checked).length;
        countEl.textContent = n;
        checkboxes.forEach(cb => {
          const itemEl = overlay.querySelector(`.tec-batch-select-item[data-idx="${cb.dataset.idx}"]`);
          if (itemEl) itemEl.className = `tec-batch-select-item ${cb.checked ? 'selected' : 'deselected'}`;
        });
      };
      updateCount();

      const finish = (value) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(value); };
      const collectSelected = () => items
        .map((item, idx) => ({ item, idx }))
        .filter(({ idx }) => checkboxes[idx].checked)
        .map(({ item, idx }) => {
          const thoughts = overlay.querySelector(`textarea[data-idx="${idx}"]`)?.value.trim();
          if (thoughts) {
            item.questionData.pensamentoAluno = thoughts;
            setStoredThought(item.questionData.id, thoughts);
          }
          return item.questionData;
        });

      function onKey(e) {
        if (!document.body.contains(overlay)) { document.removeEventListener('keydown', onKey, true); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
      }
      document.addEventListener('keydown', onKey, true);

      overlay.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') updateCount();
      });

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action === 'cancel' || e.target === overlay) { finish(null); return; }
        if (action === 'all') { checkboxes.forEach(cb => cb.checked = true); updateCount(); return; }
        if (action === 'none') { checkboxes.forEach(cb => cb.checked = false); updateCount(); return; }
        if (action === 'generate') { finish(collectSelected()); return; }
        // Clicking the item header (outside checkbox/textarea) toggles selection
        const header = e.target.closest('.item-header');
        if (header && e.target.type !== 'checkbox') {
          const cb = header.querySelector('input[type="checkbox"]');
          cb.checked = !cb.checked;
          updateCount();
        }
      });

      document.body.appendChild(overlay);
    });
  }

  /**
   * Shows a consolidated preview of ALL cards generated during a batch run.
   * @param {Array<{questionData: object, aiResult: object}>} results
   */
  function showBatchPreviewModal(results, errors = []) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';
      overlay.style.zIndex = '100002'; // above toasts

      const totalCards = results.reduce((sum, r) => sum + (r.aiResult?.cards?.length || 0), 0);
      const errorCount = errors.length;

      const errorsHTML = errorCount > 0 ? `
        <div style="background:#fff3f3;border:1px solid #ef476f;border-radius:10px;margin-bottom:16px;overflow:hidden;">
          <div style="background:#ef476f;padding:10px 14px;font-weight:700;font-size:13px;color:#fff;display:flex;justify-content:space-between;align-items:center;">
            <span>⚠️ ${errorCount} questão(ões) com erro</span>
          </div>
          <div style="padding:12px;">
            ${errors.map(e => `
              <div style="font-size:12px;color:#c00;padding:4px 0;border-bottom:1px dashed #ffcdd2;">
                <strong>Questão #${e.id}</strong> ${e.num !== '?' ? `(nº ${e.num})` : ''} — ${e.error}
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      const groupsHTML = results.map((r, idx) => {
        const q = r.questionData;
        const ai = r.aiResult;
        const cardsHTML = (ai?.cards || []).map((c, i) => `
          <div class="tec-card-preview" style="margin-bottom:8px;">
            <div class="card-num">Card ${i + 1}</div>
            <div class="card-front">🔹 ${c.frente}</div>
            <div class="card-back">💡 ${c.verso}</div>
            ${c.palavras_chave ? `<div class="card-kw" style="font-size:11px;color:#c4b5fd;margin-top:4px">🔑 ${c.palavras_chave}</div>` : ''}
          </div>
        `).join('');

        return `
          <div style="border:1px solid #e9ecef;border-radius:10px;margin-bottom:16px;overflow:hidden;">
            <div style="background:#f8f9fa;padding:10px 14px;font-weight:700;font-size:13px;color:#4361ee;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;">
              <span>📋 Questão #${q.id || '?'} — ${q.materia || '-'} › ${q.assunto || '-'}</span>
              <span style="font-size:11px;color:#888;font-weight:500;">${ai?.cards?.length || 0} card(s)</span>
            </div>
            <div style="padding:12px;">
              ${cardsHTML || '<div style="font-size:13px;color:#888;padding:8px;"><em>Nenhum card gerado</em></div>'}
            </div>
          </div>
        `;
      }).join('');

      overlay.innerHTML = `
        <div class="tec-modal" style="width:760px;max-width:96vw;">
          <div class="tec-modal-header">
            <h2>🗂️ Cards do Batch — ${results.length} questões | ${totalCards} cards${errorCount > 0 ? ` | ❌ ${errorCount} erro(s)` : ''}</h2>
            <button class="tec-modal-close" data-action="close">×</button>
          </div>
          <div class="tec-modal-body" style="max-height:70vh;overflow-y:auto;">
            ${errorsHTML}
            ${groupsHTML || (errorCount === 0 ? '<div style="text-align:center;padding:24px;color:#888;"><em>Nenhum resultado para exibir</em></div>' : '')}
          </div>
          <div class="tec-modal-footer">
            <button class="tec-btn tec-btn-save" data-action="ok">✅ OK — Fechar</button>
          </div>
        </div>
      `;

      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (action === 'close' || action === 'ok') { overlay.remove(); resolve(); }
        if (e.target === overlay) { overlay.remove(); resolve(); }
      });

      document.body.appendChild(overlay);
    });
  }

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
              <option value="opencode" ${getSetting('aiProvider') === 'opencode' ? 'selected' : ''}>OpenCode Go</option>
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
                <option value="gemini-3.1-pro-preview" ${getSetting('geminiModel') === 'gemini-3.1-pro-preview' ? 'selected' : ''}>gemini-3.1-pro-preview \u2B50 (mais avan\u00E7ado)</option>
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

          <div id="tec-cfg-opencode-section" style="display:none">
            <div class="tec-field">
              <label>OpenCode API Key</label>
              <input type="password" id="tec-cfg-opencode-key" value="${getSetting('opencodeApiKey')}" placeholder="...">
              <small style="color:#888;font-size:11px">Obtenha em <a href="https://opencode.co" target="_blank" style="color:#60cdff">opencode.co</a></small>
            </div>
            <div class="tec-field">
              <label>Modelo OpenCode</label>
              <select id="tec-cfg-opencode-model">
                ${OPENCODE_MODELS.map(m => '<option value="' + m.id + '"' + (getSetting('opencodeModel') === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('')}
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
            <small style="color:#888;font-size:11px">Dual requer OpenRouter ou OpenCode API key. Custo ~1.2\u00A2/quest\u00E3o.</small>
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
            <label class="tec-toggle"><input type="checkbox" id="tec-cfg-ask-thoughts" ${getSetting('askThoughts') ? 'checked' : ''}> Perguntar meu raciocínio antes de gerar cards</label>
          </div>
          <div class="tec-field">
            <label>Máximo de cards por questão</label>
            <select id="tec-cfg-max-cards">
              ${[1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (parseInt(getSetting('maxCardsPerQuestion'), 10) === n ? ' selected' : '') + '>' + n + (n === 1 ? ' card' : ' cards') + (n === 2 ? ' (padrão)' : '') + '</option>').join('')}
            </select>
            <small style="color:#888;font-size:11px">A IA gera até esse número — menos se o erro for simples (Wozniak).</small>
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
    const opencodeSection = overlay.querySelector('#tec-cfg-opencode-section');
    function toggleProviderSections() {
      const val = providerSelect.value;
      geminiSection.style.display = val === 'gemini' ? '' : 'none';
      openrouterSection.style.display = val === 'openrouter' ? '' : 'none';
      opencodeSection.style.display = val === 'opencode' ? '' : 'none';
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
        setSetting('opencodeApiKey', overlay.querySelector('#tec-cfg-opencode-key').value);
        setSetting('opencodeModel', overlay.querySelector('#tec-cfg-opencode-model').value);
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
        setSetting('askThoughts', overlay.querySelector('#tec-cfg-ask-thoughts').checked);
        setSetting('maxCardsPerQuestion', parseInt(overlay.querySelector('#tec-cfg-max-cards').value, 10) || 2);
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
      <button class="tec-btn-icon" id="tec-btn-thought" title="Anotar/editar meu racioc\u00EDnio nesta quest\u00E3o">\uD83D\uDCAD</button>
      <button class="tec-btn-icon" id="tec-btn-settings" title="Configura\u00E7\u00F5es">\u2699\uFE0F</button>
      <div class="tec-status-dot" id="tec-status-dot" title="Status das conex\u00F5es"></div>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('tec-btn-save').addEventListener('click', () => processCurrentQuestion());
    document.getElementById('tec-btn-batch').addEventListener('click', () => processBatchQuestions());
    document.getElementById('tec-btn-thought').addEventListener('click', () => openThoughtForCurrentQuestion());
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
      // Step 0+1: Expand professor comment if hidden, then extract
      loadingToast = showLoadingToast('\uD83D\uDCAC Expandindo coment\u00E1rio do professor...');
      await ensureCommentExpanded();

      // Sometimes the comment loads lazily after a click/keypress — give it time
      if (!_capturedComment || _capturedComment.length < 50) {
        await delay(1500);
        await ensureCommentExpanded();
      }
      loadingToast.remove();

      loadingToast = showLoadingToast('\uD83D\uDD0D Extraindo dados da quest\u00E3o...');
      const questionData = extractQuestionData();

      if (!questionData.enunciado && !questionData.id) {
        throw new Error('N\u00E3o foi poss\u00EDvel extrair a quest\u00E3o. Verifique se voc\u00EA est\u00E1 na p\u00E1gina de uma quest\u00E3o respondida.');
      }

      loadingToast.remove();
      loadingToast = null;

      // Reuse any reasoning already captured for this question (quick-thought box)
      const preThought = getStoredThought(questionData.id);
      if (preThought) questionData.pensamentoAluno = preThought;

      // Step 1.5: Ask for the user's reasoning (the REAL reason behind the error)
      if (getSetting('askThoughts')) {
        const existingCards = await countExistingAnkiCards(questionData.id);
        const pensamento = await showThoughtsModal(questionData, existingCards);
        if (pensamento === null) {
          showToast('Cancelado pelo usu\u00E1rio.', 'info');
          return;
        }
        if (pensamento) {
          questionData.pensamentoAluno = pensamento;
          setStoredThought(questionData.id, pensamento);
        }
      }

      // Step 2+3: Generate flashcards with AI + preview, looping when the user
      // edits their reasoning and asks to regenerate
      let aiResult = null;
      let regenerate = true;
      while (regenerate) {
        regenerate = false;
        loadingToast = showLoadingToast('\uD83E\uDD16 Gerando flashcards com IA...');
        try {
          aiResult = await generateCards(questionData, (statusMsg) => {
            if (loadingToast) loadingToast.remove();
            loadingToast = showLoadingToast(statusMsg);
          });
        } catch (err) {
          console.error('AI error:', err);
          showToast(`Erro na IA: ${err.message}. Salvando sem flashcards.`, 'warning', 6000);
          aiResult = { materia: questionData.materia, subtopico: questionData.assunto, erro_identificado: '', cards: [] };
        }

        loadingToast.remove();
        loadingToast = null;

        if (getSetting('showPreview')) {
          const decision = await showPreviewModal(questionData, aiResult);
          if (decision.action === 'cancel') {
            showToast('Cancelado pelo usu\u00E1rio.', 'info');
            return;
          }
          if (decision.action === 'regen') {
            if (decision.pensamento) {
              questionData.pensamentoAluno = decision.pensamento;
            } else {
              delete questionData.pensamentoAluno;
            }
            setStoredThought(questionData.id, decision.pensamento);
            regenerate = true;
          } else if (decision.pensamento && decision.pensamento !== questionData.pensamentoAluno) {
            // User edited the reasoning but saved directly \u2014 keep it for Obsidian
            questionData.pensamentoAluno = decision.pensamento;
            setStoredThought(questionData.id, decision.pensamento);
          }
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
      `O script vai navegar pelo caderno COLETANDO as erradas (sem IA), ` +
      `e depois voc\u00EA escolhe quais viram cards.\n\n` +
      `\u26A0\uFE0F Mantenha o Anki aberto.\n` +
      `Come\u00E7ar a coleta a partir da quest\u00E3o ATUAL?`
    )) {
      return;
    }

    batchRunning = true;
    const batchBtn = document.getElementById('tec-btn-batch');
    if (batchBtn) batchBtn.innerHTML = '<span class="tec-spinner"></span> Coletando...';
    let skipped = 0;
    const collected = []; // questionData of every wrong question found
    const collectedIds = new Set(); // avoid duplicates while navigating

    // \u2500\u2500 Phase 1: navigate and COLLECT wrong questions (no AI calls yet) \u2500\u2500
    const progressToast = document.createElement('div');
    progressToast.className = 'tec-toast info';
    progressToast.style.pointerEvents = 'auto';
    progressToast.innerHTML = `
      <div style="width:100%">
        <div>\uD83D\uDD0D Coletando erradas: <span id="tec-batch-count">0</span>/${totalErros}</div>
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

        if (isError && !collectedIds.has(currentId)) {
          collectedIds.add(currentId);

          try {
            // Expand comment before extracting (the AI prompt needs it later)
            await ensureCommentExpanded();
            await delay(500);

            const qData = extractQuestionData();
            const savedThought = getStoredThought(qData.id);
            if (savedThought) qData.pensamentoAluno = savedThought;
            if (qData.enunciado || qData.id) {
              collected.push(qData);
            }
          } catch (err) {
            console.error(`\u274C Batch: Erro ao extrair Q${currentId}:`, err);
          }

          // Update progress UI
          document.getElementById('tec-batch-count').textContent = collected.length;
          document.getElementById('tec-batch-progress').style.width = `${(collected.length / totalErros) * 100}%`;

          // No need to close comment \u2014 navigation handles it
        } else if (!isError) {
          skipped++;
          const skippedEl = document.getElementById('tec-batch-skipped');
          if (skippedEl) skippedEl.textContent = skipped;
        }

        // Check if we've collected all errors
        if (collected.length >= totalErros) {
          console.log('\uD83C\uDF89 Batch: Todas as erradas coletadas!');
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
    }

    if (collected.length === 0) {
      batchRunning = false;
      if (batchBtn) batchBtn.innerHTML = '\uD83D\uDCCB Erros';
      showToast('Nenhuma quest\u00E3o errada encontrada a partir da quest\u00E3o atual.', 'warning', 5000);
      return;
    }

    // \u2500\u2500 Phase 2: user picks which errors deserve cards \u2500\u2500
    if (batchBtn) batchBtn.innerHTML = '<span class="tec-spinner"></span> Sele\u00E7\u00E3o...';
    const itemsWithDups = await Promise.all(collected.map(async (qData) => ({
      questionData: qData,
      existingCards: await countExistingAnkiCards(qData.id),
    })));

    const selected = await showBatchSelectionModal(itemsWithDups);
    if (!selected || selected.length === 0) {
      batchRunning = false;
      if (batchBtn) batchBtn.innerHTML = '\uD83D\uDCCB Erros';
      showToast(selected ? 'Nenhuma quest\u00E3o selecionada \u2014 batch encerrado.' : 'Batch cancelado.', 'info', 4000);
      return;
    }

    // \u2500\u2500 Phase 3: generate cards (AI) + save for selected questions \u2500\u2500
    if (batchBtn) batchBtn.innerHTML = '<span class="tec-spinner"></span> Gerando...';
    let processed = 0, errors = 0;
    const batchResults = [];
    const batchErrors = [];

    const genToast = document.createElement('div');
    genToast.className = 'tec-toast info';
    genToast.style.pointerEvents = 'auto';
    genToast.innerHTML = `
      <div style="width:100%">
        <div>\uD83E\uDD16 Gerando cards: <span id="tec-gen-count">0</span>/${selected.length}</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;" id="tec-gen-current">-</div>
        <div class="tec-progress-bar"><div class="tec-progress-fill" id="tec-gen-progress" style="width:0%"></div></div>
        <button id="tec-gen-stop" style="margin-top:8px;padding:4px 12px;border:1px solid #ef476f;background:transparent;color:#ef476f;border-radius:6px;cursor:pointer;font-size:12px;">\u23F9\uFE0F Parar</button>
      </div>
    `;
    ensureToastContainer().appendChild(genToast);
    document.getElementById('tec-gen-stop').addEventListener('click', () => { batchRunning = false; });

    try {
      for (const qData of selected) {
        if (!batchRunning) break;
        const currentEl = document.getElementById('tec-gen-current');
        if (currentEl) currentEl.textContent = `Q#${qData.id || '?'} \u2014 ${qData.materia || ''}`;

        try {
          const aiResult = await generateCards(qData);
          await Promise.allSettled([
            getSetting('enableAnki') ? addCardsToAnki(aiResult, qData) : Promise.resolve(null),
            getSetting('enableObsidian') ? saveToObsidian(qData, aiResult) : Promise.resolve(null),
          ]);
          processed++;
          batchResults.push({ questionData: qData, aiResult });
        } catch (err) {
          console.error(`\u274C Batch: Erro em Q${qData.id}:`, err);
          errors++;
          batchErrors.push({ id: qData.id || '?', num: '?', error: err.message || String(err) });
        }

        const countEl = document.getElementById('tec-gen-count');
        if (countEl) countEl.textContent = processed;
        const progEl = document.getElementById('tec-gen-progress');
        if (progEl) progEl.style.width = `${((processed + errors) / selected.length) * 100}%`;
      }
    } finally {
      genToast.remove();
      if (batchResults.length > 0 || batchErrors.length > 0) {
        try {
          await showBatchPreviewModal(batchResults, batchErrors);
        } catch (e) {
          console.error('Erro ao exibir preview batch:', e);
        }
      }
      batchRunning = false;
      if (batchBtn) batchBtn.innerHTML = '\uD83D\uDCCB Erros';
      // Persistent toast \u2014 stays until user clicks \u2715
      const excluded = collected.length - selected.length;
      const type = processed > 0 ? 'success' : 'warning';
      const icons = { success: '\u2705', warning: '\u26A0\uFE0F' };
      const finalToast = document.createElement('div');
      finalToast.className = `tec-toast ${type}`;
      finalToast.style.pointerEvents = 'auto';
      finalToast.innerHTML = `
        <span>${icons[type]}</span>
        <span>Batch finalizado!<br>\u2705 ${processed} processadas | \u274C ${errors} erros | \uD83D\uDE48 ${excluded} exclu\u00EDdas por voc\u00EA | \u23ED\uFE0F ${skipped} acertos pulados</span>
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
  // \u2551          15b. QUICK THOUGHT CAPTURE (auto ao errar)          \u2551
  // \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d

  let _quickThoughtLastId = null; // last question id we surfaced the box for

  function removeQuickThoughtBox() {
    document.getElementById('tec-quick-thought')?.remove();
  }

  /**
   * Floating box that lets the user note WHY they erred, right after answering.
   * The text is auto-saved (debounced) keyed by question id via GM storage, so it
   * is already attached to the question when cards are later generated.
   */
  function showQuickThoughtBox(questionId) {
    if (!questionId) return;
    const existing = document.getElementById('tec-quick-thought');
    if (existing) {
      if (existing.dataset.qid === String(questionId)) return; // already open
      existing.remove();
    }

    const box = document.createElement('div');
    box.id = 'tec-quick-thought';
    box.dataset.qid = String(questionId);
    box.innerHTML = `
      <div class="qt-header">
        <span>\ud83d\udcad Por que voc\u00ea errou? <span class="qt-qid">#${questionId}</span></span>
        <button class="qt-close" data-act="close" title="Fechar">\u00d7</button>
      </div>
      <textarea placeholder="Anote agora o motivo do erro \u2014 fica salvo nesta quest\u00e3o e ajuda a IA a mirar o card no que voc\u00ea errou."></textarea>
      <div class="qt-footer">
        <span class="qt-saved">\u2713 salvo</span>
        <div class="qt-btns">
          <button class="qt-act qt-skip" data-act="close">Pular</button>
          <button class="qt-act qt-save" data-act="save">\ud83d\udcbe Salvar</button>
        </div>
      </div>
    `;

    const textarea = box.querySelector('textarea');
    textarea.value = getStoredThought(questionId);
    const savedFlag = box.querySelector('.qt-saved');

    let hideTimer = null;
    const flashSaved = () => {
      savedFlag.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => savedFlag.classList.remove('show'), 1200);
    };

    let debounce = null;
    textarea.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { setStoredThought(questionId, textarea.value); flashSaved(); }, 500);
    });

    box.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'save') {
        setStoredThought(questionId, textarea.value);
        flashSaved();
        setTimeout(removeQuickThoughtBox, 400);
      } else if (act === 'close') {
        setStoredThought(questionId, textarea.value); // persist whatever was typed
        removeQuickThoughtBox();
      }
    });

    document.body.appendChild(box);
  }

  /**
   * Poll the Angular scope; when the current question was just answered WRONG,
   * surface the quick-thought box once. Skipped during single/batch processing.
   */
  function checkForWrongAnswer() {
    if (batchRunning || isProcessing) return;

    const { vm } = getAngularVm();
    const q = vm?.questao;
    const box = document.getElementById('tec-quick-thought');

    if (!q || !q.idQuestao) return;
    const id = String(q.idQuestao);

    // Navigated to another question \u2192 drop a stale box (text already auto-saved)
    if (box && box.dataset.qid !== id) removeQuickThoughtBox();

    const answeredWrong = q.correcaoQuestao === false && q.alternativaSelecionada > 0;
    if (!answeredWrong) {
      if (_quickThoughtLastId && _quickThoughtLastId !== id) _quickThoughtLastId = null;
      return;
    }

    if (id === _quickThoughtLastId) return; // already surfaced for this wrong answer
    _quickThoughtLastId = id;
    showQuickThoughtBox(id);
  }

  /**
   * Toolbar 💭 action: (re)open the quick-thought box for the current question,
   * so the user can edit a reasoning they already saved (or add one anytime).
   */
  function openThoughtForCurrentQuestion() {
    const { vm } = getAngularVm();
    const id = vm?.questao?.idQuestao
      ? String(vm.questao.idQuestao)
      : (document.body.innerText.match(/#(\d{5,})/)?.[1] || null);
    if (!id) { showToast('Não consegui identificar a questão atual.', 'warning'); return; }
    _quickThoughtLastId = id; // keep the auto-watcher from re-opening a duplicate
    showQuickThoughtBox(id);
    setTimeout(() => document.querySelector('#tec-quick-thought textarea')?.focus(), 60);
  }

  // \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
  // \u2551                  16. INITIALIZATION                          \u2551
  // \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

  GM_registerMenuCommand('\u2699\uFE0F Configura\u00E7\u00F5es', showSettingsPanel);
  GM_registerMenuCommand('\uD83D\uDD0D Discovery Mode (debug)', runDiscovery);
  GM_registerMenuCommand('\uD83D\uDCCB Salvar Quest\u00E3o Atual', processCurrentQuestion);

  /**
   * Compara a vers\u00E3o instalada com a publicada no GitHub (1x/dia) e avisa se
   * estiver desatualizada \u2014 cards ruins j\u00E1 foram gerados por vers\u00E3o velha rodando
   * no Tampermonkey sem o usu\u00E1rio perceber.
   */
  async function checkScriptFreshness() {
    try {
      const last = GM_getValue('lastUpdateCheck', 0);
      if (Date.now() - last < 24 * 60 * 60 * 1000) return;
      GM_setValue('lastUpdateCheck', Date.now());
      const res = await gmFetch(UPDATE_URL, { timeout: 10000 });
      if (!res.ok) return;
      const remote = (await res.text()).match(/@version\s+([\d.]+)/)?.[1];
      if (!remote) return;
      const rp = remote.split('.').map(Number);
      const lp = SCRIPT_VERSION.split('.').map(Number);
      let newer = false;
      for (let i = 0; i < Math.max(rp.length, lp.length); i++) {
        const r = rp[i] || 0, l = lp[i] || 0;
        if (r !== l) { newer = r > l; break; }
      }
      if (newer) {
        showToast(`\u26A0\uFE0F Vers\u00E3o desatualizada! Instalada: v${SCRIPT_VERSION} \u2192 dispon\u00EDvel: v${remote}.<br>Atualize no Tampermonkey para receber as corre\u00E7\u00F5es de cards.`, 'error', 12000);
        console.warn(`[TEC\u2192Anki] Vers\u00E3o instalada v${SCRIPT_VERSION} < publicada v${remote} \u2014 atualize o userscript!`);
      }
    } catch { /* check silencioso \u2014 sem rede, sem aviso */ }
  }

  function init() {
    // Check if we're on a relevant page (quest\u00F5es, estudo, caderno)
    const url = window.location.href;
    const isRelevant = /quest|estudo|caderno|resolver/i.test(url) ||
                       document.querySelector('[class*="questao"], [class*="enunciado"]');

    // Always inject the toolbar (it's small and non-intrusive)
    injectToolbar();

    // Log init
    console.log(`\uD83D\uDE80 TEC\u2192Anki+Obsidian v${SCRIPT_VERSION} carregado em:`, window.location.href);

    // Show confirmation toast on load
    showToast(`TEC\u2192Anki+Obsidian <b>v${SCRIPT_VERSION}</b> carregado! Use <b>Shift+Enter</b> ou o bot\u00E3o \uD83D\uDCCB`, 'success', 4000);

    // Warn when the installed copy lags the published one (daily check)
    checkScriptFreshness();

    // Check connections periodically (every 2 min)
    updateStatusDot();
    setInterval(updateStatusDot, 120000);

    // Watch for wrong answers → surface the quick-thought box on the spot
    setInterval(checkForWrongAnswer, 1500);

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

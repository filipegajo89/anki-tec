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
// @connect      www.tecconcursos.com.br
// @connect      tecconcursos.com.br
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                    1. CONFIGURATION                          ║
  // ╚═══════════════════════════════════════════════════════════════╝

  const DEFAULTS = {
    geminiApiKey: 'YOUR_GEMINI_API_KEY_HERE',
    geminiModel: 'gemini-2.5-flash',
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
    console.log('🔄 Modelo Gemini migrado para gemini-2.5-flash');
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                    2. CSS STYLES                             ║
  // ╚═══════════════════════════════════════════════════════════════╝

  GM_addStyle(`
    /* ── Floating Toolbar ── */
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

    /* ── Toast ── */
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

    /* ── Modal Overlay ── */
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

    /* ── Modal Content ── */
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

    /* ── Settings Panel ── */
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

    /* ── Loading Spinner ── */
    .tec-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
      border-top-color: #fff; border-radius: 50%; animation: tec-spin .6s linear infinite;
      display: inline-block;
    }
    @keyframes tec-spin { to { transform: rotate(360deg); } }

    /* ── Progress Bar ── */
    .tec-progress-bar {
      width: 100%; height: 4px; background: #e9ecef; border-radius: 2px;
      margin-top: 8px; overflow: hidden;
    }
    .tec-progress-fill {
      height: 100%; background: #4361ee; border-radius: 2px;
      transition: width .3s ease;
    }
  `);

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  3. UTILITY FUNCTIONS                        ║
  // ╚═══════════════════════════════════════════════════════════════╝

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

    // Dispatch on multiple targets — TEC's Angular may listen on any of these
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
   * 1. Native MouseEvent dispatch (mousedown → mouseup → click)
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
   *  3. XHR interception + click "Ver resolução" to capture API response
   *  4. Direct TEC API call with question ID
   *  5. DOM fallback: look for tec-formatar-html with comment attr
   */
  async function ensureCommentExpanded() {
    _capturedComment = '';

    const { scope, vm } = getAngularVm();

    // ── Strategy 1: Direct property read from Angular scope ──
    console.log('\n📖 Strategy 1: Leitura direta do Angular scope...');
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
              console.log(`✅ Comentário via vm.questao.${prop} (${plain.length} chars)`);
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
              console.log(`🔎 Possível comentário em vm.questao.${key} (${plain.length} chars): "${plain.substring(0, 100)}..."`);
              _capturedComment = plain;
              console.log(`✅ Comentário via vm.questao.${key} (${plain.length} chars)`);
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
                console.log(`✅ Comentário via vm.questao.${key}.${prop} (${_capturedComment.length} chars)`);
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
          console.log(`✅ Comentário via vm.${prop} (${_capturedComment.length} chars)`);
          return true;
        }
      }

      // Check vm.comentario object (e.g. vm.comentario.textoComentario)
      if (vm.comentario && typeof vm.comentario === 'object') {
        for (const prop of commentProps) {
          const val = vm.comentario[prop];
          if (typeof val === 'string' && val.length > 30) {
            _capturedComment = stripHtml(val);
            console.log(`✅ Comentário via vm.comentario.${prop} (${_capturedComment.length} chars)`);
            return true;
          }
        }
      }
    }

    // ── Strategy 2: Call Angular controller methods ──
    console.log('\n🔧 Strategy 2: Chamando métodos Angular...');
    if (vm) {
      const methodNames = [
        'mostrarComentario', 'abrirComentario', 'toggleComentario', 'verComentario',
        'mostrarResolucao', 'abrirResolucao', 'toggleResolucao', 'verResolucao',
        'exibirComentario', 'carregarComentario', 'loadComentario',
        'showComment', 'loadComment', 'toggleComment', 'mostrarComentarioTexto'
      ];

      for (const name of methodNames) {
        if (typeof vm[name] === 'function') {
          console.log(`  🔧 Calling vm.${name}()...`);
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
                    console.log(`✅ Comentário after ${name}(): vm.questao.${key} (${plain.length} chars)`);
                    return true;
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`    ⚠️ vm.${name}() error:`, err.message);
          }
        }
      }

      // Also try on scope directly
      for (const name of methodNames) {
        if (scope && typeof scope[name] === 'function' && typeof vm[name] !== 'function') {
          console.log(`  🔧 Calling scope.${name}()...`);
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
                    console.log(`✅ Comentário after scope.${name}(): .${key} (${plain.length} chars)`);
                    return true;
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`    ⚠️ scope.${name}() error:`, err.message);
          }
        }
      }
    }

    // ── Strategy 3: XHR interception + click "Ver resolução" ──
    console.log('\n📡 Strategy 3: XHR intercept + click...');
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
          console.log(`  📡 XHR: ${self._tecUrl} (${self.status}) [${(self.responseText||'').length} chars]`);
          if (/coment|resoluc|questao|questoes/i.test(self._tecUrl) && self.responseText?.length > 50) {
            capturedXhrUrl = self._tecUrl;
            capturedXhrResponse = self.responseText;
          }
        }
      });
      return origSend.apply(this, args);
    };

    // Click "Ver resolução" links
    const resolucaoLinks = [...document.querySelectorAll('a, button, span')].filter(el => {
      const txt = el.textContent.trim();
      return /ver resolu[çc]/i.test(txt) && txt.length < 40;
    });
    console.log(`  Links "Ver resolução": ${resolucaoLinks.length}`);

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
      console.log(`  📡 XHR capturado: ${capturedXhrResponse.length} chars de ${capturedXhrUrl}`);
      try {
        const data = JSON.parse(capturedXhrResponse);
        const text = extractCommentFromJson(data);
        if (text && text.length > 30) {
          _capturedComment = text;
          console.log(`✅ Comentário via XHR JSON (${text.length} chars)`);
          return true;
        }
      } catch {
        if (capturedXhrResponse.length > 50 && !capturedXhrResponse.startsWith('<!')) {
          _capturedComment = stripHtml(capturedXhrResponse);
          console.log(`✅ Comentário via XHR raw (${_capturedComment.length} chars)`);
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
            console.log(`✅ Comentário via scope re-check: .${key} (${plain.length} chars)`);
            return true;
          }
        }
      }
    }

    // ── Strategy 4: Direct TEC API call (known working endpoint) ──
    const questaoId = vm?.questao?.idQuestao ||
                      vm?.questao?.id ||
                      document.body.innerText.match(/#(\d{5,})/)?.[1] ||
                      window.location.pathname.match(/(\d{5,})/)?.[1];

    if (questaoId) {
      console.log(`\n📡 Strategy 4: API direta (questão #${questaoId})...`);
      const apiUrls = [
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}/comentario?tokenPreVisualizacao=`,
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}/comentarios`,
        `https://www.tecconcursos.com.br/api/questoes/${questaoId}`,
      ];

      for (const url of apiUrls) {
        try {
          console.log(`  📡 GET ${url}`);
          const resp = await gmFetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/html',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
          if (resp.ok) {
            const text = await resp.text();
            console.log(`    ✅ ${resp.status} — ${text.length} chars`);
            if (text.length > 50) {
              try {
                const data = JSON.parse(text);
                console.log(`    JSON keys: ${Object.keys(data).join(', ')}`);
                const comment = extractCommentFromJson(data);
                if (comment && comment.length > 30) {
                  _capturedComment = comment;
                  console.log(`✅ Comentário via API (${comment.length} chars)`);
                  return true;
                }
              } catch {
                // Maybe HTML — try parsing for comment section
                if (text.includes('comentario') || text.includes('resolucao')) {
                  const div = document.createElement('div');
                  div.innerHTML = text;
                  const commentEls = div.querySelectorAll('[tec-formatar-html*="coment"], .comentario-texto, .resolucao-texto');
                  for (const cel of commentEls) {
                    if (cel.textContent.trim().length > 30) {
                      _capturedComment = cel.textContent.trim();
                      console.log(`✅ Comentário via API HTML (${_capturedComment.length} chars)`);
                      return true;
                    }
                  }
                }
              }
            }
          } else {
            console.log(`    ❌ ${resp.status}`);
          }
        } catch (err) {
          console.log(`    ❌ ${err.message}`);
        }
      }
    }

    // ── Strategy 5: DOM fallback ──
    console.log('\n🔍 Strategy 5: DOM fallback...');
    const tecElements = document.querySelectorAll('[tec-formatar-html]');
    const enunciadoText = vm?.questao?.enunciado ||
                          document.querySelector('.questao-enunciado-texto')?.innerText?.trim() || '';
    const enunciadoPlain = stripHtml(enunciadoText);

    for (const el of tecElements) {
      const attr = el.getAttribute('tec-formatar-html') || '';
      const text = el.innerText.trim();
      console.log(`  [${attr}] → ${text.length} chars`);
      if (/coment/i.test(attr) && text.length > 30) {
        if (text !== enunciadoPlain && !text.startsWith(enunciadoPlain.substring(0, 50))) {
          _capturedComment = text;
          console.log(`✅ Comentário via DOM [${attr}] (${text.length} chars)`);
          return true;
        }
      }
    }
    for (const el of tecElements) {
      const text = el.innerText.trim();
      if (text.length > 200 && text !== enunciadoPlain &&
          !text.startsWith(enunciadoPlain.substring(0, 50))) {
        _capturedComment = text;
        console.log(`✅ Comentário via DOM genérico (${text.length} chars)`);
        return true;
      }
    }

    console.warn('⏰ Nenhum comentário capturado após 5 estratégias.');
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

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                    4. TOAST SYSTEM                           ║
  // ╚═══════════════════════════════════════════════════════════════╝

  function ensureToastContainer() {
    let c = document.getElementById('tec-toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'tec-toast-container'; document.body.appendChild(c); }
    return c;
  }

  function showToast(message, type = 'info', duration = 4000) {
    const container = ensureToastContainer();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
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

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  5. DOM EXTRACTION                           ║
  // ╚═══════════════════════════════════════════════════════════════╝

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
   * Main extraction function — reads the current question.
   * Primary source: Angular scope (vm.questao) — always matches TEC exactly.
   * Fallback: DOM scraping for anything Angular doesn't provide.
   */
  function extractQuestionData() {
    const data = {
      id: null, banca: '', ano: '', cargo: '', concurso: '',
      materia: '', assunto: '', enunciado: '', tipo: '',
      alternativas: [], respostaAluno: '', gabarito: '',
      errou: false, comentario: '', url: window.location.href,
    };

    // ── Try Angular scope first (most reliable) ──
    const { vm } = getAngularVm();
    const q = vm?.questao;

    if (q) {
      console.log('📋 Extração via Angular scope (vm.questao)');

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
      // ── Fallback: DOM scraping ──
      console.log('📋 Extração via DOM (Angular scope indisponível)');

      const bodyText = document.body.innerText;

      // 1. Question ID + Metadata
      const metaRegex = /#(\d{5,})\s+(.+?)\s*[-–]\s*(\d{4})\s*[-–]\s*(.+?)(?:\s*×|\s*$)/m;
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

      // 2. Matéria
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
      data.errou = !!bodyText.match(/Você errou/i);
      const gabaritoMatch = bodyText.match(/Gabarito:\s*(.+?)(?:\.|,|\s|$)/i);
      if (gabaritoMatch) data.gabarito = gabaritoMatch[1].trim();
      const selMatch = bodyText.match(/Você selecionou:\s*(.+?)(?:,|\.|$)/im);
      if (selMatch) data.respostaAluno = selMatch[1].trim();
      if (!data.gabarito) {
        const correta = data.alternativas.find(a => a.correta);
        if (correta) data.gabarito = correta.letra || correta.texto;
      }
    }

    // ── 7. Comentário do Professor (always from _capturedComment) ──
    if (_capturedComment && _capturedComment.length > 50) {
      data.comentario = _capturedComment;
      console.log(`✅ Comentário extraído (${_capturedComment.length} chars)`);
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
        console.log('ℹ️ Comentário do professor não encontrado.');
      }
    }

    // ── 8. Build question URL ──
    if (data.id) {
      data.url = `https://www.tecconcursos.com.br/questoes/${data.id}`;
    }

    console.log(`📋 Dados extraídos: Q${data.id} | ${data.materia} > ${data.assunto} | ${data.tipo}`);
    return data;
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                   6. GEMINI API                              ║
  // ╚═══════════════════════════════════════════════════════════════╝

  const SYSTEM_PROMPT = `Você é um especialista em concursos públicos e criação de flashcards para Anki. Receba os dados de uma questão e crie flashcards cirúrgicos conforme o cenário (questão errada OU acertada).

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

Crie 2-3 flashcards que corrigem EXATAMENTE essa confusão.

### REGRA DE OURO: foque no MECANISMO DO ERRO, não no tema geral

O objetivo NÃO é ensinar o assunto de forma genérica. É CORRIGIR a confusão específica que fez o aluno errar.

### Exemplos de erros comuns e como abordar:

**Erro por TROCA/INVERSÃO de conceitos:**
Se a banca trocou as descrições de dois institutos, o card deve forçar o aluno a DISTINGUIR X de Y. Faça cards comparativos.

**Erro por EXCEÇÃO desconhecida:**
Se o aluno generalizou uma regra que tem exceção, o card deve focar na exceção.

**Erro por CONFUSÃO de competência/sujeito:**
Se a banca trocou quem faz o quê, o card deve testar: "Quem é competente para X: A ou B?"

**Erro por PEGADINHA de redação:**
Se um item parece certo mas tem uma palavra que o torna errado, o card deve focar nessa distinção sutil.

**Erro por GENERALIZAÇÃO (como "toda norma...", "sempre...", "nunca..."):**
Se o item generalizou uma regra que tem exceções, o card deve testar a regra vs exceção.

### Tipos de cards para questão ERRADA (em ordem de prioridade):

1. **Card da distinção (OBRIGATÓRIO):** Pergunta que força o aluno a distinguir os conceitos que ele CONFUNDIU.
2. **Card da regra correta:** Pergunta direta sobre o artigo, súmula ou regra que fundamenta a resposta correta.
3. **Card da armadilha (se relevante):** "Verdadeiro ou falso" usando a mesma construção enganosa da banca.

**No campo "erro_identificado":** descreva o mecanismo do erro (ex: "Confundiu competência da União com a dos Estados").

---

## CENÁRIO 2: QUESTÃO ACERTADA

Quando o aluno ACERTA mas pede cards, é porque NÃO teve certeza da resposta. O objetivo é BLINDAR esse conhecimento.

Identifique com precisão:
- Qual a PEGADINHA ou NUANCE da questão (o que a tornava difícil)
- Qual o detalhe sutil que a banca explorou para confundir
- Quais alternativas eram mais "sedutoras" e por quê

### Tipos de cards para questão ACERTADA (em ordem de prioridade):

1. **Card da pegadinha (OBRIGATÓRIO):** Exponha a armadilha da banca. Se havia uma alternativa que PARECIA certa mas não era, o card deve testar por que ela está errada.
2. **Card da nuance:** Teste a distinção sutil que tornava a questão difícil. Se havia exceção, condição, ou detalhe de redação que mudava tudo, foque nisso.
3. **Card de reforço (se relevante):** Pergunta que consolida a regra central com suas exceções ou condições.

**No campo "erro_identificado":** descreva a pegadinha/nuance da questão (ex: "A alternativa B parecia correta por usar 'sempre que possível', mas o art. X não admite exceção neste caso").

## Regras gerais para os flashcards

- O PRIMEIRO card SEMPRE deve atacar o ponto central: a confusão (se errou) ou a pegadinha/nuance (se acertou)
- Perguntas no presente, ativas: "Qual...", "Quais...", "Verdadeiro ou falso:..."
- Use perguntas COMPARATIVAS quando o erro envolver troca de conceitos
- Respostas CONCISAS — máximo 3 linhas. Se precisar de lista, use bullets curtos
- NUNCA crie cards genéricos sobre o assunto. Cada card deve ter relação direta com o motivo do erro
- NUNCA copie o enunciado da questão. O card deve testar o CONCEITO, não a questão específica
- Se a questão envolver artigo de lei, cite o artigo no verso
- Gere 2 cards por padrão. Só gere 3 se houver uma distinção conceitual importante a mais
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

### Regras de formatação:
- Use <b> em TODA menção a conceitos jurídicos importantes no verso
- Use <span class="neg"> SEMPRE que houver negação, vedação, exceção ou contraste ("NÃO", "vedado", "salvo", "exceto")
- Use <mark> com moderação (1-3 palavras por card) apenas nas palavras que são o NÚCLEO da distinção
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
- Liste 2-5 expressões por card (as mais recorrentes em provas para aquele conceito)
- Priorize trechos literais de artigos de lei ou súmulas
- Se não houver expressões canônicas claras para o conceito, deixe o campo vazio ("")`;

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      materia: { type: 'string', description: 'Matéria do edital' },
      subtopico: { type: 'string', description: 'Subtópico específico' },
      erro_identificado: { type: 'string', description: 'Se errou: descrição do mecanismo do erro. Se acertou: descrição da pegadinha/nuance que tornava a questão difícil.' },
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            frente: { type: 'string', description: 'Pergunta do flashcard (frente)' },
            verso: { type: 'string', description: 'Resposta do flashcard (verso, max 3 linhas)' },
            palavras_chave: { type: 'string', description: 'Expressões canônicas da lei/doutrina que identificam este conceito jurídico, separadas por " | " (ex: "circunstâncias pessoais | capacidade econômica real | será pessoal sempre que possível"). Vazio se não houver.' },
          },
          required: ['frente', 'verso', 'palavras_chave'],
        },
      },
    },
    required: ['materia', 'subtopico', 'erro_identificado', 'cards'],
  };

  function buildGeminiPrompt(q) {
    const altsText = q.alternativas.map(a => {
      let line = `${a.letra}) ${a.texto}`;
      if (a.selecionada) line += ' ← ALUNO MARCOU ESTA';
      if (a.correta) line += ' ← GABARITO CORRETO';
      return line;
    }).join('\n');

    return `## Dados da Questão ${q.errou ? 'Errada' : 'Acertada'}

**ID:** #${q.id || 'N/A'}
**Banca:** ${q.banca || 'N/A'}
**Ano:** ${q.ano || 'N/A'}
**Cargo:** ${q.cargo || 'N/A'}
**Matéria:** ${q.materia || 'N/A'}
**Assunto:** ${q.assunto || 'N/A'}
**Tipo:** ${q.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}

### Enunciado
${q.enunciado || 'Não disponível'}

### Alternativas
${altsText || 'Não disponíveis'}

### Resultado
- **Aluno marcou:** ${q.respostaAluno || 'N/A'}
- **Gabarito:** ${q.gabarito || 'N/A'}
- **Resultado:** ${q.errou ? 'ERROU ❌' : 'ACERTOU ✅'}

### Comentário do Professor
${q.comentario || 'Não disponível'}

---
Com base nas informações acima, identifique o mecanismo do erro e crie 2-3 flashcards cirúrgicos.`;
  }

  async function callGemini(questionData) {
    const apiKey = getSetting('geminiApiKey');
    const model = getSetting('geminiModel');
    if (!apiKey) throw new Error('API key do Gemini não configurada. Abra as configurações (⚙️).');

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
        console.warn(`⚠️ Gemini ${res.status} — tentativa ${attempt}/${MAX_RETRIES}, aguardando ${waitSec}s...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Resposta vazia do Gemini');

    return JSON.parse(text);
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  7. ANKI CONNECT                             ║
  // ╚═══════════════════════════════════════════════════════════════╝

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
          console.log('[TEC→Anki] Campo PalavrasChave adicionado ao modelo existente');
        }
      } catch (e) { console.warn('[TEC→Anki] Não foi possível migrar campo PalavrasChave:', e); }
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
{{#PalavrasChave}}<div class="palavras-chave">🔑 {{#PalavrasChave}}{{PalavrasChave}}{{/PalavrasChave}}</div>{{/PalavrasChave}}
{{#ErroIdentificado}}<div class="erro">💡 {{ErroIdentificado}}</div>{{/ErroIdentificado}}
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
    const contexto = `${materia}${subtopico ? ' › ' + subtopico : ''}`;

    const notes = aiResult.cards.map(card => ({
      deckName,
      modelName,
      fields: {
        Frente: card.frente,
        Verso: card.verso,
        PalavrasChave: (card.palavras_chave || '').split(/\s*\|\s*/).filter(Boolean).map(kw => `<span class="kw">${kw.trim()}</span>`).join(' '),
        Contexto: contexto,
        Fonte: fonte,
        ErroIdentificado: aiResult.erro_identificado || '',
      },
      tags,
      options: { allowDuplicate: false, duplicateScope: 'deck' },
    }));

    const results = await ankiInvoke('addNotes', { notes });
    const added = results.filter(r => r !== null).length;
    return { added, total: notes.length, deckName };
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                    8. OBSIDIAN                               ║
  // ╚═══════════════════════════════════════════════════════════════╝

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
      .replace(/(\n\s*){3,}/g, '\n\n') // 3+ blank lines → 1 blank line
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
      if (a.selecionada && !a.correta) line += ' ❌ _(sua resposta)_';
      if (a.correta) line += ' ✅ _(gabarito)_';
      return line;
    }).join('\n');

    const cardsTable = (aiResult?.cards || []).map((c, i) =>
      `| ${i + 1} | ${c.frente} | ${c.verso} | ${c.palavras_chave || ''} |`
    ).join('\n');

    const comentario = cleanText(questionData.comentario) || '_Não disponível_';
    const erroId = cleanText(aiResult?.erro_identificado) || '_Não gerado_';

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
# Q${id} — ${subtopico || materia}
> **Banca:** ${banca} | **Ano:** ${ano} | **Cargo:** ${cargo}
> **Matéria:** [[${materia}]] | **Assunto:** ${subtopico}
> [🔗 Ver no TEC](${questionData.url})

## Enunciado
${questionData.enunciado || '_Não extraído_'}

## Alternativas
${altsMarkdown || '_Não extraídas_'}

## Resultado
- **Sua resposta:** ${questionData.respostaAluno || 'N/A'} ${questionData.errou ? '❌' : '✅'}
- **Gabarito:** ${questionData.gabarito || 'N/A'} ✅

## Comentário do Professor
${comentario}

## ${questionData.errou ? '🎯 Erro Identificado (IA)' : '🔍 Pegadinha/Nuance Identificada (IA)'}
${erroId}

## 📝 Flashcards Gerados
| # | Frente | Verso | Palavras-chave |
|---|--------|-------|----------------|
${cardsTable || '| - | _Nenhum_ | - | - |'}

---
_Gerado em ${todayISO()} via TEC→Anki+Obsidian_
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
      if (!token) throw new Error('Token do Obsidian REST API não configurado.');

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
      if (!vault) throw new Error('Nome do vault do Obsidian não configurado.');
      const encoded = encodeURIComponent(content.substring(0, 6000));
      const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encoded}&silent=true`;
      window.open(uri, '_blank');
      return { path: `${filePath}.md`, method: 'uri' };
    }

    // Fallback: clipboard
    await navigator.clipboard.writeText(content);
    return { path: null, method: 'clipboard' };
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  9. PREVIEW MODAL                            ║
  // ╚═══════════════════════════════════════════════════════════════╝

  function showPreviewModal(questionData, aiResult) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tec-modal-overlay';

      const materia = questionData.materia || aiResult?.materia || '';
      const subtopico = questionData.assunto || aiResult?.subtopico || '';

      const cardsHTML = (aiResult?.cards || []).map((c, i) => `
        <div class="tec-card-preview">
          <div class="card-num">Card ${i + 1}</div>
          <div class="card-front">🔹 ${c.frente}</div>
          <div class="card-back">💡 ${c.verso}</div>
          ${c.palavras_chave ? `<div class="card-kw" style="font-size:11px;color:#c4b5fd;margin-top:4px">🔑 ${c.palavras_chave}</div>` : ''}
        </div>
      `).join('');

      overlay.innerHTML = `
        <div class="tec-modal">
          <div class="tec-modal-header">
            <h2>📋 Questão #${questionData.id || '?'}</h2>
            <button class="tec-modal-close" data-action="close">×</button>
          </div>
          <div class="tec-modal-body">
            ${questionData.errou
              ? '<div class="tec-error-badge">❌ Você errou esta questão</div>'
              : '<div class="tec-error-badge" style="background:#d4edda;color:#155724">✅ Acertou</div>'}

            <div class="tec-meta-grid">
              <span class="label">Banca</span><span class="value">${questionData.banca || '-'}</span>
              <span class="label">Ano</span><span class="value">${questionData.ano || '-'}</span>
              <span class="label">Cargo</span><span class="value">${questionData.cargo || '-'}</span>
              <span class="label">Matéria</span><span class="value">${materia || '-'}</span>
              <span class="label">Subtópico</span><span class="value">${subtopico || '-'}</span>
              <span class="label">Tipo</span><span class="value">${questionData.tipo === 'certo_errado' ? 'Certo/Errado' : 'Múltipla Escolha'}</span>
              <span class="label">Resposta</span><span class="value">${questionData.respostaAluno || '-'} → Gabarito: ${questionData.gabarito || '-'}</span>
            </div>

            <div class="tec-section">
              <h3>${questionData.errou ? '🎯 Erro Identificado pela IA' : '🔍 Pegadinha/Nuance Identificada pela IA'}</h3>
              <div class="content">${aiResult?.erro_identificado || '<em>Não gerado</em>'}</div>
            </div>

            <div class="tec-section">
              <h3>📝 Flashcards Gerados (${aiResult?.cards?.length || 0})</h3>
              ${cardsHTML || '<div class="content"><em>Nenhum card gerado</em></div>'}
            </div>

            <div class="tec-section" style="margin-bottom:0">
              <h3>📄 Enunciado</h3>
              <div class="content">${questionData.enunciado?.substring(0, 500) || '<em>Não extraído</em>'}${(questionData.enunciado?.length || 0) > 500 ? '...' : ''}</div>
            </div>
          </div>
          <div class="tec-modal-footer">
            <button class="tec-btn tec-btn-cancel" data-action="cancel">Cancelar</button>
            <button class="tec-btn tec-btn-save" data-action="save">💾 Salvar no Anki + Obsidian</button>
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

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                 10. SETTINGS PANEL                           ║
  // ╚═══════════════════════════════════════════════════════════════╝

  function showSettingsPanel() {
    const existing = document.querySelector('.tec-modal-overlay.tec-settings-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'tec-modal-overlay tec-settings-overlay';
    overlay.innerHTML = `
      <div class="tec-modal tec-settings" style="width:520px">
        <div class="tec-modal-header">
          <h2>⚙️ Configurações — TEC→Anki+Obsidian</h2>
          <button class="tec-modal-close" data-action="close">×</button>
        </div>
        <div class="tec-modal-body">

          <h3>🤖 Gemini AI</h3>
          <div class="tec-field">
            <label>API Key</label>
            <input type="password" id="tec-cfg-gemini-key" value="${getSetting('geminiApiKey')}" placeholder="AIzaSy...">
          </div>
          <div class="tec-field">
            <label>Modelo</label>
            <select id="tec-cfg-gemini-model">
              <option value="gemini-2.5-flash" ${getSetting('geminiModel') === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash (recomendado)</option>
              <option value="gemini-2.5-pro" ${getSetting('geminiModel') === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro (mais preciso)</option>
              <option value="gemini-2.5-flash-lite" ${getSetting('geminiModel') === 'gemini-2.5-flash-lite' ? 'selected' : ''}>gemini-2.5-flash-lite (mais rápido)</option>
            </select>
          </div>

          <hr class="tec-divider">
          <h3>📓 Obsidian</h3>
          <div class="tec-field">
            <label>Método de salvamento</label>
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
          <h3>🗂️ Anki</h3>
          <div class="tec-field">
            <label>Prefixo do Deck</label>
            <input type="text" id="tec-cfg-anki-prefix" value="${getSetting('ankiDeckPrefix')}" placeholder="TEC">
          </div>
          <div class="tec-field">
            <label>Nome do Modelo (Note Type)</label>
            <input type="text" id="tec-cfg-anki-model" value="${getSetting('ankiModelName')}" placeholder="TEC Concursos">
          </div>

          <hr class="tec-divider">
          <h3>⚡ Comportamento</h3>
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
            Clique em "Testar Conexões" para verificar o status.
          </div>

        </div>
        <div class="tec-modal-footer">
          <button class="tec-btn tec-btn-cancel" data-action="test" style="background:#e8f4f8;color:#2196f3">🔌 Testar Conexões</button>
          <button class="tec-btn tec-btn-cancel" data-action="close">Cancelar</button>
          <button class="tec-btn tec-btn-save" data-action="save">💾 Salvar</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', async (e) => {
      const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
      if (action === 'close' || e.target === overlay) { overlay.remove(); }
      if (action === 'save') {
        setSetting('geminiApiKey', overlay.querySelector('#tec-cfg-gemini-key').value);
        setSetting('geminiModel', overlay.querySelector('#tec-cfg-gemini-model').value);
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
        showToast('Configurações salvas!', 'success');
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
          <div>🗂️ AnkiConnect: ${anki ? '<span style="color:#06d6a0">✅ Conectado</span>' : '<span style="color:#ef476f">❌ Não conectado</span> — Verifique se o Anki está aberto com o add-on AnkiConnect (2055492159)'}</div>
          <div style="margin-top:4px">📓 Obsidian REST API: ${obs ? '<span style="color:#06d6a0">✅ Conectado</span>' : '<span style="color:#ef476f">❌ Não conectado</span> — Verifique se o Obsidian está aberto com o plugin Local REST API'}</div>
        `;
      }
    });

    document.body.appendChild(overlay);
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  11. FLOATING TOOLBAR                        ║
  // ╚═══════════════════════════════════════════════════════════════╝

  let statusDot = null;

  function injectToolbar() {
    if (document.getElementById('tec-anki-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'tec-anki-toolbar';
    toolbar.innerHTML = `
      <button class="tec-btn-primary" id="tec-btn-save" title="Salvar questão atual (Shift+Enter)">
        📋 Salvar
      </button>
      <button class="tec-btn-batch" id="tec-btn-batch" title="Processar todos os erros do caderno">
        📋 Erros
      </button>
      <button class="tec-btn-icon" id="tec-btn-settings" title="Configurações">⚙️</button>
      <div class="tec-status-dot" id="tec-status-dot" title="Status das conexões"></div>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('tec-btn-save').addEventListener('click', () => processCurrentQuestion());
    document.getElementById('tec-btn-batch').addEventListener('click', () => processBatchQuestions());
    document.getElementById('tec-btn-settings').addEventListener('click', () => showSettingsPanel());

    statusDot = document.getElementById('tec-status-dot');
    updateStatusDot();

    // Make toolbar draggable
    let isDragging = false, startX, startY, origX, origY;
    toolbar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = toolbar.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      toolbar.style.right = 'auto'; toolbar.style.bottom = 'auto';
      toolbar.style.left = (origX + e.clientX - startX) + 'px';
      toolbar.style.top = (origY + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  async function updateStatusDot() {
    if (!statusDot) return;
    try {
      const [anki, obs] = await Promise.all([
        ankiIsConnected().catch(() => false),
        obsidianIsConnected().catch(() => false),
      ]);
      statusDot.className = 'tec-status-dot';
      if (anki && obs) { statusDot.classList.add('green'); statusDot.title = 'Anki ✅ | Obsidian ✅'; }
      else if (anki || obs) { statusDot.classList.add('yellow'); statusDot.title = `Anki ${anki ? '✅' : '❌'} | Obsidian ${obs ? '✅' : '❌'}`; }
      else { statusDot.classList.add('red'); statusDot.title = 'Anki ❌ | Obsidian ❌'; }
    } catch {
      statusDot.className = 'tec-status-dot red';
    }
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                12. MAIN ORCHESTRATION                        ║
  // ╚═══════════════════════════════════════════════════════════════╝

  let isProcessing = false;

  async function processCurrentQuestion() {
    if (isProcessing) { showToast('Já processando uma questão...', 'warning'); return; }
    isProcessing = true;

    const saveBtn = document.getElementById('tec-btn-save');
    if (saveBtn) saveBtn.innerHTML = '<span class="tec-spinner"></span> Salvando...';

    let loadingToast = null;
    try {
      // Step 0: Expand professor comment if hidden
      loadingToast = showLoadingToast('💬 Expandindo comentário do professor...');
      await ensureCommentExpanded();
      loadingToast.remove();

      // Step 1: Extract
      loadingToast = showLoadingToast('🔍 Extraindo dados da questão...');
      const questionData = extractQuestionData();

      if (!questionData.enunciado && !questionData.id) {
        throw new Error('Não foi possível extrair a questão. Verifique se você está na página de uma questão respondida.');
      }

      loadingToast.remove();
      loadingToast = showLoadingToast('🤖 Gerando flashcards com IA...');

      // Step 2: Generate flashcards with Gemini
      let aiResult = null;
      try {
        aiResult = await callGemini(questionData);
      } catch (err) {
        console.error('Gemini error:', err);
        showToast(`Erro na IA: ${err.message}. Salvando sem flashcards.`, 'warning', 6000);
        aiResult = { materia: questionData.materia, subtopico: questionData.assunto, erro_identificado: '', cards: [] };
      }

      loadingToast.remove();
      loadingToast = null;

      // Step 3: Preview (optional)
      if (getSetting('showPreview')) {
        const confirmed = await showPreviewModal(questionData, aiResult);
        if (!confirmed) {
          showToast('Cancelado pelo usuário.', 'info');
          return;
        }
      }

      // Step 4: Save to Anki + Obsidian in parallel
      loadingToast = showLoadingToast('💾 Salvando no Anki e Obsidian...');
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
        msgs.push(`🗂️ ${ankiResult.value.added}/${ankiResult.value.total} cards → ${ankiResult.value.deckName}`);
      } else if (ankiResult.status === 'rejected') {
        showToast(`Erro Anki: ${ankiResult.reason?.message}`, 'error', 6000);
      }

      if (obsResult.status === 'fulfilled' && obsResult.value) {
        const m = obsResult.value.method;
        if (m === 'rest') msgs.push('📓 Nota salva no Obsidian');
        else if (m === 'uri') msgs.push('📓 Nota aberta no Obsidian');
        else msgs.push('📋 Nota copiada para clipboard');
      } else if (obsResult.status === 'rejected') {
        showToast(`Erro Obsidian: ${obsResult.reason?.message}`, 'error', 6000);
      }

      if (msgs.length) {
        showToast(msgs.join('<br>'), 'success', 5000);
      }

    } catch (err) {
      console.error('TEC→Anki error:', err);
      showToast(`Erro: ${err.message}`, 'error', 8000);
    } finally {
      if (loadingToast) loadingToast.remove();
      if (saveBtn) saveBtn.innerHTML = '📋 Salvar';
      isProcessing = false;
    }
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                13. BATCH PROCESSING                          ║
  // ╚═══════════════════════════════════════════════════════════════╝

  let batchRunning = false;

  /**
   * Navigate to the next question using TEC's keyboard shortcut "→" (ArrowRight).
   * This is the most reliable method — works regardless of DOM structure.
   */
  function navigateToNextQuestion() {
    console.log('➡️ Navegando: pressionando →');
    simulateKey('ArrowRight', 39);
  }

  /**
   * Navigate to the previous question using TEC's keyboard shortcut "←".
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
    return null; // Timeout — page didn't change
  }

  /**
   * Detect total errors in the caderno using multiple strategies.
   * Returns { totalErros, totalQuestoes, currentQ, method }
   */
  function detectCadernoErrors() {
    let totalErros = 0, totalQuestoes = 0, currentQ = 0;
    let method = 'none';
    const bodyText = document.body.innerText;

    // ── 1. Angular scope — caderno/prova/estatistica ──
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

    // ── 2. DOM text — tag visible on page ("4 Erros", "Erros: 4", etc.) ──
    if (!totalErros) {
      const patterns = [
        /(\d+)\s*Erros?\)?/i,
        /Erros?:?\s*(\d+)/i,
        /(\d+)\s*(?:quest[õo]es?\s+)?erradas?/i,
        /(\d+)\s*incorretas?/i,
      ];
      for (const pat of patterns) {
        const m = bodyText.match(pat);
        if (m && parseInt(m[1]) > 0) {
          totalErros = parseInt(m[1]); method = `dom:text`; break;
        }
      }
    }

    // ── 3. Aba Estatísticas — look for the row "Erros   N" ──
    if (!totalErros) {
      // The Estatísticas tab content may already be in DOM (hidden or active)
      const allText = document.body.innerText;
      // Pattern: "↪ Erros" followed by a number (from the stats table)
      const statsMatch = allText.match(/(?:↪|→|->)?\s*Erros\s+(\d+)/i) ||
                         allText.match(/Erros\s+(\d+)\s/i);
      if (statsMatch && parseInt(statsMatch[1]) > 0) {
        totalErros = parseInt(statsMatch[1]); method = 'dom:stats-tab';
      }
    }

    // ── 4. Question count ──
    if (!totalQuestoes) {
      const questInfoMatch = bodyText.match(/Quest[ãa]o\s+(\d+)\s+de\s+(\d+)/i);
      if (questInfoMatch) {
        currentQ = parseInt(questInfoMatch[1]);
        totalQuestoes = parseInt(questInfoMatch[2]);
      }
    }

    console.log(`📊 detectCadernoErrors: erros=${totalErros}, total=${totalQuestoes}, method=${method}`);
    return { totalErros, totalQuestoes, currentQ, method };
  }

  async function processBatchQuestions() {
    if (batchRunning) { showToast('Batch já em andamento...', 'warning'); return; }

    // ── Detect error count (multi-strategy) ──
    const cadernoInfo = detectCadernoErrors();
    let totalErros = cadernoInfo.totalErros;
    const totalQuestoes = cadernoInfo.totalQuestoes;
    const currentQNum = cadernoInfo.currentQ;

    // ── Fallback: ask user to input manually ──
    if (!totalErros) {
      const input = prompt(
        '⚠️ Não foi possível detectar automaticamente o total de erros.\n\n' +
        'Isso pode acontecer quando as tags do caderno não estão visíveis.\n' +
        '💡 Dica: veja na aba "Estatísticas" do caderno.\n\n' +
        `Caderno com ${totalQuestoes || '?'} questões (questão ${currentQNum || '?'} atual).\n\n` +
        'Digite o número de questões ERRADAS neste caderno:',
        ''
      );
      if (input === null) return; // User cancelled
      const parsed = parseInt(input.trim());
      if (!parsed || parsed <= 0 || isNaN(parsed)) {
        showToast('Número inválido. Batch cancelado.', 'warning', 4000);
        return;
      }
      totalErros = parsed;
      console.log(`📊 Total de erros informado manualmente: ${totalErros}`);
    }

    if (!confirm(
      `${cadernoInfo.method !== 'none' ? `Detectados ${totalErros} erros (${cadernoInfo.method})` : `Total informado: ${totalErros} erros`}` +
      ` neste caderno (${totalQuestoes || '?'} questões no total).\n` +
      `Você está na questão ${currentQNum || '?'} de ${totalQuestoes || '?'}.\n\n` +
      `Processar todas as questões erradas a partir da questão ATUAL?\n\n` +
      `⚠️ Isso pode levar alguns minutos. Mantenha o Anki aberto.\n` +
      `💡 O script vai navegar questão por questão (→) e processar só as erradas.`
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
        <div>📋 Batch: <span id="tec-batch-count">0</span>/${totalErros} erros processados</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">Questão <span id="tec-batch-qnum">-</span> | Puladas: <span id="tec-batch-skipped">0</span></div>
        <div class="tec-progress-bar"><div class="tec-progress-fill" id="tec-batch-progress" style="width:0%"></div></div>
        <button id="tec-batch-stop" style="margin-top:8px;padding:4px 12px;border:1px solid #ef476f;background:transparent;color:#ef476f;border-radius:6px;cursor:pointer;font-size:12px;">⏹️ Parar</button>
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
        const qNumMatch = currentBody.match(/Quest[ãa]o\s+(\d+)\s+de\s+(\d+)/i);
        const qNum = qNumMatch ? qNumMatch[1] : '?';
        const qTotal = qNumMatch ? qNumMatch[2] : '?';
        const qNumEl = document.getElementById('tec-batch-qnum');
        if (qNumEl) qNumEl.textContent = `${qNum}/${qTotal}`;

        // Check if this is a wrong question (Angular scope is more reliable)
        const { vm: batchVm } = getAngularVm();
        const isError = (batchVm?.questao?.correcaoQuestao === false) || /Você errou/i.test(currentBody);

        if (isError && !processedIds.has(currentId)) {
          processedIds.add(currentId);
          console.log(`📝 Batch: Processando Q${currentId} (erro ${processed + 1}/${totalErros})`);

          try {
            // Expand comment before extracting
            await ensureCommentExpanded();
            await delay(500);

            const qData = extractQuestionData();
            if (qData.enunciado || qData.id) {
              const aiResult = await callGemini(qData);
              await Promise.allSettled([
                getSetting('enableAnki') ? addCardsToAnki(aiResult, qData) : Promise.resolve(null),
                getSetting('enableObsidian') ? saveToObsidian(qData, aiResult) : Promise.resolve(null),
              ]);
              processed++;
              console.log(`✅ Batch: Q${currentId} processada (${processed}/${totalErros})`);
            }
          } catch (err) {
            console.error(`❌ Batch: Erro em Q${currentId}:`, err);
            errors++;
          }

          // Update progress UI
          document.getElementById('tec-batch-count').textContent = processed;
          document.getElementById('tec-batch-progress').style.width = `${(processed / totalErros) * 100}%`;

          // No need to close comment — navigation handles it
        } else if (!isError) {
          skipped++;
          const skippedEl = document.getElementById('tec-batch-skipped');
          if (skippedEl) skippedEl.textContent = skipped;
        }

        // Check if we've processed all errors
        if (processed >= totalErros) {
          console.log('🎉 Batch: Todos os erros processados!');
          break;
        }

        // Navigate to next question using keyboard shortcut →
        navigateToNextQuestion();

        // Wait for the page to transition to the next question
        const newId = await waitForQuestionChange(currentId, 10000);
        if (!newId) {
          // Page didn't change — we're probably at the last question
          console.log('📍 Batch: Página não mudou. Última questão do caderno.');
          break;
        }
      }
    } finally {
      progressToast.remove();
      batchRunning = false;
      if (batchBtn) batchBtn.innerHTML = '📋 Erros';
      // Persistent toast — stays until user clicks ✕
      const type = processed > 0 ? 'success' : 'warning';
      const icons = { success: '✅', warning: '⚠️' };
      const finalToast = document.createElement('div');
      finalToast.className = `tec-toast ${type}`;
      finalToast.style.pointerEvents = 'auto';
      finalToast.innerHTML = `
        <span>${icons[type]}</span>
        <span>Batch finalizado!<br>✅ ${processed} processadas | ❌ ${errors} erros | ⏭️ ${skipped} puladas (acertos)</span>
        <button style="background:none;border:none;color:inherit;font-size:18px;cursor:pointer;margin-left:8px;padding:2px 6px;opacity:.7;line-height:1;" title="Fechar">✕</button>
      `;
      finalToast.querySelector('button').addEventListener('click', () => {
        finalToast.style.opacity = '0';
        finalToast.style.transition = 'opacity .3s';
        setTimeout(() => finalToast.remove(), 300);
      });
      ensureToastContainer().appendChild(finalToast);
    }
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║              14. KEYBOARD SHORTCUTS                          ║
  // ╚═══════════════════════════════════════════════════════════════╝

  document.addEventListener('keydown', (e) => {
    // Shift+Enter → process current question
    if (e.shiftKey && e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Don't trigger if user is typing in an input
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();
      e.stopPropagation();
      processCurrentQuestion();
    }
  }, true);

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                 15. DISCOVERY MODE                           ║
  // ╚═══════════════════════════════════════════════════════════════╝

  function runDiscovery() {
    console.group('🔍 TEC→Anki Discovery Mode');
    console.log('=== Tentando extrair dados da questão ===');

    const data = extractQuestionData();
    console.log('Dados extraídos:', data);

    console.log('\n=== Elementos encontrados ===');
    for (const [name, selectors] of Object.entries(SEL)) {
      const el = trySelect(selectors);
      console.log(`${name}: ${el ? '✅ ' + el.tagName + '.' + el.className : '❌ não encontrado'}`);
      if (el) console.log(`  Seletores: ${selectors.join(', ')}`);
    }

    console.log('\n=== Todos os elementos com classes relevantes ===');
    const relevant = document.querySelectorAll('[class*="quest"], [class*="enunciado"], [class*="alternativa"], [class*="gabarito"], [class*="comentario"], [class*="materia"], [class*="assunto"]');
    relevant.forEach(el => {
      console.log(`<${el.tagName} class="${el.className}"> — ${el.innerText?.substring(0, 80)}...`);
    });

    console.log('\n=== Navegação (atalhos TEC) ===');
    console.log('→ (ArrowRight) = Questão seguinte');
    console.log('← (ArrowLeft) = Questão anterior');
    console.log('o = Abre/Fecha comentário do professor');
    console.log('Comentário capturado?', _capturedComment ? `✅ (${_capturedComment.length} chars)` : '❌ Não');

    console.log('\n=== Elementos tec-formatar-html ===');
    document.querySelectorAll('[tec-formatar-html]').forEach(el => {
      const attr = el.getAttribute('tec-formatar-html');
      const text = el.innerText.trim();
      console.log(`  [tec-formatar-html="${attr}"] → ${text.length} chars | visible=${el.offsetParent !== null} | "${text.substring(0, 80)}..."`);
    });

    console.log('\n=== Botões/links com ng-click ===');
    document.querySelectorAll('[ng-click]').forEach(el => {
      const ngClick = el.getAttribute('ng-click');
      if (/proxim|next|avanc|anterior|prev|voltar|naveg/i.test(ngClick)) {
        console.log(`  <${el.tagName} class="${el.className}"> ng-click="${ngClick}" → "${el.textContent.trim().substring(0, 40)}"`);
      }
    });

    console.log('\n=== Links/botões "Ver resolução" ===');
    const resolLinks = [...document.querySelectorAll('a, button, span')].filter(el =>
      /ver resolu|resolução|comentário/i.test(el.textContent)
    );
    resolLinks.forEach(el => {
      console.log(`  <${el.tagName} class="${el.className}" href="${el.getAttribute('href') || ''}"> "${el.textContent.trim().substring(0, 50)}"`);
    });

    console.groupEnd();
    showToast('Discovery mode: veja o console (F12) para detalhes.', 'info', 5000);
    return data;
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                  16. INITIALIZATION                          ║
  // ╚═══════════════════════════════════════════════════════════════╝

  GM_registerMenuCommand('⚙️ Configurações', showSettingsPanel);
  GM_registerMenuCommand('🔍 Discovery Mode (debug)', runDiscovery);
  GM_registerMenuCommand('📋 Salvar Questão Atual', processCurrentQuestion);

  function init() {
    // Check if we're on a relevant page (questões, estudo, caderno)
    const url = window.location.href;
    const isRelevant = /quest|estudo|caderno|resolver/i.test(url) ||
                       document.querySelector('[class*="questao"], [class*="enunciado"]');

    // Always inject the toolbar (it's small and non-intrusive)
    injectToolbar();

    // Log init
    console.log('🚀 TEC→Anki+Obsidian v1.0.0 carregado em:', window.location.href);

    // Show confirmation toast on load
    showToast('TEC→Anki+Obsidian carregado! Use <b>Shift+Enter</b> ou o botão 📋', 'success', 4000);

    // Check connections periodically
    updateStatusDot();
    setInterval(updateStatusDot, 60000);

    // Re-inject toolbar on SPA navigation (AngularJS)
    const observer = new MutationObserver(() => {
      if (!document.getElementById('tec-anki-toolbar')) {
        injectToolbar();
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  // Wait for page to be ready, then init — try multiple strategies
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

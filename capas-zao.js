// ==UserScript==
// @name         ESAO – Preencher Exemplar Automático
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Preenche automaticamente o Nr de Exemplar na tabela Alunos Encontrados
// @author       filipegajo
// @match        *://sistemas.esao.eb.mil.br/academico/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ── Painel flutuante ──────────────────────────────────────────────────────

    const painel = document.createElement('div');
    painel.id = 'esao-painel';
    painel.style.cssText = [
        'position:fixed', 'bottom:20px', 'right:20px', 'z-index:99999',
        'background:#fff', 'border:2px solid #336699', 'border-radius:8px',
        'padding:12px', 'width:300px', 'box-shadow:0 4px 12px rgba(0,0,0,.25)',
        'font-family:Arial,sans-serif', 'font-size:13px', 'color:#222',
    ].join(';');

    painel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="color:#336699">ESAO – Exemplar Auto</strong>
            <button id="esao-toggle" style="border:none;background:none;cursor:pointer;font-size:16px;color:#666" title="Minimizar">▾</button>
        </div>
        <div id="esao-corpo">
            <textarea id="esao-json"
                rows="6"
                placeholder='Cole aqui o conteúdo de mapeamento_exemplar.json'
                style="width:100%;box-sizing:border-box;font-size:11px;resize:vertical;border:1px solid #ccc;border-radius:4px;padding:4px"></textarea>
            <button id="esao-btn"
                style="margin-top:6px;width:100%;padding:7px;background:#336699;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold">
                Preencher Automático
            </button>
            <div id="esao-status" style="margin-top:8px;font-size:12px;color:#444;min-height:18px"></div>
        </div>
    `;

    document.body.appendChild(painel);

    // Toggle minimizar
    let minimizado = false;
    document.getElementById('esao-toggle').addEventListener('click', () => {
        minimizado = !minimizado;
        document.getElementById('esao-corpo').style.display = minimizado ? 'none' : '';
        document.getElementById('esao-toggle').textContent = minimizado ? '▸' : '▾';
    });

    // ── Localizar tabela ──────────────────────────────────────────────────────

    function encontrarTabela(doc) {
        const tabelas = doc.querySelectorAll('table');
        for (const tabela of tabelas) {
            const headers = [...tabela.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td')]
                .map(th => th.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
            const temMatricula = headers.some(h => h.includes('matricula') || h.includes('matric'));
            const temExemplar  = headers.some(h => h.includes('exemplar'));
            if (temMatricula && temExemplar) return tabela;
        }
        return null;
    }

    function obterTabela() {
        // Tenta documento principal
        let tabela = encontrarTabela(document);
        if (tabela) return { tabela, doc: document };

        // Tenta dentro de iframes
        for (const iframe of document.querySelectorAll('iframe')) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                tabela = encontrarTabela(iframeDoc);
                if (tabela) return { tabela, doc: iframeDoc };
            } catch (_) {
                // Cross-origin iframe — não acessível
            }
        }
        return null;
    }

    // ── Preencher campos ──────────────────────────────────────────────────────

    function indicesColunas(tabela) {
        const headerRow = tabela.querySelector('thead tr, tr:first-child');
        if (!headerRow) return null;
        const celulas = [...headerRow.querySelectorAll('th, td')];
        const normalizar = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        let idxMatricula = -1, idxExemplar = -1;
        celulas.forEach((cel, i) => {
            const txt = normalizar(cel.textContent);
            if (txt.includes('matricula') || txt.includes('matric')) idxMatricula = i;
            if (txt.includes('exemplar')) idxExemplar = i;
        });
        return (idxMatricula >= 0 && idxExemplar >= 0) ? { idxMatricula, idxExemplar } : null;
    }

    function disparaEvento(input, tipo) {
        input.dispatchEvent(new Event(tipo, { bubbles: true }));
    }

    function preencher(mapeamento) {
        const resultado = obterTabela();
        if (!resultado) {
            return { erro: 'Tabela "Alunos Encontrados" não encontrada.\nNo DevTools, execute:\ndocument.querySelectorAll("table").length' };
        }
        const { tabela } = resultado;

        const indices = indicesColunas(tabela);
        if (!indices) {
            return { erro: 'Colunas "Matrícula" e "Exemplar" não identificadas na tabela.' };
        }
        const { idxMatricula, idxExemplar } = indices;

        // Pula linha de header ao buscar linhas de dados
        const linhas = [...tabela.querySelectorAll('tr')].filter(tr => tr.querySelector('td'));

        let preenchidos = 0, naoEncontrados = [];

        for (const linha of linhas) {
            const celulas = linha.querySelectorAll('td');
            if (celulas.length <= Math.max(idxMatricula, idxExemplar)) continue;

            const matricula = celulas[idxMatricula].textContent.trim().replace(/\.0$/, '');
            const input = celulas[idxExemplar].querySelector('input');

            if (!input) continue;

            const exemplar = mapeamento[matricula];
            if (exemplar) {
                input.value = exemplar;
                disparaEvento(input, 'input');
                disparaEvento(input, 'change');
                preenchidos++;
            } else {
                naoEncontrados.push(matricula);
            }
        }

        return { preenchidos, total: linhas.length, naoEncontrados };
    }

    // ── Botão ─────────────────────────────────────────────────────────────────

    document.getElementById('esao-btn').addEventListener('click', () => {
        const statusDiv = document.getElementById('esao-status');
        const texto = document.getElementById('esao-json').value.trim();

        if (!texto) {
            statusDiv.style.color = '#c00';
            statusDiv.textContent = 'Cole o JSON antes de preencher.';
            return;
        }

        let dados;
        try {
            dados = JSON.parse(texto);
        } catch (e) {
            statusDiv.style.color = '#c00';
            statusDiv.textContent = `JSON inválido: ${e.message}`;
            return;
        }

        // Aceita tanto o JSON com wrapper { mapeamento: {...} } quanto objeto flat
        const mapeamento = dados.mapeamento || dados;

        if (typeof mapeamento !== 'object' || Array.isArray(mapeamento)) {
            statusDiv.style.color = '#c00';
            statusDiv.textContent = 'Formato inválido. Cole o conteúdo completo de mapeamento_exemplar.json.';
            return;
        }

        const res = preencher(mapeamento);

        if (res.erro) {
            statusDiv.style.color = '#c00';
            statusDiv.textContent = res.erro;
            return;
        }

        statusDiv.style.color = res.preenchidos === res.total ? '#060' : '#660';
        let msg = `Preenchidos: ${res.preenchidos} / ${res.total}`;
        if (res.naoEncontrados.length) {
            msg += `\nNão encontrados no JSON: ${res.naoEncontrados.length}`;
            msg += `\n${res.naoEncontrados.join(', ')}`;
        }
        statusDiv.textContent = msg;
    });

})();

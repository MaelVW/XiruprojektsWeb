/* ==========================================================================
   Xiruprojekts – KI-Anbindung (ai.js)
   --------------------------------------------------------------------------
   Wird von allen KI-Seiten NACH core.js geladen. Das ist die einzige Datei
   der Website, die Netzwerkanfragen macht – und nur dann, wenn jemand aktiv
   etwas anfragt (Knopf drücken, Nachricht senden).

   Anbieter (Reihenfolge im Modus „Automatisch"; der gewählte Anbieter zuerst):
     hf            Hugging Face Inference Providers (Router, OpenAI-kompatibel)
     custom        eigener OpenAI-kompatibler Dienst (OpenRouter, LM Studio, Ollama …)
     pollinations  ohne Schlüssel – nur wenn in den Einstellungen eingeschaltet
     offline       immer verfügbar: regelbasiert / prozedural

   API
     XIRU.ai.chat(messages, opts)   -> Promise<string>
         messages: [{ role: 'user'|'assistant'|'system', content }] oder ein String
         opts: system, temperature, maxTokens, onToken(chunk, ganzerText), signal,
               timeout, offline (fn(messages) -> String/Promise oder String),
               fallback (Standard true: bei Fehlern Offline-Antwort), quiet, provider
     XIRU.ai.ask(prompt, opts)      -> Promise<string>   (Kurzform)
     XIRU.ai.image(prompt, opts)    -> Promise<{ url, blob, provider, model, seed, width, height }>
         opts: width, height, seed, style, negative, signal, onStatus(text)
     XIRU.ai.status(kind)           -> { provider, label, model, ready, online, keys, chain, … }
     XIRU.ai.hasOnline(kind)        -> true, wenn ein Online-Dienst eingerichtet ist
     XIRU.ai.test(provider, id)     -> Promise<{ ok, ms, text | error }>  (für Dienste & Schlüssel)
     XIRU.ai.last                   -> Infos zur letzten Anfrage
     XIRU.ai.on('call'|'start'|'rotate', fn)
     XIRU.ai.extractJSON(text)      -> { text, data }   JSON-Block robust aus einer Antwort lösen
     XIRU.ai.visibleText(text)      -> Text ohne (halb gestreamten) JSON-Block
     XIRU.ai.md(text)               -> sicheres Mini-Markdown als HTML
     XIRU.ai.ui.status(el, {kind})  XIRU.ai.ui.stream(el)  XIRU.ai.ui.dots()
     XIRU.ai.offline.{ chat, image, rng, hash, pick, fill, markov, name, noise }
     Verwaltung: config(), settings(), setSettings(), addKey(), updateKey(),
                 removeKey(), moveKey(), clearKeys(), mask()

   Schlüssel liegen ausschliesslich in XIRU.keys (localStorage, pro Konto,
   nie im Export). Sie werden nie geloggt und nie in URLs geschrieben.
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU;
    if (!X || !X.keys) { console.error('[XIRU.ai] core.js muss vor ai.js geladen werden.'); return; }
    const AI = X.ai = {};

    /* ── Endpunkte & Modelle ────────────────────────────────────────────── */
    const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
    const HF_IMAGE_URL = 'https://router.huggingface.co/hf-inference/models/';
    const POLL_TEXT_URL = 'https://text.pollinations.ai/openai';
    const POLL_IMAGE_URL = 'https://image.pollinations.ai/prompt/';

    AI.providers = {
        hf: { n: 'Hugging Face', icon: '🤗' },
        custom: { n: 'Eigener Dienst', icon: '⚙' },
        pollinations: { n: 'Pollinations', icon: '🐝' },
        offline: { n: 'Offline-Modus', icon: '◌' }
    };
    AI.models = {
        hfChat: [
            { id: 'meta-llama/Llama-3.1-8B-Instruct', n: 'Llama 3.1 8B', d: 'Standard – schnell und solide' },
            { id: 'Qwen/Qwen2.5-7B-Instruct', n: 'Qwen 2.5 7B', d: 'gut in Deutsch und Französisch' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.3', n: 'Mistral 7B v0.3', d: 'kompakt, europäisch' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', n: 'Qwen 2.5 72B', d: 'deutlich klüger, braucht mehr Guthaben' },
            { id: 'meta-llama/Llama-3.3-70B-Instruct', n: 'Llama 3.3 70B', d: 'gross und gesprächig' }
        ],
        hfImage: [
            { id: 'black-forest-labs/FLUX.1-schnell', n: 'FLUX.1 schnell', d: 'Standard – schnell und detailreich' },
            { id: 'stabilityai/stable-diffusion-xl-base-1.0', n: 'Stable Diffusion XL', d: 'der Klassiker' }
        ]
    };
    const DEFAULT_SETTINGS = {
        mode: 'auto',                       // auto | hf | custom | pollinations | offline
        hfModel: AI.models.hfChat[0].id,
        hfImageModel: AI.models.hfImage[0].id,
        pollinations: false,                // nur bei ausdrücklicher Zustimmung
        rotation: 'order',                  // order (erst der erste) | roundrobin (reihum)
        stream: true
    };
    const ROTATE = new Set([401, 402, 403, 429, 503]);

    /* ── Fehler ─────────────────────────────────────────────────────────── */
    class AIError extends Error {
        constructor(code, message, extra) {
            super(message);
            this.name = 'AIError'; this.code = code;
            if (extra) Object.assign(this, extra);
        }
    }
    AI.AIError = AIError;

    /* ── Speicher (nur über XIRU.keys) ──────────────────────────────────── */
    function load() {
        let c = X.keys.all();
        if (!c || typeof c !== 'object' || Array.isArray(c)) c = {};
        c.v = 1;
        c.hf = Array.isArray(c.hf) ? c.hf.filter(e => e && typeof e === 'object') : [];
        c.custom = Array.isArray(c.custom) ? c.custom.filter(e => e && typeof e === 'object') : [];
        c.settings = Object.assign({}, DEFAULT_SETTINGS, c.settings || {});
        c.rr = c.rr && typeof c.rr === 'object' ? c.rr : {};
        c.pollStats = c.pollStats && typeof c.pollStats === 'object' ? c.pollStats : {};
        return c;
    }
    function save(c) { X.keys.set(c); }
    function mutate(fn) { const c = load(); const r = fn(c); save(c); return r; }
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    AI.config = load;
    AI.settings = () => load().settings;
    AI.setSettings = patch => mutate(c => { Object.assign(c.settings, patch || {}); return c.settings; });
    AI.addKey = function (prov, data) {
        if (prov !== 'hf' && prov !== 'custom') throw new AIError('arg', 'Unbekannter Anbieter.');
        return mutate(c => {
            const e = Object.assign({ id: uid(), label: '', added: Date.now(), day: X.today(), today: 0, total: 0, ok: 0, fails: 0 }, data || {});
            c[prov].push(e);
            return e.id;
        });
    };
    AI.updateKey = (prov, id, patch) => mutate(c => { const e = (c[prov] || []).find(x => x.id === id); if (e) Object.assign(e, patch); return !!e; });
    AI.removeKey = (prov, id) => mutate(c => { const n = c[prov].length; c[prov] = c[prov].filter(x => x.id !== id); return c[prov].length < n; });
    AI.moveKey = (prov, id, dir) => mutate(c => {
        const a = c[prov], i = a.findIndex(x => x.id === id), j = i + (dir < 0 ? -1 : 1);
        if (i < 0 || j < 0 || j >= a.length) return false;
        const t = a[i]; a[i] = a[j]; a[j] = t; return true;
    });
    AI.clearKeys = () => mutate(c => { c.hf = []; c.custom = []; c.rr = {}; c.pollStats = {}; });
    AI.resetStats = () => mutate(c => {
        c.hf.concat(c.custom).forEach(e => Object.assign(e, { today: 0, total: 0, ok: 0, fails: 0, lastError: null, lastStatus: null, lastErrorAt: 0, pausedUntil: 0 }));
        c.pollStats = {};
    });
    AI.mask = function (s) {
        s = String(s || '');
        if (!s) return '';
        if (s.length < 12) return '•'.repeat(Math.min(8, s.length));
        const pre = /^[a-z]{2,4}[_-]/i.test(s) ? s.slice(0, s.indexOf(s.match(/[_-]/)[0]) + 1) : s.slice(0, 2);
        return pre + '•'.repeat(8) + s.slice(-4);
    };
    // Schlüssel aus einem Text entfernen (falls ein Anbieter etwas zurückspiegelt)
    function scrub(text) {
        let t = String(text || '');
        try {
            const c = load();
            c.hf.map(e => e.token).concat(c.custom.map(e => e.key)).filter(k => k && k.length > 6)
                .forEach(k => { t = t.split(k).join('••••'); });
        } catch (e) { /* egal */ }
        return t.replace(/\bhf_[A-Za-z0-9]{10,}|\bsk-[A-Za-z0-9_-]{20,}/g, '••••');
    }

    /* ── Ereignisse ─────────────────────────────────────────────────────── */
    const listeners = {};
    AI.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
    function emitAI(ev, data) { (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
    AI.last = null;
    function setLast(info) { AI.last = Object.assign({ at: Date.now() }, info); emitAI('call', AI.last); }

    /* ── Statistik pro Schlüssel ────────────────────────────────────────── */
    function statEntry(c, p, id) {
        if (p === 'pollinations') return c.pollStats;
        return (c[p] || []).find(e => e.id === id) || null;
    }
    function noteAttempt(p, id) {
        mutate(c => {
            const e = statEntry(c, p, id); if (!e) return;
            const d = X.today();
            if (e.day !== d) { e.day = d; e.today = 0; }
            e.today = (e.today || 0) + 1; e.total = (e.total || 0) + 1; e.lastUsed = Date.now();
        });
    }
    function noteOk(p, id) {
        mutate(c => {
            const e = statEntry(c, p, id); if (!e) return;
            e.ok = (e.ok || 0) + 1; e.lastOkAt = Date.now(); e.pausedUntil = 0;
            if (id) c.rr[p] = id;
        });
    }
    function pauseFor(err) {
        switch (err.status) {
            case 429: return Math.min(600, Math.max(20, err.retryAfter || 60)) * 1000;
            case 401: case 403: return 5 * 60000;
            case 402: return 60 * 60000;
            default: return 0;
        }
    }
    function noteError(p, id, err) {
        mutate(c => {
            const e = statEntry(c, p, id); if (!e) return;
            e.fails = (e.fails || 0) + 1;
            e.lastError = err.message; e.lastStatus = err.status || null; e.lastErrorAt = Date.now();
            const ms = pauseFor(err);
            if (ms) e.pausedUntil = Date.now() + ms;
        });
    }
    AI.unpause = (prov, id) => AI.updateKey(prov, id, { pausedUntil: 0 });

    /* ── Welche Anbieter sind bereit? ───────────────────────────────────── */
    const ORDER = ['hf', 'custom', 'pollinations'];
    function entryUsable(p, e, kind) {
        if (p === 'hf') return !!e.token;
        if (p === 'custom') return !!e.base && (kind !== 'image' || !!e.imageModel);
        return false;
    }
    function isReady(c, p, kind) {
        if (p === 'pollinations') return !!c.settings.pollinations;
        if (p === 'hf' || p === 'custom') return c[p].some(e => entryUsable(p, e, kind));
        return false;
    }
    function chainFor(c, kind, forced) {
        if (forced) return forced === 'offline' ? [] : (isReady(c, forced, kind) ? [forced] : []);
        const mode = c.settings.mode;
        if (mode === 'offline') return [];
        const order = ORDER.includes(mode) ? [mode].concat(ORDER.filter(p => p !== mode)) : ORDER;
        return order.filter(p => isReady(c, p, kind));
    }
    function notReadyMsg(p, kind) {
        if (p === 'hf') return 'Kein Hugging-Face-Schlüssel hinterlegt.';
        if (p === 'custom') return kind === 'image' ? 'Kein eigener Dienst mit Bildmodell eingerichtet.' : 'Kein eigener Dienst eingerichtet.';
        if (p === 'pollinations') return 'Pollinations ist in den Einstellungen ausgeschaltet.';
        return 'Kein KI-Dienst eingerichtet.';
    }
    function modelOf(c, p, kind, e) {
        if (p === 'hf') return kind === 'image' ? c.settings.hfImageModel : c.settings.hfModel;
        if (p === 'custom') { const x = e || c.custom.find(y => entryUsable('custom', y, kind)); return x ? (kind === 'image' ? x.imageModel : (x.model || 'local-model')) : null; }
        if (p === 'pollinations') return kind === 'image' ? 'flux' : 'openai';
        return null;
    }

    AI.status = function (kind) {
        kind = kind || 'chat';
        const c = load(), chain = chainFor(c, kind), p = chain[0] || 'offline', now = Date.now();
        const active = a => a.filter(e => !(e.pausedUntil > now)).length;
        return {
            provider: p, label: AI.providers[p].n, icon: AI.providers[p].icon,
            model: modelOf(c, p, kind), ready: chain.length > 0, online: chain.length > 0,
            chain, mode: c.settings.mode, pollinations: !!c.settings.pollinations,
            keys: { hf: c.hf.length, hfActive: active(c.hf), custom: c.custom.length, customActive: active(c.custom) },
            last: AI.last
        };
    };
    AI.hasOnline = kind => chainFor(load(), kind || 'chat').length > 0;

    /* ── Netzwerk-Hilfen ────────────────────────────────────────────────── */
    const sleep = (ms, signal) => new Promise((res, rej) => {
        const t = setTimeout(res, ms);
        if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(new AIError('abort', 'Abgebrochen.')); }, { once: true });
    });
    function controller(ms, outer) {
        const ctl = new AbortController();
        let timer = null, reason = null, onOuter = null;
        const arm = () => { clearTimeout(timer); timer = setTimeout(() => { reason = 'timeout'; ctl.abort(); }, ms); };
        arm();
        if (outer) {
            if (outer.aborted) { reason = 'user'; ctl.abort(); }
            else { onOuter = () => { reason = 'user'; ctl.abort(); }; outer.addEventListener('abort', onOuter); }
        }
        return {
            signal: ctl.signal, bump: arm,
            get reason() { return reason; },
            clear() { clearTimeout(timer); if (outer && onOuter) outer.removeEventListener('abort', onOuter); }
        };
    }
    function toAIError(e, ctl, p) {
        if (e instanceof AIError) return e;
        if (e && e.name === 'AbortError') {
            return ctl && ctl.reason === 'timeout'
                ? new AIError('timeout', 'Zeitüberschreitung – ' + (AI.providers[p] ? AI.providers[p].n : 'der Anbieter') + ' hat nicht rechtzeitig geantwortet.')
                : new AIError('abort', 'Abgebrochen.');
        }
        if (e instanceof TypeError) {
            return new AIError('network', p === 'custom'
                ? 'Keine Verbindung zum eigenen Dienst. Läuft der Server, stimmt die Adresse und ist CORS erlaubt?'
                : 'Keine Verbindung zu ' + (AI.providers[p] ? AI.providers[p].n : 'dem Anbieter') + '. Bist du online?');
        }
        return new AIError('unknown', 'Unerwarteter Fehler: ' + scrub(e && e.message ? e.message : String(e)));
    }
    function httpMessage(status, p, retryAfter) {
        const who = AI.providers[p] ? AI.providers[p].n : 'Der Anbieter';
        switch (status) {
            case 400: return 'Die Anfrage wurde abgelehnt (400). Passt das Modell zu diesem Dienst?';
            case 401: return 'Schlüssel ungültig oder abgelaufen (401).';
            case 402: return 'Das Gratis-Kontingent bzw. Guthaben dieses Kontos ist aufgebraucht (402).';
            case 403: return p === 'hf'
                ? 'Keine Berechtigung (403). Der Token braucht „Make calls to Inference Providers" – bei Llama-Modellen evtl. zuerst die Lizenz auf der Modellseite akzeptieren.'
                : 'Keine Berechtigung (403).';
            case 404: return 'Modell oder Adresse nicht gefunden (404). Prüf den Modellnamen.';
            case 408: return 'Zeitüberschreitung beim Anbieter (408).';
            case 413: return 'Die Anfrage ist zu gross (413). Kürze den Text.';
            case 422: return who + ' versteht die Anfrage nicht (422).';
            case 429: return 'Zu viele Anfragen (429). Der Schlüssel macht kurz Pause' + (retryAfter ? ' (ca. ' + retryAfter + ' s)' : '') + '.';
            case 503: return 'Das Modell lädt gerade oder ist überlastet (503). Versuch es gleich nochmal.';
            case 500: case 502: case 504: return who + ' hat gerade technische Probleme (' + status + ').';
            default: return who + ' meldet Fehler ' + status + '.';
        }
    }
    async function httpError(res, p) {
        let detail = '', wait = 0;
        try {
            const raw = await res.text();
            try {
                const j = JSON.parse(raw);
                const m = j.error && (j.error.message || j.error) || j.message || j.detail || '';
                detail = typeof m === 'string' ? m : JSON.stringify(m);
                if (j.estimated_time) wait = Math.ceil(+j.estimated_time) || 0;
            } catch (e) { detail = raw; }
        } catch (e) { /* kein Text */ }
        const ra = parseInt(res.headers.get('retry-after'), 10);
        const retryAfter = isFinite(ra) && ra > 0 ? ra : 0;
        return new AIError('http', httpMessage(res.status, p, retryAfter), {
            status: res.status, retryAfter, wait, detail: scrub(String(detail).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 220)
        });
    }

    /* ── Denk-Blöcke (<think>…</think>) aus Antworten filtern ───────────── */
    function clean(text) {
        let t = String(text || '');
        t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
        if (/<\/think>/i.test(t)) t = t.replace(/^[\s\S]*?<\/think>/i, '');
        t = t.replace(/<think>[\s\S]*$/i, '');
        return t.replace(/^\s+/, '').replace(/\s+$/, '');
    }
    function makeEmitter(onToken) {
        let inThink = false, pend = '', full = '', started = false;
        const OPEN = '<think>', CLOSE = '</think>';
        const partial = (s, tag) => { for (let k = Math.min(tag.length - 1, s.length); k > 0; k--) if (tag.startsWith(s.slice(-k).toLowerCase())) return k; return 0; };
        function out(s) {
            if (!s) return;
            if (!started) { s = s.replace(/^\s+/, ''); if (!s) return; started = true; }
            full += s;
            if (onToken) { try { onToken(s, full); } catch (e) { console.error(e); } }
        }
        return {
            push(chunk) {
                pend += chunk || '';
                for (;;) {
                    if (inThink) {
                        const i = pend.toLowerCase().indexOf(CLOSE);
                        if (i < 0) { pend = pend.slice(-(CLOSE.length - 1)); return; }
                        pend = pend.slice(i + CLOSE.length); inThink = false;
                    } else {
                        const i = pend.toLowerCase().indexOf(OPEN);
                        if (i < 0) { const k = partial(pend, OPEN); out(pend.slice(0, pend.length - k)); pend = pend.slice(pend.length - k); return; }
                        out(pend.slice(0, i)); pend = pend.slice(i + OPEN.length); inThink = true;
                    }
                }
            },
            flush() { if (!inThink) out(pend); pend = ''; },
            get emitted() { return full.length > 0; },
            get text() { return full; }
        };
    }

    function contentOf(choice) {
        if (!choice) return '';
        const m = choice.message || choice.delta || {};
        let c = m.content != null ? m.content : (choice.text != null ? choice.text : '');
        if (Array.isArray(c)) c = c.map(x => typeof x === 'string' ? x : (x && x.text) || '').join('');
        return typeof c === 'string' ? c : '';
    }
    async function readSSE(res, ctl, push) {
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = '', all = '';
        const handle = line => {
            line = line.trim();
            if (!line.startsWith('data:')) return false;
            const data = line.slice(5).trim();
            if (data === '[DONE]') return true;
            let j; try { j = JSON.parse(data); } catch (e) { return false; }
            if (j.error) throw new AIError('stream', 'Der Anbieter hat die Antwort abgebrochen: ' + scrub(j.error.message || j.error).toString().slice(0, 160), { status: j.error.code || null });
            const d = contentOf(j.choices && j.choices[0]);
            if (d) { all += d; push(d); }
            return false;
        };
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            ctl.bump();
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, i); buf = buf.slice(i + 1);
                if (handle(line)) { try { reader.cancel(); } catch (e) { } return all; }
            }
        }
        if (buf) handle(buf);
        return all;
    }
    function parseCompletion(raw) {
        const t = String(raw || '').trim();
        if (!t) return '';
        if (t[0] === '{') {
            const j = JSON.parse(t);
            if (j.error) throw new AIError('http', 'Der Anbieter meldet: ' + scrub(j.error.message || j.error).toString().slice(0, 160));
            return contentOf(j.choices && j.choices[0]) || j.generated_text || j.content || '';
        }
        if (t.startsWith('data:')) {   // Server hat trotzdem gestreamt
            return t.split('\n').map(l => l.trim()).filter(l => l.startsWith('data:') && l !== 'data: [DONE]')
                .map(l => { try { return contentOf(JSON.parse(l.slice(5)).choices[0]); } catch (e) { return ''; } }).join('');
        }
        return t;   // reiner Text
    }

    /* OpenAI-kompatibler Chat-Aufruf (HF-Router, eigener Dienst, Pollinations) */
    async function oaChat(p, url, headers, model, msgs, opts) {
        const stream = !!opts.onToken && opts.stream !== false && load().settings.stream !== false;
        const body = { model, messages: msgs, max_tokens: opts.maxTokens || 700, temperature: opts.temperature == null ? 0.8 : opts.temperature, stream };
        if (p === 'pollinations') body.private = true;
        const ctl = controller(opts.timeout || 90000, opts.signal);
        const em = makeEmitter(opts.onToken);
        try {
            const res = await fetch(url, {
                method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
                body: JSON.stringify(body), signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer'
            });
            if (!res.ok) throw await httpError(res, p);
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            let text;
            if (stream && res.body && ct.includes('event-stream')) text = await readSSE(res, ctl, em.push);
            else { text = parseCompletion(await res.text()); em.push(text); }
            em.flush();
            text = clean(text);
            if (!text) throw new AIError('empty', 'Der Anbieter hat eine leere Antwort geschickt.');
            return text;
        } catch (e) {
            const err = toAIError(e, ctl, p);
            if (em.emitted && err.code !== 'abort') err.partial = em.text;
            throw err;
        } finally { ctl.clear(); }
    }
    function joinURL(base, path) {
        let b = String(base || '').trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(b)) throw new AIError('config', 'Die Adresse des eigenen Dienstes muss mit http:// oder https:// beginnen.');
        if (b.endsWith('/' + path)) return b;
        if (/\/chat\/completions$/.test(b)) b = b.replace(/\/chat\/completions$/, '');
        return b + '/' + path;
    }

    /* Bild laden (mit Zeitlimit), liefert Blob */
    async function fetchImage(url, init, opts, p) {
        const ctl = controller(opts.timeout || 150000, opts.signal);
        try {
            const res = await fetch(url, Object.assign({ signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }, init));
            if (!res.ok) throw await httpError(res, p);
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('json')) {
                const j = await res.json();
                if (j && j.data && j.data[0]) return await dataToBlob(j.data[0], opts, p);
                throw new AIError('http', 'Der Anbieter hat kein Bild geschickt' + (j && j.error ? ': ' + scrub(j.error.message || j.error).toString().slice(0, 120) : '.'));
            }
            const blob = await res.blob();
            if (!blob.size) throw new AIError('empty', 'Der Anbieter hat ein leeres Bild geschickt.');
            return blob;
        } catch (e) { throw toAIError(e, ctl, p); }
        finally { ctl.clear(); }
    }
    async function dataToBlob(d, opts, p) {
        if (d.b64_json) {
            const bin = atob(d.b64_json), u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            return new Blob([u8], { type: 'image/png' });
        }
        if (d.url) return fetchImage(d.url, { method: 'GET' }, opts, p);
        throw new AIError('empty', 'Der Anbieter hat kein Bild geschickt.');
    }

    /* ── Anbieter ───────────────────────────────────────────────────────── */
    const PROV = {
        hf: {
            chat: (e, c, msgs, o) => oaChat('hf', HF_CHAT_URL, { Authorization: 'Bearer ' + e.token }, o.model || c.settings.hfModel, msgs, o),
            async image(e, c, prompt, o) {
                const model = o.model || c.settings.hfImageModel;
                const url = HF_IMAGE_URL + model.split('/').map(encodeURIComponent).join('/');
                const headers = { Authorization: 'Bearer ' + e.token, 'Content-Type': 'application/json' };
                const params = { width: o.width, height: o.height, seed: o.seed };
                if (o.negative) params.negative_prompt = o.negative;
                const send = body => fetchImage(url, { method: 'POST', headers, body: JSON.stringify(body) }, o, 'hf');
                try { return await send({ inputs: prompt, parameters: params }); }
                catch (err) {
                    if (err.status === 400 || err.status === 422) return send({ inputs: prompt });   // Modell mag die Parameter nicht
                    if (err.status === 503 && err.wait && err.wait <= 45) {
                        if (o.onStatus) o.onStatus('Das Modell wird geweckt … ca. ' + err.wait + ' s');
                        await sleep(err.wait * 1000, o.signal);
                        return send({ inputs: prompt, parameters: params });
                    }
                    throw err;
                }
            }
        },
        custom: {
            chat(e, c, msgs, o) {
                const h = {}; if (e.key) h.Authorization = 'Bearer ' + e.key;
                return oaChat('custom', joinURL(e.base, 'chat/completions'), h, e.model || 'local-model', msgs, o);
            },
            image(e, c, prompt, o) {
                const h = { 'Content-Type': 'application/json' }; if (e.key) h.Authorization = 'Bearer ' + e.key;
                return fetchImage(joinURL(e.base, 'images/generations'), {
                    method: 'POST', headers: h,
                    body: JSON.stringify({ model: e.imageModel, prompt, n: 1, size: o.width + 'x' + o.height, response_format: 'b64_json' })
                }, o, 'custom');
            }
        },
        pollinations: {
            chat: (e, c, msgs, o) => oaChat('pollinations', POLL_TEXT_URL, {}, 'openai', msgs, o),
            image(e, c, prompt, o) {
                const url = POLL_IMAGE_URL + encodeURIComponent(prompt.slice(0, 900)) +
                    '?width=' + o.width + '&height=' + o.height + '&seed=' + o.seed + '&nologo=true&private=true&model=flux';
                return fetchImage(url, { method: 'GET' }, o, 'pollinations');
            }
        }
    };

    /* Einen Anbieter mit allen passenden Schlüsseln durchprobieren (Rotation) */
    async function runEntries(p, kind, fn) {
        if (p === 'pollinations') {
            noteAttempt(p, null);
            try { const r = await fn(null); noteOk(p, null); return r; }
            catch (err) { if (err.code !== 'abort') noteError(p, null, err); throw err; }
        }
        const c = load();
        let list = c[p].filter(e => entryUsable(p, e, kind));
        if (!list.length) throw new AIError('nokey', notReadyMsg(p, kind));
        if (c.settings.rotation === 'roundrobin' && list.length > 1) {
            const i = list.findIndex(e => e.id === c.rr[p]);
            if (i >= 0) list = list.slice(i + 1).concat(list.slice(0, i + 1));
        }
        const now = Date.now();
        const active = list.filter(e => !(e.pausedUntil > now));
        if (!active.length) {
            const soon = Math.max(1, Math.round((Math.min.apply(null, list.map(e => e.pausedUntil)) - now) / 1000));
            throw new AIError('paused', 'Alle Schlüssel für ' + AI.providers[p].n + ' machen gerade Pause. Wieder bereit in ca. ' + (soon > 90 ? Math.round(soon / 60) + ' min' : soon + ' s') + '.');
        }
        let lastErr = null;
        for (let i = 0; i < active.length; i++) {
            const e = active[i];
            noteAttempt(p, e.id);
            try { const r = await fn(e); noteOk(p, e.id); return r; }
            catch (err) {
                if (err.code === 'abort') throw err;
                noteError(p, e.id, err);
                lastErr = err;
                if (!ROTATE.has(err.status) || err.partial) throw err;
                if (i < active.length - 1) emitAI('rotate', { provider: p, from: e.label || AI.mask(e.token || e.key), status: err.status });
            }
        }
        throw lastErr;
    }

    /* ── Hinweis beim Ausweichen auf offline ────────────────────────────── */
    let lastNotice = 0;
    function notifyFallback(err) {
        if (Date.now() - lastNotice < 15000) return;
        lastNotice = Date.now();
        X.toast('KI-Dienst nicht erreichbar', err.message + ' Der Offline-Modus springt ein.', { icon: '⚠', type: 'error', time: 6500 });
    }

    function normMessages(messages, system) {
        let list = typeof messages === 'string' ? [{ role: 'user', content: messages }] : (Array.isArray(messages) ? messages : []);
        list = list.map(m => ({
            role: m.role === 'ai' || m.role === 'assistant' || m.r === 'ai' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: String(m.content != null ? m.content : (m.t != null ? m.t : ''))
        })).filter(m => m.content.trim());
        if (system && !(list[0] && list[0].role === 'system')) list.unshift({ role: 'system', content: String(system) });
        // Kontext begrenzen: älteste Nachrichten (ausser System) fallen weg
        const size = () => list.reduce((s, m) => s + m.content.length, 0);
        while (size() > 24000 && list.length > 2) list.splice(list[0].role === 'system' ? 1 : 0, 1);
        return list;
    }

    async function offlineChat(msgs, opts) {
        if (!opts.instant) await sleep(260 + Math.random() * 520, opts.signal);
        let out;
        if (typeof opts.offline === 'function') out = await opts.offline(msgs, opts);
        else if (typeof opts.offline === 'string') out = opts.offline;
        else out = AI.offline.chat(msgs, opts);
        out = String(out == null ? '' : out);
        if (opts.onToken && out) { try { opts.onToken(out, out); } catch (e) { console.error(e); } }
        return out;
    }

    /* ── Öffentliche Aufrufe ────────────────────────────────────────────── */
    AI.chat = async function (messages, opts) {
        opts = opts || {};
        const msgs = normMessages(messages, opts.system);
        const c = load();
        const forced = opts.provider && opts.provider !== 'offline' ? opts.provider : null;
        const chain = opts.provider === 'offline' ? [] : chainFor(c, 'chat', forced);
        if (forced && !chain.length) throw new AIError('nokey', notReadyMsg(forced, 'chat'));
        const t0 = performance.now(), errors = [];
        emitAI('start', { kind: 'chat' });
        for (const p of chain) {
            try {
                const text = await runEntries(p, 'chat', e => PROV[p].chat(e, c, msgs, opts));
                setLast({ kind: 'chat', provider: p, model: opts.model || modelOf(c, p, 'chat'), ms: Math.round(performance.now() - t0), fallback: false, error: errors[0] ? errors[0].message : null });
                return text;
            } catch (err) {
                if (err.code === 'abort') { setLast({ kind: 'chat', provider: p, aborted: true }); throw err; }
                if (err.partial) {
                    setLast({ kind: 'chat', provider: p, ms: Math.round(performance.now() - t0), error: err.message, partial: true });
                    if (!opts.quiet) X.toast('Verbindung unterbrochen', 'Die Antwort ist unvollständig. ' + err.message, { icon: '⚠', type: 'error' });
                    return clean(err.partial) + ' …';
                }
                errors.push(err);
                if (forced) break;
            }
        }
        if (errors.length && (opts.fallback === false || forced)) {
            setLast({ kind: 'chat', provider: chain[0], ms: Math.round(performance.now() - t0), error: errors[0].message });
            throw errors[0];
        }
        const text = await offlineChat(msgs, opts);
        setLast({ kind: 'chat', provider: 'offline', model: null, ms: Math.round(performance.now() - t0), fallback: errors.length > 0, error: errors[0] ? errors[0].message : null });
        if (errors.length && !opts.quiet) notifyFallback(errors[0]);
        return text;
    };
    AI.ask = (prompt, opts) => AI.chat([{ role: 'user', content: String(prompt || '') }], opts);

    const snap = v => Math.max(256, Math.min(1536, Math.round((+v || 1024) / 64) * 64));
    AI.image = async function (prompt, opts) {
        prompt = String(prompt || '').trim();
        if (!prompt) throw new AIError('empty', 'Bitte beschreib zuerst, was auf dem Bild sein soll.');
        const o = Object.assign({}, opts || {});
        o.width = snap(o.width); o.height = snap(o.height);
        if (o.seed == null || o.seed === '' || !isFinite(+o.seed)) o.seed = Math.floor(Math.random() * 2147483646);
        o.seed = Math.abs(Math.floor(+o.seed)) % 2147483647;
        const c = load();
        const forced = o.provider && o.provider !== 'offline' ? o.provider : null;
        const chain = o.provider === 'offline' ? [] : chainFor(c, 'image', forced);
        if (forced && !chain.length) throw new AIError('nokey', notReadyMsg(forced, 'image'));
        const t0 = performance.now(), errors = [];
        emitAI('start', { kind: 'image' });
        for (const p of chain) {
            try {
                const blob = await runEntries(p, 'image', e => PROV[p].image(e, c, prompt, o));
                const res = { blob, url: URL.createObjectURL(blob), provider: p, model: o.model || modelOf(c, p, 'image'), seed: o.seed, width: o.width, height: o.height, offline: false };
                setLast({ kind: 'image', provider: p, model: res.model, ms: Math.round(performance.now() - t0), fallback: false, error: errors[0] ? errors[0].message : null });
                return res;
            } catch (err) {
                if (err.code === 'abort') { setLast({ kind: 'image', provider: p, aborted: true }); throw err; }
                errors.push(err);
                if (forced) break;
            }
        }
        if (errors.length && (o.fallback === false || forced)) {
            setLast({ kind: 'image', provider: chain[0], error: errors[0].message });
            throw errors[0];
        }
        const r = await AI.offline.image(prompt, o);
        setLast({ kind: 'image', provider: 'offline', model: r.model, ms: Math.round(performance.now() - t0), fallback: errors.length > 0, error: errors[0] ? errors[0].message : null });
        if (errors.length && !o.quiet) notifyFallback(errors[0]);
        return Object.assign(r, { provider: 'offline', offline: true, error: errors[0] ? errors[0].message : null });
    };

    /* Einzelnen Schlüssel / Dienst testen (Mini-Anfrage, ignoriert Pausen) */
    AI.test = async function (p, id) {
        const t0 = performance.now();
        const c = load();
        const msgs = [{ role: 'user', content: 'Antworte nur mit dem einen Wort: Bereit' }];
        const o = { maxTokens: 16, temperature: 0, timeout: 45000, stream: false };
        let e = null;
        try {
            if (p !== 'pollinations') {
                e = (c[p] || []).find(x => x.id === id);
                if (!e) throw new AIError('nokey', 'Eintrag nicht gefunden.');
            }
            noteAttempt(p, e && e.id);
            const text = await PROV[p].chat(e, c, msgs, o);
            noteOk(p, e && e.id);
            return { ok: true, ms: Math.round(performance.now() - t0), text: clean(text).slice(0, 120), model: p === 'custom' ? (e.model || 'local-model') : modelOf(c, p, 'chat') };
        } catch (err0) {
            const err = toAIError(err0, null, p);
            if (err.code !== 'nokey') noteError(p, e && e.id, err);
            return { ok: false, ms: Math.round(performance.now() - t0), error: err.message, status: err.status || null, detail: err.detail || '' };
        }
    };

    /* ── JSON robust aus Antworten lösen ────────────────────────────────── */
    const fixup = t => t.replace(/\/\/[^\n"]*$/gm, '')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,]\s*)([A-Za-zÄÖÜäöü_][\wÄÖÜäöü]*)\s*:/g, '$1"$2":');
    function looseParse(s) {
        s = String(s || '').trim();
        if (!s) return null;
        try { return JSON.parse(s); } catch (e) { /* weiter */ }
        const body = s.replace(/^[^{[]*/, '');
        if (!body) return null;
        const trimmed = /[}\]]/.test(body) ? body.replace(/[^}\]]*$/, '') : body;
        const t = fixup(trimmed);
        try { return JSON.parse(t); } catch (e) { /* weiter */ }
        const t2 = t.replace(/[“”„]/g, '"').replace(/:\s*'([^'\n]*)'/g, ': "$1"').replace(/\[\s*'|'\s*,\s*'|'\s*\]/g, m => m.replace(/'/g, '"'));
        try { return JSON.parse(t2); } catch (e) { /* weiter */ }
        // abgeschnitten? Offene Zeichenkette und Klammern schliessen
        const u = fixup(body).replace(/[,:\s]+$/, '');
        const depth = []; let inStr = false, esc = false;
        for (const ch of u) {
            if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
            if (ch === '"') inStr = true; else if (ch === '{') depth.push('}'); else if (ch === '[') depth.push(']'); else if (ch === '}' || ch === ']') depth.pop();
        }
        if (depth.length) { try { return JSON.parse((inStr ? u + '"' : u).replace(/,\s*$/, '') + depth.reverse().join('')); } catch (e) { /* aufgeben */ } }
        return null;
    }
    function balancedObjects(text) {
        const out = [];
        let depth = 0, start = -1, inStr = false, esc = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
            if (ch === '"' && depth > 0) inStr = true;
            else if (ch === '{') { if (depth === 0) start = i; depth++; }
            else if (ch === '}' && depth > 0) { depth--; if (depth === 0) out.push({ start, end: i + 1, str: text.slice(start, i + 1) }); }
        }
        return out;
    }
    AI.parseJSON = looseParse;
    AI.extractJSON = function (text) {
        text = String(text || '');
        const fence = /```[ \t]*(?:json|JSON|js)?[ \t]*\n?([\s\S]*?)```/g;
        const blocks = []; let m;
        while ((m = fence.exec(text))) blocks.push({ full: m[0], body: m[1], index: m.index });
        for (let i = blocks.length - 1; i >= 0; i--) {
            const d = looseParse(blocks[i].body);
            if (d && typeof d === 'object') return { text: (text.slice(0, blocks[i].index) + text.slice(blocks[i].index + blocks[i].full.length)).trim(), data: d };
        }
        const spans = balancedObjects(text);
        for (let i = spans.length - 1; i >= 0; i--) {
            const d = looseParse(spans[i].str);
            if (d && typeof d === 'object' && Object.keys(d).length) return { text: (text.slice(0, spans[i].start) + text.slice(spans[i].end)).trim(), data: d };
        }
        // unvollständiger Block am Ende (abgeschnittene Antwort)
        const cut = text.search(/```[ \t]*(json|JSON)?[ \t]*\n?\s*\{[\s\S]*$/);
        if (cut >= 0) { const d = looseParse(text.slice(cut).replace(/^```[^\n{]*/, '')); return { text: text.slice(0, cut).trim(), data: d && typeof d === 'object' ? d : null }; }
        return { text: text.trim(), data: null };
    };
    AI.visibleText = function (t) {
        t = String(t || '');
        const i = t.search(/```|(^|\n)\s*\{\s*("|\n|$)/);
        return (i >= 0 ? t.slice(0, i) : t).replace(/\s+$/, '');
    };

    /* ── Mini-Markdown (sicher: erst escapen, dann formatieren) ─────────── */
    AI.md = function (src) {
        let s = X.esc(String(src || '').replace(/\r/g, ''));
        const pres = [];
        s = s.replace(/```[^\n]*\n?([\s\S]*?)```/g, (mm, code) => { pres.push('<pre><code>' + code.replace(/\n$/, '') + '</code></pre>'); return '\u0000' + (pres.length - 1) + '\u0000'; });
        s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[\s(„"])\*([^*\n]+)\*(?=[\s).,!?:;"“]|$)/gm, '$1<em>$2</em>')
            .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/gm, '$1<em>$2</em>')
            .replace(/^#{1,6}\s+(.+)$/gm, '<strong class="ai-h">$1</strong>');
        const LI = /^\s*([-*•]|\d+[.)])\s+/;
        const blocks = s.split(/\n{2,}/).map(block => {
            if (/^\u0000\d+\u0000$/.test(block.trim())) return block.trim();
            // Zeilen in Gruppen teilen: Listen und normale Absätze dürfen sich mischen
            const groups = [];
            block.split('\n').forEach(l => {
                const isLi = LI.test(l);
                const g = groups[groups.length - 1];
                if (g && g.li === isLi && (!isLi || /^\s*\d/.test(l) === g.ordered)) g.lines.push(l);
                else groups.push({ li: isLi, ordered: isLi && /^\s*\d/.test(l), lines: [l] });
            });
            return groups.map(g => {
                if (!g.li) { const t = g.lines.filter(l => l.trim()).join('<br>'); return t ? '<p>' + t + '</p>' : ''; }
                const tag = g.ordered ? 'ol' : 'ul';
                return '<' + tag + '>' + g.lines.map(l => '<li>' + l.replace(LI, '') + '</li>').join('') + '</' + tag + '>';
            }).join('');
        });
        return blocks.join('').replace(/\u0000(\d+)\u0000/g, (mm, i) => pres[+i]);
    };

    /* ======================================================================
       OFFLINE-ENGINE – regelbasiert und prozedural, immer verfügbar
       ====================================================================== */
    const OFF = AI.offline = {};
    OFF.hash = function (str) {
        let h = 2166136261 >>> 0;
        str = String(str == null ? '' : str);
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    };
    OFF.rng = function (seed) {
        let a = (typeof seed === 'number' ? seed : OFF.hash(seed)) >>> 0;
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    };
    OFF.pick = (r, arr) => arr[Math.floor((typeof r === 'function' ? r() : Math.random()) * arr.length)];
    OFF.shuffle = function (r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    /* Vorlage füllen: {name} aus vars (Arrays -> Zufall), [a|b|c] -> Auswahl */
    OFF.fill = function (tpl, vars, r) {
        r = r || Math.random;
        let s = String(tpl);
        for (let k = 0; k < 3; k++) s = s.replace(/\[([^\[\]]*\|[^\[\]]*)\]/g, (m, alts) => OFF.pick(r, alts.split('|')));
        return s.replace(/\{(\w+)\}/g, (m, key) => {
            const v = vars && vars[key];
            if (v == null) return m;
            return Array.isArray(v) ? OFF.pick(r, v) : (typeof v === 'function' ? v(r) : String(v));
        });
    };
    /* Wortbasierte Markov-Kette */
    OFF.markov = function (corpus) {
        const words = String(corpus).replace(/\s+/g, ' ').trim().split(' ');
        const next = {}, starts = [];
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (i === 0 || /[.!?]$/.test(words[i - 1])) starts.push(w);
            if (i < words.length - 1) (next[w] = next[w] || []).push(words[i + 1]);
        }
        return {
            sentence(r, max) {
                r = r || Math.random; max = max || 24;
                let w = OFF.pick(r, starts), out = [w];
                while (!/[.!?]$/.test(w) && out.length < max) {
                    const n = next[w]; if (!n) break;
                    w = OFF.pick(r, n); out.push(w);
                }
                let s = out.join(' ');
                if (!/[.!?]$/.test(s)) s = s.replace(/[,;:]$/, '') + '.';
                return s;
            }
        };
    };
    /* Namen für Orte, Figuren, Länder */
    const NM = {
        pre: ['Al', 'Bel', 'Cor', 'Dra', 'El', 'Fen', 'Gal', 'Hel', 'Ir', 'Kar', 'Lor', 'Mor', 'Nar', 'Or', 'Pel', 'Quel', 'Ra', 'Sil', 'Tal', 'Ul', 'Val', 'Wen', 'Yr', 'Zar', 'Ash', 'Bra', 'Gri', 'Thor', 'Ost', 'Run', 'Sar', 'Ves'],
        mid: ['a', 'e', 'i', 'o', 'u', 'ar', 'en', 'il', 'or', 'un', 'ath', 'ess', 'im', 'and', 'ir'],
        end: {
            ort: ['heim', 'burg', 'tal', 'wald', 'furt', 'stein', 'au', 'hafen', 'berg', 'see', 'wil', 'ikon', 'ingen', 'dorf', 'fels', 'brugg', 'egg', 'matt'],
            person: ['ric', 'wen', 'dor', 'ia', 'ius', 'ara', 'in', 'eth', 'ald', 'ora', 'is', 'una', 'ard'],
            land: ['ien', 'ar', 'os', 'land', 'mark', 'ia', 'or', 'eth']
        }
    };
    OFF.name = function (r, kind) {
        r = r || Math.random; kind = NM.end[kind] ? kind : 'ort';
        let n = OFF.pick(r, NM.pre) + (r() < .55 ? OFF.pick(r, NM.mid) : '') + OFF.pick(r, NM.end[kind]);
        n = n.replace(/([aeiou])\1+/g, '$1').replace(/([^aeiou])\1\1+/g, '$1$1');
        return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    };
    /* Glattes 2D-Rauschen (Value-Noise) – Rückgabe 0..1 */
    OFF.noise = function (seed) {
        const r = OFF.rng(seed), P = new Uint8Array(512), V = new Float32Array(256);
        const perm = OFF.shuffle(r, Array.from({ length: 256 }, (_, i) => i));
        for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
        for (let i = 0; i < 256; i++) V[i] = r();
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        return function (x, y) {
            const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
            const h = (i, j) => V[P[(P[i & 255] + j) & 255]];
            const u = fade(xf), v = fade(yf);
            const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * u;
            const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * u;
            return a + (b - a) * v;
        };
    };
    OFF.fbm = function (noise, x, y, oct, lac, gain) {
        let s = 0, a = .5, f = 1, n = 0;
        for (let i = 0; i < (oct || 5); i++) { s += a * noise(x * f, y * f); n += a; a *= gain || .5; f *= lac || 2; }
        return s / n;
    };

    /* Allgemeiner Offline-Gesprächspartner */
    const CORPUS = 'Die Diskette dreht sich leise im Laufwerk und erzählt von alten Zeiten. Im Keller der Website summen die Server wie Bienen im Sommer. ' +
        'Ein Pixel wandert über den Bildschirm und sucht seinen Platz im Bild. Die Berge leuchten im Abendlicht und der Zug fährt pünktlich wie immer. ' +
        'Ein Magier sammelt Runen und mischt sie zu neuen Zaubern. Im Dungeon flackert eine Fackel und irgendwo klappert ein Skelett. ' +
        'Jede gute Idee beginnt mit einer Tasse Kaffee und endet mit einem Speicherstand. Der Prozessor rechnet schnell und die Grafikkarte träumt von mehr Licht. ' +
        'Wer genau hinschaut, findet überall versteckte Disketten. Die Zukunft ist ein Level, das noch niemand gespielt hat. ' +
        'Ein guter Plan hat drei Schritte und mindestens einen Umweg. Manchmal ist die beste Antwort eine neue Frage. ' +
        'Die Antwort liegt oft im Detail und das Detail liegt oft im Keller. Ein kleiner Schritt im Code ist ein grosser Sprung für das Spiel. ' +
        'Der Wind über dem See flüstert Geschichten von Helden und Bugs.';
    let markov = null;
    const OFFLINE_TXT = {
        greet: ['Hoi! Ich bin der Offline-Geist des KI-Labors. Ohne Internet-KI bin ich nicht besonders schlau – aber plaudern geht immer.',
            'Grüezi! Schön, dass du da bist. Die grossen Sprachmodelle schlafen gerade, ich halte die Stellung.',
            'Hallo! Hier spricht der Notstrom-Generator des Labors. Was liegt an?'],
        thanks: ['Gern geschehen!', 'Immer wieder gern – dafür bin ich da.', 'Merci vielmal zurück!'],
        jokes: ['Warum nehmen Disketten nie ab? Weil sie immer ihre 1,44 MB behalten.',
            'Wie viele Programmierer braucht man, um eine Glühbirne zu wechseln? Keinen – das ist ein Hardware-Problem.',
            'Was sagt ein Pixel zum anderen? „Wir sehen uns im nächsten Frame."',
            'Warum war der Computer so müde? Er hatte zu viele Tabs offen.',
            'Ein SQL-Befehl geht in eine Bar, sieht zwei Tische und fragt: „Darf ich euch joinen?"',
            'Warum mögen Programmierer die Natur nicht? Zu viele Bugs.'],
        open: ['Über „{t}" habe ich offline nur ein paar lose Gedanken:', 'Hmm, {t} … gute Frage.', 'Ohne Online-KI kann ich zu „{t}" nur raten:', 'Lass mich kurz in meinen Disketten wühlen …'],
        close: ['Für richtige Antworten kannst du unter „Dienste & Schlüssel" einen KI-Dienst einrichten.',
            'Mit einem Hugging-Face-Schlüssel wäre ich deutlich klüger, versprochen.',
            'Mehr kann ich ohne Internet-Gehirn leider nicht sagen.']
    };
    const STOP = new Set('der die das und oder aber ich du er sie es wir ihr ein eine einen einem einer ist sind war bin bist hat habe hast mit von zu im in am an auf für fur was wie wo wer warum wieso weshalb nicht kein keine mir mich dir dich mein dein den dem des sich auch noch schon nur so ja nein bitte mal kann kannst können sollte soll will willst wird werden gibt über unter nach vor bei als wenn dass da hier dort man doch'.split(' '));
    OFF.keyword = function (text) {
        const words = String(text || '').replace(/[^A-Za-zÄÖÜäöüéèàç0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w.toLowerCase()));
        words.sort((a, b) => b.length - a.length);
        return words[0] || 'das';
    };
    function calc(expr) {
        const s = expr.replace(/,/g, '.').replace(/\s+/g, '').replace(/[x×]/g, '*').replace(/[:÷]/g, '/');
        if (!/^[\d.+\-*/()]+$/.test(s) || !/\d[+\-*/]/.test(s)) return null;
        let i = 0;
        const num = () => { const m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
        const factor = () => { if (s[i] === '-') { i++; return -factor(); } if (s[i] === '(') { i++; const v = expr0(); if (s[i] !== ')') throw 0; i++; return v; } return num(); };
        const term = () => { let v = factor(); while (s[i] === '*' || s[i] === '/') { const op = s[i++]; const w = factor(); v = op === '*' ? v * w : v / w; } return v; };
        const expr0 = () => { let v = term(); while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const w = term(); v = op === '+' ? v + w : v - w; } return v; };
        try { const v = expr0(); return i === s.length && isFinite(v) ? v : null; } catch (e) { return null; }
    }
    OFF.chat = function (messages) {
        const list = Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages || '') }];
        const lastUser = list.slice().reverse().find(m => m.role === 'user');
        const q = (lastUser ? String(lastUser.content) : '').trim(), lq = q.toLowerCase();
        const r = OFF.rng(OFF.hash(q) ^ Math.floor(Date.now() / 60000));
        const P = a => OFF.pick(r, a);
        if (!q) return 'Ich höre … aber du hast noch nichts gesagt.';
        if (/^(hallo|hoi|hey|hi|grüezi|gruezi|guten (tag|morgen|abend)|servus|sali|salü|moin)\b/.test(lq)) return P(OFFLINE_TXT.greet);
        if (/\b(danke|merci|thx)\b/.test(lq)) return P(OFFLINE_TXT.thanks);
        if (/witz|lustig|lachen/.test(lq)) return P(OFFLINE_TXT.jokes);
        if (/wer bist du|was bist du|bist du (eine |ein )?(ki|mensch|bot)/.test(lq)) return 'Ich bin der Offline-Geist des KI-Labors: ein paar Regeln, eine Markov-Kette und viel guter Wille. Sobald unter „Dienste & Schlüssel" ein KI-Dienst eingerichtet ist, übernimmt ein echtes Sprachmodell.';
        const m = calc(lq.replace(/^(was ist|wie viel ist|rechne|berechne)\s*/, '').replace(/[?=]/g, ''));
        if (m != null) return 'Das ergibt **' + X.fmt(Math.round(m * 1e6) / 1e6) + '**. Rechnen kann ich auch offline.';
        if (/wie spät|uhrzeit|welcher tag|datum/.test(lq)) return 'Laut deiner Systemuhr ist es ' + new Date().toLocaleString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.';
        if (/sinn des lebens/.test(lq)) return '42. Aber frag mich nicht, was die Frage war.';
        markov = markov || OFF.markov(CORPUS);
        return OFF.fill(P(OFFLINE_TXT.open), { t: OFF.keyword(q) }, r) + ' ' + markov.sentence(r, 22) + ' ' + markov.sentence(r, 18) + '\n\n' + P(OFFLINE_TXT.close);
    };

    /* ── Prozedurale Bilder ─────────────────────────────────────────────── */
    const hsl = (h, s, l, a) => 'hsla(' + (((h % 360) + 360) % 360).toFixed(1) + ',' + Math.max(0, Math.min(100, s)).toFixed(1) + '%,' + Math.max(0, Math.min(100, l)).toFixed(1) + '%,' + (a == null ? 1 : a) + ')';
    function palette(lp, r) {
        const hues = [['rot', 2], ['rubin', 350], ['orange', 25], ['gold', 45], ['gelb', 52], ['grün', 125], ['gruen', 125], ['smaragd', 150], ['türkis', 175], ['blau', 215], ['azur', 205], ['lila', 275], ['violett', 270], ['pink', 325], ['rosa', 335]];
        let base = null;
        for (const [w, h] of hues) if (lp.includes(w)) { base = h; break; }
        const night = /nacht|dunkel|mond|stern|weltall|galax|nebel|gruft|dungeon|verlies|höhle|cyber|neon|space|night/.test(lp);
        const sunset = /sonnenunter|abend|dämmer|sunset|synthwave|retro|80er/.test(lp);
        const ice = /eis|schnee|winter|frost|gletscher|snow/.test(lp);
        const fire = /feuer|lava|flamm|vulkan|glut|drache|fire/.test(lp);
        if (base == null) base = fire ? 15 : ice ? 195 : /wald|natur|wiese|dschungel|forest/.test(lp) ? 120 : /meer|ozean|see\b|wasser|fluss|sea|ocean/.test(lp) ? 205 : sunset ? 20 : night ? 240 : Math.floor(r() * 360);
        return { base, spread: 25 + r() * 60, sat: ice ? 40 : 50 + r() * 35, night, sunset, ice, fire };
    }
    function sky(g, w, h, p, r) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        if (p.night) { gr.addColorStop(0, hsl(p.base + 10, 55, 6)); gr.addColorStop(1, hsl(p.base - 25, 45, 24)); }
        else if (p.sunset) { gr.addColorStop(0, hsl(255, 45, 22)); gr.addColorStop(.55, hsl(330, 62, 52)); gr.addColorStop(1, hsl(36, 92, 66)); }
        else if (p.ice) { gr.addColorStop(0, hsl(205, 55, 62)); gr.addColorStop(1, hsl(190, 40, 92)); }
        else { gr.addColorStop(0, hsl(p.base + 190, 50, 58)); gr.addColorStop(1, hsl(p.base + 160, 45, 86)); }
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        if (p.night) stars(g, w, h * .8, r, Math.round(w * h / 1400));
    }
    function stars(g, w, h, r, n) {
        for (let i = 0; i < n; i++) {
            const x = r() * w, y = r() * h, s = r() < .04 ? 1.8 : r() * 1.1 + .2;
            g.fillStyle = 'rgba(255,255,255,' + (.35 + r() * .65).toFixed(2) + ')';
            g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
            if (s > 1.5) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = .7; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6); g.stroke(); }
        }
    }
    function orb(g, x, y, rad, col, glow) {
        const gr = g.createRadialGradient(x, y, rad * .2, x, y, rad * (glow || 4));
        gr.addColorStop(0, col); gr.addColorStop(.25, col.replace(/[\d.]+\)$/, '.35)')); gr.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad * (glow || 4), 0, Math.PI * 2); g.fill();
        g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    function ridge(g, w, h, r, y0, amp, rough, col) {
        const n = 129, pts = new Float32Array(n);
        pts[0] = r(); pts[n - 1] = r();
        for (let step = n - 1, a = 1; step > 1; step >>= 1, a *= rough) {
            for (let i = step >> 1; i < n; i += step) pts[i] = (pts[i - (step >> 1)] + pts[i + (step >> 1)]) / 2 + (r() - .5) * a;
        }
        g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
        for (let i = 0; i < n; i++) g.lineTo(i / (n - 1) * w, y0 - pts[i] * amp);
        g.lineTo(w, h); g.closePath(); g.fill();
    }
    const SCENES = {
        landschaft(g, w, h, r, p) {
            sky(g, w, h, p, r);
            const sunCol = p.night ? 'rgba(240,240,255,1)' : p.sunset ? 'rgba(255,214,140,1)' : 'rgba(255,250,220,1)';
            orb(g, w * (.2 + r() * .6), h * (p.sunset ? .55 : .22 + r() * .15), Math.min(w, h) * (p.night ? .05 : .07), sunCol, 3.5);
            const layers = 5 + Math.floor(r() * 2);
            for (let i = 0; i < layers; i++) {
                const k = i / (layers - 1);
                const l = p.night ? 30 - k * 24 : p.sunset ? 55 - k * 45 : 70 - k * 52;
                ridge(g, w, h, r, h * (.42 + k * .45), h * (.32 - k * .16), .55, hsl(p.base + 140 + k * p.spread - (p.sunset ? 180 : 0), p.sat * (.35 + k * .4), l));
            }
        },
        weltall(g, w, h, r, p) {
            g.fillStyle = hsl(p.base + 20, 40, 4); g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 46; i++) {
                const x = w * (.15 + r() * .7) + Math.sin(i) * w * .1, y = h * (.2 + r() * .6), rad = Math.min(w, h) * (.08 + r() * .3);
                const gr = g.createRadialGradient(x, y, 0, x, y, rad);
                gr.addColorStop(0, hsl(p.base + (r() - .5) * p.spread * 2, 80, 55, .09)); gr.addColorStop(1, hsl(p.base, 80, 40, 0));
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
            g.globalCompositeOperation = 'source-over';
            stars(g, w, h, r, Math.round(w * h / 900));
            const px = w * (.2 + r() * .6), py = h * (.3 + r() * .4), pr = Math.min(w, h) * (.08 + r() * .1);
            const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, pr * .1, px, py, pr);
            pg.addColorStop(0, hsl(p.base + 180, 60, 70)); pg.addColorStop(1, hsl(p.base + 200, 60, 12));
            g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
            if (r() < .7) { g.strokeStyle = hsl(p.base + 160, 50, 75, .6); g.lineWidth = pr * .08; g.beginPath(); g.ellipse(px, py, pr * 1.8, pr * .45, -.35, 0, Math.PI * 2); g.stroke(); }
        },
        stroemung(g, w, h, r, p) {
            g.fillStyle = p.night ? hsl(p.base, 35, 7) : hsl(p.base + 30, 25, 94); g.fillRect(0, 0, w, h);
            const nz = OFF.noise(Math.floor(r() * 1e9)), sc = 2.6 / Math.max(w, h);
            g.lineWidth = Math.max(1, w / 500);
            for (let i = 0; i < 1100; i++) {
                let x = r() * w, y = r() * h;
                g.strokeStyle = hsl(p.base + (r() - .5) * p.spread * 2, p.sat + 10, p.night ? 50 + r() * 25 : 25 + r() * 30, .28);
                g.beginPath(); g.moveTo(x, y);
                for (let s = 0; s < 55; s++) {
                    const a = OFF.fbm(nz, x * sc, y * sc, 3) * Math.PI * 4;
                    x += Math.cos(a) * 3; y += Math.sin(a) * 3;
                    g.lineTo(x, y);
                }
                g.stroke();
            }
        },
        kristall(g, w, h, r, p) {
            const sw = Math.ceil(w / 3), sh = Math.ceil(h / 3), sm = document.createElement('canvas');
            sm.width = sw; sm.height = sh;
            const sg = sm.getContext('2d'), img = sg.createImageData(sw, sh), d = img.data;
            const pts = Array.from({ length: 34 + Math.floor(r() * 30) }, () => ({ x: r() * sw, y: r() * sh, h: p.base + (r() - .5) * p.spread * 2, l: 30 + r() * 45 }));
            const toRGB = (hh, s, l) => { s /= 100; l /= 100; const k = n => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
            const cols = pts.map(q => toRGB(((q.h % 360) + 360) % 360, p.sat, q.l));
            for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
                let b1 = 1e9, b2 = 1e9, bi = 0;
                for (let i = 0; i < pts.length; i++) { const dx = pts[i].x - x, dy = pts[i].y - y, dd = dx * dx + dy * dy; if (dd < b1) { b2 = b1; b1 = dd; bi = i; } else if (dd < b2) b2 = dd; }
                const edge = Math.min(1, (Math.sqrt(b2) - Math.sqrt(b1)) / 6), sh2 = .55 + .45 * edge + (y / sh) * .1;
                const o = (y * sw + x) * 4, c = cols[bi];
                d[o] = c[0] * sh2; d[o + 1] = c[1] * sh2; d[o + 2] = c[2] * sh2; d[o + 3] = 255;
            }
            sg.putImageData(img, 0, 0);
            g.imageSmoothingEnabled = true; g.drawImage(sm, 0, 0, w, h);
        },
        stadt(g, w, h, r, p) {
            sky(g, w, h, Object.assign({}, p, { night: true }), r);
            orb(g, w * (.15 + r() * .7), h * .2, Math.min(w, h) * .045, 'rgba(235,235,255,1)', 3);
            const neon = /cyber|neon|synthwave/.test(p.lp);
            for (let layer = 0; layer < 3; layer++) {
                const k = layer / 2;
                let x = -10;
                while (x < w) {
                    const bw = w * (.04 + r() * .07), bh = h * (.18 + r() * .38) * (1 - k * .25), y = h - bh;
                    g.fillStyle = hsl(p.base + 200, 25, 16 - k * 10); g.fillRect(x, y, bw, bh);
                    const cw = Math.max(3, bw / 9), ch = cw * 1.4;
                    for (let wy = y + ch; wy < h - ch; wy += ch * 1.8) for (let wx = x + cw * .8; wx < x + bw - cw; wx += cw * 1.8) {
                        if (r() < .32 - k * .08) { g.fillStyle = neon ? hsl(r() < .5 ? 300 : 185, 90, 65, .9) : hsl(45, 90, 70, .85); g.fillRect(wx, wy, cw, ch); }
                    }
                    if (neon && r() < .2) { g.fillStyle = hsl(r() < .5 ? 320 : 190, 100, 60, .9); g.fillRect(x + bw * .2, y + bh * .15, bw * .6, Math.max(3, h / 120)); }
                    x += bw + r() * w * .01;
                }
            }
        },
        wald(g, w, h, r, p) {
            sky(g, w, h, p, r);
            ridge(g, w, h, r, h * .55, h * .2, .5, hsl(p.base + 150, 20, p.night ? 20 : 62));
            for (let layer = 0; layer < 4; layer++) {
                const k = layer / 3, baseY = h * (.62 + k * .3), sz = h * (.12 + k * .16);
                for (let x = -sz; x < w + sz; x += sz * (.35 + r() * .35)) {
                    const th = sz * (.7 + r() * .6), y = baseY + r() * h * .03;
                    g.fillStyle = hsl(p.base + 100 + r() * 25, 30 + k * 20, (p.night ? 26 : 46) - k * (p.night ? 20 : 34));
                    for (let t = 0; t < 3; t++) { const tw = th * (.42 - t * .1), ty = y - th * (t * .28); g.beginPath(); g.moveTo(x, ty - th * .45); g.lineTo(x - tw, ty); g.lineTo(x + tw, ty); g.closePath(); g.fill(); }
                }
                const fog = g.createLinearGradient(0, baseY - sz, 0, baseY + sz * .4);
                fog.addColorStop(0, 'rgba(255,255,255,0)'); fog.addColorStop(1, 'rgba(255,255,255,' + (p.night ? .04 : .12) + ')');
                g.fillStyle = fog; g.fillRect(0, baseY - sz, w, sz * 1.4);
            }
        },
        meer(g, w, h, r, p) {
            sky(g, w, h, p, r);
            const hz = h * (.45 + r() * .1), sx = w * (.25 + r() * .5);
            orb(g, sx, hz - h * .05, Math.min(w, h) * .06, p.sunset ? 'rgba(255,200,120,1)' : 'rgba(255,250,230,1)', 3.5);
            for (let i = 0; i < 60; i++) {
                const k = i / 59, y = hz + (h - hz) * Math.pow(k, 1.6);
                g.fillStyle = hsl(p.base + 190 - k * 15 + (p.sunset ? -150 : 0), p.sat * .8, (p.night ? 22 : 52) - k * 30);
                g.beginPath(); g.moveTo(0, h);
                for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * (.02 + r() * .002) + i) * (2 + k * 7));
                g.lineTo(w, h); g.closePath(); g.fill();
            }
            g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 160; i++) { const y = hz + r() * (h - hz), sp = (y - hz) / (h - hz); g.fillStyle = 'rgba(255,220,160,' + (.12 * (1 - sp)).toFixed(3) + ')'; g.fillRect(sx - w * .04 * (1 + sp) * r(), y, w * .08 * (1 + sp) * r(), 2); }
            g.globalCompositeOperation = 'source-over';
        },
        verlies(g, w, h, r, p) {
            g.fillStyle = hsl(25, 15, 8); g.fillRect(0, 0, w, h);
            const bh = h / 16;
            for (let row = 0; row < 17; row++) {
                const bw = bh * 2.2, off = row % 2 ? bw / 2 : 0;
                for (let x = -off; x < w; x += bw) { g.fillStyle = hsl(28 + r() * 10, 10 + r() * 8, 16 + r() * 10); g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4); }
            }
            const ax = w / 2, aw = w * .2, ah = h * .5, ay = h * .9;
            g.fillStyle = hsl(20, 30, 3); g.beginPath(); g.moveTo(ax - aw, ay); g.lineTo(ax - aw, ay - ah + aw); g.arc(ax, ay - ah + aw, aw, Math.PI, 0); g.lineTo(ax + aw, ay); g.closePath(); g.fill();
            g.globalCompositeOperation = 'lighter';
            [ax - aw * 2, ax + aw * 2].forEach(tx => {
                orb(g, tx, h * .42, Math.min(w, h) * .018, 'rgba(255,170,60,1)', 9);
                g.fillStyle = 'rgba(255,220,120,.9)'; g.beginPath(); g.ellipse(tx, h * .41, w * .008, h * .02, 0, 0, Math.PI * 2); g.fill();
            });
            g.globalCompositeOperation = 'source-over';
            g.fillStyle = hsl(30, 20, 10); [ax - aw * 2, ax + aw * 2].forEach(tx => g.fillRect(tx - 3, h * .43, 6, h * .06));
            const fl = g.createLinearGradient(0, ay, 0, h); fl.addColorStop(0, hsl(25, 20, 12)); fl.addColorStop(1, hsl(25, 20, 4)); g.fillStyle = fl; g.fillRect(0, ay, w, h - ay);
        },
        abstrakt(g, w, h, r, p) {
            g.fillStyle = hsl(p.base + 40, 25, p.night ? 10 : 92); g.fillRect(0, 0, w, h);
            const n = 9 + Math.floor(r() * 7), m = Math.min(w, h);
            for (let i = 0; i < n; i++) {
                g.fillStyle = hsl(p.base + (r() - .5) * p.spread * 3, p.sat + 10, 35 + r() * 35, .85);
                const t = r(), x = r() * w, y = r() * h, s = m * (.08 + r() * .3);
                g.beginPath();
                if (t < .4) g.arc(x, y, s, 0, Math.PI * 2);
                else if (t < .6) g.arc(x, y, s, r() * Math.PI, r() * Math.PI + Math.PI);
                else if (t < .85) g.rect(x - s / 2, y - s / 2, s * (.5 + r()), s * (.3 + r()));
                else { g.lineWidth = m * .012; g.strokeStyle = g.fillStyle; g.moveTo(x, y); g.lineTo(x + (r() - .5) * m, y + (r() - .5) * m); g.stroke(); continue; }
                g.fill();
            }
        }
    };
    const SCENE_WORDS = {
        weltall: /weltall|stern|galax|planet|kosmos|nebel|space|rakete|astronaut|mond/,
        stadt: /stadt|zürich|zuerich|city|cyber|gebäude|haus|strasse|skyline|neon/,
        wald: /wald|baum|bäume|forest|tanne|dschungel|natur/,
        meer: /meer|ozean|strand|see\b|welle|insel|boot|schiff|sea|ocean/,
        verlies: /dungeon|verlies|gruft|keller|höhle|burg|kerker|fackel|pixmag|skelett/,
        kristall: /kristall|edelstein|glas|eis|mosaik|diamant|crystal/,
        stroemung: /abstrakt|strömung|welle|wind|energie|magie|fluss|rauch|flow/,
        landschaft: /berg|alpen|landschaft|tal|hügel|sonnenunter|himmel|schweiz|gipfel|wiese/
    };
    function grain(g, w, h, r, amt) {
        const img = g.getImageData(0, 0, w, h), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
        g.putImageData(img, 0, 0);
    }
    function vignette(g, w, h, a) {
        const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + a + ')');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    const POST = {
        pixel(g, w, h, r, cv) {
            const f = Math.max(4, Math.round(Math.max(w, h) / 110)), sw = Math.ceil(w / f), sh = Math.ceil(h / f);
            const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
            const sg = sm.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(cv, 0, 0, sw, sh);
            const img = sg.getImageData(0, 0, sw, sh), d = img.data;
            for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] / 51) * 51;
            sg.putImageData(img, 0, 0);
            g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, w, h); g.imageSmoothingEnabled = true;
        },
        oel(g, w, h, r) {
            const img = g.getImageData(0, 0, w, h).data, nz = OFF.noise(Math.floor(r() * 1e9));
            for (let i = 0; i < 5200; i++) {
                const x = r() * w, y = r() * h, o = ((y | 0) * w + (x | 0)) * 4;
                const a = nz(x / 90, y / 90) * Math.PI * 2, len = 5 + r() * 12;
                g.strokeStyle = 'rgba(' + img[o] + ',' + img[o + 1] + ',' + img[o + 2] + ',.75)';
                g.lineWidth = 2 + r() * 5; g.lineCap = 'round';
                g.beginPath(); g.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
            }
        },
        skizze(g, w, h) {
            const src = g.getImageData(0, 0, w, h), s = src.data, out = g.createImageData(w, h), d = out.data;
            const L = new Float32Array(w * h);
            for (let i = 0; i < w * h; i++) L[i] = s[i * 4] * .3 + s[i * 4 + 1] * .59 + s[i * 4 + 2] * .11;
            for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
                const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
                const e = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 1.4), shade = 245 - e - (255 - L[i]) * .18;
                d[i * 4] = shade; d[i * 4 + 1] = shade * .98; d[i * 4 + 2] = shade * .93; d[i * 4 + 3] = 255;
            }
            g.putImageData(out, 0, 0);
        },
        aquarell(g, w, h, r, cv) {
            const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
            const tg = tmp.getContext('2d'); tg.filter = 'blur(' + Math.max(2, w / 260) + 'px) saturate(.85)'; tg.drawImage(cv, 0, 0);
            g.fillStyle = 'rgb(250,246,238)'; g.fillRect(0, 0, w, h);
            g.globalAlpha = .9; g.drawImage(tmp, 0, 0); g.globalAlpha = 1;
            for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (r() * .08).toFixed(3) + ')'; g.beginPath(); g.arc(r() * w, r() * h, r() * w * .12, 0, Math.PI * 2); g.fill(); }
        },
        synthwave(g, w, h) {
            const hz = h * .62;
            g.strokeStyle = 'rgba(255,60,220,.75)'; g.lineWidth = Math.max(1, w / 400);
            for (let i = 0; i < 14; i++) { const y = hz + (h - hz) * Math.pow(i / 13, 2); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
            for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * .02, hz); g.lineTo(w / 2 + i * w * .16, h); g.stroke(); }
        }
    };
    function silhouetteCat(g, w, h) {
        const s = Math.min(w, h) * .16, x = w * .78, y = h * .96;
        g.fillStyle = 'rgba(8,8,12,.95)';
        g.beginPath(); g.ellipse(x, y - s * .55, s * .55, s * .6, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x, y - s * 1.3, s * .32, 0, Math.PI * 2); g.fill();
        [[-1, 1], [1, 1]].forEach(([dx]) => { g.beginPath(); g.moveTo(x + dx * s * .3, y - s * 1.45); g.lineTo(x + dx * s * .26, y - s * 1.78); g.lineTo(x + dx * s * .06, y - s * 1.58); g.closePath(); g.fill(); });
        g.lineWidth = s * .12; g.strokeStyle = g.fillStyle; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x + s * .45, y - s * .2); g.quadraticCurveTo(x + s * 1.1, y - s * .2, x + s * .95, y - s * .9); g.stroke();
    }
    OFF.image = async function (prompt, opts) {
        opts = opts || {};
        const lp = (String(prompt || '') + ' ' + (opts.style || '')).toLowerCase();
        const ow = +opts.width || 1024, oh = +opts.height || 1024, k = Math.min(1, 768 / Math.max(ow, oh));
        const w = Math.round(ow * k), h = Math.round(oh * k);
        const seed = ((+opts.seed || 0) ^ OFF.hash(prompt)) >>> 0, r = OFF.rng(seed);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        const p = palette(lp, r); p.lp = lp;
        let scene = Object.keys(SCENE_WORDS).find(s => SCENE_WORDS[s].test(lp));
        if (!scene) scene = OFF.pick(r, ['landschaft', 'stroemung', 'kristall', 'abstrakt', 'weltall', 'meer']);
        await new Promise(res => setTimeout(res, 30));   // UI kurz atmen lassen
        SCENES[scene](g, w, h, r, p);
        if (/katze|kater|\bcat\b|büsi|busi/.test(lp)) silhouetteCat(g, w, h);
        if (/synthwave|retro|80er/.test(lp)) POST.synthwave(g, w, h, r, cv);
        if (/pixel/.test(lp)) POST.pixel(g, w, h, r, cv);
        else if (/öl|oel|gemälde|gemaelde|oil/.test(lp)) POST.oel(g, w, h, r, cv);
        else if (/skizze|bleistift|zeichnung|sketch/.test(lp)) POST.skizze(g, w, h, r, cv);
        else if (/aquarell|wasserfarb|watercolor/.test(lp)) POST.aquarell(g, w, h, r, cv);
        if (!/pixel|skizze|bleistift/.test(lp)) grain(g, w, h, r, 14);
        vignette(g, w, h, /skizze|bleistift|aquarell/.test(lp) ? .12 : .38);
        const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
        const names = { landschaft: 'Landschaft', weltall: 'Weltall', stroemung: 'Strömung', kristall: 'Kristall', stadt: 'Stadt', wald: 'Wald', meer: 'Meer', verlies: 'Verlies', abstrakt: 'Abstrakt' };
        return { blob, url: URL.createObjectURL(blob), canvas: cv, width: w, height: h, seed: opts.seed, model: 'Generativ · ' + names[scene] };
    };

    /* ======================================================================
       UI-HELFER – Status-Leiste, Tipp-Effekt, Ladepunkte
       ====================================================================== */
    const UI = AI.ui = {};
    (function injectCSS() {
        if (document.getElementById('xiru-ai-css')) return;
        const st = document.createElement('style');
        st.id = 'xiru-ai-css';
        st.textContent =
            '.ai-status{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.35rem .7rem;padding:.45rem .9rem;border:1px solid var(--border);border-radius:99px;background:var(--surface);font-size:.85rem;color:var(--text-muted);max-width:100%}' +
            '.ai-status__dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;background:var(--text-faint);box-shadow:0 0 0 3px color-mix(in srgb,var(--text-faint) 25%,transparent)}' +
            '.ai-status.is-online .ai-status__dot{background:var(--success);box-shadow:0 0 0 3px color-mix(in srgb,var(--success) 25%,transparent);animation:aiPulse 2.4s infinite}' +
            '.ai-status.is-warn .ai-status__dot{background:var(--warning);box-shadow:0 0 0 3px color-mix(in srgb,var(--warning) 25%,transparent)}' +
            '.ai-status.is-busy .ai-status__dot{animation:aiPulse .8s infinite}' +
            '.ai-status strong{color:var(--text);font-weight:700}' +
            '.ai-status__model{font-family:var(--mono);font-size:.76rem;color:var(--text-faint);overflow-wrap:anywhere}' +
            '.ai-status__warn{font-size:.78rem;color:var(--warning)}' +
            '.ai-status__link{font-weight:600;white-space:nowrap}' +
            '.ai-caret{display:inline-block;width:.5em;height:1.05em;margin-left:2px;vertical-align:text-bottom;background:var(--rc);border-radius:1px;animation:blink 1s step-end infinite}' +
            '.ai-dots{display:inline-flex;gap:5px;align-items:center;padding:.3em 0}' +
            '.ai-dots i{width:7px;height:7px;border-radius:50%;background:var(--rc);animation:aiBounce 1.2s infinite ease-in-out}' +
            '.ai-dots i:nth-child(2){animation-delay:.15s}.ai-dots i:nth-child(3){animation-delay:.3s}' +
            '.ai-md p{margin:0 0 .65em}.ai-md p:last-child{margin-bottom:0}.ai-md ul,.ai-md ol{margin:.2em 0 .65em;padding-left:1.25em}.ai-md li{margin-bottom:.15em}' +
            '.ai-md pre{margin:.4em 0 .65em;white-space:pre-wrap}.ai-md .ai-h{display:block;margin:.4em 0 .2em}' +
            '@keyframes aiBounce{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-5px);opacity:1}}' +
            '@keyframes aiPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--success) 55%,transparent)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}';
        (document.head || document.documentElement).appendChild(st);
    })();

    UI.dots = () => '<span class="ai-dots" role="status" aria-label="Denkt nach"><i></i><i></i><i></i></span>';

    UI.status = function (el, opts) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        if (!el) return null;
        opts = opts || {};
        const kind = opts.kind || 'chat';
        let busy = false;
        const short = m => String(m || '').split('/').pop();
        function render() {
            const s = AI.status(kind), last = AI.last && AI.last.kind === kind ? AI.last : null;
            const warn = last && last.error && (last.fallback || last.provider !== 'offline') ? last.error : '';
            el.className = 'ai-status' + (s.online ? ' is-online' : ' is-offline') + (warn ? ' is-warn' : '') + (busy ? ' is-busy' : '');
            const keysInfo = s.provider === 'hf' ? (s.keys.hf > 1 ? ' · ' + s.keys.hfActive + '/' + s.keys.hf + ' Schlüssel' : '') : '';
            el.innerHTML = '<span class="ai-status__dot" aria-hidden="true"></span>' +
                '<span><strong>' + X.esc(s.online ? s.label : 'Offline-Modus') + '</strong>' +
                (s.online && s.model ? ' <span class="ai-status__model">' + X.esc(short(s.model)) + X.esc(keysInfo) + '</span>' : '') +
                (!s.online ? ' <span class="ai-status__model">' + (opts.offlineText ? X.esc(opts.offlineText) : 'regelbasiert, ohne Internet') + '</span>' : '') + '</span>' +
                (warn ? '<span class="ai-status__warn" title="' + X.esc(warn) + '">⚠ letzte Anfrage: ' + X.esc(last.fallback ? 'offline beantwortet' : 'Fehler') + '</span>' : '') +
                '<a class="ai-status__link" href="' + X.url('konto/dienste.html') + '">Dienste &amp; Schlüssel →</a>';
            el.setAttribute('role', 'status');
        }
        render();
        X.on('keys', render);
        AI.on('call', () => { busy = false; render(); });
        AI.on('start', d => { if (d.kind === kind) { busy = true; render(); } });
        return { render };
    };

    /* Tipp-Effekt: Text erscheint flüssig Zeichen für Zeichen, auch wenn er in Brocken ankommt */
    UI.stream = function (el, opts) {
        el = typeof el === 'string' ? document.querySelector(el) : el;
        opts = opts || {};
        if (opts.md !== false) el.classList.add('ai-md');
        const instant = X.setting('anim') === false || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        let target = '', shown = 0, ended = false, raf = 0, resolve;
        const done = new Promise(res => { resolve = res; });
        const filter = opts.filter || (t => t);
        function render(final) {
            const t = filter(target.slice(0, shown), !final);
            if (!t && !final) el.innerHTML = UI.dots();
            else el.innerHTML = (opts.md === false ? X.esc(t).replace(/\n/g, '<br>') : AI.md(t)) + (final ? '' : '<span class="ai-caret" aria-hidden="true"></span>');
            if (opts.onRender) opts.onRender(final);
        }
        function tick() {
            raf = 0;
            const back = target.length - shown;
            if (back > 0) {
                shown = instant ? target.length : Math.min(target.length, shown + Math.max(opts.min || 1, Math.ceil(back / (opts.smooth || 14))));
                render(false);
            }
            if (shown < target.length) raf = requestAnimationFrame(tick);
            else if (ended) { render(true); resolve(target); }
        }
        const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };
        render(false);
        return {
            el,
            push(chunk) { target += chunk || ''; schedule(); },
            set(t) { target = String(t || ''); if (shown > target.length) shown = target.length; schedule(); },
            end(final) { if (final != null) target = String(final); if (shown > target.length) shown = target.length; ended = true; schedule(); return done; },
            skip() { shown = target.length; schedule(); },
            get text() { return target; },
            done
        };
    };
})();

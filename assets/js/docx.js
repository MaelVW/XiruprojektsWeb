/* ==========================================================================
   Word-Dateien (.docx) direkt im Browser erzeugen – ohne Server, ohne Bibliothek.
   XIRU.docx.cheatSheet({ title, languages: [{ name, groups: [{ name, items: [[begriff, code, beschreibung, vertiefung?]] }] }] })
     → Blob im Stil von Maels Cheat-Sheet: Titel marineblau, Calibri 11, Überschrift 1 = Sprache, Überschrift 2 = Gruppe,
       Tabelle „Begriff | Code-Beispiel | Beschreibung“ (Kopf marineblau/weiss/fett, 3.5 / 5 / 7.5 cm, Code in Consolas,
       der Begriff in jeder Zelle gelb markiert und fett), optional „Vertiefung“-Abschnitte.
   XIRU.docx.download(blob, dateiname)
   ========================================================================== */
(function () {
    'use strict';
    const X = window.XIRU || (window.XIRU = {});
    const enc = new TextEncoder();

    /* ── Mini-ZIP (nur „gespeichert“, ohne Kompression – reicht für Word) ── */
    const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    function zip(files) {
        const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const parts = [], central = [];
        let offset = 0;
        files.forEach(f => {
            const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
            const h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
            h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
            h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), name, data);
            const c = new DataView(new ArrayBuffer(46));
            c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
            c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
            c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
            central.push(new Uint8Array(c.buffer), name);
            offset += 30 + name.length + data.length;
        });
        const cdSize = central.reduce((a, b) => a + b.length, 0);
        const e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
        e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
        return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }

    /* ── WordprocessingML ── */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
    const NAVY = '1F4E78', CM = 567;   // 1 cm = 567 Twips
    const run = (text, o) => {
        o = o || {};
        const pr = (o.mono ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>' : '') + (o.bold ? '<w:b/>' : '') +
            (o.color ? '<w:color w:val="' + o.color + '"/>' : '') + (o.mono ? '<w:sz w:val="19"/>' : '') + (o.mark ? '<w:highlight w:val="yellow"/>' : '');
        return String(text).split('\n').map((line, i) => (i ? '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + '<w:br/></w:r>' : '') +
            '<w:r>' + (pr ? '<w:rPr>' + pr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + esc(line) + '</w:t></w:r>').join('');
    };
    const para = (inner, style) => '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') + inner + '</w:p>';
    // Text so in Stücke teilen, dass jedes Vorkommen des Begriffs gelb markiert und fett wird (wie im Original-Cheat-Sheet)
    function marked(text, term, o) {
        text = String(text || ''); o = o || {};
        if (!text) return '';
        const t = String(term || '').trim();
        if (!t) return run(text, o);
        const out = [], low = text.toLowerCase(), lt = t.toLowerCase();
        let pos = 0, i;
        while ((i = low.indexOf(lt, pos)) !== -1) {
            if (i > pos) out.push(run(text.slice(pos, i), o));
            out.push(run(text.slice(i, i + t.length), Object.assign({}, o, { mark: true, bold: true })));
            pos = i + t.length;
        }
        if (pos < text.length) out.push(run(text.slice(pos), o));
        return out.join('');
    }
    const cell = (inner, w, fill) => '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' : '') + '</w:tcPr><w:p>' + inner + '</w:p></w:tc>';
    const W = [Math.round(3.5 * CM), 5 * CM, Math.round(7.5 * CM)];
    function table(items) {
        const head = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + ['Begriff', 'Code-Beispiel', 'Beschreibung'].map((h, i) => cell(run(h, { bold: true, color: 'FFFFFF' }), W[i], NAVY)).join('') + '</w:tr>';
        const rows = items.map(([term, code, desc]) => '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
            cell(marked(term, term), W[0]) + cell(marked(code, term, { mono: true }), W[1]) + cell(marked(desc, term), W[2]) + '</w:tr>').join('');
        return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="' + (W[0] + W[1] + W[2]) + '" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>' +
            '<w:tblGrid>' + W.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + head + rows + '</w:tbl>';
    }
    function documentXml(doc) {
        let body = para(run(doc.title || 'Cheat Sheet', { color: NAVY }), 'Title');
        if (doc.intro) body += para(run(doc.intro, { color: '595959' }));
        doc.languages.forEach(lang => {
            body += para(run(lang.name), 'Heading1');
            lang.groups.forEach(g => {
                body += para(run(g.name), 'Heading2');
                if (!g.items.length) return;
                body += table(g.items) + para('');
                const deep = g.items.filter(it => it[3]);
                if (deep.length) {
                    body += para(run('Vertiefung – ' + g.name), 'Heading3');
                    deep.forEach(it => { body += para(run('Vertiefung: ' + it[0]), 'Heading3') + para(run(it[3])); });
                    body += para('');
                }
            });
        });
        body += '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>';
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>';
    }
    const heading = (id, name, size, color, extra) => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
        '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="' + (extra || 240) + '" w:after="80"/><w:outlineLvl w:val="' + (id === 'Title' ? 0 : +id.slice(-1) - 1) + '"/></w:pPr>' +
        '<w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light" w:cs="Calibri Light"/>' + (id !== 'Title' ? '<w:b/>' : '') + '<w:color w:val="' + color + '"/><w:sz w:val="' + size + '"/></w:rPr></w:style>';
    const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="de-CH"/></w:rPr></w:rPrDefault>' +
        '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
        heading('Title', 'Title', 52, NAVY, 0) + heading('Heading1', 'heading 1', 32, '2F5496', 360) + heading('Heading2', 'heading 2', 26, '2F5496') + heading('Heading3', 'heading 3', 24, '1F3763') +
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
        '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders>' +
        ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="auto"/>').join('') + '</w:tblBorders></w:tblPr></w:style></w:styles>';

    X.docx = {
        cheatSheet(doc) {
            return zip([
                { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
                { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
                { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
                { name: 'word/styles.xml', data: STYLES },
                { name: 'word/document.xml', data: documentXml(doc) }
            ]);
        },
        download(blob, name) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        }
    };
})();

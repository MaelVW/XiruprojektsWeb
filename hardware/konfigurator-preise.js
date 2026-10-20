/* ==========================================================================
   Aktuelle Preise für den PC-Konfigurator (hardware/konfigurator.html)
   --------------------------------------------------------------------------
   ERZEUGT von tools/build_preise.py aus tools/preise.csv – NICHT von Hand ändern.
   Preise pflegst du in tools/preise.csv und führst dann aus:
       python tools/build_preise.py
   Alle Preise in CHF (ca., Schweizer Strassenpreise inkl. MwSt.). Teile ohne
   Eintrag in "chf" fallen im Konfigurator auf die UVP zum Marktstart zurück.
   ========================================================================== */
window.XIRU = window.XIRU || {};
XIRU.hwPreise = {
    stand: 'Oktober 2026',   // Monat, auf den sich die Preise beziehen
    spanne: 0.1,            // +/- fuer die Preisrange (Tagespreise schwanken)
    usdChf: 0.92,            // grobe Umrechnung fuer Teile ohne Tagespreis

    chf: {
        // Prozessoren
        'ryzen-5-5600x': 125,
        'ryzen-7-5800x3d': 279,
        'ryzen-5-7600x': 189,
        'ryzen-9-7950x': 429,
        'ryzen-7-7800x3d': 399,
        'ryzen-5-9600x': 215,
        'ryzen-7-9700x': 299,
        'ryzen-9-9950x': 549,
        'ryzen-7-9800x3d': 469,
        'ryzen-9-9950x3d': 689,
        'core-i5-12400f': 119,
        'core-i5-13600k': 269,
        'core-i7-13700k': 349,
        'core-i9-13900k': 449,
        'core-i5-14600k': 279,
        'core-i7-14700k': 379,
        'core-i9-14900k': 489,
        'core-ultra-5-245k': 265,
        'core-ultra-7-265k': 379,
        'core-ultra-9-285k': 579,
        'ryzen-5-5600': 115,
        'ryzen-7-5700x3d': 229,
        'ryzen-7-7700x': 309,
        'ryzen-9-7900x': 379,
        'ryzen-9-7950x3d': 619,
        'ryzen-7-8700g': 299,
        'core-i5-12600k': 189,
        'core-i5-13400f': 179,
        'core-i9-12900k': 279,

        // Grafikkarten
        'rtx-3060': 289,
        'rtx-4060': 319,
        'rtx-4070': 549,
        'rtx-4070-super': 619,
        'rtx-4080-super': 1049,
        'rtx-5060-ti-16gb': 449,
        'rtx-5070': 599,
        'rtx-5070-ti': 849,
        'rtx-5080': 1149,
        'rtx-5090': 2299,
        'rx-7600': 289,
        'rx-7800-xt': 489,
        'rx-7900-xtx': 949,
        'rx-9070': 589,
        'rx-9070-xt': 689,
        'arc-b580': 299,
        'arc-a770': 289,
        'rtx-3070': 349,
        'rtx-3060-ti': 299,
        'rtx-4080': 999,
        'rtx-4060-ti': 429,
        'rtx-5060': 399,
        'rx-6600': 199,
        'rx-7700-xt': 399,
        'rx-7900-xt': 749
    },

    board: { Einsteiger: 95, Mittelklasse: 185, Oberklasse: 320 },
    ram: {
        'ddr4-32': 589,
        'ddr5-32': 699,
        'ddr5-64': 1399
    },
    ssd: {
        'sata-1tb': 95,
        'nvme4-1tb': 119,
        'nvme4-2tb': 209,
        'nvme5-2tb': 299
    },
    psu: {
        '550': 75,
        '650': 90,
        '750': 110,
        '850': 135,
        '1000': 199
    },
    case: {
        'itx': 115,
        'matx': 80,
        'atx-air': 95,
        'atx-glass': 130,
        'big': 180
    }
};

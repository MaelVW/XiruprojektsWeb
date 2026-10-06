/* Wörtle – deutsches Wordle mit 5 Buchstaben (Ä, Ö, Ü sind eigene Buchstaben, ss statt ß) */
XIRU.typedEggs = false;   // hier wird viel getippt: keine Wort-Kristalle auslösen
XIRU.ready(function () {
    const G = XIRU.Game, $ = XIRU.$, $$ = XIRU.$$;
    const LEN = 5, TRIES = 6;

    /* Wortlisten: Lösungen sind gängige Wörter, WEITERE sind zusätzlich erlaubte Eingaben (Formen, seltenere Wörter) */
    const LOESUNGEN = 'abend acker adler achse aktie alarm album ampel angel angst anker apfel arena armee asche atlas autor allee ärger ärmel atmen artig backe basar bauch bauer beere beben beruf besen beton bibel biene birne blatt blech blick blitz block blume boden bogen bombe börse brand braut brett brief brise bruch brust bucht bühne busch bügel blond breit blass blind bauen beten chaos chili clown comic dachs dampf datei dauer decke degen deich delle depot diele dolch draht drama dreck druck duell dunst durst dämon dübel dicht dumpf ebene eiche eimer eisen elend engel enkel ernte essig etage euter exakt eckig einig eitel essen eilen erben fabel faden fahne falle falte farbe faser faust feder feier feile feind ferse feuer fibel figur firma fisch fleck floss flöte fluch fluss folie forum frage frost fuchs funke falke fähre fürst flach flink frech fromm fegen feige gabel gasse geier geige geist gelee genie glanz glied glück gnade greis grill grube gruft gruss gunst gurke gämse gänse glatt grell gross gerne geben gehen haare hafen hafer hagel haken halle handy harfe harke haube hauch haupt hecke heide herde hexer hilfe hitze hobby hobel honig hotel hügel hülle humor hütte heiss hören holen heben ideal index insel jacke jäger joker jubel juwel jacht jagen kabel käfer kakao kamel kamin kampf kanal kanne kante kappe karte kasse kater kegel kehle kelch kerze kette keule kiosk kippe kiste klage klang klaue kleid klima kluft knabe knall knauf knopf koala kohle komet komma könig kopie kraft krake kranz kraut krebs kreis kreuz krieg krimi krone kugel kunde kunst kurve küche küste klein knapp krank krumm kauen lachs laden lager lampe lanze lasso latte laube lauch laune leben leder leere lehre leine licht liebe lilie linie linse liste liter locke lücke luchs lunge leise links lange legen lesen loben lügen macht magen magie makel maler mango mappe marke markt maske masse mauer meile meise menge messe meter miene milch minze mixer molch monat moped moral motiv motor mulde mumie mütze mühle musik mutig mager milde malen mögen nabel nacht nadel nagel narbe natur nebel neffe nelke niere nonne notiz nudel nobel nötig nackt nähen nagen olive onkel opfer orden orgel otter offen paket palme panne papst paste pause pedal pegel perle pfahl pfand pfeil pferd pflug pfote pfund pilot piste pixel plage plane platz pokal porto preis prinz probe profi puder puppe pumpe punkt prima qualm quark quarz quote radar rampe rasen rasse ratte raupe recht regal regel regen reich reihe reise rente rinde rippe robbe rodel roman rubin ruder ruine runde rasch ruhig raten reden rufen sache sahne saite salat salbe salon samen sauna säure schaf schal schuh segel seide seife seite serie sicht silbe sirup sitte skala socke sohle sonne sorge sorte sosse spass speck speer spiel spion sport spott spule staat stadt stahl stall stamm stand start staub stein stern stich stiel stier stift stirn stock stoff stolz stoss strom stube stuhl sturm sturz stute suche sumpf suppe sanft sauer schön spitz stark starr steif steil still stumm sagen sehen tabak tafel tango tanne tante tasse taste taube taufe teich tempo thema tiger tinte tisch titel toast torte trage trank traum treue trieb tritt trost truhe tulpe teuer toben umweg umzug unfug union übrig vater video villa viper virus vogel vokal vital waage wache waffe wagen waise walze wange wanne wanze watte weide weile welle welpe wende werft wesen weste wette wiege wiese wille witwe woche wolke wolle wrack wucht wunde wurst würde würze wüste weich weise weiss yacht zange zebra zecke zeile zelle zeuge ziege zitat zunge zweig zwerg katze panda radio piano rösti pirat riese datum laser leber glace'.split(' ');
    const WEITERE = 'aalen abbau abort abruf abtei abzug achte adern affen agent ahnen ahnte akten aktiv alben algen alibi alles allem allen aller alpen alpin altar alten alter altes amsel anbau anmut anzug april arche armen armut aroma arten ärzte assel augen autos axiom ähren ämter äpfel ärmer äther beide bevor bäche bäder bahre bälle banal bande bange banjo bären barke baron basis baute beete beige beile beine beize bekam belag beleg berge beste betet beule beute bezug biber biege biere binde binse birke bisse bitte blase blaue bleib blies blöde blüte bluse böcke böden bögen bohne bojen bonus boote borke borte böser boten boxen boxer brach brave braue braun bravo brote brühe buben buche buden bulle bunte büros busse büste bring cello chefs chips chöre couch creme curry cents dabei dafür daher dahin damit damen dämme danke dankt daran darin darum daten davon davor deine delta denen denke denkt deren derer derbe desto deute dicke diebe diene dient diese dinge docht dosen dosis drang drauf dreht drehe drein droge drohe droht drüse dufte düfte dumme dünne durch dürft duzen ebnen echse echte ecken edler ehren ehrte eifer eigen eilig eilte einem einen einer eines einst eisig ekeln elche elfen elite ellen emsig enden enger enten erbin erbse erden erker ernst erste esche etwas eulen euren eurem eurer eures ewige extra elfte fahle fahre fährt fakir fängt fasse fasst faule fauna faxen fazit fehle fehlt feine felge felle feste fette filme filze finde finne first flehe fleht flieg flöhe flora flott flüge flure flute folge folgt fonds forme formt forst fotos frass freie freue freut frist frohe front fügen fühle fühlt führe führt fülle füllt funde fusel füsse falls fiele gaben gänge ganze garen garne gäste gatte gebet gebot gehör gegen gelbe gelte gemüt genau genre genug gerät gerte gibst gilde ginge gleis glitt gnome gönne gosse gräbt grase graue greif griff grobe groll grüne gucke gummi gurte gutes güter guten guter haben hacke hähne halbe halde halme halte hälse hände hänge hängt harte härte hasen hasse hasst hatte hätte hauen haute häute hebel hefte hegen heile heilt heime heize heizt helfe helft henne herbe herrn herum hetze heuer heute hexen hielt hirte hocke hoffe hofft höhen hohle höhle holde hölle holte hörer horde hörst hörte hosen hüfte hülse hunde hupen hüpfe hüpft hurra hüten helle hohen hoher hohes ideen idyll ihnen ihren ihrer ihres ihrem immer impfe impft indem innen innig irren irrte jagte jahre jeans jeder jedes jedem jeden jener jenes jetzt juckt junge jurte kahle kähne kalte kälte kamen kämen kämme kanon kanus karge karre kaufe kauft kehre kehrt keile keime keimt keine keins kekse kelle kenne kennt kerbe kerle kerne kesse kippt klagt klamm klare klebe klebt kleie klick kloss klotz kluge knete knick knien kocht köche komme kommt könne könnt köpfe körbe koste krähe krame kraus kroch kröte krüge krume kübel kufen kuhle kühle kühlt kühne küken kulte kuppe kurse kurze kürze küsse küsst kutte labor lache lacht lagen lahme laien laken lamas lande länge lasen lasse laste lauer laufe läuft laute lebte lecke leckt leert legte lehne lehnt lehrt leide leier leihe leiht leite lenke lenkt lerne lernt leute liebt liefe liege liegt liess lifte linde linke lippe lobte lohnt lokal losen lösen löste lotse löwen luden lüfte lupen lurch lüste mache mähen mahlt mähne mahnt malte manch matte mäuse meere mehrt meide meine meint meist melde melke melkt mensa merke merkt miete milbe minus mitte möbel moden modem moder möhre molke monde moore moose morde motte möwen mücke mühen münze musst mutti nagte nahen nähte namen nasal nasen nasse neben nehme nehmt neige neigt nenne nennt nervt netze netto neuen neuer neues nicht nicke nickt niese niest nimmt noble noten nüsse nutze nutzt nette oasen obere obhut ochse öfter ohren omega opern optik order orten osten paare pacht packe packt pappe parkt party pässe passt pater patin pauke pesto pfade pfiff pickt pilze pizza plagt plant plump polar posen prall prise prost prüfe prüft pulte pumpt putze putzt quäle quält quasi quell quirl quitt rache rafft ragen ragte ranke rankt raste raube raubt rauch räume rauen reben recke regie regne reibe reibt reift reime reimt reine reist reite reize reizt renne rennt rette ringe ringt rinne risse ritte ritze röcke roden rodeo röhre rolle rollt rosen rosig rosse roste rotor rüben rückt ruhen rühre rührt rumpf runen rüste roten roter rotes rohen roher rohes saale säbel säcke säfte sagte salto salze särge satte sätze säule saure sause saust schau schob schuf seele segen sehne sehnt seien seile seine selig senat sende senke senkt setze setzt siebe siebt siege siegt siehe sieht singe singt sinke sinkt sinne sinnt sippe sitze sitzt skier sofas sogar söhne solch solle sollt somit sonst sorgt spalt spann spare spart späte spatz spreu sprit spuke spukt spüle spült spüre spürt stäbe stank starb statt staue staut stege stehe steht steig stete stieg störe stört stück stufe sucht süden sülze summe summt sünde süsse sagst sechs schon tadel tages takte taler tanke tankt tanze tanzt tarnt tatze tauen taugt taxis teige teile teilt tests texte these thron tiefe tiere tippe tippt tobte tolle tonne töpfe toren tosen toten töten träge trägt traue traut trend trink trotz trübe trupp tuben tücke türme turne turnt typen ufern uhren ulkig umbau unser unten unter urnen vasen väter venen verse viele viren visum vögel volle voran vorne waben wachs wacht waden wagte wähle wählt wahre währt wände waren wären warme wärme warne warnt warte warum wecke weckt wedel wegen wehen wehre wehrt weine weint weist weite welke wenig werbe werde werke werte wespe wider wiegt wilde winde winkt wirft wirke wirkt wirre wirst wirte wisch wisst witze wogen wohin wohne wohnt wölfe wollt worte wühlt wurde wüten weder woher zacke zahle zählt zahlt zahme zähne zankt zarte zäune zeche zehen zehnt zeige zeigt zelte zeugt ziehe zieht ziele zielt zinke zinne zivil zogen zonen zöpfe zuckt zügel zumal zunft zupft zwang zweck zwirn zwist zwölf zuvor hallo hecht iltis bytes level codes akkus audio türen magst liest backt fragt redet hilft getan super fremd total edles läden zügen räder velos trams znüni merci natel rande bellt bläst blüht bohrt fällt gähnt hackt heult lockt nützt saugt wärmt würzt grund löhne konto kinos papas mamas babys teddy tänze glich hiess kniff quoll sahen stach taten wuchs wusch assen baten erbte fegte kaute regte webte wehte'.split(' ');
    const ERLAUBT = new Set(LOESUNGEN.concat(WEITERE));

    // Tageswort: feste, gemischte Reihenfolge ab dem 1. Januar 2026
    const ORDER = LOESUNGEN.slice();
    (function () { const r = G.rng('xiru-woertle'); for (let i = ORDER.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ORDER[i], ORDER[j]] = [ORDER[j], ORDER[i]]; } })();
    function dayNumber() {
        const now = new Date();
        const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), b = Date.UTC(2026, 0, 1);
        return Math.round((a - b) / 86400000) + 1;
    }

    const boardEl = $('#board'), kbdEl = $('#kbd'), msgEl = $('#msg');
    const ROWS_KEYS = [['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'], ['Enter', 'y', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace']];
    const RANK = { absent: 1, present: 2, correct: 3 };

    let save = XIRU.load('woertle', null) || {};
    if (!save.stats) save.stats = {};
    ['taeglich', 'endlos'].forEach(m => { if (!save.stats[m]) save.stats[m] = { played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0] }; });

    let mode = 'taeglich';
    let solution = '', rows = [], current = '', over = false, won = false, busy = false, dayNo = 0, msgTimer = 0;

    /* ── Hilfen ── */
    function evaluate(guess, sol) {
        const res = Array(LEN).fill('absent'), rest = {};
        for (let i = 0; i < LEN; i++) { if (guess[i] === sol[i]) res[i] = 'correct'; else rest[sol[i]] = (rest[sol[i]] || 0) + 1; }
        for (let i = 0; i < LEN; i++) if (res[i] !== 'correct' && rest[guess[i]] > 0) { res[i] = 'present'; rest[guess[i]]--; }
        return res;
    }
    function persist() { XIRU.save('woertle', save); }
    function message(text, ms) {
        msgEl.textContent = text; msgEl.classList.add('is-on');
        clearTimeout(msgTimer);
        msgTimer = setTimeout(() => msgEl.classList.remove('is-on'), ms || 1600);
    }

    /* ── Aufbau ── */
    function buildBoard() {
        let h = '';
        for (let r = 0; r < TRIES; r++) {
            h += '<div class="wt-row" data-r="' + r + '">';
            for (let c = 0; c < LEN; c++) h += '<div class="wt-tile" data-c="' + c + '"></div>';
            h += '</div>';
        }
        boardEl.innerHTML = h;
    }
    function buildKeyboard() {
        kbdEl.innerHTML = ROWS_KEYS.map(row => '<div class="wt-kbd__row">' + row.map(k => {
            const wide = k.length > 1;
            const label = k === 'Enter' ? 'Prüfen' : k === 'Backspace' ? '⌫' : k.toUpperCase();
            return '<button type="button" class="wt-key' + (wide ? ' wt-key--wide' : '') + '" data-key="' + k + '"' + (k === 'Backspace' ? ' aria-label="Löschen"' : '') + '>' + label + '</button>';
        }).join('') + '</div>').join('');
    }
    const rowEl = r => boardEl.querySelector('.wt-row[data-r="' + r + '"]');

    function paintRow(r, word, res, animate) {
        const tiles = $$('.wt-tile', rowEl(r));
        tiles.forEach((t, i) => {
            t.textContent = word[i] || '';
            t.className = 'wt-tile' + (word[i] && !res ? ' is-filled' : '');
            if (res) {
                t.classList.add('is-' + res[i]);
                if (animate) { t.style.setProperty('--d', (i * .22) + 's'); t.classList.add('is-flip'); }
            }
        });
    }
    function paintKeys() {
        const best = {};
        rows.forEach(({ word, res }) => { for (let i = 0; i < LEN; i++) { const ch = word[i]; if (!best[ch] || RANK[res[i]] > RANK[best[ch]]) best[ch] = res[i]; } });
        $$('.wt-key', kbdEl).forEach(k => {
            const ch = k.dataset.key;
            k.classList.remove('is-correct', 'is-present', 'is-absent');
            if (best[ch]) k.classList.add('is-' + best[ch]);
        });
    }

    function updateHud() {
        const st = save.stats[mode];
        G.hud('#hud', {
            Modus: mode === 'taeglich' ? 'Wörtle #' + dayNo : 'Endlos',
            Versuch: Math.min(rows.length + (over ? 0 : 1), TRIES) + '/' + TRIES,
            Serie: st.streak
        });
        const b = XIRU.best('woertle');
        $('#best').textContent = b == null ? '–' : XIRU.fmt(b) + (b === 1 ? ' Sieg' : ' Siege');
        $('#btn-share').hidden = !over;
        $('#btn-next').hidden = !(over && mode === 'endlos');
    }

    /* ── Spielstart ── */
    function startDaily() {
        dayNo = dayNumber();
        solution = ORDER[((dayNo - 1) % ORDER.length + ORDER.length) % ORDER.length];
        const d = save.daily && save.daily.day === dayNo ? save.daily : { day: dayNo, guesses: [] };
        save.daily = d;
        restore(d.guesses);
        if (over) message(won ? 'Heute schon gelöst! Morgen gibt es ein neues Wort.' : 'Heute ist vorbei – morgen gibt es ein neues Wort.', 2600);
    }
    function startEndless() {
        let w;
        do { w = XIRU.pick(LOESUNGEN); } while (w === solution && LOESUNGEN.length > 1);
        solution = w;
        restore([]);
    }
    function restore(guesses) {
        rows = []; current = ''; over = false; won = false; busy = false;
        buildBoard();
        guesses.forEach(g => { const res = evaluate(g, solution); rows.push({ word: g, res }); paintRow(rows.length - 1, g, res, false); });
        const last = rows[rows.length - 1];
        if (last && last.res.every(x => x === 'correct')) { over = true; won = true; }
        else if (rows.length >= TRIES) over = true;
        paintKeys();
        updateHud();
        $('#mode-desc').textContent = mode === 'taeglich'
            ? 'Ein Wort pro Tag – für alle gleich. Dein Fortschritt bleibt gespeichert.'
            : 'Ein Wort nach dem anderen, so viele du willst.';
    }

    /* ── Eingabe ── */
    function typeLetter(ch) {
        if (over || busy || current.length >= LEN) return;
        current += ch;
        paintRow(rows.length, current, null, false);
    }
    function backspace() {
        if (over || busy || !current) return;
        current = current.slice(0, -1);
        paintRow(rows.length, current, null, false);
    }
    function submit() {
        if (over || busy) return;
        const row = rowEl(rows.length);
        const shake = text => { message(text); row.classList.remove('is-shake'); void row.offsetWidth; row.classList.add('is-shake'); G.sfx.hit(); };
        if (current.length < LEN) return shake('Zu wenig Buchstaben');
        if (!ERLAUBT.has(current)) return shake('Kein Wort aus der Wortliste');
        if (current === 'hilfe') XIRU.egg('g-woertle-hilfe');
        const word = current, res = evaluate(word, solution);
        rows.push({ word, res });
        current = '';
        if (mode === 'taeglich') { save.daily.guesses.push(word); persist(); }
        busy = true;
        paintRow(rows.length - 1, word, res, XIRU.setting('anim') !== false);
        res.forEach((r, i) => setTimeout(() => XIRU.beep(r === 'correct' ? 784 : r === 'present' ? 587 : 330, .06, 'triangle', .05), i * 220 + 250));
        const wait = XIRU.setting('anim') === false ? 50 : LEN * 220 + 450;
        setTimeout(() => {
            busy = false;
            paintKeys();
            if (res.every(x => x === 'correct')) finish(true);
            else if (rows.length >= TRIES) finish(false);
            else updateHud();
        }, wait);
    }

    const PRAISE = ['Genial!', 'Grossartig!', 'Super!', 'Stark!', 'Gut gemacht!', 'Puh, knapp!'];
    function finish(win) {
        over = true; won = win;
        const st = save.stats[mode];
        st.played++;
        if (win) { st.wins++; st.streak++; st.max = Math.max(st.max, st.streak); st.dist[rows.length - 1]++; }
        else st.streak = 0;
        if (mode === 'taeglich') save.daily.done = true;
        persist();
        const r = XIRU.score('woertle', st.streak);
        if (win) {
            $$('.wt-tile', rowEl(rows.length - 1)).forEach((t, i) => { t.classList.remove('is-flip'); t.style.setProperty('--d', (i * .09) + 's'); void t.offsetWidth; t.classList.add('is-bounce'); });
            message(PRAISE[rows.length - 1], 2000);
            G.sfx.win();
            XIRU.confetti();
            if (rows.length <= 2) XIRU.egg('g-woertle-zwei');
            if (st.streak >= 5) XIRU.egg('g-woertle-serie');
        } else {
            message('Das Wort war: ' + solution.toUpperCase(), 4000);
            G.sfx.die();
        }
        updateHud();
        setTimeout(() => showStats(true, r.isNew && st.streak > 0), win ? 1500 : 2200);
    }

    /* ── Teilen & Statistik ── */
    function shareText() {
        const head = (mode === 'taeglich' ? 'Wörtle #' + dayNo : 'Wörtle Endlos') + ' ' + (won ? rows.length : 'X') + '/' + TRIES;
        const grid = rows.map(r => r.res.map(x => x === 'correct' ? '🟩' : x === 'present' ? '🟨' : '⬛').join('')).join('\n');
        return head + '\n\n' + grid + '\n\nxiruprojekts · Spielhalle';
    }
    function copy(text) {
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            ta.remove();
            return ok;
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => message('In die Zwischenablage kopiert!'), () => message(fallback() ? 'In die Zwischenablage kopiert!' : 'Kopieren hat nicht geklappt'));
        } else message(fallback() ? 'In die Zwischenablage kopiert!' : 'Kopieren hat nicht geklappt');
    }
    function untilMidnight() {
        const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
        const s = Math.max(0, Math.round((m - n) / 1000));
        return Math.floor(s / 3600) + ' h ' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ' min';
    }
    function showStats(afterGame, isRecord) {
        const st = save.stats[mode];
        const pct = st.played ? Math.round(st.wins / st.played * 100) : 0;
        const maxD = Math.max(1, Math.max.apply(null, st.dist));
        const stat = (v, l) => '<div class="stat"><span class="stat__value">' + v + '</span><span class="stat__label">' + l + '</span></div>';
        let h = '<h2>' + (afterGame ? (won ? '🎉 Gelöst!' : '😵 Leider nicht') : '📊 Statistik') + '</h2>';
        h += '<p class="muted small mb-0">' + (mode === 'taeglich' ? 'Wort des Tages' : 'Endlosmodus') + '</p>';
        if (afterGame) h += '<p class="mt-1">Das Wort: <span class="wt-solution">' + XIRU.esc(solution.toUpperCase()) + '</span>' + (isRecord ? ' · <strong>Neuer Rekord!</strong>' : '') + '</p>';
        h += '<div class="wt-stats">' + stat(st.played, 'Gespielt') + stat(pct + ' %', 'Gewonnen') + stat(st.streak, 'Serie') + stat(st.max, 'Beste Serie') + '</div>';
        h += '<h3>Versuche bis zum Ziel</h3><div class="wt-dist">' + st.dist.map((n, i) =>
            '<div class="wt-dist__row"><span>' + (i + 1) + '</span><span class="wt-dist__bar' + (afterGame && won && rows.length === i + 1 ? ' is-now' : '') + '" style="--w:' + Math.max(8, Math.round(n / maxD * 100)) + '%">' + n + '</span></div>').join('') + '</div>';
        if (mode === 'taeglich') h += '<p class="small muted">Nächstes Wort in ' + untilMidnight() + '.</p>';
        h += '<div class="row mt-2">' + (over ? '<button class="btn btn--primary" type="button" data-act="share">📋 Teilen</button>' : '') +
            (over && mode === 'endlos' ? '<button class="btn" type="button" data-act="next" data-close>Nächstes Wort</button>' : '') +
            (over && mode === 'taeglich' ? '<button class="btn" type="button" data-act="endlos" data-close>Endlos spielen</button>' : '') +
            '<button class="btn btn--ghost" type="button" data-close>Schliessen</button></div>';
        const m = XIRU.modal(h);
        m.el.addEventListener('click', e => {
            const b = e.target.closest('[data-act]'); if (!b) return;
            if (b.dataset.act === 'share') copy(shareText());
            if (b.dataset.act === 'next') setTimeout(startEndless, 0);
            if (b.dataset.act === 'endlos') setTimeout(() => setMode('endlos'), 0);
        });
    }

    function setMode(m) {
        mode = m;
        $$('#modes .chip').forEach(c => c.classList.toggle('is-active', c.dataset.mode === m));
        m === 'taeglich' ? startDaily() : startEndless();
    }

    /* ── Ereignisse ── */
    function handleKey(k) {
        if (k === 'Enter') submit();
        else if (k === 'Backspace') backspace();
        else if (/^[a-zäöü]$/.test(k)) typeLetter(k);
    }
    kbdEl.addEventListener('click', e => {
        const b = e.target.closest('[data-key]'); if (!b) return;
        XIRU.audio();
        handleKey(b.dataset.key);
        b.blur();
    });
    G.keys.onPress((k, e) => {
        if (document.querySelector('.modal-backdrop')) return;
        if (e && (e.ctrlKey || e.metaKey || e.altKey)) return;
        const t = e && e.target;
        if (k === 'Enter' && t && t.closest && t.closest('button, a') && !kbdEl.contains(t)) return;
        if (k === 'Enter' || k === 'Backspace') { if (e) e.preventDefault(); }
        handleKey(k);
    });
    $('#btn-stats').addEventListener('click', () => showStats(false));
    $('#btn-share').addEventListener('click', () => copy(shareText()));
    $('#btn-next').addEventListener('click', startEndless);
    $('#modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b && b.dataset.mode !== mode) setMode(b.dataset.mode); });

    buildKeyboard();
    setMode('taeglich');
});

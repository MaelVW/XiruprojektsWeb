/* ==========================================================================
   PIXMAG Mini – Pixelgrafik
   Alle Figuren sind 16×16-Pixelmatrizen (ein Zeichen = ein Pixel).
   Kacheln (Boden, Wände, Türen …) werden pro Zone prozedural gezeichnet.
   ========================================================================== */
(function () {
    'use strict';
    const PXM = window.PXM = window.PXM || {};

    /* Gemeinsame Palette – '.' ist durchsichtig, 'x'/'X' sind frei belegbar */
    const PAL = {
        k: '#0d0b10', K: '#2a2633', w: '#f4f0e6', W: '#bdb6a6', g: '#8d93a0', G: '#555b68',
        r: '#d23a3a', R: '#7c1f26', o: '#f08a2c', y: '#f6d55c', Y: '#b08a26',
        l: '#8fdc5a', n: '#3f9a44', N: '#22582c', b: '#4f95e8', B: '#2a4a8c', c: '#8ee8ff',
        p: '#a065e8', P: '#5a3394', s: '#f0c39a', S: '#b5805a', u: '#94643a', U: '#5c3b1f',
        m: '#e070d0', q: '#e89aa8', t: '#5f9a9a', T: '#2f5a5c', x: '#ff00ff', X: '#880088'
    };

    const SPR = {
        magier: [
            '......k.....kk..', '.....kPk...kcck.', '.....kpPk..kcwk.', '....kpppPk..kk..',
            '....kppypPk..u..', '...kpppppPPk.u..', '..kkkkkkkkkkku..', '....ksssssk..u..',
            '....ksksksk..u..', '....kwwwwwk.su..', '...kpwwwwpppsu..', '...kppwwppPk.u..',
            '...kpppYppPk.u..', '..kppppppPPPku..', '..kPppppPPPPku..', '...kUUk.kUUk.U..'
        ],
        krieger: [
            '......rrr.......', '.....kRrrk......', '.g..kgggggk.....', '.g.kgwgggggk....',
            '.g.kgkkkkkgk....', '.g.kgsksksgk....', '.g..kgsssgk.....', '.g.kGggrggGkkbbk',
            'YYYksgrrrgskbybk', '.u.kGggrggGkbbbk', '.u.kGGgrgGGkbybk', '...kYYYYYYYkkbk.',
            '...kGgggggGk.kk.', '...kGgk.kgGk....', '...kGgk.kgGk....', '..kkUUk.kUUkk...'
        ],
        schurke: [
            '................', '......kkkk......', '.....kNNNNk.....', '....kNnnnnNk....',
            '....kNnKKnNk....', '....kNKyKyKNk...', '....kNKKKKKNk...', '...kNNnKKKnNNk..',
            '..kNnnnNNNnnnNk.', '..kNnnUUUUUnnNkg', '..kNnnnnnnnnnksg', '...kNnnnnnnnNk..',
            '...kNnnNNnnnNk..', '...kNNnk.kNNNk..', '...kKKk...kKKk..', '..kkKKk...kKKkk.'
        ],
        ratte: [
            '................', '................', '................', '................',
            '................', '................', '................', '................',
            '...........kqk..', '.....kkkkkk.kk..', '....kggggggkggk.', '...kgggggggggkgk',
            'kk.kgggggggggggq', '.kkkGggggggGGGk.', '....kGk...kGk...', '....kk.....kk...'
        ],
        fledermaus: [
            '................', '................', '................', 'k..............k',
            'kk............kk', 'kPk...k..k...kPk', 'kPPk..kKKk..kPPk', 'kPPPkKrKKrKkPPPk',
            '.kPPPKKKKKKPPPk.', '..kPkKKwwKKkPk..', '...k..kKKk..k...', '......k..k......',
            '................', '................', '................', '................'
        ],
        fledermaus2: [
            '................', '................', '................', '................',
            '................', '......k..k......', '......kKKk......', '....kkKrKKrKkk..',
            '..kPPKKKKKKPPk..', '.kPPPkKwwKkPPPk.', 'kPPPk.kKKk.kPPPk', 'kPk..........kPk',
            'kk............kk', '................', '................', '................'
        ],
        goblin: [
            '................', '................', '................', '......kkkk......',
            '.k...knnnnk...k.', '.kk.knnnnnnk.kk.', '.knnknrnnrnknnk.', '..kkknnnnnnkkk..',
            '....knwkkwnk....', '....kknnnnkk....', '...kuuUuuUuuk.u.', '..knkuuuuuuknkU.',
            '..kk.kuUUuk.kk..', '.....kuuuuk.....', '.....knk.knk....', '....kkk...kkk...'
        ],
        schleim: [
            '................', '................', '................', '................',
            '................', '................', '................', '......kkkk......',
            '....kklllllkk...', '...kllwwlllllk..', '..klwwlllllllnk.', '..kllkllllkllnk.',
            '.klllllllllllnnk', '.knllllllllllnNk', '..kNNnnnnnnnNNk.', '...kkkkkkkkkkk..'
        ],
        spinne: [
            '................', '................', '................', '................',
            '..k..........k..', '...k..kkkk..k...', 'k...kkKKKKkk...k', '.k.kKKKpKKKKk.k.',
            '..kKKrKKKKrKKk..', 'kkkKKKKKKKKKKkkk', '...kKKwKKwKKk...', '.kk.kKKKKKKk.kk.',
            'k...k.kkkk.k...k', '...k........k...', '................', '................'
        ],
        skelett: [
            '................', '................', '.....kkkkkk.....', '....kwwwwwwk....',
            '....kwKrwKrk....', '....kwwwkwwk....', '.....kwkwkwk..g.', '......kkkkk...g.',
            '....kkwkwkwkk.g.', '...kw.kwwwk.wkg.', '...kw.kwkwk.wkY.', '...kW..kwk..Wku.',
            '......kWWWk.....', '......kwkwk.....', '......kw.wk.....', '.....kww.wwk....'
        ],
        schuetze: [
            '................', '................', '.....kkkkkk.....', '..u.kwwwwwwk....',
            '.u.WkwKrwKrk....', '.u.Wkwwwkwwk....', 'u..W.kwkwkwk....', 'u..W..kkkkk.....',
            'u..Wkkwkwkwkk...', 'uwwW.kwwwk.wk...', 'u..W..kwkwk.wk..', '.u.W...kwk..Wk..',
            '.u.W..kWWWk.....', '..u...kwkwk.....', '......kw.wk.....', '.....kww.wwk....'
        ],
        truhe: [
            '................', '................', '................', '................',
            '................', '...kkkkkkkkkk...', '..kuuuuuuuuuuk..', '..kuUuuuuuuUuk..',
            '..kYYYYYYYYYYk..', '..kkkkkYYkkkkk..', '..kuuuuyYuuuuk..', '..kuUuuuuuuUuk..',
            '..kuuuuuuuuuuk..', '..kYuuuuuuuuYk..', '..kkkkkkkkkkkk..', '................'
        ],
        truhe_offen: [
            '................', '................', '................', '...kkkkkkkkkk...',
            '..kuuuuuuuuuuk..', '..kYYYYYYYYYYk..', '..kkkkkkkkkkkk..', '..kKKyKKKKyKKk..',
            '..kKKKKKyKKKKk..', '..kkkkkkkkkkkk..', '..kuuuuuuuuuuk..', '..kuUuuuuuuUuk..',
            '..kuuuuuuuuuuk..', '..kYuuuuuuuuYk..', '..kkkkkkkkkkkk..', '................'
        ],
        mimik: [
            '................', '................', '................', '...kkkkkkkkkk...',
            '..kuuuuuuuuuuk..', '..kuyKuuuuKyuk..', '..kYYYYYYYYYYk..', '..kwkwkwkwkwkk..',
            '..kRRRRrrRRRRk..', '..kRRrrrrrrRRk..', '..kkwkwkwkwkwk..', '..kuUuuuuuuUuk..',
            '..kuuuuuuuuuuk..', '..kYuuuuuuuuYk..', '..kkkkkkkkkkkk..', '...kk......kk...'
        ],
        zombie: [
            '................', '................', '.....kkkkk......', '....knnlnnk.....',
            '....knrnrnk.....', '....knnnnnk.....', '....knkkknk.....', '.....knnnk......',
            '...kbbbbbbbknnnk', '...kbBbbbBbknnnk', '...kbbBbBbbkkkk.', '...kbbbbbbbk....',
            '...kBbbBbbBk....', '....kGGkGGk.....', '....knk.knk.....', '...kkkk.kkkk....'
        ],
        geist: [
            '................', '......kkkk......', '.....kwwwwk.....', '....kwwwwwwk....',
            '...kwKKwwKKwk...', '...kwKKwwKKwk...', '...kwwwwwwwwk...', '...kwwwKKwwwk...',
            '..kcwwwKKwwwck..', '..kcwwwwwwwwck..', '.kccwwwwwwwwcck.', '.kcccwwwwwwccck.',
            '.kcccccwwcccccck', '..kcck.kcck.kck.', '...kk...kk...k..', '................'
        ],
        ork: [
            '................', '....kkkkkk......', '...kNNNNNNk.....', '..kNNnnnnNNk....',
            '..kNnrnnrnNk....', '..kNnnnnnnNk....', '..kNwnkknwNk....', '...kNNNNNNk..U..',
            '.kkGgGGGGgGkkgg.', 'kNNkGGGGGGkNNgg.', 'kNNkGgGGgGkNNU..', 'kNk.kYYYYk.kNk..',
            '....kGGGGk......', '...kGGkkGGk.....', '...kNNk.kNNk....', '..kkkkk.kkkkk...'
        ],
        hexer: [
            '................', '......kkk.......', '.....kRRRk......', '....kRRRRRk.....',
            '...kRRKKKRRk....', '...kRKmKmKRk....', '...kRKKKKKRk....', '..kRRRKKKRRRk...',
            '.kRRRRRRRRRRRk..', 'kmkRRRKRKRRRkmk.', '.m.kRRRKRRRRk.m.', '...kRRRKRRRRk...',
            '...kRRKRRRKRk...', '..kRRRKRRRKRRk..', '..kRRKRRRRRKRk..', '..kkkkkkkkkkkk..'
        ],
        flamme: [
            '.......k........', '......kyk...k...', '..k..kyok..kyk..', '.kyk.koyk.koyk..',
            '.koykoyyokooyk..', '..koyyyyyyyyok..', '..kooykyykyook..', '..koyyyyyyyyok..',
            '..kooywwwwyook..', '...koyyyyyyok...', '..krooyyyyoork..', '.krroooyyooorrk.',
            '.krRrooooooRrrk.', '..kRrrrrrrrrRk..', '...kRRrrrrRRk...', '....kkkkkkkk....'
        ],
        troll: [
            '................', '....kkkkkk......', '...kttttttk.....', '..kttyttytttk...',
            '..ktttkttttk....', '..ktwkkkkwtk....', '.kkttttttttkk...', 'kttkTTTTTTktk.u.',
            'kttkTtttttTkttuk', 'kttkTtttttTkkUUU', 'ktk.kTttttTk.UUU', 'kk..kUuuuuUk..k.',
            '....kTTkkTTk....', '...kttk..kttk...', '...kttk..kttk...', '..kkkkk..kkkkk..'
        ],
        golem: [
            '................', '...kkkkkkkkkk...', '...kuuuuuuuuk...', '...kuccuuccuk...',
            '...kuuuuuuuuk...', '...kUuUUUUuUk...', '.kkkkkkkkkkkkkk.', 'kuuukuuuuuukuuuk',
            'kuuukucccuukuuuk', 'kUuukuuucuukuuUk', 'kuuUkuuuuuukUuuk', 'kkkkkUuuuuUkkkkk',
            '....kuuUUuuk....', '...kuuuk.kuuuk..', '...kUUUk.kUUUk..', '...kkkkk.kkkkk..'
        ],
        haendler: [
            '................', '.....kkkk.......', '....kuuuuk.kkk..', '...kuuuuuukUUUk.',
            '...kuKKKKukUuUk.', '...kKyKyKKkUuUk.', '...kKKKKKKkUuUk.', '..kuuuuuuuukUUk.',
            '.kuuUuuuuUuukUk.', 'kyksuuuuuuuskk..', 'kyk.kuuYuuuk....', '.k..kuuuuuuk....',
            '....kUuuuuUk....', '....kuuuuuuk....', '....kUUkkUUk....', '...kkkk..kkkk...'
        ],
        goblinkoenig: [
            '....y.y.y.y.....', '....yyyyyyy.....', '....yrYyYry.....', '.k..knnnnnk...k.',
            '.kk.knnnnnnk.kk.', '.knnknrnnrnknnk.', '..kkknnnnnnkkk..', '....knwkkwnk....',
            '..rrrknnnnkrrr..', '.rRrkYYYYYYkrRr.', '.rRknkyYYykknRr.', '.rRRkYYYYYYkRRr.',
            '.rRRRkuUUukRRRr.', '.rRRRknk.knkRRr.', '..rrrknk.knkrr..', '.....kkk.kkk....'
        ],
        drache: [
            'k..............k', 'kk....k..k....kk', 'kRk..kRkkRk..kRk', 'kRRk.krrrrk.kRRk',
            'kRrRkryrryrkRrRk', 'kRrrRkrkkrkRrrRk', 'kRrrrRkwwkRrrrRk', '.kRrrRrrrrRrrRk.',
            '..kRrroyyorrRk..', '...kRrroyorrRk..', '...krrroyorrrk..', '...kRrrroorrRk..',
            '...kRRrrrrrRRk.k', '...kRk.kk.kRkkRk', '..kYYk....kYYRk.', '..kkkk....kkkk..'
        ],
        lich: [
            '.....y.y.y......', '.....yyyyy......', '....kwwwwwk.....', '....kwlwlwk.....',
            '....kwwkwwk.....', '.....kwkwk......', '...kPPkkkPPk.klk', '..kPppPPPppPk.k.',
            '.kPppPPPPPppPWU.', '.kPpPPPlPPPpPkU.', '.kPpPPPPPPPpk.U.', '..kPpPPPPPpPk.U.',
            '..kPpPPPPPppPkU.', '.kPppPPPPPppPkU.', '.kPPpPPPPPpPPkU.', '.kkkkkkkkkkkkkU.'
        ],
        herz: [
            '................', '...kkk....kkk...', '..kPPPk..kPPPk..', '.kPppPPkkPPppPk.',
            '.kPpPPPPPPPPpPk.', '.kPPPkkkkkkPPPk.', '.kPPkwwrrwwkPPk.', '.kPPkwrkkrwkPPk.',
            '..kPkwwrrwwkPk..', '..kPPkkkkkkPPk..', '...kPPPPPPPPk...', '....kPPRRPPk....',
            '.k...kPRRPk...k.', '..k.k.kPPk.k.k..', '...k.k.kk.k.k...', '....k......k....'
        ],
        // Gegenstände
        trank: [
            '................', '................', '................', '......kkkk......',
            '......kuuk......', '......kwWk......', '......kwWk......', '.....kwxxxk.....',
            '....kwxxxxxk....', '....kwxxxxxk....', '....kxxxxxXk....', '....kxxxxXXk....',
            '.....kXXXXk.....', '......kkkk......', '................', '................'
        ],
        rolle: [
            '................', '................', '................', '................',
            '....kkkkkkkk....', '...kWwwwwwwWk...', '...kkwwwwwwkk...', '....kwKKKKwk....',
            '....kwwwwwwk....', '....kwKKKwwk....', '....kwwwwrrk....', '...kkwwwwrRkk...',
            '...kWwwwwwwWk...', '....kkkkkkkk....', '................', '................'
        ],
        schwert: [
            '................', '................', '............kk..', '...........kwgk.',
            '..........kwgk..', '.........kwgk...', '........kwgk....', '.......kwgk.....',
            '..k...kwgk......', '...kYkwgk.......', '....kYgk........', '...kuYYYk.......',
            '..kuuk.kYk......', '.kuuk...........', '.kYk............', '..k.............'
        ],
        dolch: [
            '................', '................', '................', '................',
            '................', '..........kk....', '.........kwgk...', '........kwgk....',
            '.......kwgk.....', '....k.kwgk......', '.....kYgk.......', '....kuYYk.......',
            '...kuuk.k.......', '..kYk...........', '...k............', '................'
        ],
        stab: [
            '................', '..........kkk...', '.........kcwck..', '.........kccck..',
            '..........kuk...', '.........kuk....', '........kuk.....', '.......kuk......',
            '......kuk.......', '.....kuk........', '....kuk.........', '...kuk..........',
            '..kuk...........', '.kUk............', '..k.............', '................'
        ],
        axt: [
            '................', '................', '.........kkk....', '........kgggk...',
            '.......kgwggk...', '......kugggggk..', '.....kuk.kggk...', '....kuk...kk....',
            '...kuk..........', '..kuk...........', '.kuk............', '.kk.............',
            '................', '................', '................', '................'
        ],
        kolben: [
            '................', '................', '..........kkk...', '.........kgGgk..',
            '........kgGgGgk.', '.........kgGgk..', '.........kuk....', '........kuk.....',
            '.......kuk......', '......kuk.......', '.....kuk........', '....kUk.........',
            '...kk...........', '................', '................', '................'
        ],
        harnisch: [
            '................', '................', '................', '...kk......kk...',
            '..kgGk....kGgk..', '.kggGGkkkkGGggk.', '.kgggGGGGGGgggk.', '.kkkggggggggkkk.',
            '...kgwgggggGk...', '...kggggggGGk...', '...kGgggggGGk...', '...kYYYYYYYYk...',
            '...kggGkkGggk...', '...kkkk..kkkk...', '................', '................'
        ],
        robe: [
            '................', '................', '................', '.....kk..kk.....',
            '....kxxkkxxk....', '...kxxxxxxxxk...', '..kxxkxxxxkxxk..', '..kxk.kxxk.kxk..',
            '..kk.kxxxxk.kk..', '.....kxyyxk.....', '....kxxxxxxk....', '....kxxXxxXk....',
            '...kxxXxxxXxk...', '...kkkkkkkkkk...', '................', '................'
        ],
        gold: [
            '................', '................', '................', '................',
            '................', '................', '................', '................',
            '......kkk.......', '.....kyyyk......', '...kkkYyykkk....', '..kyyykYkyyyk...',
            '.kkYyyyykyyyYk..', '.kyyyYkkkYyyyk..', '.kYYYYYYYYYYYk..', '..kkkkkkkkkkk...'
        ],
        kristall: [
            '................', '................', '.......kk.......', '......kcpk......',
            '.....kccppk.....', '.....kcwcpk.....', '....kccwcppk....', '....kcccpppk....',
            '....kccppPPk....', '....kccpPPPk....', '.....kcpPPk.....', '.....kcpPPk.....',
            '......kpPk......', '.......kk.......', '................', '................'
        ],
        rune: [
            '................', '................', '................', '.....kkkkkk.....',
            '....kGgggggk....', '...kGggxxgggk...', '...kGgxggxggk...', '...kGgggxgggk...',
            '...kGggxgggGk...', '...kGgxggxgGk...', '...kGggxxggGk...', '...kGgggggGGk...',
            '...kGGGGGGGGk...', '....kkkkkkkk....', '................', '................'
        ],
        tinte: [
            '................', '............kk..', '...........kwwk.', '..........kwWk..',
            '.........kwWk...', '........kwWk....', '.......kWk......', '....kkkkkkkk....',
            '....kGgggggk....', '...kPPPkPPPPk...', '..kPpPPPPPPPPk..', '..kPpPPPPPPPPk..',
            '..kPPPPPPPPPPk..', '...kkkkkkkkkk...', '................', '................'
        ],
        cd: [
            '................', '................', '.....kkkkkk.....', '...kkwccwwwkk...',
            '..kwwcmwwwwwwk..', '.kwwcmwwwwwwwwk.', '.kwcmwwwkkwwwwk.', 'kwwmwwwk..kwwwwk',
            'kwwwwwwk..kwwyyk', '.kwwwwwwkkwyywk.', '.kwwwwwwwwyywwk.', '..kwwwwwwwyyyk..',
            '...kkwwwwyykk...', '.....kkkkkk.....', '................', '................'
        ],
        festplatte: [
            '................', '................', '................', '..kkkkkkkkkkkk..',
            '..kggggggggggk..', '..kgGGGGGGGGgk..', '..kgGwwwwwGGgk..', '..kgwwwKwwwGgk..',
            '..kgwwKKKwwyGk..', '..kgwwwKwwyGgk..', '..kgGwwwwyGGgk..', '..kgGGGGGGGGgk..',
            '..kggggggggrgk..', '..kkkkkkkkkkkk..', '................', '................'
        ],
        diskette: [
            '................', '................', '..kkkkkkkkkkkk..', '..kBBgggggBBBk..',
            '..kBBgKgggBBBk..', '..kBBgKgggBBBk..', '..kBBgggggBBBk..', '..kBBBBBBBBBBk..',
            '..kBwwwwwwwwBk..', '..kBwrrrrwwwBk..', '..kBwwwwwwwwBk..', '..kBwKKKwKKwBk..',
            '..kBwwwwwwwwBk..', '..kkkkkkkkkkkk..', '................', '................'
        ]
    };

    /* Abgeleitete Figuren (Palettentausch) */
    const VARIANT = {
        erzmagier: { base: 'magier', pal: { p: '#ece6f5', P: '#9d94b8', c: '#ffd84a', w: '#fff7d6', y: '#ff9f2a', u: '#c9a24a' } },
        zombie: { base: 'zombie', pal: { n: '#6f9a6a', l: '#9cc48f' } },
        spinne: { base: 'spinne', pal: { K: '#4a3d52' } },
        hexer: { base: 'hexer', pal: { R: '#5a1a46', m: '#ff7af0' } },
        schleim_gift: { base: 'schleim', pal: { l: '#c58cf0', n: '#7a4fb0', N: '#4a2a70' } },
        realkristall: { base: 'kristall', pal: { c: '#bfe9ff', p: '#f472b6', P: '#a78bfa', w: '#ffffff' } },
        diskette: { base: 'diskette', pal: { B: '#3b6fd0' } }
    };

    function rgb(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    const cache = {};
    function build(name, pal, mode) {
        let rows = SPR[name], p = PAL;
        const v = VARIANT[name];
        if (v) { rows = SPR[v.base]; p = Object.assign({}, PAL, v.pal); }
        if (!rows) return null;
        if (pal) p = Object.assign({}, p, pal);
        const c = canvas(16, 16), ctx = c.getContext('2d');
        const img = ctx.createImageData(16, 16);
        for (let y = 0; y < 16; y++) {
            const row = rows[y] || '';
            for (let x = 0; x < 16; x++) {
                const ch = row[x];
                if (!ch || ch === '.') continue;
                const col = p[ch]; if (!col) continue;
                const [r, g, b] = mode === 'white' ? [255, 255, 255] : mode === 'shadow' ? [0, 0, 0] : (mode && mode[0] === '#') ? rgb(mode) : rgb(col);
                const i = (y * 16 + x) * 4;
                img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return c;
    }
    function get(name, pal, mode) {
        const key = name + '|' + (pal ? JSON.stringify(pal) : '') + '|' + (mode || '');
        if (!(key in cache)) cache[key] = build(name, pal, mode);
        return cache[key];
    }
    const iconCache = {};
    function icon(name, pal) {
        const key = name + '|' + (pal ? JSON.stringify(pal) : '');
        if (iconCache[key]) return iconCache[key];
        const src = get(name, pal); if (!src) return '';
        const c = canvas(32, 32), ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0, 32, 32);
        try { iconCache[key] = c.toDataURL(); } catch (e) { iconCache[key] = ''; }
        return iconCache[key];
    }

    /* ── Kacheln ─────────────────────────────────────────────────────── */
    function shade(c, f) { return [Math.max(0, Math.min(255, c[0] * f)), Math.max(0, Math.min(255, c[1] * f)), Math.max(0, Math.min(255, c[2] * f))]; }
    function painter(c) {
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(c.width, c.height);
        return {
            set(x, y, col, a) {
                if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
                const i = (y * c.width + x) * 4;
                img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a == null ? 255 : a;
            },
            get(x, y) { const i = (y * c.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; },
            done() { ctx.putImageData(img, 0, 0); return c; }
        };
    }
    function rngFrom(seed) {
        let a = seed >>> 0;
        return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }

    function floorTile(z, v) {
        const R = rngFrom(1000 + v * 77), c = canvas(16, 16), P = painter(c);
        const base = z.floor;
        const off = v % 2 ? 4 : 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            let f = .92 + R() * .16;
            const gx = (x + (y >= 8 ? off : 0)) % 8, gy = y % 8;
            if (gx === 0 || gy === 0) f *= .72;            // Fugen
            else if (gx === 1 || gy === 1) f *= 1.08;      // Kante
            P.set(x, y, shade(base, f));
        }
        if (v === 2) { let x = 3 + (R() * 8 | 0), y = 4; for (let i = 0; i < 7; i++) { P.set(x, y, shade(base, .55)); x += R() < .5 ? 1 : 0; y++; } }
        if (v === 3 && z.moss) for (let i = 0; i < 9; i++) P.set((R() * 16) | 0, (R() * 16) | 0, shade(z.moss, .7 + R() * .4));
        if (v === 4) { P.set(5, 11, shade(base, 1.4)); P.set(6, 11, shade(base, 1.3)); P.set(11, 4, shade(base, 1.35)); } // Kiesel
        return P.done();
    }
    function wallTop(z, v) {
        const R = rngFrom(2000 + v * 31), c = canvas(16, 16), P = painter(c);
        const base = shade(z.wall, .42);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) P.set(x, y, shade(base, .85 + R() * .3));
        for (let i = 0; i < 6; i++) P.set((R() * 16) | 0, (R() * 16) | 0, shade(base, 1.45));
        return P.done();
    }
    function wallTopCracked(z) {
        const c = wallTop(z, 0), ctx = c.getContext('2d');
        ctx.fillStyle = 'rgb(14,11,14)';
        [[4, 3], [5, 4], [5, 5], [6, 6], [7, 7], [7, 8], [8, 9], [9, 10], [10, 10], [11, 11], [6, 9], [5, 10]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        [[5, 3], [6, 5], [8, 8], [10, 9]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
        return c;
    }
    function wallFront(z, v, cracked) {
        const R = rngFrom(3000 + v * 53), c = canvas(16, 16), P = painter(c);
        const base = z.wall, mortar = shade(z.wall, .45);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            if (y < 3) { P.set(x, y, shade(base, (y === 2 ? .6 : .5) + R() * .08)); continue; }   // Mauerkrone
            const row = (y - 3) >> 2, by = (y - 3) & 3;
            const bx = (x + (row % 2 ? 4 : 0) + v * 2) & 7;
            if (by === 3 || bx === 0) { P.set(x, y, mortar); continue; }
            let f = .9 + R() * .14;
            if (by === 0) f *= 1.15;
            if (bx === 7) f *= .85;
            P.set(x, y, shade(base, f));
        }
        if (z.moss && v === 1) for (let i = 0; i < 6; i++) P.set((R() * 16) | 0, 12 + ((R() * 4) | 0), shade(z.moss, .8));
        if (cracked) {
            let x = 6, y = 4;
            for (let i = 0; i < 11; i++) { P.set(x, y, [18, 14, 16]); P.set(x + 1, y, shade(base, 1.25)); x += (i % 3 === 1) ? 1 : (i % 4 === 0 ? -1 : 0); y++; }
            P.set(9, 9, [18, 14, 16]); P.set(10, 10, [18, 14, 16]); P.set(11, 10, [18, 14, 16]);
        }
        return P.done();
    }
    function doorTile(z, open) {
        const c = floorTile(z, 0), ctx = c.getContext('2d');
        const P = painter(canvas(16, 16));
        if (!open) {
            for (let y = 0; y < 16; y++) for (let x = 1; x < 15; x++) {
                const plank = x % 4 === 1;
                let col = plank ? [70, 44, 22] : [140, 92, 50];
                if (y === 4 || y === 11) col = [60, 60, 66];
                if ((y === 4 || y === 11) && (x === 3 || x === 12)) col = [140, 140, 150];
                P.set(x, y, col);
            }
            for (let y = 0; y < 16; y++) { P.set(0, y, [30, 24, 20]); P.set(15, y, [30, 24, 20]); }
            P.set(12, 8, [230, 200, 90]); P.set(12, 7, [150, 120, 50]);
        } else {
            for (let y = 0; y < 16; y++) { P.set(0, y, [30, 24, 20]); P.set(1, y, [70, 50, 34]); P.set(14, y, [70, 50, 34]); P.set(15, y, [30, 24, 20]); }
            for (let y = 0; y < 16; y++) { P.set(2, y, [110, 72, 40]); P.set(3, y, [80, 52, 28]); }
        }
        ctx.drawImage(P.done(), 0, 0);
        return c;
    }
    function stairsTile(z, sealed) {
        const c = floorTile(z, 1), ctx = c.getContext('2d');
        const P = painter(canvas(16, 16));
        for (let s = 0; s < 5; s++) {
            const f = 1 - s * .19;
            for (let y = 2 + s * 2; y < 14; y++) for (let x = 2 + s * 2; x < 14; x++) {
                const edge = (y === 2 + s * 2) || (x === 2 + s * 2);
                P.set(x, y, shade(z.floor, edge ? f * 1.5 : f * .9));
            }
        }
        for (let y = 11; y < 14; y++) for (let x = 11; x < 14; x++) P.set(x, y, [6, 5, 8]);
        ctx.drawImage(P.done(), 0, 0);
        if (sealed) {
            ctx.fillStyle = 'rgba(160,101,232,.85)';
            for (let i = 2; i < 14; i += 3) { ctx.fillRect(i, 1, 1, 14); ctx.fillRect(1, i, 14, 1); }
        }
        return c;
    }
    function waterTile(frame) {
        const R = rngFrom(4000), c = canvas(16, 16), P = painter(c);
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const wave = Math.sin((x + frame * 4) * .8 + y * 1.3) > .82;
            P.set(x, y, wave ? [80, 140, 190] : shade([28, 58, 92], .9 + R() * .2));
        }
        return P.done();
    }

    const tileCache = {};
    function tiles(zi) {
        if (tileCache[zi]) return tileCache[zi];
        const z = PXM.D.ZONES[zi];
        const t = {
            floor: [0, 1, 2, 3, 4].map(v => floorTile(z, v)),
            top: [0, 1].map(v => wallTop(z, v)),
            front: [0, 1, 2].map(v => wallFront(z, v)),
            secret: wallFront(z, 0, true),
            secretTop: wallTopCracked(z),
            door: doorTile(z, false),
            doorOpen: doorTile(z, true),
            stairs: stairsTile(z, false),
            sealed: stairsTile(z, true),
            water: [waterTile(0), waterTile(1)]
        };
        return (tileCache[zi] = t);
    }

    /* Prüfhilfe für Entwickler: alle Matrizen 16×16? */
    function check() {
        const bad = [];
        Object.keys(SPR).forEach(n => {
            if (SPR[n].length !== 16) bad.push(n + ': ' + SPR[n].length + ' Zeilen');
            SPR[n].forEach((r, i) => { if (r.length !== 16) bad.push(n + '[' + i + ']: ' + r.length); });
        });
        return bad;
    }

    PXM.Spr = { get, icon, tiles, check, PAL, names: () => Object.keys(SPR).concat(Object.keys(VARIANT)) };
})();

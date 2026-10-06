/* Deutsche Wortliste für Passphrasen (Passwort-Generator).
   Nur Kleinbuchstaben a–z, 3–10 Zeichen, keine Umlaute und kein ß – damit sich jede
   Passphrase auf jeder Tastatur (auch US-Layout, Handy, Konsole) problemlos tippen lässt.
   Doppelte Einträge werden beim Laden entfernt. */
window.WZ_WORTE = (function () {
    const txt = `
adler affe ameise biber bison dachs delfin dohle drossel elch elefant ente esel eule falke fasan fink
fisch floh forelle frosch fuchs gams gans gecko geier giraffe gorilla grille hai hamster hase hecht
hirsch hummel hummer hund igel iltis jaguar kamel karpfen katze kauz koala kobra kolibri krabbe kranich
krebs kuh lachs lama lerche leopard libelle luchs made marder maulwurf meise milan molch motte mops
nashorn natter nerz otter panda papagei pelikan pferd pinguin puma rabe ratte reh robbe rochen
salamander schaf schnecke schwan sittich skorpion specht spinne star storch strauss tapir taube tiger
uhu wal wanze wespe wiesel wolf wurm zebra ziege zander pirol welpe pudel pony raupe biene kater
apfel banane birne brot butter dattel essig feige gurke hafer honig ingwer joghurt kaffee kakao karotte
kartoffel kekse kirsche kiwi knoblauch kohl kuchen lauch linse mais mandel mango melone milch minze
nudel nuss olive orange paprika pfeffer pfirsich pflaume pilz pizza quark rahm reis rettich rosine
salat salz sellerie senf spargel spinat suppe tee tomate traube vanille waffel wurst zimt zitrone
zucker zwiebel brezel fondue raclette schoggi gipfeli zopf gulasch burger limo sirup nektar walnuss
bach baum berg blatt blitz blume boden brise dorn ebene eiche erde fels feld fluss frost gipfel
gletscher gras hagel halm himmel insel kiesel klee klippe krater lawine linde meer mond moos nebel
oase ozean pappel quelle regen riff rose sand schnee see sonne stein stern strand sturm sumpf tal
tanne tau ufer vulkan wald welle wiese wind wolke wurzel zweig ahorn birke buche efeu farn tulpe lilie
veilchen nelke kaktus palme bambus flora orkan komet planet galaxie orbit bucht delta
anker bank becher besen bett bild brief brille buch dach decke dose eimer fahne feder fenster
flasche gabel glas glocke hammer helm hut kabel kamm kanne kerze kissen kiste koffer korb krug lampe
leiter mantel messer nadel ofen paket pinsel puppe rad ring rucksack sack schal schere schirm schloss
schrank schuh seil sessel sofa spiegel stuhl tasche tasse teller tisch topf uhr vase wagen zange zelt
zettel kompass laterne fackel kette ordner stempel tafel teppich tinte tonne wecker wippe lupe kran
akku bit byte chip code daten diskette drucker kamera konsole laptop maus modem monitor pixel platine
prozessor router server signal speicher stecker tablet tastatur treiber cursor cache kernel linux makro
patch plugin portal radar raster roboter sensor skript socket tabelle terminal token turbo vektor
widget laser magnet motor radio sonar satellit propeller turbine zahnrad
abend anfang antwort bogen chance echo ende fabel farbe frage freude friede geduld gefahr glanz gruss
hilfe idee jubel kraft laune liebe licht macht melodie mitte morgen mut nacht name neugier nummer
ordnung pause plan puls rhythmus ruhe sage schatten schutz segen sinn spass spiel spur stille stimme
takt tempo traum treue wahl wert wille wunder zauber zeit ziel zufall humor chaos fokus legende
arzt bauer bote dichter fahrer fischer gast held hirte koch maler meister pilot ritter schmied wache
wirt zauberer kaiser lehrer pirat ninja magier riese zwerg fee hexe drache elfe kobold troll titan
clown engel genie lotse rebell geist
aarau basel bern biel chur davos genf luzern lugano sitten thun uri zug glarus wallis jura tessin rigi
pilatus eiger aare rhein reuss limmat emme
rot blau gelb lila rosa grau braun schwarz weiss silber gold bronze kupfer violett beige ocker purpur
magenta cyan indigo kobalt opal rubin quarz marmor diamant perle
ball tor netz schach dame karte puzzle sprung tennis golf hockey rugby boxen judo karate yoga ski
schlitten velo surfen segeln paddel kanu ruder pokal medaille arena stadion rekord duell joker domino
bass beat chor gitarre geige harfe horn klavier note orgel pauke saxofon trommel tuba walzer jodel
alphorn konzert lied oper song tango samba oktave hymne posaune rassel
bluse gurt hemd hose jacke kleid krawatte rock socke stiefel weste umhang robe uniform wolle
april august januar juni juli mai montag dienstag freitag sonntag winter sommer herbst lenz minute
sekunde stunde woche monat jahr
auto bahn boot fahrrad flugzeug fregatte jet kutsche lastwagen rakete roller schiff tram traktor
zeppelin kajak barke jacht flotte ufo
arm auge bart bauch bein daumen ferse finger fuss hals hand haar herz kinn knie kopf lippe magen nase
nacken ohr rippe schulter stirn zahn zehe faust pfote schnabel
amulett artefakt banner burg dolch elixier festung gilde kerker klinge krone lanze quest rune schild
schwert stab talisman trank turm zepter axt pfeil thron tresor schatz ruine palast wappen degen
abenteuer alarm album anwalt archiv atlas bande basis bazar bistro blase blech blei block bohne borke
dampf depot dino docht draht dunkel eisen ernte etage fabrik faden falle fass figur filter flagge
flamme folie form foto funke garage garten gebirge gelee gitter grippe gruppe gummi hafen halle harz
hebel hecke hefe hobel hof horde hotel hupe kanal kante kapelle karawane kegel keller kiefer kino
klang klasse knoten kopie korken kreis kreuz kugel kurve labor lager land leder lehm leine lift liste
manege maske mauer medizin mixer modell muschel museum muster nagel nest neon notiz omega pagode
parade park pass pedal pfad pfanne phase plasma pollen pracht presse prisma profil projekt pulver
pumpe quader rampe rasen revier rezept riegel rolle safari saga salbe sattel schale schaum schicht
schiene schlange schleife schnur schraube sektor serie sockel spaten spule stadt stall stapel staub
stift stoff strahl strom stufe tank tarnung teich theater trapez tunnel vogel volk wabe waage warp
werft wirbel zapfen zentrum ziegel zirkus zunder zylinder
`;
    const seen = new Set();
    return txt.split(/\s+/).filter(w => /^[a-z]{3,10}$/.test(w) && !seen.has(w) && seen.add(w));
})();

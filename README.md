# Aardbevingen Venezuela – dashboard

Een gratis, openbaar dashboard met aardbevingen in Venezuela, op basis van de openbare tabellen van FUNVISIS. De site werkt zichzelf automatisch bij via GitHub Actions en wordt gepubliceerd door [statichost.eu](https://www.statichost.eu) (Zweeds, binnen de EU, gratis Hobby-abonnement) op https://venezuela-earthquakes.statichost.page. De site is drietalig: Nederlands, Engels en Spaans (taalkeuze rechtsboven; standaard volgt de site de browsertaal, met Engels als terugval). Ze is ontworpen voor gebruik op een telefoon en werkt ook op een computer.

## Wat het systeem doet

1. **GitHub Actions** draait `scripts/scrape_funvisis.mjs`:
   - **elke dag om 00:00 en 12:00 Nederlandse tijd** (het hele jaar door, ook bij zomer- en wintertijd; de workflow staat op twee UTC-tijden per run en slaat de verkeerde over);
   - op de **laatste avond van elke maand** (23:45 Venezolaanse tijd, via cron `45 3 1 * *`, plus een extra ronde via `0 2 28-31 * *`); deze twee lopen altijd, ook buiten 00:00/12:00 Nederlandse tijd;
   - en **handmatig** (zie hieronder).
2. Het script haalt de vorige en de lopende maand op bij FUNVISIS, voegt nieuwe bevingen toe aan `data/events.json` en werkt gewijzigde bevingen bij (met een `gewijzigd`-datum). Er wordt **nooit iets gewist**.
3. Is er iets veranderd, dan commit de Action de gegevens naar `main`. **statichost.eu bouwt en publiceert dan automatisch opnieuw** (via een GitHub-webhook bij elke push).
4. Mislukt het ophalen of parsen, dan wordt er **niets overschreven**; het script stopt met een foutcode en GitHub mailt jou.

De losse gegevens zijn ingevoerd **vanaf 1 januari 2026** (januari t/m november zijn opgehaald en per maand gecontroleerd tegen de FUNVISIS-teller). Het script haalt nooit iets van vóór januari 2026 op.

## Mapindeling

| Pad | Inhoud |
| --- | --- |
| `scripts/scrape_funvisis.mjs` | de scraper (Node, geen extra pakketten) |
| `scripts/serve.mjs` | kleine lokale server om te testen |
| `data/events.json` | alle losse bevingen (alleen toevoegen/bijwerken) |
| `data/official.json` | officiële totalen en weekrapporten (handmatig bij te houden) |
| `data/meta.json` | laatste controle, aantallen, controle per maand, bron-URL's |
| `data/config.json` | instellingen: middelpunt (met naam) en straal van het La Guaira-gebied, buurlandplaatsen, waarschuwingsdrempel, eigen markeringen |
| `public/` | het dashboard (`index.html`, `style.css`, `app.js`) |
| `statichost.yml` | bouwinstructie voor statichost.eu: kopieert `data/*.json` naar `public/data/` bij het publiceren |
| `public/_headers` | cache-instelling voor `/data/*` (altijd opnieuw controleren, zodat nieuwe gegevens direct zichtbaar zijn) |
| `.github/workflows/update.yml` | de automatische updates |

## Lokaal draaien

Je hebt Node 22 of nieuwer nodig.

```bash
node scripts/scrape_funvisis.mjs            # vorige + lopende maand ophalen
node scripts/scrape_funvisis.mjs --vanaf 2026-01   # alles vanaf januari (backfill)
node scripts/scrape_funvisis.mjs --droog    # alleen tonen, niets schrijven
node scripts/serve.mjs                      # dashboard op http://localhost:8080
```

Let op: de FUNVISIS-database valt geregeld even weg ("fuera de servicio"). Het script probeert het dan opnieuw (6 keer per pagina, bij `--vanaf` 8 keer, met oplopende pauze), en de workflow doet daarbovenop tot 3 rondes met 2 minuten ertussen. Pas als alles mislukt krijg je een foutmail.

## Handmatig een update starten

1. Ga op GitHub naar je repository → tabblad **Actions** → **Gegevens bijwerken**.
2. Klik **Run workflow** → **Run workflow**.
3. Na ongeveer een minuut staat er een nieuwe commit (als er iets nieuws was) en publiceert statichost.eu binnen een minuut opnieuw.

## Officiële totalen toevoegen

Open `data/official.json` (op GitHub: bestand openen → potloodje → bewerken → **Commit changes**). Voeg een regel toe aan het juiste lijstje en let op de komma's tussen regels:

- **Cumulatief totaal** (`cumulatief`):
  `{ "datum": "2026-12-03", "aantal": 2450, "ca": false, "bron": "FUNVISIS, via media", "bron_url": "https://…" }`
- **Weekrapport** (`weekrapporten`, vrijdag t/m donderdag, heel het land):
  `{ "van": "2026-11-13", "tot": "2026-11-19", "aantal": 95, "bron": "FUNVISIS weekrapport", "bron_url": "https://…" }`

Regels:
- Datums zijn `JJJJ-MM-DD`. Zet `"ca": true` als het cijfer als "circa" werd gemeld.
- Vul altijd `bron` in. `bron_url` mag leeg blijven (`""`) als er geen link is, maar vul de link in als je die hebt.
- Verzin niets: alleen cijfers met een herkenbare bron.

## Taal (Nederlands / Engels / Spaans)

- De taalkeuze rechtsboven wisselt tussen Nederlands, Engels en Spaans. De keuze wordt onthouden in de browser. Zonder keuze volgt de site de browsertaal (Nederlands als die met `nl` begint, Spaans bij `es`, anders Engels). Met `?lang=nl`, `?lang=en` of `?lang=es` achter de link forceer je een taal.
- **Alle teksten staan op één plek:** het woordenboek `I18N` bovenaan `public/app.js`. De vaste tekst in `index.html` wordt daaruit gevuld (`data-i18n`, `data-i18n-html`, `data-i18n-attr`). Een nieuwe tekst of vertaling toevoegen = één sleutel in `nl`, `en` en `es`. Getallen en datums volgen de gekozen taal (`nl-NL`, `en-GB` of `es-VE`); de maandnamen staan ook in het woordenboek.
- **Gegevens in `data/official.json`** zijn Nederlands. Voeg optioneel een Spaanse of Engelse variant toe met het achtervoegsel `_es` of `_en`, bijvoorbeeld `omschrijving_es` (bij `hoofdbevingen`) of `bron_en` (bij `cumulatief` en `weekrapporten`). Is er geen veld voor de gekozen taal, dan toont de site het Nederlandse veld. Plaatsnamen van FUNVISIS zijn al Spaans en worden niet vertaald. Ook de namen van eigen markeringen in `config.json` worden zoals ingevuld getoond.

## Gebied "La Guaira en omgeving"

In `data/config.json` staat onder `la_guaira` het middelpunt (`lat`, `lon`), de `naam` waarvandaan afstanden worden gemeten en de `straal_km` (nu 40 km, gecentreerd op KUTO Motors in Macuto). Alle teksten op de site (kopjes, afstanden, kaart) volgen die instellingen; pas je ze aan, dan hoeft er in de code niets te veranderen. Bevingen buiten die straal staan in "Rest van Venezuela". Oriëntatieplaatsen op de kaart staan in `data/geo.json` (`lg.plaatsen` en `regio.plaatsen`, uit `scripts/build_geo.mjs`; zie "Achtergrondkaart en plaatsnamen").

## Achtergrondkaart en plaatsnamen

- **Tegels:** beide kaarten laden een echte achtergrondkaart, alleen voor het zichtbare deel en op het passende zoomniveau (bij zoomen of verschuiven worden de tegels na een korte pauze vervangen; de oude blijven staan tot de nieuwe binnen zijn). Standaard zijn dat de Esri-tegels *World Light Gray Base* of *World Dark Gray Base* (volgt het thema, zonder plaatsnamen, tot zoomniveau 16) van `server.arcgisonline.com`. Met de schakelaar **Satellietbeeld** worden in plaats daarvan EOX Sentinel-2 cloudless-tegels (10 m, tot zoomniveau 17) van `tiles.maps.eox.at` geladen. De bronvermelding staat in een regel onder elke kaart (in beide talen, uit het woordenboek in `app.js`) en in de voettekst. Zonder internet of zolang de tegels laden toont de kaart de vereenvoudigde kust uit `data/geo.json`. Let op: de tegelservers zien het IP-adres van de bezoeker.
- **Waarom Esri en niet CARTO:** de CARTO-tegels (`basemaps.cartocdn.com`) geven sinds kort een afbeelding "API KEY REQUIRED" terug (HTTP 200, maar zonder kaart). Wil je CARTO of een andere aanbieder, pas dan `TILE_SRC` in `public/app.js` aan (URL-patroon en hoogste zoomniveau) en de teksten `attr_base`/`f3`.
- **Plaatsnamen** staan als eigen labels bovenop de kaart (altijd dezelfde stijl, ongeacht de achtergrond). Ze komen uit `data/geo.json` (`lg.plaatsen` voor La Guaira, `regio.plaatsen` voor het overzicht) en worden gemaakt door de lijsten `plaatsLG` en `plaatsRegio` in `scripts/build_geo.mjs`. Elke plaats heeft `naam`, `lat`, `lon`, `rang` (1 = stad, 2 = plaats, 3 = dorp) en optioneel `zijde` (`"w"` = label links van het punt). De kaart tekent labels op rang en slaat een label over als het een ander label, de huis-/zwembadmarkering, de knoppen of de rand raakt; bij inzoomen verschijnen daardoor meer dorpen. Een plaats toevoegen: voeg een regel toe in `build_geo.mjs` én in `data/geo.json` (het script hoeft niet opnieuw te draaien); coördinaten kun je opzoeken in OpenStreetMap (Nominatim, maximaal 1 verzoek per seconde).

## Gebruik op telefoon

- Alle knoppen hebben een tikgebied van minstens 44 px; de periodekiezer (Alles / Maand / Week met ‹ ›) vervangt de lange keuzelijst.
- Op de kaarten kun je inzoomen met + / − / ↺, met twee vingers (knijpen), met dubbeltikken en slepen. Zolang je niet ingezoomd bent blijft de pagina gewoon scrollbaar; ingezoomd verschuift een veeg de kaart (gebruik ↺ of de ruimte naast de kaart om weer te scrollen). Een tik op een punt kiest de dichtstbijzijnde beving binnen ca. 22 px; de details verschijnen op een telefoon als paneel onderin het scherm (sluiten met × of Esc).
- Lijsten met bevingen zijn op een telefoon compacte rijen (tik om coördinaten en het FUNVISIS-rapport te zien, 20 per keer); week- en maandtabellen staan achter "Toon als tabel".
- Toetsenbord: Tab naar een kaart, dan pijltjestoetsen (volgende/vorige beving), + en − (zoomen), 0 (terugzetten), Esc (detailpaneel sluiten).

## Wat te doen bij een foutmail

GitHub mailt als de Action mislukt. Open de link in de mail en bekijk de log bij **FUNVISIS ophalen**.

- **"fuera de servicio" / timeout / HTTP-fout**: FUNVISIS is tijdelijk onbereikbaar. Wacht en start de Action later handmatig opnieuw. Er is niets kapot en er gaan geen gegevens verloren, want elke run haalt ook de vorige maand opnieuw op.
- **"Kop … niet gevonden" of "Ongeldig getal/datum"**: FUNVISIS heeft iets in de pagina of de gegevens veranderd. Het script stopt dan bewust. Kijk in de log welk rapport het betreft; kleine typefouten van FUNVISIS (zoals `10:41` of `--72.4`) worden al opgevangen.
- **Aantal klopt niet met de FUNVISIS-teller**: dit wordt alleen gelogd en staat in `data/meta.json` onder `controle_per_maand`.
- **Waarschuwing op de site dat de gegevens ouder zijn dan 9 dagen**: de automatische update is gestopt. Check het tabblad Actions. GitHub zet geplande workflows uit na 60 dagen zonder activiteit in de repository; de commit bij elke update met `laatste_controle_utc` voorkomt dat meestal. Klik anders in Actions op **Enable workflow**.
- **GitHub-servers kunnen funvisis.gob.ve niet bereiken** (de stap "Test of funvisis.gob.ve bereikbaar is" geeft een waarschuwing): gebruik dan de Windows Taakplanner. Maak een taak die dagelijks `node scripts/scrape_funvisis.mjs` draait in de projectmap, gevolgd door `git add data && git commit -m "Gegevens bijgewerkt" && git push`. Als je laptop uit staat op het geplande moment, wordt de update overgeslagen (of uitgesteld als je "Taak zo snel mogelijk uitvoeren na een gemiste start" aanvinkt); de site toont dan na 9 dagen een waarschuwing.

## Projectnaam en link wijzigen

- **Link van de site**: de naam van de site bepaalt het adres. Ga in het dashboard van statichost.eu (builder.statichost.eu) naar je site en pas de sitenaam aan; de site krijgt dan een nieuw `*.statichost.page`-adres. Deel daarna de nieuwe link; de oude werkt dan niet meer.
- **Webhook bijwerken**: de webhook-URL op GitHub bevat de sitenaam (`https://builder.statichost.eu/<sitenaam>`). Verander je de sitenaam, pas dan op GitHub **Settings → Webhooks** de payload-URL aan, anders bouwt de site niet meer bij een push.
- **Repositorynaam** (optioneel): GitHub → **Settings → General → Repository name**. Controleer daarna in statichost.eu of de site nog bij de juiste repo staat (GitHub stuurt de oude link door, maar pas de repository-link in statichost.eu liever aan) en of de webhook nog werkt.

## Opzet statichost.eu

1. Maak in [builder.statichost.eu](https://builder.statichost.eu) een site aan met de naam `venezuela-earthquakes` en de HTTPS-link van de GitHub-repository (`https://github.com/NB-PSP/venezuela-aardbevingen.git`). De bouwinstructie staat in `statichost.yml`.
2. De repository is openbaar, dus een deploy key is niet nodig. Maak je de repository ooit privé, gebruik dan de SSH-link en zet de deploy key (alleen lezen) die statichost.eu toont op GitHub: repository → **Settings → Deploy keys → Add deploy key**.
3. Maak een webhook: repository → **Settings → Webhooks → Add webhook** met payload-URL `https://builder.statichost.eu/venezuela-earthquakes`, content type `application/json` en alleen het **push**-event.
4. Daarna bouwt statichost.eu de site bij elke push naar `main`, ook bij de commits van de automatische update.

## Buurlanden

Bevingen waarvan de plaatsnaam een woord uit `buurland_plaatsen` in `data/config.json` bevat (bijvoorbeeld Bucaramanga, Valledupar, Maicao, Barbados, Tobago, Guayaguayare) tellen niet mee. Ze staan in een inklapbare lijst onderaan Deel 2. Voeg namen toe of haal ze weg door die lijst aan te passen. De vergelijking is hoofdletter- en accentongevoelig.

## Beperkingen

- De losse lijst volgt FUNVISIS; die kan bevingen later aanpassen of toevoegen. Het officiële totaal (FUNVISIS via media) kan daarvan afwijken. Het dashboard toont de verschillen in Deel 2 zonder ze bij te stellen.
- Bevingen worden niet nagemeten of gecorrigeerd. Typefouten van FUNVISIS worden alleen hersteld als het om een duidelijk scheidingsteken gaat (zoals `10:41`, `--72.4`).
- Alleen feiten: geen schadeclaims en geen voorspellingen.

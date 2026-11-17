# Aardbevingen Venezuela – dashboard

Een gratis, openbaar dashboard met aardbevingen in Venezuela, op basis van de openbare tabellen van FUNVISIS. De site werkt zichzelf automatisch bij via GitHub Actions en wordt gepubliceerd door Vercel. De site is tweetalig: Nederlands en Spaans (knop NL/ES rechtsboven). Ze is ontworpen voor gebruik op een telefoon en werkt ook op een computer.

## Wat het systeem doet

1. **GitHub Actions** draait `scripts/scrape_funvisis.mjs`:
   - elke **maandag 12:00 UTC**;
   - op de **laatste avond van elke maand** (23:45 Venezolaanse tijd, via cron `45 3 1 * *`, plus een extra ronde via `0 2 28-31 * *`);
   - en **handmatig** (zie hieronder).
2. Het script haalt de vorige en de lopende maand op bij FUNVISIS, voegt nieuwe bevingen toe aan `data/events.json` en werkt gewijzigde bevingen bij (met een `gewijzigd`-datum). Er wordt **nooit iets gewist**.
3. Is er iets veranderd, dan commit de Action de gegevens naar `main`. **Vercel publiceert dan automatisch opnieuw.**
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
| `vercel.json` | kopieert `data/*.json` naar `public/data/` bij het publiceren |
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
3. Na ongeveer een minuut staat er een nieuwe commit (als er iets nieuws was) en publiceert Vercel binnen een minuut opnieuw.

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

## Taal (Nederlands / Spaans)

- De knop rechtsboven wisselt tussen Nederlands en Spaans (de knop toont de taal waarnaar je schakelt: **ES** of **NL**). De keuze wordt onthouden in de browser. Zonder keuze volgt de site de browsertaal (Spaans als die met `es` begint, anders Nederlands). Met `?lang=es` of `?lang=nl` achter de link forceer je een taal.
- **Alle teksten staan op één plek:** het woordenboek `I18N` bovenaan `public/app.js`. De vaste tekst in `index.html` wordt daaruit gevuld (`data-i18n`, `data-i18n-html`, `data-i18n-attr`). Een nieuwe tekst of vertaling toevoegen = één sleutel in `nl` en in `es`. Getallen en datums gebruiken `nl-NL` of `es-VE`; de maandnamen staan ook in het woordenboek.
- **Gegevens in `data/official.json`** zijn Nederlands. Voeg optioneel een Spaanse variant toe met het achtervoegsel `_es`, bijvoorbeeld `omschrijving_es` (bij `hoofdbevingen`) of `bron_es` (bij `cumulatief` en `weekrapporten`). Is er geen `_es`-veld, dan toont de Spaanse versie het Nederlandse veld. Plaatsnamen van FUNVISIS zijn al Spaans en worden niet vertaald. Ook de namen van eigen markeringen in `config.json` worden zoals ingevuld getoond.

## Gebied "La Guaira en omgeving"

In `data/config.json` staat onder `la_guaira` het middelpunt (`lat`, `lon`), de `naam` waarvandaan afstanden worden gemeten en de `straal_km` (nu 30 km, gecentreerd op KUTO Motors in Macuto). Alle teksten op de site (kopjes, afstanden, kaart) volgen die instellingen; pas je ze aan, dan hoeft er in de code niets te veranderen. Bevingen buiten die straal staan in "Rest van Venezuela". Oriëntatieplaatsen op de kaart staan in `data/geo.json` (`lg.plaatsen`, gemaakt door `scripts/build_geo.mjs`).

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
- **Waarschuwing op de site dat de gegevens ouder zijn dan 9 dagen**: de automatische update is gestopt. Check het tabblad Actions. GitHub zet geplande workflows uit na 60 dagen zonder activiteit in de repository; de wekelijkse commit met `laatste_controle_utc` voorkomt dat meestal. Klik anders in Actions op **Enable workflow**.
- **GitHub-servers kunnen funvisis.gob.ve niet bereiken** (de stap "Test of funvisis.gob.ve bereikbaar is" geeft een waarschuwing): gebruik dan de Windows Taakplanner. Maak een taak die wekelijks `node scripts/scrape_funvisis.mjs` draait in de projectmap, gevolgd door `git add data && git commit -m "Gegevens bijgewerkt" && git push`. Als je laptop uit staat op het geplande moment, wordt de update overgeslagen (of uitgesteld als je "Taak zo snel mogelijk uitvoeren na een gemiste start" aanvinkt); de site toont dan na 9 dagen een waarschuwing.

## Projectnaam en link wijzigen

- **Vercel-link**: Vercel → je project → **Settings → Domains** → de `*.vercel.app`-naam bewerken. Deel daarna de nieuwe link; de oude werkt dan niet meer.
- **Projectnaam**: Vercel → **Settings → General → Project Name**.
- **Repositorynaam** (optioneel): GitHub → **Settings → General → Repository name**. Vercel blijft gekoppeld, maar controleer daarna even of het project nog bij de juiste repo staat.

## Buurlanden

Bevingen waarvan de plaatsnaam een woord uit `buurland_plaatsen` in `data/config.json` bevat (bijvoorbeeld Bucaramanga, Valledupar, Maicao, Barbados, Tobago, Guayaguayare) tellen niet mee. Ze staan in een inklapbare lijst onderaan Deel 2. Voeg namen toe of haal ze weg door die lijst aan te passen. De vergelijking is hoofdletter- en accentongevoelig.

## Beperkingen

- De losse lijst volgt FUNVISIS; die kan bevingen later aanpassen of toevoegen. Het officiële totaal (FUNVISIS via media) kan daarvan afwijken. Het dashboard toont de verschillen in Deel 2 zonder ze bij te stellen.
- Bevingen worden niet nagemeten of gecorrigeerd. Typefouten van FUNVISIS worden alleen hersteld als het om een duidelijk scheidingsteken gaat (zoals `10:41`, `--72.4`).
- Alleen feiten: geen schadeclaims en geen voorspellingen.

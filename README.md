# Aardbevingen Venezuela – dashboard

Een gratis, openbaar dashboard met aardbevingen in Venezuela, op basis van de openbare tabellen van FUNVISIS. De site werkt zichzelf automatisch bij via GitHub Actions en wordt gepubliceerd door Vercel. Alle teksten op de site zijn Nederlands.

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
| `data/config.json` | instellingen: La Guaira-straal, buurlandplaatsen, waarschuwingsdrempel |
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

Let op: de FUNVISIS-database valt geregeld even weg ("fuera de servicio"). Het script probeert het dan opnieuw (3 keer, bij `--vanaf` 8 keer).

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

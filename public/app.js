'use strict';
/* Dashboard aardbevingen Venezuela. Leest data/*.json. Geen externe afhankelijkheden. */
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const DAY = 864e5;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* =====================================================================
   Woordenboek: ALLE zichtbare tekst staat hier (nl = Nederlands, es = Spaans).
   Waarden zijn tekst met {naam}-plaatsvervangers, of een functie. In index.html
   verwijzen data-i18n / data-i18n-html / data-i18n-attr naar deze sleutels.
   ===================================================================== */
const I18N = {
  nl: {
    locale: 'nl-NL', dateSep: '-',
    months: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    mshort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    long_dm: '{d} {m}', long_dmy: '{dm} {y}',
    meta_title: 'Aardbevingen Venezuela',
    meta_desc: 'Overzicht van aardbevingen in Venezuela, op basis van openbare FUNVISIS-gegevens.',
    skip: 'Direct naar de inhoud',
    nav_aria: 'Onderdelen van de pagina',
    tab_ov: 'Overzicht', tab_ov_s: 'Overzicht', tab_lg: 'La Guaira', tab_lg_s: 'La Guaira', tab_r: 'Rest van Venezuela', tab_r_s: 'Rest',
    theme_aria: 'Wissel tussen licht en donker thema', theme_to_light: 'Schakel naar licht thema', theme_to_dark: 'Schakel naar donker thema',
    lang_btn: 'ES', lang_label: 'Schakel naar Spaans (Español)',
    kicker_ov: 'Overzicht', h1: 'Aardbevingen Venezuela',
    lead_ov: 'Gegevens van FUNVISIS (Venezolaanse seismologische dienst). De officiële totalen tellen vanaf de hoofdbevingen van {since}; de losse lijst met bevingen op deze pagina loopt vanaf {first}, de eerste beving in de gegevens.',
    loading: 'Gegevens laden…',
    help_sum: 'Zo gebruik je deze pagina',
    help_1: 'Gebruik de knoppen bovenaan om naar een deel te springen.',
    help_2: '<strong>La Guaira</strong>: alle bevingen binnen {R} km van {c}, met kaart, grafieken per week en maand en een volledige lijst.',
    help_3: '<strong>Rest van Venezuela</strong>: alles daarbuiten, plus de officiële totalen van FUNVISIS.',
    help_4: 'Tik op een punt op de kaart of een staaf in een grafiek voor details (op een computer werkt ook de muisaanwijzer). Op de kaart zoom je met de knoppen + en −, met twee vingers of door te dubbelklikken, en je sleept om te verschuiven. Met het toetsenbord: Tab naar de kaart of grafiek en gebruik de pijltjestoetsen (kaart: + en − om te zoomen, Esc om het detailvenster te sluiten).',
    help_5: 'Tijden zijn Venezolaanse tijd (HLV, UTC−4). Weken lopen van maandag t/m zondag, maanden volgen de Venezolaanse kalender.',
    help_6: 'De pagina bevat alleen gemeten feiten: geen schadeclaims en geen voorspellingen.',
    kicker_1: 'Deel 1', kicker_2: 'Deel 2',
    h_lg: 'La Guaira en omgeving (binnen {R} km)',
    lead_lg: 'Bevingen binnen {R} km van {c} ({coord}). De afstand is berekend met de haversine-formule; alle afstanden op deze pagina gelden vanaf dat middelpunt. De losse lijst loopt vanaf {first}.',
    h_map: 'Kaart',
    period: 'Periode:', p_all: 'Alles', p_m: 'Maand', p_w: 'Week', p_prev: 'Vorige periode', p_next: 'Volgende periode', p_all_label: 'Alle bevingen',
    count_shown: '{n} bevingen getoond',
    sat: 'Satellietbeeld',
    map_hint: 'Tik of beweeg over een punt voor details.',
    map_kbd: 'Toetsenbord: pijltjestoetsen kiezen een beving, + en − zoomen, 0 zet de kaart terug.',
    zoom_in: 'Inzoomen', zoom_out: 'Uitzoomen', zoom_reset: 'Kaart terugzetten', close: 'Sluiten',
    h_week: 'Per week', h_month: 'Per maand', show_table: 'Toon als tabel', h_all: 'Alle bevingen (nieuwste eerst)',
    h_r: 'Rest van Venezuela (buiten {R} km)',
    lead_r: 'Hier staan de officiële FUNVISIS-totalen en de losse bevingen buiten het La Guaira-gebied.',
    h_cum: 'Officieel totaal sinds {since_dm}',
    cum_note: 'Officiële cijfers zijn handmatig overgenomen en komen niet op elke datum voor; de lijn tussen de punten is een verbindingslijn, geen meting.',
    h_report: 'Weekrapporten FUNVISIS (heel het land)',
    h_compare: 'Losse lijst versus officiële cijfers',
    compare_note: 'Een verschil kan komen door een andere telling bij FUNVISIS, door bevingen in buurlanden, of doordat de losse lijst ontbrekende of later toegevoegde bevingen heeft. De cijfers zijn niet bijgesteld.',
    h_overview_map: 'Overzichtskaart',
    neigh_sum: 'Bevingen in buurlanden ({nBuur}, niet meegeteld)',
    neigh_note: 'FUNVISIS meldt ook bevingen net buiten Venezuela. Die tellen hierboven niet mee. De plaatsnamen waarop dit gebeurt staan in <code>data/config.json</code> (<code>buurland_plaatsen</code>).',
    f1: '<strong>Bron:</strong> FUNVISIS (Fundación Venezolana de Investigaciones Sismológicas), <a href="http://www.funvisis.gob.ve/old/sis_mes.php" rel="noopener">sis_mes.php</a>. Officiële totalen en weekrapporten zijn handmatig overgenomen uit berichten van FUNVISIS via de media; de bronvermelding staat in <code>data/official.json</code>.',
    f2: '<strong>Tijdzone:</strong> HLV = Hora Legal de Venezuela = UTC−4, het hele jaar (geen zomertijd). Dagen, weken en maanden zijn op die tijd gebaseerd. Locaties en magnitudes kunnen later door FUNVISIS worden aangepast.',
    f3: '<strong>Kaartgegevens:</strong> de achtergrondkaart (kust, wegen, bebouwing) bestaat uit tegels van <a href="https://www.esri.com/" rel="noopener">Esri</a> (World Light/Dark Gray Base, met gegevens van <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a>-bijdragers), geladen van <code>server.arcgisonline.com</code>. Zet je het satellietbeeld aan, dan worden in plaats daarvan Sentinel-2 cloudless-tegels van <a href="https://s2maps.eu" rel="noopener">EOX</a> geladen (<code>tiles.maps.eox.at</code>; bevat aangepaste Copernicus Sentinel-gegevens 2023). Daarbij zien die servers je IP-adres en welk gebied je bekijkt. Zolang de tegels niet binnen zijn (of zonder internet) toont de kaart een vereenvoudigde kust en landgrenzen van <a href="https://www.naturalearthdata.com/" rel="noopener">Natural Earth</a> (publiek domein). De plaatsnamen zijn handmatig gekozen (coördinaten van OpenStreetMap) en dienen alleen ter oriëntatie.',
    attr_base: '© <a href="https://www.esri.com/" rel="noopener">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap-bijdragers</a> en de GIS-gebruikersgemeenschap',
    attr_sat: '<a href="https://s2maps.eu" rel="noopener">Sentinel-2 cloudless – s2maps.eu</a> door <a href="https://eox.at" rel="noopener">EOX</a> (bevat aangepaste Copernicus Sentinel-gegevens 2023)',
    f4: 'Deze pagina is een onofficieel, niet-commercieel overzicht en geen waarschuwingsdienst.',
    centre_fallback: 'het middelpunt',
    warn_old: 'Let op: de gegevens zijn {age} niet bijgewerkt (meer dan {limit} dagen). De getoonde cijfers kunnen achterlopen.',
    age_days: '{n} dagen', age_unknown: 'onbekend lang',
    card_total: 'Totaal sinds {since_dm}', approx: 'circa, ', asof: 'stand {d} · {b}',
    card_main: 'Hoofdbeving {n}',
    card_cur: 'Lopende maand ({m})',
    card_cur_sub: 'losse bevingen in Venezuela, {b} in buurlanden niet meegeteld',
    upd: 'Laatst bijgewerkt: {a} HLV ({b} UTC). Nieuwste beving in de lijst: {c}.',
    upd_unknown: 'Laatste update onbekend.',
    depth_km: '{v} km diep',
    stat_n: 'Aantal bevingen', stat_max: 'Grootste', stat_last: 'Laatste',
    stat_max_sub: '{when} HLV · {depth} km diep · {dist} km van {c}',
    stat_last_sub: '{when} HLV · {depth} km diep · {place}',
    since_first: 'sinds {d}', in_month: 'in {m}', in_week: 'in {w}, {r}',
    stat_buur: 'Buurlanden (niet meegeteld)', stat_buur_sub: 'bevingen die FUNVISIS ook meldt, net buiten Venezuela',
    none: 'Geen bevingen.',
    map_aria_lg: 'Kaart met {n} bevingen binnen {R} km van {c}',
    map_aria_r: 'Overzichtskaart met {n} bevingen',
    det_title: 'Magnitude {m}', det_hlv: 'Tijd (HLV)', det_utc: 'Tijd (UTC)', det_depth: 'Diepte', fixed: ' (vastgezet)',
    det_dist: 'Afstand', det_dist_v: '{d} km van {c}', det_coord: 'Coördinaten', det_place: 'Plaats', det_src: 'Bron', det_report: 'FUNVISIS-rapport',
    dir_n: 'N', dir_s: 'Z', dir_e: 'O', dir_w: 'W',
    leg_d1: 'diepte < 20 km', leg_d2: '20–70 km', leg_d3: '70–150 km', leg_d4: '> 150 km', leg_size: 'Grootte = magnitude',
    th_date: 'Datum (HLV)', th_time: 'Tijd (HLV)', th_mag: 'Mag.', th_depth: 'Diepte (km)', th_dist: 'Afstand (km)', th_dist_t: 'Afstand tot {c}',
    th_place: 'Plaats', th_lat: 'Breedte', th_lon: 'Lengte', th_rep: 'Rapport', rep_link: 'rapport', fixed_s: ' (vast)',
    more: 'Toon meer ({n} te gaan)', count_list: '{n} bevingen · afstanden vanaf {c}',
    ev_depth: 'Diepte {v} km', ev_dist: 'Afstand {v} km', ev_link: 'Bekijk het FUNVISIS-rapport',
    th_week: 'Week', th_period: 'Periode', th_count: 'Aantal', th_max: 'Hoogste mag.', th_month: 'Maand', th_avg: 'Gemiddelde mag.',
    week_label: 'week {n} ({y})',
    tip_bucket: '{name}: {n} bevingen, hoogste magnitude {max}, gemiddelde {avg}.', tip_none: '{name}: geen bevingen.',
    chart_week: 'Aantal bevingen per week', chart_month: 'Aantal bevingen per maand',
    prev_week: 'Een week eerder', next_week: 'Een week later', prev_month: 'Een maand eerder', next_month: 'Een maand later',
    range_info: '{a} t/m {b}',
    bar_hint: 'Tik op een staaf voor details.', pt_hint: 'Tik op een punt voor details.',
    cum_aria: 'Cumulatief aantal bevingen sinds {since_dm}',
    cum_tip: '{d}: {n} bevingen sinds {since_dm}{ca}. Bron: {b}.', ca: ' (circa)',
    leg_off: '● officieel totaal FUNVISIS (open cirkel = “circa”)', leg_list: '- - telling uit de losse lijst (zonder buurlanden)',
    wr_tip: 'Week {a} t/m {b}: {n} bevingen (FUNVISIS, heel het land). Bron: {s}.', wr_aria: 'Aantal bevingen per weekrapport',
    complete: 'De losse lijst begint op {first}. {part} ({ok} van {tot} maanden gecontroleerd{no}).',
    part_from: 'Vanaf {d} komt het aantal per maand overeen met de teller van FUNVISIS', part_none: 'Geen enkele maand komt overeen met de FUNVISIS-teller',
    no_counter: ', {n} zonder teller', no_checks: 'Er zijn nog geen maandcontroles beschikbaar.',
    cmp_kind: 'Soort', cmp_period: 'Periode', cmp_off: 'Officieel', cmp_list: 'Losse lijst', cmp_diff: 'Verschil', cmp_src: 'Bron',
    cmp_all: 'Toon alle ({n})', kind_total: 'Totaal', kind_week: 'Week', cmp_range: '{a} t/m {b}{ca}',
    err: 'De gegevens konden niet worden geladen ({m}). Probeer het later opnieuw.',
  },
  es: {
    locale: 'es-VE', dateSep: '/',
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    mshort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    long_dm: '{d} de {m}', long_dmy: '{dm} de {y}',
    meta_title: 'Sismos en Venezuela',
    meta_desc: 'Resumen de los sismos en Venezuela, basado en datos públicos de FUNVISIS.',
    skip: 'Ir al contenido',
    nav_aria: 'Secciones de la página',
    tab_ov: 'Resumen', tab_ov_s: 'Resumen', tab_lg: 'La Guaira', tab_lg_s: 'La Guaira', tab_r: 'Resto de Venezuela', tab_r_s: 'Resto',
    theme_aria: 'Cambiar entre tema claro y oscuro', theme_to_light: 'Cambiar a tema claro', theme_to_dark: 'Cambiar a tema oscuro',
    lang_btn: 'NL', lang_label: 'Cambiar a neerlandés (Nederlands)',
    kicker_ov: 'Resumen', h1: 'Sismos en Venezuela',
    lead_ov: 'Datos de FUNVISIS (Fundación Venezolana de Investigaciones Sismológicas). Los totales oficiales cuentan desde los sismos principales del {since}; la lista detallada de esta página comienza el {first}, el primer sismo de los datos.',
    loading: 'Cargando datos…',
    help_sum: 'Cómo usar esta página',
    help_1: 'Usa los botones de arriba para saltar a una sección.',
    help_2: '<strong>La Guaira</strong>: todos los sismos a menos de {R} km de {c}, con mapa, gráficos por semana y por mes, y una lista completa.',
    help_3: '<strong>Resto de Venezuela</strong>: todo lo demás, más los totales oficiales de FUNVISIS.',
    help_4: 'Toca un punto del mapa o una barra de un gráfico para ver los detalles (en un computador también funciona pasar el cursor). En el mapa puedes acercar con los botones + y −, con dos dedos o con doble clic, y arrastrar para desplazarlo. Con el teclado: Tab hasta el mapa o el gráfico y usa las flechas (mapa: + y − para acercar o alejar, Esc para cerrar el panel de detalles).',
    help_5: 'Las horas son la hora de Venezuela (HLV, UTC−4). Las semanas van de lunes a domingo; los meses siguen el calendario venezolano.',
    help_6: 'La página solo contiene hechos medidos: sin afirmaciones de daños ni predicciones.',
    kicker_1: 'Parte 1', kicker_2: 'Parte 2',
    h_lg: 'La Guaira y alrededores (a menos de {R} km)',
    lead_lg: 'Sismos a menos de {R} km de {c} ({coord}). La distancia se calcula con la fórmula del haversine; todas las distancias de esta página se miden desde ese punto central. La lista detallada comienza el {first}.',
    h_map: 'Mapa',
    period: 'Período:', p_all: 'Todo', p_m: 'Mes', p_w: 'Semana', p_prev: 'Período anterior', p_next: 'Período siguiente', p_all_label: 'Todos los sismos',
    count_shown: '{n} sismos mostrados',
    sat: 'Imagen satelital',
    map_hint: 'Toca un punto o pasa el cursor por encima para ver detalles.',
    map_kbd: 'Teclado: las flechas eligen un sismo, + y − acercan o alejan, 0 restablece el mapa.',
    zoom_in: 'Acercar', zoom_out: 'Alejar', zoom_reset: 'Restablecer mapa', close: 'Cerrar',
    h_week: 'Por semana', h_month: 'Por mes', show_table: 'Mostrar como tabla', h_all: 'Todos los sismos (los más recientes primero)',
    h_r: 'Resto de Venezuela (a más de {R} km)',
    lead_r: 'Aquí están los totales oficiales de FUNVISIS y los sismos de la lista detallada fuera de la zona de La Guaira.',
    h_cum: 'Total oficial desde el {since_dm}',
    cum_note: 'Las cifras oficiales se transcribieron manualmente y no existen para todas las fechas; la línea entre los puntos es solo una unión, no una medición.',
    h_report: 'Informes semanales de FUNVISIS (todo el país)',
    h_compare: 'Lista detallada frente a cifras oficiales',
    compare_note: 'Una diferencia puede deberse a un conteo distinto en FUNVISIS, a sismos en países vecinos o a que la lista detallada tiene sismos faltantes o añadidos después. Las cifras no se han ajustado.',
    h_overview_map: 'Mapa general',
    neigh_sum: 'Sismos en países vecinos ({nBuur}, no contados)',
    neigh_note: 'FUNVISIS también reporta sismos justo fuera de Venezuela. Esos no se cuentan arriba. Los nombres de lugar con los que se detecta esto están en <code>data/config.json</code> (<code>buurland_plaatsen</code>).',
    f1: '<strong>Fuente:</strong> FUNVISIS (Fundación Venezolana de Investigaciones Sismológicas), <a href="http://www.funvisis.gob.ve/old/sis_mes.php" rel="noopener">sis_mes.php</a>. Los totales oficiales y los informes semanales se transcribieron manualmente de comunicados de FUNVISIS difundidos por los medios; la fuente de cada cifra figura en <code>data/official.json</code>.',
    f2: '<strong>Zona horaria:</strong> HLV = Hora Legal de Venezuela = UTC−4, todo el año (sin horario de verano). Los días, semanas y meses se basan en esa hora. FUNVISIS puede ajustar más adelante las ubicaciones y magnitudes.',
    f3: '<strong>Datos del mapa:</strong> el mapa de fondo (costa, carreteras, zonas urbanas) se compone de teselas de <a href="https://www.esri.com/" rel="noopener">Esri</a> (World Light/Dark Gray Base, con datos de colaboradores de <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a>), cargadas desde <code>server.arcgisonline.com</code>. Si activas la imagen satelital, se cargan en su lugar teselas Sentinel-2 cloudless de <a href="https://s2maps.eu" rel="noopener">EOX</a> (<code>tiles.maps.eox.at</code>; contiene datos modificados de Copernicus Sentinel 2023). Esos servidores ven tu dirección IP y la zona que miras. Mientras no lleguen las teselas (o sin internet) el mapa muestra una costa y fronteras simplificadas de <a href="https://www.naturalearthdata.com/" rel="noopener">Natural Earth</a> (dominio público). Los nombres de lugar se eligieron a mano (coordenadas de OpenStreetMap) y sirven solo de orientación.',
    attr_base: '© <a href="https://www.esri.com/" rel="noopener">Esri</a>, HERE, Garmin, © colaboradores de <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> y la comunidad de usuarios de GIS',
    attr_sat: '<a href="https://s2maps.eu" rel="noopener">Sentinel-2 cloudless – s2maps.eu</a> por <a href="https://eox.at" rel="noopener">EOX</a> (contiene datos modificados de Copernicus Sentinel 2023)',
    f4: 'Esta página es un resumen no oficial y sin fines comerciales; no es un servicio de alerta.',
    centre_fallback: 'el punto central',
    warn_old: 'Atención: los datos no se han actualizado desde hace {age} (más de {limit} días). Las cifras mostradas pueden estar desactualizadas.',
    age_days: '{n} días', age_unknown: 'un tiempo desconocido',
    card_total: 'Total desde el {since_dm}', approx: 'aprox., ', asof: 'al {d} · {b}',
    card_main: 'Sismo principal {n}',
    card_cur: 'Mes en curso ({m})',
    card_cur_sub: 'sismos de la lista detallada en Venezuela; {b} en países vecinos no contados',
    upd: 'Última actualización: {a} HLV ({b} UTC). Sismo más reciente de la lista: {c}.',
    upd_unknown: 'Última actualización desconocida.',
    depth_km: '{v} km de profundidad',
    stat_n: 'Número de sismos', stat_max: 'Mayor', stat_last: 'Último',
    stat_max_sub: '{when} HLV · {depth} km de profundidad · a {dist} km de {c}',
    stat_last_sub: '{when} HLV · {depth} km de profundidad · {place}',
    since_first: 'desde el {d}', in_month: 'en {m}', in_week: 'en {w}, {r}',
    stat_buur: 'Países vecinos (no contados)', stat_buur_sub: 'sismos que FUNVISIS también reporta, justo fuera de Venezuela',
    none: 'No hay sismos.',
    map_aria_lg: 'Mapa con {n} sismos a menos de {R} km de {c}',
    map_aria_r: 'Mapa general con {n} sismos',
    det_title: 'Magnitud {m}', det_hlv: 'Hora (HLV)', det_utc: 'Hora (UTC)', det_depth: 'Profundidad', fixed: ' (fijada)',
    det_dist: 'Distancia', det_dist_v: 'a {d} km de {c}', det_coord: 'Coordenadas', det_place: 'Lugar', det_src: 'Fuente', det_report: 'Informe de FUNVISIS',
    dir_n: 'N', dir_s: 'S', dir_e: 'E', dir_w: 'O',
    leg_d1: 'profundidad < 20 km', leg_d2: '20–70 km', leg_d3: '70–150 km', leg_d4: '> 150 km', leg_size: 'Tamaño = magnitud',
    th_date: 'Fecha (HLV)', th_time: 'Hora (HLV)', th_mag: 'Mag.', th_depth: 'Prof. (km)', th_dist: 'Distancia (km)', th_dist_t: 'Distancia a {c}',
    th_place: 'Lugar', th_lat: 'Latitud', th_lon: 'Longitud', th_rep: 'Informe', rep_link: 'informe', fixed_s: ' (fija)',
    more: 'Mostrar más (faltan {n})', count_list: '{n} sismos · distancias desde {c}',
    ev_depth: 'Prof. {v} km', ev_dist: 'Dist. {v} km', ev_link: 'Ver el informe de FUNVISIS',
    th_week: 'Semana', th_period: 'Período', th_count: 'Cantidad', th_max: 'Mag. máx.', th_month: 'Mes', th_avg: 'Mag. media',
    week_label: 'semana {n} ({y})',
    tip_bucket: '{name}: {n} sismos, magnitud máxima {max}, promedio {avg}.', tip_none: '{name}: sin sismos.',
    chart_week: 'Número de sismos por semana', chart_month: 'Número de sismos por mes',
    prev_week: 'Una semana antes', next_week: 'Una semana después', prev_month: 'Un mes antes', next_month: 'Un mes después',
    range_info: 'del {a} al {b}',
    bar_hint: 'Toca una barra para ver detalles.', pt_hint: 'Toca un punto para ver detalles.',
    cum_aria: 'Número acumulado de sismos desde el {since_dm}',
    cum_tip: '{d}: {n} sismos desde el {since_dm}{ca}. Fuente: {b}.', ca: ' (aprox.)',
    leg_off: '● total oficial de FUNVISIS (círculo abierto = “aproximado”)', leg_list: '- - recuento de la lista detallada (sin países vecinos)',
    wr_tip: 'Semana del {a} al {b}: {n} sismos (FUNVISIS, todo el país). Fuente: {s}.', wr_aria: 'Número de sismos por informe semanal',
    complete: 'La lista detallada comienza el {first}. {part} ({ok} de {tot} meses verificados{no}).',
    part_from: 'Desde el {d} el número mensual coincide con el contador de FUNVISIS', part_none: 'Ningún mes coincide con el contador de FUNVISIS',
    no_counter: ', {n} sin contador', no_checks: 'Aún no hay verificaciones mensuales disponibles.',
    cmp_kind: 'Tipo', cmp_period: 'Período', cmp_off: 'Oficial', cmp_list: 'Lista detallada', cmp_diff: 'Diferencia', cmp_src: 'Fuente',
    cmp_all: 'Mostrar todos ({n})', kind_total: 'Total', kind_week: 'Semana', cmp_range: 'del {a} al {b}{ca}',
    err: 'No se pudieron cargar los datos ({m}). Inténtalo de nuevo más tarde.',
  },
};

/* ---------- taal ---------- */
let lang = 'nl';
const P = {}; // gedeelde parameters voor teksten ({R}, {c}, {since}, ...)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function t(key, p = {}, html = false) {
  const v = I18N[lang][key] ?? I18N.nl[key] ?? key;
  if (typeof v === 'function') return v(p);
  return String(v).replace(/\{(\w+)\}/g, (_, n) => { const x = p[n] ?? P[n] ?? '…'; return html ? esc(x) : x; });
}
function detectLang() {
  try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'es' || q === 'nl') return q; } catch { /* */ }
  try { const s = localStorage.getItem('taal'); if (s === 'es' || s === 'nl') return s; } catch { /* geen opslag */ }
  return /^es/i.test(navigator.language || '') ? 'es' : 'nl';
}

/* ---------- DOM-hulpjes ---------- */
function setAttrs(e, a) {
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
}
function add(e, kids) {
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
}
const h = (tag, a = {}, ...kids) => { const e = document.createElement(tag); setAttrs(e, a); return add(e, kids); };
const sv = (tag, a = {}, ...kids) => { const e = document.createElementNS(NS, tag); setAttrs(e, a); return add(e, kids); };
const clear = (el) => { el.replaceChildren(); return el; };

/* ---------- opmaak (nl-NL of es-VE) ---------- */
let nf, n1, n2;
function setFormats() {
  const loc = I18N[lang].locale, mk = (d) => new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d });
  nf = new Intl.NumberFormat(loc); n1 = mk(1); n2 = mk(2);
}
const fi = (v) => nf.format(v), f1 = (v) => n1.format(v), f2 = (v) => n2.format(v);
const p2 = (n) => String(n).padStart(2, '0');
const MONTHS = () => I18N[lang].months, MSHORT = () => I18N[lang].mshort;
const fmtD = (s) => { const x = I18N[lang].dateSep; return `${s.slice(8, 10)}${x}${s.slice(5, 7)}${x}${s.slice(0, 4)}`; };
const fmtShort = (s) => `${+s.slice(8, 10)} ${MSHORT()[+s.slice(5, 7) - 1]}`;
const fmtDM = (s) => t('long_dm', { d: +s.slice(8, 10), m: MONTHS()[+s.slice(5, 7) - 1] });
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const fmtMs = (ms, off) => { const d = new Date(ms + off * 3600e3), x = I18N[lang].dateSep; return `${p2(d.getUTCDate())}${x}${p2(d.getUTCMonth() + 1)}${x}${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const monthLabel = (k) => `${MONTHS()[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fi(Math.abs(v));
const loc = (o, f) => (lang === 'es' && o[`${f}_es`]) || o[f];

/* ---------- tijd en weken (Venezolaanse tijd) ---------- */
const parseD = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
function isoWeek(dateStr) {
  const tt = parseD(dateStr);
  const dow = (new Date(tt).getUTCDay() + 6) % 7;
  const mon = tt - dow * DAY;
  const thu = mon + 3 * DAY;
  const y = new Date(thu).getUTCFullYear();
  const wk = Math.floor((thu - Date.UTC(y, 0, 1)) / DAY / 7) + 1;
  return { key: `${y}-W${p2(wk)}`, start: mon, wn: wk, y };
}
const weekLabel = (w) => t('week_label', { n: w.wn, y: w.y });
const weekRange = (w) => `${fmtShort(isoDay(w.start))} – ${fmtShort(isoDay(w.start + 6 * DAY))}`;

/* ---------- geo ---------- */
const rad = (d) => d * Math.PI / 180;
function haversine(lat1, lon1, lat2, lon2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(a));
}
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const depthClass = (d) => (d < 20 ? 'd1' : d < 70 ? 'd2' : d < 150 ? 'd3' : 'd4');
const coordTxt = (lat, lon) => `${f2(Math.abs(lat))}° ${lat >= 0 ? t('dir_n') : t('dir_s')}, ${f2(Math.abs(lon))}° ${lon >= 0 ? t('dir_e') : t('dir_w')}`;

/* ---------- statistiek ---------- */
function stats(list) {
  if (!list.length) return { n: 0, max: null, avg: null, latest: null };
  let max = list[0], sum = 0, latest = list[0];
  for (const e of list) {
    sum += e.mag;
    if (e.mag > max.mag || (e.mag === max.mag && e.utc > max.utc)) max = e;
    if (e.utc > latest.utc) latest = e;
  }
  return { n: list.length, max, avg: sum / list.length, latest };
}
function buckets(list, keys, keyOf) {
  const m = new Map(keys.map((k) => [k.key, []]));
  for (const e of list) m.get(keyOf(e))?.push(e);
  return keys.map((k) => ({ ...k, ...stats(m.get(k.key)) }));
}

/* ---------- toestand ---------- */
const mq = { phone: matchMedia('(max-width: 599px)'), sheet: matchMedia('(max-width: 819px)') };
const S = { period: { mode: 'all', idx: 0 }, win: {} }; // gekozen periode en venster van de grafieken
let D = null; // afgeleide gegevens (na het laden)
const charts = []; // functies die grafieken opnieuw tekenen (bij andere breedte)
const lists = []; // functies die lijsten opnieuw opbouwen (bij wisselen telefoon/computer)
const sat = { lg: false, r: false };

/* ---------- componenten ---------- */
const card = (lbl, val, sub) => h('div', { class: 'card' }, h('div', { class: 'lbl' }, lbl), h('div', { class: 'val' }, val), sub ? h('div', { class: 'sub' }, sub) : null);

function table(el, heads, rows) {
  clear(el).append(h('table', {},
    h('thead', {}, h('tr', {}, heads.map((x, i) => h('th', { class: i === 0 ? 'l' : null, scope: 'col' }, x)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c, i) => h('td', { class: i === 0 ? 'l' : null }, c)))))));
}

/* Lijst van bevingen: tabel op computer, compacte uitklapbare rijen op telefoon. */
function listTable(el, evs) {
  clear(el);
  if (!evs.length) { el.append(h('p', { class: 'note' }, t('none'))); return; }
  const phone = mq.phone.matches, size = phone ? 20 : 100;
  let shown = 0, body;
  const more = h('button', { type: 'button', class: 'more' });
  if (phone) {
    body = h('ul', { class: 'evlist' });
  } else {
    const heads = [t('th_date'), t('th_time'), t('th_mag'), t('th_depth'), t('th_dist'), t('th_place'), t('th_lat'), t('th_lon'), t('th_rep')];
    body = h('tbody');
    el.append(h('div', { class: 'tablewrap' }, h('table', {},
      h('thead', {}, h('tr', {}, heads.map((x, i) => h('th', { class: i === 0 || i === 5 ? 'l' : null, scope: 'col', title: i === 4 ? t('th_dist_t', { c: P.c }) : null }, x)))), body)));
  }
  const row = (e) => (phone
    ? h('li', {}, h('details', {},
      h('summary', {},
        h('span', { class: `mag ${depthClass(e.diepte_km)}` }, `M${f1(e.mag)}`),
        h('span', { class: 'evtxt' }, h('b', {}, `${fmtD(e.datum_hlv)} ${e.tijd_hlv}`), h('span', { class: 'pl' }, e.plaats),
          h('span', { class: 'mt' }, `${t('ev_depth', { v: f1(e.diepte_km) })}${e.diepte_vast ? t('fixed_s') : ''} · ${t('ev_dist', { v: f1(e.afstand) })}`))),
      h('div', { class: 'evbody' }, h('p', {}, `${t('det_coord')}: ${coordTxt(e.lat, e.lon)}`), h('p', {}, h('a', { href: e.rapport, rel: 'noopener' }, t('ev_link'))))))
    : h('tr', {},
      h('td', { class: 'l' }, fmtD(e.datum_hlv)), h('td', {}, e.tijd_hlv), h('td', {}, f1(e.mag)),
      h('td', {}, f1(e.diepte_km) + (e.diepte_vast ? t('fixed_s') : '')), h('td', {}, f1(e.afstand)),
      h('td', { class: 'l' }, e.plaats), h('td', {}, f2(e.lat)), h('td', {}, f2(e.lon)),
      h('td', {}, h('a', { href: e.rapport, rel: 'noopener' }, t('rep_link')))));
  const render = () => {
    const frag = document.createDocumentFragment();
    for (const e of evs.slice(shown, shown + size)) frag.append(row(e));
    body.append(frag);
    shown = Math.min(evs.length, shown + size);
    more.hidden = shown >= evs.length;
    more.textContent = t('more', { n: fi(evs.length - shown) });
  };
  more.addEventListener('click', render);
  if (phone) el.append(body);
  el.append(h('p', { class: 'note' }, t('count_list', { n: fi(evs.length), c: P.c })), more);
  render();
}

function legend(el) {
  clear(el).append(
    ...['d1', 'd2', 'd3', 'd4'].map((c) => { const i = h('i'); i.style.background = `var(--${c})`; return h('span', {}, i, t(`leg_${c}`)); }),
    h('span', {}, t('leg_size')));
}

/* ---------- detailvenster (naast de kaart, of onderin als "bottom sheet" op telefoon) ---------- */
let sheetEl = null;
function closeSheet() { sheetEl?.classList.remove('open'); sheetEl = null; }
function openSheet(el) { if (sheetEl !== el) closeSheet(); el.classList.add('open'); sheetEl = el; }
function placeholder(el) { el.classList.remove('open'); if (sheetEl === el) sheetEl = null; clear(el).append(h('p', { class: 'note' }, t('map_hint'))); }
function showDetail(el, e) {
  clear(el).append(
    h('button', { type: 'button', class: 'sheetclose', 'aria-label': t('close'), onclick: closeSheet }, '×'),
    h('h4', { style: 'margin:0 0 8px' }, t('det_title', { m: f1(e.mag) })), h('dl', { class: 'det' },
      h('dt', {}, t('det_hlv')), h('dd', {}, `${fmtD(e.datum_hlv)} ${e.tijd_hlv}`),
      h('dt', {}, t('det_utc')), h('dd', {}, fmtMs(Date.parse(e.utc), 0)),
      h('dt', {}, t('det_depth')), h('dd', {}, `${f1(e.diepte_km)} km${e.diepte_vast ? t('fixed') : ''}`),
      h('dt', {}, t('det_dist')), h('dd', {}, t('det_dist_v', { d: f1(e.afstand), c: P.c })),
      h('dt', {}, t('det_coord')), h('dd', {}, coordTxt(e.lat, e.lon)),
      h('dt', {}, t('det_place')), h('dd', {}, e.plaats),
      h('dt', {}, t('det_src')), h('dd', {}, h('a', { href: e.rapport, rel: 'noopener' }, t('det_report')))));
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });
/* Paginazoom op telefoons blokkeren. Safari (iOS) negeert user-scalable=no en touch-action op de pagina,
   dus: geen gesture-events, geen bewegingen met twee vingers en geen dubbeltik buiten de kaarten.
   De kaarten zoomen zelf via pointer-events; die blijven werken omdat alleen de standaardactie wordt tegengehouden. */
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (ev) => ev.preventDefault(), { passive: false });
document.addEventListener('touchmove', (ev) => { if (ev.touches.length > 1 || (ev.scale !== undefined && ev.scale !== 1)) ev.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (ev) => {
  const now = Date.now();
  if (now - lastTouchEnd < 350 && !ev.target.closest?.('.mapbox, a, button, input, select, summary, label, [role=button], [tabindex]')) ev.preventDefault(); // dubbeltik-zoom
  lastTouchEnd = now;
}, { passive: false });

/* ---------- achtergrondkaart: tegels (Esri Light/Dark Gray Base, of EOX Sentinel-2 cloudless bij satellietbeeld) ---------- */
const effTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const ESRI = (v) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${v}_Gray_Base/MapServer/tile`;
const TILE_SRC = { // max = hoogste zoomniveau met echte tegels (Esri: z17 geeft een lege tegel; EOX: z19 geeft 404)
  light: { max: 16, url: (z, x, y) => `${ESRI('Light')}/${z}/${y}/${x}` },
  dark: { max: 16, url: (z, x, y) => `${ESRI('Dark')}/${z}/${y}/${x}` },
  sat: { max: 17, url: (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/${z}/${y}/${x}.jpg` },
};
const mapTiles = []; // per kaart: functie die de tegels ververst (bijv. na wisselen van thema)
const TILE_CAP = 36;
/* Laadt alleen tegels voor het zichtbare deel (+ marge), plaatst ze via de kaartprojectie (hoeken van de tegel)
   en laat de oude tegels staan tot de nieuwe binnen zijn. */
function makeTiles({ svg, host, proj, inv, view, isSat }) {
  const NN = (z) => 2 ** z;
  const lonX = (lo, z) => Math.floor((lo + 180) / 360 * NN(z)), latY = (la, z) => Math.floor((1 - Math.asinh(Math.tan(rad(la))) / Math.PI) / 2 * NN(z));
  const tLon = (x, z) => x / NN(z) * 360 - 180, tLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / NN(z)))) * 180 / Math.PI;
  let gen = 0, timer = 0, pending = [], curKey = '';
  function plan() {
    const v = view(), key = isSat ? 'sat' : effTheme(), src = TILE_SRC[key], mx = v.w * 0.2, my = v.h * 0.2;
    const [lonA] = inv(v.x, v.y), [lonB] = inv(v.x + v.w, v.y);
    const [lonW, latN] = inv(v.x - mx, v.y - my), [lonE, latS] = inv(v.x + v.w + mx, v.y + v.h + my);
    const wpx = svg.getBoundingClientRect().width || 343, dpr = window.devicePixelRatio || 1;
    const zf = Math.log2(wpx * 360 / (Math.abs(lonB - lonA) * 256));
    let z = clamp(Math.round(zf + (dpr >= 1.5 ? 0.5 : 0)), 3, src.max);
    const range = (zz) => ({ x0: clamp(lonX(lonW, zz), 0, NN(zz) - 1), x1: clamp(lonX(lonE, zz), 0, NN(zz) - 1), y0: clamp(latY(latN, zz), 0, NN(zz) - 1), y1: clamp(latY(latS, zz), 0, NN(zz) - 1) });
    let r = range(z);
    while ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) > TILE_CAP && z > 3) r = range(--z);
    const tiles = []; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) tiles.push({ x, y });
    return { src, z, tiles, key: `${key}/${z}/${r.x0},${r.x1},${r.y0},${r.y1}` };
  }
  function swap(p, ok) {
    if (!ok.length) return; // niets geladen (offline): oude tegels of de vector-kust blijven staan
    const ng = sv('g');
    for (const { t, im } of ok) {
      const [x0, y0] = proj(tLon(t.x, p.z), tLat(t.y, p.z)), [x1, y1] = proj(tLon(t.x + 1, p.z), tLat(t.y + 1, p.z));
      const ex = Math.abs(x1 - x0) * 0.004, ey = Math.abs(y1 - y0) * 0.004;
      ng.append(sv('image', { href: im.src, x: Math.min(x0, x1) - ex, y: Math.min(y0, y1) - ey, width: Math.abs(x1 - x0) + 2 * ex, height: Math.abs(y1 - y0) + 2 * ey, preserveAspectRatio: 'none' }));
    }
    host.prepend(ng);
    for (const c of [...host.children]) if (c !== ng) c.remove();
  }
  function run() {
    const p = plan(); if (p.key === curKey) return;
    curKey = p.key; const mine = ++gen;
    for (const im of pending) { im.onload = im.onerror = null; im.src = ''; } // verouderde laadacties afbreken
    pending = [];
    const ok = []; let left = p.tiles.length, fin = false;
    const finish = () => { if (fin || mine !== gen) return; fin = true; swap(p, ok); };
    for (const t of p.tiles) {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { ok.push({ t, im }); if (--left <= 0) finish(); };
      im.onerror = () => { if (--left <= 0) finish(); };
      im.src = p.src.url(p.z, t.x, t.y); pending.push(im);
    }
    setTimeout(finish, 10000);
  }
  return { update(now) { clearTimeout(timer); if (now) { curKey = ''; run(); } else timer = setTimeout(run, 150); } };
}

/* ---------- land en kust (uit data/geo.json) ---------- */
function landLayer(geoPart, proj, extra = {}) {
  const g = sv('g', extra);
  for (const land of geoPart.landen) {
    const d = land.ringen.map((r) => { let s = ''; for (let i = 0; i < r.length; i += 2) { const [x, y] = proj(r[i], r[i + 1]); s += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; } return s + 'Z'; }).join('');
    g.append(sv('path', { d, class: land.vz ? 'land vz' : 'land', 'fill-rule': 'evenodd' }));
  }
  return g;
}

/* Tekst op de kaart: lettergrootte in schermpixels (via u = kaarteenheden per pixel), krimpt een beetje mee bij inzoomen. */
function mapText(sc, u, x, y, px, text, o = {}) {
  const el = sv('text', { 'text-anchor': o.anchor || 'start', class: o.cls || null, style: o.style || null, 'data-obs': '' }, text);
  sc((z) => {
    const f = z ** -0.6, fs = px * u * f;
    el.setAttribute('font-size', fs.toFixed(4));
    el.setAttribute('x', (x + (o.dx || 0) * u * f).toFixed(4));
    el.setAttribute('y', (y + (o.dy || 0) * u * f + (o.base ? 0 : fs * 0.35)).toFixed(4));
    if (o.halo) el.style.strokeWidth = (o.halo * u * f).toFixed(4);
  });
  return el;
}
/* Plaatslabels met botsingsregels: hoogste rang eerst; een label vervalt als het een eerder label, een obstakel
   (markering, knoppen, schaalbalk, gradenlabels) of de kaartrand raakt. Vaste grootte in schermpixels;
   wordt opnieuw berekend bij elke zoom of verschuiving, zodat bij inzoomen meer dorpen verschijnen. */
function labelsLayer(plaatsen, proj, px = 10.5) {
  const g = sv('g'), items = plaatsen.map((p, i) => ({ p, i })).sort((a, b) => (a.p.rang ?? 2) - (b.p.rang ?? 2) || a.i - b.i).map(({ p }) => {
    const [x, y] = proj(p.lon, p.lat), dot = sv('circle', { class: 'pdot', visibility: 'hidden' }), txt = sv('text', { class: 'place', visibility: 'hidden' }, p.naam);
    g.append(dot, txt);
    return { p, x, y, dot, txt, ratio: 0 };
  });
  const hit = (b, list, pad) => list.some((o) => b.l < o.r + pad && b.r > o.l - pad && b.t < o.b + pad && b.b > o.t - pad);
  function layout(v, rect, obs) {
    const s = rect.width / v.w, placed = [];
    for (const it of items) {
      if (!it.ratio) { it.txt.setAttribute('font-size', 10); it.ratio = (it.txt.getComputedTextLength() || it.p.naam.length * 6) / 10; }
      const sx = rect.left + (it.x - v.x) * s, sy = rect.top + (it.y - v.y) * s;
      let done = false;
      if (sx > rect.left + 6 && sx < rect.right - 6 && sy > rect.top + 6 && sy < rect.bottom - 6) {
        const w = it.ratio * px, hh = px * 1.3, dot = { l: sx - 4, r: sx + 4, t: sy - 4, b: sy + 4 };
        for (const side of it.p.zijde === 'w' ? ['w', 'e'] : ['e', 'w']) {
          const l = side === 'e' ? sx + 6 : sx - 6 - w, b = { l, r: l + w, t: sy - hh / 2, b: sy + hh / 2 };
          if (b.l < rect.left + 3 || b.r > rect.right - 3 || b.t < rect.top + 3 || b.b > rect.bottom - 3) continue;
          if (hit(b, placed, 3) || hit(b, obs, 2) || hit(dot, placed, 0)) continue;
          placed.push(b, dot);
          it.txt.setAttribute('font-size', (px / s).toFixed(4)); it.txt.setAttribute('x', (it.x + (side === 'e' ? 6 : -6) / s).toFixed(4)); it.txt.setAttribute('y', (it.y + px * 0.35 / s).toFixed(4));
          it.txt.setAttribute('text-anchor', side === 'e' ? 'start' : 'end'); it.txt.style.strokeWidth = (2.5 / s).toFixed(4);
          it.dot.setAttribute('cx', it.x.toFixed(4)); it.dot.setAttribute('cy', it.y.toFixed(4)); it.dot.setAttribute('r', (3.2 / s).toFixed(4));
          done = true; break;
        }
      }
      it.txt.setAttribute('visibility', done ? 'visible' : 'hidden'); it.dot.setAttribute('visibility', done ? 'visible' : 'hidden');
    }
  }
  return { g, layout, shown: () => items.filter((it) => it.txt.getAttribute('visibility') === 'visible').map((it) => it.p.naam) };
}

/* ---------- eigen markeringen (huis, zwembad) ---------- */
const GLYPH = {
  huis: () => sv('path', { d: 'M12 4 3 12h3v8h5v-5h2v5h5v-8h3z', style: 'fill:var(--text)' }),
  zwembad: () => sv('path', { d: 'M8 13V5.5A2.5 2.5 0 0 1 13 5.5M14 13V5.5A2.5 2.5 0 0 1 19 5.5M8 9H14M2 16.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0', style: 'fill:none;stroke:var(--text);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round' }),
};
function markersLayer(markers, proj, sc, u) {
  const g = sv('g');
  for (const m of markers || []) {
    if (typeof m.lat !== 'number' || typeof m.lon !== 'number' || !GLYPH[m.icoon]) continue;
    const [x, y] = proj(m.lon, m.lat);
    const mg = sv('g', { role: 'img', 'aria-label': m.naam, 'data-obs': '' },
      sv('title', {}, m.naam),
      sv('circle', { r: 14, style: 'fill:var(--card);stroke:var(--text);stroke-width:1.6' }),
      sv('g', { transform: 'translate(-12 -12)' }, GLYPH[m.icoon]()));
    sc((z) => mg.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${(11 / 14 * u * z ** -0.6).toFixed(5)})`));
    g.append(mg);
  }
  return g;
}

/* =====================================================================
   Interactieve kaart: ÉÉN pointer-handler per kaart (dichtstbijzijnde punt binnen 22 px),
   zoomknoppen, slepen, knijpen en toetsenbord. Zoomen werkt via de viewBox.
   ===================================================================== */
const MAXZ = 14, HIT_PX = 22;
function interactiveMap(el, detailEl, o) {
  const base = o.base, u = o.u;
  const svg = sv('svg', { class: 'map', viewBox: `${base.x} ${base.y} ${base.w} ${base.h}`, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
  if (o.satellite) svg.classList.add('satview');
  const scalers = [];
  const sc = (fn) => { scalers.push(fn); fn(1); };
  const tileHost = sv('g', { 'aria-hidden': 'true' });
  const lab = o.back(svg, sc, tileHost);
  let tiles = null;
  const g = sv('g'), items = [];
  for (const e of [...o.evs].sort((a, b) => a.mag - b.mag)) {
    const [x, y] = o.pos(e), c = sv('circle', { class: `pt ${depthClass(e.diepte_km)}`, cx: +x.toFixed(3), cy: +y.toFixed(3) });
    items.push({ e, x, y, r0: o.rpx(e) * u, c });
    g.append(c);
  }
  sc((z) => { const f = z ** -0.5; for (const it of items) it.c.setAttribute('r', (it.r0 * f).toFixed(4)); });
  svg.append(g);
  o.front?.(svg, sc);

  const ordered = [...items].sort((a, b) => b.e.utc.localeCompare(a.e.utc));
  const box = h('div', { class: 'mapbox', tabindex: 0, role: 'group', 'aria-label': `${o.aria}. ${t('map_kbd')}` }, svg);
  const btn = (txt, label, fn) => h('button', { type: 'button', 'aria-label': label, title: label, onclick: fn }, txt);
  const zin = btn('+', t('zoom_in'), () => zoomC(1.6)), zout = btn('−', t('zoom_out'), () => zoomC(1 / 1.6)), zreset = btn('↺', t('zoom_reset'), () => setView(base.x, base.y, 1));
  const ctl = h('div', { class: `mapctl ${o.ctl || 'bottom'}` }, zin, zout, zreset);
  const attr = h('p', { class: 'mapattr' }); attr.innerHTML = t(o.satellite ? 'attr_sat' : 'attr_base');
  clear(el).append(h('div', { class: 'mapfrm' }, h('div', { class: 'mapstage' }, box, ctl), attr));
  const rectObs = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const obsEls = [...svg.querySelectorAll('[data-obs]')];
  const doLayout = () => { if (lab) lab.layout(v, rectOf(), [...obsEls, ctl].filter((e) => e.getBoundingClientRect().width).map(rectObs)); };
  box.__labels = lab;
  placeholder(detailEl);

  /* weergave */
  const v = { ...base }; let z = 1, scaledZ = 1, raf = 0;
  if (o.tiles) { tiles = makeTiles({ svg, host: tileHost, view: () => v, isSat: !!o.satellite, ...o.tiles }); mapTiles.push(() => tiles.update(true)); }
  const rectOf = () => svg.getBoundingClientRect();
  function setView(nx, ny, nz) {
    nz = clamp(nz, 1, MAXZ);
    const w = base.w / nz, hh = base.h / nz;
    nx = clamp(nx, base.x, base.x + base.w - w); ny = clamp(ny, base.y, base.y + base.h - hh);
    Object.assign(v, { x: nx, y: ny, w, h: hh }); z = nz;
    svg.setAttribute('viewBox', `${nx.toFixed(4)} ${ny.toFixed(4)} ${w.toFixed(4)} ${hh.toFixed(4)}`);
    const zoomed = z > 1.001;
    box.style.touchAction = zoomed ? 'none' : 'pan-y'; // ingezoomd: slepen = kaart verschuiven; anders blijft de pagina scrollbaar
    box.classList.toggle('zoomed', zoomed);
    zout.disabled = zreset.disabled = !zoomed; zin.disabled = z >= MAXZ - 0.001;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (scaledZ !== z) { scaledZ = z; for (const f of scalers) f(z); } doLayout(); });
    tiles?.update();
  }
  function zoomAt(cx, cy, nz) {
    nz = clamp(nz, 1, MAXZ);
    const r = rectOf(), fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    setView(v.x + fx * v.w - fx * base.w / nz, v.y + fy * v.h - fy * base.h / nz, nz);
  }
  function zoomC(f) { const r = rectOf(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, z * f); }
  setView(base.x, base.y, 1);
  tiles?.update(true);

  /* selectie */
  let cur = null, ki = -1;
  function show(it, commit) {
    if (cur) cur.c.classList.remove('sel');
    cur = it; ki = ordered.indexOf(it);
    it.c.classList.add('sel'); g.append(it.c);
    showDetail(detailEl, it.e);
    if (commit && mq.sheet.matches) openSheet(detailEl); else if (sheetEl === detailEl) detailEl.classList.add('open');
  }
  function deselect() { if (cur) cur.c.classList.remove('sel'); cur = null; ki = -1; placeholder(detailEl); }
  function hit(cx, cy) {
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse()), lim = HIT_PX / m.a;
    let best = null, bd = lim * lim;
    for (const it of items) { const dx = it.x - p.x, dy = it.y - p.y, d = dx * dx + dy * dy; if (d <= bd) { bd = d; best = it; } }
    return best;
  }

  /* aanwijzers: tikken, slepen, knijpen */
  const ptrs = new Map(); let st = null;
  box.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 1) st = { x0: ev.clientX, y0: ev.clientY, t0: performance.now(), vx: v.x, vy: v.y, moved: false, pinch: false };
    else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], r = rectOf(), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      Object.assign(st, { pinch: true, moved: true, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: z, px: v.x + (cx - r.left) / r.width * v.w, py: v.y + (cy - r.top) / r.height * v.h });
    }
    if (ev.pointerType === 'mouse' || z > 1 || ptrs.size > 1) { try { box.setPointerCapture(ev.pointerId); } catch { /* */ } }
  });
  box.addEventListener('pointermove', (ev) => {
    const p = ptrs.get(ev.pointerId);
    if (!p) { if (ev.pointerType === 'mouse' && ev.buttons === 0) { const it = hit(ev.clientX, ev.clientY); if (it && it !== cur) show(it, false); } return; }
    p.x = ev.clientX; p.y = ev.clientY;
    const r = rectOf();
    if (st.pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()], nz = clamp(st.z0 * Math.hypot(a.x - b.x, a.y - b.y) / st.d0, 1, MAXZ), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      setView(st.px - (cx - r.left) / r.width * base.w / nz, st.py - (cy - r.top) / r.height * base.h / nz, nz);
    } else if (ptrs.size === 1) {
      const dx = ev.clientX - st.x0, dy = ev.clientY - st.y0;
      if (!st.moved && Math.hypot(dx, dy) > 6) st.moved = true;
      if (st.moved && z > 1) setView(st.vx - dx * v.w / r.width, st.vy - dy * v.h / r.height, z);
    }
  });
  const up = (ev, cancelled) => {
    if (!ptrs.delete(ev.pointerId)) return;
    if (ptrs.size > 0) { const [q] = [...ptrs.values()]; Object.assign(st, { x0: q.x, y0: q.y, vx: v.x, vy: v.y, pinch: false, moved: true }); return; }
    const tap = !cancelled && st && !st.moved && performance.now() - st.t0 < 700;
    st = null;
    if (tap) { const it = hit(ev.clientX, ev.clientY); if (it) show(it, true); else { deselect(); } }
  };
  box.addEventListener('pointerup', (ev) => up(ev, false));
  box.addEventListener('pointercancel', (ev) => up(ev, true));
  box.addEventListener('dblclick', (ev) => zoomAt(ev.clientX, ev.clientY, z * 2));
  box.addEventListener('wheel', (ev) => { if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, z * (ev.deltaY < 0 ? 1.25 : 0.8)); } }, { passive: false });

  /* toetsenbord: pijltjes lopen door de bevingen (nieuwste eerst) */
  box.addEventListener('keydown', (ev) => {
    const go = (i) => {
      if (!ordered.length) return;
      const it = ordered[clamp(i, 0, ordered.length - 1)];
      show(it, true);
      if (it.x < v.x || it.x > v.x + v.w || it.y < v.y || it.y > v.y + v.h) setView(it.x - v.w / 2, it.y - v.h / 2, z);
    };
    const k = ev.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') go(ki + 1);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') go(ki < 0 ? 0 : ki - 1);
    else if (k === 'PageDown') go(ki + 10);
    else if (k === 'PageUp') go(ki - 10);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(ordered.length - 1);
    else if (k === '+' || k === '=') zoomC(1.6);
    else if (k === '-' || k === '_') zoomC(1 / 1.6);
    else if (k === '0') setView(base.x, base.y, 1);
    else return;
    ev.preventDefault();
  });
}

/* ---------- kaart La Guaira (kilometers vanaf het middelpunt) ---------- */
function mapLG(el, detailEl, evs) {
  const { cfg, R } = D, { lat: lat0, lon: lon0 } = cfg.la_guaira, k = Math.cos(rad(lat0)) * 111.32;
  const W = 2 * R + 16, u = W / Math.max(240, el.clientWidth || 343); // kaarteenheden per schermpixel
  const projKm = (lon, lat) => [(lon - lon0) * k, -(lat - lat0) * 110.574];
  interactiveMap(el, detailEl, {
    base: { x: -R - 8, y: -R - 8, w: W, h: W }, u, evs, satellite: sat.lg,
    tiles: { proj: projKm, inv: (x, y) => [lon0 + x / k, lat0 - y / 110.574] },
    aria: t('map_aria_lg', { n: evs.length, R, c: P.c }),
    pos: (e) => projKm(e.lon, e.lat), rpx: (e) => 2 + 0.7 * e.mag,
    back(svg, sc, tileHost) {
      if (D.geo) svg.append(landLayer(D.geo.lg, projKm));
      svg.append(tileHost);
      const labels = D.geo ? labelsLayer(D.geo.lg.plaatsen, projKm) : null;
      const step = R <= 20 ? 5 : 10;
      for (let r = step; r <= R + 1e-9; r += step) {
        svg.append(sv('circle', { class: Math.abs(r - R) < 1e-9 ? 'ring main' : 'ring', cx: 0, cy: 0, r }));
        svg.append(mapText(sc, u, r * 0.7071, -r * 0.7071, 10, `${r} km`, { dx: 3, dy: -2, base: true, halo: 2, cls: 'place' }));
      }
      svg.append(sv('path', { d: `M${-3 * u * 4} 0H${3 * u * 4}M0 ${-3 * u * 4}V${3 * u * 4}`, stroke: 'var(--text)', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
      const na = sv('g', {}, sv('path', { d: 'M0 -6L2.2 1L0 -.6L-2.2 1Z', style: 'fill:var(--text)' }));
      sc((z) => na.setAttribute('transform', `translate(${R + 3} ${-R + 1}) scale(${(u * 4 * z ** -0.6).toFixed(4)})`));
      svg.append(na, mapText(sc, u, R + 3, -R + 1, 11, 'N', { anchor: 'middle', dy: 21, base: true }));
      const sb = sv('path', { d: `M${-R - 4} ${R + 3}h10m-10 -1v2m10 -2v2`, stroke: 'var(--text)', 'stroke-width': 1.4, fill: 'none', 'vector-effect': 'non-scaling-stroke' });
      svg.append(sb, mapText(sc, u, -R - 4, R + 3, 10.5, '10 km', { dy: 14, base: true, halo: 2, cls: 'place' }));
      na.setAttribute('data-obs', ''); sb.setAttribute('data-obs', '');
      if (labels) svg.append(labels.g);
      return labels;
    },
    front: (svg, sc) => svg.append(markersLayer(cfg.markers, projKm, sc, u)),
  });
}

/* ---------- kaart rest van Venezuela (uitsnede op de gegevens) ---------- */
function mapRest(el, detailEl, evs) {
  if (!evs.length) { clear(el).append(h('p', { class: 'note' }, t('none'))); placeholder(detailEl); return; }
  const lons = evs.map((e) => e.lon), lats = evs.map((e) => e.lat);
  const minLon = Math.floor(Math.min(...lons) - 0.5), maxLon = Math.ceil(Math.max(...lons) + 0.5);
  const minLat = Math.floor(Math.min(...lats) - 0.5), maxLat = Math.ceil(Math.max(...lats) + 0.5);
  const k = Math.cos(rad((minLat + maxLat) / 2)), Wd = (maxLon - minLon) * k, Hd = maxLat - minLat;
  const u = Wd / (Math.max(240, el.clientWidth || 343) - 34); // eenheden per schermpixel, met ruimte voor de gradenlabels
  const X = (lon) => (lon - minLon) * k, Y = (lat) => maxLat - lat, proj = (lo, la) => [X(lo), Y(la)];
  const base = { x: -28 * u, y: -6 * u, w: Wd + 34 * u, h: Hd + 24 * u };
  const pxPerDeg = k / u, lonStep = Math.max(1, Math.ceil(34 / pxPerDeg)), latStep = Math.max(1, Math.ceil(20 / (1 / u)));
  interactiveMap(el, detailEl, {
    base, u, evs, satellite: sat.r, ctl: 'top',
    tiles: { proj, inv: (x, y) => [minLon + x / k, maxLat - y] },
    aria: t('map_aria_r', { n: evs.length }),
    pos: (e) => [X(e.lon), Y(e.lat)], rpx: (e) => 1.5 + 0.35 * e.mag,
    back(svg, sc, tileHost) {
      if (D.geo) svg.append(landLayer(D.geo.regio, proj));
      svg.append(tileHost);
      for (let lo = minLon; lo <= maxLon; lo++) {
        svg.append(sv('line', { class: 'mgrid', x1: X(lo), x2: X(lo), y1: 0, y2: Hd }));
        if ((lo - minLon) % lonStep === 0) svg.append(mapText(sc, u, X(lo), Hd, 10.5, `${Math.abs(lo)}°${lo < 0 ? t('dir_w') : t('dir_e')}`, { anchor: 'middle', dy: 13, base: true }));
      }
      for (let la = minLat; la <= maxLat; la++) {
        svg.append(sv('line', { class: 'mgrid', x1: 0, x2: Wd, y1: Y(la), y2: Y(la) }));
        if ((la - minLat) % latStep === 0) svg.append(mapText(sc, u, 0, Y(la), 10.5, `${Math.abs(la)}°${la >= 0 ? t('dir_n') : t('dir_s')}`, { anchor: 'end', dx: -4 }));
      }
      const labels = D.geo ? labelsLayer(D.geo.regio.plaatsen, proj) : null;
      if (labels) svg.append(labels.g);
      return labels;
    },
  });
}

/* ---------- staafdiagram (tekent op de werkelijke breedte: 1 eenheid = 1 pixel) ---------- */
function niceTop(max) {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]) if (max / step <= 5) return { step, top: Math.ceil(max / step) * step };
  return { step: 1000, top: Math.ceil(max / 1000) * 1000 };
}
const chartW = (el) => Math.max(260, Math.floor(el.clientWidth) || 640);
const FS = 12; // lettergrootte in assen (px)
function barChart(el, items, ariaLabel) {
  const W = chartW(el), H = mq.phone.matches ? 200 : 230, mt = 10, mb = 34, mr = 8;
  const { step, top } = niceTop(Math.max(1, ...items.map((i) => i.value)));
  const ml = Math.max(30, fi(top).length * 7.5 + 12), iw = W - ml - mr, ih = H - mt - mb;
  const svg = sv('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': ariaLabel });
  for (let val = 0; val <= top; val += step) {
    const y = mt + ih - (val / top) * ih;
    svg.append(sv('line', { class: 'grid', x1: ml, x2: W - mr, y1: y, y2: y }), sv('text', { x: ml - 5, y: y + 4, 'font-size': FS, 'text-anchor': 'end' }, fi(val)));
  }
  const tip = h('p', { class: 'tip', 'aria-live': 'polite' }, t('bar_hint'));
  const bw = iw / items.length, bw2 = Math.max(1, bw * 0.78);
  const every = Math.max(1, Math.ceil((Math.max(...items.map((i) => String(i.tick).length)) * 7 + 14) / bw)); // tekst overlapt nooit
  items.forEach((it, i) => {
    const x = ml + i * bw, bh = (it.value / top) * ih;
    const g = sv('g', { class: 'b', tabindex: 0, role: 'button', 'aria-label': it.tip });
    g.append(sv('rect', { x, y: mt, width: bw, height: ih, fill: 'transparent' }), sv('rect', { class: 'bar', x: x + (bw - bw2) / 2, y: mt + ih - bh, width: bw2, height: bh }));
    const go = () => { svg.querySelector('.sel')?.classList.remove('sel'); g.classList.add('sel'); tip.textContent = it.tip; };
    g.addEventListener('click', go); g.addEventListener('focus', go); g.addEventListener('mouseenter', go);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    svg.append(g);
    if (i % every === 0) svg.append(sv('text', { x: x + bw / 2, y: H - mb + 17, 'font-size': FS, 'text-anchor': 'middle' }, it.tick));
  });
  svg.append(sv('line', { class: 'axis', x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih }));
  clear(el).append(svg, tip);
}

/* ---------- lijngrafiek (cumulatief) ---------- */
function lineChart(el, official, daily, ariaLabel) {
  const W = chartW(el), H = mq.phone.matches ? 210 : 260, mt = 12, mb = 32, mr = 14;
  const ts = [...official.map((p) => p.t), ...daily.map((p) => p.t)];
  const t0 = Math.min(...ts), t1 = Math.max(...ts), vmax = Math.max(...official.map((p) => p.v), ...daily.map((p) => p.v), 1);
  const { step, top } = niceTop(vmax);
  const ml = Math.max(34, fi(top).length * 7.5 + 12), iw = W - ml - mr, ih = H - mt - mb;
  const X = (tt) => ml + ((tt - t0) / Math.max(1, t1 - t0)) * iw, Y = (val) => mt + ih - (val / top) * ih;
  const svg = sv('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': ariaLabel });
  for (let val = 0; val <= top; val += step) svg.append(sv('line', { class: 'grid', x1: ml, x2: W - mr, y1: Y(val), y2: Y(val) }), sv('text', { x: ml - 5, y: Y(val) + 4, 'font-size': FS, 'text-anchor': 'end' }, fi(val)));
  const d0 = new Date(t0); let my = d0.getUTCFullYear(), mm = d0.getUTCMonth() + 1;
  const monthsSpan = (t1 - t0) / DAY / 30.4, every = Math.max(1, Math.ceil(36 / (iw / Math.max(1, monthsSpan))));
  for (let n = 0; Date.UTC(my, mm, 1) <= t1; n++) {
    const tt = Date.UTC(my, mm, 1);
    svg.append(sv('line', { class: 'grid', x1: X(tt), x2: X(tt), y1: mt, y2: mt + ih }));
    if (n % every === 0) svg.append(sv('text', { x: X(tt), y: H - 12, 'font-size': FS, 'text-anchor': 'middle' }, MSHORT()[mm % 12]));
    if (++mm > 11) { mm = 0; my++; }
  }
  svg.append(sv('path', { d: daily.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(''), fill: 'none', style: 'stroke:var(--muted);stroke-width:2;stroke-dasharray:5 4' }));
  svg.append(sv('path', { d: official.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(''), fill: 'none', style: 'stroke:var(--bar);stroke-width:2.5' }));
  const tip = h('p', { class: 'tip', 'aria-live': 'polite' }, t('pt_hint'));
  for (const p of official) {
    const c = sv('circle', { cx: X(p.t), cy: Y(p.v), r: 6, tabindex: 0, role: 'button', 'aria-label': p.tip, style: `fill:${p.ca ? 'var(--card)' : 'var(--bar)'};stroke:var(--bar);stroke-width:2.5;cursor:pointer` });
    const go = () => { tip.textContent = p.tip; };
    c.addEventListener('focus', go);
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    svg.append(c);
  }
  // één handler: dichtstbijzijnde punt (horizontaal) binnen 28 px, ook voor vingers
  const nearest = (ev) => {
    const r = svg.getBoundingClientRect(), s = W / r.width, px = (ev.clientX - r.left) * s;
    let best = null, bd = 28;
    for (const p of official) { const d = Math.abs(X(p.t) - px); if (d < bd) { bd = d; best = p; } }
    if (best) tip.textContent = best.tip;
  };
  svg.addEventListener('click', nearest);
  svg.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') nearest(ev); });
  svg.append(sv('line', { class: 'axis', x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih }));
  const leg = h('div', { class: 'legend' }, h('span', {}, t('leg_off')), h('span', {}, t('leg_list')));
  clear(el).append(svg, leg, tip);
}

/* ---------- week/maand-blokken ---------- */
/* Staafdiagram met een venster van `small` (telefoon) of `big` staven en knoppen ‹ › om 1 week/maand op te schuiven. */
function windowed(el, items, small, big, aria, noun) {
  const id = el.id, chartEl = h('div');
  const prev = h('button', { type: 'button', class: 'more navbtn', 'aria-label': t(`prev_${noun}`) }, '‹');
  const next = h('button', { type: 'button', class: 'more navbtn', 'aria-label': t(`next_${noun}`) }, '›');
  const info = h('span', { class: 'note', 'aria-live': 'polite' });
  clear(el).append(h('div', { class: 'filter navrow' }, prev, next, info), chartEl);
  const size = () => Math.min(items.length, mq.phone.matches ? small : big);
  const draw = () => {
    let end = Math.min(S.win[id] ?? items.length, items.length);
    end = Math.max(end, size()); S.win[id] = end;
    const start = Math.max(0, end - size()), part = items.slice(start, end);
    barChart(chartEl, part, aria);
    info.textContent = t('range_info', { a: part[0].span.split(' – ')[0], b: part[part.length - 1].span.split(' – ').pop() });
    prev.disabled = start <= 0; next.disabled = end >= items.length;
  };
  prev.addEventListener('click', () => { S.win[id] = Math.max(size(), (S.win[id] ?? items.length) - 1); draw(); });
  next.addEventListener('click', () => { S.win[id] = Math.min(items.length, (S.win[id] ?? items.length) + 1); draw(); });
  charts.push(draw);
  draw();
}

function periodBlock(prefix, evs) {
  const wk = buckets(evs, D.weeks, (e) => e.wk), mo = buckets(evs, D.months, (e) => e.mo);
  const tipOf = (b, name) => b.n ? t('tip_bucket', { name, n: fi(b.n), max: f1(b.max.mag), avg: f1(b.avg) }) : t('tip_none', { name });
  windowed($(`${prefix}-weekchart`), wk.map((b) => ({ value: b.n, tick: `${+isoDay(b.start).slice(8)}/${+isoDay(b.start).slice(5, 7)}`, tip: tipOf(b, `${weekLabel(b)}, ${weekRange(b)}`), span: weekRange(b) })), 8, 16, t('chart_week'), 'week');
  table($(`${prefix}-weektable`), [t('th_week'), t('th_period'), t('th_count'), t('th_max')], [...wk].reverse().map((b) => [weekLabel(b), weekRange(b), fi(b.n), b.n ? f1(b.max.mag) : '–']));
  windowed($(`${prefix}-monthchart`), mo.map((b) => ({ value: b.n, tick: MSHORT()[+b.key.slice(5) - 1], tip: tipOf(b, monthLabel(b.key)), span: monthLabel(b.key) })), 5, 6, t('chart_month'), 'month');
  table($(`${prefix}-monthtable`), [t('th_month'), t('th_count'), t('th_avg'), t('th_max')], [...mo].reverse().map((b) => [monthLabel(b.key), fi(b.n), b.n ? f1(b.avg) : '–', b.n ? f1(b.max.mag) : '–']));
}

function statCards(el, st, since, extra = []) {
  const m = st.max, l = st.latest;
  clear(el).append(
    card(t('stat_n'), fi(st.n), since),
    m ? card(t('stat_max'), `M ${f1(m.mag)}`, t('stat_max_sub', { when: `${fmtD(m.datum_hlv)} ${m.tijd_hlv}`, depth: f1(m.diepte_km), dist: f1(m.afstand), c: P.c })) : card(t('stat_max'), '–'),
    l ? card(t('stat_last'), `M ${f1(l.mag)}`, t('stat_last_sub', { when: `${fmtD(l.datum_hlv)} ${l.tijd_hlv}`, depth: f1(l.diepte_km), place: l.plaats })) : card(t('stat_last'), '–'),
    ...extra);
}

/* vergelijking: tabel op computer, kaartjes op telefoon (Verschil valt dan meteen op) */
function compare(el, rows) {
  if (!mq.phone.matches) {
    const wrap = h('div', { class: 'tablewrap' });
    table(wrap, [t('cmp_kind'), t('cmp_period'), t('cmp_off'), t('cmp_list'), t('cmp_diff'), t('cmp_src')], rows.map((r) => [r.kind, r.period, fi(r.off), fi(r.list), signed(r.diff), r.src]));
    clear(el).append(wrap); return;
  }
  const sorted = [...rows].sort((x, y) => y.date.localeCompare(x.date)); // nieuwste eerst
  let all = false;
  const draw = () => {
    const shown = all ? sorted : sorted.slice(0, 5);
    clear(el).append(h('ul', { class: 'cmplist' }, shown.map((r) => h('li', {},
      h('div', { class: 'cl' }, h('p', { class: 'ct' }, r.kind), h('p', { class: 'cp' }, r.period)),
      h('div', { class: 'diff', 'aria-label': `${t('cmp_diff')} ${signed(r.diff)}` }, signed(r.diff)),
      h('p', { class: 'cs' }, `${t('cmp_off')} ${fi(r.off)} · ${t('cmp_list')} ${fi(r.list)} · ${r.src}`)))));
    if (!all && sorted.length > 5) el.append(h('button', { type: 'button', class: 'more', onclick: () => { all = true; draw(); } }, t('cmp_all', { n: sorted.length })));
  };
  draw();
}

/* ---------- gegevens laden en afleiden ---------- */
async function load() {
  const get = async (f) => { const r = await fetch(`data/${f}`, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json(); };
  return Promise.all([get('config.json'), get('events.json'), get('official.json'), get('meta.json'), get('geo.json').catch(() => null)]);
}

function derive(cfg, events, off, meta, geo) {
  const { lat: la0, lon: lo0, straal_km: R } = cfg.la_guaira;
  const terms = cfg.buurland_plaatsen.map(norm);
  for (const e of events) {
    e.afstand = haversine(la0, lo0, e.lat, e.lon);
    e.mo = e.datum_hlv.slice(0, 7);
    e.wk = isoWeek(e.datum_hlv).key;
    const p = norm(e.plaats);
    e.zone = terms.some((x) => p.includes(x)) ? 'buur' : e.afstand <= R ? 'lg' : 'rest';
  }
  const lg = events.filter((e) => e.zone === 'lg'), rest = events.filter((e) => e.zone === 'rest'), buur = events.filter((e) => e.zone === 'buur');
  const first = events[events.length - 1].datum_hlv, last = events[0].datum_hlv;
  const today = isoDay(Date.now() - 4 * 3600e3), lastDay = last > today ? last : today;
  const weeks = []; for (let tt = isoWeek(first).start; tt <= parseD(lastDay); tt += 7 * DAY) weeks.push(isoWeek(isoDay(tt)));
  const months = []; for (let y = +first.slice(0, 4), m = +first.slice(5, 7); `${y}-${p2(m)}` <= lastDay.slice(0, 7);) { months.push({ key: `${y}-${p2(m)}` }); if (++m > 12) { m = 1; y++; } }
  const cum = [...off.cumulatief].sort((a, b) => a.datum.localeCompare(b.datum));
  const wr = [...off.weekrapporten].sort((a, b) => a.van.localeCompare(b.van));
  return { cfg, events, off, meta, geo, R, lg, rest, buur, first, last, today, lastDay, weeks, months, cum, lastCum: cum[cum.length - 1], wr, vz: events.filter((e) => e.zone !== 'buur'), startReeks: off.start_reeks };
}

/* taalafhankelijke parameters voor teksten */
function setParams() {
  const c = D.cfg.la_guaira;
  Object.assign(P, {
    R: D.R, c: c.naam || t('centre_fallback'), coord: coordTxt(c.lat, c.lon),
    since: t('long_dmy', { dm: fmtDM(D.startReeks), y: D.startReeks.slice(0, 4) }), since_dm: fmtDM(D.startReeks), first: fmtD(D.first), nBuur: fi(D.buur.length),
  });
}

/* ---------- vaste teksten (index.html) uit het woordenboek ---------- */
function applyStatic() {
  const root = document.documentElement;
  root.lang = lang;
  document.title = t('meta_title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta_desc'));
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml, {}, true);
  for (const el of document.querySelectorAll('[data-i18n-attr]')) for (const pair of el.dataset.i18nAttr.split(';')) { const [a, k] = pair.split(':'); el.setAttribute(a, t(k)); }
  const lb = $('langBtn'); $('langTxt').textContent = t('lang_btn'); lb.setAttribute('aria-label', t('lang_label')); lb.title = t('lang_label');
  refreshThemeBtn?.();
}

/* ---------- tekenen ---------- */
function periodInfo() {
  const { mode, idx } = S.period;
  if (mode === 'm') { const m = D.months[idx]; return { sub: D.lg.filter((e) => e.mo === m.key), cur: monthLabel(m.key), since: t('in_month', { m: monthLabel(m.key) }) }; }
  if (mode === 'w') { const w = D.weeks[idx]; return { sub: D.lg.filter((e) => e.wk === w.key), cur: `${weekLabel(w)}: ${weekRange(w)}`, since: t('in_week', { w: weekLabel(w), r: weekRange(w) }) }; }
  return { sub: D.lg, cur: '', since: t('since_first', { d: fmtD(D.first) }) };
}
function drawLG() {
  const { mode, idx } = S.period, info = periodInfo(), len = mode === 'm' ? D.months.length : D.weeks.length;
  for (const b of $('lg-seg').children) b.setAttribute('aria-pressed', String(b.dataset.p === mode));
  document.querySelector('#lg-prev').parentNode.hidden = mode === 'all';
  $('lg-pcur').textContent = info.cur;
  $('lg-prev').disabled = idx <= 0; $('lg-next').disabled = idx >= len - 1;
  $('lg-count').textContent = t('count_shown', { n: fi(info.sub.length) });
  mapLG($('lg-map'), $('lg-detail'), info.sub);
  statCards($('lg-stats'), stats(info.sub), info.since); // kerncijfers volgen de gekozen periode
}
function drawRest() { mapRest($('r-map'), $('r-detail'), D.rest); }

function renderOverview() {
  const { off, meta, cfg, lastCum, events } = D, curMonth = D.today.slice(0, 7);
  const inMonth = events.filter((e) => e.mo === curMonth);
  const age = meta.laatste_controle_utc ? (Date.now() - Date.parse(meta.laatste_controle_utc)) / DAY : Infinity;
  const limit = cfg.waarschuwing_na_dagen ?? 9;
  clear($('ov-warn'));
  if (age > limit) $('ov-warn').append(h('div', { class: 'warn', role: 'alert' }, t('warn_old', { age: Number.isFinite(age) ? t('age_days', { n: Math.floor(age) }) : t('age_unknown'), limit })));
  clear($('ov-cards')).append(
    card(t('card_total'), fi(lastCum.aantal), `${lastCum.ca ? t('approx') : ''}${t('asof', { d: fmtD(lastCum.datum), b: loc(lastCum, 'bron') })}`),
    ...off.hoofdbevingen.map((b, i) => card(t('card_main', { n: i + 1 }), `M ${f1(b.mag)}`, `${fmtD(b.datum_hlv)} ${b.tijd_hlv} HLV · ${t('depth_km', { v: f1(b.diepte_km) })} · ${loc(b, 'omschrijving')}`)),
    card(t('card_cur', { m: monthLabel(curMonth) }), fi(inMonth.filter((e) => e.zone !== 'buur').length), t('card_cur_sub', { b: fi(inMonth.filter((e) => e.zone === 'buur').length) })));
  $('ov-upd').textContent = meta.laatste_controle_utc
    ? t('upd', { a: fmtMs(Date.parse(meta.laatste_controle_utc), -4), b: fmtMs(Date.parse(meta.laatste_controle_utc), 0), c: events[0] ? `${fmtD(events[0].datum_hlv)} ${events[0].tijd_hlv} HLV` : '–' })
    : t('upd_unknown');
}

function renderRest() {
  const { rest, buur, vz, cum, wr, meta, first, startReeks, lastDay, lastCum } = D;
  statCards($('r-stats'), stats(rest), t('since_first', { d: fmtD(first) }), [card(t('stat_buur'), fi(buur.length), t('stat_buur_sub'))]);
  const perDag = new Map(); for (const e of vz) if (e.datum_hlv >= startReeks) perDag.set(e.datum_hlv, (perDag.get(e.datum_hlv) || 0) + 1);
  const countUntil = (d) => vz.filter((e) => e.datum_hlv >= startReeks && e.datum_hlv <= d).length;
  const dailyEnd = lastCum.datum > lastDay ? lastCum.datum : lastDay;
  const daily = []; let run = 0;
  for (let tt = parseD(startReeks); tt <= parseD(dailyEnd); tt += DAY) { run += perDag.get(isoDay(tt)) || 0; daily.push({ t: tt, v: run }); }
  const cumPts = cum.map((c) => ({ t: parseD(c.datum), v: c.aantal, ca: c.ca, tip: t('cum_tip', { d: fmtD(c.datum), n: fi(c.aantal), ca: c.ca ? t('ca') : '', b: loc(c, 'bron') }) }));
  const cumEl = $('r-cumchart'), repEl = $('r-reportchart');
  const drawCum = () => lineChart(cumEl, cumPts, daily, t('cum_aria'));
  const reportItems = wr.map((w) => ({ value: w.aantal, tick: fmtShort(w.van), tip: t('wr_tip', { a: fmtD(w.van), b: fmtD(w.tot), n: fi(w.aantal), s: loc(w, 'bron') }) }));
  const drawRep = () => barChart(repEl, reportItems, t('wr_aria'));
  charts.push(drawCum, drawRep); drawCum(); drawRep();

  // afwijkingen
  const mc = Object.entries(meta.controle_per_maand || {}).sort(([a], [b]) => a.localeCompare(b));
  let lastBad = -1; mc.forEach(([, v], i) => { if (v.klopt === false) lastBad = i; });
  const okN = mc.filter(([, v]) => v.klopt === true).length, noN = mc.filter(([, v]) => v.klopt === null).length;
  const completeFrom = mc.length ? (lastBad + 1 < mc.length ? fmtD(`${mc[lastBad + 1][0]}-01`) : null) : null;
  $('r-complete').textContent = mc.length
    ? t('complete', { first: fmtD(first), part: completeFrom ? t('part_from', { d: completeFrom }) : t('part_none'), ok: fi(okN), tot: fi(mc.length), no: noN ? t('no_counter', { n: fi(noN) }) : '' })
    : t('no_checks');
  const rows = [
    ...cum.map((c) => { const l = countUntil(c.datum); return { date: c.datum, kind: t('kind_total'), period: t('cmp_range', { a: fmtD(startReeks), b: fmtD(c.datum), ca: c.ca ? t('ca') : '' }), off: c.aantal, list: l, diff: l - c.aantal, src: loc(c, 'bron') }; }),
    ...wr.map((w) => { const l = vz.filter((e) => e.datum_hlv >= w.van && e.datum_hlv <= w.tot).length; return { date: w.tot, kind: t('kind_week'), period: t('cmp_range', { a: fmtD(w.van), b: fmtD(w.tot), ca: '' }), off: w.aantal, list: l, diff: l - w.aantal, src: loc(w, 'bron') }; }),
  ];
  const drawCmp = () => compare($('r-compare'), rows);
  lists.push(drawCmp); drawCmp();

  drawRest(); charts.push(drawRest);
  periodBlock('r', rest);
  const drawL = () => listTable($('r-list'), rest), drawN = () => listTable($('r-neigh'), buur);
  lists.push(drawL, drawN); drawL(); drawN();
}

function renderAll() {
  if (!D) { setFormats(); applyStatic(); return; }
  closeSheet();
  charts.length = 0; lists.length = 0; mapTiles.length = 0;
  setFormats(); setParams(); applyStatic();
  renderOverview();
  legend($('lg-legend')); legend($('r-legend'));
  $('lg-sat').checked = sat.lg; $('r-sat').checked = sat.r;
  drawLG();
  charts.push(() => mapLG($('lg-map'), $('lg-detail'), periodInfo().sub));
  periodBlock('lg', D.lg);
  const drawL = () => listTable($('lg-list'), D.lg);
  lists.push(drawL); drawL();
  renderRest();
}

/* ---------- besturing ---------- */
let refreshThemeBtn = null;
function initChrome() {
  const root = document.documentElement, btn = $('themeBtn');
  try { const x = localStorage.getItem('thema'); if (x === 'light' || x === 'dark') root.dataset.theme = x; } catch { /* geen opslag */ }
  const eff = effTheme;
  refreshThemeBtn = () => {
    btn.textContent = eff() === 'dark' ? '☀' : '☾';
    btn.title = eff() === 'dark' ? t('theme_to_light') : t('theme_to_dark');
    btn.setAttribute('aria-label', btn.title);
    for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.setAttribute('content', eff() === 'dark' ? '#19212b' : '#ffffff'); // kopbalk volgt het gekozen thema
  };
  btn.addEventListener('click', () => { root.dataset.theme = eff() === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('thema', root.dataset.theme); } catch { /* */ } refreshThemeBtn(); for (const f of mapTiles) f(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { refreshThemeBtn(); for (const f of mapTiles) f(); });

  $('langBtn').addEventListener('click', () => {
    lang = lang === 'nl' ? 'es' : 'nl';
    try { localStorage.setItem('taal', lang); } catch { /* */ }
    renderAll();
  });

  const tabs = [...document.querySelectorAll('.tab')];
  const mark = (id) => tabs.forEach((x) => x.setAttribute('aria-current', String(x.dataset.s === id)));
  mark('overzicht');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) mark(x.target.id); }), { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('main > section').forEach((s) => io.observe(s));
  }
}

function initControls() {
  // periodekiezer: Alles / Maand / Week plus ‹ ›
  for (const b of $('lg-seg').children) b.addEventListener('click', () => {
    const m = b.dataset.p;
    S.period = { mode: m, idx: m === 'm' ? D.months.length - 1 : m === 'w' ? D.weeks.length - 1 : 0 };
    drawLG();
  });
  const step = (d) => { const len = S.period.mode === 'm' ? D.months.length : D.weeks.length; S.period.idx = clamp(S.period.idx + d, 0, len - 1); drawLG(); };
  $('lg-prev').addEventListener('click', () => step(-1));
  $('lg-next').addEventListener('click', () => step(1));
  // satellietbeeld
  for (const [id, key, redraw] of [['lg-sat', 'lg', drawLG], ['r-sat', 'r', drawRest]]) {
    try { sat[key] = localStorage.getItem(`sat-${key}`) === '1'; } catch { /* geen opslag */ }
    $(id).addEventListener('change', () => { sat[key] = $(id).checked; try { localStorage.setItem(`sat-${key}`, sat[key] ? '1' : '0'); } catch { /* */ } redraw(); });
  }
  // opnieuw tekenen bij andere breedte (grafieken) en bij wisselen telefoon/computer (lijsten, vergelijking)
  let lastW = 0, timer = 0;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { const w = Math.round($('overzicht').clientWidth); if (w && w !== lastW) { lastW = w; for (const f of charts) f(); } }, 150);
  };
  lastW = Math.round($('overzicht').clientWidth);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.querySelector('main')); else addEventListener('resize', onResize);
  mq.phone.addEventListener('change', () => { for (const f of lists) f(); for (const f of charts) f(); });
}

lang = detectLang();
setFormats();
initChrome();
applyStatic();
load().then(([cfg, events, off, meta, geo]) => {
  D = derive(cfg, events, off, meta, geo);
  initControls();
  renderAll();
}).catch((err) => {
  console.error(err);
  clear($('ov-cards')).append(h('div', { class: 'warn', role: 'alert' }, t('err', { m: err.message })));
});

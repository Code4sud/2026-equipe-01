#!/usr/bin/env node
/**
 * Import du référentiel O*NET FR (Job Zones) du Centre des Possibles.
 *
 *   node scripts/import-onet.mjs [chemin.xlsx] [sortie.json]
 *
 * Lit la première feuille du classeur sans aucune dépendance (un .xlsx est un
 * zip de fichiers XML : on lit le répertoire central et on décompresse avec
 * zlib). Pour chaque métier : code O*NET-SOC, intitulé FR, zone de
 * qualification (colonne « Zone réelle » si renseignée, sinon « jobZone ») et
 * 2 à 3 tags PolarIA attribués par famille SOC puis par mots-clés.
 *
 * Le paquet npm `xlsx` n'est volontairement pas utilisé (vulnérabilités connues
 * non corrigées sur npm), et ce script ne tourne qu'au moment du développement :
 * le site ne lit que le JSON généré.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const input = process.argv[2] ?? 'data/table-metiers-onet-fr-jobzones.xlsx';
const output = process.argv[3] ?? 'src/data/onet.json';

// ---------------------------------------------------------------- zip minimal
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Fichier .xlsx invalide (zip illisible)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Répertoire central zip invalide');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + size);
    files.set(name, () => (method === 0 ? raw : inflateRawSync(raw)).toString('utf8'));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

function readSheet(files) {
  const shared = [];
  const sst = files.get('xl/sharedStrings.xml')?.() ?? '';
  for (const si of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(decode([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  }
  const xml = files.get('xl/worksheets/sheet1.xml')?.();
  if (!xml) throw new Error('Feuille 1 introuvable');
  const rows = [];
  for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const c of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, attrs, inner = ''] = c;
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      const isText = /t="s"/.test(attrs);
      const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1];
      cells[col] = isText ? shared[Number(v)] : inline !== undefined ? decode(inline) : v !== undefined ? decode(v) : undefined;
    }
    rows.push(cells);
  }
  return rows;
}

// ------------------------------------------------------------- tags PolarIA
/** Tags par grand groupe SOC (2 premiers chiffres du code O*NET). */
const SOC_TAGS = {
  11: ['Commerce & Gestion'],
  13: ['Commerce & Gestion', 'Finance'],
  15: ['Tech & Numérique', 'Logique'],
  17: ['Technique & Énergie', 'Sciences & Analyse'],
  19: ['Sciences & Analyse'],
  21: ['Accompagnement'],
  23: ['Commerce & Gestion', 'Accompagnement'],
  25: ['Accompagnement'],
  27: ['Créatif & Scène'],
  29: ['Soin & Santé', 'Sciences & Analyse'],
  31: ['Soin & Santé', 'Accompagnement'],
  33: ['Accompagnement', 'Manuel & Terrain'],
  35: ['Restauration & Service'],
  37: ['Manuel & Terrain'],
  39: ['Accompagnement', 'Événementiel & Contact'],
  41: ['Commerce & Gestion', 'Événementiel & Contact'],
  43: ['Commerce & Gestion', 'Logistique'],
  45: ['Plein air & Nature', 'Manuel & Terrain'],
  47: ['Manuel & Terrain', 'Technique & Énergie'],
  49: ['Technique & Énergie', 'Manuel & Terrain'],
  51: ['Manuel & Terrain', 'Technique & Énergie'],
  53: ['Logistique'],
  55: ['Accompagnement', 'Manuel & Terrain'],
};

/** Mots-clés (intitulé et description FR) qui ajoutent ou renforcent un tag. */
const KEYWORDS = [
  ['Plein air & Nature', /\b(forêt|forest|nature|environnement|agricol|ferme|jardin|paysag|faune|flore|animal|animaux|pêche|mer\b|océan|biodiversit|parc|élevage|horticol)/i],
  ['Manuel & Terrain', /\b(chantier|bâtiment|maçon|menuis|soud|montage|manutention|carrière|construction|réparation|entretien|outil)/i],
  ['Technique & Énergie', /\b(énergie|électri|solaire|éolien|mécani|maintenance|installation|réseau électrique|chauffage|nucléaire|moteur|industriel)/i],
  ['Logistique', /\b(logisti|transport|livraison|entrepôt|stock|approvisionnement|conduc|chauffeur|expédition|fret|port\b)/i],
  ['Événementiel & Contact', /\b(accueil|clientèle|événement|tourisme|voyage|réception|salon|animation)/i],
  ['Commerce & Gestion', /\b(vente|vendeur|commerc|gestion|marketing|achat|entreprise|management|administrati)/i],
  ['Restauration & Service', /\b(cuisin|restaura|serveur|boulang|pâtiss|boucher|bar\b|café|hôtel|aliment|repas)/i],
  ['Finance', /\b(financ|comptab|banque|bancaire|assurance|budget|fiscal|audit|crédit|investiss)/i],
  ['Son & Média', /\b(sonore|du son|audio|radio|musique|journalis|média|vidéo|podcast|télévision|diffusion)/i],
  ['Créatif & Scène', /\b(artist|scène|spectacle|théâtre|danse|acteur|chorégraph|réalisat|création|créati)/i],
  ['Design & Image', /\b(design|graphi|photo|illustr|dessin|architect|décor|image|visuel|3d)/i],
  ['Tech & Numérique', /\b(informati|logiciel|numérique|développeur|web|données|data|cyber|programm|intelligence artificielle|réseau informatique)/i],
  ['Sciences & Analyse', /\b(scientifi|laboratoire|recherche|analys|chimi|biolog|physi|statisti|géolog|mesure)/i],
  ['Logique', /\b(mathémati|algorithm|calcul|statisti|modélis|logique|ingénieur)/i],
  ['Soin & Santé', /\b(santé|soin|patient|médic|infirmi|hôpital|thérap|pharma|vétérin|dentaire|esthéti)/i],
  ['Sport & Coaching', /\b(sport|athlète|entraîn|coach|fitness|activité physique|arbitre)/i],
  ['Accompagnement', /\b(accompagn|social|sociale|éducat|enseign|écoute|enfant|famille|insertion|handicap)/i],
];

function tagsFor(code, title, description) {
  const scores = new Map();
  const add = (tag, pts) => scores.set(tag, (scores.get(tag) ?? 0) + pts);
  (SOC_TAGS[Number(code.slice(0, 2))] ?? []).forEach((t, i) => add(t, 3 - i));
  for (const [tag, re] of KEYWORDS) {
    if (re.test(title)) add(tag, 4);
    const hits = description.match(new RegExp(re.source, 'gi'))?.length ?? 0;
    if (hits) add(tag, Math.min(hits, 3));
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([, s], i) => i < 2 || s >= 3)
    .slice(0, 3)
    .map(([t]) => t);
}

function zoneOf(real, jobZone) {
  const m = /Zone\s*([1-5])/i.exec(real ?? '');
  const z = Number(m?.[1] ?? jobZone);
  return Number.isInteger(z) && z >= 1 && z <= 5 ? z : null;
}

// --------------------------------------------------------------------- main
const rows = readSheet(unzip(readFileSync(input)));
const [header, ...body] = rows;
const col = (label) => Object.keys(header).find((k) => (header[k] ?? '').trim() === label);
const C = { real: col('Zone réelle'), code: col('O*NET-SOC Code'), fr: col('job_fr'), desc: col('description_fr'), zone: col('jobZone') };
for (const [k, v] of Object.entries(C)) if (!v) throw new Error(`Colonne introuvable : ${k}`);

const seen = new Set();
const jobs = [];
for (const r of body) {
  const code = (r[C.code] ?? '').trim();
  const title = (r[C.fr] ?? '').replace(/\s+/g, ' ').trim();
  const zone = zoneOf(r[C.real], r[C.zone]);
  if (!/^\d{2}-\d{4}\.\d{2}$/.test(code) || !title || !zone || seen.has(code)) continue;
  seen.add(code);
  jobs.push({ code, title, zone, tags: tagsFor(code, title, r[C.desc] ?? '') });
}
jobs.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(output, JSON.stringify(jobs, null, 0).replace(/\},\{/g, '},\n{') + '\n');
const byZone = jobs.reduce((acc, j) => ((acc[j.zone] = (acc[j.zone] ?? 0) + 1), acc), {});
console.log(`${jobs.length} métiers importés -> ${output}`, byZone);

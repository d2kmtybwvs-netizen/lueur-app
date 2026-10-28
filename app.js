/* Lueur — code de l’application (version 1.1), compilé à l’identique depuis la version testée dans Claude. Empreinte source : bb18eabd87 */
"use strict";
const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;
/* ---------- Utilitaires ---------- */
const STORAGE_KEY = 'lueur.v1';
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const addDays = (s, n) => { const t = toUTC(s) + n * 86400000; const d = new Date(t); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const toUTC = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
const fmtDate = (s, opts) => s ? new Date(toUTC(s)).toLocaleDateString('fr-FR', Object.assign({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, opts || {})) : '';
const fmtShort = s => fmtDate(s, { year: undefined, month: 'short' });
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const parseAmount = v => { const n = parseFloat(String(v !== null && v !== void 0 ? v : '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
const fmtMoney = (n, cur) => { try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur || 'EUR', maximumFractionDigits: n >= 1000 ? 0 : 2, minimumFractionDigits: n >= 1000 ? 0 : 2 }).format(n);
}
catch (e) {
    return n.toFixed(2) + ' ' + cur;
} };
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const prefersReduced = () => { try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
catch (e) {
    return false;
} };
async function copyText(t) { try {
    await navigator.clipboard.writeText(t);
    return true;
}
catch (e) {
    return false;
} }
/* ---------- Données de référence ---------- */
const PATHS = {
    reflect: { label: 'Je consomme encore et je réfléchis', hint: 'Observer, comprendre, sans engagement.' },
    prepare: { label: 'Je souhaite préparer mon arrêt', hint: 'Avancer pas à pas vers une date, si tu le veux.' },
    stopped: { label: 'J’ai déjà arrêté', hint: 'Suivre ton chemin et traverser les envies.' },
    resumed: { label: 'J’ai repris et je veux avancer', hint: 'Repartir sans rien effacer de ce que tu as appris.' },
};
const DURATIONS = ['Moins d’un an', '1 à 3 ans', '3 à 10 ans', 'Plus de 10 ans'];
const FREQUENCIES = ['Occasionnellement', 'Quelques fois par semaine', 'Tous les jours', 'Plusieurs fois par jour'];
const MOMENTS = ['Le matin', 'En journée', 'Le soir', 'Pour m’endormir', 'Le week-end', 'Avec des amis', 'Seul·e', 'Quand je suis stressé·e', 'Par ennui'];
const WISHES = ['Mieux dormir', 'Plus de clarté', 'Plus d’énergie', 'Faire des économies', 'Me sentir libre', 'Ma santé', 'Mes relations', 'Ma motivation', 'Ma mémoire'];
const CURRENCIES = [['EUR', 'Euro (€)'], ['CHF', 'Franc suisse (CHF)'], ['USD', 'Dollar américain ($)'], ['CAD', 'Dollar canadien ($ CA)'], ['GBP', 'Livre sterling (£)']];
const DEFAULT_PREP = ['Écrire mes raisons de changer', 'Repérer mes moments à risque', 'Prévenir une personne de confiance', 'Ranger ou donner le matériel', 'Prévoir des activités pour les soirées', 'Préparer une routine de sommeil', 'Remplir mon plan pour les moments difficiles']
    .map((label, i) => ({ id: 'p' + i, label, done: false }));
const VICTORY_TYPES = [
    { id: 'craving', label: 'J’ai traversé une envie' },
    { id: 'trigger', label: 'J’ai identifié un déclencheur' },
    { id: 'help', label: 'J’ai demandé de l’aide' },
    { id: 'care', label: 'J’ai pris soin de moi' },
    { id: 'moment', label: 'J’ai passé un moment sans consommer' },
    { id: 'habits', label: 'J’ai mieux compris mes habitudes' },
];
const EMOTIONS = ['Stress', 'Ennui', 'Fatigue', 'Tristesse', 'Colère', 'Anxiété', 'Solitude', 'Joie', 'Autre'];
const TRIGGERS = ['Fin de journée', 'Après un repas', 'Avec des amis', 'Seul·e le soir', 'Pour dormir', 'Après une tension', 'Une odeur, une image', 'Une habitude', 'Autre'];
const MOOD = ['Très bas', 'Bas', 'Neutre', 'Bien', 'Très bien'];
const ENERGY = ['Très faible', 'Faible', 'Moyenne', 'Bonne', 'Très bonne'];
const SLEEP = ['Très difficile', 'Difficile', 'Moyen', 'Bon', 'Très bon'];
const DAILY_ACTIONS = [
    'Bois un grand verre d’eau en prenant ton temps.',
    'Marche dix minutes dehors, sans objectif.',
    'Écris une raison qui te donne envie de changer.',
    'Repère un moment de la journée où l’envie revient souvent.',
    'Envoie un message à une personne que tu apprécies.',
    'Prépare quelque chose de simple et bon à manger.',
    'Éteins les écrans trente minutes avant de dormir.',
    'Fais deux minutes de respiration avec la lueur.',
    'Range un espace qui te fait du bien quand il est clair.',
    'Note une chose que tu as bien gérée aujourd’hui.',
    'Écoute un morceau que tu aimes, en entier.',
    'Prends une douche chaude, lentement.',
];
const KIND_MESSAGES = [
    'Tu peux prendre ton temps.', 'Une envie n’est pas un ordre.', 'Tu as le droit d’avoir une journée difficile.',
    'Chaque petit changement compte.', 'De quoi aurais-tu besoin aujourd’hui ?', 'Ton chemin ne se résume pas à un compteur.',
    'Ce que tu ressens peut passer, même si c’est fort maintenant.', 'Tu n’as pas besoin d’être parfait·e pour avancer.',
    'Prendre soin de toi est déjà un pas.', 'Une reprise n’efface pas ce que tu as appris.',
];
/* ---------- Chronologie (contenu de santé) ---------- */
const TIMELINE = [
    { day: 1, title: 'Un nouveau rythme', text: 'Ton corps commence à s’adapter. Chez beaucoup de personnes, les premiers signes de sevrage apparaissent entre 24 et 48 heures après l’arrêt.', feel: ['Envies', 'Agitation', 'Irritabilité', 'Difficulté à t’endormir'], better: ['Tu as fait un premier pas concret', 'Tu peux commencer à observer tes envies'], tip: 'Prévois une soirée simple : un repas, de l’eau, une activité calme.', kind: 'Une envie n’est pas un ordre.' },
    { day: 2, title: 'Le corps cherche ses repères', text: 'L’inconfort peut augmenter un peu. C’est souvent le signe que ton organisme s’ajuste à l’absence de cannabis.', feel: ['Nervosité', 'Sommeil agité', 'Appétit réduit', 'Humeur changeante'], better: ['Certaines personnes remarquent du temps libéré dans leur journée'], tip: 'Une marche de dix minutes peut aider à faire redescendre la tension.', kind: 'Tu peux prendre ton temps.' },
    { day: 3, title: 'Une période parfois intense', text: 'Le sommeil, l’humeur ou l’appétit peuvent être perturbés. Ces sensations peuvent faire partie du sevrage. Les premiers jours sont souvent les plus inconfortables.', feel: ['Rêves intenses', 'Sueurs', 'Maux de tête', 'Anxiété', 'Humeur basse'], better: ['Tu traverses l’une des étapes souvent décrites comme les plus difficiles'], tip: 'Garde ton plan pour les moments difficiles à portée de main ce soir.', kind: 'Tu as le droit d’avoir une journée difficile.' },
    { day: 4, title: 'Une journée à la fois', text: 'Pour beaucoup de personnes, l’intensité reste présente autour de ces jours-là. Regarder seulement la journée en cours peut alléger le poids.', feel: ['Irritabilité', 'Fatigue', 'Envies plus marquées à certains moments'], better: ['Tu commences à connaître tes heures sensibles'], tip: 'Note dans ton journal les moments où l’envie monte.', kind: 'Chaque petit changement compte.' },
    { day: 5, title: 'Les envies ont une forme', text: 'Une envie monte, atteint un pic, puis redescend. Ce mouvement prend souvent quelques minutes, même s’il paraît plus long sur le moment.', feel: ['Envies par vagues', 'Sommeil encore irrégulier'], better: ['Tu as peut-être déjà traversé plusieurs vagues'], tip: 'Quand une envie arrive, observe-la deux minutes avant de décider quoi que ce soit.', kind: 'Ce qui monte peut aussi redescendre.' },
    { day: 7, title: 'De nouveaux repères', text: 'Certaines difficultés peuvent commencer à diminuer. D’autres peuvent prendre davantage de temps. Chaque parcours est différent.', feel: ['Fatigue', 'Sommeil encore fragile', 'Envies liées à certains lieux'], better: ['Certaines personnes ressentent un apaisement physique', 'Tu as une semaine d’expérience nouvelle'], tip: 'Regarde ce qui t’a aidé cette semaine et garde-le pour la suivante.', kind: 'Ton chemin ne se résume pas à un compteur.' },
    { day: 10, title: 'Ce qui s’apaise, ce qui prend du temps', text: 'Une partie de l’inconfort peut s’atténuer. Le sommeil, lui, met souvent plus longtemps à retrouver son équilibre.', feel: ['Nuits encore irrégulières', 'Rêves vifs', 'Baisse d’énergie passagère'], better: ['L’agitation peut être moins présente', 'Les journées peuvent sembler plus lisibles'], tip: 'Garde des horaires de coucher réguliers, même le week-end.', kind: 'De quoi aurais-tu besoin aujourd’hui ?' },
    { day: 14, title: 'Une clarté qui peut revenir', text: 'Certaines personnes remarquent des changements dans leur concentration ou leur énergie. Pour d’autres, cela prend plus longtemps. Pour beaucoup, la plupart des symptômes de sevrage s’atténuent au fil des deux premières semaines.', feel: ['Envies ponctuelles', 'Sommeil parfois encore perturbé'], better: ['Une pensée qui peut sembler plus nette', 'Plus d’énergie le matin, pour certaines personnes'], tip: 'Essaie une activité qui demande un peu d’attention : lire, cuisiner, apprendre.', kind: 'Tu n’as pas besoin d’aller plus vite que toi.' },
    { day: 21, title: 'Des habitudes qui se redessinent', text: 'Les anciennes habitudes laissent de la place. Les envies peuvent revenir surtout dans les situations associées à la consommation.', feel: ['Envies liées à des lieux, des personnes ou des heures'], better: ['De nouvelles routines qui commencent à tenir', 'Plus de temps pour ce qui compte pour toi'], tip: 'Prépare une alternative précise pour ton moment le plus sensible.', kind: 'Chaque petit pas compte.' },
    { day: 30, title: 'Un chemin qui se construit', text: 'Tu as peut-être développé de nouvelles façons de traverser les envies et de prendre soin de toi.', feel: ['Envies plus rares mais parfois fortes', 'Moments de nostalgie'], better: ['Des repères personnels solides', 'Des économies qui deviennent visibles'], tip: 'Relis tes raisons de départ. Ont-elles changé ?', kind: 'Ce que tu construis t’appartient.' },
    { day: 60, title: 'Une nouvelle normalité', text: 'La vie sans cannabis peut devenir plus familière. Une envie inattendue peut encore apparaître, dans un contexte précis. Cela ne remet pas en cause le chemin parcouru.', feel: ['Envies occasionnelles et contextuelles'], better: ['Une meilleure connaissance de toi', 'Des moments de calme plus fréquents, pour certaines personnes'], tip: 'Garde ton plan pour les moments difficiles à jour, même si tu t’en sers moins.', kind: 'Une envie n’efface rien.' },
    { day: 90, title: 'Regarder le chemin parcouru', text: 'Trois mois, c’est une période qui permet souvent de mesurer ce qui a changé, et ce qui demande encore de l’attention.', feel: ['Moments de fragilité possibles lors d’événements marquants'], better: ['Des habitudes ancrées', 'Une lumière plus large sur ton quotidien'], tip: 'Écris ce que tu dirais à la personne que tu étais au premier jour.', kind: 'Chaque jour, un peu plus de lumière.' },
];
const SOURCES = [
    'American Psychiatric Association, DSM-5 (2013) : critères du syndrome de sevrage du cannabis.',
    'Budney A.J., Hughes J.R., Moore B.A., Vandrey R. (2004). Review of the validity and significance of cannabis withdrawal syndrome. American Journal of Psychiatry, 161(11).',
    'Bonnet U., Preuss U.W. (2017). The cannabis withdrawal syndrome: current insights. Substance Abuse and Rehabilitation, 8.',
    'Drogues Info Service (France) : fiches d’information sur le cannabis — drogues-info-service.fr',
];
/* ---------- Bibliothèque ---------- */
const LIBRARY = [
    { q: 'Pourquoi le cannabis peut-il donner l’impression d’avoir l’esprit embrumé ?', a: 'Le THC agit sur des récepteurs du cerveau impliqués dans l’attention, la mémoire et la perception du temps. Pendant et après la consommation, penser vite ou rester concentré peut demander plus d’effort.', more: 'Chez les personnes qui consomment souvent, cette sensation peut durer au-delà de l’effet ressenti. Elle varie selon la quantité, la fréquence et la personne. Ce n’est pas systématique.', tip: 'Observe à quels moments ton esprit te semble le plus clair. C’est une information utile pour toi.' },
    { q: 'Le cannabis a-t-il un effet sur la mémoire ?', a: 'Il peut perturber la mémoire à court terme, surtout celle qui sert à retenir une information récente.', more: 'Les études suggèrent que ces effets sont plus marqués avec une consommation fréquente et qu’ils peuvent s’atténuer après l’arrêt. L’importance de cette récupération dépend des personnes et de l’historique de consommation.', tip: 'Pendant les premières semaines, une liste ou un carnet peut te soulager.' },
    { q: 'Cannabis et concentration : quel lien ?', a: 'Le cannabis peut rendre plus difficile le fait de rester attentif longtemps à une même tâche.', more: 'Après l’arrêt, la concentration peut d’abord sembler fragile, puis évoluer. Le sommeil joue un rôle important dans cette évolution.', tip: 'Travaille par petites périodes, avec de vraies pauses.' },
    { q: 'Pourquoi le sommeil change-t-il à l’arrêt ?', a: 'Le cannabis modifie l’architecture du sommeil. À l’arrêt, il est fréquent d’avoir du mal à s’endormir ou de faire des rêves très vifs.', more: 'Ces troubles font partie des symptômes de sevrage les plus souvent décrits. Ils peuvent durer plus longtemps que les autres, parfois plusieurs semaines. Si ton sommeil reste très difficile, parles-en à un professionnel de santé.', tip: 'Couche-toi et lève-toi à heure régulière, même après une mauvaise nuit.' },
    { q: 'Cannabis et anxiété : est-ce qu’il calme ou est-ce qu’il inquiète ?', a: 'Les deux sont possibles. Certaines personnes se sentent apaisées sur le moment, d’autres ressentent de l’anxiété ou de la méfiance.', more: 'Avec une consommation régulière, l’anxiété peut augmenter entre deux consommations. À l’arrêt, elle peut être plus présente pendant quelque temps. Si l’anxiété devient envahissante, un professionnel peut t’aider.', tip: 'Quand l’anxiété monte, ralentis ta respiration et allonge l’expiration.' },
    { q: 'Pourquoi les envies reviennent-elles ?', a: 'Ton cerveau a associé le cannabis à des moments, des lieux, des émotions. Quand ces repères se présentent, l’envie peut réapparaître.', more: 'Ces associations s’affaiblissent avec le temps, à mesure que tu vis ces situations autrement. Une envie qui revient ne signifie pas que tu recules.', tip: 'Note ce qui précède tes envies. Les déclencheurs deviennent plus faciles à anticiper.' },
    { q: 'Pourquoi les habitudes sont-elles si difficiles à changer ?', a: 'Une habitude est un raccourci : le cerveau la répète sans avoir besoin d’y réfléchir. La changer demande de l’attention, surtout au début.', more: 'Remplacer une habitude fonctionne souvent mieux que simplement la supprimer. Garder le même moment, mais avec une autre action, peut aider.', tip: 'Choisis une alternative précise pour ton moment le plus habituel.' },
    { q: 'Le cannabis peut-il influencer la motivation ?', a: 'Chez certaines personnes, une consommation régulière s’accompagne d’une baisse d’envie d’entreprendre. Ce n’est pas le cas de tout le monde.', more: 'Le lien est discuté par les chercheurs, et d’autres facteurs comptent aussi : le sommeil, l’humeur, le contexte de vie. Après l’arrêt, la motivation peut évoluer progressivement.', tip: 'Commence par de très petits objectifs, faciles à atteindre.' },
    { q: 'Que peut changer l’arrêt ?', a: 'Selon les personnes : le sommeil après une période d’ajustement, la clarté, l’énergie, le budget, les relations, le sentiment de liberté.', more: 'Ces changements ne sont ni garantis ni identiques pour tout le monde. Ils dépendent de ta consommation, de ta santé et de ta vie. Observer tes propres ressentis dans le journal t’aidera à voir ce qui change pour toi.', tip: 'Choisis une chose que tu aimerais retrouver, et observe-la.' },
    { q: 'Comment demander de l’aide ?', a: 'Tu peux en parler à ton médecin traitant, à un pharmacien ou à un service spécialisé en addictologie. Demander de l’aide n’a rien d’un échec.', more: 'Un professionnel peut t’accompagner sur le sommeil, l’anxiété ou les envies. Il existe aussi des lignes d’écoute et des consultations gratuites selon les pays. Une personne de confiance peut également t’épauler au quotidien.', tip: 'Prépare une phrase simple : « J’essaie d’arrêter le cannabis et j’aimerais un peu de soutien. »' },
];
/* ---------- État ---------- */
const initialState = () => ({
    version: 1, onboarded: false, path: 'prepare',
    profile: { duration: '', frequency: '', moments: [], wishes: [], wishNote: '' },
    quitDate: null, pastPeriods: [], lightBank: 0,
    savings: { amount: '', period: 'week', currency: 'EUR' },
    expenses: [], goal: null, prepSteps: DEFAULT_PREP, victories: [], journal: [], cravings: [], contacts: [],
    plan: { signs: '', helps: '', people: '', reasons: '' },
    history: [], settings: { reduceMotion: false }, dailyDone: null,
});
function normalize(raw) {
    const base = initialState();
    if (!raw || typeof raw !== 'object')
        return base;
    const s = Object.assign({}, base, raw);
    s.profile = Object.assign({}, base.profile, raw.profile || {});
    s.savings = Object.assign({}, base.savings, raw.savings || {});
    s.plan = Object.assign({}, base.plan, raw.plan || {});
    s.settings = Object.assign({}, base.settings, raw.settings || {});
    ['pastPeriods', 'expenses', 'prepSteps', 'victories', 'journal', 'cravings', 'contacts', 'history'].forEach(k => { s[k] = Array.isArray(s[k]) ? s[k].filter(x => x && typeof x === 'object') : base[k]; });
    const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!isDate(s.quitDate))
        s.quitDate = null;
    s.pastPeriods = s.pastPeriods.filter(p => isDate(p.start) && (p.end == null || isDate(p.end)));
    s.expenses = s.expenses.filter(e => isDate(e.date) && typeof e.amount === 'number' && e.amount > 0);
    s.journal = s.journal.filter(e => isDate(e.date)).map(e => ({ mood: null, energy: null, sleep: null, craving: null, note: '', ...e, id: e.id || uid() }));
    s.victories = s.victories.filter(v => isDate(v.date));
    s.prepSteps = s.prepSteps.filter(x => typeof x.label === 'string');
    s.contacts = s.contacts.filter(c => typeof c.name === 'string').map(c => ({ phone: '', note: '', ...c }));
    s.profile.moments = Array.isArray(s.profile.moments) ? s.profile.moments : [];
    s.profile.wishes = Array.isArray(s.profile.wishes) ? s.profile.wishes : [];
    s.lightBank = typeof s.lightBank === 'number' && s.lightBank >= 0 ? s.lightBank : 0;
    if (s.goal && (typeof s.goal !== 'object' || !s.goal.name))
        s.goal = null;
    if (!PATHS[s.path])
        s.path = 'prepare';
    return s;
}
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { state: initialState(), ok: true, restored: false };
        return { state: normalize(JSON.parse(raw)), ok: true, restored: true };
    }
    catch (e) {
        return { state: initialState(), ok: false, restored: false };
    }
}
/* ---------- Calculs dérivés ---------- */
function dailyRate(sv) {
    const a = parseAmount(sv.amount);
    if (a == null)
        return null;
    if (sv.period === 'day')
        return a;
    if (sv.period === 'week')
        return a / 7;
    return a * 12 / 365.2425;
}
function computeSavings(s, periods, today) {
    const rate = dailyRate(s.savings);
    const inPeriod = d => periods.some(p => d >= p.start && d <= (p.end || today));
    const trackedDays = periods.reduce((t, p) => t + Math.max(0, diffDays(p.start, p.end || today)), 0);
    const counted = s.expenses.filter(e => inPeriod(e.date));
    const deducted = counted.reduce((t, e) => t + e.amount, 0);
    if (rate == null)
        return { rate: null, trackedDays, deducted };
    const gross = trackedDays * rate;
    return { rate, trackedDays, gross, deducted, net: gross - deducted, p7: rate * 7, p30: rate * 30, p365: rate * 365, inPeriod };
}
function mergePeriods(list, today) {
    const ps = list.filter(p => p && p.start).map(p => ({ start: p.start, end: p.end || null })).sort((a, b) => a.start < b.start ? -1 : 1);
    const out = [];
    ps.forEach(p => {
        const last = out[out.length - 1];
        const pEnd = p.end || today;
        if (last && p.start <= (last.end || today))
            last.end = (last.end == null || p.end == null) ? null : (pEnd > last.end ? pEnd : last.end);
        else
            out.push({ ...p });
    });
    return out;
}
function derive(s, todayOverride) {
    const today = todayOverride || todayStr();
    const active = s.path !== 'reflect' && !!s.quitDate && diffDays(s.quitDate, today) >= 0;
    const days = active ? diffDays(s.quitDate, today) : 0;
    const upcoming = !!s.quitDate && !active ? diffDays(today, s.quitDate) : null;
    const periods = mergePeriods([...s.pastPeriods, ...(active ? [{ start: s.quitDate, end: null }] : [])], today);
    const doneSteps = s.prepSteps.filter(p => p.done).length;
    const lightDays = s.lightBank + days;
    let progress = 0.06 + Math.min(0.12, doneSteps * 0.017) + Math.min(0.04, s.victories.length * 0.004);
    if (lightDays > 0)
        progress = Math.max(progress, 0.16 + 0.84 * Math.min(1, Math.log(1 + lightDays) / Math.log(1 + 180)));
    const savings = computeSavings(s, periods, today);
    return { today, active, days, upcoming, periods, doneSteps, lightDays, progress: clamp(progress, 0.05, 1), savings };
}
function glowStage(p) {
    if (p < 0.15)
        return 'Une petite lueur délicate';
    if (p < 0.35)
        return 'Un halo qui s’élargit doucement';
    if (p < 0.55)
        return 'Une lumière plus présente';
    if (p < 0.8)
        return 'Une lumière chaleureuse et étendue';
    return 'Un halo ample et enveloppant';
}
/* ---------- Contexte ---------- */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
/* ---------- Icônes (fonctionnelles uniquement) ---------- */
const I = {
    home: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" })),
    path: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" },
        React.createElement("path", { d: "M5 20c0-4 3-5 7-6s7-2.5 7-6" }),
        React.createElement("circle", { cx: "19", cy: "5", r: "1.6" }),
        React.createElement("circle", { cx: "5", cy: "20", r: "1.2" })),
    tools: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" },
        React.createElement("rect", { x: "4", y: "4", width: "7", height: "7", rx: "2" }),
        React.createElement("rect", { x: "13", y: "4", width: "7", height: "7", rx: "2" }),
        React.createElement("rect", { x: "4", y: "13", width: "7", height: "7", rx: "2" }),
        React.createElement("rect", { x: "13", y: "13", width: "7", height: "7", rx: "2" })),
    support: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z" })),
    settings: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" },
        React.createElement("path", { d: "M4 7h10M18 7h2M4 17h2M10 17h10" }),
        React.createElement("circle", { cx: "16", cy: "7", r: "2" }),
        React.createElement("circle", { cx: "8", cy: "17", r: "2" })),
    back: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M15 5l-7 7 7 7" })),
    close: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" },
        React.createElement("path", { d: "M6 6l12 12M18 6 6 18" })),
    check: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "m5 12.5 4.5 4.5L19 7.5" })),
    arrow: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("path", { d: "M9 5l7 7-7 7" })),
};
const GOAL_ICONS = {
    voyage: { label: 'Voyage', svg: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" },
            React.createElement("path", { d: "M3 14l7-2 4-7a1.5 1.5 0 0 1 2.6 1.5L14 12l6 1v2l-6-.5-2 4.5h-2l.5-4.5L4 16z" })) },
    restaurant: { label: 'Restaurant', svg: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" },
            React.createElement("path", { d: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 21V3c-2 1.5-3 4-3 7h3" })) },
    cadeau: { label: 'Cadeau', svg: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" },
            React.createElement("rect", { x: "4", y: "9", width: "16", height: "11", rx: "1.5" }),
            React.createElement("path", { d: "M3 9h18M12 9v11M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9c2 0 5 0 5-1.5S13.5 6 12 9z" })) },
    plaisir: { label: 'Achat plaisir', svg: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" },
            React.createElement("path", { d: "M5 8h14l-1 12H6z" }),
            React.createElement("path", { d: "M9 8a3 3 0 0 1 6 0" })) },
    epargne: { label: 'Épargne', svg: React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" },
            React.createElement("rect", { x: "4", y: "6", width: "16", height: "13", rx: "2.5" }),
            React.createElement("path", { d: "M4 10h16M8 15h3" })) },
};
/* ---------- LueurGlow ---------- */
let glowSeq = 0;
function LueurGlow({ intensity = 1, size = 240, progress = 0.2, animated = true, className = '', breath = null, label }) {
    const app = useApp();
    const id = useMemo(() => 'lg' + (++glowSeq), []);
    const reduce = (app && app.state.settings.reduceMotion) || prefersReduced();
    const p = clamp(progress, 0, 1);
    const b = breath == null ? 1 : breath;
    const outerS = (0.40 + 0.60 * p) * (breath == null ? 1 : (0.82 + 0.3 * (b - 0.85)));
    const midS = (0.60 + 0.40 * p) * b;
    const coreS = (0.78 + 0.22 * p) * (breath == null ? 1 : 0.92 + 0.12 * (b - 0.85) / 0.4);
    const outerO = clamp((0.35 + 0.65 * p) * intensity, 0, 1);
    const midO = clamp((0.70 + 0.30 * p) * Math.min(intensity, 1.2), 0, 1);
    const bright = intensity > 1 ? 1 + (intensity - 1) * 0.6 : 1;
    return (React.createElement("div", { className: `lueur-glow ${animated && !reduce ? 'is-animated' : ''} ${className}`, style: { width: size, height: size, maxWidth: '100%' }, role: "img", "aria-label": label || `Lueur : ${glowStage(p).toLowerCase()}` },
        React.createElement("svg", { viewBox: "0 0 800 800", "aria-hidden": "true" },
            React.createElement("defs", null,
                React.createElement("radialGradient", { id: id + 'o' },
                    React.createElement("stop", { offset: "0", stopColor: "#FFF8E5", stopOpacity: ".65" }),
                    React.createElement("stop", { offset: ".22", stopColor: "#F5DCA6", stopOpacity: ".34" }),
                    React.createElement("stop", { offset: ".53", stopColor: "#E8C78A", stopOpacity: ".12" }),
                    React.createElement("stop", { offset: "1", stopColor: "#E8C78A", stopOpacity: "0" })),
                React.createElement("radialGradient", { id: id + 'm' },
                    React.createElement("stop", { offset: "0", stopColor: "#FFFDF3", stopOpacity: ".95" }),
                    React.createElement("stop", { offset: ".14", stopColor: "#FFF1D1", stopOpacity: ".7" }),
                    React.createElement("stop", { offset: ".48", stopColor: "#E8C78A", stopOpacity: ".19" }),
                    React.createElement("stop", { offset: "1", stopColor: "#E8C78A", stopOpacity: "0" })),
                React.createElement("radialGradient", { id: id + 'c' },
                    React.createElement("stop", { offset: "0", stopColor: "#FFFFFF" }),
                    React.createElement("stop", { offset: ".3", stopColor: "#FFFDF3", stopOpacity: ".97" }),
                    React.createElement("stop", { offset: ".72", stopColor: "#FFF2D2", stopOpacity: ".48" }),
                    React.createElement("stop", { offset: "1", stopColor: "#FFE3A9", stopOpacity: "0" }))),
            React.createElement("g", { className: "lg-wrap", style: { filter: bright > 1 ? `brightness(${bright})` : 'none' } },
                React.createElement("g", { className: "lg-breathe" },
                    React.createElement("ellipse", { className: "lg-layer", cx: "400", cy: "400", rx: "365", ry: "350", fill: `url(#${id}o)`, style: { transform: `scale(${outerS})`, opacity: outerO, transition: breath != null ? 'transform .25s linear, opacity 1s' : undefined } }),
                    React.createElement("ellipse", { className: "lg-layer", cx: "400", cy: "400", rx: "210", ry: "205", fill: `url(#${id}m)`, style: { transform: `scale(${midS})`, opacity: midO, transition: breath != null ? 'transform .25s linear, opacity 1s' : undefined } }),
                    React.createElement("circle", { className: "lg-layer", cx: "400", cy: "400", r: "76", fill: `url(#${id}c)`, style: { transform: `scale(${coreS})`, transition: breath != null ? 'transform .25s linear' : undefined } }),
                    React.createElement("circle", { cx: "400", cy: "400", r: "12", fill: "#FFFDF5", opacity: ".95" }))))));
}
/* ---------- Logo éclipse ---------- */
function Logo({ size = 36 }) {
    const id = useMemo(() => 'lo' + (++glowSeq), []);
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": "true", style: { flex: 'none' } },
        React.createElement("defs", null,
            React.createElement("radialGradient", { id: id + 'g', cx: "62%", cy: "50%", r: "50%" },
                React.createElement("stop", { offset: "0", stopColor: "#E8C78A", stopOpacity: ".55" }),
                React.createElement("stop", { offset: "1", stopColor: "#E8C78A", stopOpacity: "0" })),
            React.createElement("filter", { id: id + 'b', x: "-50%", y: "-50%", width: "200%", height: "200%" },
                React.createElement("feGaussianBlur", { stdDeviation: "2.2" })),
            React.createElement("radialGradient", { id: id + 'd', cx: "40%", cy: "40%", r: "70%" },
                React.createElement("stop", { offset: "0", stopColor: "#1F3329" }),
                React.createElement("stop", { offset: "1", stopColor: "#14231C" }))),
        React.createElement("rect", { width: "64", height: "64", rx: "15", fill: "#243E32" }),
        React.createElement("circle", { cx: "34", cy: "32", r: "21", fill: `url(#${id}g)` }),
        React.createElement("circle", { cx: "33.6", cy: "32", r: "14.6", fill: "#E8C78A", filter: `url(#${id}b)`, opacity: ".9" }),
        React.createElement("circle", { cx: "33.6", cy: "32", r: "14", fill: "#F2DBA8" }),
        React.createElement("circle", { cx: "31.4", cy: "32", r: "14", fill: `url(#${id}d)` })));
}
function Wordmark({ light = false, size = 30 }) {
    return React.createElement("span", { className: "serif", style: { fontSize: size, fontWeight: 500, letterSpacing: '-.01em', color: light ? 'var(--warm)' : 'var(--forest)', lineHeight: 1 } },
        "lueur",
        React.createElement("span", { style: { color: 'var(--champagne)' } }, "."));
}
/* ---------- Petits composants ---------- */
function Chip({ on, onClick, children, dark }) {
    return React.createElement("button", { type: "button", className: `chip ${dark ? 'chip-dark' : ''} ${on ? 'on' : ''}`, "aria-pressed": !!on, onClick: onClick },
        on && React.createElement("span", { "aria-hidden": "true", style: { width: 14, height: 14, display: 'inline-flex' } }, I.check),
        children);
}
function ChipsMulti({ options, value, onChange, dark }) {
    const toggle = o => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
    return React.createElement("div", { className: "chips" }, options.map(o => React.createElement(Chip, { key: o, dark: dark, on: value.includes(o), onClick: () => toggle(o) }, o)));
}
function ChipsSingle({ options, value, onChange, dark }) {
    return React.createElement("div", { className: "chips" }, options.map(o => React.createElement(Chip, { key: o, dark: dark, on: value === o, onClick: () => onChange(value === o ? '' : o) }, o)));
}
function Rating({ label, value, onChange, labels }) {
    return (React.createElement("div", { className: "field" },
        React.createElement("div", { className: "row" },
            React.createElement("span", { className: "label" }, label),
            React.createElement("span", { className: "small", style: { color: 'var(--forest)', fontWeight: 500 } }, value ? labels[value - 1] : 'Non renseigné')),
        React.createElement("div", { className: "seg", role: "group", "aria-label": label }, [1, 2, 3, 4, 5].map(n => React.createElement("button", { key: n, type: "button", "aria-pressed": value === n, "aria-label": `${n} — ${labels[n - 1]}`, onClick: () => onChange(value === n ? null : n) }, n)))));
}
function SubHeader({ title, onBack, right }) {
    return (React.createElement("div", { className: "topbar" },
        React.createElement("button", { className: "iconbtn", onClick: onBack, "aria-label": "Retour" }, I.back),
        React.createElement("h1", { style: { fontSize: 26, flex: 1, minWidth: 0 } }, title),
        right || React.createElement("span", { style: { width: 44 } })));
}
function ConfirmInline({ text, confirmLabel = 'Supprimer', onConfirm, onCancel }) {
    return (React.createElement("div", { className: "card-flat", role: "alertdialog", "aria-label": text, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement("p", { className: "small" }, text),
        React.createElement("div", { className: "flex gap-2 flex-wrap" },
            React.createElement("button", { className: "btn btn-danger", onClick: onConfirm }, confirmLabel),
            React.createElement("button", { className: "btn btn-ghost", onClick: onCancel }, "Annuler"))));
}
function Empty({ title, text, action }) {
    return React.createElement("div", { className: "card-flat", style: { textAlign: 'center', padding: 24, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' } },
        React.createElement("p", { className: "serif", style: { fontSize: 21, color: 'var(--forest)' } }, title),
        React.createElement("p", { className: "small muted", style: { maxWidth: 300 } }, text),
        action);
}
/* ---------- Onboarding ---------- */
function Onboarding({ onDone, initial }) {
    const [step, setStep] = useState(0);
    const [path, setPath] = useState((initial === null || initial === void 0 ? void 0 : initial.path) || 'prepare');
    const [profile, setProfile] = useState((initial === null || initial === void 0 ? void 0 : initial.profile) || initialState().profile);
    const [quitDate, setQuitDate] = useState('');
    const [sv, setSv] = useState({ amount: '', period: 'week', currency: 'EUR' });
    const today = todayStr();
    const questions = useMemo(() => {
        const q = ['duration', 'frequency', 'moments', 'wishes'];
        if (path === 'prepare' || path === 'resumed' || path === 'stopped')
            q.push('date');
        q.push('spend');
        return q;
    }, [path]);
    const total = 2 + questions.length;
    const qKey = step >= 2 ? questions[step - 2] : null;
    const next = () => step + 1 < total ? setStep(step + 1) : finish();
    const skip = () => {
        if (qKey === 'date')
            setQuitDate('');
        if (qKey === 'spend')
            setSv({ amount: '', period: 'week', currency: 'EUR' });
        step + 1 < total ? setStep(step + 1) : finish(true);
    };
    const finish = (skippedSpend) => onDone({ path, profile, quitDate: quitDate || null, savings: skippedSpend ? { amount: '', period: 'week', currency: 'EUR' } : sv });
    const P = (k, v) => setProfile(Object.assign({}, profile, { [k]: v }));
    const tense = path === 'stopped' || path === 'resumed' ? 'dépensais' : 'dépenses';
    return (React.createElement("div", { className: "overlay", style: { position: 'fixed' } },
        React.createElement("div", { className: "overlay-inner" },
            step > 0 && (React.createElement("div", { className: "row" },
                React.createElement("button", { className: "iconbtn iconbtn-light", onClick: () => setStep(step - 1), "aria-label": "\u00C9tape pr\u00E9c\u00E9dente" }, I.back),
                React.createElement("div", { style: { flex: 1, maxWidth: 200 }, "aria-label": `Étape ${step} sur ${total - 1}` },
                    React.createElement("div", { className: "progressbar progressbar-dark" },
                        React.createElement("span", { style: { width: `${(step / (total - 1)) * 100}%` } }))),
                React.createElement("span", { style: { width: 44 } }))),
            step === 0 && (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, paddingTop: 18, flex: 1 } },
                React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement(Logo, { size: 34 }),
                    React.createElement(Wordmark, { light: true, size: 30 })),
                React.createElement(LueurGlow, { size: 260, progress: 0.1 }),
                React.createElement("h1", { style: { fontSize: 38, lineHeight: 1.1 } }, "Bienvenue dans Lueur."),
                React.createElement("p", { className: "serif", style: { fontSize: 22, fontStyle: 'italic', color: 'rgba(255,252,246,.85)', maxWidth: 320, lineHeight: 1.35 } }, "\u00AB Peu importe o\u00F9 tu en es aujourd\u2019hui. On avance \u00E0 ton rythme. \u00BB"),
                React.createElement("div", { style: { flex: 1 } }),
                React.createElement("button", { className: "btn btn-gold btn-block", onClick: () => setStep(1) }, "Commencer"),
                React.createElement("p", { className: "small on-dark-muted" }, "Tes r\u00E9ponses restent sur cet appareil."))),
            step === 1 && (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', gap: 16 } },
                React.createElement("div", { style: { display: 'flex', justifyContent: 'center' } },
                    React.createElement(LueurGlow, { size: 140, progress: 0.08 })),
                React.createElement("h2", { style: { fontSize: 32 } }, "O\u00F9 en es-tu actuellement ?"),
                React.createElement("div", { role: "radiogroup", "aria-label": "Ton parcours", style: { display: 'flex', flexDirection: 'column', gap: 10 } }, ['reflect', 'prepare', 'stopped', 'resumed'].map(k => (React.createElement("button", { key: k, type: "button", role: "radio", "aria-checked": path === k, className: `option ${path === k ? 'on' : ''}`, onClick: () => setPath(k) },
                    React.createElement("span", { className: "radio", "aria-hidden": "true" }),
                    React.createElement("span", null,
                        React.createElement("span", { style: { display: 'block', fontWeight: 500 } }, PATHS[k].label),
                        React.createElement("span", { className: "small on-dark-muted" }, PATHS[k].hint)))))),
                React.createElement("button", { className: "btn btn-gold btn-block", onClick: next }, "Continuer"))),
            qKey && (React.createElement("div", { className: "fade-in", key: qKey, style: { display: 'flex', flexDirection: 'column', gap: 18, flex: 1 } },
                React.createElement("p", { className: "eyebrow", style: { color: 'rgba(255,252,246,.6)' } }, "Question facultative"),
                qKey === 'duration' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } },
                        "Depuis combien de temps consommes-tu",
                        path === 'stopped' ? ', ou consommais-tu' : '',
                        " ?"),
                    React.createElement(ChipsSingle, { dark: true, options: DURATIONS, value: profile.duration, onChange: v => P('duration', v) })),
                qKey === 'frequency' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } }, "\u00C0 quelle fr\u00E9quence ?"),
                    React.createElement(ChipsSingle, { dark: true, options: FREQUENCIES, value: profile.frequency, onChange: v => P('frequency', v) })),
                qKey === 'moments' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } }, "\u00C0 quels moments consommes-tu le plus souvent ?"),
                    React.createElement("p", { className: "small on-dark-muted" }, "Plusieurs r\u00E9ponses possibles."),
                    React.createElement(ChipsMulti, { dark: true, options: MOMENTS, value: profile.moments, onChange: v => P('moments', v) })),
                qKey === 'wishes' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } }, "Qu\u2019aimerais-tu retrouver ou changer ?"),
                    React.createElement(ChipsMulti, { dark: true, options: WISHES, value: profile.wishes, onChange: v => P('wishes', v) }),
                    React.createElement("div", { className: "field" },
                        React.createElement("label", { htmlFor: "ob-wish" }, "Avec tes mots, si tu veux"),
                        React.createElement("input", { id: "ob-wish", className: "input", value: profile.wishNote, onChange: e => P('wishNote', e.target.value), placeholder: "Par exemple : \u00EAtre plus pr\u00E9sent\u00B7e le soir" }))),
                qKey === 'date' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } }, path === 'stopped' ? 'Depuis quand as-tu arrêté ?' : 'Souhaites-tu choisir une date d’arrêt ?'),
                    React.createElement("p", { className: "small on-dark-muted" }, path === 'stopped' ? 'Cette date sert à compter les jours et à estimer tes économies.' : 'Rien ne t’y oblige. Tu pourras la choisir ou la changer plus tard.'),
                    React.createElement("div", { className: "field" },
                        React.createElement("label", { htmlFor: "ob-date" }, "Date"),
                        React.createElement("input", { id: "ob-date", type: "date", className: "input", value: quitDate, max: path === 'stopped' ? today : undefined, onChange: e => setQuitDate(e.target.value) }))),
                qKey === 'spend' && React.createElement(React.Fragment, null,
                    React.createElement("h2", { style: { fontSize: 30 } },
                        "Combien ",
                        tense,
                        "-tu habituellement en cannabis ?"),
                    React.createElement("p", { className: "small on-dark-muted" }, "Pour estimer tes \u00E9conomies. Tu peux le renseigner plus tard."),
                    React.createElement(SpendFields, { sv: sv, setSv: setSv, prefix: "ob" })),
                React.createElement("div", { style: { flex: 1 } }),
                React.createElement("button", { className: "btn btn-gold btn-block", onClick: next }, step + 1 < total ? 'Continuer' : 'Entrer dans Lueur'),
                React.createElement("button", { className: "btn btn-text", style: { color: 'rgba(255,252,246,.75)' }, onClick: skip }, "Passer cette question"))))));
}
function SpendFields({ sv, setSv, prefix }) {
    return (React.createElement("div", { style: { display: 'grid', gap: 12 } },
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: prefix + '-amount' }, "Montant"),
            React.createElement("input", { id: prefix + '-amount', className: "input tnum", inputMode: "decimal", placeholder: "Par exemple : 50", value: sv.amount, onChange: e => setSv(Object.assign({}, sv, { amount: e.target.value })) })),
        React.createElement("div", { className: "field" },
            React.createElement("span", { className: "label" }, "Fr\u00E9quence"),
            React.createElement("div", { className: "chips" }, [['day', 'Par jour'], ['week', 'Par semaine'], ['month', 'Par mois']].map(([k, l]) => React.createElement(Chip, { key: k, dark: prefix === 'ob', on: sv.period === k, onClick: () => setSv(Object.assign({}, sv, { period: k })) }, l)))),
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: prefix + '-cur' }, "Devise"),
            React.createElement("select", { id: prefix + '-cur', className: "input", value: sv.currency, onChange: e => setSv(Object.assign({}, sv, { currency: e.target.value })) }, CURRENCIES.map(([c, l]) => React.createElement("option", { key: c, value: c, style: { color: '#1F3329' } }, l)))),
        sv.amount !== '' && parseAmount(sv.amount) == null && React.createElement("p", { className: "small", role: "alert", style: { color: prefix === 'ob' ? 'var(--champagne)' : '#8A3B2E' } }, "Indique un montant positif, par exemple 50 ou 12,50.")));
}
/* ---------- Navigation ---------- */
function BottomNavigation({ tab, setTab }) {
    const items = [['home', 'Accueil', I.home], ['progress', 'Mon parcours', I.path], ['tools', 'Outils', I.tools], ['support', 'Soutien', I.support]];
    return (React.createElement("nav", { className: "nav", "aria-label": "Navigation principale" },
        React.createElement("div", { className: "nav-inner" }, items.map(([k, l, ic]) => React.createElement("button", { key: k, "aria-current": tab === k ? 'page' : undefined, onClick: () => setTab(k) },
            ic,
            React.createElement("span", null, l))))));
}
/* ---------- Accueil ---------- */
function HomeScreen() {
    const { state, d, update, go, openCraving, bloom, toast, storageOk } = useApp();
    const dailyIdx = (toUTC(d.today) / 86400000) % DAILY_ACTIONS.length;
    const daily = DAILY_ACTIONS[dailyIdx];
    const dailyDone = state.dailyDone === d.today;
    const reasons = [...state.profile.wishes, ...(state.profile.wishNote ? [state.profile.wishNote] : [])];
    let title, quote;
    if (d.active) {
        title = d.days === 0 ? 'Ton premier jour.' : `${plural(d.days, 'jour', 'jours')} sur ton chemin.`;
        quote = d.days === 0 ? 'Tu peux prendre ton temps.' : 'Ton chemin ne se résume pas à un compteur.';
    }
    else if (state.path === 'reflect') {
        title = 'Tu prends le temps de réfléchir.';
        quote = 'Observer, c’est déjà avancer.';
    }
    else if (state.path === 'resumed' && !state.quitDate) {
        title = 'Tu reprends ton chemin.';
        quote = 'Une reprise n’efface pas ce que tu as appris.';
    }
    else if (state.path === 'stopped' && !state.quitDate) {
        title = 'Ton chemin continue.';
        quote = 'Tu peux prendre ton temps.';
    }
    else {
        title = 'Tu prépares ton chemin.';
        quote = 'Chaque petit pas compte.';
    }
    return (React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "topbar" },
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement(Logo, { size: 36 }),
                React.createElement(Wordmark, { size: 28 })),
            React.createElement("button", { className: "iconbtn", onClick: () => go('settings'), "aria-label": "Param\u00E8tres" }, I.settings)),
        !storageOk && React.createElement("p", { className: "card-flat small", role: "status", style: { borderColor: 'rgba(138,59,46,.3)' } }, "La sauvegarde n\u2019est pas disponible ici : tes donn\u00E9es seront perdues en fermant la page. Tu peux les exporter dans les param\u00E8tres."),
        React.createElement("section", { className: "hero", "aria-label": "Ta lueur" },
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '18px 20px 26px', gap: 6 } },
                React.createElement("p", { className: "eyebrow", style: { color: 'rgba(255,252,246,.55)' } }, "Chaque jour, un peu plus de lumi\u00E8re"),
                React.createElement(LueurGlow, { size: 250, progress: d.progress, intensity: bloom ? 1.35 : 1 }),
                React.createElement("h2", { style: { fontSize: 31, lineHeight: 1.15, marginTop: -6 } }, title),
                React.createElement("p", { className: "serif", style: { fontSize: 19, fontStyle: 'italic', color: 'rgba(255,252,246,.78)' } },
                    "\u00AB ",
                    quote,
                    " \u00BB"),
                d.active && React.createElement("p", { className: "small on-dark-muted", style: { marginTop: 4 } },
                    "Depuis le ",
                    fmtDate(state.quitDate)))),
        React.createElement("button", { className: "btn btn-gold btn-block", style: { minHeight: 58, fontSize: 17 }, onClick: openCraving }, "J\u2019ai une envie maintenant"),
        React.createElement("section", { className: "card", "aria-label": "Ma progression", style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            React.createElement("div", { className: "row" },
                React.createElement("p", { className: "eyebrow" }, "Ma progression"),
                React.createElement("button", { className: "btn-text small", onClick: () => go('tab:progress') }, "Mon parcours")),
            d.active ? (React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
                React.createElement("div", null,
                    React.createElement("p", { className: "serif tnum", style: { fontSize: 40, lineHeight: 1, color: 'var(--forest)' } }, d.days),
                    React.createElement("p", { className: "small muted" }, d.days > 1 ? 'jours écoulés' : 'jour écoulé')),
                React.createElement("div", null, d.savings.rate != null ? React.createElement(React.Fragment, null,
                    React.createElement("p", { className: "serif tnum", style: { fontSize: 30, lineHeight: 1.15, color: 'var(--forest)' } }, fmtMoney(Math.max(0, d.savings.net), state.savings.currency)),
                    React.createElement("p", { className: "small muted" }, "\u00E9conomies nettes estim\u00E9es")) : React.createElement("button", { className: "btn-text small", style: { textAlign: 'left' }, onClick: () => go('savings') }, "Renseigner tes d\u00E9penses pour estimer tes \u00E9conomies")))) : (React.createElement(React.Fragment, null,
                state.path !== 'reflect' && React.createElement("div", { className: "row" },
                    React.createElement("span", { className: "small" }, state.quitDate ? `Date d’arrêt : ${fmtDate(state.quitDate)}` : 'Pas de date choisie, et c’est très bien ainsi.'),
                    d.upcoming != null && React.createElement("span", { className: "badge badge-gold tnum" },
                        "dans ",
                        plural(d.upcoming, 'jour', 'jours'))),
                React.createElement("div", null,
                    React.createElement("div", { className: "row small", style: { marginBottom: 6 } },
                        React.createElement("span", null, "\u00C9tapes de pr\u00E9paration"),
                        React.createElement("span", { className: "tnum muted" },
                            d.doneSteps,
                            " / ",
                            state.prepSteps.length)),
                    React.createElement("div", { className: "progressbar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": state.prepSteps.length, "aria-valuenow": d.doneSteps },
                        React.createElement("span", { style: { width: `${state.prepSteps.length ? d.doneSteps / state.prepSteps.length * 100 : 0}%` } }))),
                reasons.length > 0 && React.createElement("div", null,
                    React.createElement("p", { className: "label", style: { marginBottom: 6 } }, "Mes motivations"),
                    React.createElement("div", { className: "chips" }, reasons.slice(0, 5).map(r => React.createElement("span", { key: r, className: "badge" }, r)))),
                state.path === 'stopped' && !state.quitDate && React.createElement("button", { className: "btn btn-primary", onClick: () => go('settings') }, "Indiquer depuis quand j\u2019ai arr\u00EAt\u00E9"),
                state.path !== 'reflect' && React.createElement("button", { className: "btn btn-ghost", onClick: () => { update(s => ({ ...s, quitDate: d.today, path: s.path === 'reflect' ? 'prepare' : s.path, history: [...s.history, { id: uid(), date: d.today, type: 'start', note: 'Début de l’arrêt' }] })); toast('Ton chemin commence aujourd’hui.'); } }, "J\u2019ai commenc\u00E9 mon arr\u00EAt aujourd\u2019hui"),
                state.path === 'reflect' && React.createElement("button", { className: "btn btn-ghost", onClick: () => { update(s => ({ ...s, path: 'prepare', history: [...s.history, { id: uid(), date: d.today, type: 'path', note: 'Passage en préparation' }] })); toast('Tu passes en préparation, à ton rythme.'); } }, "J\u2019aimerais pr\u00E9parer un arr\u00EAt")))),
        React.createElement("section", { className: "card", "aria-label": "Action du jour", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("p", { className: "eyebrow" }, "Une action pour aujourd\u2019hui"),
            React.createElement("p", { className: "serif", style: { fontSize: 23, lineHeight: 1.25, color: 'var(--forest)' } }, daily),
            dailyDone
                ? React.createElement("p", { className: "small", style: { color: 'var(--moss)', display: 'flex', gap: 6, alignItems: 'center' } },
                    React.createElement("span", { style: { width: 18, height: 18, display: 'inline-flex' } }, I.check),
                    "Fait aujourd\u2019hui")
                : React.createElement("button", { className: "btn btn-primary", style: { alignSelf: 'flex-start' }, onClick: () => { update(s => ({ ...s, dailyDone: d.today })); toast('Noté. Chaque petit pas compte.'); } }, "C\u2019est fait")),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            React.createElement("button", { className: "card", style: { textAlign: 'left', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }, onClick: () => go('journal') },
                React.createElement("span", { className: "eyebrow" }, "Journal"),
                React.createElement("span", { className: "serif", style: { fontSize: 21, lineHeight: 1.2, color: 'var(--forest)' } }, "Comment te sens-tu ?"),
                React.createElement("span", { className: "small muted" }, state.journal.length ? plural(state.journal.length, 'entrée', 'entrées') : 'Première entrée')),
            React.createElement("button", { className: "card", style: { textAlign: 'left', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }, onClick: () => go('timeline') },
                React.createElement("span", { className: "eyebrow" }, "Rep\u00E8res"),
                React.createElement("span", { className: "serif", style: { fontSize: 21, lineHeight: 1.2, color: 'var(--forest)' } }, "Ce qui change en moi"),
                React.createElement("span", { className: "small muted" }, d.active ? `Jour ${d.days + 1}` : 'Les étapes possibles')))));
}
/* ---------- Aide immédiate ---------- */
function CravingSupport({ onClose }) {
    const { state, update, go, toast, celebrate } = useApp();
    const [view, setView] = useState('menu');
    const ref = useRef(null);
    const closeRef = useRef(null);
    useEffect(() => { if (ref.current)
        ref.current.scrollTop = 0; }, [view]);
    useEffect(() => { if (closeRef.current)
        closeRef.current.focus({ preventScroll: true }); }, []);
    useEffect(() => { const onKey = e => { if (e.key === 'Escape')
        onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
    const headerTitle = { menu: '', breathe: 'Respirer avec la lueur', activity: 'Changer d’activité', understand: 'Comprendre mon envie', support: 'Trouver du soutien' }[view];
    return (React.createElement("div", { className: "overlay", ref: ref, role: "dialog", "aria-modal": "true", "aria-label": "Aide imm\u00E9diate" },
        React.createElement("div", { className: "overlay-inner" },
            React.createElement("div", { className: "row" },
                view !== 'menu' ? React.createElement("button", { className: "iconbtn iconbtn-light", onClick: () => setView('menu'), "aria-label": "Retour aux options" }, I.back) : React.createElement("span", { style: { width: 44 } }),
                React.createElement("span", { className: "serif", style: { fontSize: 19, color: 'rgba(255,252,246,.85)' } }, headerTitle),
                React.createElement("button", { ref: closeRef, className: "iconbtn iconbtn-light", onClick: onClose, "aria-label": "Fermer l\u2019aide imm\u00E9diate" }, I.close)),
            view === 'menu' && (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', gap: 18 } },
                React.createElement("div", { style: { display: 'flex', justifyContent: 'center' } },
                    React.createElement(LueurGlow, { size: 190, progress: 0.3 })),
                React.createElement("h1", { style: { fontSize: 30, lineHeight: 1.2, textAlign: 'center' } }, "Une envie vient de se pr\u00E9senter."),
                React.createElement("p", { style: { textAlign: 'center', color: 'rgba(255,252,246,.8)' } }, "Tu peux prendre quelques minutes pour toi. Une envie monte, puis elle redescend."),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } }, [['breathe', 'Respirer avec la lueur', 'Deux minutes guidées'], ['activity', 'Changer d’activité', 'Bouger, boire, sortir'], ['understand', 'Comprendre mon envie', 'Noter ce qui se passe'], ['support', 'Trouver du soutien', 'Tes contacts, des conseils']].map(([k, t, s]) => (React.createElement("button", { key: k, className: "tile", onClick: () => setView(k) },
                    React.createElement("span", { className: "serif", style: { fontSize: 20, lineHeight: 1.2 } }, t),
                    React.createElement("span", { className: "small on-dark-muted" }, s))))),
                React.createElement("div", { style: { borderTop: '1px solid rgba(255,252,246,.14)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 } },
                    React.createElement("p", { className: "small on-dark-muted", style: { textAlign: 'center' } }, "L\u2019envie est pass\u00E9e ?"),
                    React.createElement("button", { className: "btn btn-ghost-light", onClick: () => { celebrate('craving'); toast('Petite victoire enregistrée : tu as traversé une envie.'); onClose(); } }, "J\u2019ai travers\u00E9 cette envie")))),
            view === 'breathe' && React.createElement(Breathing, null),
            view === 'activity' && React.createElement(ActivitySwitch, { onVictory: () => { celebrate('care'); toast('Petite victoire enregistrée.'); onClose(); } }),
            view === 'understand' && React.createElement(UnderstandCraving, { onSaved: () => setView('menu') }),
            view === 'support' && React.createElement(CravingContacts, { onManage: () => { onClose(); go('tab:support'); } }))));
}
function Breathing() {
    const { state } = useApp();
    const TOTAL = 120000, IN = 4000, OUT = 6000, CYCLE = IN + OUT;
    const [status, setStatus] = useState('idle');
    const [elapsed, setElapsed] = useState(0);
    const last = useRef(null);
    useEffect(() => {
        if (status !== 'running') {
            last.current = null;
            return;
        }
        let raf;
        const tick = t => {
            if (last.current == null)
                last.current = t;
            const dt = Math.min(t - last.current, 250);
            last.current = t;
            setElapsed(e => { const n = e + dt; if (n >= TOTAL) {
                setStatus('done');
                return TOTAL;
            } return n; });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [status]);
    const reduce = state.settings.reduceMotion || prefersReduced();
    const inCycle = elapsed % CYCLE;
    const inhale = inCycle < IN;
    const ease = x => 0.5 - Math.cos(Math.PI * x) / 2;
    let breath = 0.85;
    if (status === 'running' || status === 'paused')
        breath = inhale ? 0.85 + 0.4 * ease(inCycle / IN) : 1.25 - 0.4 * ease((inCycle - IN) / OUT);
    const remaining = Math.ceil((TOTAL - elapsed) / 1000);
    const phaseLeft = Math.ceil(inhale ? (IN - inCycle) / 1000 : (CYCLE - inCycle) / 1000);
    const stop = () => { setStatus('idle'); setElapsed(0); };
    return (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' } },
        React.createElement("p", { style: { color: 'rgba(255,252,246,.8)', maxWidth: 340 } }, "Inspire pendant que la lumi\u00E8re grandit, expire pendant qu\u2019elle diminue. Aucune pause \u00E0 tenir : laisse simplement le souffle aller."),
        React.createElement("div", { style: { position: 'relative', width: 270, height: 270, display: 'grid', placeItems: 'center' } },
            React.createElement(LueurGlow, { size: 270, progress: 0.55, animated: false, breath: reduce ? 1 : breath, intensity: reduce ? (status === 'running' ? (inhale ? 1.1 : 0.85) : 1) : 1, label: "Lueur qui guide ta respiration" })),
        React.createElement("div", { "aria-live": "polite", style: { minHeight: 64 } },
            status === 'idle' && React.createElement("p", { className: "serif", style: { fontSize: 26 } }, "Deux minutes pour toi"),
            (status === 'running' || status === 'paused') && React.createElement(React.Fragment, null,
                React.createElement("p", { className: "serif", style: { fontSize: 30 } }, status === 'paused' ? 'En pause' : inhale ? 'Inspire doucement' : 'Expire lentement'),
                React.createElement("p", { className: "small on-dark-muted tnum" },
                    status === 'running' ? `${phaseLeft} s · ` : '',
                    "reste ",
                    Math.floor(remaining / 60),
                    ":",
                    pad(remaining % 60))),
            status === 'done' && React.createElement(React.Fragment, null,
                React.createElement("p", { className: "serif", style: { fontSize: 28 } }, "C\u2019est termin\u00E9."),
                React.createElement("p", { className: "small on-dark-muted" }, "Prends un instant pour sentir comment tu vas maintenant."))),
        React.createElement("div", { className: "flex gap-2 flex-wrap justify-center" },
            status === 'idle' && React.createElement("button", { className: "btn btn-gold", onClick: () => { setElapsed(0); setStatus('running'); } }, "D\u00E9marrer"),
            status === 'running' && React.createElement("button", { className: "btn btn-gold", onClick: () => setStatus('paused') }, "Pause"),
            status === 'paused' && React.createElement("button", { className: "btn btn-gold", onClick: () => setStatus('running') }, "Reprendre"),
            (status === 'running' || status === 'paused') && React.createElement("button", { className: "btn btn-ghost-light", onClick: stop }, "Arr\u00EAter"),
            status === 'done' && React.createElement("button", { className: "btn btn-ghost-light", onClick: () => { setElapsed(0); setStatus('running'); } }, "Recommencer"))));
}
function ActivitySwitch({ onVictory }) {
    const items = ['Boire un grand verre d’eau', 'Marcher quelques minutes', 'Changer de pièce', 'Écouter une musique que j’aime', 'Contacter une personne de confiance'];
    const [done, setDone] = useState([]);
    return (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        React.createElement("p", { style: { color: 'rgba(255,252,246,.8)' } }, "Changer de geste ou de lieu aide souvent l\u2019envie \u00E0 redescendre. Choisis ce qui te semble faisable maintenant."),
        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, items.map(it => {
            const on = done.includes(it);
            return (React.createElement("button", { key: it, className: `option ${on ? 'on' : ''}`, "aria-pressed": on, onClick: () => setDone(on ? done.filter(x => x !== it) : [...done, it]) },
                React.createElement("span", { className: "check", style: { background: on ? 'var(--champagne)' : 'transparent', borderColor: on ? 'var(--champagne)' : 'rgba(255,252,246,.4)', color: 'var(--forest-deep)' } }, on && I.check),
                React.createElement("span", null,
                    it,
                    on && React.createElement("span", { className: "small on-dark-muted" }, " \u00B7 fait"))));
        })),
        done.length > 0 && React.createElement("button", { className: "btn btn-gold", onClick: onVictory }, "\u00C7a m\u2019a fait du bien, je le note")));
}
function UnderstandCraving({ onSaved }) {
    const { update, toast, d } = useApp();
    const [f, setF] = useState({ emotion: '', trigger: '', place: '', intensity: 5, toJournal: true });
    const save = () => {
        const entry = { id: uid(), date: d.today, time: new Date().toTimeString().slice(0, 5), emotion: f.emotion, trigger: f.trigger, place: f.place.trim(), intensity: Number(f.intensity) };
        update(s => {
            const n = { ...s, cravings: [entry, ...s.cravings] };
            if (f.toJournal) {
                const note = ['Envie', f.emotion && `émotion : ${f.emotion.toLowerCase()}`, f.trigger && `déclencheur : ${f.trigger.toLowerCase()}`, entry.place && `lieu : ${entry.place}`].filter(Boolean).join(' · ');
                n.journal = [{ id: uid(), date: d.today, mood: null, energy: null, sleep: null, craving: entry.intensity, note }, ...s.journal];
            }
            return n;
        });
        toast(f.toJournal ? 'Enregistré, et ajouté à ton journal.' : 'Enregistré.');
        onSaved();
    };
    return (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        React.createElement("p", { style: { color: 'rgba(255,252,246,.8)' } }, "Mettre des mots sur une envie aide \u00E0 la regarder de l\u2019ext\u00E9rieur. Tout est facultatif."),
        React.createElement("div", { className: "field" },
            React.createElement("span", { className: "label", style: { color: 'rgba(255,252,246,.7)' } }, "Ce que je ressens"),
            React.createElement(ChipsSingle, { dark: true, options: EMOTIONS, value: f.emotion, onChange: v => setF({ ...f, emotion: v }) })),
        React.createElement("div", { className: "field" },
            React.createElement("span", { className: "label", style: { color: 'rgba(255,252,246,.7)' } }, "Ce qui l\u2019a d\u00E9clench\u00E9e"),
            React.createElement(ChipsSingle, { dark: true, options: TRIGGERS, value: f.trigger, onChange: v => setF({ ...f, trigger: v }) })),
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: "cr-place" }, "Lieu ou situation"),
            React.createElement("input", { id: "cr-place", className: "input", value: f.place, onChange: e => setF({ ...f, place: e.target.value }), placeholder: "Par exemple : sur le balcon apr\u00E8s le travail" })),
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: "cr-int" },
                "Intensit\u00E9 de l\u2019envie : ",
                React.createElement("b", { className: "tnum", style: { color: 'var(--champagne)' } },
                    f.intensity,
                    " / 10")),
            React.createElement("input", { id: "cr-int", type: "range", min: "0", max: "10", value: f.intensity, onChange: e => setF({ ...f, intensity: e.target.value }) })),
        React.createElement("label", { className: "flex items-center gap-3", style: { minHeight: 44 } },
            React.createElement("input", { type: "checkbox", checked: f.toJournal, onChange: e => setF({ ...f, toJournal: e.target.checked }), style: { width: 20, height: 20, accentColor: 'var(--champagne)' } }),
            "Ajouter aussi \u00E0 mon journal \u00E9motionnel"),
        React.createElement("button", { className: "btn btn-gold", onClick: save }, "Enregistrer")));
}
function CravingContacts({ onManage }) {
    const { state } = useApp();
    return (React.createElement("div", { className: "fade-in", style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        state.contacts.length ? (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, state.contacts.map(c => React.createElement(ContactCard, { key: c.id, c: c, dark: true })))) : React.createElement("div", { className: "tile", style: { minHeight: 0 } },
            React.createElement("p", null, "Tu n\u2019as pas encore enregistr\u00E9 de contact de confiance."),
            React.createElement("button", { className: "btn btn-ghost-light", style: { alignSelf: 'flex-start' }, onClick: onManage }, "Ajouter un contact")),
        React.createElement("div", { className: "tile", style: { minHeight: 0, gap: 10 } },
            React.createElement("p", { className: "serif", style: { fontSize: 20 } }, "Si tu appelles quelqu\u2019un"),
            React.createElement("p", { className: "small on-dark-muted" }, "Tu n\u2019as pas besoin d\u2019expliquer longtemps. \u00AB J\u2019ai une envie forte, tu peux me parler cinq minutes ? \u00BB suffit. Tu peux aussi simplement parler d\u2019autre chose.")),
        state.plan.helps && React.createElement("div", { className: "tile", style: { minHeight: 0, gap: 6 } },
            React.createElement("p", { className: "serif", style: { fontSize: 20 } }, "Ce qui t\u2019aide, d\u2019apr\u00E8s ton plan"),
            React.createElement("p", { className: "small", style: { whiteSpace: 'pre-wrap' } }, state.plan.helps)),
        React.createElement("p", { className: "small on-dark-muted" }, "Lueur ne remplace pas un professionnel de sant\u00E9. En cas de danger imm\u00E9diat, appelle le 112 (num\u00E9ro d\u2019urgence europ\u00E9en).")));
}
function ContactCard({ c, dark, onEdit, onDelete }) {
    const [copied, setCopied] = useState(false);
    return (React.createElement("div", { className: dark ? 'tile' : 'card-flat', style: { minHeight: 0, gap: 6, display: 'flex', flexDirection: 'column' } },
        React.createElement("div", { className: "row" },
            React.createElement("p", { style: { fontWeight: 500 } }, c.name),
            onEdit && React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", { className: "btn-text small", onClick: onEdit }, "Modifier"),
                React.createElement("button", { className: "btn-text small", style: { color: '#8A3B2E' }, onClick: onDelete }, "Supprimer"))),
        c.phone && React.createElement("div", { className: "row", style: { flexWrap: 'wrap' } },
            React.createElement("span", { className: "tnum", style: { userSelect: 'all', fontSize: 17 } }, c.phone),
            React.createElement("span", { className: "flex gap-2" },
                React.createElement("button", { className: `btn ${dark ? 'btn-ghost-light' : 'btn-ghost'}`, style: { minHeight: 40, padding: '6px 14px' }, onClick: async () => { const ok = await copyText(c.phone); setCopied(ok ? 'ok' : 'ko'); setTimeout(() => setCopied(false), 2200); } }, copied === 'ok' ? 'Copié' : copied === 'ko' ? 'Sélectionne le numéro' : 'Copier'),
                React.createElement("a", { className: `btn ${dark ? 'btn-gold' : 'btn-primary'}`, style: { minHeight: 40, padding: '6px 14px' }, href: `tel:${c.phone.replace(/[^\d+]/g, '')}` }, "Appeler"))),
        c.note && React.createElement("p", { className: `small ${dark ? 'on-dark-muted' : 'muted'}` }, c.note)));
}
/* ---------- Mon parcours ---------- */
function ProgressScreen() {
    const { state, d, update, go, toast } = useApp();
    const [reprise, setReprise] = useState(false);
    const triggers = useMemo(() => {
        const m = {};
        state.cravings.forEach(c => { if (c.trigger)
            m[c.trigger] = (m[c.trigger] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [state.cravings]);
    const reasons = [...state.profile.wishes, ...(state.profile.wishNote ? [state.profile.wishNote] : [])];
    const [stepDraft, setStepDraft] = useState('');
    return (React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "topbar" },
            React.createElement("h1", { style: { fontSize: 32 } }, "Mon parcours"),
            React.createElement("button", { className: "iconbtn", onClick: () => go('settings'), "aria-label": "Param\u00E8tres" }, I.settings)),
        React.createElement("section", { className: "dark-panel", style: { display: 'flex', gap: 14, alignItems: 'center' } },
            React.createElement(LueurGlow, { size: 120, progress: d.progress }),
            React.createElement("div", { style: { minWidth: 0 } },
                React.createElement("p", { className: "eyebrow", style: { color: 'rgba(255,252,246,.55)' } }, d.active ? 'Depuis l’arrêt' : PATHS[state.path].label),
                d.active ? React.createElement("p", { className: "serif tnum", style: { fontSize: 36, lineHeight: 1.1 } }, plural(d.days, 'jour', 'jours')) : React.createElement("p", { className: "serif", style: { fontSize: 24, lineHeight: 1.2 } }, state.quitDate ? `Date choisie : ${fmtDate(state.quitDate)}` : 'Tu avances à ton rythme'),
                React.createElement("p", { className: "small on-dark-muted" }, glowStage(d.progress)))),
        d.active && (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("div", { className: "row" },
                React.createElement("p", { className: "eyebrow" }, "\u00C9conomies estim\u00E9es"),
                React.createElement("button", { className: "btn-text small", onClick: () => go('savings') }, "D\u00E9tails")),
            d.savings.rate != null
                ? React.createElement("p", { className: "serif tnum", style: { fontSize: 34, color: 'var(--forest)' } }, fmtMoney(Math.max(0, d.savings.net), state.savings.currency))
                : React.createElement("button", { className: "btn btn-ghost", onClick: () => go('savings') }, "Renseigner mes d\u00E9penses habituelles"))),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("p", { className: "eyebrow" }, "Mes motivations"),
            reasons.length ? React.createElement("div", { className: "chips" }, reasons.map(r => React.createElement("span", { key: r, className: "badge" }, r))) : React.createElement("p", { className: "small muted" }, "Pas encore de motivation not\u00E9e."),
            React.createElement("button", { className: "btn-text small", style: { alignSelf: 'flex-start' }, onClick: () => go('settings') }, "Modifier mes r\u00E9ponses")),
        !d.active && state.path !== 'reflect' && (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 4 } },
            React.createElement("div", { className: "row" },
                React.createElement("p", { className: "eyebrow" }, "Mes \u00E9tapes de pr\u00E9paration"),
                React.createElement("span", { className: "small muted tnum" },
                    d.doneSteps,
                    " / ",
                    state.prepSteps.length)),
            React.createElement("div", { className: "list" }, state.prepSteps.map(p => (React.createElement("div", { key: p.id, className: "listrow" },
                React.createElement("button", { className: "flex items-center gap-3", style: { flex: 1, textAlign: 'left', minHeight: 44 }, "aria-pressed": p.done, onClick: () => update(s => ({ ...s, prepSteps: s.prepSteps.map(x => x.id === p.id ? { ...x, done: !x.done } : x) })) },
                    React.createElement("span", { className: `check ${p.done ? 'on' : ''}` }, p.done && I.check),
                    React.createElement("span", { style: { textDecoration: p.done ? 'line-through' : 'none', color: p.done ? 'var(--muted)' : 'inherit' } },
                        p.label,
                        React.createElement("span", { className: "sr-only" }, p.done ? ' (fait)' : ''))),
                !DEFAULT_PREP.find(x => x.id === p.id) && React.createElement("button", { className: "btn-text small", "aria-label": `Retirer ${p.label}`, onClick: () => update(s => ({ ...s, prepSteps: s.prepSteps.filter(x => x.id !== p.id) })) }, "Retirer"))))),
            React.createElement("form", { className: "flex gap-2", style: { marginTop: 8 }, onSubmit: e => { e.preventDefault(); const t = stepDraft.trim(); if (!t)
                    return; update(s => ({ ...s, prepSteps: [...s.prepSteps, { id: uid(), label: t, done: false }] })); setStepDraft(''); } },
                React.createElement("label", { htmlFor: "new-step", className: "sr-only" }, "Ajouter une \u00E9tape"),
                React.createElement("input", { id: "new-step", className: "input", placeholder: "Ajouter une \u00E9tape", value: stepDraft, onChange: e => setStepDraft(e.target.value), style: { minWidth: 0 } }),
                React.createElement("button", { className: "btn btn-primary", type: "submit" }, "Ajouter")))),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("p", { className: "eyebrow" }, "Mes d\u00E9clencheurs"),
            state.profile.moments.length > 0 && React.createElement("div", null,
                React.createElement("p", { className: "label", style: { marginBottom: 6 } }, "Moments habituels"),
                React.createElement("div", { className: "chips" }, state.profile.moments.map(m => React.createElement("span", { key: m, className: "badge" }, m)))),
            triggers.length > 0 && React.createElement("div", null,
                React.createElement("p", { className: "label", style: { marginBottom: 6 } }, "Rep\u00E9r\u00E9s pendant tes envies"),
                React.createElement("div", { className: "list" }, triggers.map(([t, n]) => React.createElement("div", { key: t, className: "row", style: { padding: '8px 0' } },
                    React.createElement("span", null, t),
                    React.createElement("span", { className: "small muted tnum" }, plural(n, 'fois', 'fois')))))),
            !state.profile.moments.length && !triggers.length && React.createElement("p", { className: "small muted" }, "Ils appara\u00EEtront ici quand tu utiliseras \u00AB Comprendre mon envie \u00BB.")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("div", { className: "row" },
                React.createElement("p", { className: "eyebrow" }, "Mes petites victoires"),
                React.createElement("button", { className: "btn-text small", onClick: () => go('victories') }, "Voir tout")),
            state.victories.length ? React.createElement("p", null,
                React.createElement("span", { className: "serif tnum", style: { fontSize: 30, color: 'var(--forest)' } }, state.victories.length),
                " ",
                React.createElement("span", { className: "muted small" },
                    "enregistr\u00E9e",
                    state.victories.length > 1 ? 's' : '',
                    ", derni\u00E8re le ",
                    fmtShort(state.victories[0].date))) : React.createElement("p", { className: "small muted" }, "Aucune pour l\u2019instant. Elles comptent, m\u00EAme les plus petites.")),
        React.createElement(JournalTrends, null),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("p", { className: "eyebrow" }, "Historique du parcours"),
            state.history.length ? React.createElement("ol", { className: "list" }, [...state.history].reverse().map(h => (React.createElement("li", { key: h.id, style: { padding: '10px 0', display: 'flex', gap: 12 } },
                React.createElement("span", { className: "small muted tnum", style: { flex: 'none', width: 82 } }, fmtShort(h.date)),
                React.createElement("span", { className: "small" }, h.note))))) : React.createElement("p", { className: "small muted" }, "Ton historique commencera ici."),
            state.pastPeriods.length > 0 && React.createElement("p", { className: "small muted" },
                "P\u00E9riodes suivies pr\u00E9c\u00E9dentes : ",
                state.pastPeriods.map(p => `${fmtShort(p.start)} → ${fmtShort(p.end)}`).join(', '))),
        (d.active || state.path === 'stopped') && (reprise ? React.createElement(RepriseForm, { onDone: () => setReprise(false) }) : (React.createElement("section", { className: "card-flat", style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement("p", { className: "serif", style: { fontSize: 21, color: 'var(--forest)' } }, "Il y a eu une reprise ?"),
            React.createElement("p", { className: "small muted" }, "Tu peux le noter ici, sans jugement. Ton historique, tes \u00E9conomies pass\u00E9es et ta lueur sont conserv\u00E9s."),
            React.createElement("button", { className: "btn btn-ghost", style: { alignSelf: 'flex-start' }, onClick: () => setReprise(true) }, "Noter une reprise"))))));
}
function RepriseForm({ onDone }) {
    const { state, d, update, toast } = useApp();
    const [date, setDate] = useState(d.today);
    const [note, setNote] = useState('');
    const [next, setNext] = useState('prepare');
    const [newDate, setNewDate] = useState(addDays(d.today, 1));
    const invalid = state.quitDate && date < state.quitDate;
    const save = () => {
        update(s => {
            const n = { ...s };
            const wasActive = s.quitDate && diffDays(s.quitDate, d.today) >= 0 && s.path !== 'reflect';
            if (wasActive) {
                const days = Math.max(0, diffDays(s.quitDate, date));
                n.pastPeriods = [...s.pastPeriods, { start: s.quitDate, end: date }];
                n.lightBank = Math.round((s.lightBank + days) * 0.6 * 10) / 10;
            }
            n.history = [...s.history, { id: uid(), date, type: 'reprise', note: 'Reprise notée' + (note.trim() ? ` : ${note.trim()}` : '') }];
            n.path = 'resumed';
            if (next === 'prepare') {
                n.quitDate = null;
                n.prepSteps = s.prepSteps;
                n.history.push({ id: uid(), date: d.today, type: 'path', note: 'Retour en préparation' });
            }
            else {
                n.quitDate = newDate;
                n.history.push({ id: uid(), date: d.today, type: 'date', note: `Nouvelle date : ${fmtDate(newDate)}` });
            }
            return n;
        });
        toast('C’est noté. Ta lumière est toujours là.');
        onDone();
    };
    return (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        React.createElement("h2", { style: { fontSize: 24 } }, "Noter une reprise"),
        React.createElement("p", { className: "small muted" }, "Une reprise fait partie de beaucoup de parcours. Elle ne remet pas en cause ce que tu as appris."),
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: "rp-date" }, "Date de la reprise"),
            React.createElement("input", { id: "rp-date", type: "date", className: "input", value: date, max: d.today, onChange: e => setDate(e.target.value) }),
            invalid && React.createElement("p", { className: "small", style: { color: '#8A3B2E' } },
                "Choisis une date apr\u00E8s le d\u00E9but de ton arr\u00EAt (",
                fmtDate(state.quitDate),
                ").")),
        React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: "rp-note" }, "Ce qui s\u2019est pass\u00E9, si tu veux le garder"),
            React.createElement("textarea", { id: "rp-note", className: "input", value: note, onChange: e => setNote(e.target.value), placeholder: "Le contexte, ce que tu ressentais\u2026" })),
        React.createElement("div", { className: "field" },
            React.createElement("span", { className: "label" }, "Et maintenant ?"),
            React.createElement("div", { className: "chips" },
                React.createElement(Chip, { on: next === 'prepare', onClick: () => setNext('prepare') }, "Revenir en pr\u00E9paration"),
                React.createElement(Chip, { on: next === 'date', onClick: () => setNext('date') }, "Choisir une nouvelle date"))),
        next === 'date' && React.createElement("div", { className: "field" },
            React.createElement("label", { htmlFor: "rp-new" }, "Nouvelle date d\u2019arr\u00EAt"),
            React.createElement("input", { id: "rp-new", type: "date", className: "input", value: newDate, min: date, onChange: e => setNewDate(e.target.value) })),
        React.createElement("div", { className: "flex gap-2 flex-wrap" },
            React.createElement("button", { className: "btn btn-primary", disabled: invalid || (next === 'date' && !newDate), onClick: save }, "Enregistrer"),
            React.createElement("button", { className: "btn btn-ghost", onClick: onDone }, "Annuler"))));
}
/* ---------- Tendances du journal ---------- */
function JournalTrends() {
    const { state, go } = useApp();
    const entries = useMemo(() => [...state.journal].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), [state.journal]);
    const MIN = 5;
    const last = entries.slice(-14);
    const series = [['mood', 'Humeur', 'var(--moss)', 5], ['craving', 'Envies', 'var(--champagne)', 10]];
    const avg = (k) => { const v = entries.slice(-7).map(e => e[k]).filter(x => x != null); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null; };
    if (entries.length < MIN)
        return (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement("p", { className: "eyebrow" }, "\u00C9volution de mes ressentis"),
            React.createElement("p", { className: "small muted" },
                "Les tendances s\u2019afficheront \u00E0 partir de ",
                MIN,
                " entr\u00E9es dans ton journal (tu en as ",
                entries.length,
                ")."),
            React.createElement("button", { className: "btn-text small", style: { alignSelf: 'flex-start' }, onClick: () => go('journal') }, "Ouvrir le journal")));
    const W = 300, H = 110, PX = 8, PY = 12;
    const x = i => PX + (last.length === 1 ? (W - 2 * PX) / 2 : i * (W - 2 * PX) / (last.length - 1));
    return (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        React.createElement("p", { className: "eyebrow" }, "\u00C9volution de mes ressentis"),
        React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": `Humeur et intensité des envies sur tes ${last.length} dernières entrées` },
            [0, .5, 1].map(t => React.createElement("line", { key: t, x1: PX, x2: W - PX, y1: PY + t * (H - 2 * PY), y2: PY + t * (H - 2 * PY), stroke: "rgba(36,62,50,.08)" })),
            series.map(([k, l, c, max]) => {
                const pts = last.map((e, i) => e[k] == null ? null : [x(i), PY + (1 - (k === 'mood' ? (e[k] - 1) / 4 : e[k] / max)) * (H - 2 * PY)]);
                const segs = [];
                let cur = [];
                pts.forEach(p => { if (p)
                    cur.push(p);
                else if (cur.length) {
                    segs.push(cur);
                    cur = [];
                } });
                if (cur.length)
                    segs.push(cur);
                return React.createElement("g", { key: k },
                    segs.map((sg, i) => React.createElement("polyline", { key: i, points: sg.map(p => p.join(',')).join(' '), fill: "none", stroke: c, strokeWidth: "2.2", strokeLinejoin: "round", strokeLinecap: "round", strokeDasharray: k === 'craving' ? '5 4' : undefined })),
                    pts.map((p, i) => p && React.createElement("circle", { key: i, cx: p[0], cy: p[1], r: "2.8", fill: c })));
            })),
        React.createElement("div", { className: "flex gap-4 flex-wrap small" },
            React.createElement("span", { className: "flex items-center gap-2" },
                React.createElement("svg", { width: "22", height: "6" },
                    React.createElement("line", { x1: "0", y1: "3", x2: "22", y2: "3", stroke: "var(--moss)", strokeWidth: "2.2" })),
                "Humeur (trait plein)",
                avg('mood') != null && React.createElement("b", { className: "tnum" },
                    "\u00B7 moy. ",
                    avg('mood').toFixed(1),
                    "/5")),
            React.createElement("span", { className: "flex items-center gap-2" },
                React.createElement("svg", { width: "22", height: "6" },
                    React.createElement("line", { x1: "0", y1: "3", x2: "22", y2: "3", stroke: "var(--champagne)", strokeWidth: "2.2", strokeDasharray: "5 4" })),
                "Envies (pointill\u00E9s)",
                avg('craving') != null && React.createElement("b", { className: "tnum" },
                    "\u00B7 moy. ",
                    avg('craving').toFixed(1),
                    "/10"))),
        React.createElement("p", { className: "small muted" }, "Moyennes de tes 7 derni\u00E8res entr\u00E9es. Ces courbes refl\u00E8tent seulement ce que tu as not\u00E9.")));
}
/* ---------- Économies ---------- */
function SavingsTracker({ onBack }) {
    const { state, d, update, toast } = useApp();
    const [editing, setEditing] = useState(dailyRate(state.savings) == null);
    const [sv, setSv] = useState(state.savings);
    const [exp, setExp] = useState({ date: d.today, amount: '', note: '' });
    const [confirmDel, setConfirmDel] = useState(null);
    const s = d.savings;
    const cur = state.savings.currency;
    const saveConfig = () => { if (sv.amount !== '' && parseAmount(sv.amount) == null)
        return; update(st => ({ ...st, savings: sv })); setEditing(false); toast('Dépenses habituelles enregistrées.'); };
    const addExpense = e => { e.preventDefault(); const a = parseAmount(exp.amount); if (a == null || !exp.date)
        return; update(st => ({ ...st, expenses: [{ id: uid(), date: exp.date, amount: a, note: exp.note.trim() }, ...st.expenses] })); setExp({ date: d.today, amount: '', note: '' }); toast('Dépense enregistrée.'); };
    const expInvalid = exp.amount !== '' && parseAmount(exp.amount) == null;
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Mes \u00E9conomies", onBack: onBack }),
        React.createElement("section", { className: "dark-panel", style: { display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' } },
            React.createElement("div", { "aria-hidden": "true", style: { position: 'absolute', right: -70, top: -70, opacity: .55 } },
                React.createElement(LueurGlow, { size: 220, progress: 0.35, animated: false })),
            React.createElement("p", { className: "eyebrow", style: { color: 'rgba(255,252,246,.6)', position: 'relative' } }, "\u00C9conomies nettes estim\u00E9es"),
            s.rate == null ? React.createElement("p", { className: "serif", style: { fontSize: 24, position: 'relative' } }, "Renseigne tes d\u00E9penses habituelles pour voir une estimation.")
                : d.periods.length === 0 ? React.createElement(React.Fragment, null,
                    React.createElement("p", { className: "serif", style: { fontSize: 26, position: 'relative' } }, "Le calcul commencera \u00E0 ta date d\u2019arr\u00EAt."),
                    React.createElement("p", { className: "small on-dark-muted" }, "Tant que l\u2019arr\u00EAt n\u2019a pas commenc\u00E9, rien n\u2019est comptabilis\u00E9."))
                    : React.createElement(React.Fragment, null,
                        React.createElement("p", { className: "serif tnum", style: { fontSize: 52, lineHeight: 1, color: 'var(--warm)', position: 'relative' } }, fmtMoney(s.net, cur)),
                        React.createElement("div", { className: "small on-dark-muted tnum", style: { display: 'grid', gap: 4, position: 'relative' } },
                            React.createElement("span", null,
                                plural(s.trackedDays, 'jour suivi', 'jours suivis'),
                                " \u00D7 ",
                                fmtMoney(s.rate, cur),
                                " par jour = ",
                                fmtMoney(s.gross, cur)),
                            s.deducted > 0 && React.createElement("span", null,
                                "\u2212 ",
                                fmtMoney(s.deducted, cur),
                                " de d\u00E9penses d\u00E9clar\u00E9es pendant cette p\u00E9riode"))),
            s.rate != null && React.createElement("div", { style: { borderTop: '1px solid rgba(255,252,246,.14)', paddingTop: 14, position: 'relative' } },
                React.createElement("p", { className: "eyebrow", style: { color: 'var(--champagne)', marginBottom: 8 } }, "Projections, \u00E0 partir d\u2019aujourd\u2019hui"),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 } }, [['7 jours', s.p7], ['30 jours', s.p30], ['1 an', s.p365]].map(([l, v]) => React.createElement("div", { key: l },
                    React.createElement("p", { className: "serif tnum", style: { fontSize: 21, lineHeight: 1.2 } }, fmtMoney(v, cur)),
                    React.createElement("p", { className: "small on-dark-muted" }, l)))))),
        React.createElement("p", { className: "small muted" }, "Il s\u2019agit d\u2019estimations calcul\u00E9es \u00E0 partir de tes r\u00E9ponses. Ce n\u2019est pas de l\u2019argent mis de c\u00F4t\u00E9 automatiquement."),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("div", { className: "row" },
                React.createElement("h2", { style: { fontSize: 22 } }, "Mes d\u00E9penses habituelles"),
                !editing && React.createElement("button", { className: "btn-text small", onClick: () => { setSv(state.savings); setEditing(true); } }, "Modifier")),
            editing ? React.createElement(React.Fragment, null,
                React.createElement("p", { className: "small muted" }, "Combien d\u00E9pensais-tu habituellement en cannabis ? C\u2019est facultatif."),
                React.createElement(SpendFields, { sv: sv, setSv: setSv, prefix: "sv" }),
                React.createElement("div", { className: "flex gap-2 flex-wrap" },
                    React.createElement("button", { className: "btn btn-primary", onClick: saveConfig }, "Enregistrer"),
                    dailyRate(state.savings) != null && React.createElement("button", { className: "btn btn-ghost", onClick: () => setEditing(false) }, "Annuler"))) : React.createElement("p", null,
                fmtMoney(parseAmount(state.savings.amount), cur),
                " ",
                ({ day: 'par jour', week: 'par semaine', month: 'par mois' })[state.savings.period],
                " ",
                React.createElement("span", { className: "muted small tnum" },
                    "\u00B7 soit ",
                    fmtMoney(s.rate, cur),
                    " par jour en moyenne"))),
        React.createElement(SavingsGoal, null),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "D\u00E9penses r\u00E9elles"),
            React.createElement("p", { className: "small muted" }, "Si tu as achet\u00E9 du cannabis pendant la p\u00E9riode suivie, tu peux le noter ici. Le montant est d\u00E9duit une seule fois des \u00E9conomies estim\u00E9es. Rien d\u2019autre n\u2019est effac\u00E9."),
            React.createElement("form", { onSubmit: addExpense, style: { display: 'grid', gap: 10 } },
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                    React.createElement("div", { className: "field", style: { minWidth: 0 } },
                        React.createElement("label", { htmlFor: "ex-date" }, "Date"),
                        React.createElement("input", { id: "ex-date", type: "date", className: "input", max: d.today, value: exp.date, onChange: e => setExp({ ...exp, date: e.target.value }) })),
                    React.createElement("div", { className: "field", style: { minWidth: 0 } },
                        React.createElement("label", { htmlFor: "ex-amt" }, "Montant"),
                        React.createElement("input", { id: "ex-amt", className: "input tnum", inputMode: "decimal", placeholder: "0,00", value: exp.amount, onChange: e => setExp({ ...exp, amount: e.target.value }) }))),
                expInvalid && React.createElement("p", { className: "small", style: { color: '#8A3B2E' } }, "Indique un montant positif."),
                React.createElement("div", { className: "field" },
                    React.createElement("label", { htmlFor: "ex-note" }, "Note (facultatif)"),
                    React.createElement("input", { id: "ex-note", className: "input", value: exp.note, onChange: e => setExp({ ...exp, note: e.target.value }) })),
                React.createElement("button", { className: "btn btn-ghost", type: "submit", disabled: parseAmount(exp.amount) == null }, "Ajouter cette d\u00E9pense")),
            state.expenses.length > 0 && React.createElement("div", { className: "list" }, state.expenses.map(e => {
                const counted = d.periods.some(p => e.date >= p.start && e.date <= (p.end || d.today));
                return confirmDel === e.id ? React.createElement(ConfirmInline, { key: e.id, text: "Supprimer cette d\u00E9pense ?", onConfirm: () => { update(st => ({ ...st, expenses: st.expenses.filter(x => x.id !== e.id) })); setConfirmDel(null); }, onCancel: () => setConfirmDel(null) }) : (React.createElement("div", { key: e.id, className: "row", style: { padding: '10px 0' } },
                    React.createElement("div", { style: { minWidth: 0 } },
                        React.createElement("p", { className: "tnum" },
                            fmtMoney(e.amount, cur),
                            " ",
                            React.createElement("span", { className: "small muted" },
                                "\u00B7 ",
                                fmtShort(e.date))),
                        React.createElement("p", { className: "small muted" },
                            counted ? 'Déduite des économies' : 'Hors période suivie, non déduite',
                            e.note ? ` · ${e.note}` : '')),
                    React.createElement("button", { className: "btn-text small", style: { color: '#8A3B2E' }, onClick: () => setConfirmDel(e.id) }, "Supprimer")));
            }))),
        React.createElement("p", { className: "small muted" }, "Comment c\u2019est calcul\u00E9 : moyenne quotidienne = montant (par jour), montant \u00F7 7 (par semaine) ou montant \u00D7 12 \u00F7 365,2425 (par mois). Les jours suivis sont ceux de tes p\u00E9riodes d\u2019arr\u00EAt, y compris les p\u00E9riodes pass\u00E9es avant une reprise. Si tu as consomm\u00E9 sans noter d\u2019achat, l\u2019estimation sera plus haute que la r\u00E9alit\u00E9.")));
}
function SavingsGoal() {
    var _a;
    const { state, d, update, toast } = useApp();
    const [editing, setEditing] = useState(false);
    const [g, setG] = useState(state.goal || { name: '', target: '', icon: 'voyage', description: '' });
    const [confirm, setConfirm] = useState(false);
    const cur = state.savings.currency;
    const target = state.goal ? parseAmount(state.goal.target) : null;
    const net = d.savings.rate != null ? Math.max(0, d.savings.net || 0) : 0;
    const pct = target ? clamp(net / target, 0, 1) : 0;
    const save = () => { if (!g.name.trim() || parseAmount(g.target) == null)
        return; update(s => ({ ...s, goal: { ...g, name: g.name.trim() } })); setEditing(false); toast('Ton projet est enregistré.'); };
    if (editing)
        return (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Mon projet avec cet argent"),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "gl-name" }, "Nom du projet"),
                React.createElement("input", { id: "gl-name", className: "input", value: g.name, onChange: e => setG({ ...g, name: e.target.value }), placeholder: "Par exemple : un week-end \u00E0 la mer" })),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "gl-target" },
                    "Montant cible (",
                    cur,
                    ")"),
                React.createElement("input", { id: "gl-target", className: "input tnum", inputMode: "decimal", value: g.target, onChange: e => setG({ ...g, target: e.target.value }), placeholder: "300" })),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "Ic\u00F4ne"),
                React.createElement("div", { className: "chips" }, Object.entries(GOAL_ICONS).map(([k, v]) => React.createElement("button", { key: k, type: "button", className: `chip ${g.icon === k ? 'on' : ''}`, "aria-pressed": g.icon === k, onClick: () => setG({ ...g, icon: k }) },
                    React.createElement("span", { style: { width: 18, height: 18, display: 'inline-flex' } }, v.svg),
                    v.label)))),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "gl-desc" }, "Description (facultatif)"),
                React.createElement("textarea", { id: "gl-desc", className: "input", value: g.description, onChange: e => setG({ ...g, description: e.target.value }) })),
            (!g.name.trim() || parseAmount(g.target) == null) && React.createElement("p", { className: "small muted" }, "Un nom et un montant sont n\u00E9cessaires pour enregistrer."),
            React.createElement("div", { className: "flex gap-2 flex-wrap" },
                React.createElement("button", { className: "btn btn-primary", disabled: !g.name.trim() || parseAmount(g.target) == null, onClick: save }, "Enregistrer"),
                React.createElement("button", { className: "btn btn-ghost", onClick: () => setEditing(false) }, "Annuler"))));
    if (!state.goal)
        return React.createElement(Empty, { title: "Mon projet avec cet argent", text: "Donne une destination \u00E0 tes \u00E9conomies estim\u00E9es : un voyage, un restaurant, un cadeau, de l\u2019\u00E9pargne.", action: React.createElement("button", { className: "btn btn-primary", onClick: () => { setG({ name: '', target: '', icon: 'voyage', description: '' }); setEditing(true); } }, "Choisir un projet") });
    return (React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement("p", { className: "eyebrow" }, "Mon projet avec cet argent"),
        React.createElement("div", { className: "flex gap-3 items-center" },
            React.createElement("span", { className: "goal-icon", style: { color: '#9B7A3A' } }, (_a = GOAL_ICONS[state.goal.icon]) === null || _a === void 0 ? void 0 : _a.svg),
            React.createElement("div", { style: { minWidth: 0 } },
                React.createElement("p", { className: "serif", style: { fontSize: 22, color: 'var(--forest)', lineHeight: 1.2 } }, state.goal.name),
                state.goal.description && React.createElement("p", { className: "small muted" }, state.goal.description))),
        React.createElement("div", null,
            React.createElement("div", { className: "row small tnum", style: { marginBottom: 6 } },
                React.createElement("span", null, fmtMoney(net, cur)),
                React.createElement("span", { className: "muted" },
                    "sur ",
                    fmtMoney(target, cur),
                    " \u00B7 ",
                    Math.round(pct * 100),
                    " %")),
            React.createElement("div", { className: "progressbar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(pct * 100), "aria-label": "Progression du projet" },
                React.createElement("span", { style: { width: `${pct * 100}%` } }))),
        d.savings.rate == null && React.createElement("p", { className: "small muted" }, "Renseigne tes d\u00E9penses habituelles pour suivre la progression."),
        pct >= 1 && React.createElement("p", { className: "small", style: { color: 'var(--moss)' } }, "Tes \u00E9conomies estim\u00E9es atteignent ce projet."),
        React.createElement("p", { className: "small muted" }, "Estimation : cet argent n\u2019est pas mis de c\u00F4t\u00E9 automatiquement."),
        confirm ? React.createElement(ConfirmInline, { text: "Supprimer ce projet ?", onConfirm: () => { update(s => ({ ...s, goal: null })); setConfirm(false); }, onCancel: () => setConfirm(false) }) :
            React.createElement("div", { className: "flex gap-2" },
                React.createElement("button", { className: "btn-text small", onClick: () => { setG(state.goal); setEditing(true); } }, "Modifier"),
                React.createElement("button", { className: "btn-text small", style: { color: '#8A3B2E' }, onClick: () => setConfirm(true) }, "Supprimer"))));
}
/* ---------- Journal ---------- */
function MoodJournal({ onBack }) {
    var _a;
    const { state, d, update, toast } = useApp();
    const blank = () => ({ id: null, date: d.today, mood: null, energy: null, sleep: null, craving: null, note: '' });
    const [form, setForm] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const sorted = [...state.journal].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    const save = e => {
        e.preventDefault();
        const entry = { ...form, id: form.id || uid(), note: form.note.trim() };
        update(s => ({ ...s, journal: form.id ? s.journal.map(x => x.id === form.id ? entry : x) : [entry, ...s.journal] }));
        toast(form.id ? 'Entrée modifiée.' : 'Entrée ajoutée à ton journal.');
        setForm(null);
    };
    const empty = form && form.mood == null && form.energy == null && form.sleep == null && form.craving == null && !form.note.trim();
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Journal \u00E9motionnel", onBack: onBack }),
        form ? (React.createElement("form", { className: "card", onSubmit: save, style: { display: 'flex', flexDirection: 'column', gap: 16 } },
            React.createElement("h2", { style: { fontSize: 24 } }, form.id ? 'Modifier l’entrée' : 'Comment te sens-tu ?'),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "jr-date" }, "Date"),
                React.createElement("input", { id: "jr-date", type: "date", className: "input", max: d.today, value: form.date, onChange: e => setForm({ ...form, date: e.target.value }), required: true })),
            React.createElement(Rating, { label: "Humeur", value: form.mood, onChange: v => setForm({ ...form, mood: v }), labels: MOOD }),
            React.createElement(Rating, { label: "\u00C9nergie", value: form.energy, onChange: v => setForm({ ...form, energy: v }), labels: ENERGY }),
            React.createElement(Rating, { label: "Sommeil ressenti", value: form.sleep, onChange: v => setForm({ ...form, sleep: v }), labels: SLEEP }),
            React.createElement("div", { className: "field" },
                React.createElement("div", { className: "row" },
                    React.createElement("label", { htmlFor: "jr-crav", className: "label" }, "Intensit\u00E9 des envies"),
                    React.createElement("span", { className: "small tnum", style: { color: 'var(--forest)', fontWeight: 500 } }, form.craving == null ? 'Non renseigné' : `${form.craving} / 10`)),
                React.createElement("input", { id: "jr-crav", type: "range", min: "0", max: "10", value: (_a = form.craving) !== null && _a !== void 0 ? _a : 0, onChange: e => setForm({ ...form, craving: Number(e.target.value) }) }),
                form.craving != null && React.createElement("button", { type: "button", className: "btn-text small", style: { alignSelf: 'flex-start' }, onClick: () => setForm({ ...form, craving: null }) }, "Effacer cette valeur")),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "jr-note" }, "Note personnelle (facultatif)"),
                React.createElement("textarea", { id: "jr-note", className: "input", value: form.note, onChange: e => setForm({ ...form, note: e.target.value }), placeholder: "Ce qui s\u2019est pass\u00E9, ce que tu remarques\u2026" })),
            React.createElement("div", { className: "flex gap-2 flex-wrap" },
                React.createElement("button", { className: "btn btn-primary", type: "submit", disabled: empty }, "Enregistrer"),
                React.createElement("button", { className: "btn btn-ghost", type: "button", onClick: () => setForm(null) }, "Annuler")),
            empty && React.createElement("p", { className: "small muted" }, "Renseigne au moins un \u00E9l\u00E9ment pour enregistrer."))) : React.createElement("button", { className: "btn btn-primary btn-block", onClick: () => setForm(blank()) }, "Nouvelle entr\u00E9e"),
        !form && React.createElement(JournalTrends, null),
        !form && (sorted.length === 0 ? React.createElement(Empty, { title: "Ton journal est vide", text: "Quelques secondes par jour suffisent. Tu verras ensuite tes ressentis \u00E9voluer, tels que tu les as not\u00E9s." }) : (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, sorted.map(e => confirmDel === e.id
            ? React.createElement(ConfirmInline, { key: e.id, text: `Supprimer l’entrée du ${fmtDate(e.date)} ?`, onConfirm: () => { update(s => ({ ...s, journal: s.journal.filter(x => x.id !== e.id) })); setConfirmDel(null); toast('Entrée supprimée.'); }, onCancel: () => setConfirmDel(null) })
            : (React.createElement("article", { key: e.id, className: "card", style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 8 } },
                React.createElement("div", { className: "row" },
                    React.createElement("p", { className: "serif", style: { fontSize: 19, color: 'var(--forest)' } }, fmtDate(e.date, { weekday: 'long' }))),
                React.createElement("div", { className: "flex flex-wrap gap-2" },
                    e.mood != null && React.createElement("span", { className: "badge" },
                        "Humeur : ",
                        MOOD[e.mood - 1]),
                    e.energy != null && React.createElement("span", { className: "badge" },
                        "\u00C9nergie : ",
                        ENERGY[e.energy - 1]),
                    e.sleep != null && React.createElement("span", { className: "badge" },
                        "Sommeil : ",
                        SLEEP[e.sleep - 1]),
                    e.craving != null && React.createElement("span", { className: "badge badge-gold tnum" },
                        "Envies : ",
                        e.craving,
                        "/10")),
                e.note && React.createElement("p", { className: "small", style: { whiteSpace: 'pre-wrap' } }, e.note),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { className: "btn-text small", onClick: () => setForm({ ...e, note: e.note || '' }) }, "Modifier"),
                    React.createElement("button", { className: "btn-text small", style: { color: '#8A3B2E' }, onClick: () => setConfirmDel(e.id) }, "Supprimer"))))))))));
}
/* ---------- Chronologie ---------- */
function DailyTimeline({ onBack }) {
    const { d } = useApp();
    const currentDay = d.active ? d.days + 1 : null;
    const initial = currentDay ? [...TIMELINE].reverse().find(t => t.day <= currentDay) || TIMELINE[0] : TIMELINE[0];
    const [sel, setSel] = useState(initial.day);
    const card = TIMELINE.find(t => t.day === sel);
    const reachedIdx = currentDay ? TIMELINE.filter(t => t.day <= currentDay).length - 1 : -1;
    const idx = TIMELINE.indexOf(card);
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Ce qui change en moi", onBack: onBack }),
        React.createElement("p", { className: "small muted" }, "Des rep\u00E8res possibles, pas un programme. Chaque personne vit le sevrage \u00E0 sa fa\u00E7on : certaines \u00E9tapes arrivent plus t\u00F4t, plus tard, ou pas du tout."),
        currentDay && React.createElement("p", { className: "badge badge-gold", style: { alignSelf: 'flex-start' } },
            "Tu en es au jour ",
            currentDay),
        React.createElement("div", { className: "scroll-x", role: "tablist", "aria-label": "Jours" }, TIMELINE.map((t, i) => React.createElement("button", { key: t.day, role: "tab", "aria-selected": sel === t.day, className: `daypill ${sel === t.day ? 'on' : ''} ${i === reachedIdx ? 'now' : ''}`, onClick: () => setSel(t.day) },
            React.createElement("span", null, "Jour"),
            React.createElement("b", { className: "tnum" }, t.day)))),
        React.createElement("article", { className: "card fade-in", key: card.day, style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            React.createElement("p", { className: "eyebrow" },
                "Jour ",
                card.day,
                i18nReached(reachedIdx, idx)),
            React.createElement("h2", { style: { fontSize: 30, lineHeight: 1.15 } }, card.title),
            React.createElement("p", null, card.text),
            React.createElement("div", null,
                React.createElement("p", { className: "label", style: { marginBottom: 6 } }, "Sensations possibles"),
                React.createElement("div", { className: "chips" }, card.feel.map(f => React.createElement("span", { key: f, className: "badge" }, f)))),
            React.createElement("div", null,
                React.createElement("p", { className: "label", style: { marginBottom: 6 } }, "Ce qui peut s\u2019am\u00E9liorer"),
                React.createElement("ul", { style: { display: 'grid', gap: 4, paddingLeft: 18, listStyle: 'disc' } }, card.better.map(b => React.createElement("li", { key: b, className: "small" }, b)))),
            React.createElement("div", { className: "card-flat", style: { background: 'rgba(168,185,156,.14)', borderColor: 'transparent' } },
                React.createElement("p", { className: "label", style: { marginBottom: 4 } }, "Un conseil concret"),
                React.createElement("p", { className: "small" }, card.tip)),
            React.createElement("p", { className: "serif", style: { fontSize: 22, fontStyle: 'italic', color: 'var(--moss)' } },
                "\u00AB ",
                card.kind,
                " \u00BB"),
            React.createElement("div", { className: "row" },
                React.createElement("button", { className: "btn btn-ghost", disabled: idx === 0, onClick: () => setSel(TIMELINE[idx - 1].day) }, "Pr\u00E9c\u00E9dent"),
                React.createElement("button", { className: "btn btn-ghost", disabled: idx === TIMELINE.length - 1, onClick: () => setSel(TIMELINE[idx + 1].day) }, "Suivant"))),
        React.createElement("details", { className: "card-flat" },
            React.createElement("summary", { className: "row" },
                React.createElement("span", { className: "label" }, "Sources et statut du contenu"),
                React.createElement("span", { className: "small muted" }, "Afficher")),
            React.createElement("div", { style: { display: 'grid', gap: 10, marginTop: 12 } },
                React.createElement("p", { className: "small" },
                    React.createElement("b", null, "Statut :"),
                    " r\u00E9dig\u00E9 \u00E0 partir de la litt\u00E9rature g\u00E9n\u00E9rale sur le sevrage du cannabis. ",
                    React.createElement("b", null, "Non relu par un professionnel de sant\u00E9"),
                    " \u00E0 ce stade."),
                React.createElement("p", { className: "small muted" }, "Rep\u00E8res retenus : les sympt\u00F4mes apparaissent souvent dans les 24 \u00E0 48 heures, sont plus marqu\u00E9s pendant les premiers jours, puis diminuent progressivement, le plus souvent en une \u00E0 deux semaines. Les troubles du sommeil peuvent durer plus longtemps."),
                React.createElement("ul", { style: { display: 'grid', gap: 6, paddingLeft: 18, listStyle: 'disc' } }, SOURCES.map(s => React.createElement("li", { key: s, className: "small muted" }, s)))))));
}
function i18nReached(reachedIdx, idx) { if (reachedIdx < 0)
    return ''; if (idx === reachedIdx)
    return ' · ta période actuelle'; if (idx < reachedIdx)
    return ' · déjà traversé'; return ' · à venir'; }
/* ---------- Bibliothèque ---------- */
function EducationalLibrary({ onBack }) {
    const [open, setOpen] = useState(null);
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Comprendre le cannabis", onBack: onBack }),
        React.createElement("p", { className: "small muted" }, "Des r\u00E9ponses courtes, sans jugement. Les effets d\u00E9crits sont possibles, pas syst\u00E9matiques."),
        React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, LIBRARY.map((a, i) => {
            const on = open === i;
            return (React.createElement("article", { key: i, className: "card", style: { padding: 18 } },
                React.createElement("button", { className: "row", style: { width: '100%', textAlign: 'left', alignItems: 'flex-start' }, "aria-expanded": on, onClick: () => setOpen(on ? null : i) },
                    React.createElement("span", { className: "serif", style: { fontSize: 21, lineHeight: 1.25, color: 'var(--forest)' } }, a.q),
                    React.createElement("span", { "aria-hidden": "true", style: { width: 20, height: 20, flex: 'none', marginTop: 4, transform: on ? 'rotate(90deg)' : 'none', transition: 'transform .2s', color: 'var(--muted)' } }, I.arrow)),
                on && React.createElement("div", { className: "fade-in", style: { display: 'grid', gap: 10, marginTop: 12 } },
                    React.createElement("p", null, a.a),
                    React.createElement("details", null,
                        React.createElement("summary", { className: "btn-text small", style: { display: 'inline-block' } }, "En savoir plus"),
                        React.createElement("p", { className: "small muted", style: { marginTop: 6 } }, a.more)),
                    a.tip && React.createElement("div", { className: "card-flat", style: { background: 'rgba(232,199,138,.14)', borderColor: 'transparent' } },
                        React.createElement("p", { className: "label" }, "Conseil pratique"),
                        React.createElement("p", { className: "small" }, a.tip)))));
        })),
        React.createElement("p", { className: "small muted" }, "Contenu informatif g\u00E9n\u00E9ral, non relu par un professionnel de sant\u00E9. Il ne remplace pas un avis m\u00E9dical.")));
}
/* ---------- Petites victoires ---------- */
function SmallVictories({ onBack }) {
    const { state, update, celebrate, bloom, d } = useApp();
    const [confirmDel, setConfirmDel] = useState(null);
    const counts = useMemo(() => { const m = {}; state.victories.forEach(v => m[v.type] = (m[v.type] || 0) + 1); return m; }, [state.victories]);
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Mes petites victoires", onBack: onBack }),
        React.createElement("section", { className: "dark-panel", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 } },
            React.createElement(LueurGlow, { size: 160, progress: d.progress, intensity: bloom ? 1.4 : 1 }),
            React.createElement("p", { className: "serif", style: { fontSize: 22 }, "aria-live": "polite" }, bloom ? 'Ta lueur s’illumine un instant.' : 'Chaque petit changement compte.')),
        React.createElement("div", { style: { display: 'grid', gap: 8 } }, VICTORY_TYPES.map(v => (React.createElement("button", { key: v.id, className: "card", style: { padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }, onClick: () => celebrate(v.id) },
            React.createElement("span", null, v.label),
            React.createElement("span", { className: "flex items-center gap-2" },
                counts[v.id] ? React.createElement("span", { className: "badge tnum" }, counts[v.id]) : null,
                React.createElement("span", { className: "btn btn-ghost", style: { minHeight: 36, padding: '4px 12px', fontSize: 14 } }, "Noter")))))),
        React.createElement("h2", { style: { fontSize: 22, marginTop: 6 } }, "Historique"),
        state.victories.length === 0 ? React.createElement(Empty, { title: "Aucune victoire not\u00E9e", text: "Touche une ligne ci-dessus quand tu vis l\u2019un de ces moments." }) :
            React.createElement("div", { className: "card list", style: { padding: '4px 18px' } }, state.victories.map(v => {
                var _a;
                return confirmDel === v.id
                    ? React.createElement("div", { key: v.id, style: { padding: '10px 0' } },
                        React.createElement(ConfirmInline, { text: "Retirer cette victoire de l\u2019historique ?", confirmLabel: "Retirer", onConfirm: () => { update(s => ({ ...s, victories: s.victories.filter(x => x.id !== v.id) })); setConfirmDel(null); }, onCancel: () => setConfirmDel(null) }))
                    : React.createElement("div", { key: v.id, className: "row", style: { padding: '12px 0' } },
                        React.createElement("div", { style: { minWidth: 0 } },
                            React.createElement("p", { className: "small" }, (_a = VICTORY_TYPES.find(t => t.id === v.type)) === null || _a === void 0 ? void 0 : _a.label),
                            React.createElement("p", { className: "small muted" }, fmtDate(v.date))),
                        React.createElement("button", { className: "btn-text small", onClick: () => setConfirmDel(v.id) }, "Retirer"));
            }))));
}
/* ---------- Outils ---------- */
function ToolsScreen() {
    const { go, openCraving, state, d } = useApp();
    const tools = [
        ['savings', 'Mes économies', d.savings.rate != null && d.periods.length ? fmtMoney(Math.max(0, d.savings.net), state.savings.currency) + ' estimés' : 'Estimer ce que tu ne dépenses plus'],
        ['journal', 'Journal émotionnel', state.journal.length ? plural(state.journal.length, 'entrée', 'entrées') : 'Noter ton humeur, ton énergie, ton sommeil'],
        ['timeline', 'Ce qui change en moi', 'Les repères possibles du sevrage'],
        ['library', 'Comprendre le cannabis', '10 questions, des réponses simples'],
        ['victories', 'Mes petites victoires', state.victories.length ? plural(state.victories.length, 'victoire', 'victoires') : 'Garder une trace de ce qui compte'],
    ];
    return (React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "topbar" },
            React.createElement("h1", { style: { fontSize: 32 } }, "Outils"),
            React.createElement("button", { className: "iconbtn", onClick: () => go('settings'), "aria-label": "Param\u00E8tres" }, I.settings)),
        React.createElement("button", { className: "dark-panel", style: { textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }, onClick: openCraving },
            React.createElement(LueurGlow, { size: 84, progress: 0.3, animated: false }),
            React.createElement("span", { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                React.createElement("span", { className: "serif", style: { fontSize: 22 } }, "J\u2019ai une envie maintenant"),
                React.createElement("span", { className: "small on-dark-muted" }, "Respirer, changer d\u2019activit\u00E9, comprendre, \u00EAtre soutenu\u00B7e"))),
        React.createElement("div", { className: "card list", style: { padding: '2px 18px' } }, tools.map(([k, t, s]) => (React.createElement("button", { key: k, className: "listrow", onClick: () => go(k) },
            React.createElement("span", { style: { flex: 1, minWidth: 0 } },
                React.createElement("span", { className: "serif", style: { display: 'block', fontSize: 21, color: 'var(--forest)', lineHeight: 1.25 } }, t),
                React.createElement("span", { className: "small muted" }, s)),
            React.createElement("span", { style: { width: 20, height: 20, color: 'var(--muted)', flex: 'none' } }, I.arrow)))))));
}
/* ---------- Soutien ---------- */
function SupportScreen() {
    const { state, update, go, toast, d } = useApp();
    const [msgIdx, setMsgIdx] = useState(Math.floor(toUTC(d.today) / 86400000) % KIND_MESSAGES.length);
    const [ground, setGround] = useState(0);
    const [planEdit, setPlanEdit] = useState(false);
    const [plan, setPlan] = useState(state.plan);
    const [cForm, setCForm] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const GROUND = ['Regarde autour de toi et nomme 5 choses que tu vois.', 'Repère 4 choses que tu peux toucher. Sens leur texture.', 'Écoute 3 sons, proches ou lointains.', 'Cherche 2 odeurs, même légères.', 'Remarque 1 goût dans ta bouche, ou prends une gorgée d’eau.', 'Tu es ici, maintenant. Prends une respiration lente.'];
    const planFields = [['signs', 'Mes signes d’alerte', 'Ce qui me montre qu’un moment devient difficile'], ['helps', 'Ce qui m’aide', 'Les gestes, lieux, activités qui m’apaisent'], ['people', 'Les personnes que je peux contacter', 'Prénoms, moments où les joindre'], ['reasons', 'Pourquoi je fais ce chemin', 'Mes raisons, avec mes mots']];
    const saveContact = e => { e.preventDefault(); if (!cForm.name.trim())
        return; const c = { ...cForm, id: cForm.id || uid(), name: cForm.name.trim(), phone: cForm.phone.trim(), note: cForm.note.trim() }; update(s => ({ ...s, contacts: cForm.id ? s.contacts.map(x => x.id === c.id ? c : x) : [...s.contacts, c] })); setCForm(null); toast('Contact enregistré.'); };
    return (React.createElement("div", { className: "screen" },
        React.createElement("div", { className: "topbar" },
            React.createElement("h1", { style: { fontSize: 32 } }, "Soutien"),
            React.createElement("button", { className: "iconbtn", onClick: () => go('settings'), "aria-label": "Param\u00E8tres" }, I.settings)),
        React.createElement("section", { className: "dark-panel", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("p", { className: "eyebrow", style: { color: 'rgba(255,252,246,.55)' } }, "Un mot pour toi"),
            React.createElement("p", { className: "serif", style: { fontSize: 27, lineHeight: 1.25 }, "aria-live": "polite" },
                "\u00AB ",
                KIND_MESSAGES[msgIdx],
                " \u00BB"),
            React.createElement("button", { className: "btn btn-ghost-light", style: { alignSelf: 'flex-start' }, onClick: () => setMsgIdx((msgIdx + 1) % KIND_MESSAGES.length) }, "Un autre message")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Se recentrer : 5, 4, 3, 2, 1"),
            React.createElement("p", { className: "small muted" }, "Un exercice pour revenir au moment pr\u00E9sent quand les pens\u00E9es s\u2019emballent."),
            React.createElement("div", { className: "card-flat", style: { background: 'rgba(168,185,156,.14)', borderColor: 'transparent', minHeight: 84 }, "aria-live": "polite" },
                React.createElement("p", { className: "small muted tnum" },
                    "\u00C9tape ",
                    ground + 1,
                    " sur ",
                    GROUND.length),
                React.createElement("p", { className: "serif", style: { fontSize: 21, color: 'var(--forest)', lineHeight: 1.3 } }, GROUND[ground])),
            React.createElement("div", { className: "row" },
                React.createElement("button", { className: "btn btn-ghost", disabled: ground === 0, onClick: () => setGround(ground - 1) }, "Pr\u00E9c\u00E9dent"),
                ground < GROUND.length - 1 ? React.createElement("button", { className: "btn btn-primary", onClick: () => setGround(ground + 1) }, "Suivant") : React.createElement("button", { className: "btn btn-ghost", onClick: () => setGround(0) }, "Recommencer"))),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Traverser une envie"),
            React.createElement("ul", { style: { display: 'grid', gap: 8 } }, ['Une envie n’est pas un ordre. Tu peux la regarder sans y répondre.', 'Elle monte comme une vague, atteint un pic, puis redescend. Donne-lui quelques minutes.', 'Change de lieu ou de geste : sortir, boire, te doucher, bouger.', 'Retarde la décision de quinze minutes, puis fais le point.', 'Parle à quelqu’un, même d’autre chose.', 'Relis tes raisons dans ton plan ci-dessous.'].map(t => React.createElement("li", { key: t, className: "small", style: { display: 'flex', gap: 10 } },
                React.createElement("span", { "aria-hidden": "true", style: { width: 6, height: 6, borderRadius: 9, background: 'var(--champagne)', marginTop: 9, flex: 'none' } }),
                t)))),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("div", { className: "row" },
                React.createElement("h2", { style: { fontSize: 22 } }, "Mon plan pour les moments difficiles"),
                !planEdit && React.createElement("button", { className: "btn-text small", onClick: () => { setPlan(state.plan); setPlanEdit(true); } }, Object.values(state.plan).some(Boolean) ? 'Modifier' : 'Remplir')),
            planEdit ? React.createElement(React.Fragment, null,
                planFields.map(([k, l, ph]) => React.createElement("div", { key: k, className: "field" },
                    React.createElement("label", { htmlFor: 'pl-' + k }, l),
                    React.createElement("textarea", { id: 'pl-' + k, className: "input", value: plan[k], placeholder: ph, onChange: e => setPlan({ ...plan, [k]: e.target.value }) }))),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { className: "btn btn-primary", onClick: () => { update(s => ({ ...s, plan })); setPlanEdit(false); toast('Ton plan est enregistré.'); } }, "Enregistrer"),
                    React.createElement("button", { className: "btn btn-ghost", onClick: () => setPlanEdit(false) }, "Annuler"))) : Object.values(state.plan).some(Boolean)
                ? React.createElement("div", { style: { display: 'grid', gap: 12 } }, planFields.filter(([k]) => state.plan[k]).map(([k, l]) => React.createElement("div", { key: k },
                    React.createElement("p", { className: "label" }, l),
                    React.createElement("p", { className: "small", style: { whiteSpace: 'pre-wrap' } }, state.plan[k]))))
                : React.createElement("p", { className: "small muted" }, "Pr\u00E9par\u00E9 \u00E0 l\u2019avance, ce plan t\u2019\u00E9vite d\u2019avoir \u00E0 r\u00E9fl\u00E9chir quand tout est plus difficile.")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("div", { className: "row" },
                React.createElement("h2", { style: { fontSize: 22 } }, "Mes contacts de confiance"),
                !cForm && React.createElement("button", { className: "btn-text small", onClick: () => setCForm({ id: null, name: '', phone: '', note: '' }) }, "Ajouter")),
            cForm && React.createElement("form", { onSubmit: saveContact, style: { display: 'grid', gap: 10 } },
                React.createElement("div", { className: "field" },
                    React.createElement("label", { htmlFor: "ct-name" }, "Pr\u00E9nom ou nom"),
                    React.createElement("input", { id: "ct-name", className: "input", value: cForm.name, onChange: e => setCForm({ ...cForm, name: e.target.value }), required: true })),
                React.createElement("div", { className: "field" },
                    React.createElement("label", { htmlFor: "ct-phone" }, "T\u00E9l\u00E9phone (facultatif)"),
                    React.createElement("input", { id: "ct-phone", className: "input tnum", inputMode: "tel", value: cForm.phone, onChange: e => setCForm({ ...cForm, phone: e.target.value }) })),
                React.createElement("div", { className: "field" },
                    React.createElement("label", { htmlFor: "ct-note" }, "Note (facultatif)"),
                    React.createElement("input", { id: "ct-note", className: "input", placeholder: "Par exemple : disponible le soir", value: cForm.note, onChange: e => setCForm({ ...cForm, note: e.target.value }) })),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { className: "btn btn-primary", type: "submit", disabled: !cForm.name.trim() }, "Enregistrer"),
                    React.createElement("button", { className: "btn btn-ghost", type: "button", onClick: () => setCForm(null) }, "Annuler"))),
            state.contacts.length === 0 && !cForm && React.createElement("p", { className: "small muted" }, "Ajoute une ou deux personnes \u00E0 qui tu pourrais \u00E9crire dans un moment difficile."),
            state.contacts.map(c => confirmDel === c.id ? React.createElement(ConfirmInline, { key: c.id, text: `Supprimer ${c.name} ?`, onConfirm: () => { update(s => ({ ...s, contacts: s.contacts.filter(x => x.id !== c.id) })); setConfirmDel(null); }, onCancel: () => setConfirmDel(null) }) : React.createElement(ContactCard, { key: c.id, c: c, onEdit: () => setCForm({ ...c }), onDelete: () => setConfirmDel(c.id) })),
            state.contacts.some(c => c.phone) && React.createElement("p", { className: "small muted" }, "Le bouton \u00AB Appeler \u00BB peut ne pas fonctionner selon l\u2019endroit o\u00F9 cette page est ouverte. Le num\u00E9ro reste affich\u00E9 et copiable.")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Ressources professionnelles"),
            React.createElement("ul", { style: { display: 'grid', gap: 10 } },
                React.createElement("li", { className: "small" },
                    React.createElement("b", null, "Ton m\u00E9decin traitant ou un pharmacien"),
                    " : un premier interlocuteur pour parler du sommeil, de l\u2019anxi\u00E9t\u00E9 ou des envies."),
                React.createElement("li", { className: "small" },
                    React.createElement("b", null, "Un service sp\u00E9cialis\u00E9 en addictologie"),
                    " : en France, les CSAPA et les Consultations jeunes consommateurs proposent un accompagnement gratuit et confidentiel. Dans d\u2019autres pays, renseigne-toi aupr\u00E8s de ton m\u00E9decin."),
                React.createElement("li", { className: "small" },
                    React.createElement("b", null, "Drogues Info Service"),
                    " (France) : informations et orientation, sur drogues-info-service.fr.")),
            React.createElement("div", { className: "card-flat", style: { borderColor: 'rgba(138,59,46,.3)', display: 'grid', gap: 6 } },
                React.createElement("p", { className: "label", style: { color: '#8A3B2E' } }, "En cas de danger imm\u00E9diat"),
                React.createElement("p", { className: "small" },
                    "Si tu es en danger ou en grande d\u00E9tresse, appelle les secours : ",
                    React.createElement("b", { className: "tnum" }, "112"),
                    ", num\u00E9ro d\u2019urgence europ\u00E9en. En France, le ",
                    React.createElement("b", { className: "tnum" }, "3114"),
                    " est le num\u00E9ro national de pr\u00E9vention du suicide, joignable \u00E0 toute heure.")),
            React.createElement("p", { className: "small muted" }, "Lueur ne remplace pas un professionnel de sant\u00E9 et ne fournit pas de prise en charge m\u00E9dicale ou psychologique."))));
}
/* ---------- Paramètres ---------- */
function SettingsScreen({ onBack }) {
    const { state, d, update, toast, storageOk, replaceState, resetAll } = useApp();
    const [path, setPath] = useState(state.path);
    const [quitDate, setQuitDate] = useState(state.quitDate || '');
    const [profile, setProfile] = useState(state.profile);
    const [exportOpen, setExportOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importErr, setImportErr] = useState('');
    const [importConfirm, setImportConfirm] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [copied, setCopied] = useState('');
    const exportRef = useRef(null);
    const json = useMemo(() => JSON.stringify(state, null, 2), [state]);
    const savePath = () => {
        update(s => {
            const n = { ...s, path, quitDate: quitDate || null, profile };
            const h = [...s.history];
            const wasActive = s.path !== 'reflect' && s.quitDate && diffDays(s.quitDate, d.today) >= 0;
            const willBeActive = path !== 'reflect' && quitDate && diffDays(quitDate, d.today) >= 0;
            if (wasActive && !willBeActive) {
                const days = diffDays(s.quitDate, d.today);
                if (days > 0) {
                    n.pastPeriods = [...s.pastPeriods, { start: s.quitDate, end: d.today }];
                    n.lightBank = Math.round((s.lightBank + days) * 0.6 * 10) / 10;
                }
            }
            if (path !== s.path)
                h.push({ id: uid(), date: d.today, type: 'path', note: `Parcours : ${PATHS[path].label}` });
            if ((quitDate || null) !== s.quitDate)
                h.push({ id: uid(), date: d.today, type: 'date', note: quitDate ? `Date d’arrêt : ${fmtDate(quitDate)}` : 'Date d’arrêt retirée' });
            n.history = h;
            return n;
        });
        toast('Modifications enregistrées.');
    };
    const doImport = () => {
        try {
            const parsed = JSON.parse(importText);
            if (!parsed || typeof parsed !== 'object' || !('profile' in parsed || 'journal' in parsed))
                throw new Error('format');
            replaceState(normalize({ ...parsed, onboarded: true }));
            setImportText('');
            setImportConfirm(false);
            setImportErr('');
            toast('Données importées.');
        }
        catch (e) {
            setImportErr('Ce texte n’est pas une sauvegarde Lueur valide. Colle l’intégralité du texte exporté, de la première à la dernière accolade.');
            setImportConfirm(false);
        }
    };
    const P = (k, v) => setProfile({ ...profile, [k]: v });
    return (React.createElement("div", { className: "screen" },
        React.createElement(SubHeader, { title: "Param\u00E8tres", onBack: onBack }),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 14 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Mon parcours et mes r\u00E9ponses"),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "O\u00F9 en es-tu ?"),
                React.createElement("div", { style: { display: 'grid', gap: 8 } }, Object.entries(PATHS).map(([k, v]) => React.createElement(Chip, { key: k, on: path === k, onClick: () => setPath(k) }, v.label)))),
            path !== 'reflect' && React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "st-date" }, "Date d\u2019arr\u00EAt (facultative)"),
                React.createElement("input", { id: "st-date", type: "date", className: "input", value: quitDate, onChange: e => setQuitDate(e.target.value) }),
                quitDate && React.createElement("button", { className: "btn-text small", style: { alignSelf: 'flex-start' }, onClick: () => setQuitDate('') }, "Retirer la date")),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "Depuis combien de temps"),
                React.createElement(ChipsSingle, { options: DURATIONS, value: profile.duration, onChange: v => P('duration', v) })),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "Fr\u00E9quence"),
                React.createElement(ChipsSingle, { options: FREQUENCIES, value: profile.frequency, onChange: v => P('frequency', v) })),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "Moments habituels"),
                React.createElement(ChipsMulti, { options: MOMENTS, value: profile.moments, onChange: v => P('moments', v) })),
            React.createElement("div", { className: "field" },
                React.createElement("span", { className: "label" }, "Ce que j\u2019aimerais retrouver ou changer"),
                React.createElement(ChipsMulti, { options: WISHES, value: profile.wishes, onChange: v => P('wishes', v) })),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "st-wish" }, "Avec mes mots"),
                React.createElement("input", { id: "st-wish", className: "input", value: profile.wishNote, onChange: e => P('wishNote', e.target.value) })),
            React.createElement("button", { className: "btn btn-primary", onClick: savePath }, "Enregistrer"),
            React.createElement("p", { className: "small muted" }, "Pour tes d\u00E9penses habituelles, va dans Outils \u2192 Mes \u00E9conomies.")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Animations"),
            React.createElement("label", { className: "row", style: { minHeight: 44 } },
                React.createElement("span", null, "R\u00E9duire les animations"),
                React.createElement("input", { type: "checkbox", checked: state.settings.reduceMotion, onChange: e => update(s => ({ ...s, settings: { ...s.settings, reduceMotion: e.target.checked } })), style: { width: 22, height: 22, accentColor: 'var(--forest)' } })),
            React.createElement("p", { className: "small muted" }, "Le r\u00E9glage de ton appareil (\u00AB r\u00E9duire les animations \u00BB) est aussi respect\u00E9.")),
        React.createElement("section", { className: "card", style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Confidentialit\u00E9 et sauvegarde"),
            React.createElement("p", { className: "small" }, storageOk ? 'Tes données sont enregistrées dans le stockage local de ce navigateur, sur cet appareil uniquement.' : 'Le stockage local n’est pas disponible ici : tes données seront perdues à la fermeture de la page. Pense à exporter.'),
            React.createElement("ul", { className: "small muted", style: { display: 'grid', gap: 4, paddingLeft: 18, listStyle: 'disc' } },
                React.createElement("li", null, "Rien n\u2019est envoy\u00E9 \u00E0 un serveur ni \u00E0 un service externe."),
                React.createElement("li", null, "Ce stockage n\u2019est pas chiffr\u00E9. Une personne ayant acc\u00E8s \u00E0 ce navigateur pourrait le consulter."),
                React.createElement("li", null, "Effacer les donn\u00E9es du navigateur, ou utiliser une navigation priv\u00E9e, supprime tes donn\u00E9es."),
                React.createElement("li", null, "Il n\u2019y a pas de synchronisation entre appareils.")),
            React.createElement("button", { className: "btn btn-ghost", onClick: () => setExportOpen(!exportOpen), "aria-expanded": exportOpen }, exportOpen ? 'Masquer l’export' : 'Exporter mes données (JSON)'),
            exportOpen && React.createElement("div", { style: { display: 'grid', gap: 8 } },
                React.createElement("p", { className: "small muted" }, "Copie ce texte et garde-le dans un endroit s\u00FBr (notes, fichier). Tu pourras le r\u00E9importer ici."),
                React.createElement("textarea", { ref: exportRef, readOnly: true, className: "input tnum", style: { minHeight: 160, fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }, value: json, "aria-label": "Donn\u00E9es export\u00E9es" }),
                React.createElement("button", { className: "btn btn-primary", onClick: async () => { const ok = await copyText(json); if (!ok && exportRef.current) {
                        exportRef.current.focus();
                        exportRef.current.select();
                    } setCopied(ok ? 'Copié dans le presse-papiers.' : 'Texte sélectionné : copie-le avec ton appareil.'); setTimeout(() => setCopied(''), 3000); } }, "Copier"),
                copied && React.createElement("p", { className: "small", role: "status" }, copied)),
            React.createElement("div", { className: "field" },
                React.createElement("label", { htmlFor: "st-import" }, "Importer une sauvegarde"),
                React.createElement("textarea", { id: "st-import", className: "input", style: { fontSize: 13 }, placeholder: "Colle ici le texte export\u00E9", value: importText, onChange: e => { setImportText(e.target.value); setImportErr(''); } })),
            importErr && React.createElement("p", { className: "small", role: "alert", style: { color: '#8A3B2E' } }, importErr),
            importConfirm ? React.createElement(ConfirmInline, { text: "Importer remplacera toutes tes donn\u00E9es actuelles. Continuer ?", confirmLabel: "Importer", onConfirm: doImport, onCancel: () => setImportConfirm(false) }) : React.createElement("button", { className: "btn btn-ghost", disabled: !importText.trim(), onClick: () => setImportConfirm(true) }, "Importer")),
        React.createElement("section", { className: "card-flat", style: { display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'rgba(138,59,46,.25)' } },
            React.createElement("h2", { style: { fontSize: 22 } }, "Tout effacer"),
            React.createElement("p", { className: "small muted" }, "Supprime d\u00E9finitivement ton parcours, ton journal, tes \u00E9conomies et tes contacts de cet appareil."),
            confirmReset ? React.createElement(ConfirmInline, { text: "Cette action est d\u00E9finitive. Effacer toutes les donn\u00E9es ?", confirmLabel: "Tout effacer", onConfirm: resetAll, onCancel: () => setConfirmReset(false) }) : React.createElement("button", { className: "btn btn-danger", style: { alignSelf: 'flex-start' }, onClick: () => setConfirmReset(true) }, "Effacer mes donn\u00E9es")),
        React.createElement("p", { className: "small muted", style: { textAlign: 'center' } }, "Lueur \u00B7 version 1 \u00B7 Chaque jour, un peu plus de lumi\u00E8re.")));
}
/* ---------- App ---------- */
function App() {
    const loaded = useMemo(loadState, []);
    const [state, setState] = useState(loaded.state);
    const [storageOk, setStorageOk] = useState(loaded.ok);
    const [tab, setTab] = useState('home');
    const [sub, setSub] = useState(null);
    const [craving, setCraving] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [bloom, setBloom] = useState(false);
    const toastTimer = useRef(null);
    const bloomTimer = useRef(null);
    const [today, setToday] = useState(todayStr());
    useEffect(() => {
        const check = () => setToday(t => { const n = todayStr(); return n !== t ? n : t; });
        const id = setInterval(check, 60000);
        document.addEventListener('visibilitychange', check);
        window.addEventListener('focus', check);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
    }, []);
    useEffect(() => {
        if (!craving)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [craving]);
    useEffect(() => { try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (!storageOk)
            setStorageOk(true);
    }
    catch (e) {
        setStorageOk(false);
    } }, [state]);
    useEffect(() => { window.scrollTo(0, 0); }, [tab, sub]);
    const update = useCallback(fn => setState(s => fn(s)), []);
    const toast = useCallback(m => { setToastMsg(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastMsg(''), 2800); }, []);
    const celebrate = useCallback(type => {
        setState(s => ({ ...s, victories: [{ id: uid(), type, date: todayStr() }, ...s.victories] }));
        setBloom(true);
        clearTimeout(bloomTimer.current);
        bloomTimer.current = setTimeout(() => setBloom(false), 3500);
        toast('Petite victoire enregistrée.');
    }, [toast]);
    const go = useCallback(target => { if (target.startsWith('tab:')) {
        setTab(target.slice(4));
        setSub(null);
    }
    else
        setSub(target); }, []);
    const d = useMemo(() => derive(state, today), [state, today]);
    const ctx = { state, d, update, toast, go, celebrate, bloom, storageOk,
        openCraving: () => setCraving(true),
        replaceState: s => setState(s),
        resetAll: () => { try {
            localStorage.removeItem(STORAGE_KEY);
        }
        catch (e) { } setState(initialState()); setTab('home'); setSub(null); } };
    const finishOnboarding = ({ path, profile, quitDate, savings }) => {
        const today = todayStr();
        setState(s => {
            const h = [{ id: uid(), date: today, type: 'path', note: `Début avec Lueur : ${PATHS[path].label.toLowerCase()}` }];
            if (quitDate)
                h.push({ id: uid(), date: today, type: 'date', note: path === 'stopped' ? `Arrêt déclaré depuis le ${fmtDate(quitDate)}` : `Date d’arrêt choisie : ${fmtDate(quitDate)}` });
            return { ...s, onboarded: true, path, profile, quitDate: path === 'reflect' ? null : quitDate, savings, history: [...s.history, ...h] };
        });
        setTab('home');
        setSub(null);
    };
    let content;
    if (sub === 'savings')
        content = React.createElement(SavingsTracker, { onBack: () => setSub(null) });
    else if (sub === 'journal')
        content = React.createElement(MoodJournal, { onBack: () => setSub(null) });
    else if (sub === 'timeline')
        content = React.createElement(DailyTimeline, { onBack: () => setSub(null) });
    else if (sub === 'library')
        content = React.createElement(EducationalLibrary, { onBack: () => setSub(null) });
    else if (sub === 'victories')
        content = React.createElement(SmallVictories, { onBack: () => setSub(null) });
    else if (sub === 'settings')
        content = React.createElement(SettingsScreen, { onBack: () => setSub(null) });
    else if (tab === 'home')
        content = React.createElement(HomeScreen, null);
    else if (tab === 'progress')
        content = React.createElement(ProgressScreen, null);
    else if (tab === 'tools')
        content = React.createElement(ToolsScreen, null);
    else
        content = React.createElement(SupportScreen, null);
    return (React.createElement(AppCtx.Provider, { value: ctx }, !state.onboarded ? React.createElement(Onboarding, { onDone: finishOnboarding, initial: state }) : (React.createElement("div", { className: "app" },
        React.createElement("main", { key: tab + (sub || ''), className: "fade-in" }, content),
        !craving && React.createElement(BottomNavigation, { tab: sub ? null : tab, setTab: t => { setTab(t); setSub(null); } }),
        craving && React.createElement(CravingSupport, { onClose: () => setCraving(false) }),
        toastMsg && React.createElement("div", { className: "toast", role: "status" }, toastMsg)))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));

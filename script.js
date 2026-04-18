/* ============================================
   TASKMASTER — script.js
   Parle à /api/taches sur Vercel.
   Repli sur localStorage si l'API est hors ligne.
   ============================================ */

// ---- Config API ----
// En local (Live Server) → backend Express sur le port 5000
// Sur Vercel (production) → même domaine /api/taches
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api/taches'
  : '/api/taches';

// ---- State ----
let taches          = [];
let filtreStatut    = 'tous';
let filtreCategorie = 'toutes';
let filtreTexte     = '';
let vueActuelle     = 'kanban';
let editId          = null;
let modeLocal       = false;

// ============================================
//   UTILITAIRES DATE
// ============================================
function today(delta = 0) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}
function formaterDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  const j = ['dim','lun','mar','mer','jeu','ven','sam'][d.getDay()];
  const m = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][d.getMonth()];
  return `${j} ${d.getDate()} ${m}`;
}
function estRetard(str) {
  if (!str) return false;
  return str < today(0);
}

// ============================================
//   APPELS API  (avec repli localStorage)
// ============================================
async function apiGet() {
  try {
    const r = await fetch(API);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    // MongoDB retourne _id → on normalise en id pour le frontend
    const normalise = data.map(t => ({ ...t, id: t._id || t.id }));
    modeLocal = false;
    localStorage.setItem('taskmaster_taches', JSON.stringify(normalise));
    return normalise;
  } catch (e) {
    console.warn('API inaccessible, repli localStorage :', e.message);
    modeLocal = true;
    const cache = localStorage.getItem('taskmaster_taches');
    return cache ? JSON.parse(cache) : donneesDemo();
  }
}

async function apiPost(data) {
  // Mode local forcé (API inaccessible précédemment)
  if (modeLocal) return creerLocal(data);
  try {
    const r = await fetch(API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    // Lire le corps UNE SEULE FOIS
    const json = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error((json && json.erreur) ? json.erreur : 'Erreur serveur HTTP ' + r.status);
    }
    // Normaliser _id MongoDB → id
    if (json && json._id) json.id = json._id;
    return json;
  } catch (e) {
    // Réseau coupé → repli silencieux en local
    if (e.message.startsWith('Erreur serveur') || e.message.startsWith('Failed to fetch')) {
      console.warn('POST API échoué, repli local :', e.message);
      modeLocal = true;
      return creerLocal(data);
    }
    // Erreur métier (ex: titre manquant) → remonter l'erreur
    throw e;
  }
}

async function apiPut(id, data) {
  if (modeLocal) return modifierLocal(id, data);
  try {
    const r    = await fetch(`${API}?id=${encodeURIComponent(id)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error((json && json.erreur) ? json.erreur : 'Erreur serveur HTTP ' + r.status);
    }
    return json;
  } catch (e) {
    if (e.message.startsWith('Erreur serveur') || e.message.startsWith('Failed to fetch')) {
      console.warn('PUT API échoué, repli local :', e.message);
      modeLocal = true;
      return modifierLocal(id, data);
    }
    throw e;
  }
}

async function apiDelete(id) {
  if (modeLocal) return supprimerLocal(id);
  try {
    const r    = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await r.json().catch(() => null);
    if (!r.ok) {
      throw new Error((json && json.erreur) ? json.erreur : 'Erreur serveur HTTP ' + r.status);
    }
    return json;
  } catch (e) {
    if (e.message.startsWith('Erreur serveur') || e.message.startsWith('Failed to fetch')) {
      console.warn('DELETE API échoué, repli local :', e.message);
      modeLocal = true;
      return supprimerLocal(id);
    }
    throw e;
  }
}

// ---- Opérations localStorage (repli) ----
function sauvegarderLocal() {
  localStorage.setItem('taskmaster_taches', JSON.stringify(taches));
}
function creerLocal(data) {
  const t = { id: Date.now().toString(), creee: new Date().toISOString(), ...data };
  taches.unshift(t);
  sauvegarderLocal();
  return t;
}
function modifierLocal(id, data) {
  const idx = taches.findIndex(t => t.id === String(id));
  if (idx !== -1) { taches[idx] = { ...taches[idx], ...data }; sauvegarderLocal(); return taches[idx]; }
}
function supprimerLocal(id) {
  taches = taches.filter(t => t.id !== String(id));
  sauvegarderLocal();
  return { message: 'Supprimé localement' };
}

// ---- Données de démo (premier lancement hors ligne) ----
function donneesDemo() {
  return [
    { id:'1', titre:'Réviser le rapport mensuel', desc:"Vérifier les chiffres et préparer le résumé", categorie:'travail', priorite:'haute',   statut:'todo',     echeance:today(0),  urgente:true,  creee:new Date().toISOString() },
    { id:'2', titre:'Appeler le médecin',         desc:'Prendre rendez-vous pour le bilan annuel',   categorie:'sante',  priorite:'moyenne', statut:'todo',     echeance:today(1),  urgente:false, creee:new Date().toISOString() },
    { id:'3', titre:'Courses au marché',          desc:'Tomates, oignons, mil, huile, savon',        categorie:'courses',priorite:'basse',   statut:'en-cours', echeance:today(0),  urgente:false, creee:new Date().toISOString() },
    { id:'4', titre:'Lire 30 pages',              desc:'Continuer le livre sur la productivité',     categorie:'perso',  priorite:'basse',   statut:'en-cours', echeance:today(2),  urgente:false, creee:new Date().toISOString() },
    { id:'5', titre:'Envoyer email à Mohamed',    desc:'Confirmer la réunion de vendredi',           categorie:'travail',priorite:'moyenne', statut:'termine',  echeance:today(-1), urgente:false, creee:new Date().toISOString() },
  ];
}

// ============================================
//   FILTRES & STATS
// ============================================
function tachesFiltrees() {
  return taches.filter(t => {
    const okStatut =
      filtreStatut === 'tous'     ? true :
      filtreStatut === 'urgentes' ? (t.urgente && t.statut !== 'termine') :
                                    t.statut === filtreStatut;
    const okCat   = filtreCategorie === 'toutes' || t.categorie === filtreCategorie;
    const okTexte = !filtreTexte || t.titre.toLowerCase().includes(filtreTexte.toLowerCase());
    return okStatut && okCat && okTexte;
  });
}
function compterParStatut(s) {
  if (s === 'tous')     return taches.length;
  if (s === 'urgentes') return taches.filter(t => t.urgente && t.statut !== 'termine').length;
  return taches.filter(t => t.statut === s).length;
}
function compterParCat(c) { return taches.filter(t => t.categorie === c).length; }
function pctTermine() {
  if (!taches.length) return 0;
  return Math.round(taches.filter(t => t.statut === 'termine').length / taches.length * 100);
}

// ============================================
//   RENDU
// ============================================
function rendreSidebar() {
  const d    = new Date();
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  document.getElementById('date-jour').textContent = String(d.getDate()).padStart(2,'0');
  document.getElementById('date-mois').textContent = jours[d.getDay()] + ' · ' + mois[d.getMonth()] + ' ' + d.getFullYear();

  document.getElementById('cnt-tous').textContent     = compterParStatut('tous');
  document.getElementById('cnt-actives').textContent  = compterParStatut('todo') + compterParStatut('en-cours');
  document.getElementById('cnt-termines').textContent = compterParStatut('termine');
  document.getElementById('cnt-urgentes').textContent = compterParStatut('urgentes');

  const pct = pctTermine();
  document.getElementById('prog-bar').style.width  = pct + '%';
  document.getElementById('prog-pct').textContent  = pct + '%';
  document.getElementById('prog-detail').textContent = taches.filter(t => t.statut === 'termine').length + ' / ' + taches.length;

  const cats  = ['travail','perso','sante','courses','autre'];
  const icons = { travail:'💼', perso:'🏠', sante:'❤️', courses:'🛒', autre:'✨' };
  const ul = document.getElementById('cat-list');
  ul.innerHTML = `<li><button class="cat-btn ${filtreCategorie==='toutes'?'actif':''}" data-cat="toutes">
    <span class="cat-label">🗂️ Toutes</span><span class="cat-badge">${taches.length}</span>
  </button></li>` + cats.map(c => `<li><button class="cat-btn ${filtreCategorie===c?'actif':''}" data-cat="${c}">
    <span class="cat-label">${icons[c]} ${c.charAt(0).toUpperCase()+c.slice(1)}</span>
    <span class="cat-badge">${compterParCat(c)}</span>
  </button></li>`).join('');
  ul.querySelectorAll('.cat-btn').forEach(btn =>
    btn.addEventListener('click', () => { filtreCategorie = btn.dataset.cat; rendreTout(); })
  );
  document.querySelectorAll('.stat-item').forEach(el =>
    el.classList.toggle('actif', el.dataset.filtre === filtreStatut)
  );

  // Badge mode local/offline
  const badge = document.getElementById('mode-badge');
  if (badge) badge.style.display = modeLocal ? 'inline-block' : 'none';
}

function rendreKanban() {
  const cols = { 'todo':'col-todo', 'en-cours':'col-en-cours', 'termine':'col-termine' };
  const filtrees = tachesFiltrees();
  Object.entries(cols).forEach(([statut, colId]) => {
    const list  = document.getElementById(colId + '-list');
    const count = document.getElementById(colId + '-count');
    const items = filtrees.filter(t => t.statut === statut);
    count.textContent = items.length;
    list.innerHTML = items.length
      ? items.map(t => carteHTML(t)).join('')
      : `<div class="vide"><div class="vide-icon">${statut==='todo'?'📋':statut==='en-cours'?'⚡':'✅'}</div><p>Aucune tâche</p></div>`;
  });
  bindCartes();
}

function rendreListe() {
  const filtrees = tachesFiltrees();
  const el = document.getElementById('liste-container');
  if (!filtrees.length) {
    el.innerHTML = `<div class="vide" style="padding:3rem"><div class="vide-icon">🔍</div><p>Aucune tâche trouvée</p></div>`;
    return;
  }
  el.innerHTML = filtrees.map(t => `
    <div class="liste-item ${t.statut==='termine'?'terminee':''}" data-id="${t.id}">
      <div class="liste-check ${t.statut==='termine'?'coche':''}" data-id="${t.id}">
        ${t.statut==='termine'?'✓':''}
      </div>
      <div class="liste-titre ${t.statut==='termine'?'barre':''}">${t.titre}</div>
      <span class="tag-cat ${t.categorie}">${t.categorie}</span>
      <span class="tag-prio ${t.priorite}">${t.priorite}</span>
      ${t.echeance ? `<span class="tache-echeance ${estRetard(t.echeance)&&t.statut!=='termine'?'retard':''}">📅 ${formaterDate(t.echeance)}</span>` : ''}
      <div class="liste-actions">
        <button class="action-btn edit"  data-id="${t.id}">✏️</button>
        <button class="action-btn suppr" data-id="${t.id}">🗑️</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.liste-check').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleTermine(b.dataset.id); }));
  el.querySelectorAll('.action-btn.edit').forEach(b  => b.addEventListener('click', () => ouvrirEdition(b.dataset.id)));
  el.querySelectorAll('.action-btn.suppr').forEach(b => b.addEventListener('click', () => supprimerTache(b.dataset.id)));
}

function carteHTML(t) {
  const retard = estRetard(t.echeance) && t.statut !== 'termine';
  return `<div class="tache-card ${t.statut==='termine'?'terminee':''} ${t.urgente?'urgente':''}" data-id="${t.id}">
    <div class="tache-top">
      <div class="tache-titre">${t.titre}</div>
      <div class="tache-actions">
        ${t.statut!=='termine' ? `<button class="action-btn check" data-id="${t.id}" title="Terminer">✓</button>` : ''}
        <button class="action-btn edit"  data-id="${t.id}" title="Modifier">✏</button>
        <button class="action-btn suppr" data-id="${t.id}" title="Supprimer">✕</button>
      </div>
    </div>
    ${t.desc ? `<div class="tache-desc">${t.desc}</div>` : ''}
    <div class="tache-meta">
      <span class="tag-cat ${t.categorie}">${t.categorie}</span>
      <span class="tag-prio ${t.priorite}">${t.priorite}</span>
      ${t.echeance ? `<span class="tache-echeance ${retard?'retard':''}">📅 ${formaterDate(t.echeance)}</span>` : ''}
    </div>
  </div>`;
}

function bindCartes() {
  document.querySelectorAll('.action-btn.check').forEach(b => b.addEventListener('click', () => changerStatut(b.dataset.id, 'termine')));
  document.querySelectorAll('.action-btn.edit').forEach(b  => b.addEventListener('click', () => ouvrirEdition(b.dataset.id)));
  document.querySelectorAll('.action-btn.suppr').forEach(b => b.addEventListener('click', () => supprimerTache(b.dataset.id)));
  document.querySelectorAll('.tache-card').forEach(card => {
    card.addEventListener('dblclick', () => {
      const t = taches.find(x => x.id === card.dataset.id);
      if (t && t.statut !== 'termine') {
        const order = ['todo','en-cours','termine'];
        changerStatut(t.id, order[(order.indexOf(t.statut)+1) % order.length]);
      }
    });
  });
}

function rendreTout() {
  rendreSidebar();
  vueActuelle === 'kanban' ? rendreKanban() : rendreListe();
}

// ============================================
//   ACTIONS  (async)
// ============================================
async function changerStatut(id, statut) {
  const t = taches.find(x => x.id === String(id));
  if (!t) return;
  setChargement(true);
  await apiPut(id, { statut });
  t.statut = statut;
  setChargement(false);
  rendreTout();
  toast(statut === 'termine' ? '✅ Tâche terminée !' : '🔄 Statut mis à jour', 'succes');
}

async function toggleTermine(id) {
  const t = taches.find(x => x.id === String(id));
  if (!t) return;
  await changerStatut(id, t.statut === 'termine' ? 'todo' : 'termine');
}

async function supprimerTache(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  setChargement(true);
  await apiDelete(id);
  taches = taches.filter(x => x.id !== String(id));
  setChargement(false);
  rendreTout();
  toast('🗑️ Tâche supprimée', 'erreur');
}

function ouvrirEdition(id) {
  const t = taches.find(x => x.id === String(id));
  if (!t) return;
  editId = t.id;
  document.getElementById('modal-titre-h2').textContent = '✏️ Modifier la tâche';
  document.getElementById('f-titre').value     = t.titre;
  document.getElementById('f-desc').value      = t.desc || '';
  document.getElementById('f-categorie').value = t.categorie;
  document.getElementById('f-priorite').value  = t.priorite;
  document.getElementById('f-statut').value    = t.statut;
  document.getElementById('f-echeance').value  = t.echeance || '';
  document.getElementById('f-urgente').checked = t.urgente;
  ouvrirModal();
}

function ouvrirNouvelle(statutInit = 'todo') {
  editId = null;
  document.getElementById('modal-titre-h2').textContent = '✨ Nouvelle tâche';
  document.getElementById('form-tache').reset();
  document.getElementById('f-statut').value = statutInit;
  ouvrirModal();
}

function ouvrirModal()     { document.getElementById('modal').classList.add('open'); document.getElementById('f-titre').focus(); }
function fermerModal()     { document.getElementById('modal').classList.remove('open'); editId = null; }
function setChargement(on) { document.getElementById('btn-ajouter').disabled = on; }

// ============================================
//   INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {

  setChargement(true);
  taches = await apiGet();
  setChargement(false);
  rendreTout();

  document.querySelectorAll('.stat-item').forEach(el =>
    el.addEventListener('click', () => { filtreStatut = el.dataset.filtre; rendreTout(); })
  );
  document.getElementById('btn-ajouter').addEventListener('click', () => ouvrirNouvelle());
  document.querySelectorAll('.btn-add-col').forEach(btn =>
    btn.addEventListener('click', () => ouvrirNouvelle(btn.dataset.statut || 'todo'))
  );
  document.getElementById('modal-close').addEventListener('click', fermerModal);
  document.getElementById('btn-annuler').addEventListener('click', fermerModal);
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') fermerModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerModal(); });

  document.getElementById('form-tache').addEventListener('submit', async e => {
    e.preventDefault();
    const titre = document.getElementById('f-titre').value.trim();
    if (!titre) { toast('⚠️ Le titre est obligatoire', 'erreur'); return; }

    const data = {
      titre,
      desc:      document.getElementById('f-desc').value.trim(),
      categorie: document.getElementById('f-categorie').value,
      priorite:  document.getElementById('f-priorite').value,
      statut:    document.getElementById('f-statut').value,
      echeance:  document.getElementById('f-echeance').value,
      urgente:   document.getElementById('f-urgente').checked,
    };

    setChargement(true);

    try {
      if (editId !== null) {
        // --- Modifier ---
        const maj = await apiPut(editId, data);
        if (maj) {
          const idx = taches.findIndex(x => x.id === String(editId));
          if (idx !== -1) taches[idx] = { ...taches[idx], ...data };
        }
        toast('✅ Tâche modifiée avec succès', 'succes');
      } else {
        // --- Créer ---
        const nouvelle = await apiPost(data);
        if (nouvelle && !taches.find(x => x.id === nouvelle.id)) {
          taches.unshift(nouvelle);
        }
        toast('✨ Nouvelle tâche ajoutée !', 'succes');
      }

      // Resynchroniser depuis l'API pour être sûr
      const fresh = await apiGet();
      taches = fresh;
      fermerModal();
      rendreTout();

    } catch (err) {
      toast('❌ ' + err.message, 'erreur');
      console.error('Erreur enregistrement:', err);
    } finally {
      setChargement(false);
    }
  });

  document.getElementById('recherche').addEventListener('input', e => {
    filtreTexte = e.target.value;
    rendreTout();
  });

  document.getElementById('vue-kanban').addEventListener('click', () => {
    vueActuelle = 'kanban';
    document.getElementById('vue-kanban').classList.add('actif');
    document.getElementById('vue-liste').classList.remove('actif');
    document.getElementById('kanban-view').classList.remove('cache');
    document.getElementById('liste-view').classList.remove('actif');
    rendreTout();
  });
  document.getElementById('vue-liste').addEventListener('click', () => {
    vueActuelle = 'liste';
    document.getElementById('vue-liste').classList.add('actif');
    document.getElementById('vue-kanban').classList.remove('actif');
    document.getElementById('kanban-view').classList.add('cache');
    document.getElementById('liste-view').classList.add('actif');
    rendreTout();
  });

  document.querySelectorAll('.chip').forEach(chip =>
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('actif'));
      chip.classList.add('actif');
      filtreStatut = chip.dataset.filtre;
      rendreTout();
    })
  );
});

// ============================================
//   TOAST
// ============================================
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2800);
}

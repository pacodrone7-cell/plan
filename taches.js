// ============================================================
//  api/taches.js — Fonction Serverless Vercel (Node.js)
//
//  CORRECTIONS :
//  - Utilise module.exports (CommonJS) — PAS export default
//  - Persistance via un fichier JSON dans /tmp (seul dossier
//    accessible en écriture sur Vercel)
//  - CORS complet inclus
// ============================================================

const fs   = require('fs');
const path = require('path');

// /tmp est le seul dossier writable sur Vercel
const DB = path.join('/tmp', 'taches.json');

// ---- Lire les tâches depuis /tmp ----
function lireTaches() {
  try {
    if (fs.existsSync(DB)) {
      return JSON.parse(fs.readFileSync(DB, 'utf8'));
    }
  } catch (e) {
    console.error('Lecture DB échouée:', e.message);
  }
  return [];
}

// ---- Écrire les tâches dans /tmp ----
function ecrireTaches(taches) {
  try {
    fs.writeFileSync(DB, JSON.stringify(taches, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Écriture DB échouée:', e.message);
    return false;
  }
}

// ---- Handler principal ----
module.exports = function handler(req, res) {

  // ---- CORS ----
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query } = req;
  let   body = req.body || {};

  // Si le body est une string (cas rare), le parser
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  // ---- GET → retourner toutes les tâches ----
  if (method === 'GET') {
    const taches = lireTaches();
    return res.status(200).json(taches);
  }

  // ---- POST → créer une tâche ----
  if (method === 'POST') {
    if (!body.titre || body.titre.trim() === '') {
      return res.status(400).json({ erreur: 'Le champ "titre" est obligatoire.' });
    }

    const taches = lireTaches();
    const nouvelle = {
      id:        Date.now().toString(),
      titre:     body.titre.trim(),
      desc:      body.desc      || '',
      categorie: body.categorie || 'autre',
      priorite:  body.priorite  || 'moyenne',
      statut:    body.statut    || 'todo',
      echeance:  body.echeance  || '',
      urgente:   body.urgente   === true || body.urgente === 'true',
      creee:     new Date().toISOString(),
    };

    taches.unshift(nouvelle);

    if (!ecrireTaches(taches)) {
      return res.status(500).json({ erreur: 'Impossible de sauvegarder la tâche.' });
    }

    return res.status(201).json(nouvelle);
  }

  // ---- PUT → modifier une tâche (?id=xxx) ----
  if (method === 'PUT') {
    const id = query.id;
    if (!id) return res.status(400).json({ erreur: 'Paramètre "id" manquant.' });

    const taches = lireTaches();
    const idx = taches.findIndex(t => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ erreur: `Tâche "${id}" introuvable.` });
    }

    taches[idx] = {
      ...taches[idx],
      ...body,
      id, // garder le même id
      // forcer le bon type pour urgente
      urgente: body.urgente === true || body.urgente === 'true'
        ? true
        : body.urgente === false || body.urgente === 'false'
        ? false
        : taches[idx].urgente,
    };

    if (!ecrireTaches(taches)) {
      return res.status(500).json({ erreur: 'Impossible de modifier la tâche.' });
    }

    return res.status(200).json(taches[idx]);
  }

  // ---- DELETE → supprimer une tâche (?id=xxx) ----
  if (method === 'DELETE') {
    const id = query.id;
    if (!id) return res.status(400).json({ erreur: 'Paramètre "id" manquant.' });

    let taches = lireTaches();
    const avant = taches.length;
    taches = taches.filter(t => t.id !== id);

    if (taches.length === avant) {
      return res.status(404).json({ erreur: `Tâche "${id}" introuvable.` });
    }

    if (!ecrireTaches(taches)) {
      return res.status(500).json({ erreur: 'Impossible de supprimer la tâche.' });
    }

    return res.status(200).json({ message: 'Tâche supprimée.', id });
  }

  return res.status(405).json({ erreur: `Méthode "${method}" non autorisée.` });
};

# ✅ TaskMaster — Frontend + Backend Express + MongoDB Atlas

## Structure complète du projet

```
mon-projet/
│
├── frontend/
│   ├── index.html          ← Interface utilisateur
│   ├── style.css           ← Styles (thème sombre)
│   └── script.js           ← Appels API (auto local/Vercel)
│
├── backend/
│   ├── server.js           ← Serveur Express principal
│   ├── models/
│   │   └── Tache.js        ← Modèle Mongoose (structure MongoDB)
│   ├── routes/
│   │   └── taches.js       ← Routes REST (GET/POST/PUT/DELETE)
│   ├── .env                ← Clé MongoDB (NE PAS mettre sur GitHub)
│   ├── .gitignore
│   └── package.json
│
├── api/
│   └── taches.js           ← Fonction serverless (Vercel uniquement)
│
├── vercel.json
└── README.md
```

---

## 🍃 ÉTAPE 1 — Créer la base MongoDB Atlas (gratuit)

1. Va sur **https://cloud.mongodb.com** → créer un compte gratuit
2. Clique **"Build a Database"** → choisis **M0 (Free)**
3. Région → choisis la plus proche (ex: Europe Paris)
4. Clique **"Create"**

### Créer un utilisateur base de données
5. Menu gauche → **Database Access** → **Add New Database User**
6. Méthode : **Password**
7. Username : `admin` / Password : `monMotDePasse123` (note-le !)
8. Role : **"Atlas admin"** → **Add User**

### Autoriser ton IP
9. Menu gauche → **Network Access** → **Add IP Address**
10. Clique **"Allow Access From Anywhere"** (`0.0.0.0/0`) → **Confirm**

### Copier l'URI de connexion
11. Menu gauche → **Database** → **Connect** → **Drivers**
12. Sélectionne **Node.js** → copie l'URI qui ressemble à :
    ```
    mongodb+srv://admin:monMotDePasse123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    ```
13. Ouvre `backend/.env` et remplace la valeur de `MONGODB_URI` :
    ```
    MONGODB_URI=mongodb+srv://admin:monMotDePasse123@cluster0.xxxxx.mongodb.net/taskmaster?retryWrites=true&w=majority
    ```
    ⚠️ Ajoute `/taskmaster` avant le `?` (c'est le nom de ta base de données)

---

## 🚀 ÉTAPE 2 — Lancer le backend en local

```bash
# 1. Ouvrir un terminal dans VS Code
cd backend

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur (avec rechargement automatique)
npm run dev
```

Tu dois voir :
```
✅ MongoDB connecté avec succès
🚀 Serveur TaskMaster démarré !
   → API locale : http://localhost:5000/api/taches
   → Santé      : http://localhost:5000/api/health
```

---

## 🌐 ÉTAPE 3 — Lancer le frontend

Dans VS Code, **clic droit** sur `frontend/index.html` → **"Open with Live Server"**

Le frontend détecte automatiquement qu'il est en local et appelle :
`http://localhost:5000/api/taches`

---

## 🧪 Tester l'API manuellement

Une fois le backend démarré, tu peux tester avec ton navigateur ou un outil comme **Thunder Client** (extension VS Code) :

| Action | Méthode | URL |
|--------|---------|-----|
| Lister tâches | GET | http://localhost:5000/api/taches |
| Vérifier serveur | GET | http://localhost:5000/api/health |
| Créer tâche | POST | http://localhost:5000/api/taches |
| Modifier tâche | PUT | http://localhost:5000/api/taches/:id |
| Supprimer tâche | DELETE | http://localhost:5000/api/taches/:id |

**Exemple corps POST (JSON) :**
```json
{
  "titre": "Ma première tâche",
  "categorie": "travail",
  "priorite": "haute",
  "statut": "todo"
}
```

---

## ☁️ Déployer sur Vercel (production)

Le dossier `api/` contient la fonction serverless pour Vercel.
Pour la production, ajoute la variable `MONGODB_URI` dans Vercel :

1. Vercel → ton projet → **Settings** → **Environment Variables**
2. Ajoute : `MONGODB_URI` = ton URI MongoDB Atlas
3. Redéploie

---

## 📦 Dépendances backend

| Package | Rôle |
|---------|------|
| `express` | Serveur web / routeur |
| `mongoose` | ORM MongoDB (modèles, validation) |
| `cors` | Autorise le frontend à appeler l'API |
| `dotenv` | Charge les variables du fichier `.env` |
| `nodemon` | Redémarre le serveur automatiquement |

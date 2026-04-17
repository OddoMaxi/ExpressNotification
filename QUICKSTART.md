# Système de Notification SMS - Passeport Express

## 🚀 Démarrage rapide

### 1. Cloner le projet

```bash
cd c:\Users\HP\Documents\Notification
```

### 2. Backend (Node.js/Express + SQLite)

```bash
cd backend

# Installer les dépendances
npm install

# Copier et configurer le fichier .env
copy .env.example .env

# Configurer les credentials SMS et l'URL Iris dans .env
# SMS_USER, SMS_HASH, IRIS_API_URL, etc.

# Démarrer le serveur
npm start
# Serveur sera disponible sur http://localhost:5000
```

### 3. Frontend (React)

Dans un autre terminal :

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer l'application
npm start
# Application sera disponible sur http://localhost:3000
```

## 📋 Fonctionnalités

### ✅ Enregistrement de demandeurs
- Formulaire complet : référence de reçu, nom, prénom, téléphone, email
- Stockage en base SQLite
- Validation des données

### ✅ Vérification de statut
- Appel à l'API Iris avec la référence de reçu
- Récupération du statut de la demande

### ✅ Notification SMS personnalisée
- Génération automatique du message selon le statut
- Envoi via l'API SMS Interactgroup
- Enregistrement de chaque envoi

### ✅ Tableaux de bord
- Statistiques en temps réel
- Historique des SMS envoyés
- État des notifications

## 🔌 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/registration` | Enregistrer un demandeur |
| GET | `/api/registration` | Lister tous les demandeurs |
| GET | `/api/registration/:id` | Détails d'un demandeur |
| PUT | `/api/registration/:id` | Mettre à jour un demandeur |
| POST | `/api/status/check` | Vérifier statut et envoyer SMS |
| GET | `/api/status/:id` | Dernier statut connu |
| GET | `/api/notification/:id` | Historique SMS |
| GET | `/api/notification/stats/summary` | Statistiques |
| GET | `/api/health` | Santé de l'API |

## 🗄️ Structure de la base de données

```
demandeurs
├── id (INT, PK)
├── reference_recu (TEXT, UNIQUE)
├── nom (TEXT)
├── prenom (TEXT)
├── telephone (TEXT)
├── email (TEXT)
├── statut (TEXT)
├── date_enregistrement (DATETIME)
└── date_mise_a_jour (DATETIME)

notifications_sms
├── id (INT, PK)
├── demandeur_id (INT, FK)
├── statut_iris (TEXT)
├── message (TEXT)
├── numero_telephone (TEXT)
├── statut_envoi (TEXT)
├── response_api_sms (JSON)
└── date_envoi (DATETIME)

audit_log
├── id (INT, PK)
├── action (TEXT)
├── demandeur_id (INT)
├── details (TEXT)
└── date_action (DATETIME)
```

## 📱 Exemple d'utilisation

### 1. Enregistrer un demandeur
```bash
POST /api/registration
Content-Type: application/json

{
  "reference_recu": "REC-2024-001",
  "nom": "Diallo",
  "prenom": "Mamadou",
  "telephone": "+224624062984",
  "email": "mamadou@example.com"
}
```

### 2. Vérifier le statut et envoyer SMS
```bash
POST /api/status/check
Content-Type: application/json

{
  "demandeur_id": 1,
  "reference_recu": "REC-2024-001"
}
```

### 3. Consulter les statistiques
```bash
GET /api/notification/stats/summary
```

## 🔧 Configuration avancée

### Variables d'environnement (.env)

```env
# Serveur
PORT=5000
NODE_ENV=development

# SMS Interactgroup
SMS_API_URL=http://sms.interactgroup.net/index.php?app=ws
SMS_USER=louba
SMS_HASH=97962ccc0add0f87b0570561acc59b45
SMS_FROM=LOUBA

# API Iris
IRIS_API_URL=http://your-iris-url.com/api
IRIS_API_KEY=your_key_here

# Base de données
DB_PATH=./data/notifications.db
```

## 📊 Statuts Iris supportés

| Statut | Message | Emoji |
|--------|---------|-------|
| `approuve` | Félicitations, demande approuvée | ✅ |
| `en_attente` | Demande en attente de traitement | ⏳ |
| `rejectee` | Demande rejetée | ❌ |
| `en_cours_de_traitement` | En cours de traitement | 🔄 |
| `pret_pour_retrait` | URGENT: Prêt pour retrait | 🚨 |

## 🛡️ Sécurité

- ✅ Validation des entrées
- ✅ Logging de tous les accès
- ✅ Gestion des erreurs
- ⚠️ À ajouter : Authentification API
- ⚠️ À ajouter : Rate limiting
- ⚠️ À ajouter : Chiffrement des données sensibles

## 📝 Documentation

- [README complet](./docs/README.md) - Documentation détaillée
- [API Iris](./docs/API_IRIS.md) - À fournir par vos soins

## 🐛 Troubleshooting

**Port 5000 déjà utilisé** :
```bash
# Changer le port dans .env
PORT=5001
```

**Erreur SQLite** :
```bash
# Vérifier les permissions d'accès
# Supprimer data/notifications.db et relancer
```

**SMS non envoyé** :
- Vérifier les credentials SMS dans .env
- Vérifier le format du téléphone
- Consulter les logs

## 📞 Support

Pour la documentation détaillée de l'API Iris, veuillez la fournir en mettant à jour `docs/API_IRIS.md`.

---

**Status**: 🟢 Prêt pour le développement
**Version**: 1.0.0
**Dernière mise à jour**: 2024

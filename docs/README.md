# Système de Notification SMS - Passeport Express

## Vue d'ensemble

Ce système automatise les notifications SMS pour les demandeurs de passeport express selon le flux suivant :

1. **Enregistrement des demandeurs** : L'agent collecte les informations (référence de reçu, nom, prénom, téléphone, email)
2. **Stockage en BD** : Les données sont enregistrées dans SQLite
3. **Vérification du statut** : Appel à l'API Iris pour obtenir le statut de la demande
4. **Notification SMS** : Envoi d'un SMS personnalisé basé sur le statut via l'API SMS Interactgroup

## Architecture

```
notification-sms/
├── backend/                    # API Node.js/Express
│   ├── server.js              # Point d'entrée principal
│   ├── database.js            # Gestion SQLite
│   ├── package.json           # Dépendances
│   ├── .env.example           # Variables d'environnement
│   ├── services/
│   │   ├── irisService.js     # Intégration API Iris
│   │   └── smsService.js      # Intégration API SMS
│   └── routes/
│       ├── registration.js    # Endpoints d'enregistrement
│       ├── status.js          # Endpoints de vérification de statut
│       └── notification.js    # Endpoints de notifications
│
├── frontend/                   # Application React
│   ├── public/
│   │   └── index.html         # HTML racine
│   ├── src/
│   │   ├── App.js             # Composant principal
│   │   ├── index.js           # Point d'entrée React
│   │   ├── services/
│   │   │   └── api.js         # Client API
│   │   └── components/
│   │       ├── RegistrationForm.js      # Formulaire d'enregistrement
│   │       ├── StatusChecker.js         # Vérification de statut
│   │       └── Statistics.js            # Affichage des statistiques
│   └── package.json           # Dépendances
│
└── docs/                       # Documentation
    └── API_IRIS.md            # Documentation API Iris (à ajouter)
```

## Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Modifier .env avec vos credentials SMS et l'URL de l'API Iris
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Le frontend sera disponible sur `http://localhost:3000`
L'API sera disponible sur `http://localhost:5000`

## Configuration

### Fichier .env (Backend)

```env
PORT=5000
NODE_ENV=development

# API SMS - Interactgroup
SMS_API_URL=http://sms.interactgroup.net/index.php?app=ws
SMS_USER=louba
SMS_HASH=97962ccc0add0f87b0570561acc59b45
SMS_FROM=LOUBA

# API Iris
IRIS_API_URL=http://your-iris-api-url.com
IRIS_API_KEY=your_api_key

# Base de données
DB_PATH=./data/notifications.db
```

## Endpoints API

### Enregistrement

- **POST** `/api/registration` - Enregistrer un nouveau demandeur
  ```json
  {
    "reference_recu": "REC-2024-001",
    "nom": "Diallo",
    "prenom": "Mamadou",
    "telephone": "+224624062984",
    "email": "mamadou@example.com"
  }
  ```

- **GET** `/api/registration` - Lister tous les demandeurs
- **GET** `/api/registration/:id` - Récupérer un demandeur
- **PUT** `/api/registration/:id` - Mettre à jour un demandeur

### Vérification de Statut

- **POST** `/api/status/check` - Vérifier le statut et envoyer SMS
  ```json
  {
    "demandeur_id": 1,
    "reference_recu": "REC-2024-001"
  }
  ```

- **GET** `/api/status/:demandeur_id` - Récupérer le dernier statut

### Notifications

- **GET** `/api/notification/:demandeur_id` - Historique des SMS
- **GET** `/api/notification/stats/summary` - Statistiques globales

## Base de Données

### Table: demandeurs
```sql
- id (INTEGER, PRIMARY KEY)
- reference_recu (TEXT, UNIQUE)
- nom (TEXT)
- prenom (TEXT)
- telephone (TEXT)
- email (TEXT)
- statut (TEXT) - en_attente, en_cours, approuve, rejectee, etc.
- date_enregistrement (DATETIME)
- date_mise_a_jour (DATETIME)
```

### Table: notifications_sms
```sql
- id (INTEGER, PRIMARY KEY)
- demandeur_id (INTEGER, FOREIGN KEY)
- statut_iris (TEXT)
- message (TEXT)
- numero_telephone (TEXT)
- statut_envoi (TEXT) - envoye, erreur
- response_api_sms (TEXT)
- date_envoi (DATETIME)
```

### Table: audit_log
```sql
- id (INTEGER, PRIMARY KEY)
- action (TEXT)
- demandeur_id (INTEGER)
- details (TEXT)
- date_action (DATETIME)
```

## Flux de notification SMS

1. L'agent enregistre un demandeur via le frontend
2. Les données sont stockées en base de données
3. Quand un statut doit être notifié :
   - L'API Iris est appelée avec la référence de reçu
   - Le service `irisService.js` récupère le statut
   - Le service `smsService.js` personnalise le message selon le statut
   - Un SMS est envoyé via l'API Interactgroup
   - L'envoi est enregistré dans la table `notifications_sms`

## Statuts Iris supportés

- `approuve` ✅ - Demande approuvée
- `en_attente` ⏳ - En attente de traitement
- `rejectee` ❌ - Demande rejetée
- `en_cours_de_traitement` 🔄 - En cours de traitement
- `pret_pour_retrait` 🚨 - Prêt pour retrait

Chaque statut génère un message SMS personnalisé adapté.

## Intégration API Iris

📝 **À faire** : Veuillez fournir la documentation API Iris pour :
- L'URL exacte de l'endpoint
- Le format de l'authentification
- Les paramètres requis
- Le format de la réponse
- Les statuts possibles retournés

Une fois obtenue, mettez à jour `backend/services/irisService.js` en conséquence.

## Intégration API SMS

L'API SMS Interactgroup utilise les paramètres suivants :
- `app=ws` - Service web
- `u` - Username (SMS_USER)
- `h` - Hash d'authentification (SMS_HASH)
- `op=pv` - Operation private
- `to` - Numéro de destinataire
- `msg` - Message à envoyer
- `from` - Expediteur (SMS_FROM)

Exemple : 
```
http://sms.interactgroup.net/index.php?app=ws&u=louba&h=97962ccc0add0f87b0570561acc59b45&op=pv&to=224624062984&msg=test+only&from=LOUBA
```

## Sécurité

⚠️ **Points à considérer** :
- Ne pas committer les fichiers .env avec les credentials réels
- Utiliser des variables d'environnement en production
- Valider/sanitizer toutes les entrées utilisateur
- Implémenter l'authentification pour l'API backend
- Chiffrer les numéros de téléphone sensibles
- Logger tous les accès SMS envoyés

## Tests

Pour tester le système :

1. Démarrer le backend : `npm start` (dans `/backend`)
2. Démarrer le frontend : `npm start` (dans `/frontend`)
3. Enregistrer un demandeur via le formulaire
4. Vérifier le statut et envoyer un SMS
5. Consulter les statistiques

## Troubleshooting

**Erreur de connexion à l'API Iris** :
- Vérifier l'URL dans .env
- Vérifier la clé API Iris
- Consulter les logs du backend

**SMS non envoyé** :
- Vérifier les credentials SMS dans .env
- Vérifier que le numéro de téléphone est au bon format
- Consulter les logs dans la table `notifications_sms`

**Base de données verrouillée** :
- Fermer toutes les connexions
- Vérifier les permissions d'accès au fichier DB

## Prochain pas

1. Intégrez la documentation API Iris fournie
2. Testez avec des données réelles
3. Mettez en place l'authentification backend
4. Configurez les logs centralisés
5. Déploiez en production

---

Pour toute question, consultez la documentation des API ou contactez votre administrateur.

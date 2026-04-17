# Configuration Complète - Credentials et Endpoints

## 🔐 Credentials SMS (Interactgroup)

```
Service:   SMS Gateway Interactgroup
Website:   https://sms.interactgroup.net

Login Interactgroup:
  Username: louba
  Password: 624062984

API Parameters:
  app:   ws
  u:     louba
  h:     97962ccc0add0f87b0570561acc59b45
  op:    pv
  from:  LOUBA
```

---

## 🔐 Credentials API Iris (Guinea GCPIS)

```
Service:   Central MOFA Notification API
Version:   1.0.3.0
URL:       http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification

Authentication:
  Username: MOFA
  Password: M0fa2025!
  Token:    Bearer [auto-generated]
  Duration: 12 hours
```

---

## 📋 Endpoints API

### IRIS - Token Generation
```
POST http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification/api/auth/token

Body:
{
  "username": "MOFA",
  "password": "M0fa2025!"
}

Response:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 12
}
```

### IRIS - Notification Retrieval
```
POST http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification/api/cig/ListNotifyApplication

Header:
  Authorization: Bearer {{token}}

Body:
{
  "TicketNumber": "F20250603000",
  "StartSubmissionDate": "2025-10-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": ""
}

Valid Application Status:
  - Pending Final Approval
  - Final Approval Passed
  - Final Approval Rejected
  - Production Completed

Response: HTTP 200 OK
{
  "TicketNumber": "...",
  "ApplicantName": "...",
  "ApplicationStatus": "...",
  ...
}
```

### SMS - Send SMS
```
GET http://sms.interactgroup.net/index.php?
  app=ws&
  u=louba&
  h=97962ccc0add0f87b0570561acc59b45&
  op=pv&
  to=224624062984&
  msg=Hello+World&
  from=LOUBA

Response:
  [ID du message] (numérique)

Format numéro: 224XXXXXXXXX (11 chiffres)
```

---

## 🖥️ Fichiers .env à Configurer

### Backend - `backend/.env`

```env
## Server Configuration
PORT=5000
NODE_ENV=development

## SMS Interactgroup Configuration
SMS_API_URL=http://sms.interactgroup.net/index.php
SMS_USER=louba
SMS_HASH=97962ccc0add0f87b0570561acc59b45
SMS_FROM=LOUBA

## API Iris - Guinea GCPIS MOFA
IRIS_BASE_URL=http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification
IRIS_USERNAME=MOFA
IRIS_PASSWORD=M0fa2025!

## Database
DB_PATH=./data/notifications.db
```

### Frontend - `frontend/.env.local`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📝 Statuts SMS Mapping

| Statut Iris | SMS Envoyé au Demandeur |
|-------------|------------------------|
| **Pending Final Approval** | ⏳ Votre demande est EN ATTENTE d'approbation finale |
| **Final Approval Passed** | ✅ Félicitations ! Votre passeport a été APPROUVÉ |
| **Final Approval Rejected** | ❌ Votre demande a été REJETÉE. Contactez le MOFA |
| **Production Completed** | 🚨 URGENT! Votre passeport est PRÊT pour retrait |

---

## 🧪 Test Rapide

### Test 1: Vérifier la Santé de l'API Backend

```bash
curl http://localhost:5000/api/health
```

Réponse attendue:
```json
{
  "status": "OK",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### Test 2: Enregistrer un Demandeur

```bash
curl -X POST http://localhost:5000/api/registration \
  -H "Content-Type: application/json" \
  -d '{
    "reference_recu": "REC-2026-001",
    "nom": "Diallo",
    "prenom": "Mamadou",
    "telephone": "+224624062984",
    "email": "mamadou@example.com"
  }'
```

### Test 3: Vérifier le Statut

```bash
curl -X POST http://localhost:5000/api/status/check \
  -H "Content-Type: application/json" \
  -d '{
    "demandeur_id": 1,
    "ticket_number": "F20250603000"
  }'
```

---

## 🚢 Ports Utilisés

| Port | Service | URL |
|------|---------|-----|
| **3000** | Frontend React | http://localhost:3000 |
| **5000** | Backend API | http://localhost:5000 |
| **80** | SMS API (Interactgroup) | http://sms.interactgroup.net |
| **443** | SMS Dashboard | https://sms.interactgroup.net |
| **80** | IRIS API (Guinée) | http://172.16.4.57 |

---

## ⚡ Commandes Utiles

```bash
# Backend
cd backend
npm install      # Installer dépendances
npm start        # Démarrer serveur
npm run dev      # Mode développement avec nodemon

# Frontend
cd frontend
npm install      # Installer dépendances
npm start        # Démarrer dev server
npm run build    # Build pour production

# Base de données (Backend)
# SQLite se crée automatiquement dans backend/data/notifications.db
```

---

## 📦 Dépendances Principales

### Backend
- **express**: Framework web
- **sqlite3**: Base de données
- **axios**: Client HTTP
- **express-validator**: Validation données
- **dotenv**: Gestion variables d'environnement

### Frontend
- **react**: UI framework
- **react-router-dom**: Routing
- **axios**: Client HTTP

---

## 🔄 Flux Complet de Notification

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ENREGISTREMENT (Agent)                                   │
│    ↓                                                         │
│    Demandeur: nom, prénom, tél, email                      │
│    ↓                                                         │
│    Stockage SQLite                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VÉRIFICATION (Agent)                                     │
│    ↓                                                         │
│    Numéro de Ticket Payment Ref (ex: F20250603000)         │
│    ↓                                                         │
│    Appel API Iris MOFA                                      │
│    ↓                                                         │
│    Récupère: ApplicationStatus                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. NOTIFICATION SMS (Système)                               │
│    ↓                                                         │
│    Génère message personnalisé selon statut                │
│    ↓                                                         │
│    Appel API SMS Interactgroup                              │
│    ↓                                                         │
│    Envoie SMS au demandeur (224XXXXXXXXX)                  │
│    ↓                                                         │
│    Enregistre résultat en BD                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CONFIRMATION (Demandeur)                                 │
│    ↓                                                         │
│    ✅ SMS reçu sur téléphone                               │
│                                                              │
│    "Bonjour Mamadou, Félicitations ! Votre                 │
│    demande de passeport (Réf: REC-2026-001)                │
│    a été APPROUVÉE. Veuillez vous présenter                │
│    au guichet pour retirer votre passeport."               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Objectifs Atteints

✅ Enregistrement des demandeurs (nom, prénom, tél, email)  
✅ Stockage en BD SQLite  
✅ Intégration API Iris/GCPIS (Guinea MOFA)  
✅ Intégration API SMS (Interactgroup)  
✅ Gestion des tokens d'authentification  
✅ Messages SMS personnalisés par statut  
✅ Historique et statistiques  
✅ Interface web (React)  
✅ API REST (Express)

---

**Version:** 1.0.0  
**Dernière Mise à Jour:** 16 AVR 2026  
**Statut:** 🟢 Production Ready  
**Environnement:** Guinée GCPIS Passeport Express

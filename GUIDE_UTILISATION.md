# 🚀 Guide de Démarrage - Système de Notification SMS Guinée

## Installation Rapide

### 1. Prérequis
- **Node.js** v14+ et npm
- **Git** (optionnel)
- Accès à l'API Iris: `http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification`
- Accès à l'API SMS: `http://sms.interactgroup.net`

### 2. Configuration Initiale

```bash
# Cloner ou télécharger le projet
cd c:\Users\HP\Documents\Notification

# Installer les dépendances
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configuration des Fichiers .env

#### Backend - `backend/.env`

```env
PORT=5000
NODE_ENV=development

# API SMS - Interactgroup (Guinée)
SMS_API_URL=http://sms.interactgroup.net/index.php
SMS_USER=louba
SMS_HASH=97962ccc0add0f87b0570561acc59b45
SMS_FROM=LOUBA

# API Iris - Guinea GCPIS MOFA
IRIS_BASE_URL=http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification
IRIS_USERNAME=MOFA
IRIS_PASSWORD=M0fa2025!

# Base de données
DB_PATH=./data/notifications.db
```

#### Frontend - `frontend/.env.local`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Lancer l'Application

#### Option 1: Scripts Windows

```bash
# Double-cliquer sur start.bat
start.bat
```

Cela ouvrira deux fenêtres de commande:
- **Fenêtre 1:** Backend (port 5000)
- **Fenêtre 2:** Frontend (port 3000)

#### Option 2: Démarrage Manuel

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# ✅ Serveur disponible sur http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# ✅ Application disponible sur http://localhost:3000
```

### 5. Accès à l'Application

```
🌐 Frontend:  http://localhost:3000
🔌 API:       http://localhost:5000
📊 Santé API: http://localhost:5000/api/health
```

---

## 🎯 Utilisation

### Enregistrer un Demandeur

1. Aller sur **http://localhost:3000**
2. Remplir le formulaire "Enregistrement d'un demandeur":
   - **Référence de Reçu**: Le code unique du reçu de paiement
   - **Nom/Prénom**: Nom et prénom du demandeur
   - **Téléphone**: Numéro (format: +224XXXXXXXXX ou 224XXXXXXXXX)
   - **Email**: Adresse email
3. Cliquer sur "Enregistrer le demandeur"
4. ✅ Confirmations s'afficheront

### Vérifier le Statut et Envoyer SMS

1. Coller le formulaire "Vérifier le statut et envoyer SMS":
   - **ID du Demandeur**: L'ID du demandeur enregistré (ex: 1)
   - **Numéro de Ticket (Payment Ref)**: Le ticket reference de l'API Iris (format: F20250603000)
2. Cliquer sur "🔍 Vérifier et envoyer SMS"
3. Le système:
   - 🔑 Génère un token d'authentification Iris
   - 📤 Interroge l'API Iris avec le ticket number
   - 📨 Génère un message personnalisé selon le statut
   - 📱 Envoie le SMS via Interactgroup
   - ✅ Affiche le résultat

### Consulter les Statistiques

- **Nombre total de demandeurs**: Afficheur dans le tableau de bord
- **SMS totaux envoyés**: Compteur général
- **SMS réussis/échoués**: Répartition par état
- **Répartition par statut Iris**: Graphique des statuts

### Lister les Demandeurs

- Cliquer sur "📋 Charger la liste"
- Voir tous les demandeurs enregistrés dans un tableau

---

## 📋 Endpoints API

### Enregistrement
```bash
POST /api/registration
```
Enregistrer un nouveau demandeur

```json
{
  "reference_recu": "REC-2024-001",
  "nom": "Diallo",
  "prenom": "Mamadou",
  "telephone": "+224624062984",
  "email": "mamadou@example.com"
}
```

### Vérification de Statut
```bash
POST /api/status/check
```
Vérifier le statut et envoyer SMS

```json
{
  "demandeur_id": 1,
  "ticket_number": "F20250603000"
}
```

### Statistiques
```bash
GET /api/notification/stats/summary
```
Récupérer les statistiques globales

---

## 🔑 Statuts Possibles de l'API Iris

Selon la documentation UAT GCPIS, les statuts retournés sont:

| Statut | Message SMS |
|--------|------------|
| **Pending Final Approval** | ⏳ Demande en attente d'approbation finale |
| **Final Approval Passed** | ✅ Demande approuvée ! Veuillez vous présenter au guichet |
| **Final Approval Rejected** | ❌ Demande rejetée. Contactez le MOFA |
| **Production Completed** | 🚨 URGENT! Votre passeport est prêt pour retrait |

---

## 📱 Format SMS

Les SMS envoyés via Interactgroup au demandeur:

```
Bonjour Mamadou, Félicitations ! Votre demande de passeport (Réf: REC-2024-001) a été APPROUVÉE. Veuillez vous présenter au guichet pour retirer votre passeport.
```

---

## 🔧 Configuration Avancée

### Changer le Port Backend
```env
PORT=8000  # Au lieu de 5000
```

### Changer le Chemin de la Base de Données
```env
DB_PATH=C:/databases/notifications.db
```

### Augmenter le Timeout de L'API Iris
Éditer `backend/services/irisService.js`:
```javascript
const irisApi = axios.create({
  baseURL: process.env.IRIS_BASE_URL,
  timeout: 20000  // 20 secondes au lieu de 10
});
```

---

## ⚠️ Troubleshooting

### Erreur: "Cannot GET /api/registration"
- ✅ Vérifier que le backend est démarré (npm start)
- ✅ Vérifier que le port 5000 est accessible

### Erreur: "Authorization has been denied"
- ✅ Vérifier IRIS_USERNAME et IRIS_PASSWORD dans .env
- ✅ Vérifier la connectivité avec 172.16.4.57
- ✅ Vérifier que le token n'a pas expiré

### Erreur: "Invalid credentials" SMS
- ✅ Vérifier SMS_USER et SMS_HASH dans .env
- ✅ Vérifier le format du numéro de téléphone (224XXXXXXXXX)

### SMS non reçu
- ✅ Vérifier le numéro de téléphone du demandeur
- ✅ Vérifier les crédits SMS (https://sms.interactgroup.net)
- ✅ Vérifier les logs du backend

### Port 5000 ou 3000 déjà utilisé
```powershell
# Trouver le processus
netstat -ano | findstr :5000

# Tuer le processus (exemple PID 1234)
taskkill /PID 1234 /F
```

### Erreur "ENOENT" avec SQLite
- ✅ Créer le répertoire `backend/data/`
- ✅ Vérifier les permissions d'accès au répertoire

---

## 📊 Monitoring

### Vérifier la Santé de L'API
```bash
curl http://localhost:5000/api/health
```

### Vue du Dashboard SMS (Interactgroup)
```
URL: https://sms.interactgroup.net
User: louba
Pass: 624062984
```

Consulter:
- ✅ Historique des SMS envoyés
- ✅ Crédits disponibles
- ✅ Rapports de livraison
- ✅ Logs d'erreur

---

## 📚 Documentation Disponible

- **README.md** - Vue d'ensemble du système
- **API_IRIS.md** - Spécifications complètes API Iris/GCPIS
- **SMS_API.md** - Spécifications SMS Interactgroup

---

## 🔐 Sécurité

✅ **À FAIRE:**
- Ne pas committer les fichiers .env
- Changer les passwords en production
- Activer HTTPS en production
- Implémenter l'authentification utilisateur
- Chiffrer les numéros de téléphone

---

## 📞 Support

**Pour l'API Iris:** Contacter l'équipe MOFA  
**Pour l'API SMS:** Consulter https://sms.interactgroup.net  
**Support Local:** Votre administrateur système

---

**Version:** 1.0.0  
**Dernière mise à jour:** 16 AVR 2026  
**Status:** 🟢 Production Ready

# API IRIS - Guinea GCPIS MOFA
## Documentation Technique

**Source:** UAT/PIS/PCR025/0100 - User Acceptance Test  
**Version:** 01.00  
**Date:** 11 DEC 2025  
**API Version:** Central MOFA Notification API 1.0.3.0

---

## 1. Configuration Générale

### Base URL
```
http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification
```

### Authentification
- **Type:** Token Bearer (JWT)
- **Header:** `Authorization: Bearer {{token}}`
- **Durée de validité:** 12 heures (configurable)

### Credentials Par Défaut
```
Username: MOFA
Password: M0fa2025!
```

---

## 2. Token Generation API

### Endpoint
```
POST /api/auth/token
```

### Description
Génère un token d'authentification pour accéder aux autres endpoints de l'API.

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "username": "MOFA",
  "password": "M0fa2025!"
}
```

### Response (HTTP 200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 12
}
```

### Response Errors
- **HTTP 401:** Identifiants invalides - "Response status is error, invalid credentials"
- **Note:** `expires_in` est en heures

### Exemple (cURL)
```bash
curl -X POST http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "MOFA",
    "password": "M0fa2025!"
  }'
```

---

## 3. Notification Retrieval API

### Endpoint
```
POST /api/cig/ListNotifyApplication
```

### Description
Récupère la liste des notifications de demandes de passeport en fonction des critères de recherche.

### Headers
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

### Request Body

```json
{
  "TicketNumber": "F20250603000",
  "StartSubmissionDate": "2025-10-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": "Production Completed"
}
```

### Paramètres

| Paramètre | Type | Format | Obligatoire | Description |
|-----------|------|--------|-------------|-------------|
| `TicketNumber` | string | - | Non | Numéro de ticket (Payment Reference No.) |
| `StartSubmissionDate` | string | yyyy-mm-dd | Conditionnel* | Date de début de plage |
| `EndSubmissionDate` | string | yyyy-mm-dd | Conditionnel* | Date de fin de plage |
| `ApplicationStatus` | string | - | Conditionnel* | Statut de l'application |

**\*Note de compatibilité:**
- Au moins UN paramètre doit être fourni
- Si `ApplicationStatus` est fourni, les dates sont obligatoires
- Plage de date maximale: 3 mois (configurable)
- Format date: `yyyy-mm-dd` (ex: `2025-10-01`)

### Statuts Application Valides

```
1. Pending Final Approval              ⏳
2. Final Approval Passed               ✅
3. Final Approval Rejected             ❌
4. Production Completed                🚨
```

### Response (HTTP 200 OK)

Example de réponse réussie:
```json
{
  "TicketNumber": "F20250603000",
  "ApplicantName": "DIALLO Mamadou",
  "PassportNumber": "N12345678",
  "ApplicationStatus": "Production Completed",
  "SubmissionDate": "2025-10-15",
  "ApplicationStatusUpdatedDate": "2025-12-10"
}
```

### Response Errors

**HTTP 400 Bad Request:**
```json
{
  "error": "Date range exceeds maximum allowed period of 3 months"
}
```

Possibles erreurs:
- Date range > 3 mois
- Format date invalide (doit être yyyy-mm-dd)
- ApplicationStatus invalide
- Aucun paramètre fourni

**HTTP 401 Unauthorized:**
```
Authorization has been denied for this request
```
- Token absent
- Token invalide
- Token expiré

---

## 4. Cas d'Usage et Exemples

### 4.1 Recherche par Ticket Number

**Request:**
```bash
curl -X POST http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification/api/cig/ListNotifyApplication \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{token}}" \
  -d '{
    "TicketNumber": "F20250603000",
    "StartSubmissionDate": "",
    "EndSubmissionDate": "",
    "ApplicationStatus": ""
  }'
```

**Response:** HTTP 200 OK avec les détails

### 4.2 Recherche par Plage de Date (< 3 mois)

**Request:**
```json
{
  "TicketNumber": "",
  "StartSubmissionDate": "2025-10-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": ""
}
```

**Response:** HTTP 200 OK avec les enregistrements correspondants

### 4.3 Recherche par Statut + Date

**Request:**
```json
{
  "TicketNumber": "",
  "StartSubmissionDate": "2025-10-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": "Production Completed"
}
```

**Response:** HTTP 200 OK

### 4.4 Recherche Combinée

**Request:**
```json
{
  "TicketNumber": "F20250603000",
  "StartSubmissionDate": "2025-10-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": "Production Completed"
}
```

**Response:** HTTP 200 OK

### 4.5 Erreur: Plage de Date > 3 mois

**Request:**
```json
{
  "TicketNumber": "",
  "StartSubmissionDate": "2025-06-01",
  "EndSubmissionDate": "2025-12-01",
  "ApplicationStatus": ""
}
```

**Response:** HTTP 400 Bad Request

### 4.6 Erreur: Format Date Invalide

**Request:**
```json
{
  "TicketNumber": "",
  "StartSubmissionDate": "01/01/2025",
  "EndSubmissionDate": "01/03/2025",
  "ApplicationStatus": ""
}
```

**Response:** HTTP 400 Bad Request

### 4.7 Erreur: Sans Token

**Response:** HTTP 401 Unauthorized - "Authorization has been denied for this request"

### 4.8 Erreur: Token Invalide/Expiré

**Response:** HTTP 401 Unauthorized - "Authorization has been denied for this request"

---

## 5. Environnement de Test

| Élément | Valeur |
|---------|--------|
| **OS** | Windows Server 2012 R2 |
| **Database** | Microsoft SQL Server (Schema: GCPISCentral_MSSQL v1.2.7.4) |
| **.Net Framework** | MS .Net Framework 4.00 |
| **API Tool** | Postman 11.72.9 |

---

## 6. Configuration Backend Node.js

### .env Requiert

```env
# API Iris - Guinea GCPIS MOFA
IRIS_BASE_URL=http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification
IRIS_USERNAME=MOFA
IRIS_PASSWORD=M0fa2025!
```

### Code Exemple (Node.js)

```javascript
const axios = require('axios');

// Créer une instance API
const irisApi = axios.create({
  baseURL: 'http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// 1. Générer le token
const tokenResponse = await irisApi.post('/api/auth/token', {
  username: 'MOFA',
  password: 'M0fa2025!'
});

const token = tokenResponse.data.access_token;

// 2. Récupérer les notifications
const notifResponse = await irisApi.post(
  '/api/cig/ListNotifyApplication',
  {
    TicketNumber: 'F20250603000',
    StartSubmissionDate: '',
    EndSubmissionDate: '',
    ApplicationStatus: ''
  },
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

console.log(notifResponse.data);
```

---

## 7. Points Importants

✅ **À FAIRE:**
- Toujours inclure le Bearer token dans le header Authorization
- Gérer les tokens avec expiration (renouveler avant 1 minute de fin)
- Respecter la limite de 3 mois pour les plages de date
- Valider les dates en format yyyy-mm-dd
- Implémenter la gestion d'erreur pour les réponses 400/401

❌ **À ÉVITER:**
- Ne pas utiliser le statut sans les dates (sera rejeté)
- Ne pas dépasser 3 mois de plage de date
- Ne pas utiliser de format de date différent (MM/DD/YYYY, etc.)
- Ne pas oublier le token dans le header

---

## 8. Référence Documentaire

- **Document Reference:** GINEPP-PCR-025v002_API_3rdParty_Notification_20251205
- **UAT Document:** UAT/PIS/PCR025/0100 v01.00
- **API Version:** Central MOFA Notification API 1.0.3.0
- **Status:** User Acceptance Testing Complete

---

## 9. Troubleshooting

| Erreur | Cause | Solution |
|--------|-------|----------|
| HTTP 401 | Token absent/expiré | Générer un nouveau token |
| HTTP 400 (Date Range) | Plage > 3 mois | Réduire la plage à max 3 mois |
| HTTP 400 (Invalid Date) | Format invalide | Utiliser format yyyy-mm-dd |
| HTTP 400 (Status seul) | ApplicationStatus sans date | Ajouter StartSubmissionDate et EndSubmissionDate |
| Connection Refused | Serveur indisponible | Vérifier http://172.16.4.57:GCPIS/... |
| Invalid Credentials | Username/Password incorrect | Vérifier MOFA / M0fa2025! |

---

**Dernière mise à jour:** 11 DEC 2025  
**Maintenu par:** Équipe IRIS  
**Status:** Production Ready

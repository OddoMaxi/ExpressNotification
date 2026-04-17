# SMS API - Interactgroup
## Documentation Technique

**Fournisseur:** Interactgroup  
**Service:** SMS Gateway  
**Documentation Date:** Updated 2025

---

## 1. Configuration Générale

### Base URL
```
http://sms.interactgroup.net/index.php
https://sms.interactgroup.net (Dashboard)
```

### Authentification
- **Type:** URL Parameter Based
- **Paramètres:** `u` (username), `h` (hash/token)

### Credentials

| Clé | Valeur |
|-----|--------|
| **Username** | louba |
| **Hash Token** | 97962ccc0add0f87b0570561acc59b45 |
| **Expediteur (FROM)** | LOUBA |
| **Port par défaut** | 80 (HTTP) / 443 (HTTPS) |

### Dashboard Login (pour monitoring)
```
URL: https://sms.interactgroup.net
Username: louba
Password: 624062984
```

---

## 2. SMS Envoi API

### Endpoint
```
GET ou POST /index.php
```

### Méthode HTTP
- **GET** (recommandé pour les tests)
- **POST** (pour les intégrations robustes)

### Paramètres Query/Body

| Paramètre | Type | Obligatoire | Description | Exemple |
|-----------|------|-------------|-------------|---------|
| `app` | string | ✅ | Application ID | `ws` |
| `u` | string | ✅ | Username | `louba` |
| `h` | string | ✅ | Hash d'authentification | `97962ccc0add0f87b0570561acc59b45` |
| `op` | string | ✅ | Operation type | `pv` (privé) |
| `to` | string | ✅ | Numéro destinataire | `224624062984` |
| `msg` | string | ✅ | Message à envoyer | `Hello+World` |
| `from` | string | ✅ | Expediteur | `LOUBA` |

### Format du Numéro de Téléphone
```
Format complet : 224XXXXXXXXX (Guinée)
Exemple        : 224624062984
               : 22461234567

Note: Le code pays 224 est obligatoire pour la Guinée
```

### Encodage du Message

- **Espaces:** Utiliser `+` ou `%20`
- **Caractères spéciaux:** URL-encqode (ex: `%26` pour `&`)
- **Limite:** Généralement 160 caractères par SMS
- **Multilingue:** UTF-8 supporté dans certains cas

---

## 3. Exemples d'Utilisation

### 3.1 Appel GET Simple

```
http://sms.interactgroup.net/index.php?app=ws&u=louba&h=97962ccc0add0f87b0570561acc59b45&op=pv&to=224624062984&msg=test+only&from=LOUBA
```

### 3.2 Appel GET avec Message Français

```
http://sms.interactgroup.net/index.php?app=ws&u=louba&h=97962ccc0add0f87b0570561acc59b45&op=pv&to=224624062984&msg=Bonjour%20Mamadou&from=LOUBA
```

### 3.3 Appel cURL (Recommandé)

```bash
curl -X GET "http://sms.interactgroup.net/index.php?app=ws&u=louba&h=97962ccc0add0f87b0570561acc59b45&op=pv&to=224624062984&msg=test+only&from=LOUBA"
```

### 3.4 Node.js avec Axios

```javascript
const axios = require('axios');

const smsUrl = 'http://sms.interactgroup.net/index.php?' + new URLSearchParams({
  app: 'ws',
  u: 'louba',
  h: '97962ccc0add0f87b0570561acc59b45',
  op: 'pv',
  to: '224624062984',
  msg: 'Votre demande est approuvée',
  from: 'LOUBA'
}).toString();

axios.get(smsUrl)
  .then(response => console.log('SMS envoyé:', response.data))
  .catch(error => console.error('Erreur:', error));
```

### 3.5 Node.js avec axios (URLSearchParams)

```javascript
const axios = require('axios');

async function sendSMS(phoneNumber, message) {
  try {
    const url = 'http://sms.interactgroup.net/index.php';
    const params = new URLSearchParams({
      app: 'ws',
      u: 'louba',
      h: '97962ccc0add0f87b0570561acc59b45',
      op: 'pv',
      to: phoneNumber,
      msg: message,
      from: 'LOUBA'
    });

    const response = await axios.get(`${url}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erreur SMS:', error.message);
    throw error;
  }
}

// Utilisation
sendSMS('224624062984', 'Bonjour test SMS')
  .then(result => console.log('Résultat:', result))
  .catch(err => console.error('Erreur:', err));
```

### 3.6 Exemple de Notation Guinéenne

```
Numéro valide : 224 624 062 984 → 224624062984
Numéro valide : 224 621 000 000 → 224621000000
```

---

## 4. Réponses API

### Succès
```
ID_MESSAGE (numérique)
Exemple: 12345
```

### Erreurs Possibles

| Code | Signification | Solution |
|------|---------------|----------|
| `Invalid User` | Username/Hash invalide | Vérifier les credentials |
| `Invalid number` | Numéro de téléphone invalide | Format: 224XXXXXXXXX |
| `Message too long` | Message > 160 caractères | Réduire le message |
| `Empty message` | Message vide | Ajouter du contenu |
| `Invalid parameters` | Paramètres manquants | Vérifier tous les params |
| `API throttle` | Trop de requêtes | Ajouter une pause entre envois |
| `Network error` | Connexion impossible | Vérifier la connectivité |

---

## 5. Statuts de Livraison

| Statut | Description |
|--------|-------------|
| `SENT` | SMS envoyé au réseau |
| `DELIVERED` | Reçu par destinataire |
| `FAILED` | Échec de livraison |
| `PENDING` | En attente d'envoi |

**Note:** Vérifier via le dashboard https://sms.interactgroup.net pour le suivi détaillé

---

## 6. Configuration Backend Node.js

### .env Requis

```env
# SMS Interactgroup Configuration
SMS_API_URL=http://sms.interactgroup.net/index.php
SMS_USER=louba
SMS_HASH=97962ccc0add0f87b0570561acc59b45
SMS_FROM=LOUBA
```

### Classe Service Exemple

```javascript
class SMSService {
  constructor() {
    this.apiUrl = process.env.SMS_API_URL;
    this.user = process.env.SMS_USER;
    this.hash = process.env.SMS_HASH;
    this.from = process.env.SMS_FROM;
  }

  buildUrl(phoneNumber, message) {
    const params = new URLSearchParams({
      app: 'ws',
      u: this.user,
      h: this.hash,
      op: 'pv',
      to: this.cleanPhoneNumber(phoneNumber),
      msg: message,
      from: this.from
    });
    return `${this.apiUrl}?${params.toString()}`;
  }

  cleanPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, ''); // Enlever caractères non-numériques
    if (cleaned.length === 9) {
      cleaned = '224' + cleaned; // Ajouter code pays
    }
    return cleaned;
  }

  async sendSMS(phoneNumber, message) {
    try {
      const url = this.buildUrl(phoneNumber, message);
      const response = await axios.get(url);
      return {
        success: true,
        messageId: response.data,
        phone: phoneNumber,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        phone: phoneNumber,
        timestamp: new Date()
      };
    }
  }
}

module.exports = new SMSService();
```

---

## 7. Intégration au Système de Notification

### Flux Complet

```
1. Demandeur enregistré dans BD
2. Agent clique "Vérifier Statut"
3. API Iris sollicitée → Récupère statut
4. Message personnalisé généré selon statut
5. SMS envoyé via Interactgroup API
6. Réponse enregistrée dans BD
7. Notification SMS reçue par demandeur
```

### Mappage Statuts Iris → SMS

```javascript
const statusMessages = {
  'Final Approval Passed': {
    message: 'Félicitations ! Votre passeport est approuvé. Veuillez vous présenter au guichet.',
    type: 'success'
  },
  'Production Completed': {
    message: 'URGENT! Votre passeport est prêt. Veuillez vous présenter rapidement.',
    type: 'urgent'
  },
  'Final Approval Rejected': {
    message: 'Votre demande a été rejetée. Veuillez contacter le MOFA.',
    type: 'error'
  },
  'Pending Final Approval': {
    message: 'Votre demande est en attente d\'approbation. Merci de patienter.',
    type: 'info'
  }
};
```

---

## 8. Points Importants

✅ **À FAIRE:**
- Toujours utiliser le format 224XXXXXXXXX pour les numéros
- Vérifier que le message < 160 caractères (SMS standard)
- URL-encoder les messages avec caractères spéciaux
- Implémenter des retry en cas d'erreur réseau
- Logger tous les envois SMS envoyés/reçus
- Utiliser HTTPS en production si disponible

❌ **À ÉVITER:**
- Ne pas utiliser les credentials dans le code (utiliser .env)
- Ne pas envoyer sans faire de validation du numéro
- Ne pas faire d'envoi massif sans délai (risque throttle)
- Ne pas ignorer les erreurs d'API
- Ne pas dépasser la limite de caractères

---

## 9. Limits et Restrictions

| Restriction | Valeur |
|-------------|--------|
| **Longueur SMS** | 160 caractères (standard) / 306 (concaténé) |
| **Délai entre envois** | 100-200ms minimum recommandé |
| **Format date** | N/A (pas utilisé) |
| **Format nombre** | 224XXXXXXXXX (11 chiffres) |
| **Timeout** | 10 secondes recommandé |

---

## 10. Monitoring et Troubleshooting

### Dashboard
```
URL: https://sms.interactgroup.net
Login: louba / 624062984
```

Vérifier:
- ✅ Crédits SMS disponibles
- ✅ Historique d'envoi
- ✅ Rapports de livraison
- ✅ Logs d'erreur

### Erreurs Courantes

| Problème | Cause | Réparation |
|----------|-------|-----------|
| SMS non reçu | Hash invalide | Vérifier hash dans .env |
| "Invalid User" | Credentials incorrect | Utiliser: louba / 97962ccc0add0f... |
| Pas de connexion | Firewall/Proxy | Vérifier accès réseau |
| Message vide | Paramètre msg manquant | Inclure msg="" minimum |
| Rate limited | Trop d'envois rapidement | Ajouter délai entre envois |

---

## 11. Sécurité

⚠️ **Informations Sensibles:**
- Ne JAMAIS committer .env avec credentials
- Utiliser des variables d'environnement en production
- Chiffrer les numéros de téléphone en base de données
- Logger les accès API
- Implémenter rate limiting côté serveur

---

## 12. Support

**Support Interactgroup:**
- Dashboard: https://sms.interactgroup.net
- Docs: [Contactez Interactgroup]

**Support Local (Guinée):**
- Contact administrative si problèmes persistants

---

**Version:** 01.00  
**Dernière mise à jour:** 16 AVR 2026  
**Status:** Production Ready

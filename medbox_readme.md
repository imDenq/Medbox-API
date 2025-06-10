# MEDBOX Backend 💊

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![JWT](https://img.shields.io/badge/JWT-Security-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

**MEDBOX Backend** est une API REST haute performance construite avec Node.js et Express, conçue pour gérer de manière sécurisée les distributeurs automatiques de médicaments. Cette solution backend implémente un système de monitoring en temps réel, des notifications email automatiques, et une gestion complète des médicaments pour garantir une distribution sûre et fiable.

## ✨ Fonctionnalités Principales

### 🏥 Système de Distribution Intelligent
- **Monitoring en Temps Réel** : Surveillance continue des appareils MEDBOX
- **Distribution Programmée** : Planification automatique des prises de médicaments
- **Gestion Multi-Compartiments** : Support de 21 compartiments par appareil
- **Notifications Email** : Alertes automatiques de statut et de maintenance
- **Historique Complet** : Traçabilité de toutes les distributions

### 🔐 Sécurité et Authentification
- **Authentification JWT** : Tokens sécurisés avec expiration
- **2FA TOTP** : Authentification à deux facteurs optionnelle
- **Contrôle d'Accès** : Système de permissions granulaire
- **Audit Trail** : Journalisation complète des activités
- **Chiffrement** : Protection des données sensibles

### 💊 Gestion Avancée des Médicaments
- **Base de Médicaments** : Catalogue complet avec propriétés détaillées
- **Groupes de Médicaments** : Organisation flexible par catégories
- **Assignations Intelligentes** : Mapping compartiments/médicaments
- **Suivi des Stocks** : Monitoring automatique des niveaux
- **Alertes de Renouvellement** : Notifications proactives

### 📊 Monitoring et Analytics
- **Dashboard Temps Réel** : Métriques de performance instantanées
- **Statistiques d'Usage** : Analyses d'utilisation et tendances
- **Alertes Proactives** : Détection automatique des anomalies
- **Rapports de Santé** : Statut détaillé des appareils
- **Historique de Connexion** : Logs de connectivité détaillés

### 🔄 Intégration et Compatibilité
- **API RESTful** : Interface standardisée et documentée
- **Heartbeat Protocol** : Communication bidirectionnelle avec les appareils
- **Multi-Device Support** : Gestion simultanée de plusieurs MEDBOX
- **Configuration Dynamique** : Mise à jour à distance des paramètres
- **Backup Automatique** : Sauvegarde régulière des données critiques

## 🚀 Stack Technologique

### Backend Core
- **Node.js 18+** - Runtime JavaScript haute performance
- **Express.js 4.18+** - Framework web minimaliste et flexible
- **PostgreSQL 15+** - Base de données relationnelle robuste
- **JWT** - Gestion sécurisée des sessions

### Communication & Notifications
- **Nodemailer** - Service d'envoi d'emails automatisés
- **CORS** - Gestion des politiques cross-origin
- **Chalk** - Interface console colorée pour le debugging
- **Express Rate Limiting** - Protection contre les abus

### Utilitaires & Monitoring
- **bcryptjs** - Hachage sécurisé des mots de passe
- **otplib** - Génération et validation 2FA
- **QRCode** - Génération de codes QR pour l'authentification
- **dotenv** - Gestion sécurisée de la configuration

## 📦 Installation et Configuration

### Prérequis Système
- Node.js 18+ avec npm
- PostgreSQL 15+ configuré et démarré
- Git pour le versioning
- Serveur SMTP (Gmail, SendGrid, etc.)

### Installation Rapide
```bash
# Cloner le repository
git clone https://github.com/imDenq/Medbox-API.git
cd medbox-backend

# Installer les dépendances
npm install

# Configuration de base
cp .env.example .env
# Éditer .env avec vos paramètres

# Démarrer le serveur
npm start
```

### Configuration Base de Données
```bash
# Créer la base de données PostgreSQL
createdb medbox_db -U postgres

# Le système créera automatiquement les tables au premier démarrage
npm run start
```

### Variables d'Environnement
```env
# Configuration Serveur
PORT=3000
NODE_ENV=production

# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=medbox_db
DB_USER=your_username
DB_PASSWORD=your_password

# Sécurité JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Configuration Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=MEDBOX System
EMAIL_DEBUG=false

# Logs et Monitoring
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### Configuration Email
```env
# Gmail (recommandé)
EMAIL_USER=admin@medbox.eu
EMAIL_PASS=your-gmail-app-password

# SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key

# Custom SMTP
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password
```

## 🛠️ Commandes de Développement

```bash
# Démarrage du serveur de développement
npm run dev

# Démarrage en production
npm start

# Tests (à implémenter)
npm test

# Vérification du code
npm run lint

# Nettoyage des logs
npm run clean-logs

# Monitoring des appareils (manuel)
npm run check-devices
```

## 🏗️ Architecture API

### Structure du Projet
```
medbox-backend/
├── controllers/              # Logique métier
│   ├── authController.js     # Authentification et 2FA
│   ├── medboxController.js   # Gestion des appareils MEDBOX
│   └── medicineController.js # Gestion des médicaments
├── routes/                   # Définition des endpoints
│   ├── authRoutes.js         # Routes d'authentification
│   ├── medboxRoutes.js       # Routes MEDBOX
│   └── medicineRoutes.js     # Routes médicaments
├── models/                   # Modèles de données
│   └── userModel.js          # Configuration PostgreSQL
├── middlewares/              # Middlewares personnalisés
│   └── authMiddleware.js     # Vérification JWT
├── services/                 # Services externes
│   └── emailService.js       # Service d'envoi d'emails
├── logs/                     # Fichiers de logs
└── index.js                  # Point d'entrée principal
```

### Endpoints API Principaux

#### 🔐 Authentification & Sécurité
```http
POST   /api/auth/register            # Inscription utilisateur
POST   /api/auth/login               # Connexion standard
POST   /api/auth/verify-2fa          # Vérification 2FA
POST   /api/auth/enable-2fa          # Activation 2FA
POST   /api/auth/disable-2fa         # Désactivation 2FA
POST   /api/auth/change-password     # Changement de mot de passe
GET    /api/auth/user-info           # Informations utilisateur
GET    /api/auth/check-admin         # Vérification droits admin
```

#### 🏥 Gestion MEDBOX
```http
GET    /api/medbox/devices           # Liste des appareils utilisateur
POST   /api/medbox/register          # Enregistrement nouvel appareil
POST   /api/medbox/claim-device      # Association appareil/utilisateur
POST   /api/medbox/heartbeat         # Mise à jour statut (appareil)
GET    /api/medbox/devices/{id}      # Détails d'un appareil
PUT    /api/medbox/devices/{id}/compartments/{num} # Configuration compartiment
POST   /api/medbox/devices/{id}/schedules # Créer une planification
DELETE /api/medbox/schedules/{id}    # Supprimer planification
GET    /api/medbox/devices/{id}/history # Historique des distributions
DELETE /api/medbox/devices/{id}      # Supprimer un appareil
```

#### 💊 Gestion des Médicaments
```http
GET    /api/medicines/medicines      # Liste des médicaments
POST   /api/medicines/medicines      # Créer un médicament
PUT    /api/medicines/medicines/{id} # Modifier un médicament
DELETE /api/medicines/medicines/{id} # Supprimer un médicament
GET    /api/medicines/groups         # Liste des groupes
POST   /api/medicines/groups         # Créer un groupe
POST   /api/medicines/groups/{id}/medicines # Ajouter médicament au groupe
DELETE /api/medicines/groups/{id}/medicines/{medId} # Retirer du groupe
```

#### 📊 Monitoring & Analytics
```http
GET    /api/medbox/stats             # Statistiques globales
GET    /api/medbox/devices/{id}/connection-history # Historique connexion
POST   /api/medbox/devices/{id}/test-notification # Test notification email
GET    /api/medbox/available-devices # Appareils non assignés
GET    /api/medbox/config/{device_id} # Configuration appareil (public)
```

#### 🔗 Assignations Compartiments
```http
POST   /api/medicines/compartments/assign # Assigner médicament/groupe
GET    /api/medicines/compartments/{deviceId}/assignments # Assignations appareil
DELETE /api/medicines/compartments/assignments/{id} # Supprimer assignation
```

## 🔒 Sécurité et Monitoring

### Système de Sécurité Multi-Niveaux
- **Authentification JWT** : Tokens signés avec expiration
- **2FA TOTP** : Compatible Google Authenticator/Authy
- **Rate Limiting** : Protection contre les attaques par déni de service
- **CORS Policy** : Contrôle strict des origines autorisées
- **Validation des Données** : Sanitisation de tous les inputs
- **Audit Logging** : Traçabilité complète des actions sensibles

### Monitoring Temps Réel
- **Heartbeat Protocol** : Vérification automatique des appareils (1 min)
- **Notifications Email** : Alertes instantanées de changement de statut
- **Dashboard Live** : Métriques en temps réel
- **Détection de Pannes** : Identification proactive des problèmes
- **Historique de Connectivité** : Logs détaillés sur 7 jours

### Gestion des Emails Automatisés
```javascript
// Configuration du service email
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  templates: {
    statusChange: 'Appareil {deviceName} est {status}',
    maintenance: 'Maintenance requise pour {deviceName}',
    lowStock: 'Stock faible dans compartiment {compartment}'
  }
};
```

### Système d'Audit Avancé
- **Logs Structurés** : Format JSON pour analyse automatisée
- **Rotation Automatique** : Gestion intelligente de l'espace disque
- **Niveaux de Criticité** : INFO, WARNING, ERROR, CRITICAL
- **Anonymisation** : Protection des données personnelles
- **Retention Policy** : Conservation configurable (30 jours par défaut)

## 🏥 Spécifications MEDBOX

### Caractéristiques Techniques
- **21 Compartiments** : Support de 0 à 20 compartiments par appareil
- **Capacité Variable** : Configuration flexible par compartiment
- **Multi-Médicaments** : Support de différents types de médicaments
- **Planification Avancée** : Horaires multiples par jour et par semaine
- **Seuils Personnalisables** : Alertes de stock configurables

### Protocole de Communication
```javascript
// Heartbeat standard de l'appareil
POST /api/medbox/heartbeat
{
  "device_id": "MEDBOX_001",
  "status": "online",
  "ip_address": "192.168.1.100",
  "compartments_status": {
    "0": { "pills_remaining": 45, "last_dispense": "2025-06-10T08:00:00Z" },
    "1": { "pills_remaining": 12, "last_dispense": "2025-06-09T20:00:00Z" }
  }
}
```

### Codes de Statut
- **online** : Appareil connecté et fonctionnel
- **offline** : Appareil hors ligne (>1 minute sans heartbeat)
- **pending** : Appareil enregistré mais non confirmé
- **maintenance** : Appareil en mode maintenance
- **error** : Appareil en erreur nécessitant intervention

## 🚀 Déploiement et Production

### Configuration Docker
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  medbox-backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/medbox
    depends_on:
      - db
    restart: unless-stopped
  
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: medbox
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - medbox-backend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Configuration Nginx
```nginx
# nginx.conf
server {
    listen 80;
    server_name api.medbox.eu;
    
    location / {
        proxy_pass http://medbox-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

### Variables d'Environnement Production
```bash
# Sécurité Production
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret-minimum-64-characters

# Base de données Production
DB_HOST=prod-postgres.internal
DB_DATABASE=medbox_production
DB_USER=medbox_user
DB_PASSWORD=secure-production-password

# Email Production
EMAIL_USER=notifications@medbox.eu
EMAIL_PASS=production-email-password
EMAIL_DEBUG=false

# Monitoring
LOG_LEVEL=warn
LOG_RETENTION_DAYS=90
```

## 📊 Métriques et Analytics

### Dashboard de Monitoring
- **Appareils Connectés** : Nombre d'appareils en ligne en temps réel
- **Distributions Quotidiennes** : Compteur de médicaments distribués
- **Taux de Disponibilité** : Uptime moyen des appareils sur 30 jours
- **Alertes Actives** : Nombre d'appareils nécessitant attention
- **Performance Email** : Taux de livraison des notifications

### Métriques de Performance
```javascript
// Exemples de métriques collectées
const metrics = {
  devices: {
    total: 156,
    online: 142,
    offline: 14,
    uptime_percentage: 91.03
  },
  distributions: {
    today: 1247,
    week: 8653,
    month: 37291,
    success_rate: 99.7
  },
  alerts: {
    low_stock: 23,
    offline_devices: 14,
    maintenance_due: 8
  }
};
```

### Rapports Automatisés
- **Rapport Quotidien** : Résumé des activités envoyé aux administrateurs
- **Rapport de Santé** : État détaillé des appareils (hebdomadaire)
- **Statistiques d'Usage** : Analyses d'utilisation (mensuel)
- **Audit de Sécurité** : Contrôles de sécurité (trimestriel)

## 🧪 Tests et Qualité

### Suite de Tests
```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests de performance
npm run test:performance

# Tests de sécurité
npm run test:security

# Couverture de code
npm run test:coverage
```

### Standards de Qualité
- **ESLint** : Respect des standards JavaScript
- **Prettier** : Formatage automatique du code
- **JSDoc** : Documentation des fonctions
- **SonarQube** : Analyse de qualité continue
- **Security Audit** : Vérification des vulnérabilités

### Métriques de Fiabilité
- **Uptime Target** : 99.9% de disponibilité
- **Response Time** : <200ms pour 95% des requêtes
- **Email Delivery** : >99% de taux de livraison
- **Data Integrity** : 100% de cohérence des données
- **Security Score** : Audit de sécurité A+

## 🔧 Administration et Maintenance

### Commandes d'Administration
```bash
# Vérification du statut des appareils
curl -X GET "http://localhost:3000/api/medbox/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test des notifications email
curl -X POST "http://localhost:3000/api/medbox/test-email" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "MEDBOX_001"}'

# Consultation des logs en temps réel
tail -f logs/logs-$(date +%Y-%m-%d-%H-%M).log

# Nettoyage des logs anciens
npm run clean-old-logs
```

### Maintenance Préventive
- **Backup Automatique** : Sauvegarde quotidienne des données
- **Rotation des Logs** : Archivage automatique après 30 jours
- **Monitoring des Ressources** : CPU, RAM, Disque, Réseau
- **Mise à Jour de Sécurité** : Patches automatiques des dépendances
- **Health Checks** : Vérifications régulières du système

### Procédures d'Urgence
- **Plan de Continuité** : Basculement automatique en cas de panne
- **Restoration** : Procédure de récupération < 1 heure
- **Communication** : Alertes automatiques des incidents critiques
- **Escalation** : Protocole de remontée des alertes majeures

## 📈 Roadmap et Évolutions

### ✅ Fonctionnalités Complétées
- ✅ Authentification JWT + 2FA complète
- ✅ Monitoring temps réel des appareils MEDBOX
- ✅ Système de notifications email automatisées
- ✅ Gestion complète des médicaments et groupes
- ✅ API REST documentée et sécurisée
- ✅ Dashboard de monitoring en temps réel
- ✅ Assignations flexibles compartiments/médicaments
- ✅ Historique complet des distributions
- ✅ Système d'audit et de logs avancé

### 🚧 En Développement Actif
- [ ] Interface web complète pour administration
- [ ] Tests unitaires et d'intégration (90%+ couverture)
- [ ] Documentation API complète (OpenAPI/Swagger)
- [ ] Système d'alertes push mobile
- [ ] Analytics avancées et reporting

### 🔮 Roadmap Futur (Q3-Q4 2025)
- [ ] Support multi-tenant pour hôpitaux
- [ ] Intégration avec systèmes hospitaliers (HL7/FHIR)
- [ ] Intelligence artificielle pour prédiction des besoins
- [ ] Application mobile dédiée
- [ ] Certification médicale (CE/FDA)
- [ ] Support des prescriptions électroniques
- [ ] Blockchain pour traçabilité pharmaceutique
- [ ] Interface vocal (Amazon Alexa/Google Assistant)

### 🌟 Vision Long Terme
- Écosystème complet de distribution automatisée
- Intégration avec IoMT (Internet of Medical Things)
- Télémédecine et suivi patient intégré
- Analytics prédictive pour la santé publique

## 📞 Support et Contact

### Équipe de Développement
- **Lead Developer** : KASZAK Théo
- **Email Technique** : admin@medbox.eu
- **Support Client** : support@medbox.eu
- **Urgences 24/7** : +33 X XX XX XX XX

### Resources et Documentation
- 📚 **Documentation API** : [docs.medbox.eu](https://docs.medbox.eu) (SOON)
- 🐛 **Bug Reports** : [GitHub Issues](../../issues)
- 💡 **Feature Requests** : [GitHub Discussions](../../discussions)
- 🔒 **Security Issues** : security@medbox.eu
- 📱 **Frontend Repository** : [MEDBOX Frontend](https://github.com/votre-org/medbox-frontend)

### Status et Monitoring
- 🟢 **System Status** : [status.medbox.eu](https://status.medbox.eu) (SOON)
- 📊 **Public Metrics** : [metrics.medbox.eu](https://metrics.medbox.eu) (SOON)
- 📈 **Performance Dashboard** : [performance.medbox.eu](https://performance.medbox.eu) (SOON)

### Communauté et Contributions
- 🤝 **Guide de Contribution** : [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📋 **Code de Conduite** : [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 🔄 **Changelog** : [CHANGELOG.md](./CHANGELOG.md)
- 📜 **Licence** : [LICENSE](./LICENSE)

### Certifications et Conformité
- 🏥 **ISO 13485** : Dispositifs médicaux (en cours)
- 🔒 **ISO 27001** : Sécurité de l'information (SOON)
- 🇪🇺 **RGPD** : Conformité européenne
- 🏛️ **HDS** : Hébergement de données de santé (France)

---

<div align="center">

### 🚀 **MEDBOX™ - L'Avenir de la Distribution Médicamenteuse**

**[⭐ Star this project](../../stargazers)** • **[🍴 Fork](../../fork)** • **[📋 Report Issues](../../issues)** • **[💬 Discussions](../../discussions)**

*Système intelligent de distribution automatisée de médicaments*

**Développé avec ❤️ par denq**

![Visitors](https://visitor-badge.glitch.me/badge?page_id=medbox-backend)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)

</div>
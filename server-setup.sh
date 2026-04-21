#!/bin/bash
# Script d'installation serveur - serv-lba-dev
# À exécuter en tant que root ou avec sudo

set -e

echo "=== Installation Louba Notification SMS ==="

# 1. Mise à jour système
apt-get update -y && apt-get upgrade -y

# 2. Installer Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Installer PM2 globalement
npm install -g pm2

# 4. Installer Nginx
apt-get install -y nginx

# 5. Créer les répertoires
mkdir -p /opt/louba/backend/data
mkdir -p /var/log/louba
chown -R rdpuser:rdpuser /opt/louba
chown -R rdpuser:rdpuser /var/log/louba

# 6. Configurer Nginx
cp /opt/louba/nginx.conf /etc/nginx/sites-available/louba
ln -sf /etc/nginx/sites-available/louba /etc/nginx/sites-enabled/louba
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
systemctl enable nginx

# 7. Installer dépendances backend
cd /opt/louba/backend
npm install --production

# 8. Créer le répertoire de données SQLite
mkdir -p /opt/louba/backend/data

# 9. Démarrer le backend avec PM2
cd /opt/louba
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u rdpuser --hp /home/rdpuser

# 10. Configurer le pare-feu
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable

echo ""
echo "=== Installation terminée ==="
echo "Frontend : http://102.206.73.61"
echo "API      : http://102.206.73.61/api/health"
echo ""
echo "Commandes utiles :"
echo "  pm2 status          → état du backend"
echo "  pm2 logs louba-backend → logs en temps réel"
echo "  pm2 restart louba-backend → redémarrer"

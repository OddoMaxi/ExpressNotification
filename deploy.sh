#!/bin/bash
# Script de déploiement local → serv-lba-dev
# À exécuter depuis votre machine Windows (Git Bash / WSL)

set -e

SERVER_USER="rdpuser"
SERVER_IP="102.206.73.61"
SERVER_PASS="@azerty123456"
REMOTE_DIR="/opt/louba"

echo "=== Build du frontend React ==="
cd frontend
npm install
npm run build
cd ..

echo ""
echo "=== Transfert des fichiers vers $SERVER_IP ==="

# Utiliser sshpass si disponible, sinon entrer le mot de passe manuellement
if command -v sshpass &> /dev/null; then
  SCP="sshpass -p '$SERVER_PASS' scp -o StrictHostKeyChecking=no"
  SSH="sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no"
else
  SCP="scp -o StrictHostKeyChecking=no"
  SSH="ssh -o StrictHostKeyChecking=no"
  echo "⚠  sshpass non installé — le mot de passe sera demandé plusieurs fois"
fi

# Créer la structure distante
$SSH $SERVER_USER@$SERVER_IP "sudo mkdir -p $REMOTE_DIR && sudo chown $SERVER_USER:$SERVER_USER $REMOTE_DIR"

# Transférer le backend
echo "→ Transfert backend..."
$SCP -r backend/routes backend/middleware backend/services backend/database.js backend/server.js backend/package.json backend/package-lock.json backend/.env \
  $SERVER_USER@$SERVER_IP:$REMOTE_DIR/backend/

# Transférer le frontend buildé
echo "→ Transfert frontend (build)..."
$SCP -r frontend/build $SERVER_USER@$SERVER_IP:$REMOTE_DIR/frontend/

# Transférer les fichiers de config
echo "→ Transfert configuration..."
$SCP ecosystem.config.js nginx.conf server-setup.sh \
  $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

echo ""
echo "=== Lancement de l'installation sur le serveur ==="
$SSH $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && sudo bash server-setup.sh"

echo ""
echo "✅ Déploiement terminé !"
echo "   Application : http://$SERVER_IP"
echo "   Health check: http://$SERVER_IP/api/health"

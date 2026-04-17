#!/bin/bash

# Script de démarrage pour le développement

echo "🚀 Démarrage du Système de Notification SMS"
echo "============================================"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

echo "✓ Node.js détecté: $(node --version)"

# Démarrer le backend
echo ""
echo "📦 Démarrage du backend..."
cd backend
cp .env.example .env 2>/dev/null || true

if [ ! -d "node_modules" ]; then
    echo "Installez les dépendances du backend avec: npm install"
fi

npm start &
BACKEND_PID=$!
echo "✓ Backend démarré (PID: $BACKEND_PID)"

sleep 2

# Démarrer le frontend
echo ""
echo "🎨 Démarrage du frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installez les dépendances du frontend avec: npm install"
fi

# Créer un fichier .env.local si nécessaire
if [ ! -f ".env.local" ]; then
    echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
fi

npm start &
FRONTEND_PID=$!
echo "✓ Frontend démarré (PID: $FRONTEND_PID)"

echo ""
echo "============================================"
echo "🟢 Application démarrée!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 API Backend: http://localhost:5000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo "============================================"

# Garder les processus actifs
wait $BACKEND_PID $FRONTEND_PID

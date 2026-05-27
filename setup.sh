#!/bin/bash

echo ""
echo "  ✦ Music Matrix — Setup ✦"
echo "  A Taylor Swift Universe"
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required. Install it first."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install it first."; exit 1; }

# Backend setup
echo "→ Setting up backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet

if [ ! -f .env ]; then
  echo ""
  echo "  You need Spotify API credentials."
  echo "  Go to: https://developer.spotify.com/dashboard"
  echo "  Create an app and copy the Client ID + Secret."
  echo ""
  read -p "  Spotify Client ID: " SPOTIFY_CLIENT_ID
  read -p "  Spotify Client Secret: " SPOTIFY_CLIENT_SECRET
  cat > .env << EOF
SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=$SPOTIFY_CLIENT_SECRET
EOF
  echo "  ✓ Backend .env created"
fi

cd ..

# Frontend setup
echo "→ Setting up frontend..."
cd frontend
npm install --silent

if [ ! -f .env.local ]; then
  cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
  echo "  ✓ Frontend .env.local created"
fi

cd ..

echo ""
echo "  ✓ Setup complete!"
echo ""
echo "  To run locally:"
echo "    Terminal 1: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "    Terminal 2: cd frontend && npm run dev"
echo ""
echo "  Then open http://localhost:3000"
echo ""

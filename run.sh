#!/bin/bash

# SyllabusSlayer Local Server Launcher
echo "========================================================"
echo "🎮 SYLLABUSSLAYER LOCAL SERVER LAUNCHER"
echo "========================================================"
echo ""

# Check if Node is installed
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed or not in your PATH."
    echo "Please download and install Node.js from https://nodejs.org/"
    echo ""
    read -p "Press enter to exit..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules folder not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies."
        read -p "Press enter to exit..."
        exit 1
    fi
fi

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "[INFO] Creating .env file from .env.example..."
    cp .env.example .env
    echo "[WARNING] Please update the .env file with your GEMINI_API_KEY!"
    echo "[WARNING] Running in DEMO/MOCK mode until key is updated."
    echo ""
fi

echo "[SUCCESS] Starting server on http://localhost:3000..."
echo ""
npm start
git init
git add .
git commit -m "Initial commit for AWS deployment"
git branch -M main
git remote add origin https://github.com/avanisajeevankv/doubtless-ai.git
git push -u origin main

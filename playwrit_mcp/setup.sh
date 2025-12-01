#!/bin/bash

# Playwright MCP Agent Setup Script
# This script automates the installation of all dependencies

set -e  # Exit on error

echo "🚀 Starting Playwright MCP Agent Setup..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✓ Found Python version: $PYTHON_VERSION"

# Check if we're using Python 3.14 (which has protobuf compatibility issues)
if [[ "$PYTHON_VERSION" == "3.14" ]]; then
    echo "⚠️  Warning: Python 3.14 detected. Protobuf may have compatibility issues."
    echo "   Recommended: Use Python 3.11 or 3.12 for best compatibility."
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Please install Python 3.11 or 3.12 and try again."
        exit 1
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "✓ Python dependencies installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm."
    exit 1
fi

echo "✓ Found npm version: $(npm --version)"

# Install Playwright globally
echo "📦 Installing Playwright globally..."
npm install -g @playwright/mcp@latest

# Install Playwright browsers
echo "🌐 Installing Playwright browsers (this may take a few minutes)..."
playwright install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the agent:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Run the agent: python3 agent.py"
echo ""
echo "Or simply run: ./run.sh"

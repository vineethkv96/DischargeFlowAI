#!/bin/bash

# Quick run script for the Playwright MCP Agent

set -e

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./setup.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Run the agent
echo "🤖 Starting Playwright MCP Agent..."
python3 agent.py

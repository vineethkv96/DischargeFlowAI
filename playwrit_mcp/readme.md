# Playwright MCP Agent

An AI agent that uses Google Gemini and Playwright MCP Server to automate browser interactions.

## Prerequisites

- Python 3.9+ (Python 3.11 or 3.12 recommended for best compatibility)
- Node.js and npm
- Google Gemini API Key

## Quick Start

### Automated Setup (Recommended)

1. Make the setup script executable:
   ```bash
   chmod +x setup.sh
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

   This will:
   - Create a Python virtual environment
   - Install all Python dependencies
   - Install Playwright globally
   - Install Playwright browsers

3. Configure your API key:
   - Open `agent.py`
   - Replace the `GOOGLE_API_KEY` value with your actual Gemini API key
   - Or set it as an environment variable: `export GEMINI_API_KEY="your-key-here"`

4. Run the agent:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

### Manual Setup

If you prefer to install dependencies manually:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright globally
npm install -g @playwright/mcp@latest

# Install Playwright browsers
playwright install

# Run the agent
python3 agent.py
```

## Usage

The agent runs as a FastAPI server on port 18000. You can send requests to:

```
POST http://localhost:18000/process
```

With a JSON body:
```json
{
  "prompt": "Navigate to example.com and take a screenshot",
  "expected_output": ""
}
```

## Configuration

- **Headless Mode**: By default, the browser runs in headed mode (visible). To change this, modify the `PLAYWRIGHT_HEADLESS` environment variable in `agent.py`.
- **Model**: The agent uses `gemini-2.0-flash-001`. You can change this in `agent.py` line 110.

## Troubleshooting

### Python 3.14 Compatibility Issues

If you're using Python 3.14, you may encounter protobuf compatibility errors. We recommend using Python 3.11 or 3.12 instead:

```bash
# Install pyenv (if not already installed)
brew install pyenv

# Install Python 3.12
pyenv install 3.12.0

# Use Python 3.12 for this project
pyenv local 3.12.0

# Re-run setup
./setup.sh
```

### Virtual Environment Issues

If you encounter issues with the virtual environment, delete it and recreate:

```bash
rm -rf venv
./setup.sh
```

## Project Structure

- `agent.py` - Main agent code with Gemini and Playwright integration
- `requirements.txt` - Python dependencies
- `setup.sh` - Automated setup script
- `run.sh` - Quick run script
- `package.json` - Node.js dependencies
- `test_service.py` - Test service (if applicable)
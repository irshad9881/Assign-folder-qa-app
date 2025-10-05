@echo off
echo Starting Folder Q&A App...

echo Checking if ChromaDB is running...
curl -s http://localhost:8000/api/v1/heartbeat >nul 2>&1
if %errorlevel% neq 0 (
    echo ChromaDB is not running. Please start it with: chroma run --host localhost --port 8000
    pause
    exit /b 1
)

echo ChromaDB is running!
echo Starting Next.js development server...
npm run dev
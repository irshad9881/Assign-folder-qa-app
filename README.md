# Folder Scoped Q&A Web App

A minimal web application that allows users to create folders, upload documents, and ask questions that are answered only from documents within the selected folder.

## Features

- **Folder Management**: Create, rename, and delete folders
- **Document Upload**: Support for PDF and TXT files with drag-and-drop
- **Processing Status**: Real-time status updates for document processing
- **Folder-Scoped Chat**: Ask questions that only use documents from the current folder
- **Citations**: Every answer includes document name and page references
- **Retrieved Chunks**: Toggle to view the actual text chunks used for answers
- **Export chat **:Export chat + sources to Markdown/PDF.
## Tech Stack

- **Frontend**: Next.js, React, JavaScript
- **Backend**: Next.js API routes, Node.js
- **Database**: SQLite for metadata
- **Vector Store**: ChromaDB for embeddings
- **LLM**: Gemini Api
- **File Processing**: pdf-parse for PDFs

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. Google Gemini API key
3. ChromaDB running locally

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd folder-qa-app
   npm run setup
   ```

2. **Set up ChromaDB**:
   ```bash
   # Install ChromaDB
   pip install chromadb
   
   # Start ChromaDB server
   chroma run --host localhost --port 8000
   ```

3. **Configure environment variables**:
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   CHROMA_HOST=localhost
   CHROMA_PORT=8000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to `http://localhost:3000`

## Usage

1. **Create a Folder**: Click "New Folder" in the left sidebar
2. **Upload Documents**: Select a folder and click "Upload Document"
3. **Wait for Processing**: Documents show status (processing/ready/failed)
4. **Ask Questions**: Use the right chat panel to ask questions
5. **View Citations**: Each answer includes source document and page references
6. **Toggle Chunks**: Click "Show Retrieved Chunks" to see the actual text used

## API Endpoints

- `GET /api/folders` - List all folders
- `POST /api/folders` - Create new folder
- `DELETE /api/folders/[id]` - Delete folder
- `GET /api/documents/[folderId]` - List documents in folder
- `POST /api/documents/upload` - Upload document
- `POST /api/chat/[folderId]` - Ask question in folder context

## Folder Isolation

Each folder maintains complete isolation:
- Separate vector collections per folder
- Questions only retrieve from current folder's documents
- Deleting a folder removes all associated data

## Performance

- **Answer Latency**: < 8 seconds for processed documents
- **Large Documents**: Handles 100+ page PDFs without crashes
- **Persistence**: All data survives server restarts
- **Real-time Updates**: Document processing status updates every 2 seconds

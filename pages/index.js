import { useState, useEffect } from 'react';
import FolderList from '../components/FolderList';
import DocumentList from '../components/DocumentList';
import ChatPanel from '../components/ChatPanel';

export default function Home() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      fetchDocuments(selectedFolder);
      const interval = setInterval(() => fetchDocuments(selectedFolder), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedFolder]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (folderId) => {
    try {
      const response = await fetch(`/api/documents/${folderId}`);
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleCreateFolder = async (name) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (response.ok) {
        fetchFolders();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (confirm('Are you sure you want to delete this folder and all its documents?')) {
      try {
        const response = await fetch(`/api/folders/${folderId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setFolders(folders.filter(f => f.id !== folderId));
          if (selectedFolder === folderId) {
            setSelectedFolder(null);
            setDocuments([]);
          }
        }
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        const updatedFolder = await response.json();
        setFolders(folders.map(f => f.id === folderId ? updatedFolder : f));
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const handleUpload = async (file) => {
    if (!selectedFolder) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', selectedFolder);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        fetchDocuments(selectedFolder);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSendMessage = async (query) => {
    if (!selectedFolder) return;

    const response = await fetch(`/api/chat/${selectedFolder}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    return response.json();
  };

  const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || '';

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <FolderList
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleRenameFolder}
        />
      </div>
      
      <div className="main-content">
        <DocumentList
          documents={documents}
          folderId={selectedFolder}
          folderName={selectedFolderName}
          onUpload={handleUpload}
        />
      </div>
      
      <div className="chat-sidebar">
        <ChatPanel
          folderId={selectedFolder}
          folderName={selectedFolderName}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
import { useRef, useState, useMemo } from 'react';

export default function DocumentList({
  documents,
  folderId,
  folderName,
  onUpload
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter documents based on search term (keyword filter)
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const keywords = searchTerm.toLowerCase().split(/\s+/);
    return documents.filter(doc => {
      const docName = doc.name.toLowerCase();
      return keywords.some(keyword => docName.includes(keyword));
    });
  }, [documents, searchTerm]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.type === 'text/plain' || file.name.endsWith('.pdf') || file.name.endsWith('.txt')) {
        onUpload(file);
      } else {
        alert('Only PDF and TXT files are supported');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return '#4CAF50';
      case 'processing': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#757575';
    }
  };

  // Add global drag prevention
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!folderId) {
    return (
      <div className="document-list empty">
        <p>Select a folder to view documents</p>
      </div>
    );
  }

  return (
    <div 
      className="document-list"
      onDragOver={preventDefaults}
      onDragEnter={preventDefaults}
    >
      <div className="document-header">
        <h2>{folderName}</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            + Upload Document
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div 
        className={`documents ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <div className="empty-state">
            <p>No documents yet. Upload your first document!</p>
            <p className="drag-hint">Drag & drop PDF or TXT files here</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <p>No documents match your search</p>
          </div>
        ) : (
          <>
            <div className="drag-overlay">
              <p>Drop files here to upload</p>
            </div>
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="doc-info">
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">
                    {formatFileSize(doc.size)}
                    {doc.pages && ` • ${doc.pages} pages`}
                    {' • '}
                    <span style={{ color: getStatusColor(doc.status) }}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                <div className="doc-date">
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
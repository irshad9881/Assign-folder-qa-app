import { useState } from 'react';

export default function FolderList({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder
}) {
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const handleRename = async (folderId) => {
    if (editName.trim()) {
      await onRenameFolder(folderId, editName.trim());
      setEditingFolder(null);
      setEditName('');
    }
  };

  const startEdit = (folder) => {
    setEditingFolder(folder.id);
    setEditName(folder.name);
  };

  return (
    <div className="folder-list">
      <div className="folder-header">
        <h2>Folders</h2>
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          + New Folder
        </button>
      </div>

      {isCreating && (
        <div className="create-folder">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="create-actions">
            <button onClick={handleCreate} className="btn-primary">Create</button>
            <button onClick={() => setIsCreating(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="folders">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolder === folder.id ? 'selected' : ''}`}
            onClick={() => editingFolder !== folder.id && onSelectFolder(folder.id)}
          >
            {editingFolder === folder.id ? (
              <div className="edit-folder">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRename(folder.id)}
                  onBlur={() => handleRename(folder.id)}
                  autoFocus
                />
              </div>
            ) : (
              <>
                <span className="folder-name" onDoubleClick={() => startEdit(folder)}>
                  {folder.name}
                </span>
                <div className="folder-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(folder);
                    }}
                    className="edit-btn"
                    title="Rename folder"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                    className="delete-btn"
                    title="Delete folder"
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
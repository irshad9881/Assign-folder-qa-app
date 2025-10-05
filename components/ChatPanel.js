import { useState } from 'react';

export default function ChatPanel({
  folderId,
  folderName,
  onSendMessage
}) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChunks, setShowChunks] = useState(null);

  const exportToMarkdown = () => {
    const markdown = messages.map(msg => {
      let md = `## Q: ${msg.query}\n\n**A:** ${msg.answer}\n\n`;
      if (msg.citations.length > 0) {
        md += '**Sources:**\n';
        msg.citations.forEach(cite => {
          md += `- [${cite.number}] ${cite.documentName} (Page ${cite.page}) - Confidence: ${cite.confidence || 'N/A'}%\n`;
        });
        md += '\n';
      }
      return md;
    }).join('---\n\n');
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}-chat-export.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!query.trim() || !folderId || isLoading) return;

    const messageId = Date.now().toString();
    setIsLoading(true);

    try {
      const response = await onSendMessage(query);
      
      const newMessage = {
        id: messageId,
        query: query.trim(),
        answer: response.answer,
        citations: response.citations || [],
        chunks: response.chunks || []
      };

      setMessages(prev => [...prev, newMessage]);
      setQuery('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!folderId) {
    return (
      <div className="chat-panel empty">
        <p>Select a folder to start asking questions</p>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Ask questions about {folderName}</h3>
        {messages.length > 0 && (
          <button onClick={exportToMarkdown} className="btn-secondary">
            Export Chat
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Ask a question about the documents in this folder</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="message">
              <div className="query">
                <strong>Q:</strong> {message.query}
              </div>
              <div className="answer">
                <strong>A:</strong> {message.answer}
              </div>
              
              {message.citations.length > 0 && (
                <div className="citations">
                  <h4>Sources:</h4>
                  {message.citations.map((citation) => (
                    <div key={citation.number} className="citation">
                      [{citation.number}] {citation.documentName} (Page {citation.page})
                      {citation.confidence && (
                        <span className="confidence" style={{color: citation.confidence > 70 ? '#4CAF50' : citation.confidence > 40 ? '#FF9800' : '#F44336'}}>
                          {citation.confidence}% confidence
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {message.chunks && (
                    <button
                      onClick={() => setShowChunks(
                        showChunks === message.id ? null : message.id
                      )}
                      className="toggle-chunks"
                    >
                      {showChunks === message.id ? 'Hide' : 'Show'} Retrieved Chunks
                    </button>
                  )}
                  
                  {showChunks === message.id && message.chunks && (
                    <div className="chunks">
                      {message.chunks.map((chunk, i) => (
                        <div key={i} className="chunk">
                          <div className="chunk-meta">
                            {chunk.documentName} - Page {chunk.page}
                          </div>
                          <div className="chunk-content">
                            {chunk.content.substring(0, 300)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question about the documents..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!query.trim() || isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Asking...' : 'Ask'}
        </button>
      </div>
    </div>
  );
}
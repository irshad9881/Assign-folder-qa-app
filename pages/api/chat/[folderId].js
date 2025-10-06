const { searchChunks } = require('../../../lib/vectorStore');
const { generateAnswer } = require('../../../lib/llm');
const { dbAll } = require('../../../lib/database');

export default async function handler(req, res) {
  const { folderId } = req.query;

  if (req.method === 'POST') {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Check if folder has any processed documents
      const folderDocs = await dbAll(
        'SELECT * FROM documents WHERE folder_id = ? AND status = ?',
        [folderId, 'ready']
      );
      
      if (folderDocs.length === 0) {
        return res.status(200).json({
          answer: "No processed documents found in this folder. Please upload and wait for documents to be processed.",
          citations: [],
          chunks: []
        });
      }

      const searchResults = await searchChunks(folderId, query, 12);
      console.log('Search results:', searchResults);
      
      if (!searchResults.documents || searchResults.documents[0].length === 0) {
        // Fallback: search in database chunks directly
        const dbChunks = await dbAll(
          `SELECT c.*, d.name as doc_name FROM chunks c 
           JOIN documents d ON c.document_id = d.id 
           WHERE d.folder_id = ? AND d.status = 'ready' 
           AND (c.content LIKE ? OR c.content LIKE ?) 
           LIMIT 5`,
          [folderId, `%${query}%`, `%${query.toLowerCase()}%`]
        );
        
        if (dbChunks.length === 0) {
          return res.status(200).json({
            answer: "I don't know. No relevant information found in the documents.",
            citations: [],
            chunks: []
          });
        }
        
        // Use database chunks as fallback
        const fallbackChunks = dbChunks.map(chunk => ({
          content: chunk.content,
          metadata: { documentId: chunk.document_id, page: chunk.page_number },
          document: { name: chunk.doc_name },
          folderId: folderId // Add folder ID for isolation
        }));
        
        const result = await generateAnswer(query, fallbackChunks, folderId);
        
        return res.status(200).json({
          ...result,
          chunks: fallbackChunks.map(chunk => ({
            content: chunk.content,
            documentName: chunk.document?.name || 'Unknown',
            page: chunk.metadata.page
          }))
        });
      }

      const documentIds = searchResults.metadatas?.[0]?.map(m => m?.documentId) || [];
      const documents = await dbAll(
        `SELECT id, name, folder_id FROM documents WHERE id IN (${documentIds.map(() => '?').join(',')}) AND folder_id = ?`,
        [...documentIds, folderId]
      );
      
      const docMap = documents.reduce((acc, doc) => {
        acc[doc.id] = doc;
        return acc;
      }, {});

      const chunks = searchResults.documents[0].map((content, i) => ({
        content,
        metadata: searchResults.metadatas?.[0]?.[i] || {},
        document: docMap[searchResults.metadatas?.[0]?.[i]?.documentId],
        folderId: folderId // Add folder ID for isolation check
      }));
      
      // Filter chunks to only include those from valid documents in this folder
      const validChunks = chunks.filter(chunk => {
        return documents.some(d => d.id === chunk.metadata.documentId);
      });
      
      if (validChunks.length === 0) {
        console.log(`Searching in folder ${folderId}, collection has ${searchResults.documents[0].length} documents`);
        return res.status(200).json({
          answer: "I don't know. No relevant information found in this folder.",
          citations: [],
          chunks: []
        });
      }

      const result = await generateAnswer(query, validChunks, folderId);

      res.status(200).json({
        ...result,
        chunks: validChunks.map(chunk => ({
          content: chunk.content,
          documentName: chunk.document?.name || 'Unknown',
          page: chunk.metadata.page
        }))
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process query' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
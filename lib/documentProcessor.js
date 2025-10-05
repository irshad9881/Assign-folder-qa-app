const fs = require('fs');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { dbRun } = require('./database');
const { addChunks } = require('./vectorStore');

async function processDocument(documentId, folderId, filePath, fileName) {
  try {
    await dbRun('UPDATE documents SET status = ? WHERE id = ?', ['processing', documentId]);
    
    const fileBuffer = fs.readFileSync(filePath);
    let text = '';
    let pages = 1;

    if (fileName.endsWith('.pdf')) {
      const pdfData = await pdfParse(fileBuffer);
      text = pdfData.text;
      pages = pdfData.numpages;
    } else if (fileName.endsWith('.txt')) {
      text = fileBuffer.toString('utf-8');
    }

    // Update document with page count
    await dbRun('UPDATE documents SET pages = ? WHERE id = ?', [pages, documentId]);

    // Chunk the text
    const chunks = chunkText(text, documentId);
    
    // Store chunks in database
    for (const chunk of chunks) {
      await dbRun(
        'INSERT INTO chunks (id, document_id, content, page_number, chunk_index) VALUES (?, ?, ?, ?, ?)',
        [chunk.id, documentId, chunk.content, chunk.page, chunk.chunkIndex]
      );
    }

    // Add to vector store with folder isolation
    await addChunks(folderId, chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      metadata: {
        documentId,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        folderId: folderId // Ensure folder ID is embedded
      }
    })));

    await dbRun('UPDATE documents SET status = ? WHERE id = ?', ['ready', documentId]);
  } catch (error) {
    console.error('Error processing document:', error);
    await dbRun('UPDATE documents SET status = ? WHERE id = ?', ['failed', documentId]);
  }
}

function chunkText(text, documentId) {
  const chunks = [];
  const chunkSize = 1000; // ~800-1200 tokens
  const overlap = 150; // ~100-200 tokens
  const words = text.split(/\s+/);
  
  // Scale sanity: Handle large documents efficiently
  if (words.length > 100000) { // ~100+ pages
    console.log(`Processing large document with ${words.length} words`);
  }
  
  let chunkIndex = 0;
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    const content = chunkWords.join(' ');
    
    if (content.trim()) {
      chunks.push({
        id: uuidv4(),
        content: content.trim(),
        page: Math.floor(i / 500) + 1,
        chunkIndex: chunkIndex++
      });
    }
    
    // Prevent memory issues with very large documents
    if (chunkIndex > 10000) {
      console.log('Document too large, truncating at 10000 chunks');
      break;
    }
  }
  
  console.log(`Created ${chunks.length} chunks for document ${documentId}`);
  return chunks;
}

module.exports = { processDocument };
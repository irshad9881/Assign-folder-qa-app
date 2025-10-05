// Simple in-memory vector store fallback
const collections = new Map();

async function getOrCreateCollection(folderId) {
  const collectionName = `folder_${folderId}`;
  if (!collections.has(collectionName)) {
    collections.set(collectionName, {
      documents: [],
      metadatas: [],
      ids: []
    });
  }
  return collections.get(collectionName);
}

async function addChunks(folderId, chunks) {
  if (!chunks || chunks.length === 0) return;
  
  const collection = await getOrCreateCollection(folderId);
  
  chunks.forEach(chunk => {
    // Add folder ID to metadata for isolation
    const metadata = { ...chunk.metadata, folderId };
    collection.ids.push(chunk.id);
    collection.documents.push(chunk.content);
    collection.metadatas.push(metadata);
  });
  
  console.log(`Added ${chunks.length} chunks to folder ${folderId} collection`);
}

async function searchChunks(folderId, query, k = 12) {
  const collection = await getOrCreateCollection(folderId);
  
  console.log(`Searching in folder ${folderId}, collection has ${collection.documents.length} documents`);
  
  if (collection.documents.length === 0) {
    return { documents: [[]], metadatas: [[]] };
  }
  
  // Enhanced keyword matching with BM25-like scoring
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scores = collection.documents.map((doc, i) => {
    const docWords = doc.toLowerCase();
    let score = 0;
    
    queryWords.forEach(word => {
      // Exact word match
      const exactMatches = (docWords.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      score += exactMatches * 2;
      
      // Partial match
      if (docWords.includes(word)) {
        score += 1;
      }
    });
    
    return { index: i, score };
  });
  
  scores.sort((a, b) => b.score - a.score);
  const topResults = scores.slice(0, k);
  
  // Folder isolation: Filter results to ensure they belong to correct folder
  const validResults = topResults.filter(r => {
    const metadata = collection.metadatas[r.index];
    return metadata && metadata.folderId === folderId;
  });
  
  console.log(`Filtered ${validResults.length}/${topResults.length} results for folder isolation`);
  
  return {
    documents: [validResults.map(r => collection.documents[r.index])],
    metadatas: [validResults.map(r => collection.metadatas[r.index])]
  };
}

async function deleteCollection(folderId) {
  const collectionName = `folder_${folderId}`;
  collections.delete(collectionName);
}

module.exports = { getOrCreateCollection, addChunks, searchChunks, deleteCollection };
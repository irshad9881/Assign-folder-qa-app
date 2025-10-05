// Try ChromaDB first, fallback to simple vector store
let useChroma = true;
let chroma, embedder;

function initChroma() {
  if (!chroma && useChroma) {
    try {
      const { ChromaApi, OpenAIEmbeddingFunction } = require('chromadb');
      chroma = new ChromaApi({
        path: `http://${process.env.CHROMA_HOST || 'localhost'}:${process.env.CHROMA_PORT || '8000'}`
      });
      embedder = new OpenAIEmbeddingFunction({
        openai_api_key: process.env.OPENAI_API_KEY
      });
    } catch (error) {
      console.log('ChromaDB not available, using simple vector store');
      useChroma = false;
    }
  }
  return { chroma, embedder };
}

// Fallback to simple vector store
const simpleStore = require('./simpleVectorStore');

async function getOrCreateCollection(folderId) {
  if (!useChroma) {
    return simpleStore.getOrCreateCollection(folderId);
  }
  
  const { chroma, embedder } = initChroma();
  if (!chroma) {
    return simpleStore.getOrCreateCollection(folderId);
  }
  
  try {
    return await chroma.getCollection({
      name: `folder_${folderId}`,
      embeddingFunction: embedder
    });
  } catch {
    return await chroma.createCollection({
      name: `folder_${folderId}`,
      embeddingFunction: embedder
    });
  }
}

async function addChunks(folderId, chunks) {
  if (!chunks || chunks.length === 0) return;
  
  // Folder isolation: Ensure collection name is unique per folder
  console.log(`Adding ${chunks.length} chunks to folder ${folderId}`);
  
  if (!useChroma) {
    return simpleStore.addChunks(folderId, chunks);
  }
  
  try {
    const collection = await getOrCreateCollection(folderId);
    await collection.add({
      ids: chunks.map(c => c.id),
      documents: chunks.map(c => c.content),
      metadatas: chunks.map(c => c.metadata)
    });
  } catch (error) {
    console.log('ChromaDB error, falling back to simple store');
    useChroma = false;
    return simpleStore.addChunks(folderId, chunks);
  }
}

async function searchChunks(folderId, query, k = 10) {
  if (!useChroma) {
    return simpleStore.searchChunks(folderId, query, k);
  }
  
  try {
    const collection = await getOrCreateCollection(folderId);
    return await collection.query({
      queryTexts: [query],
      nResults: k
    });
  } catch (error) {
    console.log('ChromaDB error, falling back to simple store');
    useChroma = false;
    return simpleStore.searchChunks(folderId, query, k);
  }
}

async function deleteCollection(folderId) {
  if (!useChroma) {
    return simpleStore.deleteCollection(folderId);
  }
  
  try {
    const { chroma } = initChroma();
    if (chroma) {
      await chroma.deleteCollection({ name: `folder_${folderId}` });
    }
  } catch (error) {
    console.log('Collection not found or already deleted');
  }
  
  // Also clean up simple store
  simpleStore.deleteCollection(folderId);
}

module.exports = { getOrCreateCollection, addChunks, searchChunks, deleteCollection };
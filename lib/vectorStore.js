// lib/vectorStore.js

let useChroma = true;
let chromaClient = null;
let embedder = null;

const simpleStore = require("./simpleVectorStore");

function initChroma() {
  if (chromaClient || !useChroma) return { chromaClient, embedder };

  try {
    // ✅ Import only if module exists
    const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

    chromaClient = new ChromaClient({
      path: `http://${process.env.CHROMA_HOST || "localhost"}:${
        process.env.CHROMA_PORT || "8000"
      }`,
    });

    embedder = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY,
    });

    console.log("✅ Using ChromaDB as vector store");
  } catch (error) {
    console.warn("⚠️ ChromaDB not available, falling back to simple vector store");
    useChroma = false;
  }

  return { chromaClient, embedder };
}

async function getOrCreateCollection(folderId) {
  if (!useChroma) return simpleStore.getOrCreateCollection(folderId);

  const { chromaClient, embedder } = initChroma();
  if (!chromaClient) return simpleStore.getOrCreateCollection(folderId);

  const collectionName = `folder_${folderId}`;

  try {
    return await chromaClient.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    });
  } catch {
    return await chromaClient.createCollection({
      name: collectionName,
      embeddingFunction: embedder,
    });
  }
}

async function addChunks(folderId, chunks) {
  if (!chunks?.length) return;

  console.log(`📥 Adding ${chunks.length} chunks to folder ${folderId}`);

  if (!useChroma) return simpleStore.addChunks(folderId, chunks);

  try {
    const collection = await getOrCreateCollection(folderId);
    await collection.add({
      ids: chunks.map((c) => c.id),
      documents: chunks.map((c) => c.content),
      metadatas: chunks.map((c) => c.metadata),
    });
  } catch (error) {
    console.error("⚠️ ChromaDB error:", error.message);
    useChroma = false;
    return simpleStore.addChunks(folderId, chunks);
  }
}

async function searchChunks(folderId, query, k = 10) {
  if (!useChroma) return simpleStore.searchChunks(folderId, query, k);

  try {
    const collection = await getOrCreateCollection(folderId);
    const result = await collection.query({
      queryTexts: [query],
      nResults: k,
    });
    return result;
  } catch (error) {
    console.error("⚠️ ChromaDB error during search:", error.message);
    useChroma = false;
    return simpleStore.searchChunks(folderId, query, k);
  }
}

async function deleteCollection(folderId) {
  const { chromaClient } = initChroma();

  if (useChroma && chromaClient) {
    try {
      await chromaClient.deleteCollection({ name: `folder_${folderId}` });
      console.log(`🗑️ Deleted ChromaDB collection for folder ${folderId}`);
    } catch {
      console.warn(`⚠️ Collection folder_${folderId} not found or already deleted`);
    }
  }

  // Always clean fallback store too
  simpleStore.deleteCollection(folderId);
}

module.exports = {
  getOrCreateCollection,
  addChunks,
  searchChunks,
  deleteCollection,
};

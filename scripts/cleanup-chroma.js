const { ChromaApi } = require('chromadb');

async function cleanupChromaDB() {
  try {
    const chroma = new ChromaApi({
      path: `http://localhost:8000`
    });
    
    // List all collections
    const collections = await chroma.listCollections();
    console.log('Found collections:', collections.map(c => c.name));
    
    // Delete all collections to start fresh
    for (const collection of collections) {
      try {
        await chroma.deleteCollection({ name: collection.name });
        console.log(`Deleted collection: ${collection.name}`);
      } catch (error) {
        console.log(`Failed to delete ${collection.name}:`, error.message);
      }
    }
    
    console.log('ChromaDB cleanup completed');
  } catch (error) {
    console.error('ChromaDB cleanup failed:', error.message);
  }
}

cleanupChromaDB();
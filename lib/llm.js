let genAI;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch (error) {
  console.log('Gemini not available, using fallback');
}

async function generateAnswer(query, chunks, folderId = null) {
  // Honesty: Return "I don't know" when no relevant chunks found
  if (chunks.length === 0) {
    return {
      answer: "I don't know. No relevant information found in the documents.",
      citations: []
    };
  }
  
  // Folder isolation: Verify all chunks belong to the same folder
  if (folderId && chunks.some(chunk => chunk.folderId && chunk.folderId !== folderId)) {
    console.error('Folder isolation violation detected!');
    return {
      answer: "I don't know. Security error: cross-folder data detected.",
      citations: []
    };
  }

  // Check relevance - if query doesn't match any chunk content, return "I don't know"
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const citations = chunks.map((chunk, i) => {
    // Calculate confidence based on query word matches
    const chunkWords = chunk.content.toLowerCase();
    const matchCount = queryWords.reduce((count, word) => 
      count + (chunkWords.includes(word) ? 1 : 0), 0
    );
    const confidence = Math.min(100, Math.round((matchCount / queryWords.length) * 100));
    
    return {
      number: i + 1,
      documentName: chunk.document?.name || 'Unknown Document',
      page: chunk.metadata.page,
      content: chunk.content.substring(0, 200) + '...',
      confidence: confidence
    };
  });
  const hasRelevantContent = chunks.some(chunk => 
    queryWords.some(word => chunk.content.toLowerCase().includes(word))
  );
  
  if (!hasRelevantContent) {
    return {
      answer: "I don't know. The question doesn't seem related to the content in these documents.",
      citations: []
    };
  }

  // Check if API key is configured and valid
  if (!genAI || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' || process.env.GEMINI_API_KEY.length < 20) {
    const directAnswer = `Based on the documents: ${chunks.slice(0, 3).map((chunk, i) => `[${i + 1}] ${chunk.content.substring(0, 200)}`).join(' ')}`;
    return {
      answer: directAnswer,
      citations
    };
  }

  // Context guard: limit context size and summarize if too large
  let contextChunks = chunks;
  let context = chunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join('\n\n');
  
  // If context is too large (>3000 tokens ~= 12000 chars), use top chunks only
  if (context.length > 12000) {
    contextChunks = chunks.slice(0, 6); // Use top 6 chunks
    context = contextChunks.map((chunk, i) => `[${i + 1}] ${chunk.content}`).join('\n\n');
  }

  const prompt = `Based ONLY on the following context from documents, answer the question. You must be grounded in the provided context.

Context:
${context}

Question: ${query}

Instructions:
- ONLY use information explicitly stated in the provided context
- Include reference numbers [1], [2], etc. in your answer to cite sources
- If the context does not contain enough information to answer the question, respond with "I don't know"
- Do not make assumptions or add information not in the context
- Be specific and cite which document sections support your answer

Answer:`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      }
    });
    
    // Scale sanity: 8s timeout for answer latency
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Answer took too long')), 8000)
    );
    
    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise
    ]);
    
    const response = result.response;
    const answer = response.text() || "I don't know.";
    
    // Citations already created above

    return { answer, citations };
  } catch (error) {
    console.error('Gemini API Error Details:', {
      message: error.message,
      status: error.status,
      details: error.details
    });
    
    // Provide answer from chunks directly if API fails
    const directAnswer = `Based on the documents: ${chunks.slice(0, 2).map((chunk, i) => `[${i + 1}] ${chunk.content.substring(0, 200)}`).join(' ')}`;
    
    return {
      answer: directAnswer,
      citations
    };
  }
}

module.exports = { generateAnswer };
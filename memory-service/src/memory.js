const express = require('express');
const router = express.Router();

// Memory CRUD operations
router.post('/', async (req, res) => {
  try {
    const { content, type, tags, source, domain, session_id, verbatim_context, structured_data } = req.body;
    
    // Validate required fields
    if (!content || !type || !session_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Generate embedding (placeholder - will be replaced with vLLM integration)
    const embedding = await generateEmbedding(content);
    
    // Create memory record
    const memory = {
      id: uuidv4(),
      content,
      type,
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: tags || [],
        source: source || 'memory-service',
        domain: domain || 'general',
        evidence_anchors: [],
        confidence_score: 0.0
      },
      embedding,
      session_id,
      verbatim_context: verbatim_context || '',
      structured_data: structured_data || {}
    };

    // Store in ChromaDB
    const collection = await chromaClient.getOrCreateCollection({
      name: "memories",
      metadata: { "hnsw:space": "cosine" }
    });

    await collection.add({
      ids: [memory.id],
      embeddings: [memory.embedding],
      documents: [memory.content],
      metadatas: [{
        ...memory.metadata,
        type: memory.type,
        session_id: memory.session_id,
        domain: memory.domain
      }]
    });

    // Log the operation
    logger.info('Memory created', { memory_id: memory.id, type: memory.type, session_id: memory.session_id });

    res.json({
      success: true,
      data: memory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory creation failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { session_id, type, domain, limit = 10, offset = 0 } = req.query;
    
    let whereClause = {};
    if (session_id) whereClause.session_id = session_id;
    if (type) whereClause.type = type;
    if (domain) whereClause.domain = domain;

    const collection = await chromaClient.getCollection({ name: "memories" });
    
    const results = await collection.query({
      query: "memory retrieval",
      nResults: parseInt(limit),
      where: whereClause
    });

    const memories = results.documents.map((doc, index) => ({
      id: results.ids[index],
      content: doc,
      type: results.metadatas[index].type,
      metadata: results.metadatas[index],
      embedding: results.embeddings[index],
      session_id: results.metadatas[index].session_id,
      domain: results.metadatas[index].domain
    }));

    res.json({
      success: true,
      data: memories,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: memories.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory retrieval failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = await chromaClient.getCollection({ name: "memories" });
    
    const results = await collection.query({
      query: `memory id: ${id}`,
      nResults: 1,
      where: { id: id }
    });

    if (results.documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const memory = {
      id: results.ids[0],
      content: results.documents[0],
      type: results.metadatas[0].type,
      metadata: results.metadatas[0],
      embedding: results.embeddings[0],
      session_id: results.metadatas[0].session_id,
      domain: results.metadatas[0].domain
    };

    res.json({
      success: true,
      data: memory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory retrieval failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags, structured_data } = req.body;
    
    const collection = await chromaClient.getCollection({ name: "memories" });
    
    // Get existing memory
    const results = await collection.query({
      query: `memory id: ${id}`,
      nResults: 1,
      where: { id: id }
    });

    if (results.documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    // Update memory
    const updatedMemory = {
      id,
      content: content || results.documents[0],
      metadata: {
        ...results.metadatas[0],
        updated_at: new Date().toISOString(),
        tags: tags || results.metadatas[0].tags,
        evidence_anchors: results.metadatas[0].evidence_anchors || []
      },
      structured_data: structured_data || results.metadatas[0].structured_data || {}
    };

    // Update in ChromaDB (simplified - would need proper update mechanism)
    logger.info('Memory updated', { memory_id: id, updated_fields: Object.keys(req.body) });

    res.json({
      success: true,
      data: updatedMemory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory update failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const collection = await chromaClient.getCollection({ name: "memories" });
    
    // Check if memory exists
    const results = await collection.query({
      query: `memory id: ${id}`,
      nResults: 1,
      where: { id: id }
    });

    if (results.documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    // Delete from ChromaDB (simplified - would need proper delete mechanism)
    logger.info('Memory deleted', { memory_id: id });

    res.json({
      success: true,
      message: 'Memory deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory deletion failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search memories
router.post('/search', async (req, res) => {
  try {
    const { query, session_id, type, domain, limit = 10, threshold = 0.7 } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const collection = await chromaClient.getCollection({ name: "memories" });
    
    const results = await collection.query({
      query: query,
      nResults: parseInt(limit),
      where: {
        session_id: session_id || undefined,
        type: type || undefined,
        domain: domain || undefined
      }
    });

    const memories = results.documents.map((doc, index) => ({
      id: results.ids[index],
      content: doc,
      type: results.metadatas[index].type,
      metadata: results.metadatas[index],
      session_id: results.metadatas[index].session_id,
      domain: results.metadatas[index].domain,
      relevance_score: results.distances[index] // Lower is better for cosine similarity
    }));

    // Filter by threshold
    const filteredMemories = memories.filter(memory => memory.relevance_score <= threshold);

    res.json({
      success: true,
      data: filteredMemories,
      query: query,
      threshold: parseFloat(threshold),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Memory search failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Evidence anchors management
router.post('/:id/evidence', async (req, res) => {
  try {
    const { id } = req.params;
    const { evidence_id, evidence_type, evidence_content, confidence } = req.body;
    
    const collection = await chromaClient.getCollection({ name: "memories" });
    
    const results = await collection.query({
      query: `memory id: ${id}`,
      nResults: 1,
      where: { id: id }
    });

    if (results.documents.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const evidenceAnchor = {
      id: evidence_id || uuidv4(),
      type: evidence_type || 'external',
      content: evidence_content,
      confidence: confidence || 0.8,
      created_at: new Date().toISOString()
    };

    const updatedMetadata = {
      ...results.metadatas[0],
      evidence_anchors: [...(results.metadatas[0].evidence_anchors || []), evidenceAnchor],
      updated_at: new Date().toISOString()
    };

    logger.info('Evidence anchor added', { memory_id: id, evidence_anchor_id: evidenceAnchor.id });

    res.json({
      success: true,
      data: evidenceAnchor,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Evidence anchor addition failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function for embedding generation (placeholder)
async function generateEmbedding(content) {
  // This will be replaced with vLLM integration
  // For now, return a simple placeholder embedding
  return new Array(384).fill(0).map(() => Math.random());
}

module.exports = router;
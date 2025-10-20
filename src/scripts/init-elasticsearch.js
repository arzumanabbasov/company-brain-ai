// Initialize Elasticsearch index for CompanyBrain AI
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL;
const ELASTICSEARCH_API_KEY = process.env.ELASTICSEARCH_API_KEY;
const INDEX_NAME = process.env.ELASTICSEARCH_INDEX_NAME || 'companydata';

async function initializeElasticsearchIndex() {
  try {
    console.log('🚀 Initializing CompanyBrain AI Elasticsearch index...');
    
    // Check if index exists
    try {
      await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}`, {
        method: 'HEAD',
        headers: {
          'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ Index already exists, updating mapping...');
    } catch (error) {
      console.log('📝 Creating new index...');
      // Create index if it doesn't exist
      await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}`, {
        method: 'PUT',
        headers: {
          'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                company_text_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          }
        })
      });
    }
    
    // Set up field mappings for company documents
    await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}/_mapping`, {
      method: 'PUT',
      headers: {
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          // Vector field for semantic search
          embedding: {
            type: 'dense_vector',
            dims: 768, // Gemini embedding dimensions
            index: true,
            similarity: 'cosine'
          },
          // Searchable text fields
          text: {
            type: 'text',
            analyzer: 'company_text_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          title: {
            type: 'text',
            analyzer: 'company_text_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          content: {
            type: 'text',
            analyzer: 'company_text_analyzer'
          },
          // Document metadata
          type: { type: 'keyword' },
          metadata: {
            properties: {
              fileName: { type: 'keyword' },
              fileSize: { type: 'long' },
              mimeType: { type: 'keyword' },
              uploadDate: { type: 'date' },
              tags: { type: 'keyword' },
              category: { type: 'keyword' },
              author: { type: 'keyword' },
              department: { type: 'keyword' },
              project: { type: 'keyword' },
              version: { type: 'keyword' },
              language: { type: 'keyword' },
              summary: { type: 'text', analyzer: 'company_text_analyzer' }
            }
          },
          // Timestamps
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' }
        }
      })
    });
    
    console.log('✅ CompanyBrain AI Elasticsearch index initialized successfully!');
    console.log(`📊 Index: ${INDEX_NAME}`);
    console.log('🎉 You can now upload documents and start using the app!');
    
  } catch (error) {
    console.error('❌ Error initializing Elasticsearch index:', error);
    console.error('Please check your Elasticsearch URL and API key');
  }
}

// Run the initialization
initializeElasticsearchIndex();

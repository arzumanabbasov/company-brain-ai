// Elasticsearch configuration for CompanyBrain AI
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'https://my-elasticsearch-project-fd08a5.es.us-central1.gcp.elastic.cloud:443';
const ELASTICSEARCH_API_KEY = process.env.ELASTICSEARCH_API_KEY || 'Ny1YTC1Ka0JHbVEyRmFnbVhiYjE6X3NNOExvNFUtZjhGWm9LQjQ0eVRIdw==';
const INDEX_NAME = process.env.ELASTICSEARCH_INDEX_NAME || 'company-memory';

// Helper function to make authenticated requests to Elasticsearch
import { logDebug, logError, logInfo } from './logger';

async function elasticsearchRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${ELASTICSEARCH_URL}${endpoint}`;
  const started = Date.now();
  logDebug('ES', `Request -> ${endpoint}`, { method: options.method || 'GET' });
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logError('ES', `Error <- ${endpoint} (${response.status}) in ${Date.now() - started}ms`, errorText);
    throw new Error(`Elasticsearch request failed: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  logDebug('ES', `Success <- ${endpoint} in ${Date.now() - started}ms`);
  return json;
}

// Company document interface for Elasticsearch
export interface ElasticsearchCompanyDocument {
  id: string;
  title: string;
  content: string;
  text: string; // Combined searchable text
  type: 'pdf' | 'txt' | 'csv' | 'json' | 'md' | 'docx' | 'xlsx';
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadDate: string;
    tags?: string[];
    category?: string;
    author?: string;
    department?: string;
    project?: string;
    version?: string;
    language?: string;
    summary?: string;
  };
  embedding: number[];
  createdAt: string;
  updatedAt: string;
  // Optional fields present in search responses
  _id?: string;
  _score?: number;
  _highlights?: any;
}

// Initialize Elasticsearch index with proper mapping for company documents
export async function initializeElasticsearchIndex(): Promise<void> {
  try {
    console.log('Initializing CompanyBrain AI Elasticsearch index...');
    
    // Check if index exists
    let indexExists = true;
    try {
      await elasticsearchRequest(`/${INDEX_NAME}`);
      console.log('Index already exists, leaving mapping as-is.');
    } catch (error) {
      indexExists = false;
      console.log('Creating new index...');
      // Create index if it doesn't exist (no custom settings in serverless)
      await elasticsearchRequest(`/${INDEX_NAME}`, {
        method: 'PUT',
        body: JSON.stringify({})
      });
    }

    // Only apply mappings on first creation to avoid conflicts
    if (!indexExists) {
      await elasticsearchRequest(`/${INDEX_NAME}/_mapping`, {
        method: 'PUT',
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
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          title: {
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          content: {
            type: 'text',
            analyzer: 'standard'
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
              summary: { type: 'text', analyzer: 'standard' }
            }
          },
          // Timestamps
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' }
        }
        })
      });
    }
    
    console.log('CompanyBrain AI Elasticsearch index initialized successfully');
  } catch (error) {
    console.error('Error initializing Elasticsearch index:', error);
    throw error;
  }
}

// Save a single document to Elasticsearch
export async function saveDocumentToElasticsearch(document: ElasticsearchCompanyDocument): Promise<void> {
  try {
    await elasticsearchRequest(`/${INDEX_NAME}/_doc/${document.id}`, {
      method: 'PUT',
      body: JSON.stringify(document)
    });
    console.log('Document saved to Elasticsearch:', document.title);
  } catch (error) {
    console.error('Error saving document to Elasticsearch:', error);
    throw error;
  }
}

// Bulk save multiple documents to Elasticsearch
export async function bulkSaveDocumentsToElasticsearch(documents: ElasticsearchCompanyDocument[]): Promise<void> {
  try {
    if (documents.length === 0) return;
    
    const bulkBody = documents.map(doc => [
      { index: { _index: INDEX_NAME, _id: doc.id } },
      doc
    ]).flat();

    await elasticsearchRequest('/_bulk', {
      method: 'POST',
      body: bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n'
    });
    
    console.log(`Bulk saved ${documents.length} documents to Elasticsearch`);
  } catch (error) {
    console.error('Error bulk saving documents to Elasticsearch:', error);
    throw error;
  }
}

// Hybrid search: combines vector similarity and text matching
export async function hybridSearchDocuments(
  query: string, 
  embedding: number[], 
  filters?: any,
  size: number = 10
): Promise<ElasticsearchCompanyDocument[]> {
  try {
    const searchBody: any = {
      size,
      query: {
        bool: {
          should: [
            // Vector similarity search
            {
              knn: {
                field: 'embedding',
                query_vector: embedding,
                k: size * 2,
                num_candidates: 100
              }
            },
            // Text matching
            {
              multi_match: {
                query: query,
                fields: ['title^3', 'content^2', 'text', 'metadata.summary^2', 'metadata.fileName^4'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ],
          minimum_should_match: 1
        }
      },
      _source: true,
      highlight: {
        fields: {
          title: { fragment_size: 100 },
          content: { fragment_size: 200 },
          'metadata.summary': { fragment_size: 150 }
        }
      }
    };

    // Add filters if provided
    if (filters) {
      searchBody.query.bool.filter = filters;
    }

    const response = await elasticsearchRequest(`/${INDEX_NAME}/_search`, {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });

    return response.hits?.hits?.map((hit: any) => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score,
      _highlights: hit.highlight
    })) || [];
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

// Text-only search fallback
export async function textSearchDocuments(
  query: string, 
  filters?: any,
  size: number = 10
): Promise<ElasticsearchCompanyDocument[]> {
  try {
    const fields = ['title^3', 'content^2', 'text', 'metadata.summary^2', 'metadata.fileName^4'];
    const searchBody: any = {
      size,
      query: {
        dis_max: {
          tie_breaker: 0.2,
          queries: [
            {
              multi_match: {
                query,
                fields,
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            {
              query_string: {
                query,
                fields,
                default_operator: 'AND',
                lenient: true,
                analyze_wildcard: true
              }
            }
          ]
        }
      },
      _source: true,
      highlight: {
        fields: {
          title: { fragment_size: 100 },
          content: { fragment_size: 200 },
          'metadata.summary': { fragment_size: 150 }
        }
      }
    };

    // Add filters if provided
    if (filters) {
      searchBody.query = {
        bool: {
          must: searchBody.query,
          filter: filters
        }
      };
    }

    const response = await elasticsearchRequest(`/${INDEX_NAME}/_search`, {
      method: 'POST',
      body: JSON.stringify(searchBody)
    });

    return response.hits?.hits?.map((hit: any) => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score,
      _highlights: hit.highlight
    })) || [];
  } catch (error) {
    console.error('Error in text search:', error);
    throw error;
  }
}

// Get document by ID
export async function getDocumentById(id: string): Promise<ElasticsearchCompanyDocument | null> {
  try {
    const response = await elasticsearchRequest(`/${INDEX_NAME}/_doc/${id}`);
    return response._source;
  } catch (error: unknown) {
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : '';
    if (message.includes('404')) {
      return null;
    }
    console.error('Error getting document by ID:', error);
    throw error;
  }
}

// Delete document by ID
export async function deleteDocumentById(id: string): Promise<void> {
  try {
    await elasticsearchRequest(`/${INDEX_NAME}/_doc/${id}`, {
      method: 'DELETE'
    });
    console.log('Document deleted:', id);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

// Get dashboard statistics
export async function getDashboardStatistics(): Promise<any> {
  try {
    const response = await elasticsearchRequest(`/${INDEX_NAME}/_search`, {
      method: 'POST',
      body: JSON.stringify({
        size: 0,
        track_total_hits: true,
        // Use runtime keyword fields to avoid fielddata errors on text fields
        runtime_mappings: {
          type_kw: {
            type: 'keyword',
            script: "if (params._source.type != null) emit(params._source.type);"
          },
          category_kw: {
            type: 'keyword',
            script: "def m = params._source.metadata; if (m != null && m.category != null) emit(m.category);"
          },
          department_kw: {
            type: 'keyword',
            script: "def m = params._source.metadata; if (m != null && m.department != null) emit(m.department);"
          },
          author_kw: {
            type: 'keyword',
            script: "def m = params._source.metadata; if (m != null && m.author != null) emit(m.author);"
          }
        },
        aggs: {
          total_storage: { sum: { field: 'metadata.fileSize' } },
          by_type: {
            terms: { field: 'type_kw', size: 10 }
          },
          by_category: {
            terms: { field: 'category_kw', size: 10 }
          },
          by_department: {
            terms: { field: 'department_kw', size: 10 }
          },
          by_author: {
            terms: { field: 'author_kw', size: 10 }
          },
          recent_uploads: {
            top_hits: {
              sort: [{ createdAt: { order: 'desc' } }],
              size: 5,
              _source: ['title', 'type', 'metadata.fileName', 'createdAt']
            }
          },
          upload_trends: {
            date_histogram: {
              field: 'createdAt',
              calendar_interval: 'day',
              format: 'yyyy-MM-dd'
            }
          }
        }
      })
    });

    // Compose a shape compatible with processDashboardData by injecting total_documents
    return {
      ...response.aggregations,
      total_documents: { value: response.hits?.total?.value ?? 0 }
    };
  } catch (error) {
    console.error('Error getting dashboard statistics:', error);
    throw error;
  }
}

// Search suggestions/autocomplete
export async function getSearchSuggestions(query: string, size: number = 5): Promise<string[]> {
  try {
    const response = await elasticsearchRequest(`/${INDEX_NAME}/_search`, {
      method: 'POST',
      body: JSON.stringify({
        size: 0,
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title.suggest',
              size: size
            }
          }
        }
      })
    });

    return response.suggest?.title_suggest?.[0]?.options?.map((option: any) => option.text) || [];
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

// Health check
export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    // Serverless-compatible lightweight check: count documents in the index
    await elasticsearchRequest(`/${INDEX_NAME}/_count`);
    return true;
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    // If index does not exist yet, try to initialize it and retry the count
    if (message.includes('404')) {
      try {
        await initializeElasticsearchIndex();
        await elasticsearchRequest(`/${INDEX_NAME}/_count`);
        return true;
      } catch (initError) {
        console.error('Elasticsearch init during health check failed:', initError);
      }
    }
    console.error('Elasticsearch health check failed:', error);
    return false;
  }
}

// Delete all documents from the index without deleting the index itself
export async function deleteAllDocumentsFromIndex(): Promise<{ deleted: number; took: number }> {
  try {
    const response = await elasticsearchRequest(`/${INDEX_NAME}/_delete_by_query?conflicts=proceed&refresh=true`, {
      method: 'POST',
      body: JSON.stringify({
        query: { match_all: {} }
      })
    });

    return { deleted: response.deleted || 0, took: response.took || 0 };
  } catch (error) {
    console.error('Error deleting all documents from index:', error);
    throw error;
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { 
  withSecurity
} from '@/lib/middleware';
import { 
  createSuccessResponse,
  createErrorResponse,
  sanitizeInput
} from '@/lib/security';
import { 
  hybridSearchDocuments,
  textSearchDocuments,
  ElasticsearchCompanyDocument
} from '@/lib/elasticsearch';
import { logDebug, logError, logInfo } from '@/lib/logger';
import { 
  QueryRequest, 
  QueryResponse, 
  DocumentSource,
  ChatMessage 
} from '@/lib/types';

// Generate embeddings using Gemini API
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = process.env.GEMINI_API_URL;
    
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      throw new Error('Gemini API configuration missing');
    }

    // For now, we'll generate a placeholder embedding
    // In production, you would call the Gemini embedding API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate embedding for: ${text.substring(0, 1000)}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    // Placeholder: generate random embedding vector
    // In production, extract the actual embedding from the response
    const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return a zero vector as fallback
    return Array.from({ length: 768 }, () => 0);
  }
}

// Call Gemini AI API to generate response
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = process.env.GEMINI_API_URL;
    
    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      throw new Error('Gemini API configuration missing');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I was unable to generate a response at this time.';
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Convert Elasticsearch results to DocumentSource format
function convertToDocumentSources(results: ElasticsearchCompanyDocument[]): DocumentSource[] {
  return results.map((doc, index) => ({
    id: doc.id,
    title: doc.title,
    type: doc.type,
    relevanceScore: doc._score || 0,
    excerpt: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
    metadata: doc.metadata
  }));
}

// Step 1: Plan information needs (metrics, years, entities) and suggest search queries
function planInformationNeeds(userQuery: string): {
  metrics: string[];
  years: string[];
  entities: string[];
  searchQueries: string[];
} {
  const q = userQuery.toLowerCase();
  const metrics: string[] = [];
  const years: string[] = Array.from(new Set((q.match(/\b(19|20)\d{2}\b/g) || [])));
  const entities: string[] = [];

  if (/revenue|sales/i.test(userQuery)) metrics.push('revenue');
  if (/net\s*income|profit/i.test(userQuery)) metrics.push('net income');
  if (/ebitda/i.test(userQuery)) metrics.push('ebitda');
  if (/assets/i.test(userQuery)) metrics.push('assets');
  if (/liabilities/i.test(userQuery)) metrics.push('liabilities');
  if (/equity/i.test(userQuery)) metrics.push('equity');

  if (metrics.length === 0) metrics.push('revenue');

  const base = userQuery.trim();
  const searchQueries = [base];
  if (years.length > 0) {
    for (const m of metrics) {
      searchQueries.push(`${m} ${years.join(' ')}`);
      for (const y of years) searchQueries.push(`${m} ${y}`);
    }
  } else {
    for (const m of metrics) searchQueries.push(m);
  }

  return { metrics: Array.from(new Set(metrics)), years, entities, searchQueries: Array.from(new Set(searchQueries)) };
}

// Step 2: Execute multiple searches and merge/dedupe results
async function multiSearch(
  userQuery: string,
  searchQueries: string[],
  filters: any[] | undefined,
  useVectorSearch: boolean,
  maxResults: number
): Promise<ElasticsearchCompanyDocument[]> {
  const seenIds = new Set<string>();
  const merged: ElasticsearchCompanyDocument[] = [];
  const topKPerQuery = Math.max(3, Math.floor(maxResults / 2));

  for (const q of searchQueries.slice(0, 6)) {
    let results: ElasticsearchCompanyDocument[] = [];
    try {
      if (useVectorSearch) {
        const embedding = await generateEmbedding(q);
        results = await hybridSearchDocuments(q, embedding, filters, topKPerQuery);
        if (!results || results.length === 0) {
          // Fallback to text search if vector returns nothing
          results = await textSearchDocuments(q, filters, topKPerQuery);
        }
      } else {
        results = await textSearchDocuments(q, filters, topKPerQuery);
      }
    } catch (_e) {
      // Continue on error to try next query
      continue;
    }
    for (const r of results) {
      const key = r.id || r._id || `${r.title}:${r.createdAt}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        merged.push(r);
      }
    }
  }
  return merged.slice(0, maxResults);
}

// Step 3: Extract generic numeric facts (metric/year pairs) from CSV and free text
function extractMetricYearFacts(docs: ElasticsearchCompanyDocument[]): Array<{ metric: string; year: string; value: number; source: string }>{
  const facts: Array<{ metric: string; year: string; value: number; source: string }> = [];
  for (const doc of docs) {
    const src = doc.title || doc.metadata?.fileName || 'document';
    const text = doc.content || '';
    // CSV heuristic
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex(l => l.includes(',') && /revenue|net\s*income|assets|liabilities|equity|ebitda/i.test(l));
    if (headerIdx >= 0) {
      const headers = lines[headerIdx].split(',').map(h => h.trim());
      const metricIdxMap: Record<string, number> = {};
      headers.forEach((h, i) => { metricIdxMap[h.toLowerCase()] = i; });
      const monthIdx = headers.findIndex(h => /month|date|period/i.test(h));
      const metricKeys = Object.keys(metricIdxMap);
      const wanted = metricKeys.filter(k => /(revenue|net\s*income|assets|liabilities|equity|ebitda)/i.test(k));
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const row = lines[i];
        if (!row.includes(',')) continue;
        const cols = row.split(',');
        const yearMatch = (monthIdx >= 0 ? String(cols[monthIdx]) : '').match(/(19|20)\d{2}/);
        if (!yearMatch) continue;
        const year = yearMatch[0];
        for (const mk of wanted) {
          const idx = metricIdxMap[mk];
          const raw = cols[idx]?.trim();
          const val = parseFloat(raw?.replace(/[^0-9.\-]/g, '') || '');
          if (!Number.isNaN(val)) {
            facts.push({ metric: mk, year, value: val, source: src });
          }
        }
      }
      continue;
    }
    // Free text heuristic: e.g., "Revenue in 2021 was 12345"
    const re = /(revenue|net\s*income|assets|liabilities|equity|ebitda)[^\d]*(19|20)\d{2}[^\d]*([\$€£]?[\s]*[\d,.]+)/ig;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const metric = m[1].toLowerCase();
      const year = m[2];
      const num = parseFloat(m[3].replace(/[^0-9.\-]/g, ''));
      if (!Number.isNaN(num)) facts.push({ metric, year, value: num, source: src });
    }
  }
  return facts;
}

// Build search filters from query request
function buildSearchFilters(filters?: any): any[] {
  const searchFilters: any[] = [];

  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    searchFilters.push({
      terms: { type: filters.documentTypes }
    });
  }

  if (filters?.categories && filters.categories.length > 0) {
    searchFilters.push({
      terms: { 'metadata.category.keyword': filters.categories }
    });
  }

  if (filters?.departments && filters.departments.length > 0) {
    searchFilters.push({
      terms: { 'metadata.department.keyword': filters.departments }
    });
  }

  if (filters?.tags && filters.tags.length > 0) {
    searchFilters.push({
      terms: { 'metadata.tags': filters.tags }
    });
  }

  if (filters?.dateRange) {
    searchFilters.push({
      range: {
        createdAt: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        }
      }
    });
  }

  return searchFilters;
}

// Generate AI response based on search results
async function generateAIResponse(
  query: string, 
  searchResults: ElasticsearchCompanyDocument[], 
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const sanitizedQuery = sanitizeInput(query);
  logInfo('QUERY', 'Generating AI response', { query: sanitizedQuery, results: searchResults.length, chatHistory: chatHistory.length });
  // Build context from search results
  const searchContext = searchResults.length > 0 ? `
Company Knowledge Base (${searchResults.length} relevant documents found):

${searchResults.slice(0, 5).map((doc, index) => `
${index + 1}. **${doc.title}** (${doc.type.toUpperCase()})
   Category: ${doc.metadata.category || 'N/A'}
   Department: ${doc.metadata.department || 'N/A'}
   Content: ${doc.content.substring(0, 300)}${doc.content.length > 300 ? '...' : ''}
`).join('\n')}
` : '';

  // Build conversation history context
  const conversationContext = chatHistory.length > 0 ? `
Recent Conversation History:
${chatHistory.slice(-6).map((msg, index) => 
  `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
).join('\n')}
` : '';

  const prompt = `You are CompanyBrain AI, an intelligent assistant that helps users find information from their company's knowledge base.

${searchContext}

${conversationContext}

User Question: ${sanitizedQuery}

Instructions:
1. Base your answer ONLY on the provided company documents; do not fabricate.
2. If documents contain relevant information, use it to answer concisely with brief citations (e.g., Doc 1, Doc 2).
3. If no relevant documents are found, say so briefly and suggest next steps.
4. Do NOT use tools, calculators, or external resources.
5. Perform any calculations mentally and show ONLY final results (no steps).
6. Do NOT reveal chain-of-thought or reasoning; provide the answer and concise citations only.
7. Be helpful, professional, and conversational.
8. Use conversation history only for context, not as a source of facts.

Format your response as a short answer followed by optional citations like (Doc 1, Doc 3).`;

  try {
    logDebug('QUERY', 'Composed prompt', { length: prompt.length });
    // Add a compact structured financials context if present
    const financials: Record<string, number> = {};
    for (const doc of searchResults) {
      if (doc.type === 'csv' && /revenue/i.test(doc.content)) {
        const found = extractRevenueByYearFromCsvContent(doc.content);
        for (const [y, v] of Object.entries(found)) {
          financials[y] = (financials[y] || 0) + v;
        }
      }
    }
    const financialsBlock = Object.keys(financials).length
      ? `\nStructured Financial Data (from documents)\nRevenueByYear: ${JSON.stringify(financials)}\n\n`
      : '';

    const finalPrompt = financialsBlock + prompt;
    logDebug('QUERY', 'Final prompt length', { length: finalPrompt.length, hasFinancials: !!financialsBlock });
    const response = await callGeminiAPI(finalPrompt);
    logInfo('QUERY', 'Model response received', { length: response.length });
    return response;
  } catch (error) {
    logError('QUERY', 'Error generating AI response', error);
    return 'I apologize, but I\'m having trouble processing your question right now. Please try again later.';
  }
}

// Extract simple financials from CSV-like content embedded in stored documents
function extractRevenueByYearFromCsvContent(content: string): Record<string, number> {
  const revenueByYear: Record<string, number> = {};
  try {
    // Expect the upload to have saved: "CSV Data:\nHeaders: ...\n" followed by raw rows
    const lines = content.split(/\r?\n/).filter(Boolean);
    // Find the first line that looks like a CSV header (contains commas and 'Revenue')
    let headerIdx = lines.findIndex(l => l.includes(',') && /revenue/i.test(l));
    if (headerIdx === -1) return revenueByYear;
    const headers = lines[headerIdx].split(',').map(h => h.trim());
    const monthIdx = headers.findIndex(h => /month/i.test(h));
    const revenueIdx = headers.findIndex(h => /revenue/i.test(h));
    if (revenueIdx === -1) return revenueByYear;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row.includes(',')) continue;
      const cols = row.split(',');
      const revenueRaw = cols[revenueIdx]?.trim();
      const revenue = parseFloat(revenueRaw?.replace(/[^0-9.\-]/g, '') || '');
      if (Number.isNaN(revenue)) continue;
      let year = 'unknown';
      if (monthIdx >= 0) {
        const monthVal = cols[monthIdx] || '';
        const m = String(monthVal).match(/(20\d{2}|19\d{2})/);
        if (m) year = m[1];
      }
      if (year === 'unknown') continue;
      revenueByYear[year] = (revenueByYear[year] || 0) + revenue;
    }
  } catch (_e) {
    // ignore parse errors; return what we have
  }
  return revenueByYear;
}

// Expand the user query with hints for document types/fields
function expandUserQuery(query: string): string {
  const q = query.toLowerCase();
  const docTypes: string[] = [];
  const fields: string[] = ['title', 'content', 'metadata.summary'];
  const metaHints: string[] = [];

  if (q.includes('policy') || q.includes('guideline') || q.includes('procedure')) docTypes.push('pdf', 'docx', 'md');
  if (q.includes('report') || q.includes('metrics') || q.includes('trend')) docTypes.push('xlsx', 'csv', 'pdf');
  if (q.includes('api') || q.includes('schema') || q.includes('json')) docTypes.push('json', 'md');
  if (q.includes('meeting') || q.includes('notes')) docTypes.push('txt', 'md', 'docx');

  if (q.includes('department')) metaHints.push('metadata.department');
  if (q.includes('author') || q.includes('owner')) metaHints.push('metadata.author');
  if (q.includes('tag') || q.includes('topic')) metaHints.push('metadata.tags');
  if (q.includes('category')) metaHints.push('metadata.category');

  const uniqueDocTypes = Array.from(new Set(docTypes));
  const uniqueFields = Array.from(new Set([...fields, ...metaHints]));

  return `Focus on document types: ${uniqueDocTypes.length ? uniqueDocTypes.join(', ') : 'pdf, docx, md, xlsx, csv, json, txt'}. Search fields: ${uniqueFields.join(', ')}.`;
}

// Main query handler
async function handleQuery(request: NextRequest): Promise<NextResponse<QueryResponse>> {
  try {
    const body = await request.json();
    logInfo('QUERY', 'Incoming request', { body });
    const { query, filters, chatHistory = [], useVectorSearch = true, maxResults = 10 }: QueryRequest = body;
    const sanitizedQuery = sanitizeInput(query);

    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      return createErrorResponse('Query is required', 400);
    }

    logInfo('QUERY', 'Processing', { query: sanitizedQuery, filters, chatHistoryLen: chatHistory.length });

    const startTime = Date.now();
    let searchResults: ElasticsearchCompanyDocument[] = [];
    let answer = '';

    try {
      // Build search filters
      const searchFilters = buildSearchFilters(filters);

      // Plan info needs and generate multiple queries
      const plan = planInformationNeeds(sanitizedQuery);
      logInfo('QUERY', 'Plan', plan);
      const queries = [sanitizedQuery, ...plan.searchQueries];

      // Multi-search and merge results
      searchResults = await multiSearch(
        sanitizedQuery,
        queries,
        searchFilters.length > 0 ? searchFilters : undefined,
        useVectorSearch,
        maxResults
      );
      logInfo('QUERY', 'Search complete', { totalResults: searchResults.length });

      console.log(`Found ${searchResults.length} relevant documents`);

      // Generate AI response
      answer = await generateAIResponse(sanitizedQuery, searchResults, chatHistory);

    } catch (error) {
      logError('QUERY', 'Search or AI processing failed', error);
      answer = 'I apologize, but I\'m having trouble searching your company knowledge base right now. Please try again later.';
    }

    const queryTime = Date.now() - startTime;
    const sources = convertToDocumentSources(searchResults);
    const expandedQuery = expandUserQuery(sanitizedQuery);

    return createSuccessResponse({
      answer,
      sources,
      totalHits: searchResults.length,
      queryTime,
      expandedQuery
    });

  } catch (error) {
    logError('QUERY', 'Unhandled query error', error);
    return createErrorResponse('Internal server error during query processing', 500);
  }
}

// Validation schema for query requests
const querySchema = {
  type: 'object',
  properties: {
    query: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 1000 
    },
    filters: {
      type: 'object',
      properties: {
        documentTypes: { 
          type: 'array', 
          items: { 
            type: 'string',
            enum: ['pdf', 'txt', 'csv', 'json', 'md', 'docx', 'xlsx']
          } 
        },
        categories: { 
          type: 'array', 
          items: { type: 'string' } 
        },
        departments: { 
          type: 'array', 
          items: { type: 'string' } 
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' } 
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          }
        }
      }
    },
    chatHistory: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          isUser: { type: 'boolean' },
          timestamp: { type: 'string' }
        }
      }
    },
    useVectorSearch: { type: 'boolean' },
    maxResults: { type: 'number', minimum: 1, maximum: 50 }
  },
  required: ['query']
};

export const POST = withSecurity(
  handleQuery,
  { rateLimit: 50, rateLimitWindow: 15 * 60 * 1000 } // 50 queries per 15 minutes
);

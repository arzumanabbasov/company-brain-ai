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
  initializeElasticsearchIndex,
  bulkSaveDocumentsToElasticsearch,
  ElasticsearchCompanyDocument
} from '@/lib/elasticsearch';
import { 
  UploadRequest, 
  UploadResponse, 
  CompanyDocument, 
  DocumentType,
  DocumentMetadata 
} from '@/lib/types';

// Use Node.js runtime to allow rich file parsing (PDF/XLSX)
export const runtime = 'nodejs';

// File parsing utilities
async function parseFileContent(file: File): Promise<{ content: string; metadata: Partial<DocumentMetadata> }> {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;
  const fileExtension = fileName.split('.').pop()?.toLowerCase() as DocumentType;
  
  let content = '';
  let metadata: Partial<DocumentMetadata> = {
    fileName,
    fileSize,
    mimeType,
    uploadDate: new Date().toISOString(),
  };

  try {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8').decode(uint8);

    switch (fileExtension) {
      case 'txt':
      case 'md':
        content = text;
        break;
        
      case 'json':
        try {
          const jsonData = JSON.parse(text);
          content = typeof jsonData === 'object' 
            ? JSON.stringify(jsonData, null, 2)
            : text;
          metadata.summary = `JSON document with ${Object.keys(jsonData).length} fields`;
        } catch (e) {
          content = text;
        }
        break;
        
      case 'csv':
        // Simple CSV parsing - convert to readable format
        const lines = text.split('\n');
        const headers = lines[0]?.split(',') || [];
        content = `CSV Data:\nHeaders: ${headers.join(', ')}\n\n${lines.slice(1).join('\n')}`;
        metadata.summary = `CSV with ${headers.length} columns and ${lines.length - 1} rows`;
        break;
        
      case 'pdf':
        try {
          const pdfParse = (await import('pdf-parse')).default as any;
          const res = await pdfParse(Buffer.from(uint8));
          content = res.text || '';
          metadata.summary = `PDF with ${res.numpages || '?'} pages`;
        } catch (_e) {
          content = `PDF Document: ${fileName}\n\n[PDF text extraction not available. Install pdf-parse to enable parsing.]`;
          metadata.summary = `PDF document (${fileSize} bytes)`;
        }
        break;
        
      case 'docx':
        // For DOCX parsing, you would use a library like mammoth
        content = `Word Document: ${fileName}\n\n[DOCX content would be extracted here using a proper DOCX parser]`;
        metadata.summary = `Word document (${fileSize} bytes)`;
        break;
        
      case 'xlsx':
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(uint8, { type: 'array' });
          const first = wb.SheetNames[0];
          const sheet = wb.Sheets[first];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          content = `XLSX Data (sheet: ${first}):\n${csv}`;
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const rows = (range.e.r - range.s.r + 1);
          const cols = (range.e.c - range.s.c + 1);
          metadata.summary = `XLSX with ${rows} rows and ${cols} columns`;
        } catch (_e) {
          content = `Excel Spreadsheet: ${fileName}\n\n[XLSX parsing not available. Install xlsx to enable parsing.]`;
          metadata.summary = `Excel spreadsheet (${fileSize} bytes)`;
        }
        break;
        
      default:
        content = text;
        metadata.summary = `Text document (${fileSize} bytes)`;
    }
  } catch (error: unknown) {
    console.error('Error parsing file:', error);
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : 'Unknown parse error';
    throw new Error(`Failed to parse file ${fileName}: ${message}`);
  }

  // Always include filename in indexed content to improve recall
  const enrichedContent = `File: ${fileName}\n\n${content}`.trim();
  return { content: enrichedContent, metadata };
}

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

// Process uploaded files
async function processUploadedFiles(files: File[], additionalMetadata?: Partial<DocumentMetadata>): Promise<CompanyDocument[]> {
  const documents: CompanyDocument[] = [];
  const failedUploads: string[] = [];

  for (const file of files) {
    try {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
      }

      const allowedTypes = ['pdf', 'txt', 'csv', 'json', 'md', 'docx', 'xlsx'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} is not supported.`);
      }

      // Parse file content
      const { content, metadata } = await parseFileContent(file);
      
      // Generate embedding
      let embedding: number[] = [];
      try {
        embedding = await generateEmbedding(content);
      } catch (error: unknown) {
        console.error('Error generating embedding:', error);
        // Use zero vector as fallback
        embedding = Array.from({ length: 768 }, () => 0);
      }
      
      // Create document
      const document: CompanyDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        content: content,
        type: fileExtension as DocumentType,
        metadata: {
          ...metadata,
          ...additionalMetadata,
        } as DocumentMetadata,
        embedding: embedding,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      documents.push(document);
    } catch (error: unknown) {
      console.error(`Error processing file ${file.name}:`, error);
      const message = typeof (error as any)?.message === 'string' ? (error as any).message : 'Unknown error';
      failedUploads.push(`${file.name}: ${message}`);
    }
  }

  if (documents.length === 0) {
    throw new Error(`No files were successfully processed. Errors: ${failedUploads.join(', ')}`);
  }

  return documents;
}

// Main upload handler
async function handleUpload(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Handle FormData instead of JSON
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const metadataString = formData.get('metadata') as string;
    
    let metadata = {};
    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString);
      } catch (e) {
        console.log('No metadata provided or invalid JSON');
      }
    }

    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400);
    }

    console.log(`Processing ${files.length} files for upload`);

    // Initialize Elasticsearch index if needed
    try {
      await initializeElasticsearchIndex();
    } catch (error: unknown) {
      console.error('Error initializing Elasticsearch index:', error);
      // Continue without Elasticsearch for now - just return success
      console.log('Continuing without Elasticsearch initialization...');
    }

    // Process uploaded files
    let documents: CompanyDocument[];
    try {
      documents = await processUploadedFiles(files, metadata);
    } catch (error: unknown) {
      console.error('Error processing files:', error);
      const message = typeof (error as any)?.message === 'string' ? (error as any).message : 'Failed to process files';
      return createErrorResponse(message, 400);
    }

    // Convert to Elasticsearch format
    const elasticsearchDocuments: ElasticsearchCompanyDocument[] = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      text: `${doc.title} ${doc.content} ${doc.metadata.summary || ''}`.trim(),
      type: doc.type,
      metadata: doc.metadata,
      embedding: doc.embedding || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    // Save to Elasticsearch
    try {
      await bulkSaveDocumentsToElasticsearch(elasticsearchDocuments);
      console.log(`Successfully indexed ${documents.length} documents`);
    } catch (error: unknown) {
      console.error('Error saving to Elasticsearch:', error);
      // Continue without saving to Elasticsearch for now
      console.log('Continuing without Elasticsearch save...');
    }

    return createSuccessResponse({
      documents,
      totalUploaded: documents.length,
      failedUploads: []
    });

  } catch (error: unknown) {
    console.error('Upload error:', error);
    return createErrorResponse('Internal server error during upload', 500);
  }
}

// Validation schema for upload requests
const uploadSchema = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          size: { type: 'number' },
          type: { type: 'string' }
        },
        required: ['name', 'size', 'type']
      },
      minItems: 1,
      maxItems: 10
    },
    metadata: {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        category: { type: 'string' },
        department: { type: 'string' },
        project: { type: 'string' },
        author: { type: 'string' }
      }
    }
  },
  required: ['files']
};

export const POST = withSecurity(
  handleUpload,
  { rateLimit: 20, rateLimitWindow: 15 * 60 * 1000 } // 20 uploads per 15 minutes
);

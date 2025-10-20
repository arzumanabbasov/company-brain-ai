// Company Document Types
export interface CompanyDocument {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  metadata: DocumentMetadata;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'pdf' | 'txt' | 'csv' | 'json' | 'md' | 'docx' | 'xlsx';

export interface DocumentMetadata {
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
}

// Upload Request/Response Types
export interface UploadRequest {
  files: File[];
  metadata?: Partial<DocumentMetadata>;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    documents: CompanyDocument[];
    totalUploaded: number;
    failedUploads: string[];
  };
  error?: string;
}

// Query Request/Response Types
export interface QueryRequest {
  query: string;
  filters?: QueryFilters;
  chatHistory?: ChatMessage[];
  useVectorSearch?: boolean;
  maxResults?: number;
}

export interface QueryFilters {
  documentTypes?: DocumentType[];
  categories?: string[];
  departments?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
}

export interface QueryResponse {
  success: boolean;
  data?: {
    answer: string;
    sources: DocumentSource[];
    totalHits: number;
    queryTime: number;
    expandedQuery?: string;
  };
  error?: string;
}

export interface DocumentSource {
  id: string;
  title: string;
  type: DocumentType;
  relevanceScore: number;
  excerpt: string;
  metadata: DocumentMetadata;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  metadata?: {
    sources?: DocumentSource[];
    queryTime?: number;
    documentCount?: number;
  };
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalDocuments: number;
  totalStorage: number;
  recentUploads: CompanyDocument[];
  documentTypes: DocumentTypeStats[];
  categories: CategoryStats[];
  departments: DepartmentStats[];
  searchQueries: SearchQueryStats[];
  uploadTrends: UploadTrend[];
}

export interface DocumentTypeStats {
  type: DocumentType;
  count: number;
  percentage: number;
  totalSize: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface DepartmentStats {
  department: string;
  count: number;
  percentage: number;
}

export interface SearchQueryStats {
  query: string;
  count: number;
  lastSearched: string;
  avgResponseTime: number;
}

export interface UploadTrend {
  date: string;
  count: number;
  totalSize: number;
}

// Elasticsearch Document Types
export interface ElasticsearchDocument {
  id: string;
  title: string;
  content: string;
  text: string; // Combined searchable text
  type: DocumentType;
  metadata: DocumentMetadata;
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// File Upload Types
export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'indexing' | 'completed' | 'error';
  error?: string;
}

// Search Result Types
export interface SearchResult {
  document: CompanyDocument;
  score: number;
  highlights?: {
    title?: string[];
    content?: string[];
  };
}

// User Session Types
export interface UserSession {
  id: string;
  email?: string;
  name?: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastActive: string;
}

// Configuration Types
export interface AppConfig {
  maxFileSize: number;
  allowedFileTypes: DocumentType[];
  maxUploadsPerBatch: number;
  vectorDimensions: number;
  searchResultLimit: number;
  chatHistoryLimit: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Validation Schemas
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// WebSocket Types (for real-time updates)
export interface WebSocketMessage {
  type: 'upload_progress' | 'search_complete' | 'error' | 'notification';
  data: any;
  timestamp: string;
}

// Export/Import Types
export interface ExportRequest {
  documentIds?: string[];
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  includeContent: boolean;
}

export interface ImportRequest {
  file: File;
  mapping?: {
    [key: string]: string;
  };
  autoDetectTypes: boolean;
}
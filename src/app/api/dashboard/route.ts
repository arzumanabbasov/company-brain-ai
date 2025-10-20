import { NextRequest, NextResponse } from 'next/server';
import { 
  withSecurity
} from '@/lib/middleware';
import { 
  createSuccessResponse,
  createErrorResponse
} from '@/lib/security';
import { 
  getDashboardStatistics,
  checkElasticsearchHealth,
  deleteAllDocumentsFromIndex
} from '@/lib/elasticsearch';
import { 
  DashboardStats,
  DocumentTypeStats,
  CategoryStats,
  DepartmentStats,
  UploadTrend
} from '@/lib/types';

// Process raw Elasticsearch aggregations into dashboard stats
function processDashboardData(rawData: any): DashboardStats {
  const totalDocuments = rawData.total_documents?.value || 0;
  const totalStorage = rawData.total_storage?.value || 0;
  
  // Process document types
  const documentTypes: DocumentTypeStats[] = (rawData.by_type?.buckets || []).map((bucket: any) => ({
    type: bucket.key,
    count: bucket.doc_count,
    percentage: totalDocuments > 0 ? (bucket.doc_count / totalDocuments) * 100 : 0,
    totalSize: bucket.total_size?.value || 0
  }));

  // Process categories
  const categories: CategoryStats[] = (rawData.by_category?.buckets || []).map((bucket: any) => ({
    category: bucket.key,
    count: bucket.doc_count,
    percentage: totalDocuments > 0 ? (bucket.doc_count / totalDocuments) * 100 : 0
  }));

  // Process departments
  const departments: DepartmentStats[] = (rawData.by_department?.buckets || []).map((bucket: any) => ({
    department: bucket.key,
    count: bucket.doc_count,
    percentage: totalDocuments > 0 ? (bucket.doc_count / totalDocuments) * 100 : 0
  }));

  // Process recent uploads
  const recentUploads = (rawData.recent_uploads?.hits?.hits || []).map((hit: any) => ({
    id: hit._source.id,
    title: hit._source.title,
    type: hit._source.type,
    metadata: hit._source.metadata,
    createdAt: hit._source.createdAt
  }));

  // Process upload trends
  const uploadTrends: UploadTrend[] = (rawData.upload_trends?.buckets || []).map((bucket: any) => ({
    date: bucket.key_as_string || bucket.key,
    count: bucket.doc_count,
    totalSize: bucket.total_size?.value || 0
  }));

  return {
    totalDocuments,
    totalStorage,
    recentUploads,
    documentTypes,
    categories,
    departments,
    searchQueries: [], // This would be populated from a separate search log
    uploadTrends
  };
}

// Main dashboard handler
async function handleDashboard(request: NextRequest): Promise<NextResponse<DashboardStats>> {
  try {
    console.log('Fetching dashboard statistics...');

    // Check Elasticsearch health first
    const isHealthy = await checkElasticsearchHealth();
    if (!isHealthy) {
      return createErrorResponse('Search service is currently unavailable', 503);
    }

    // Get raw statistics from Elasticsearch
    const rawData = await getDashboardStatistics();
    
    // Process the data into dashboard format
    const dashboardStats = processDashboardData(rawData);

    console.log('Dashboard statistics retrieved successfully:', {
      totalDocuments: dashboardStats.totalDocuments,
      totalStorage: dashboardStats.totalStorage,
      documentTypes: dashboardStats.documentTypes.length,
      categories: dashboardStats.categories.length,
      departments: dashboardStats.departments.length
    });

    return createSuccessResponse(dashboardStats);

  } catch (error) {
    console.error('Dashboard error:', error);
    return createErrorResponse('Internal server error while fetching dashboard data', 500);
  }
}

// Validation schema for dashboard requests
const dashboardSchema = {
  type: 'object',
  properties: {
    // Dashboard doesn't require any specific parameters
  }
};

export const GET = withSecurity(
  handleDashboard,
  { rateLimit: 30, rateLimitWindow: 15 * 60 * 1000 } // 30 requests per 15 minutes
);

// Clear all documents handler
async function handleClear(request: NextRequest) {
  try {
    const isHealthy = await checkElasticsearchHealth();
    if (!isHealthy) {
      return createErrorResponse('Search service is currently unavailable', 503);
    }

    const result = await deleteAllDocumentsFromIndex();
    return createSuccessResponse({ message: 'All documents deleted', ...result });
  } catch (error) {
    console.error('Clear index documents error:', error);
    return createErrorResponse('Failed to delete documents', 500);
  }
}

export const POST = withSecurity(
  handleClear,
  { rateLimit: 5, rateLimitWindow: 5 * 60 * 1000, allowedMethods: ['POST','OPTIONS'] }
);

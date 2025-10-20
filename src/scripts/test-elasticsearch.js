// Test Elasticsearch connection and initialize index
const ELASTICSEARCH_URL = 'https://company-data-f01b4e.es.us-central1.gcp.elastic.cloud:443';
const ELASTICSEARCH_API_KEY = 'dkZGcUFKb0JQLVNpVDF5RDNUbGI6djgzb0VMc0djSjY2aGFXM2VxeDVBQQ==';
const INDEX_NAME = 'companydata';

async function testElasticsearch() {
  try {
    console.log('🚀 Testing Elasticsearch connection...');
    
    // Test connection
    const healthResponse = await fetch(`${ELASTICSEARCH_URL}/_cluster/health`, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Elasticsearch connection successful!');
      console.log(`📊 Cluster status: ${health.status}`);
    } else {
      console.log('❌ Elasticsearch connection failed');
      return;
    }
    
    // Check if index exists
    const indexResponse = await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (indexResponse.ok) {
      console.log('✅ Index already exists!');
    } else {
      console.log('📝 Creating index...');
      
      // Create index
      const createResponse = await fetch(`${ELASTICSEARCH_URL}/${INDEX_NAME}`, {
        method: 'PUT',
        headers: {
          'Authorization': `ApiKey ${ELASTICSEARCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          }
        })
      });
      
      if (createResponse.ok) {
        console.log('✅ Index created successfully!');
      } else {
        console.log('❌ Failed to create index');
        const error = await createResponse.text();
        console.log('Error:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testElasticsearch();

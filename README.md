# 🧠 CompanyBrain AI - Your Company's Second Brain

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5.6-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Elasticsearch-8.0-005571?style=for-the-badge&logo=elasticsearch" alt="Elasticsearch" />
  <img src="https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google" alt="Google Gemini" />
</div>

<div align="center">
  <h3>🤖 Intelligent Company Knowledge Management with AI</h3>
  <p>Upload any document, ask any question about your company. Powered by Elasticsearch and Gemini AI.</p>
</div>

---

## ✨ Features

### 📁 **Universal Document Upload**
- **Multi-Format Support**: PDFs, TXT, CSV, JSON files
- **Smart Parsing**: Automatic content extraction and processing
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Batch Processing**: Upload multiple files simultaneously

### 🧠 **Intelligent Q&A System**
- **Ask Anything**: Natural language questions about your company data
- **Hybrid Search**: Combines vector similarity and text matching
- **Context-Aware**: Understands document relationships and context
- **Source Attribution**: Always shows which documents informed the answer

### 📊 **Analytics Dashboard**
- **Document Statistics**: Total files, recent uploads, storage usage
- **Content Insights**: Document types, keyword frequency, trends
- **Search Analytics**: Popular queries, search patterns
- **Performance Metrics**: Response times, accuracy scores

### 🔒 **Enterprise-Grade Security**
- **Rate Limiting**: Prevents API abuse and ensures fair usage
- **Input Validation**: Comprehensive sanitization and validation
- **Secure Storage**: Encrypted document storage in Elasticsearch
- **Access Control**: Role-based permissions and audit logs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Elasticsearch 8.0+ cluster
- Google Gemini API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/companybrain-ai.git
cd companybrain-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Elasticsearch Configuration
ELASTICSEARCH_URL=your_elasticsearch_url
ELASTICSEARCH_API_KEY=your_elasticsearch_api_key
ELASTICSEARCH_INDEX_NAME=company-memory

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent

# Security
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
ALLOWED_ORIGINS=http://localhost:3000

# Environment
NODE_ENV=development
```

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── upload/          # Document upload and indexing
│   │   ├── query/           # AI-powered Q&A system
│   │   └── dashboard/       # Analytics and statistics
│   ├── upload/              # File upload page
│   ├── chat/                # Q&A chat interface
│   ├── dashboard/           # Analytics dashboard
│   └── page.tsx             # Landing page
├── components/
│   ├── UploadPage.tsx       # File upload component
│   ├── ChatInterface.tsx    # Q&A chat component
│   └── Dashboard.tsx        # Analytics dashboard
└── lib/
    ├── config.ts            # Environment configuration
    ├── elasticsearch.ts     # Elasticsearch utilities
    ├── middleware.ts        # Security middleware
    ├── security.ts          # Security utilities
    └── types.ts             # TypeScript definitions
```

## 🎯 How It Works

### 1. **Document Processing**
- Upload files through the intuitive interface
- Automatic content extraction and parsing
- Generate embeddings using Gemini AI
- Index in Elasticsearch with metadata

### 2. **Intelligent Search**
- Hybrid search combining vector similarity and text matching
- Context-aware retrieval based on question intent
- Ranking by relevance and recency
- Source attribution for transparency

### 3. **AI-Powered Responses**
- Gemini AI generates contextual answers
- Grounded in retrieved document content
- Natural language explanations
- Follow-up question suggestions

## 🔒 Security Features

- **Input Sanitization**: All user inputs are sanitized
- **Rate Limiting**: Configurable limits per endpoint
- **CORS Protection**: Secure cross-origin requests
- **API Key Management**: Environment-based configuration
- **Error Handling**: Secure error messages without sensitive data

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload and index documents |
| `/api/query` | POST | AI-powered Q&A system |
| `/api/dashboard` | GET | Analytics and statistics |

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Add environment variables**
4. **Deploy automatically**

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** for AI capabilities
- **Elasticsearch** for search and analytics
- **Next.js** for the amazing framework
- **Tailwind CSS** for beautiful styling
- **Framer Motion** for smooth animations

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/companybrain-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/companybrain-ai/discussions)
- **Email**: your-email@example.com

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a></p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>
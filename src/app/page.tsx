'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Upload, 
  MessageSquare, 
  BarChart3, 
  Zap, 
  Database,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    router.push('/chat');
  };

  const features = [
    {
      icon: <Upload className="w-8 h-8 text-blue-500" />,
      title: "Universal Document Upload",
      description: "Upload PDFs, TXT, CSV, JSON, Markdown, Word, and Excel files with intelligent parsing and processing."
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-purple-500" />,
      title: "Intelligent Q&A System",
      description: "Ask any question about your company data with AI-powered responses grounded in your documents."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-500" />,
      title: "Analytics Dashboard",
      description: "Get insights into your knowledge base with document statistics, trends, and search analytics."
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Hybrid Search",
      description: "Combines vector similarity and text matching for the most relevant search results."
    },
    {
      icon: <Database className="w-8 h-8 text-indigo-500" />,
      title: "Elasticsearch Powered",
      description: "Enterprise-grade search and analytics powered by Elasticsearch 8.0 with vector capabilities."
    },
    {
      icon: <Brain className="w-8 h-8 text-pink-500" />,
      title: "AI-Powered Insights",
      description: "Leverage Gemini 2.0 Flash for intelligent content analysis and contextual responses."
    }
  ];

  const benefits = [
    "Save time finding information across all your documents",
    "Get instant answers to complex questions about your company",
    "Organize and categorize your knowledge base automatically",
    "Track document usage and search patterns",
    "Secure, enterprise-grade document storage and search"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-xl">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-6xl font-bold text-gradient">CompanyBrain AI</h1>
            </div>
            <p className="text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Your company's second brain - AI-powered knowledge management
            </p>
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              Upload any document, ask any question. Get intelligent answers grounded in your company's knowledge base.
            </p>
            
            <motion.button
              onClick={handleGetStarted}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-primary text-white text-xl font-semibold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </motion.button>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Teams
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to transform your company's documents into an intelligent knowledge base
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose CompanyBrain AI?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Transform how your team accesses and utilizes company knowledge with our intelligent AI assistant.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">CompanyBrain AI</h3>
                      <p className="text-sm text-gray-500">Knowledge Assistant</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">User:</p>
                      <p className="text-gray-900">"What are our Q4 sales targets?"</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">AI Assistant:</p>
                      <p className="text-gray-900">"Based on your Q4 planning document, your sales targets are $2.5M for Q4, representing a 15% increase from Q3. The key focus areas are enterprise clients and new market expansion."</p>
                      <div className="mt-2 text-xs text-blue-600">
                        📄 Source: Q4_Planning_Document.pdf
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Company's Knowledge?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join teams who are already using CompanyBrain AI to unlock the power of their documents.
            </p>
            <motion.button
              onClick={handleGetStarted}
              disabled={isLoading}
              className="px-8 py-4 bg-white text-blue-600 text-xl font-semibold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? 'Loading...' : 'Start Your Free Trial'}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold">CompanyBrain AI</span>
            </div>
            <p className="text-gray-400 mb-6">
              Your company's second brain - AI-powered knowledge management
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <span>© 2024 CompanyBrain AI</span>
              <span>•</span>
              <span>Powered by Elasticsearch & Gemini AI</span>
              <span>•</span>
              <span>Built with Next.js 15</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
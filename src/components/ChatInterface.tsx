'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, MessageSquare, Bot, User, Menu, X, FileText, Search, Filter } from 'lucide-react';
import { ChatMessage, DocumentSource, QueryFilters } from '@/lib/types';

interface ChatInterfaceProps {
  onNavigate?: (page: string) => void;
}

export default function ChatInterface({ onNavigate }: ChatInterfaceProps) {
  const getInitialMessage = () => {
    return `Hello! I'm CompanyBrain AI, your intelligent assistant for company knowledge. I can help you find information from your uploaded documents, answer questions about your company's data, and provide insights based on your knowledge base.

What would you like to know about your company?`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: getInitialMessage(),
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<QueryFilters>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare chat history for context
      const chatHistory = messages
        .filter(msg => msg.id !== '1') // Exclude initial greeting
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.timestamp.toISOString()
        }));

      // Call the query API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentInput,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          chatHistory: chatHistory,
          useVectorSearch: true,
          maxResults: 10
        }),
      });

      const result = await response.json();

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: result.data?.answer || 'I found some relevant information, but I\'m having trouble generating a response right now.',
          isUser: false,
          timestamp: new Date(),
          metadata: {
            sources: result.data?.sources || [],
            queryTime: result.data?.queryTime || 0,
            documentCount: result.data?.totalHits || 0
          }
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: `I apologize, but I encountered an issue while processing your question: ${result.error || 'Unknown error'}. Please try again.`,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error calling query API:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I\'m having trouble connecting to the knowledge base right now. Please try again in a moment.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: '1',
        content: getInitialMessage(),
        isUser: false,
        timestamp: new Date()
      }
    ]);
  };

  // Function to format markdown text into JSX
  const formatMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (line.trim() === '') {
        elements.push(<br key={key++} />);
        continue;
      }

      // Bold text **text**
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const formattedLine = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return <strong key={index} className="font-semibold">{boldText}</strong>;
          }
          return part;
        });
        elements.push(
          <div key={key++} className="mb-2">
            {formattedLine}
          </div>
        );
      }
      // Bullet points
      else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        elements.push(
          <div key={key++} className="ml-4 mb-1 flex items-start">
            <span className="mr-2">•</span>
            <span>{line.trim().substring(1).trim()}</span>
          </div>
        );
      }
      // Numbered lists
      else if (/^\d+\./.test(line.trim())) {
        elements.push(
          <div key={key++} className="ml-4 mb-1 flex items-start">
            <span className="mr-2 font-medium">{line.trim().split('.')[0]}.</span>
            <span>{line.trim().substring(line.indexOf('.') + 1).trim()}</span>
          </div>
        );
      }
      // Regular text
      else {
        elements.push(
          <div key={key++} className="mb-2">
            {line}
          </div>
        );
      }
    }

    return elements;
  };

  // Render document sources
  const renderSources = (sources: DocumentSource[]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Sources ({sources.length})
        </h4>
        <div className="space-y-2">
          {sources.slice(0, 3).map((source, index) => (
            <div key={index} className="text-sm">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {source.type.toUpperCase()}
                </span>
                <span className="font-medium text-blue-900">{source.title}</span>
                <span className="text-blue-600">
                  ({Math.round(source.relevanceScore * 100)}% match)
                </span>
              </div>
              <p className="text-blue-700 mt-1 text-xs">{source.excerpt}</p>
            </div>
          ))}
          {sources.length > 3 && (
            <p className="text-xs text-blue-600 mt-2">
              +{sources.length - 3} more sources
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex-col transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:flex`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">CompanyBrain AI</h1>
                <p className="text-sm text-gray-500">Knowledge Assistant</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={startNewChat}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">New Chat</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium">Filters</span>
          </button>

          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('upload')}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-5 h-5 text-green-600">📁</div>
                <span className="text-gray-700 font-medium">Upload Documents</span>
              </button>
              
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-5 h-5 text-blue-600">📊</div>
                <span className="text-gray-700 font-medium">Dashboard</span>
              </button>
            </>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Search Filters</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Document Type
                </label>
                <select
                  value={filters.documentTypes?.[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    documentTypes: e.target.value ? [e.target.value] : undefined
                  }))}
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="txt">TXT</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="md">Markdown</option>
                  <option value="docx">Word</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={filters.categories?.[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    categories: e.target.value ? [e.target.value] : undefined
                  }))}
                  placeholder="e.g., Reports, Policies"
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={filters.departments?.[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    departments: e.target.value ? [e.target.value] : undefined
                  }))}
                  placeholder="e.g., Engineering, Marketing"
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setFilters({})}
                className="w-full text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 p-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Quick Tips</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• Ask about specific documents</div>
              <div>• Search by keywords or phrases</div>
              <div>• Use filters to narrow results</div>
              <div>• Ask follow-up questions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">CompanyBrain AI</h1>
              </div>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 p-4 hidden lg:block">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">AI Knowledge Assistant</h2>
              <p className="text-sm text-gray-500">Ask me anything about your company</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-full lg:max-w-3xl ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.isUser ? 'bg-purple-600' : 'bg-gray-200'
                  }`}>
                    {message.isUser ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.isUser
                      ? 'bg-gradient-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    <div className={`${message.isUser ? 'text-white' : 'text-gray-800'}`}>
                      {message.isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div>
                          {formatMarkdown(message.content)}
                          {message.metadata?.sources && renderSources(message.metadata.sources)}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center justify-between mt-2 ${
                      message.isUser ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      <p className="text-xs">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {message.metadata?.queryTime && (
                        <p className="text-xs">
                          {message.metadata.queryTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start space-x-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-600" />
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end space-x-4 max-w-full lg:max-w-4xl mx-auto">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your company documents..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-3 rounded-lg transition-all ${
                inputMessage.trim() && !isLoading
                  ? 'bg-gradient-primary text-white hover:shadow-lg hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
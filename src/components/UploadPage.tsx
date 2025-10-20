'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Plus,
  Brain,
  Database,
  Zap
} from 'lucide-react';
import { 
  FileUploadProgress, 
  DocumentType,
  UploadResponse 
} from '@/lib/types';

interface UploadPageProps {
  onUploadComplete?: (response: UploadResponse) => void;
}

export default function UploadPage({ onUploadComplete }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState({
    tags: '',
    category: '',
    department: '',
    project: '',
    author: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedTypes = ['pdf', 'txt', 'csv', 'json', 'md', 'docx', 'xlsx'];
      return extension && allowedTypes.includes(extension);
    });

    setFiles(prev => [...prev, ...validFiles]);
    
    // Initialize progress tracking
    const newProgress = validFiles.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    setUploadProgress(prev => [...prev, ...newProgress]);
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  // Get file type icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconClass = "w-8 h-8 text-blue-500";
    
    switch (extension) {
      case 'pdf':
        return <File className={`${iconClass} text-red-500`} />;
      case 'txt':
      case 'md':
        return <File className={`${iconClass} text-gray-500`} />;
      case 'csv':
      case 'xlsx':
        return <File className={`${iconClass} text-green-500`} />;
      case 'json':
        return <File className={`${iconClass} text-yellow-500`} />;
      case 'docx':
        return <File className={`${iconClass} text-blue-600`} />;
      default:
        return <File className={`${iconClass} text-gray-400`} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      // Prepare form data
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Add metadata
      const metadataObj: any = {};
      if (metadata.tags) metadataObj.tags = metadata.tags.split(',').map(tag => tag.trim());
      if (metadata.category) metadataObj.category = metadata.category;
      if (metadata.department) metadataObj.department = metadata.department;
      if (metadata.project) metadataObj.project = metadata.project;
      if (metadata.author) metadataObj.author = metadata.author;
      
      formData.append('metadata', JSON.stringify(metadataObj));

      // Update progress
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'processing' })));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success) {
        // Update progress to completed
        setUploadProgress(prev => prev.map(p => ({ 
          ...p, 
          status: 'completed', 
          progress: 100 
        })));

        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete(result);
        }

        // Clear files after successful upload
        setTimeout(() => {
          setFiles([]);
          setUploadProgress([]);
          setMetadata({
            tags: '',
            category: '',
            department: '',
            project: '',
            author: ''
          });
        }, 2000);
      } else {
        // Update progress to error
        setUploadProgress(prev => prev.map(p => ({ 
          ...p, 
          status: 'error',
          error: result.error 
        })));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => prev.map(p => ({ 
        ...p, 
        status: 'error',
        error: 'Upload failed. Please try again.' 
      })));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center space-x-3 mb-4"
          >
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gradient">CompanyBrain AI</h1>
          </motion.div>
          <p className="text-xl text-gray-600 mb-2">Upload your company documents</p>
          <p className="text-gray-500">PDF, TXT, CSV, JSON, MD, DOCX, XLSX files supported</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Upload Documents</h2>
              
              {/* Drag and Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.csv,.json,.md,.docx,.xlsx"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <motion.div
                  animate={{ scale: dragActive ? 1.05 : 1 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {dragActive ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-gray-500 mt-2">
                      or <span className="text-blue-600 font-medium">browse files</span>
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* File List */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 space-y-3"
                  >
                    <h3 className="text-lg font-medium text-gray-800">Selected Files</h3>
                    {files.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.name)}
                          <div>
                            <p className="font-medium text-gray-800">{file.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Progress */}
              <AnimatePresence>
                {uploadProgress.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 space-y-3"
                  >
                    <h3 className="text-lg font-medium text-gray-800">Upload Progress</h3>
                    {uploadProgress.map((progress, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {progress.fileName}
                          </span>
                          <div className="flex items-center space-x-2">
                            {progress.status === 'completed' && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                            {progress.status === 'error' && (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm text-gray-500 capitalize">
                              {progress.status}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            className="bg-gradient-primary h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        {progress.error && (
                          <p className="text-sm text-red-500">{progress.error}</p>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Button */}
              <motion.button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className={`w-full mt-6 py-4 px-6 rounded-xl font-medium transition-all ${
                  files.length > 0 && !isUploading
                    ? 'bg-gradient-primary text-white hover:shadow-lg hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                whileHover={files.length > 0 && !isUploading ? { scale: 1.02 } : {}}
                whileTap={files.length > 0 && !isUploading ? { scale: 0.98 } : {}}
              >
                {isUploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
              </motion.button>
            </motion.div>
          </div>

          {/* Metadata Form */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Document Metadata</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={metadata.tags}
                    onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., meeting, Q4, strategy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={metadata.category}
                    onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Reports, Policies, Procedures"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={metadata.department}
                    onChange={(e) => setMetadata(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering, Marketing, HR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <input
                    type="text"
                    value={metadata.project}
                    onChange={(e) => setMetadata(prev => ({ ...prev, project: e.target.value }))}
                    placeholder="e.g., Project Alpha, Q4 Planning"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={metadata.author}
                    onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="e.g., John Doe, Jane Smith"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="mt-8 space-y-4">
                <h4 className="font-medium text-gray-800">Features</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Database className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-600">Vector search powered by Elasticsearch</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-600">AI-powered content analysis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-600">Smart document categorization</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

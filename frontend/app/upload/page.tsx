'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { uploadAPI } from '@/lib/api';
import { withAuth } from '@/components/AuthGuard';
import toast from 'react-hot-toast';

interface UploadProgress {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  progress?: number;
}

function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  
  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (uploadType === 'file' && !file) {
      toast.error('Please select a file');
      return;
    }

    if (uploadType === 'url' && !url) {
      toast.error('Please enter a URL');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsUploading(true);
    
    try {
      let response;
      
      if (uploadType === 'file') {
        response = await uploadAPI.uploadFile(file!, {
          title: title.trim(),
          tags: tags.trim(),
          category: category.trim(),
          isPublic
        });
      } else {
        response = await uploadAPI.uploadURL({
          url: url.trim(),
          title: title.trim(),
          tags: tags.trim(),
          category: category.trim(),
          isPublic
        });
      }

      if (response.success) {
        const newProgress: UploadProgress = {
          id: response.data.id,
          title: response.data.title,
          status: 'pending'
        };
        
        setUploadProgress(prev => [...prev, newProgress]);
        
        // Start polling for status
        pollUploadStatus(response.data.id);
        
        // Reset form
        resetForm();
        
        toast.success('Upload started successfully!');
      } else {
        toast.error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const pollUploadStatus = async (uploadId: string) => {
    const maxAttempts = 60; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await uploadAPI.getUploadStatus(uploadId);
        
        if (response.success) {
          const status = response.data.processingStatus;
          
          setUploadProgress(prev => 
            prev.map(item => 
              item.id === uploadId 
                ? { ...item, status, error: response.data.processingError }
                : item
            )
          );

          if (status === 'completed' || status === 'failed') {
            if (status === 'completed') {
              toast.success(`"${response.data.title}" processed successfully!`);
            } else {
              toast.error(`"${response.data.title}" processing failed: ${response.data.processingError}`);
            }
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error('Error polling upload status:', error);
      }
    };

    poll();
  };

  const resetForm = () => {
    setFile(null);
    setUrl('');
    setTitle('');
    setTags('');
    setCategory('general');
    setIsPublic(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-error-500" />;
      case 'processing':
        return <div className="loading-spinner h-5 w-5 text-primary-500"></div>;
      default:
        return <div className="loading-spinner h-5 w-5 text-gray-400"></div>;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'text-success-600';
      case 'failed':
        return 'text-error-600';
      case 'processing':
        return 'text-primary-600';
      default:
        return 'text-gray-600';
    }
  };

  const supportedFileTypes = ['.txt', '.pdf', '.docx'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Documents</h1>
            <p className="text-gray-600">
              Add documents to your search index. Supports text files, PDFs, Word documents, and web pages.
            </p>
          </div>

          {/* Upload Type Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setUploadType('file')}
                className={`flex-1 py-3 px-4 text-center font-medium ${
                  uploadType === 'file'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 mx-auto mb-1" />
                File Upload
              </button>
              <button
                onClick={() => setUploadType('url')}
                className={`flex-1 py-3 px-4 text-center font-medium ${
                  uploadType === 'url'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LinkIcon className="h-5 w-5 mx-auto mb-1" />
                URL Import
              </button>
            </div>

            <div className="p-6">
              {uploadType === 'file' ? (
                <div className="space-y-6">
                  {/* File Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
                  >
                    <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop files here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Supported formats: {supportedFileTypes.join(', ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Maximum file size: {maxFileSize / 1024 / 1024}MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept={supportedFileTypes.join(',')}
                      className="hidden"
                    />
                  </div>

                  {file && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the URL of the web page you want to import
                    </p>
                  </div>
                </div>
              )}

              {/* Common Fields */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="machine learning, AI, research (comma-separated)"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate multiple tags with commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                  >
                    <option value="general">General</option>
                    <option value="research">Research</option>
                    <option value="documentation">Documentation</option>
                    <option value="news">News</option>
                    <option value="blog">Blog</option>
                    <option value="academic">Academic</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Make this document public (others can search it)
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || (!file && !url) || !title.trim()}
                  className="btn btn-primary w-full"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h2>
                <div className="space-y-3">
                  {uploadProgress.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className={`text-sm ${getStatusColor(item.status)}`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </p>
                          {item.error && (
                            <p className="text-xs text-error-600 mt-1">{item.error}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/search')}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Search
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Upload Guidelines</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>· Files are automatically processed and indexed for search</li>
              <li>· Processing typically takes 1-3 minutes depending on file size</li>
              <li>· Documents are split into chunks for better search results</li>
              <li>· You can track processing progress in the Upload Progress section</li>
              <li>· Public documents can be discovered and searched by other users</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(UploadPage);

'use client';

import { withAuth } from '@/components/AuthGuard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardData {
  overview: {
    totalQueries: number;
    uniqueQueries: number;
    avgResponseTime: number;
    documentsUploaded: number;
    avgRating: number;
    helpfulPercentage: number;
  };
  performance: {
    totalQueries: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    avgRating: number;
    totalRatings: number;
    helpfulCount: number;
    helpfulPercentage: number;
  };
  documents: {
    totalDocuments: number;
    totalChunks: number;
    avgChunksPerDocument: number;
    totalWords: number;
    avgWordsPerDocument: number;
    documentTypes: Record<string, number>;
  };
  topQueries: Array<{
    query: string;
    count: number;
  }>;
  dailyData: Array<{
    date: string;
    queries: number;
    avgResponseTime: number;
    documentsUploaded: number;
  }>;
}

function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await analyticsAPI.getDashboard({ days: timeRange });
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        toast.error(response.message || 'Failed to load dashboard data');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-success-500" />;
    } else if (current < previous) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-error-500" />;
    }
    return <div className="h-4 w-4" />;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardData}
            className="btn btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Monitor your search performance and document usage
          </p>
          
          {/* Time Range Selector */}
          <div className="mt-4 flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="input w-auto"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <MagnifyingGlassIcon className="h-6 w-6 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.overview.totalQueries)}</h3>
            <p className="text-sm text-gray-600">Search Queries</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">{formatNumber(dashboardData.overview.uniqueQueries)} unique</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-success-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-success-600" />
              </div>
              <span className="text-sm text-gray-500">Average</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{formatTime(dashboardData.overview.avgResponseTime)}</h3>
            <p className="text-sm text-gray-600">Response Time</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">{formatTime(dashboardData.performance.minResponseTime)} - {formatTime(dashboardData.performance.maxResponseTime)}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-warning-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-warning-600" />
              </div>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.overview.documentsUploaded)}</h3>
            <p className="text-sm text-gray-600">Documents</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">{formatNumber(dashboardData.documents.totalChunks)} chunks</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <StarIcon className="h-6 w-6 text-secondary-600" />
              </div>
              <span className="text-sm text-gray-500">Average</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{formatPercentage(dashboardData.overview.avgRating)}</h3>
            <p className="text-sm text-gray-600">User Rating</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-500">{formatPercentage(dashboardData.overview.helpfulPercentage)} helpful</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Search Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [formatNumber(value), 'Queries']}
                />
                <Line 
                  type="monotone" 
                  dataKey="queries" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Response Time Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => [formatTime(value), 'Response Time']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgResponseTime" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Queries */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Queries</h2>
            <div className="space-y-3">
              {dashboardData.topQueries.slice(0, 10).map((query, index) => (
                <div key={query.query} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 w-4">#{index + 1}</span>
                    <span className="text-sm text-gray-900 truncate">{query.query}</span>
                  </div>
                  <span className="text-sm text-gray-500">{query.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Types */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Types</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={Object.entries(dashboardData.documents.documentTypes).map(([type, count]) => ({
                    name: type,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(dashboardData.documents.documentTypes).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/search')}
                className="w-full btn btn-outline text-left justify-start"
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                New Search
              </button>
              <button
                onClick={() => router.push('/upload')}
                className="w-full btn btn-outline text-left justify-start"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Upload Document
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="w-full btn btn-outline text-left justify-start"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Settings
              </button>
              <button
                onClick={fetchDashboardData}
                className="w-full btn btn-outline text-left justify-start"
              >
                <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Document Statistics</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Words:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.documents.totalWords)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Words/Doc:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.documents.avgWordsPerDocument)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Chunks/Doc:</span>
                  <span className="text-gray-900">{dashboardData.documents.avgChunksPerDocument.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Performance Metrics</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Min Response:</span>
                  <span className="text-gray-900">{formatTime(dashboardData.performance.minResponseTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Max Response:</span>
                  <span className="text-gray-900">{formatTime(dashboardData.performance.maxResponseTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Ratings:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.performance.totalRatings)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">User Feedback</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Helpful Count:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.performance.helpfulCount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Helpful %:</span>
                  <span className="text-gray-900">{formatPercentage(dashboardData.performance.helpfulPercentage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Rating:</span>
                  <span className="text-gray-900">{formatPercentage(dashboardData.performance.avgRating)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Search Activity</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Queries:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.performance.totalQueries)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unique Queries:</span>
                  <span className="text-gray-900">{formatNumber(dashboardData.overview.uniqueQueries)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Response:</span>
                  <span className="text-gray-900">{formatTime(dashboardData.performance.avgResponseTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);

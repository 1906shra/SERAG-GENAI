'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '@/lib/api';
import { AuthManager } from '@/lib/auth';
import { withAuth } from '@/components/AuthGuard';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  settings: {
    searchModel: string;
    maxResults: number;
    semanticWeight: number;
    keywordWeight: number;
  };
  lastLogin?: string;
  createdAt: string;
}

function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Search settings
  const [searchModel, setSearchModel] = useState('gpt-3.5-turbo');
  const [maxResults, setMaxResults] = useState(10);
  const [semanticWeight, setSemanticWeight] = useState(0.6);
  const [keywordWeight, setKeywordWeight] = useState(0.4);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [searchNotifications, setSearchNotifications] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);
  
  // Privacy settings
  const [profilePublic, setProfilePublic] = useState(false);
  const [searchHistoryPublic, setSearchHistoryPublic] = useState(false);
  const [analyticsPublic, setAnalyticsPublic] = useState(false);

  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getMe();

      if (response.success) {
        const userData = response.data;
        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);
        setSearchModel(userData.settings?.searchModel || 'gpt-3.5-turbo');
        setMaxResults(userData.settings?.maxResults || 10);
        setSemanticWeight(userData.settings?.semanticWeight || 0.6);
        setKeywordWeight(userData.settings?.keywordWeight || 0.4);
      } else {
        toast.error(response.message || 'Failed to load user data');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await authAPI.updateProfile({
        name: name.trim(),
        email: email.trim()
      });

      if (response.success) {
        setUser(response.data);
        toast.success('Profile updated successfully');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);

      if (response.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(response.message || 'Failed to change password');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchSettingsUpdate = async () => {
    if (semanticWeight + keywordWeight !== 1) {
      toast.error('Semantic and keyword weights must sum to 1.0');
      return;
    }

    setIsSaving(true);
    try {
      const response = await authAPI.updateSettings({
        searchModel,
        maxResults,
        semanticWeight,
        keywordWeight
      });

      if (response.success) {
        setUser(prev => prev ? { ...prev, settings: response.data } : null);
        toast.success('Search settings updated successfully');
      } else {
        toast.error(response.message || 'Failed to update search settings');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update search settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthManager.getInstance().logout();
    } catch (error) {
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load user data</p>
          <button
            onClick={fetchUserData}
            className="btn btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'search', name: 'Search', icon: MagnifyingGlassIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy', icon: ShieldCheckIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={handleProfileUpdate}
                        disabled={isSaving}
                        className="btn btn-primary"
                      >
                        {isSaving ? 'Saving...' : 'Update Profile'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPasswords ? (
                              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <EyeIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input pr-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input pr-10"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={handlePasswordChange}
                        disabled={isSaving}
                        className="btn btn-primary"
                      >
                        {isSaving ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Type:</span>
                        <span className="text-gray-900 capitalize">{user.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member Since:</span>
                        <span className="text-gray-900">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Login:</span>
                        <span className="text-gray-900">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <button
                      onClick={handleLogout}
                      className="btn btn-outline text-error-600 border-error-300 hover:bg-error-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}

              {/* Search Tab */}
              {activeTab === 'search' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Preferences</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AI Model
                        </label>
                        <select
                          value={searchModel}
                          onChange={(e) => setSearchModel(e.target.value)}
                          className="input"
                        >
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</option>
                          <option value="gpt-4">GPT-4 (Advanced)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo (Latest)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Results per Search
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="50"
                          value={maxResults}
                          onChange={(e) => setMaxResults(parseInt(e.target.value))}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Weights</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Semantic Search Weight: {(semanticWeight * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={semanticWeight}
                          onChange={(e) => {
                            const newSemantic = parseFloat(e.target.value);
                            setSemanticWeight(newSemantic);
                            setKeywordWeight(1 - newSemantic);
                          }}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Keyword Search Weight: {(keywordWeight * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={keywordWeight}
                          onChange={(e) => {
                            const newKeyword = parseFloat(e.target.value);
                            setKeywordWeight(newKeyword);
                            setSemanticWeight(1 - newKeyword);
                          }}
                          className="w-full"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Adjust the balance between semantic understanding and keyword matching
                      </p>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={handleSearchSettingsUpdate}
                      disabled={isSaving}
                      className="btn btn-primary"
                    >
                      {isSaving ? 'Saving...' : 'Save Search Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive email updates about your account</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Search Notifications</h3>
                        <p className="text-sm text-gray-500">Get notified when searches complete</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={searchNotifications}
                        onChange={(e) => setSearchNotifications(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Weekly Reports</h3>
                        <p className="text-sm text-gray-500">Receive weekly analytics reports</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={weeklyReports}
                        onChange={(e) => setWeeklyReports(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Public Profile</h3>
                        <p className="text-sm text-gray-500">Make your profile visible to other users</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profilePublic}
                        onChange={(e) => setProfilePublic(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Public Search History</h3>
                        <p className="text-sm text-gray-500">Share your search history publicly</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={searchHistoryPublic}
                        onChange={(e) => setSearchHistoryPublic(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Public Analytics</h3>
                        <p className="text-sm text-gray-500">Share your analytics data publicly</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={analyticsPublic}
                        onChange={(e) => setAnalyticsPublic(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                    <div className="space-y-4">
                      <button className="btn btn-outline">
                        Export My Data
                      </button>
                      <button className="btn btn-outline text-error-600 border-error-300 hover:bg-error-50">
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(SettingsPage);

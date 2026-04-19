'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { searchAPI } from '@/lib/api';
import { withAuth } from '@/components/AuthGuard';
import { AuthManager } from '@/lib/auth';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: CpuChipIcon,
    title: 'AI-Powered RAG',
    desc: 'Retrieval-augmented generation delivers precise, context-aware answers from your documents.',
    color: 'primary',
  },
  {
    icon: BoltIcon,
    title: 'Hybrid Search',
    desc: 'Combines BM25 keyword matching with semantic vector search for maximum relevance.',
    color: 'warning',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Private & Secure',
    desc: 'Your documents stay yours. JWT-protected, user-scoped data with zero cross-contamination.',
    color: 'success',
  },
  {
    icon: ChartBarIcon,
    title: 'Smart Analytics',
    desc: 'Track search patterns, response times, and document usage with real-time dashboards.',
    color: 'secondary',
  },
];

const POPULAR = ['Machine Learning', 'Web Development', 'Data Science', 'Cloud Computing', 'AI Ethics', 'Neural Networks'];

const colorMap: Record<string, string> = {
  primary:   'bg-primary-100 text-primary-600',
  warning:   'bg-warning-100 text-warning-600',
  success:   'bg-success-100 text-success-600',
  secondary: 'bg-secondary-100 text-secondary-600',
};

function HomePage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,           setQuery]           = useState('');
  const [isSearching,     setIsSearching]     = useState(false);
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userName,        setUserName]        = useState('');
  const [mounted,         setMounted]         = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = AuthManager.getInstance().getUser();
    if (user?.name) setUserName(user.name.split(' ')[0]);
    // Auto-focus search
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSearch = async (q: string = query) => {
    if (!q.trim()) { toast.error('Enter a search query'); return; }
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const res = await searchAPI.search(q.trim(), {
        generateResponse: true,
        rewriteQuery: true,
        maxResults: 10,
      });
      if (res.success) {
        router.push(`/search?q=${encodeURIComponent(q.trim())}&id=${res.data.searchId}`);
      } else {
        toast.error(res.message || 'Search failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = async (val: string) => {
    setQuery(val);
    if (val.length >= 2) {
      try {
        const res = await searchAPI.getSearchSuggestions(val);
        if (res.success && res.data?.length) {
          setSuggestions(res.data);
          setShowSuggestions(true);
        }
      } catch { /* silent */ }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mesh flex-1">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full
                        bg-primary-100 opacity-60 blur-3xl pointer-events-none animate-float" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full
                        bg-primary-200 opacity-40 blur-3xl pointer-events-none animate-float-delayed" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">

          {/* Badge */}
          {mounted && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                            bg-primary-50 border border-primary-200 text-primary-700
                            text-xs font-semibold mb-6 fade-in-up">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-ping-slow" />
              RAG-powered · Semantic + Keyword · Real-time
            </div>
          )}

          {/* Heading */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900
                          tracking-tight leading-tight mb-4
                          ${mounted ? 'fade-in-up delay-100' : 'opacity-0'}`}>
            {userName ? `Hey ${userName}, ` : ''}
            <span className="gradient-text">Search Smarter</span>
            <br className="hidden sm:block" />
            with AI
          </h1>

          <p className={`text-lg text-gray-500 max-w-2xl mx-auto mb-10
                         ${mounted ? 'fade-in-up delay-200' : 'opacity-0'}`}>
            Ask anything about your documents. Our hybrid AI engine finds the most relevant
            answers using semantic understanding and keyword precision.
          </p>

          {/* Search box */}
          <div className={`relative max-w-2xl mx-auto mb-6
                           ${mounted ? 'fade-in-up delay-300' : 'opacity-0'}`}>
            <div className={`relative flex items-center bg-white rounded-2xl shadow-lg
                             border-2 transition-all duration-200
                             ${query ? 'border-primary-400 shadow-primary-100 shadow-xl' : 'border-gray-200 hover:border-gray-300'}`}>
              <MagnifyingGlassIcon className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearch();
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Ask anything about your documents…"
                className="flex-1 pl-12 pr-4 py-4 bg-transparent text-gray-900 text-base
                           placeholder-gray-400 focus:outline-none rounded-2xl"
                disabled={isSearching}
              />
              <button
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="m-1.5 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold
                           rounded-xl hover:bg-primary-700 active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-150 flex items-center gap-2 shadow-sm"
              >
                {isSearching
                  ? <><div className="loading-spinner h-4 w-4" /> Searching…</>
                  : <><SparklesIcon className="h-4 w-4" /> Search</>
                }
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl
                              border border-gray-200 shadow-xl z-20 overflow-hidden scale-in">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => { setQuery(s); handleSearch(s); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700
                               hover:bg-primary-50 hover:text-primary-700 transition-colors text-left"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular searches */}
          <div className={`flex flex-wrap justify-center gap-2 mb-10
                           ${mounted ? 'fade-in-up delay-400' : 'opacity-0'}`}>
            {POPULAR.map(term => (
              <button
                key={term}
                onClick={() => { setQuery(term); handleSearch(term); }}
                className="tag text-xs"
              >
                {term}
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <div className={`flex flex-wrap justify-center gap-3
                           ${mounted ? 'fade-in-up delay-500' : 'opacity-0'}`}>
            <button
              onClick={() => router.push('/upload')}
              className="btn btn-outline gap-2 px-5 py-2.5"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              Upload Documents
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-primary gap-2 px-5 py-2.5"
            >
              <ChartBarIcon className="h-4 w-4" />
              View Dashboard
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Everything you need</h2>
            <p className="text-gray-500 text-sm">Built for speed, accuracy, and privacy.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`card-hover p-6 fade-in-up`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`inline-flex p-2.5 rounded-xl mb-4 ${colorMap[f.color]}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick actions strip ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-500 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8
                        flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-white text-center sm:text-left">
            <p className="text-lg font-bold">Ready to search your knowledge base?</p>
            <p className="text-primary-200 text-sm mt-0.5">Upload a document and start asking questions.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => router.push('/upload')}
              className="px-5 py-2.5 bg-white text-primary-700 text-sm font-semibold
                         rounded-xl hover:bg-primary-50 active:scale-95
                         transition-all duration-150 shadow-sm flex items-center gap-2"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Upload Now
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 bg-primary-700 text-white text-sm font-semibold
                         rounded-xl hover:bg-primary-800 active:scale-95
                         transition-all duration-150 border border-primary-400
                         flex items-center gap-2"
            >
              <ChartBarIcon className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default withAuth(HomePage);

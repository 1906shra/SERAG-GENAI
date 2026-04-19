'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  SparklesIcon,
  StarIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowLeftIcon,
  ClockIcon,
  TagIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { searchAPI } from '@/lib/api';
import { withAuth } from '@/components/AuthGuard';
import Navigation from '@/components/Navigation';
import toast from 'react-hot-toast';

interface SearchResult {
  documentId: string;
  chunkIndex: number;
  text: string;
  documentTitle: string;
  contentType: string;
  scores: { keyword: number; semantic: number; final: number };
}

interface SearchResponse {
  query: string;
  rewrittenQuery?: string;
  results: SearchResult[];
  aiResponse?: {
    answer: string;
    citations: Array<{ documentId: string; chunkIndex: number; text: string; documentTitle: string; relevance: number }>;
    model: string;
    tokensUsed: number;
    responseTime: number;
  };
  performance: { totalTime: number; breakdown: any };
  searchId: string;
}

function SearchPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const inputRef     = useRef<HTMLInputElement>(null);

  const initialQuery = searchParams.get('q') || '';
  const searchId     = searchParams.get('id');

  const [query,           setQuery]           = useState(initialQuery);
  const [isLoading,       setIsLoading]       = useState(false);
  const [searchResults,   setSearchResults]   = useState<SearchResponse | null>(null);
  const [feedback,        setFeedback]        = useState<{ rating: number; helpful?: boolean; comments?: string }>({ rating: 0 });
  const [showFeedback,    setShowFeedback]    = useState(false);
  const [feedbackSent,    setFeedbackSent]    = useState(false);
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (initialQuery) performSearch(initialQuery);
  }, []); // eslint-disable-line

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setShowSuggestions(false);
    try {
      const res = await searchAPI.search(q.trim(), {
        generateResponse: true,
        rewriteQuery: true,
        maxResults: 10,
      });
      if (res.success) {
        setSearchResults(res.data);
        router.replace(`/search?q=${encodeURIComponent(q.trim())}&id=${res.data.searchId}`, { scroll: false } as any);
      } else {
        toast.error(res.message || 'Search failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = async (val: string) => {
    setQuery(val);
    if (val.length >= 2) {
      try {
        const res = await searchAPI.getSearchSuggestions(val);
        if (res.success && res.data?.length) { setSuggestions(res.data); setShowSuggestions(true); }
      } catch { /* silent */ }
    } else {
      setSuggestions([]); setShowSuggestions(false);
    }
  };

  const handleFeedback = async () => {
    if (!searchResults?.searchId) return;
    try {
      await searchAPI.addFeedback(searchResults.searchId, feedback);
      toast.success('Thanks for your feedback!');
      setFeedbackSent(true);
      setShowFeedback(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback');
    }
  };

  const Stars = ({ rating, interactive = false }: { rating: number; interactive?: boolean }) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => interactive && setFeedback(f => ({ ...f, rating: s }))}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          disabled={!interactive}
        >
          {s <= rating
            ? <StarIconSolid className="h-5 w-5 text-warning-400" />
            : <StarIcon      className="h-5 w-5 text-gray-300" />
          }
        </button>
      ))}
    </div>
  );

  const topicColor: Record<string, string> = {
    AI: 'badge-primary', ML: 'badge-primary', RAG: 'badge-primary',
    Databases: 'badge-secondary', DataEngineering: 'badge-secondary',
    Cloud: 'badge-success', Networking: 'badge-success',
    Business: 'badge-warning', Finance: 'badge-warning',
    Internet: 'badge-error', Security: 'badge-error',
    Programming: 'badge-secondary', General: 'badge-secondary',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Back button */}
          <button
            onClick={() => router.push('/home')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg
                       text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50
                       border border-gray-200 hover:border-primary-200 transition-all duration-150"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Search input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') performSearch(query); if (e.key === 'Escape') setShowSuggestions(false); }}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Search the knowledge base…"
              className="input pl-9 pr-4 py-2.5 text-sm"
              disabled={isLoading}
            />
            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden scale-in">
                {suggestions.map((s, i) => (
                  <button key={i} onMouseDown={() => { setQuery(s); performSearch(s); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors text-left">
                    <MagnifyingGlassIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => performSearch(query)}
            disabled={isLoading || !query.trim()}
            className="btn btn-primary px-4 py-2.5 text-sm shrink-0"
          >
            {isLoading
              ? <div className="loading-spinner h-4 w-4" />
              : <><SparklesIcon className="h-4 w-4" /><span className="hidden sm:inline">Search</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
              <SparklesIcon className="absolute inset-0 m-auto h-6 w-6 text-primary-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Searching knowledge base…</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && searchResults && (
          <div className="fade-in-up">

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <h1 className="text-xl font-bold text-gray-900">
                Results for <span className="text-primary-600">"{searchResults.query}"</span>
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-400 ml-auto">
                <span className="flex items-center gap-1">
                  <DocumentTextIcon className="h-3.5 w-3.5" />
                  {searchResults.results.length} result{searchResults.results.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {searchResults.performance.totalTime}ms
                </span>
              </div>
              {searchResults.rewrittenQuery && searchResults.rewrittenQuery !== searchResults.query && (
                <p className="w-full text-xs text-gray-400">
                  Searched as: <em>"{searchResults.rewrittenQuery}"</em>
                </p>
              )}
            </div>

            {/* AI Answer */}
            {searchResults.aiResponse && (
              <div className="card mb-6 overflow-hidden fade-in-up">
                <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-3 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">AI Answer</span>
                  <span className="ml-auto text-xs text-primary-200">
                    {searchResults.aiResponse.model} · {searchResults.aiResponse.tokensUsed} tokens
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {searchResults.aiResponse.answer}
                  </p>
                  {searchResults.aiResponse.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Sources</p>
                      <div className="space-y-2">
                        {searchResults.aiResponse.citations.map((c, i) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className="text-primary-600 font-bold shrink-0">[{i+1}]</span>
                            <div>
                              <p className="text-gray-600 line-clamp-2">{c.text}</p>
                              <p className="text-gray-400 mt-0.5">— {c.documentTitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result cards */}
            {searchResults.results.length > 0 ? (
              <div className="space-y-3 mb-8">
                {searchResults.results.map((r, i) => {
                  const topic = r.documentTitle.replace(' Knowledge Base', '');
                  const badge = topicColor[topic] || 'badge-secondary';
                  return (
                    <div key={`${r.documentId}-${r.chunkIndex}-${i}`}
                      className="card-hover p-5 fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 truncate">{r.documentTitle}</span>
                          <span className={`badge ${badge} shrink-0`}>
                            <TagIcon className="h-3 w-3" />{topic}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                          <span className="hidden sm:inline">Score</span>
                          <span className="font-semibold text-primary-600">
                            {(r.scores.final * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{r.text}</p>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                        <span>Keyword: {(r.scores.keyword * 100).toFixed(1)}%</span>
                        <span>Semantic: {(r.scores.semantic * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="card p-12 text-center mb-8 fade-in">
                <FaceSmileIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-700 mb-1">No results found</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Try different keywords or upload documents related to this topic.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => router.push('/upload')} className="btn btn-primary text-sm">
                    Upload Documents
                  </button>
                  <button onClick={() => router.push('/home')} className="btn btn-outline text-sm">
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="card p-5">
              {feedbackSent ? (
                <div className="flex items-center gap-2 text-success-600 text-sm font-medium">
                  <FaceSmileIcon className="h-5 w-5" />
                  Thanks for your feedback!
                </div>
              ) : !showFeedback ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stars rating={0} />
                    <span className="text-sm text-gray-500">Was this search helpful?</span>
                  </div>
                  <button onClick={() => setShowFeedback(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    Give Feedback
                  </button>
                </div>
              ) : (
                <div className="space-y-4 fade-in-up">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Rate this search</p>
                    <Stars rating={feedback.rating} interactive />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setFeedback(f => ({ ...f, helpful: true }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${feedback.helpful === true ? 'bg-success-100 text-success-700 ring-1 ring-success-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <HandThumbUpIcon className="h-4 w-4" /> Yes
                    </button>
                    <button onClick={() => setFeedback(f => ({ ...f, helpful: false }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${feedback.helpful === false ? 'bg-error-100 text-error-700 ring-1 ring-error-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <HandThumbDownIcon className="h-4 w-4" /> No
                    </button>
                  </div>
                  <textarea
                    value={feedback.comments || ''}
                    onChange={e => setFeedback(f => ({ ...f, comments: e.target.value }))}
                    rows={2}
                    className="input text-sm resize-none"
                    placeholder="Optional comments…"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleFeedback} disabled={feedback.rating === 0}
                      className="btn btn-primary text-sm">Submit</button>
                    <button onClick={() => setShowFeedback(false)}
                      className="btn btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial empty state (no query yet) */}
        {!isLoading && !searchResults && !initialQuery && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 fade-in">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-300" />
            <p className="text-gray-400 text-sm">Type something to search the knowledge base</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(SearchPage);

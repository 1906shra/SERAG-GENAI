'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  HomeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CogIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as SearchIconSolid,
  DocumentTextIcon as DocIconSolid,
  ChartBarIcon as ChartIconSolid,
  CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';
import { AuthManager } from '@/lib/auth';
import toast from 'react-hot-toast';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Home',      href: '/home',      icon: HomeIcon,          iconSolid: HomeIconSolid   },
  { name: 'Search',    href: '/search',    icon: MagnifyingGlassIcon, iconSolid: SearchIconSolid },
  { name: 'Upload',    href: '/upload',    icon: DocumentTextIcon,  iconSolid: DocIconSolid    },
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon,      iconSolid: ChartIconSolid  },
  { name: 'Settings',  href: '/settings',  icon: CogIcon,           iconSolid: CogIconSolid    },
];

export default function Navigation() {
  const router   = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState<any>(null);
  const [scrolled, setScrolled]     = useState(false);
  const [isLoading, setIsLoading]   = useState(true);

  // Detect scroll for shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auth state
  useEffect(() => {
    const load = () => {
      setUser(AuthManager.getInstance().getUser());
      setIsLoading(false);
    };
    load();
    window.addEventListener('storage',     load);
    window.addEventListener('auth-change', load);
    return () => {
      window.removeEventListener('storage',     load);
      window.removeEventListener('auth-change', load);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AuthManager.getInstance().logout();
    } catch {
      toast.error('Failed to logout');
    }
  };

  const go = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const navbarClass = `
    sticky top-0 z-50 w-full
    bg-white/90 backdrop-blur-md
    border-b border-gray-200/80
    transition-shadow duration-300
    ${scrolled ? 'shadow-md shadow-gray-200/60' : 'shadow-none'}
  `;

  if (isLoading) {
    return (
      <nav className={navbarClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="h-8 w-32 skeleton rounded-lg" />
          <div className="flex gap-3">
            {[1,2,3].map(i => <div key={i} className="h-8 w-20 skeleton rounded-lg" />)}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={navbarClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <button
            onClick={() => go('/home')}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative h-9 w-9 bg-gradient-to-br from-primary-600 to-primary-500
                            rounded-xl flex items-center justify-center shadow-md shadow-primary-200
                            group-hover:shadow-lg group-hover:shadow-primary-300
                            transition-all duration-200">
              <SparklesIcon className="h-5 w-5 text-white" />
              {/* Ping dot */}
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success-400
                               ring-2 ring-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold text-gray-900 tracking-tight">AI Search</span>
              <span className="text-[10px] font-medium text-primary-500 tracking-widest uppercase">RAG Engine</span>
            </div>
          </button>

          {/* ── Desktop Nav ───────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon   = active ? item.iconSolid : item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => go(item.href)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium
                              transition-all duration-150
                              ${active
                                ? 'text-primary-700 bg-primary-50 shadow-sm ring-1 ring-primary-100'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-primary-600' : ''}`} />
                  {item.name}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4
                                     bg-primary-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── User Area ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Avatar + name */}
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5
                                bg-gray-50 rounded-lg border border-gray-200">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-400
                                  flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-semibold text-gray-800">{user.name}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{user.role}</span>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                             text-gray-500 hover:text-error-600 hover:bg-error-50
                             border border-transparent hover:border-error-200
                             transition-all duration-150"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => go('/login')}
                className="btn btn-primary text-sm px-4 py-2"
              >
                Sign In
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100
                         transition-colors"
            >
              {mobileOpen
                ? <XMarkIcon className="h-5 w-5" />
                : <Bars3Icon className="h-5 w-5" />
              }
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ───────────────────────────────────────────────── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-fade-in-down">
            {navigation.map((item) => {
              const active = pathname === item.href;
              const Icon   = active ? item.iconSolid : item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => go(item.href)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium
                              transition-all duration-150
                              ${active
                                ? 'text-primary-700 bg-primary-50 ring-1 ring-primary-100'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : ''}`} />
                  {item.name}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />}
                </button>
              );
            })}

            {user && (
              <div className="pt-3 mt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-2 mb-1">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-400
                                  flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium
                             text-error-600 hover:bg-error-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

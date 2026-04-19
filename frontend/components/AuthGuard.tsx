'use client';

/**
 * AuthGuard — client-side route protection layer.
 *
 * Works in tandem with the Next.js edge middleware (middleware.ts).
 * The middleware handles the fast redirect before the page renders.
 * AuthGuard handles the in-browser case: token present but expired,
 * or user data missing from localStorage after a hard refresh.
 *
 * Usage:
 *   Wrap any protected page's default export with withAuth():
 *
 *   export default withAuth(function DashboardPage() { ... });
 */

import { useEffect, useState, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { AuthManager } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const auth = AuthManager.getInstance();

    // Fast path: check token + cached user synchronously
    if (!auth.isAuthenticated()) {
      setStatus('unauthenticated');
      router.replace('/login');
      return;
    }

    // Slow path: validate token against backend (catches expired tokens)
    // Use a flag to avoid acting on stale effects
    let cancelled = false;

    auth.getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (user) {
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
          router.replace('/login');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('unauthenticated');
        router.replace('/login');
      });

    return () => { cancelled = true; };
  }, [router]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // Render nothing while the redirect is in flight
    return null;
  }

  return <>{children}</>;
}

/**
 * Higher-order component — wraps a page component with AuthGuard.
 *
 * Example:
 *   export default withAuth(DashboardPage);
 */
export function withAuth<P extends object>(Component: ComponentType<P>) {
  const WrappedComponent = (props: P) => (
    <AuthGuard>
      <Component {...props} />
    </AuthGuard>
  );

  WrappedComponent.displayName = `withAuth(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WrappedComponent;
}

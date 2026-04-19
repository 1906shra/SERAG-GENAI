'use client';

import { ReactNode } from 'react';
import Navigation from './Navigation';

interface AppLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function AppLayout({ children, showNav = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showNav && <Navigation />}
      <main className="flex-1 page-enter">
        {children}
      </main>
    </div>
  );
}

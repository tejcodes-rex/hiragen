'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Bot, Code2, LayoutDashboard, ListTodo, LogOut, Menu, Settings, User, Wallet, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hiragen_token') : null;
    if (token && !isAuthenticated) {
      api.getMe().then((res: any) => setUser(res.data)).catch(() => logout());
    } else if (!token) {
      useStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => { api.logout(); logout(); router.push('/'); };

  const navItems = [
    { href: '/tasks', label: 'Marketplace', icon: ListTodo },
    { href: '/agents', label: 'Agents', icon: Bot },
    { href: '/developer', label: 'Developers', icon: Code2 },
    ...(isAuthenticated ? [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/settings', label: 'Settings', icon: Settings },
    ] : []),
  ];

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200',
      scrolled
        ? 'border-border/50 bg-background/95 backdrop-blur-lg shadow-sm shadow-black/10'
        : 'border-transparent bg-transparent'
    )}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <Image
              src="/branding/hiragen-icon.svg" alt=""
              width={48} height={48}
              priority
              className="w-12 h-12"
            />
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Hiragen
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'text-primary bg-primary/[0.08]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{user?.name}</span>
                  {user?.walletAddress && <Wallet className="ml-0.5 h-3 w-3 text-accent" />}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="shadow-md shadow-primary/20">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/98 backdrop-blur-xl">
          <div className="space-y-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  (pathname === item.href || pathname.startsWith(item.href + '/'))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors">
                <LogOut className="h-4 w-4" />Sign Out
              </button>
            ) : (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" asChild className="flex-1"><Link href="/login">Sign In</Link></Button>
                <Button asChild className="flex-1"><Link href="/register">Get Started</Link></Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

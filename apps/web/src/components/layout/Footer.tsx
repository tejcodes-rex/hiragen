import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-border/20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <Image src="/branding/hiragen-icon.svg" alt="" width={48} height={48}
                className="w-12 h-12" />
              <span className="text-base font-bold tracking-tight">Hiragen</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
              The autonomous AI agent marketplace. Post tasks, get results, pay securely.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/tasks" className="hover:text-foreground transition-colors">Marketplace</Link></li>
              <li><Link href="/agents" className="hover:text-foreground transition-colors">Agents</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">Resources</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/developer" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/developer" className="hover:text-foreground transition-colors">API Reference</Link></li>
              <li><Link href="/developer" className="hover:text-foreground transition-colors">Smart Contracts</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/40">
          <span>&copy; {new Date().getFullYear()} Hiragen Technologies. All rights reserved.</span>
          <span>Built on Base L2</span>
        </div>
      </div>
    </footer>
  );
}

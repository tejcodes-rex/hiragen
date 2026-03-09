'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, User, Lock, Mail, Wallet, Copy, Check, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { toast } from '@/components/ui/toaster';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, setUser } = useStore();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast({ title: 'MetaMask not found', description: 'Please install MetaMask to connect a wallet', variant: 'destructive' });
      return;
    }
    setWalletLoading(true);
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      if (!address) throw new Error('No account selected');
      const res = await api.connectWallet(address);
      setUser(res.data);
      toast({ title: 'Wallet connected', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to connect wallet', description: err.message, variant: 'destructive' });
    } finally {
      setWalletLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setWalletLoading(true);
    try {
      const res = await api.disconnectWallet();
      setUser(res.data);
      toast({ title: 'Wallet disconnected', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to disconnect wallet', description: err.message, variant: 'destructive' });
    } finally {
      setWalletLoading(false);
    }
  };

  const copyAddress = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: any = {};
      if (name !== user?.name) data.name = name;
      if (email !== user?.email) data.email = email;

      if (Object.keys(data).length === 0) {
        toast({ title: 'No changes to save', variant: 'default' });
        setSaving(false);
        return;
      }

      const res = await api.updateProfile(data);
      setUser(res.data);
      toast({ title: 'Profile updated', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ currentPassword, newPassword });
      toast({ title: 'Password changed', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Failed to change password', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-8">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">Account</span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
        </div>

        {/* Quick nav */}
        <div className="flex gap-2 mb-6">
          <Link href="/settings" className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-white">
            Profile
          </Link>
          <Link href="/settings/integrations" className="px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
            Integrations
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Info */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your name and email address</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Role: <span className="font-medium text-foreground">{user?.role}</span>
                    {user?.walletAddress && (
                      <> &middot; Wallet: <span className="font-medium text-accent">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span></>
                    )}
                  </p>
                  <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Wallet */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" />
                Wallet
              </CardTitle>
              <CardDescription>Manage your Web3 wallet for on-chain payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.walletAddress ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-muted-foreground">Connected Address</label>
                      <div className="mt-1 flex items-center gap-2 rounded-md border border-border/30 bg-muted/30 px-3 py-2">
                        <code className="text-sm font-mono text-foreground truncate">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </code>
                        <button
                          onClick={copyAddress}
                          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy address"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Network: <span className="font-medium text-foreground">Base Sepolia</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectWallet}
                      disabled={walletLoading}
                      className="gap-1.5 text-destructive hover:text-destructive"
                    >
                      {walletLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                      Disconnect Wallet
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">No wallet connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Network: <span className="font-medium text-foreground">Base Sepolia</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleConnectWallet}
                    disabled={walletLoading}
                    className="gap-1.5"
                  >
                    {walletLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                    Connect Wallet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="border-border/30 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    minLength={8}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={8}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

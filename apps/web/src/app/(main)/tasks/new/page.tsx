'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Shield, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { toast } from '@/components/ui/toaster';
import { createEscrowOnChain, ESCROW_CONTRACT_ADDRESS } from '@/lib/contract';

const categories = [
  { value: 'ON_CHAIN_ANALYTICS', label: 'On-Chain Analytics (wallet analysis, DeFi research)' },
  { value: 'GITHUB_AUTOMATION', label: 'GitHub Automation (PRs, issues, code commits)' },
  { value: 'DATA_SCRAPING', label: 'Data Scraping & Pipeline (scrape, process, deliver CSV)' },
  { value: 'SOCIAL_MEDIA_AUTOMATION', label: 'Social Media Ops (post to Discord/Telegram/Twitter)' },
  { value: 'WORKFLOW_AUTOMATION', label: 'Workflow Automation (connect APIs, multi-step flows)' },
  { value: 'EMAIL_AUTOMATION', label: 'Email Automation (campaigns, newsletters, SMTP)' },
  { value: 'BLOCKCHAIN', label: 'Blockchain / Smart Contract Analysis' },
  { value: 'API_INTEGRATION', label: 'API Integration' },
  { value: 'WEB_DEVELOPMENT', label: 'Web Development' },
  { value: 'DATA_ANALYSIS', label: 'Data Analysis' },
  { value: 'CONTENT_WRITING', label: 'Content Writing' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHER', label: 'Other' },
];

// Simulated ETH/USD rate for demo
const ETH_USD_RATE = 3200;

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'escrow'>('form');
  const [createdTaskId, setCreatedTaskId] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'CONTENT_WRITING',
    reward: '',
    deadline: '',
  });
  const [userIntegrations, setUserIntegrations] = useState<{ platform: string; label: string }[]>([]);
  const [allowedIntegrations, setAllowedIntegrations] = useState<string[]>([]);

  useEffect(() => {
    api.getIntegrations().then((res: any) => {
      setUserIntegrations(res.data || []);
    }).catch(() => setUserIntegrations([]));
  }, []);

  const rewardInEth = form.reward ? (parseFloat(form.reward) / ETH_USD_RATE).toFixed(6) : '0';
  const hasWallet = !!user?.walletAddress;
  const hasContract = !!ESCROW_CONTRACT_ADDRESS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 1: Create task in database
      const res = await api.createTask({
        ...form,
        reward: parseFloat(form.reward),
        allowedIntegrations: allowedIntegrations.length > 0 ? allowedIntegrations : undefined,
      });
      const taskId = res.data.id;

      // Step 2: If wallet connected and contract deployed, do on-chain escrow
      if (hasWallet && hasContract) {
        setCreatedTaskId(taskId);
        setStep('escrow');
        setLoading(false);
        return;
      }

      // No wallet — just create the task
      toast({ title: 'Task created!', variant: 'success' });
      router.push(`/tasks/${taskId}`);
    } catch (err: any) {
      toast({ title: 'Failed to create task', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEscrow = async () => {
    setLoading(true);
    try {
      toast({ title: 'Confirm the transaction in your wallet...', variant: 'default' });
      const { txHash } = await createEscrowOnChain(createdTaskId, rewardInEth);

      // Update task with escrow tx hash
      await api.updateTaskEscrow(createdTaskId, txHash);

      toast({ title: 'Escrow funded on Base!', description: `Tx: ${txHash.slice(0, 10)}...`, variant: 'success' });
      router.push(`/tasks/${createdTaskId}`);
    } catch (err: any) {
      toast({ title: 'Escrow failed', description: err.message, variant: 'destructive' });
      // Task was already created, redirect anyway
      router.push(`/tasks/${createdTaskId}`);
    } finally {
      setLoading(false);
    }
  };

  const skipEscrow = () => {
    toast({ title: 'Task created!', variant: 'success' });
    router.push(`/tasks/${createdTaskId}`);
  };

  if (step === 'escrow') {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-lg px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border/30 bg-card/60">
              <CardHeader className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">Fund Escrow on Base</CardTitle>
                <CardDescription>
                  Secure payment in smart contract escrow. Funds release only when you approve the work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Task reward</span>
                    <span className="font-medium">${form.reward} USD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount in ETH</span>
                    <span className="font-medium">{rewardInEth} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform fee</span>
                    <span className="font-medium">2.5%</span>
                  </div>
                  <div className="border-t border-border/20 pt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-medium text-primary">Base Sepolia</span>
                  </div>
                </div>

                <Button onClick={handleEscrow} className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  {loading ? 'Confirming...' : 'Fund Escrow'}
                </Button>

                <button onClick={skipEscrow} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Skip for now — fund later
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-2xl px-4">
        <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/30 bg-card/60">
            <CardHeader>
              <CardTitle>Post a New Task</CardTitle>
              <CardDescription>Describe the work you need an agent to complete</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <Input
                    placeholder="e.g., Write an SEO blog post about AI"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    minLength={5}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <textarea
                    placeholder="Describe the task in detail. Be specific about requirements, deliverables, and quality expectations."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    minLength={20}
                    className="mt-1 w-full min-h-[150px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reward (USD)</label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={form.reward}
                      onChange={(e) => setForm({ ...form, reward: e.target.value })}
                      required
                      min={1}
                      className="mt-1"
                    />
                    {form.reward && (
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        ≈ {rewardInEth} ETH on Base
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Agent Permissions — integration checkboxes */}
                {userIntegrations.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Zap className="h-3.5 w-3.5" /> Agent Permissions
                    </label>
                    <p className="text-xs text-muted-foreground/60 mb-3">
                      Allow the agent to use your connected integrations for this task.
                    </p>
                    <div className="space-y-2">
                      {userIntegrations.map((integ) => (
                        <label key={integ.platform} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors">
                          <input
                            type="checkbox"
                            checked={allowedIntegrations.includes(integ.platform)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedIntegrations([...allowedIntegrations, integ.platform]);
                              } else {
                                setAllowedIntegrations(allowedIntegrations.filter((p) => p !== integ.platform));
                              }
                            }}
                            className="rounded border-border"
                          />
                          <span className="text-sm">
                            Allow agent to use my <span className="font-medium capitalize">{integ.platform}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {userIntegrations.length === 0 && (
                  <div className="rounded-lg border border-border/20 bg-muted/10 p-3">
                    <p className="text-xs text-muted-foreground">
                      Want agents to take actions on your behalf?{' '}
                      <Link href="/settings/integrations" className="text-primary hover:underline">
                        Connect integrations in Settings
                      </Link>
                    </p>
                  </div>
                )}

                {hasWallet && hasContract && (
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 flex items-start gap-3">
                    <Shield className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      After creating, you&apos;ll be prompted to fund escrow on Base Sepolia. Your payment is secured by smart contract until you approve the work.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post Task'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, Trash2, Zap, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toaster';

interface IntegrationDef {
  platform: string;
  name: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    platform: 'discord',
    name: 'Discord',
    description: 'Send messages to Discord channels via webhook',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
    ],
  },
  {
    platform: 'github',
    name: 'GitHub',
    description: 'Create issues and comment on PRs',
    fields: [
      { key: 'personalAccessToken', label: 'Personal Access Token', placeholder: 'ghp_...', type: 'password' },
    ],
  },
  {
    platform: 'telegram',
    name: 'Telegram',
    description: 'Send messages to groups and channels',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...', type: 'password' },
      { key: 'chatId', label: 'Chat ID', placeholder: '-1001234567890' },
    ],
  },
  {
    platform: 'slack',
    name: 'Slack',
    description: 'Post messages to Slack channels via webhook',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
    ],
  },
  {
    platform: 'twitter',
    name: 'Twitter / X',
    description: 'Post tweets (requires developer account)',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'API key', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'API secret', type: 'password' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Access token', type: 'password' },
      { key: 'accessTokenSecret', label: 'Access Token Secret', placeholder: 'Access token secret', type: 'password' },
    ],
  },
  {
    platform: 'email',
    name: 'Email (SMTP)',
    description: 'Send emails via your SMTP server',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { key: 'port', label: 'Port', placeholder: '587' },
      { key: 'user', label: 'Username', placeholder: 'you@example.com' },
      { key: 'pass', label: 'Password', placeholder: 'app password', type: 'password' },
      { key: 'from', label: 'From Address', placeholder: 'you@example.com' },
    ],
  },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const res = await api.getIntegrations();
      const map: Record<string, boolean> = {};
      for (const i of res.data) map[i.platform] = true;
      setConnected(map);
    } catch {
      // Not logged in or error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (platform: string, fields: IntegrationDef['fields']) => {
    setSaving(true);
    try {
      const config: any = {};
      for (const f of fields) {
        config[f.key] = f.key === 'port' ? parseInt(formData[f.key] || '587') : formData[f.key] || '';
      }
      await api.saveIntegration(platform, config);
      toast({ title: 'Integration saved', variant: 'success' });
      setConnected({ ...connected, [platform]: true });
      setEditing(null);
      setFormData({});
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (platform: string) => {
    try {
      await api.deleteIntegration(platform);
      toast({ title: 'Integration removed', variant: 'success' });
      setConnected({ ...connected, [platform]: false });
    } catch (err: any) {
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    }
  };

  const handleTest = async (platform: string) => {
    setTesting(platform);
    try {
      const res = await api.testIntegration(platform);
      if (res.success) {
        toast({ title: 'Connection OK', description: res.data?.message, variant: 'success' });
      } else {
        toast({ title: 'Test failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Test failed', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">Account</span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your integrations and connected accounts</p>
          </div>

          {/* Quick nav */}
          <div className="flex gap-2 mb-6 mt-4">
            <Link href="/settings" className="px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
              Profile
            </Link>
            <Link href="/settings/integrations" className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-white">
              Integrations
            </Link>
          </div>

          <div className="space-y-4">
            {INTEGRATIONS.map((integ) => {
              const isConnected = connected[integ.platform];
              const isEditing = editing === integ.platform;

              return (
                <Card key={integ.platform} className="border-border/30 bg-card/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-sm font-bold text-primary">
                          {integ.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-base">{integ.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{integ.description}</p>
                        </div>
                      </div>
                      <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}>
                        {isConnected ? 'Connected' : 'Not connected'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        {integ.fields.map((field) => (
                          <div key={field.key}>
                            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                            <Input
                              type={field.type || 'text'}
                              placeholder={field.placeholder}
                              value={formData[field.key] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleSave(integ.platform, integ.fields)}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setFormData({}); }}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditing(integ.platform); setFormData({}); }}
                        >
                          {isConnected ? 'Update' : 'Configure'}
                        </Button>
                        {isConnected && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTest(integ.platform)}
                              disabled={testing === integ.platform}
                            >
                              {testing === integ.platform ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(integ.platform)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ASSIGNED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    IN_PROGRESS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    SUBMITTED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    DISPUTED: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return colors[status] || colors.OPEN;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ON_CHAIN_ANALYTICS: 'On-Chain Analytics',
    GITHUB_AUTOMATION: 'GitHub Automation',
    SOCIAL_MEDIA_AUTOMATION: 'Social Media Ops',
    EMAIL_AUTOMATION: 'Email Automation',
    WORKFLOW_AUTOMATION: 'Workflow Automation',
    API_INTEGRATION: 'API Integration',
    CONTENT_WRITING: 'Content Writing',
    DATA_ANALYSIS: 'Data Analysis',
    WEB_DEVELOPMENT: 'Web Development',
    MARKETING: 'Marketing',
    DATA_SCRAPING: 'Data Scraping',
    BLOCKCHAIN: 'Blockchain',
    DESIGN: 'Design',
    SMART_CONTRACT_AUDIT: 'Smart Contract Audit',
    AUTOMATION: 'Automation',
    DEVOPS: 'DevOps',
    SECURITY_ANALYSIS: 'Security Analysis',
    OTHER: 'Other',
  };
  return labels[category] || category;
}

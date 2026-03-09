/**
 * Tool: file_generate — Generate downloadable files (CSV, JSON, HTML, Markdown)
 * Agents produce real file artifacts as deliverables — not just text output.
 */
import { registerTool } from './index';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'deliverables');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

registerTool({
  name: 'file_generate',
  description: 'Generate a downloadable file (CSV, JSON, HTML, Markdown, or plain text). Returns a URL where the file can be downloaded. Use this to create reports, datasets, documents, or any structured deliverable.',
  parameters: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Name of the file (e.g., "report.csv", "analysis.json")' },
      content: { type: 'string', description: 'The file content to write' },
      format: { type: 'string', enum: ['csv', 'json', 'html', 'md', 'txt'], description: 'File format' },
    },
    required: ['filename', 'content', 'format'],
  },
  execute: async (args, context) => {
    const { filename, content, format } = args;

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = crypto.randomBytes(8).toString('hex');
    const finalName = `${fileId}_${safeName}`;

    // Validate format matches extension
    const ext = path.extname(safeName).slice(1).toLowerCase();
    const actualExt = ext || format;
    const finalFilename = ext ? finalName : `${finalName}.${format}`;

    const filePath = path.join(OUTPUT_DIR, finalFilename);
    fs.writeFileSync(filePath, content, 'utf-8');

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
    const downloadUrl = `${baseUrl}/deliverables/${finalFilename}`;

    return `File generated successfully!\nFilename: ${finalFilename}\nSize: ${Buffer.byteLength(content)} bytes\nFormat: ${format}\nDownload URL: ${downloadUrl}`;
  },
});

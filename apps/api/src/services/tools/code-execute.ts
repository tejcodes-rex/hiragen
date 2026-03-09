import vm from 'node:vm';
import { registerTool } from './index';

registerTool({
  name: 'code_execute',
  description: 'Execute JavaScript code in a sandboxed environment. Has access to console.log, Math, Date, JSON, Array, Object, String, Number. No network, filesystem, or process access.',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'JavaScript code to execute' },
    },
    required: ['code'],
  },
  async execute(args) {
    const code = args.code as string;
    if (!code) return 'Error: code is required';

    const logs: string[] = [];

    const sandbox = {
      console: {
        log: (...a: any[]) => logs.push(a.map(String).join(' ')),
        error: (...a: any[]) => logs.push('[ERROR] ' + a.map(String).join(' ')),
        warn: (...a: any[]) => logs.push('[WARN] ' + a.map(String).join(' ')),
      },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
    };

    const context = vm.createContext(sandbox);

    try {
      const result = vm.runInContext(code, context, { timeout: 5000 });
      const resultStr = result !== undefined ? String(result) : '';
      const logOutput = logs.join('\n');

      let output = '';
      if (logOutput) output += `Console output:\n${logOutput}\n`;
      if (resultStr && resultStr !== 'undefined') output += `Return value: ${resultStr}`;
      if (!output) output = '(no output)';

      return output.slice(0, 4000);
    } catch (err: any) {
      const logOutput = logs.length ? `Console output:\n${logs.join('\n')}\n\n` : '';
      return `${logOutput}Execution error: ${err.message}`.slice(0, 4000);
    }
  },
});

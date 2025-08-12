import { CommandDefinition, CommandContext } from '../base.js';
import { writeProjectContext } from '../../utils/context.js';

export const initCommand: CommandDefinition = {
  command: 'init',
  description: 'Generate project context files in .groq/',
  handler: ({ addMessage }: CommandContext) => {
    try {
      const { mdPath, jsonPath } = writeProjectContext(process.cwd());
      addMessage({
        role: 'system',
        content: `Project context generated.\n- Markdown: ${mdPath}\n- JSON: ${jsonPath}\nThe assistant will automatically load this context on startup. Re-run /init to refresh.`
      });
    } catch (error) {
      addMessage({
        role: 'system',
        content: `Failed to generate project context: ${error}`
      });
    }
  }
};

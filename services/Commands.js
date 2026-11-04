// Lightweight command registry for the Command Palette
const commands = [
  {
    id: 'help',
    title: 'Help',
    description: 'Show available commands and cheatsheet',
    category: 'General',
    clientOnly: true,
    shortcut: '?',
  },
  {
    id: 'clear',
    title: 'Clear Input',
    description: 'Clear the current input and pasted context',
    category: 'Session',
    clientOnly: true,
    shortcut: 'Esc',
  },
  {
    id: 'copy',
    title: 'Copy Conversation',
    description: 'Copy current input and context to clipboard',
    category: 'Session',
    clientOnly: true,
    shortcut: 'Ctrl+C',
  },
  {
    id: 'model',
    title: 'Switch Model',
    description: 'Change the active model',
    category: 'Model & Settings',
    clientOnly: true,
    shortcut: 'm',
  },
  {
    id: 'compact',
    title: 'Compact Context',
    description: 'Shrink and summarize the conversation context (server)',
    category: 'Utilities',
    clientOnly: false,
    apiRoute: '/api/commands/compact'
  },
  {
    id: 'export',
    title: 'Export Conversation',
    description: 'Export conversation memory as JSON (server)',
    category: 'Utilities',
    clientOnly: false,
    apiRoute: '/api/commands/export'
  }
];

export function listCommands() {
  return commands;
}

export function findMatchingCommands(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(c => (
    c.id.includes(q) ||
    c.title.toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q)
  ));
}

export function getCommandById(id) {
  return commands.find(c => c.id === id);
}

export default commands;

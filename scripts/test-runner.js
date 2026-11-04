import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const loaderCode = `
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  let targetSpecifier = specifier;
  if (targetSpecifier.startsWith('@/')) {
    targetSpecifier = process.cwd() + '/' + targetSpecifier.slice(2);
  }

  if (targetSpecifier.startsWith('/') || targetSpecifier.startsWith('D:') || targetSpecifier.startsWith('C:')) {
    if (!targetSpecifier.endsWith('.js') && !targetSpecifier.endsWith('.json') && !targetSpecifier.endsWith('.jsx')) {
      if (fs.existsSync(targetSpecifier + '.js')) {
        targetSpecifier += '.js';
      } else if (fs.existsSync(targetSpecifier + '.jsx')) {
        targetSpecifier += '.jsx';
      } else if (fs.existsSync(targetSpecifier + '/index.js')) {
        targetSpecifier += '/index.js';
      }
    }
    return nextResolve(pathToFileURL(targetSpecifier).href, context);
  }

  return nextResolve(specifier, context);
}
`;

const dataUrl = 'data:text/javascript;base64,' + Buffer.from(loaderCode).toString('base64');
register(dataUrl, pathToFileURL('./'));

import('./verify-claude-ux-upgrade.js');

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();

function resolveWithExtension(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  const extensions = ['.js', '.jsx', '.json', '.mjs'];
  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  for (const ext of extensions) {
    const candidate = path.join(basePath, 'index' + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return basePath;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }
  if (specifier === 'next/navigation') {
    return nextResolve('next/navigation.js', context);
  }

  if (specifier.startsWith('@/')) {
    const relativePath = specifier.slice(2);
    const absolutePath = path.resolve(rootDir, relativePath);
    const resolvedPath = resolveWithExtension(absolutePath);
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL && context.parentURL.startsWith('file:')) {
      const cleanPath = context.parentURL.replace('file:///', '').replace(/^([a-zA-Z]:)/, '$1');
      const parentDir = path.dirname(decodeURIComponent(cleanPath));
      const absolutePath = path.resolve(parentDir, specifier);
      const resolvedPath = resolveWithExtension(absolutePath);
      if (resolvedPath !== absolutePath) {
        return nextResolve(pathToFileURL(resolvedPath).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}

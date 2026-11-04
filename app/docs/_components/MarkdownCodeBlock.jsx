'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@/components/ui/animated-icon';

const LANGUAGE_LABELS = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  bash: 'Bash',
  sh: 'Shell',
  zsh: 'Zsh',
  python: 'Python',
  py: 'Python',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  md: 'Markdown',
  text: 'Text',
  txt: 'Text',
};

function getLanguageLabel(language) {
  const key = String(language || '').toLowerCase();
  return LANGUAGE_LABELS[key] || (language ? language.toUpperCase() : 'CODE');
}

export default function MarkdownCodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);
  const codeText = String(code || '').replace(/\n$/, '');
  const label = getLanguageLabel(language);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(codeText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = codeText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{label}</span>
        <button
          type="button"
          className={`code-copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          title={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        <code className={language ? `language-${language}` : undefined}>{codeText}</code>
      </pre>
    </div>
  );
}
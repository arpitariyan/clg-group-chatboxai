"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@/components/ui/animated-icon';

const SNIPPETS = {
  JavaScript: `import ChatboxAI from "openai";

const client = new ChatboxAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/v1",
});

const res = await client.chat.completions.create({
  model: "chatboxai/llama-3.3-70b",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);`,
  Python: `from openai import OpenAI

client = OpenAI(
    api_key="cbx_live_YOUR_KEY",
    base_url="https://chatboxai.co.in/v1",
)

response = client.chat.completions.create(
    model="chatboxai/llama-3.3-70b",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`,
  'cURL': `curl -X POST https://chatboxai.co.in/v1/chat/completions \
  -H "Authorization: Bearer cbx_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chatboxai/llama-3.3-70b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
};

export default function QuickstartBlock() {
  const [activeTab, setActiveTab] = useState('JavaScript');
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      const text = SNIPPETS[activeTab] || '';

      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
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
    <div className="docs-quickstart">
      <div className="docs-quickstart-header">
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--docs-text-muted)' }}>Developer Quickstart</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="docs-quickstart-tabs">
            {['JavaScript', 'Python', 'cURL'].map(tab => (
              <button
                key={tab}
                className={`docs-quickstart-tab ${activeTab === tab ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
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
      </div>
      <div className="docs-quickstart-body" style={{ whiteSpace: 'pre', overflowX: 'auto', lineHeight: '1.6' }}>
        {activeTab === 'JavaScript' && (
          <>
            <span className="tok-keyword">import</span> ChatboxAI <span className="tok-keyword">from</span> <span className="tok-string">"openai"</span>;{'\n\n'}
            <span className="tok-keyword">const</span> <span className="tok-const">client</span> = <span className="tok-keyword">new</span> <span className="tok-func">ChatboxAI</span>({'{'}{'\n'}
            {'  '}apiKey: process.env.<span className="tok-const">CHATBOXAI_API_KEY</span>,{'\n'}
            {'  '}baseURL: <span className="tok-string">"https://chatboxai.co.in/v1"</span>,{'\n'}
            {'}'});{'\n\n'}
            <span className="tok-keyword">const</span> <span className="tok-const">res</span> = <span className="tok-keyword">await</span> client.chat.completions.<span className="tok-func">create</span>({'{'}{'\n'}
            {'  '}model: <span className="tok-string">"chatboxai/llama-3.3-70b"</span>,{'\n'}
            {'  '}messages: [{'{'} role: <span className="tok-string">"user"</span>, content: <span className="tok-string">"Hello!"</span> {'}'}],{'\n'}
            {'}'});{'\n\n'}
            console.<span className="tok-func">log</span>(res.choices[<span className="tok-value">0</span>].message.content);
          </>
        )}
        {activeTab === 'Python' && (
          <>
            <span className="tok-keyword">from</span> openai <span className="tok-keyword">import</span> OpenAI{'\n\n'}
            <span className="tok-const">client</span> = <span className="tok-func">OpenAI</span>({'\n'}
            {'    '}api_key=<span className="tok-string">"cbx_live_YOUR_KEY"</span>,{'\n'}
            {'    '}base_url=<span className="tok-string">"https://chatboxai.co.in/v1"</span>,{'\n'}
            ){'\n\n'}
            <span className="tok-const">response</span> = client.chat.completions.<span className="tok-func">create</span>({'\n'}
            {'    '}model=<span className="tok-string">"chatboxai/llama-3.3-70b"</span>,{'\n'}
            {'    '}messages=[{'{'}<span className="tok-string">"role"</span>: <span className="tok-string">"user"</span>, <span className="tok-string">"content"</span>: <span className="tok-string">"Hello!"</span>{'}'}],{'\n'}
            ){'\n\n'}
            <span className="tok-func">print</span>(response.choices[<span className="tok-value">0</span>].message.content)
          </>
        )}
        {activeTab === 'cURL' && (
          <>
            curl -X POST https://chatboxai.co.in/v1/chat/completions \<span className="tok-string">{'\n'}</span>
            {'  '}-H <span className="tok-string">"Authorization: Bearer cbx_live_YOUR_KEY"</span> \<span className="tok-string">{'\n'}</span>
            {'  '}-H <span className="tok-string">"Content-Type: application/json"</span> \<span className="tok-string">{'\n'}</span>
            {'  '}-d <span className="tok-string">'{'{'}{'\n'}</span>
            <span className="tok-string">{'    '}"model": "chatboxai/llama-3.3-70b",{'\n'}</span>
            <span className="tok-string">{'    '}"messages": [{'{'}"role": "user", "content": "Hello!"{'}'}]{'\n'}</span>
            <span className="tok-string">  {'}'}'</span>
          </>
        )}
      </div>
    </div>
  );
}

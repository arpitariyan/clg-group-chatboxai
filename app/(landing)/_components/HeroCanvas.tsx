'use client';

import React from "react";
import { ArrowUp, Code2, FileText, Sparkles } from "lucide-react";
const chromeStudy = "/chrome-study.jpg";

/** Three-panel layered product collage. Entrance motion is owned by the Hero in index.tsx. */
export function HeroCanvas() {
  return (
    <div className="hz-stage">
      <ul className="hz-labels" aria-label="Capabilities">
        <li>AI Chat</li>
        <li>Image Generation</li>
        <li>Deep Research</li>
        <li>Website Builder</li>
      </ul>

      <figure className="hz-p hz-art">
        <div className="hz-bar">
          <Sparkles size={12} />
          <span>AI Image Generation</span>
        </div>
        <img
          src={chromeStudy}
          width={1024}
          height={1024}
          alt="AI-generated polished chrome sculpture"
        />
        <figcaption>
          <span>chrome-study.jpg</span>
          <span>↗</span>
        </figcaption>
      </figure>

      <div className="hz-p hz-chat">
        <div className="hz-bar">
          <b>ChatBoxAI</b>
          <span className="ml">Claude 3.5 Sonnet</span>
        </div>
        <div className="hz-chat-body">
          <p className="hz-prompt">Analyze Q3 revenue trends and identify growth opportunities.</p>
          <div className="hz-answer">
            <span aria-hidden="true">
              <Sparkles size={12} />
            </span>
            <p>
              <strong>Growth was driven by enterprise renewals</strong> rather than new logos.
            </p>
          </div>
        </div>
        <div className="hz-composer" aria-hidden="true">
          <span>Ask anything...</span>
          <span className="hz-chip">
            <FileText size={11} />
            Q3-Financial.xlsx
          </span>
          <span className="hz-send">
            <ArrowUp size={13} />
          </span>
        </div>
      </div>

      <div className="hz-p hz-code" aria-hidden="true">
        <div className="hz-bar">
          <Code2 size={12} />
          <span>Website Builder</span>
          <span className="ml">page.jsx</span>
        </div>
        <pre>
          {"export default function Page() {\n  return (\n    <main>\n      "}
          <em>{"<Hero />"}</em>
          {"\n      "}
          <em>{"<Features />"}</em>
          {"\n    </main>\n  );\n}"}
        </pre>
      </div>
    </div>
  );
}

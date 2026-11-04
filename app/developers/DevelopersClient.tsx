'use client';

import React from "react";
import { SubPage, SpSection, SpClosing } from "@/app/(landing)/_components/SubPage";

const snippet = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.CHATBOXAI_API_KEY,
  baseURL: "https://chatboxai.co.in/v1",
});

const res = await client.chat.completions.create({
  model: "chatboxai/llama-3.3-70b",
  messages: [{ role: "user", content: "Hello!" }],
});`;

const today = [
  [
    "Generate & explain code",
    "Ask for components, functions or explanations; Qwen3 32B and Qwen3 Coder 480B are documented for coding.",
  ],
  ["Refactor & debug", "Paste code and ask for a cleaner version or the cause of an error."],
  ["Prototype sites", "Use the Website Builder to turn a prompt into a React & Tailwind preview."],
  [
    "Call the API",
    "An OpenAI-compatible endpoint with API keys, function calling, web search and usage tracking, per the docs.",
  ],
];

const ideas = [
  "Reusable prompt presets for recurring tasks",
  "Project context packs pasted at the start of a thread",
  "A personal code-review checklist prompt",
  "A team prompt library",
];

export default function DevelopersClient() {
  return (
    <SubPage
      variant="developers"
      eyebrow="For your work / Developers"
      title={
        <>
          Build faster,
          <br />
          <span className="text-muted-foreground">review everything.</span>
        </>
      }
      lead="Write, explain and refactor code with the models in the catalog — in the workspace or through the OpenAI-compatible API."
      aside={
        <pre className="dev-code" aria-label="API quickstart from the ChatBoxAI docs">
          <code>{snippet}</code>
        </pre>
      }
    >
      <SpSection label="01 / Today" title="What you can do today">
        <dl className="dev-today">
          {today.map(([t, d]) => (
            <div key={t} className="reveal">
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <p className="sp-note">
          Always review, test and security-check generated code before shipping it.
        </p>
      </SpSection>

      <SpSection label="02 / Ideas" title="Workflow ideas to try">
        <p className="sp-tag">Suggestions — not shipped product features</p>
        <ul className="sp-rows sp-rows-muted">
          {ideas.map((t) => (
            <li key={t} className="reveal">
              {t}
            </li>
          ))}
        </ul>
      </SpSection>

      <SpClosing title="Ship your next prototype today." />
    </SubPage>
  );
}

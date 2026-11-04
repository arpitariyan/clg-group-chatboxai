'use client';

import React from "react";
import Link from "next/link";
import { SubPage, SpSection, SpClosing } from "@/app/(landing)/_components/SubPage";

const sequence = [
  ["Explore", "Get oriented on a topic with a chat model and list open questions."],
  ["Compare", "Ask different models to argue competing viewpoints or hypotheses."],
  ["Read", "Upload reports or papers to File Intelligence and ask about them."],
  ["Investigate", "Run Deep Research for a sourced, multi-step overview."],
  ["Draft", "Turn findings into a structured outline or first draft."],
  ["Verify", "Check every important claim against the original source."],
];

export default function ResearchersClient() {
  return (
    <SubPage
      variant="researchers"
      eyebrow="For your work / Researchers"
      title={
        <>
          From open question
          <br />
          <span className="text-muted-foreground">to structured draft.</span>
        </>
      }
      lead="Combine chat, document analysis and Deep Research in one workspace, and choose the model that fits each step."
    >
      <SpSection label="01 / Sequence" title="A research loop">
        <ol className="rs-seq">
          {sequence.map(([s, d], i) => (
            <li key={s} className="reveal">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{s}</h3>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </SpSection>

      <SpSection label="02 / Models" title="Pick per step">
        <p className="sp-prose reveal">
          Long documents suit large-context models; the docs describe Gemini 2.5 Pro as handling up
          to 2M tokens. Research models such as Kimi K2 are built for tool use and web search. See
          the <Link href="/ai-models">model catalog</Link> and <Link href="/deep-research">Deep Research</Link>{" "}
          for details.
        </p>
      </SpSection>

      <SpSection label="03 / Limits" title="Responsible verification">
        <p className="sp-prose reveal">
          AI output is not a citation. Models can misquote, invent references or rely on outdated
          material. Read primary sources yourself, follow your field's citation standards, and
          disclose AI assistance where your institution requires it.
        </p>
      </SpSection>

      <SpClosing title="Bring your next question." />
    </SubPage>
  );
}

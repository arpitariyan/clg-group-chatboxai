'use client';

import React from "react";
import Link from "next/link";
import { SubPage, SpSection, SpClosing } from "@/app/(landing)/_components/SubPage";
import { models } from "@/app/(landing)/_components/models-data";

const stages = [
  ["Frame", "State the question and the outcome you need. Narrow scope gives sharper answers."],
  ["Break down", "The research model splits the question into smaller, searchable parts."],
  ["Discover", "Web search gathers sources; the docs describe grounded answers with citations."],
  ["Cross-check", "Findings from different sources are compared where they agree or conflict."],
  ["Synthesize", "Results come back as an organized, long-form answer with its sources."],
];

export default function DeepResearchClient() {
  const research = models.filter((m) => m.category === "Deep Research");
  return (
    <SubPage
      variant="research"
      eyebrow="Explore / Deep Research"
      title={
        <>
          Ask once.
          <br />
          <span className="text-muted-foreground">Get an organized answer.</span>
        </>
      }
      lead="Deep Research uses models built for multi-step reasoning, tool use and web research to turn a broad question into a structured, sourced write-up."
    >
      <SpSection label="01 / Workflow" title="Five stages, one thread">
        <ol className="dr-flow">
          {stages.map(([s, d], i) => (
            <li key={s} className="reveal">
              <span className="dr-num">0{i + 1}</span>
              <h3>{s}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ol>
      </SpSection>

      <SpSection label="02 / Use it for" title="Practical questions">
        <div className="sp-split">
          <ul className="sp-rows">
            {[
              "Market and competitor overviews",
              "Background reading on an unfamiliar topic",
              "Comparing products, tools or approaches",
              "Summarizing what recent sources say about a question",
            ].map((t) => (
              <li key={t} className="reveal">
                {t}
              </li>
            ))}
          </ul>
          <div className="sp-panel reveal">
            <p className="sp-eyebrow">Research models in the catalog</p>
            <ul className="sp-mini">
              {research.map((m) => (
                <li key={m.id}>
                  <span>{m.name}</span>
                  <em>{m.tier}</em>
                </li>
              ))}
            </ul>
            <Link href="/ai-models">View the full catalog →</Link>
          </div>
        </div>
      </SpSection>

      <SpSection label="03 / Verify" title="Treat the report as a first draft">
        <p className="sp-prose reveal">
          AI research can miss sources, misread them or present outdated information. Open the cited
          links, check important figures against the original source, and confirm anything you will
          publish or act on. Deep Research saves the gathering and structuring — the final judgement
          stays with you.
        </p>
      </SpSection>

      <SpClosing title="Start your first research thread." />
    </SubPage>
  );
}

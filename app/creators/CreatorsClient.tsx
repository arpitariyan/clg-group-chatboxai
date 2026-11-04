'use client';

import React from "react";
import { SubPage, SpSection, SpClosing } from "@/app/(landing)/_components/SubPage";
import { models } from "@/app/(landing)/_components/models-data";

const flow = [
  ["Brainstorm", "Ask for angles, hooks and titles around one idea."],
  ["Outline", "Pick the strongest idea and turn it into a structure."],
  ["Write & rewrite", "Draft, then adapt tone for each channel or audience."],
  ["Visualize", "Generate cover art or concept images from a prompt."],
  ["Publish a page", "Sketch a landing page with the Website Builder."],
];

export default function CreatorsClient() {
  const image = models.filter((m) => m.category === "Image");
  return (
    <SubPage
      variant="creators"
      eyebrow="For your work / Creators"
      title={
        <>
          One idea,
          <br />
          <span className="text-muted-foreground">every format.</span>
        </>
      }
      lead="Move from a rough idea to words, visuals and a page — using the chat, image generation and Website Builder already in ChatBoxAI."
    >
      <SpSection label="01 / Workflow" title="A creator's pipeline">
        <div className="cr-flow">
          {flow.map(([s, d], i) => (
            <div key={s} className="reveal">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{s}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </SpSection>

      <SpSection label="02 / Images" title="Image models in the catalog">
        <ul className="sp-mini sp-mini-wide">
          {image.map((m) => (
            <li key={m.id} className="reveal">
              <span>{m.name}</span>
              <em>{m.tier}</em>
            </li>
          ))}
        </ul>
      </SpSection>

      <SpSection label="03 / Ideas" title="Try these habits">
        <p className="sp-tag">Suggestions — not shipped product features</p>
        <ul className="sp-rows sp-rows-muted">
          {[
            "Keep a saved prompt describing your brand voice",
            "Generate three variants and edit the best one",
            "Ask for a critique of your own draft before publishing",
          ].map((t) => (
            <li key={t} className="reveal">
              {t}
            </li>
          ))}
        </ul>
      </SpSection>

      <SpClosing title="Make the next thing." />
    </SubPage>
  );
}

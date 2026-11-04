'use client';

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { SubPage, SpSection, SpClosing } from "@/app/(landing)/_components/SubPage";
import {
  models,
  categoryInfo,
  extraFreeIds,
  MODELS_DOCS_URL,
  type ModelCategory,
  type ModelTier,
} from "@/app/(landing)/_components/models-data";

const categories: ModelCategory[] = ["Chat", "Deep Research", "Image", "Audio"];

export default function AiModelsClient() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<ModelTier | "All">("All");
  const [cat, setCat] = useState<ModelCategory | "All">("All");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return models.filter(
      (m) =>
        (tier === "All" || m.tier === tier) &&
        (cat === "All" || m.category === cat) &&
        (!s || `${m.name} ${m.id} ${m.purpose}`.toLowerCase().includes(s)),
    );
  }, [q, tier, cat]);

  return (
    <SubPage
      variant="models"
      eyebrow="Explore / AI Models"
      title={
        <>
          The model catalog,
          <br />
          <span className="text-muted-foreground">exactly as documented.</span>
        </>
      }
      lead="Every model below is copied from the ChatBoxAI models documentation, with its exact chatboxai/ model ID and tier. Free accounts get a smaller model set with request caps; paid accounts with credits unlock the full catalog."
      aside={
        <dl className="sp-facts">
          <div>
            <dt>Listed here</dt>
            <dd>{models.length} named models</dd>
          </div>
          <div>
            <dt>Namespace</dt>
            <dd className="font-mono">chatboxai/</dd>
          </div>
          <div>
            <dt>Auto selection</dt>
            <dd className="font-mono">"model": "auto"</dd>
          </div>
        </dl>
      }
    >
      <SpSection id="directory" label="01 / Directory" title="Find a model">
        <div className="mdir-controls reveal">
          <label className="mdir-search">
            <span className="sr-only">Search models</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID or purpose"
            />
          </label>
          <div className="mdir-filters" role="group" aria-label="Filter by tier">
            {(["All", "Free", "Paid"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="mdir-filters" role="group" aria-label="Filter by category">
            {(["All", ...categories] as const).map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="mdir-count" role="status">
          {list.length} of {models.length} models
        </p>
        {categories.map((c) => {
          const items = list.filter((m) => m.category === c);
          if (!items.length) return null;
          return (
            <div key={c} className="mdir-group">
              <div className="mdir-group-head">
                <h3>{c}</h3>
                <p>{categoryInfo[c]}</p>
              </div>
              <ul className="mdir-list">
                {items.map((m) => (
                  <li key={m.id}>
                    <div>
                      <strong>{m.name}</strong>
                      <code>{m.id}</code>
                    </div>
                    <p>{m.purpose}</p>
                    <span className={`mdir-tier mdir-tier-${m.tier.toLowerCase()}`}>{m.tier}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!list.length && <p className="sp-note">No models match those filters.</p>}
        <p className="sp-note">
          The docs also note additional lightweight free-tier models:{" "}
          {extraFreeIds.map((id, i) => (
            <span key={id}>
              <code>{id}</code>
              {i < extraFreeIds.length - 1 ? ", " : "."}
            </span>
          ))}{" "}
          The catalog changes over time — the{" "}
          <Link href={MODELS_DOCS_URL}>
            live models documentation ↗
          </Link>{" "}
          is the authoritative current list.
        </p>
      </SpSection>

      <SpSection label="02 / Choosing" title="A short selection guide">
        <ol className="sp-guide">
          <li className="reveal">
            <span>Everyday chat & writing</span>
            <p>Start with a Free chat model such as Llama 3.3 70B or Gemini 2.5 Flash.</p>
          </li>
          <li className="reveal">
            <span>Coding</span>
            <p>Qwen3 32B on Free; Qwen3 Coder 480B on Paid for heavy-duty work.</p>
          </li>
          <li className="reveal">
            <span>Research & agents</span>
            <p>Kimi K2 on Free; Nemotron 3 Super or Hermes 3 405B on Paid.</p>
          </li>
          <li className="reveal">
            <span>Not sure?</span>
            <p>
              Pass <code>"model": "auto"</code> and ChatBoxAI picks an available model based on
              latency and availability.
            </p>
          </li>
        </ol>
      </SpSection>

      <SpClosing title="Switch models without rewriting your app." />
    </SubPage>
  );
}

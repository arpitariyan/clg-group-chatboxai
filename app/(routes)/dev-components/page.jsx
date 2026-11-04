'use client';

import React, { useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ButtonGroup } from '@/components/ui/button-group';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { Slider } from '@/components/ui/slider';
import { Kbd } from '@/components/ui/kbd';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyAction } from '@/components/ui/empty';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { CodeBlock } from '@/components/ui/code-block';
import { Trace } from '@/components/ui/trace';
import { Typography } from '@/components/ui/typography';
import { Bold, Italic, Underline, Search, Sparkles } from 'lucide-react';

// Official AI Elements
import {
  Reasoning,
  ChainOfThought,
  InlineCitation,
  Sources,
  ModelSelector,
  PromptInput,
  Task,
  Plan,
  Tool,
  Checkpoint,
  Suggestion,
  Context,
  Terminal,
  TestResults,
  FileTree,
  Subagent,
  Confirmation,
  Queue,
  StackTrace,
  Message,
} from '@/components/ai-elements';

export default function DevComponentPreviewPage() {
  const [activeTab, setActiveTab] = useState('accordion');
  const [promptText, setPromptText] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const sampleModels = [
    { id: 'gpt-4o', name: 'GPT-4o', badge: 'Fast', description: 'Omni multi-modal flagship' },
    { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', badge: 'Hybrid', description: 'Deep reasoning and coding' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', badge: 'Reasoning', description: 'Open weights reasoning model' },
    { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', badge: 'Speed', description: 'Sub-second real-time latency' },
  ];

  const sampleChainSteps = [
    { id: '1', title: 'Parse natural language intent', status: 'completed', duration: '120ms' },
    {
      id: '2',
      title: 'Analyze codebase AST & symbol map',
      status: 'completed',
      duration: '450ms',
      details: 'Parsed 52 TypeScript files across /components/ui and matched AST tokens.',
    },
    { id: '3', title: 'Generate Base UI component composition', status: 'running', duration: '2.1s' },
    { id: '4', title: 'Verify layout against base-nova tokens', status: 'pending' },
  ];

  const sampleSources = [
    { title: 'Base UI Documentation', domain: 'base-ui.com', url: 'https://base-ui.com', site: 'Base UI' },
    { title: 'shadcn/ui Official Components', domain: 'ui.shadcn.com', url: 'https://ui.shadcn.com', site: 'shadcn' },
    { title: 'Tailwind CSS v4 Specifications', domain: 'tailwindcss.com', url: 'https://tailwindcss.com', site: 'Tailwind' },
    { title: 'React 19 Server Components', domain: 'react.dev', url: 'https://react.dev', site: 'React' },
  ];

  const sampleFileTree = [
    {
      name: 'components',
      path: 'components',
      children: [
        {
          name: 'ui',
          path: 'components/ui',
          children: [
            { name: 'accordion.tsx', path: 'components/ui/accordion.tsx' },
            { name: 'button.tsx', path: 'components/ui/button.tsx' },
            { name: 'card.jsx', path: 'components/ui/card.jsx' },
          ],
        },
        {
          name: 'ai-elements',
          path: 'components/ai-elements',
          children: [
            { name: 'reasoning.jsx', path: 'components/ai-elements/reasoning.jsx' },
            { name: 'plan.jsx', path: 'components/ai-elements/plan.jsx' },
            { name: 'sources.jsx', path: 'components/ai-elements/sources.jsx' },
          ],
        },
      ],
    },
    { name: 'package.json', path: 'package.json' },
    { name: 'components.json', path: 'components.json' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Dev Harness Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">shadcn/ui base-nova & AI Elements Harness</h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              Dev Only
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Verification sandbox testing official Base UI primitives, Nova style density, and 22 AI Elements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector
            models={sampleModels}
            selectedModelId={selectedModel}
            onSelectModel={setSelectedModel}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="accordion" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Accordion (Base-Nova)
          </TabsTrigger>
          <TabsTrigger value="ai-reasoning" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Reasoning & Chain
          </TabsTrigger>
          <TabsTrigger value="ai-citations" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Citations & Sources
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Agent, Plan & Tool
          </TabsTrigger>
          <TabsTrigger value="ai-workspace" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Terminal, Tree & Tests
          </TabsTrigger>
          <TabsTrigger value="ai-chat" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Chat & Prompt Input
          </TabsTrigger>
          <TabsTrigger value="primitives" className="rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer">
            Primitives (Groups A-D)
          </TabsTrigger>
        </TabsList>

        {/* 1. Accordion Official Variants */}
        <TabsContent value="accordion" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">Official Accordion Variants (base-nova)</h2>
            <p className="text-xs text-muted-foreground">
              Compact Nova padding (`py-3.5`), subtle border dividers (`border-border/60`), and smooth chevron rotation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Variant 1: Basic Single */}
            <Card className="rounded-2xl border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Variant A: Basic Single Collapsible
                </CardTitle>
                <CardDescription className="text-xs">Single item expansion with collapse behavior.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>What makes base-nova unique?</AccordionTrigger>
                    <AccordionContent>
                      It provides tighter margins, compact padding, and crisp micro-elevations tailored for high-density AI workspaces.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Is it fully keyboard accessible?</AccordionTrigger>
                    <AccordionContent>
                      Yes, it strictly adheres to the WAI-ARIA accordion pattern with arrow key focus and Enter/Space triggers.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Are protected pages isolated?</AccordionTrigger>
                    <AccordionContent>
                      Yes, marketing landing and authentication pages use isolated stylesheets and remain visually untouched.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Variant 2: Card Accordion */}
            <Card className="rounded-2xl border-border/60 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Variant B: Card & Bordered Composition
                </CardTitle>
                <CardDescription className="text-xs">Segmented cards with independent border containers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3.5 rounded-xl border border-border/60 bg-card/80">
                  <Accordion type="single" collapsible defaultValue="card-1">
                    <AccordionItem value="card-1" className="border-0">
                      <AccordionTrigger className="py-0">Autonomous AI Web Builder</AccordionTrigger>
                      <AccordionContent className="pt-2 pb-0">
                        Generates complete multi-page React and Tailwind CSS projects with live sandboxed previews.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-card/80">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="card-2" className="border-0">
                      <AccordionTrigger className="py-0">Deep Research Engine</AccordionTrigger>
                      <AccordionContent className="pt-2 pb-0">
                        Synthesizes dozens of live web sources with citation footnotes and structured Markdown exports.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Reasoning & Chain of Thought */}
        <TabsContent value="ai-reasoning" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reasoning Component</h3>
              <Reasoning isStreaming={true} title="Thinking Process">
                Analyzing the prompt intent across 56 available AI models. Detecting that the query requires high-fidelity code generation with React 19 server components.
              </Reasoning>

              <Reasoning duration="1.4s" title="Completed Reasoning" defaultOpen={false}>
                Evaluated AST dependencies. Selected Tailwind v4 semantic variables over hardcoded OKLCH values.
              </Reasoning>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chain of Thought Component</h3>
              <ChainOfThought steps={sampleChainSteps} />
            </div>
          </div>
        </TabsContent>

        {/* 3. Citations & Sources */}
        <TabsContent value="ai-citations" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inline Citation Footnotes</h3>
            <p className="text-sm leading-relaxed p-4 rounded-2xl border border-border/60 bg-card/60">
              ChatBox AI integrates foundational language models with live web verification
              <InlineCitation index={1} domain="base-ui.com" title="Base UI Component Library" snippet="Unstyled, accessible React components created by the MUI team." />
              allowing real-time citations to accompany answer blocks
              <InlineCitation index={2} domain="ui.shadcn.com" title="shadcn/ui Official Registry" snippet="Beautifully designed components that you can copy and paste into your apps." />
              without disrupting reading rhythm.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <Sources sources={sampleSources} />
          </div>
        </TabsContent>

        {/* 4. Agent, Plan & Tool */}
        <TabsContent value="ai-agent" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subagent & Tool Execution</h3>
              <Subagent
                name="Frontend Synthesizer"
                role="Subagent 01"
                status="running"
                task="Generating Base UI Accordion preview with accessible focus rings and responsive padding."
              />
              <Tool
                name="e2b_code_interpreter"
                status="completed"
                duration="340ms"
                input={{ code: 'import { Accordion } from "@base-ui/react"; console.log(Accordion);' }}
                output="[Function: AccordionRoot] verified WAI-ARIA compliant"
              />
              <Checkpoint
                version="1.2.0"
                timestamp="Just now"
                description="Standardized all components to base-nova style."
                isCurrent={true}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Autonomous Plan & Queue</h3>
              <Plan
                objective="Standardize ChatBox AI UI to official shadcn base-nova design"
                tasks={[
                  { title: 'Audit core component catalog (Groups A-D)', status: 'completed' },
                  { title: 'Implement Base UI primitives & tokens', status: 'completed' },
                  { title: 'Build 22 AI Elements catalog', status: 'running', tool: 'Generator' },
                  { title: 'Verify protected routes & production build', status: 'pending' },
                ]}
              />
              <Queue
                items={[
                  { title: 'High-res image synthesis (FLUX.1-dev)', status: 'processing', estimatedTime: '4s' },
                  { title: 'Deep Research multi-source PDF export', status: 'pending', estimatedTime: '12s' },
                ]}
              />
            </div>
          </div>
        </TabsContent>

        {/* 5. Terminal, Tree & Tests */}
        <TabsContent value="ai-workspace" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Terminal</h3>
              <Terminal
                command="npx tsc --noEmit && npm run build"
                output="▲ Next.js 16.1.3 (Turbopack)
✓ Compiled successfully in 3.5min
✓ Generating static pages (158/158) in 10.6s
Finalizing page optimization ..."
              />
              <Context usedTokens={42800} maxTokens={128000} memoryCount={14} files={['accordion.tsx', 'chat.jsx']} />
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File Tree & Test Assertions</h3>
              <FileTree items={sampleFileTree} activePath="components/ui/accordion.tsx" />
              <TestResults
                suite="UI Standardization Suite"
                passed={52}
                failed={0}
                duration="1.2s"
                tests={[
                  { name: 'Accordion WAI-ARIA navigation', status: 'passed', duration: '12ms' },
                  { name: 'Base-nova token resolution', status: 'passed', duration: '8ms' },
                  { name: 'Zero visual regression on /sign-in and /', status: 'passed', duration: '24ms' },
                ]}
              />
            </div>
          </div>
        </TabsContent>

        {/* 6. Chat & Prompt Input */}
        <TabsContent value="ai-chat" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Standardized Message & Input</h3>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3">
              <Message role="user" content="Can you convert our components to the official base-nova style with Base UI?" timestamp="10:14 AM" />
              <Message role="assistant" modelName="Claude 3.7 Sonnet" timestamp="10:15 AM">
                Certainly. All 4 core component groups and 22 AI Elements have been implemented and aligned to official base-nova specifications while keeping all marketing and authentication screens untouched.
              </Message>

              <div className="pt-4">
                <PromptInput
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onSubmit={() => {
                    alert(`Submitted prompt: ${promptText}`);
                    setPromptText('');
                  }}
                  placeholder="Type an AI instruction..."
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmModal(true)}
                    className="h-7 text-xs rounded-lg cursor-pointer"
                  >
                    Action Confirmation
                  </Button>
                </PromptInput>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 7. Core Primitives Showcase */}
        <TabsContent value="primitives" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">Core Primitives (Groups A-D Standardized)</h2>
            <p className="text-xs text-muted-foreground">
              Nova-density controls, toggle groups, sliders, input groups, keyboard tags, and composed fields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Toggles & Toggle Groups */}
            <Card className="rounded-2xl border-border/60 bg-card/60 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Toggles & Toggle Groups
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle aria-label="Toggle bold" size="sm" variant="outline">
                  <Bold className="size-3.5" />
                </Toggle>
                <Toggle aria-label="Toggle italic" size="sm" variant="outline">
                  <Italic className="size-3.5" />
                </Toggle>
                <ToggleGroup type="multiple" variant="outline" size="sm">
                  <ToggleGroupItem value="bold" aria-label="Toggle bold">
                    <Bold className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Toggle italic">
                    <Italic className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="underline" aria-label="Toggle underline">
                    <Underline className="size-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <ButtonGroup>
                  <Button size="sm" variant="outline" className="h-7.5 text-xs">Left</Button>
                  <Button size="sm" variant="outline" className="h-7.5 text-xs">Middle</Button>
                  <Button size="sm" variant="outline" className="h-7.5 text-xs">Right</Button>
                </ButtonGroup>
              </div>
            </Card>

            {/* Input Group & Kbd */}
            <Card className="rounded-2xl border-border/60 bg-card/60 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Input Groups & Shortcuts
              </h3>
              <InputGroup>
                <InputGroupAddon position="left">
                  <Search className="size-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <Input placeholder="Search components..." className="h-8.5 text-xs pl-8 pr-12 rounded-lg" />
                <InputGroupAddon position="right">
                  <Kbd>⌘K</Kbd>
                </InputGroupAddon>
              </InputGroup>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Press</span>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>Shift</Kbd>
                <span>+</span>
                <Kbd>P</Kbd>
                <span>for command palette</span>
              </div>
            </Card>

            {/* Form Field & Slider */}
            <Card className="rounded-2xl border-border/60 bg-card/60 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Slider & Field Primitives
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Temperature</span>
                  <span className="text-muted-foreground">0.7</span>
                </div>
                <Slider defaultValue={[70]} max={100} step={1} className="w-full" />
              </div>

              <Field>
                <FieldLabel required>System Prompt</FieldLabel>
                <Input placeholder="Enter custom instructions..." className="h-8.5 text-xs rounded-lg" />
                <FieldDescription>Guiding rules applied to the AI session.</FieldDescription>
              </Field>
            </Card>

            {/* Trace & Empty State */}
            <Card className="rounded-2xl border-border/60 bg-card/60 p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trace Line & Code Block
              </h3>
              <Trace
                title="Model inference completed"
                timestamp="10:18:22 AM"
                status="success"
                duration="340ms"
                details="Used Anthropic Bedrock endpoint with Claude 3.7 Sonnet."
              />
              <CodeBlock language="bash" code="npm run build" />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Safety Confirmation Modal Test */}
      <Confirmation
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          alert('Action confirmed safely!');
        }}
        title="Execute Autonomous Tool Call?"
        description="This will invoke the live E2B code execution sandbox with verified parameters."
      />
    </div>
  );
}

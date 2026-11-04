# Overview

Welcome to ChatboxAI. We provide a **unified AI API platform** built for production scale, giving developers instant access to the world's most advanced AI models through a single, reliable, and OpenAI-compatible interface. 

By completely abstracting away the complexity of managing multiple AI providers, managing API keys, handling rate limits, and implementing failovers, ChatboxAI allows you to focus on what matters most: building intelligent applications.

---

## Why Choose ChatboxAI?

### 1. Unified, Drop-in Interface
Our API is **100% compatible with the OpenAI specification**. You don't need to learn a new SDK or rewrite your codebase. You can connect to ChatboxAI instantly by just updating the `baseURL` and `apiKey` in any existing OpenAI-compatible application or library.

### 2. Intelligent Provider Fallbacks
AI providers occasionally experience downtime or high latency. ChatboxAI acts as a smart gateway. If a primary provider fails, we automatically re-route your request to the next best provider in milliseconds. Your application stays online, and you never see the error.

### 3. Unified Credit-Based Billing
Stop tracking dozens of subscriptions and invoices. Whether you are generating text, analyzing images, or synthesizing speech, all usage is deducted from a single US Dollar ($) credit balance. 

### 4. Enterprise-Grade Security
Your data privacy is guaranteed. ChatboxAI enforces strict data retention policies, uses TLS encryption for all transit, and ensures zero data is used for model training without explicit consent.

---

## Core Capabilities

ChatboxAI goes far beyond simple text generation. Our platform offers a full suite of modern AI capabilities required to build complex agents and workflows:

### Text & Code Generation
- **Chat Completions**: Drive conversational AI, deep reasoning, and advanced logic using top-tier models from Meta (Llama 3), Google (Gemini), and Qwen.
- **Deep Research**: Utilize agentic reasoning models capable of multi-step logic, web search, and data synthesis.
- **Code Generation**: Write, explain, refactor, and debug code instantly with models specifically fine-tuned for programming.

### Multimodal (Vision & Audio)
- **Image Generation**: Create high-quality, photorealistic or stylized images directly from text prompts using models like FLUX and Stable Diffusion.
- **Vision Models**: Pass images into Chat Completions to extract text, analyze charts, or understand visual context.
- **Audio & Speech**: Transcribe audio files or synthesize natural, human-sounding speech (TTS).

### Advanced Workflows
- **Function Calling**: Grant models the ability to execute real-world actions, call your internal APIs, and trigger external systems.
- **Structured Output**: Enforce strict JSON schemas, guaranteeing that models return perfectly parsable and predictable data structures every time.
- **Streaming**: Receive responses token-by-token in real-time via Server-Sent Events (SSE) for low-latency user experiences.

---

## Base URL & Authentication

All API endpoints are served securely under the `/api/v1` namespace.

```text
https://chatboxai.co.in/api/v1
```

Every API request requires authentication using a Bearer token in the header:

```http
Authorization: Bearer cbx_live_YOUR_KEY
```

> [!TIP]
> You can generate and manage your secure API keys from the [Dashboard Settings](/settings?tab=api-keys).

---

## Quick Links to Get Started

- [Quickstart Guide](/docs/quickstart) — Make your first API call in under 5 minutes.
- [Authentication](/docs/authentication) — Learn how to securely store and pass your API keys.
- [Models Catalog](/docs/models) — Explore available text, image, and multimodal models.
- [Pricing & Billing](/docs/pricing) — Learn about our transparent, credit-based billing system.
- [Libraries & SDKs](/docs/libraries) — See how to integrate using your favorite programming language.

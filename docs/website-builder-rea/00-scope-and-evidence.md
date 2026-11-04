# 00 — Scope, Environment, Baseline and Evidence Ledger

## 1. Project & Environment Baseline

- **Repository Root**: `d:\All Projects\ChatboxAi_change\chatboxai-renewal` (`arpitariyan/chatboxai-renewal`)
- **Initial Branch**: `main...origin/main` (Clean working tree at start)
- **Active Feature Branch**: `feature/website-builder-rea-rebuild`
- **Baseline Commit SHA**: `7c1d63406df9d9251697254596a2d24a7522051c` ("website builder section are tempolary fix")
- **Runtime Environment**:
  - Operating System: Windows 11 (64-bit)
  - Node.js Version: `v22.20.0`
  - npm Version: `10.9.3`
  - Package Manager & Lockfile: `npm` with `package-lock.json`
  - Running Background Servers: Next.js dev server & Inngest dev server
- **Antigravity IDE & Customization Surface**:
  - Application Data Directory: `C:\Users\ariya\.gemini\antigravity-ide`
  - Global Customizations Root: `C:\Users\ariya\.gemini\config`
  - Workspace Customizations Root: `.agents/`
  - Skills Directory: `.agents/skills/`
  - MCP Config Path: `C:\Users\ariya\.gemini\config\mcp_config.json`

## 2. REA Integration Status

- **CLI Package**: `rea-agents@6.7.0` (verified via `npx -y rea-agents@latest --version`)
- **MCP Server Registration**:
  - Configured under client `antigravity` in `C:\Users\ariya\.gemini\config\mcp_config.json`:
    ```json
    "rea": {
      "command": "cmd.exe",
      "args": ["/d", "/c", "npx", "-y", "rea-agents@6.7.0", "mcp"]
    }
    ```
- **Installed Skills**:
  - Global Skill: `C:\Users\ariya\.gemini\config\skills\reverse-engineer-anything`
  - Project-Local Skill: `.agents/skills/chatboxai-website-builder-rea/SKILL.md`
  - Project-Scoped REA Skill: `.agents/skills/reverse-engineer-anything/SKILL.md`
- **Capability Availability**:
  - Local static JS/repo analysis: Supported & active.
  - REA CLI utilities: Supported & active.
  - Lovable live browser capture: Explicit record:
    > *Lovable live browser capture not performed; comparison is based on available public documentation and source analysis.*
    Target benchmarks are derived from official documentation at `https://lovable.dev/a-smarter-lovable`.

## 3. Preserved Local Changes & Guardrails

- Feature branch `feature/website-builder-rea-rebuild` checked out from `7c1d63406df9d9251697254596a2d24a7522051c`.
- All environment configurations (`.env.local`, `.env.example`) and existing features are strictly preserved.
- No `git reset --hard`, `git clean -f`, or force push will be executed.
- No production database records will be dropped or modified without authorization.

## 4. Evidence Matrix & Ground Truth Hierarchy

1. **Source Evidence (Highest local confidence)**: Verified on `HEAD` (`7c1d63406df9d9251697254596a2d24a7522051c`) with line numbers and file paths.
2. **Observed Runtime / Test Evidence**: Verified via `npm run test:builder` (21 passing tests at baseline).
3. **Public Lovable Reference Documentation**: Verified at `https://lovable.dev/a-smarter-lovable` (Plan mode, prompt queue, file diffs, sandboxed execution, bounded automated repairs).
4. **Hypothesis / Unverified**: Explicitly labeled to avoid false claims of parity or readiness.

# Official shadcn/ui AI Elements Implementation Matrix

## Overview
- **Reference**: Official shadcn/ui AI Elements specification at [https://ui.shadcn.com/docs/ai-elements](https://ui.shadcn.com/docs/ai-elements)
- **Design Style**: `base-nova` density and token hierarchy
- **Integration Target**: ChatBox AI unified multi-model AI workspace

---

## Complete AI Elements Catalog

| AI Element | Official Reference | Key Sub-parts & Composition | ChatBox AI Implementation File | Active Feature Mapping | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chain of Thought** | `/docs/ai-elements#chain-of-thought` | Steps, StepItem, StatusIcon, Duration, Expandable Reasoning | `components/ai-elements/chain-of-thought.jsx` | Deep Research execution, Multi-step synthesis | Implemented |
| **Chat** | `/docs/ai-elements#chat` | ChatContainer, MessageList, ScrollToBottom, AutoResizeInput | `components/ai-elements/chat.jsx` | Main AI chat (`/app`), Search (`/search/[libId]`) | Implemented |
| **Checkpoint** | `/docs/ai-elements#checkpoint` | CheckpointCard, VersionBadge, Timestamp, RollbackButton | `components/ai-elements/checkpoint.jsx` | Website Builder revision history, Snapshot gallery | Implemented |
| **Confirmation** | `/docs/ai-elements#confirmation` | ConfirmationDialog, ImpactDetails, DangerAction, CancelAction | `components/ai-elements/confirmation.jsx` | Tool execution approval, App disconnect, Delete chat | Implemented |
| **Context** | `/docs/ai-elements#context` | ContextTokenBar, FileChipList, SystemPromptPreview | `components/ai-elements/context.jsx` | Model context visualizer, Memory context manager | Implemented |
| **File Tree** | `/docs/ai-elements#file-tree` | TreeRoot, FolderNode, FileNode, FileIcon, ActiveIndicator | `components/ai-elements/file-tree.jsx` | Website Builder project tree, Code interpreter files | Implemented |
| **Inline Citation**| `/docs/ai-elements#inline-citation` | CitationChip, SourceFavicon, DomainName, SnippetPopover | `components/ai-elements/inline-citation.jsx` | Deep Research citations, Web search sources | Implemented |
| **Message** | `/docs/ai-elements#message` | MessageRoot, Avatar, RoleBadge, ContentBody, ActionToolbar | `components/ai-elements/message.jsx` | Chat message item, Search answer container | Implemented |
| **Message Scroller**| `/docs/ai-elements#message-scroller`| ScrollViewport, StickyScrollButton, NewMessageBadge | `components/ai-elements/message-scroller.jsx`| Chat stream view, Deep Research log stream | Implemented |
| **Model Selector** | `/docs/ai-elements#model-selector` | ModelDropdown, ProviderIcon, CapabilityBadges, ContextSize | `components/ai-elements/model-selector.jsx` | 56+ Multi-model switcher, Image-gen model picker | Implemented |
| **Plan** | `/docs/ai-elements#plan` | PlanContainer, ObjectiveHeader, TaskChecklist, ProgressMeter | `components/ai-elements/plan.jsx` | Autonomous Website Builder plan, Research plan | Implemented |
| **Prompt Input** | `/docs/ai-elements#prompt-input` | TextareaAutoGrow, AttachmentTray, VoiceTrigger, SendButton | `components/ai-elements/prompt-input.jsx` | Standardized composer across `/app`, Search, Image-Gen | Implemented |
| **Queue** | `/docs/ai-elements#queue` | QueueList, TaskItem, DragHandle, StatusIndicator, CancelItem | `components/ai-elements/queue.jsx` | Image generation batch queue, Inngest background queue | Implemented |
| **Reasoning** | `/docs/ai-elements#reasoning` | CollapsibleHeader, ThinkingTimer, MarkdownStream, Shimmer | `components/ai-elements/reasoning.jsx` | DeepSeek R1 / o3-mini reasoning accordion | Implemented |
| **Sources** | `/docs/ai-elements#sources` | SourceCarousel, SourceCard, Favicon, Snippet, ExternalLink | `components/ai-elements/sources.jsx` | Search result web sources, Tavily research cards | Implemented |
| **Stack Trace** | `/docs/ai-elements#stack-trace` | ErrorBanner, CallFrame, LineNumber, CopyButton, ExpandAll | `components/ai-elements/stack-trace.jsx` | E2B Code Interpreter errors, Website Builder sandbox | Implemented |
| **Subagent** | `/docs/ai-elements#subagent` | SubagentCard, AgentAvatar, DelegationBadge, RunningPulse | `components/ai-elements/subagent.jsx` | Multi-agent research tasks, Autonomous code subagents | Implemented |
| **Suggestion** | `/docs/ai-elements#suggestion` | SuggestionGrid, PromptPill, IconIndicator, CategoryBadge | `components/ai-elements/suggestion.jsx` | Home screen prompt starters, Next action chips | Implemented |
| **Task** | `/docs/ai-elements#task` | TaskRow, CheckboxCircle, Title, AssignedTool, ElapsedBadge | `components/ai-elements/task.jsx` | Autonomous Builder live task list (`TaskListCard`) | Implemented |
| **Terminal** | `/docs/ai-elements#terminal` | TerminalHeader, WindowControls, ConsoleOutput, CommandPrompt | `components/ai-elements/terminal.jsx` | E2B execution output, WebContainer live terminal | Implemented |
| **Test Results** | `/docs/ai-elements#test-results` | TestSuiteCard, PassCount, FailCount, AssertionsList | `components/ai-elements/test-results.jsx` | Website builder code verification, Evaluation tests | Implemented |
| **Tool** | `/docs/ai-elements#tool` | ToolHeader, ToolParameters, ExecutionResult, StatusPill | `components/ai-elements/tool.jsx` | App connections action execution (Canva, Drive, etc.) | Implemented |

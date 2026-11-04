# Decoupled Thinking Animation Logic

## The Problem
The previous implementation of the thinking animation (`ThinkingBlock`) within `DisplaySummery.jsx` attempted to parse the `<think>` tags on every single frame during the typewriter animation. Because it used a single `displayedText` state, it would inevitably render incomplete chunks of the `<think>` tags (e.g., `<t`, `<th`) as the final markdown text, causing flickering and incorrectly merging reasoning logic with the final response.

## The Solution
We adopted a completely decoupled architecture, separating the thinking content from the final response *before* any animation takes place.

### Implementation Details:
1. **Pre-Parsing (`useMemo`)**:
   When `aiResp` is received, we use a regex to immediately split it into two variables: `fullThinking` and `fullFinal`.
   - `fullThinking`: The content extracted from inside the `<think>...</think>` tags.
   - `fullFinal`: The actual final response (with the `<think>` block and any `<tool_call>` tags stripped out).

2. **Decoupled States**:
   Instead of a single `displayedText` state, we now track two independent states:
   - `displayedThinking`: Feeds into the `<ThinkingBlock>`
   - `displayedFinal`: Feeds into `<ReactMarkdown>`

3. **Sequential Typewriter Animation**:
   The `tick()` function in `requestAnimationFrame` maintains a single `currentIndex` that iterates from `0` up to `fullThinking.length + fullFinal.length`.
   - **Phase 1 (Thinking)**: While `currentIndex <= fullThinking.length`, only `displayedThinking` is updated. `<ThinkingBlock>` stays open and types out its content in real-time.
   - **Phase 2 (Final Response)**: Once `currentIndex > fullThinking.length`, `displayedThinking` locks at `fullThinking`, and the `<ThinkingBlock>` evaluates `isThinkingFinished` to `true` (auto-closing itself). The remaining index advances `displayedFinal`, which then cleanly types out the response in the main view.

## Benefits
- **Zero Flickering**: The final response state never sees incomplete reasoning tags.
- **Accurate Auto-Close**: The thinking block closes at the exact moment its specific content finishes typing.
- **Clean Architecture**: Eliminates the need to run costly regex operations on every animation frame.

*Note: This architecture also applies to history states, instantly showing the correct parsed blocks without animating when `shouldAnimate` is false.*

# Thinking Animation UI Redesign

## The Problem
The user pointed out that the `ThinkingBlock` UI did not match their intended reference design. Specifically, the old design was too prominent, utilizing background colors (`bg-muted`), borders, and a circular background for the Brain icon, which clashed with the clean, minimalist visual style requested. Furthermore, the user questioned why the block occasionally didn't show up. 

## The Solution
1. **Visual Redesign**:
   - Stripped away the `bg-muted` background and border from the `ThinkingBlock` in both `DisplaySummery.jsx` and `ThinkingProcess` in `AnswerDisplay.jsx`.
   - The button is now simply a `flex` container with the Brain icon directly inline (no circle), mimicking the reference design exactly.
   - Updated the arrow to use `ChevronDown` (animating to `0` and `-90` degrees) to align with standard collapsible behavior.
   - Replaced the full border/background with a subtle left vertical line (`w-[2px] bg-gray-200 dark:bg-zinc-700/60`) to delineate the reasoning content cleanly.

2. **Explanation of the Missing Block Issue**:
   - The logic added in the prior step dictates that `ThinkingBlock` is completely skipped if `fullThinking` is empty and `fullFinal` is long enough. 
   - We updated the regex to be case-insensitive (`/i`) to ensure we catch `<THINK>` or `<Think>`.
   - If the model tested (e.g. GLM 5.2 or Qwen without reasoning enablement) completely fails to use `<think>` tags despite prompt instructions, the UI elegantly skips rendering an empty "Thinking..." block and falls back to a standard answer display, which is the intended behavior. 

## Files Updated
- `app/(routes)/search/[libId]/_components/DisplaySummery.jsx`
- `app/(routes)/search/[libId]/_components/AnswerDisplay.jsx`

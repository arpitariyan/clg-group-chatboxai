# Settings Chart Redesign (v1)

## Summary
The API Usage chart in the user settings page (`ApiKeySettings.jsx`) was redesigned to feature a dynamic, interactive layout inspired by the Shadcn UI "Interactive Bar Chart".

## Changes
1. **Installed Dependencies**:
   - Added `recharts` to the project for powerful, responsive charting capabilities.
2. **Refactored `UsageChart` component**:
   - Completely replaced the basic HTML-based chart with a robust `<BarChart>` using `recharts`.
   - Adapted the user's provided design (interactive header tabs) to handle three metrics specifically suited for ChatboxAI: **Requests**, **Tokens**, and **Cost**.
   - Built a custom `Tooltip` rendering to display metrics accurately without depending strictly on external shadcn chart wrappers, preventing dependency issues and ensuring maximum compatibility.
   - Smooth transition features and updated dark mode styling to match the premium interface of ChatboxAI.

## Result
The Settings page now features a beautiful, dynamic Bar Chart where users can click tabs to visualize their API usage metrics dynamically. The implementation relies on the standard `recharts` package providing flawless UI performance.

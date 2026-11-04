# Auto-Fix System Test Plan

## Overview
The website builder now includes an intelligent auto-fix system that:
- Detects errors with rich metadata (type, suggestion)
- Auto-triggers revisions silently in the background
- Prevents infinite loops with attempt counters
- Injects error context into AI prompts for targeted fixes
- Shows user-friendly toast notifications

---

## Test Scenarios

### ✅ Test 1: Missing Context Provider Error (MISSING_PROVIDER)

**Setup**
1. Create a new website with prompt: "Create an e-commerce store with a shopping cart"
2. Watch the generation process

**Expected Flow**
1. Website generates with `useCart` hook but missing `CartProvider`
2. Preview shows error: "useCart must be used within a CartProvider"
3. Error is auto-enriched as type: `MISSING_PROVIDER`
4. Toast shows: "🔧 Detecting and fixing error (MISSING_PROVIDER). Stand by..."
5. System auto-triggers revision with error context
6. Provider is injected into App.jsx
7. Preview reloads automatically
8. Toast shows: "✅ Website updated!"
9. **No "Fix this error" button click required by user**

**Verification**
- Check browser console for: `[Auto-fix] Triggering revision for MISSING_PROVIDER`
- Confirm `autoFixState` in React DevTools shows: `{ attempts: 1, lastError: "useCart must be..." }`
- Verify revision message includes error context

---

### ✅ Test 2: Invalid Export Error (INVALID_EXPORT)

**Setup**
1. Create a website with social media icons
2. Wait for generation (AI might try to import `Google`, `Twitter`, `Instagram` from lucide-react)

**Expected Flow**
1. Build error: "The requested module does not provide export 'Google'"
2. Error auto-enriched as type: `INVALID_EXPORT`
3. Toast: "🔧 Detecting and fixing error (INVALID_EXPORT). Stand by..."
4. System triggers revision with error context
5. AI replaces invalid imports with safe alternatives:
   - `Google` → `Search`
   - `Twitter` → `MessageCircle`
   - `Instagram` → `Camera`
6. Preview reloads
7. Toast: "✅ Website updated!"

**Verification**
- Check Sidebar chat for revision message with `[ERROR CONTEXT]` header
- Verify FIX 1 (Lucide icon replacement) is applied automatically

---

### ✅ Test 3: Import Path Mismatch (IMPORT_ERROR)

**Setup**
1. Manually edit code to have wrong import casing: `import Navbar from './navbar'` (lowercase)
2. While actual file is `Navbar.jsx` (PascalCase)

**Expected Flow**
1. Module not found error appears
2. Auto-enriched as type: `IMPORT_ERROR`
3. Toast: "🔧 Detecting and fixing error (IMPORT_ERROR). Stand by..."
4. System normalizes file names and fixes imports
5. FIX 5 normalizes to PascalCase: `src/components/Navbar.jsx`
6. Imports updated to match
7. Preview reloads

**Verification**
- Check console for: `[Normalize] narbar.jsx → Navbar.jsx`

---

### ✅ Test 4: Infinite Loop Prevention

**Setup**
1. Create complex website that has recurring issues
2. Manually inject an error that system can't auto-fix:
   (Best case: a logical error that appears even after revision)

**Expected Flow**
1. First error appears → auto-fix attempt 1
2. Same error recurs → auto-fix attempt 2
3. Same error appears again → **STOP AUTO-FIXING**
4. Toast: "⚠️ Could not auto-fix. Manual fix needed."
5. Show "Fix this error" button in sidebar
6. User can now click button or provide custom instructions

**Verification**
- Check `autoFixState` shows: `{ attempts: 2, lastError: "..." }`
- Confirm effect returns early on 3rd error occurrence
- Verify button appears only after auto-fix max attempts reached

---

### ✅ Test 5: Different Errors Reset Counter

**Setup**
1. Generate website with Provider error (fails auto-fix attempt 1)
2. After max attempts, user manually fixes with custom revision
3. New error appears (different from first one)

**Expected Flow**
1. 1st error: `MISSING_PROVIDER` - auto-fix attempt 1/2
2. 2nd error: `INVALID_EXPORT` - **counter resets** to attempt 1/2
3. System tries auto-fix again for new error (different message)
4. New error gets fixed or shows button if fails twice

**Verification**
- Confirm `autoFixState.lastError` changes when error message differs
- Attempt counter resets to 1 for different error

---

### ✅ Test 6: Successful Revision Clears Error State

**Setup**
1. Generate website with error
2. Wait for auto-fix to complete successfully

**Expected Flow**
1. Error shown in sidebar
2. Auto-fix triggers and completes
3. `setDetectedError(null)` clears error state
4. `setAutoFixState({ attempts: 0, lastError: null })` resets tracker
5. Error banner disappears from sidebar
6. "Fix this error" button gone

**Verification**
- Check React DevTools: `detectedError = null`
- Check React DevTools: `autoFixState = { attempts: 0, lastError: null }`
- Error banner no longer visible in sidebar

---

### ✅ Test 7: Error Metadata in Toast & Sidebar

**Setup**
Any error scenario

**Expected Flow**
1. Toast shows: "🔧 Detecting and fixing error ([ERROR_TYPE]). Stand by..."
2. Sidebar error banner shows:
   - Full error message
   - Error type badge: "MISSING_PROVIDER" (formatted nicely)
   - "Fix this error" button (if auto-fix max reached)
3. Enriched error object with structure:
   ```js
   {
     message: "useCart must be used within a CartProvider",
     type: "MISSING_PROVIDER",
     suggestion: "Wrap the root component with required context provider"
   }
   ```

**Verification**
- Confirm toast includes error type in parentheses
- Sidebar shows error type in human-readable format
- BuilderSidebar handles both `string` and `object` error formats

---

### ✅ Test 8: Error Context in Revision API

**Setup**
1. Configure console logging
2. Trigger auto-fix scenario

**Expected Flow**
**Server logs should show:**
```
Step 4: Enhanced request includes error context:
[ERROR CONTEXT]
Error Type: MISSING_PROVIDER
Error Message: useCart must be used within a CartProvider
Please focus on fixing ONLY this error...
```

**Verification**
- Check API request body includes: `{ errorType, originalError }`
- Verify revision prompt has `[ERROR CONTEXT]` section
- Confirm AI prompt instructs: "focus on fixing ONLY this error"

---

## Browser DevTools Checks

Open React DevTools and monitor:

```js
// Builder page state
detectedError: null | { message, type, suggestion }
autoFixState: { attempts: 0-2, lastError: null | string }
isRevisionPending: boolean
project.current_code: string (updated after revision)

// WebContainerPreview component
messages on postMessage: { type: 'VITE_ERROR', error: {...enriched...} }
```

---

## Console Logs to Expect

```
[Auto-fix] Triggering revision for MISSING_PROVIDER: useCart must be...
Auto-fix max attempts reached for this error
[Task 1] ✅ Done — 5 file(s)
[Sanitize] Stripped protected file: index.html
[Normalize] Navbar.jsx already normalized
```

---

## Error Scenarios to Test

| Error | Type | Expected Fix | Status |
|-------|------|--------------|--------|
| `useCart must be used within CartProvider` | MISSING_PROVIDER | Wrap App.jsx | ✅ |
| `'Google' not found in lucide-react` | INVALID_EXPORT | Replace with 'Search' | ✅ |
| `Cannot find module './navbar'` | IMPORT_ERROR | Normalize to './Navbar' | ✅ |
| `SyntaxError: Unexpected token` | SYNTAX_ERROR | AI fixes JSX | ✅ |
| Logic errors (infinite loop, etc.) | RUNTIME_ERROR | Show manual fix button | ✅ |
| Duplicate error 3x in a row | Any | Stop auto-fix, show button | ✅ |

---

## Success Criteria

✅ **All tests pass if**:
1. Errors are detected and enriched with metadata
2. Auto-fix triggers automatically without user clicking
3. Toast notifications show error type and status
4. Infinite loop prevented after 2 attempts
5. Different errors reset counter
6. Successful revisions clear error state
7. Manual "Fix" button available when auto-fix fails
8. Preview works after auto-fix
9. No repeated error cascades
10. User experience is smooth (no manual intervention needed for common errors)

---

## Rollback Plan

If issues occur:
1. Disable auto-fix: Comment out useEffect in page.jsx (line ~353)
2. Manual mode: Users click "Fix this error" button again
3. System falls back to existing revision workflow
4. No impact to generation or existing features

---

## Known Limitations

- Complex syntax errors may still require manual intervention
- Provider detection only works for common provider patterns
- AI model quality affects fix success rate
- Network latency may cause delayed auto-fix
- User interaction (scrolling, editing) might interfere with auto-fix state

---

## Future Enhancements

1. Error analytics dashboard
2. Machine learning to predict fix success rate
3. Configurable auto-fix sensitivity
4. Error pattern learning (store common errors + solutions)
5. User opt-in/opt-out for auto-fix
6. Cache successful fixes for common error patterns

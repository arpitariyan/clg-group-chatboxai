'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { WebContainer } from '@webcontainer/api'
import { analyzeError } from '@/lib/error-analyzer'
import LoaderSteps from '@/app/_components/builder/LoaderSteps'

/**
 * TRUE SINGLETON using window object — survives React Fast Refresh and re-renders.
 * Regular module-level variables reset on Hot Module Replacement in dev mode.
 * window.__wc_* persists for the entire browser tab session.
 */
function getGlobal(key, defaultVal) {
    if (typeof window === 'undefined') return defaultVal
    if (window[key] === undefined) window[key] = defaultVal
    return window[key]
}
function setGlobal(key, val) {
    if (typeof window !== 'undefined') window[key] = val
}

// Expose emergency reset function for developer debugging
if (typeof window !== 'undefined') {
    window.__resetWebContainer = async function() {
        console.log('[WC Reset] Clearing all WebContainer state and storage...')
        
        // Try to clear storage
        try {
            await clearWebContainerStorage()
        } catch (e) {
            console.warn('[WC Reset] Storage cleanup failed:', e.message)
        }
        
        // Clear all references
        Object.keys(window).forEach(key => {
            if (key.startsWith('__wc_')) {
                try { delete window[key] } catch(e) {}
            }
        })
        
        console.log('✓ WebContainer fully reset. Refresh the page now.')
    }
    
    window.__forceKillWebContainer = async function() {
        console.log('[WC Force Kill] Attempting aggressive cleanup and storage wipe...')
        
        // Destroy instance
        if (window.__wc_instance) {
            try { 
                if (window.__wc_instance.teardown) window.__wc_instance.teardown()
            } catch(e) { console.warn('[WC] teardown failed:', e.message) }
            window.__wc_instance = null
        }
        
        // Clear all state
        window.__wc_booting = null
        window.__wc_installed_pkg = null
        window.__wc_server_url = null
        window.__wc_server_running = false
        window.__wc_launching = false
        window.__wc_boot_attempts = 0
        window.__wc_last_boot_attempt_time = 0
        window.__wc_single_instance_conflicts = 0
        
        // Aggressively clear storage
        try {
            await clearWebContainerStorage()
        } catch (e) {
            console.warn('[WC Force Kill] Storage cleanup error:', e.message)
        }
        
        // Additional nuclear option: clear all storage keys
        try {
            localStorage.clear()
            sessionStorage.clear()
            console.log('[WC Force Kill] ✓ Cleared all local/session storage')
        } catch (e) {
            console.warn('[WC Force Kill] Could not clear all storage:', e.message)
        }
        
        console.log('✓ Force kill complete. Close ALL other tabs with this project, then refresh.')
    }
}

// Helpers to read/write persistent state
const WC = {
    get instance() { return getGlobal('__wc_instance', null) },
    set instance(v) { setGlobal('__wc_instance', v) },
    get booting() { return getGlobal('__wc_booting', null) },
    set booting(v) { setGlobal('__wc_booting', v) },
    get installedPkg() { return getGlobal('__wc_installed_pkg', null) },
    set installedPkg(v) { setGlobal('__wc_installed_pkg', v) },
    get serverUrl() { return getGlobal('__wc_server_url', null) },
    set serverUrl(v) { setGlobal('__wc_server_url', v) },
    get serverRunning() { return getGlobal('__wc_server_running', false) },
    set serverRunning(v) { setGlobal('__wc_server_running', v) },
    get launching() { return getGlobal('__wc_launching', false) },
    set launching(v) { setGlobal('__wc_launching', v) },
    get bootAttempts() { return getGlobal('__wc_boot_attempts', 0) },
    set bootAttempts(v) { setGlobal('__wc_boot_attempts', v) },
    get lastBootAttemptTime() { return getGlobal('__wc_last_boot_attempt_time', 0) },
    set lastBootAttemptTime(v) { setGlobal('__wc_last_boot_attempt_time', v) },
    get singleInstanceConflictCount() { return getGlobal('__wc_single_instance_conflicts', 0) },
    set singleInstanceConflictCount(v) { setGlobal('__wc_single_instance_conflicts', v) },
}

// Clear WebContainer-related browser storage to force instance release
async function clearWebContainerStorage() {
    try {
        console.log('[WC Storage] Attempting to clear WebContainer storage...')
        
        // Clear IndexedDB (WebContainer stores instance data here)
        const dbs = await indexedDB.databases ? indexedDB.databases() : []
        for (const db of dbs) {
            if (db.name && (db.name.includes('webcontainer') || db.name.includes('idb'))) {
                try {
                    const req = indexedDB.deleteDatabase(db.name)
                    await new Promise((resolve, reject) => {
                        req.onsuccess = resolve
                        req.onerror = reject
                    })
                    console.log(`[WC Storage] Deleted IndexedDB: ${db.name}`)
                } catch (e) {
                    console.warn(`[WC Storage] Failed to delete ${db.name}:`, e.message)
                }
            }
        }
        
        // Clear localStorage keys related to WebContainer
        const keysToDelete = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('webcontainer') || key.includes('wc_') || key.includes('__wc'))) {
                keysToDelete.push(key)
            }
        }
        keysToDelete.forEach(key => {
            try {
                localStorage.removeItem(key)
                console.log(`[WC Storage] Cleared localStorage: ${key}`)
            } catch (e) {
                console.warn(`[WC Storage] Failed to clear ${key}:`, e.message)
            }
        })
        
        // Clear sessionStorage
        const sessionKeysToDelete = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && (key.includes('webcontainer') || key.includes('wc_'))) {
                sessionKeysToDelete.push(key)
            }
        }
        sessionKeysToDelete.forEach(key => {
            try {
                sessionStorage.removeItem(key)
                console.log(`[WC Storage] Cleared sessionStorage: ${key}`)
            } catch (e) {
                console.warn(`[WC Storage] Failed to clear ${key}:`, e.message)
            }
        })
        
        console.log('[WC Storage] ✓ Storage cleanup complete')
        return true
    } catch (e) {
        console.warn('[WC Storage] Cleanup error:', e.message)
        return false
    }
}

// Attempt to boot with exponential backoff for single-instance conflicts
async function bootWCWithRetry(attemptNumber = 1) {
    if (attemptNumber > 6) {
        throw new Error(
            'WebContainer boot failed after 6 attempts. ' +
            'The instance is persistently locked. ' +
            'Try: 1) Refresh page (Ctrl+R), 2) Clear all browser tabs, 3) Use incognito window, or 4) Clear browser cache (Ctrl+Shift+Delete).'
        )
    }
    
    try {
        console.log(`[WC Boot] Attempt ${attemptNumber}/6...`)
        return await WebContainer.boot()
    } catch (e) {
        const msg = String(e?.message || e)
        
        if (msg.includes('Only a single WebContainer instance')) {
            WC.singleInstanceConflictCount += 1
            const conflictCount = WC.singleInstanceConflictCount
            
            console.warn(`[WC Boot] Single instance conflict #${conflictCount}`)
            
            // On odd attempts (1, 3, 5), try to clear storage before waiting
            if (attemptNumber % 2 === 1 && attemptNumber <= 5) {
                console.log(`[WC Boot] Attempting storage cleanup before retry...`)
                await clearWebContainerStorage()
            }
            
            // Exponential backoff with longer waits
            // Attempt 1: wait 800ms
            // Attempt 2: wait 1500ms
            // Attempt 3: wait 2500ms (with storage clear)
            // Attempt 4: wait 3500ms
            // Attempt 5: wait 4500ms (with storage clear)
            // Attempt 6: fail
            const waitPeriods = [800, 1500, 2500, 3500, 4500, 5000]
            const waitTime = waitPeriods[attemptNumber - 1] || 5000
            
            console.log(`[WC Boot] Waiting ${waitTime}ms before retry #${attemptNumber + 1}...`)
            await new Promise(r => setTimeout(r, waitTime))
            
            // Retry if attempts remain
            if (attemptNumber < 6) {
                return bootWCWithRetry(attemptNumber + 1)
            } else {
                // All retries exhausted
                const fullMsg = 
                    'WebContainer is locked and cannot be released. ' +
                    'This usually means another tab/window has it open. ' +
                    'Try: closing all tabs with this project → refresh, or using an incognito window.'
                console.error('[WC Boot] ' + fullMsg)
                throw new Error(fullMsg)
            }
        }
        
        // For other boot errors, throw immediately
        throw e
    }
}

async function bootWC() {
    // If already booted successfully, return existing instance
    if (WC.instance) {
        try {
            // Verify instance is still alive by checking basic properties
            if (WC.instance.spawn && WC.instance.fs) {
                return WC.instance
            } else {
                // Instance exists but is dead — clear it
                console.warn('[WC Boot] Instance exists but is unresponsive, clearing...')
                WC.instance = null
            }
        } catch (e) {
            console.warn('[WC Boot] Existing instance check failed:', e.message)
            WC.instance = null
        }
    }

    // If currently booting, wait for that promise
    if (WC.booting) {
        try {
            return await WC.booting
        } catch (e) {
            // Previous boot failed; reset and try again
            WC.booting = null
            WC.instance = null
            throw e
        }
    }

    // Reset single instance conflict counter for a fresh boot attempt
    WC.singleInstanceConflictCount = 0

    const now = Date.now()
    const lastAttemptTime = WC.lastBootAttemptTime
    const timeSinceLastAttempt = now - lastAttemptTime
    const BOOT_RESET_WINDOW = 5 * 60 * 1000 // 5 minutes — time to reset counter
    
    // Reset attempts counter if window has passed (fresh start)
    if (timeSinceLastAttempt > BOOT_RESET_WINDOW) {
        WC.bootAttempts = 0
    }

    // Allow up to 4 top-level boot attempts (each triggers up to 6 internal retries)
    if (WC.bootAttempts >= 4) {
        const lastAttemptMinutesAgo = Math.floor(timeSinceLastAttempt / 1000 / 60)
        const errMsg = `WebContainer boot blocked after multiple attempts (last try: ${lastAttemptMinutesAgo}m ago). ` +
            `Close ALL browser tabs with this project, then try refreshing. ` +
            `If stuck, open console and run: window.__forceKillWebContainer()`
        console.error('[WC Boot Critical]', errMsg)
        throw new Error(errMsg)
    }

    WC.lastBootAttemptTime = now
    WC.bootAttempts += 1

    const p = bootWCWithRetry(1)
        .then(i => {
            console.log('[WC Boot] ✓ Success after retries')
            WC.instance = i
            WC.booting = null
            WC.bootAttempts = 0 // Reset on success
            WC.lastBootAttemptTime = 0
            WC.singleInstanceConflictCount = 0
            return i
        })
        .catch(e => {
            WC.booting = null
            WC.instance = null
            
            const msg = String(e?.message || e)
            console.error(`[WC Boot] ✗ Boot failed`, msg)
            
            // Wrap the error with helpful diagnostics
            const diagnosticError = new Error(msg)
            diagnosticError.isWebContainerError = true
            throw diagnosticError
        })

    WC.booting = p
    return p
}

function toFS(files) {
    const r = {}
    for (const [filePath, content] of Object.entries(files)) {
        const parts = filePath.split('/')
        let cur = r
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = { directory: {} }
            cur = cur[parts[i]].directory
        }
        cur[parts[parts.length - 1]] = {
            file: { contents: typeof content === 'string' ? content : String(content ?? '') }
        }
    }
    return r
}

function getPkgDepsHash(pkgJsonStr) {
    try {
        const p = JSON.parse(pkgJsonStr)
        const deps = { ...p.dependencies, ...p.devDependencies }
        return JSON.stringify(Object.keys(deps).sort().map(k => `${k}@${deps[k]}`))
    } catch { return pkgJsonStr }
}

export default function WebContainerPreview({ files, isGenerating, isRevisionPending, device, onError, validationStatus }) {
    const iframeRef = useRef(null)
    const lastPostedErrorRef = useRef({ fingerprint: '', ts: 0 })
    const [status, setStatus] = useState(() => {
        if (WC.serverRunning && WC.serverUrl) return 'ready'
        return 'idle'
    })
    const [errorMsg, setErrorMsg] = useState('')

    const launch = useCallback(async (fileMap) => {
        if (WC.launching) return
        WC.launching = true

        try {
            setErrorMsg('')
            const wc = await bootWC()
            const pkgStr = fileMap['package.json'] || ''
            const newHash = getPkgDepsHash(pkgStr)
            const oldHash = WC.installedPkg ? getPkgDepsHash(WC.installedPkg) : null
            const needsInstall = newHash !== oldHash

            if (needsInstall) {
                setStatus('installing')
                // Mount ALL files including package.json
                await wc.mount(toFS(fileMap))

                const runInstall = async (args) => {
                    const proc = await wc.spawn('npm', args)
                    let outputBuffer = ''

                    // MUST drain output or process hangs
                    proc.output.pipeTo(new WritableStream({
                        write(chunk) {
                            const text = typeof chunk === 'string'
                                ? chunk
                                : (() => { try { return new TextDecoder().decode(chunk) } catch { return '' } })()
                            outputBuffer += text
                            if (outputBuffer.length > 12000) outputBuffer = outputBuffer.slice(-12000)
                        }
                    }))

                    const code = await proc.exit
                    return { code, output: outputBuffer }
                }

                // First attempt: faster install flags
                let installResult = await runInstall(['install', '--no-audit', '--no-fund'])

                // Retry with legacy peer deps for dependency resolution conflicts
                if (installResult.code !== 0) {
                    installResult = await runInstall(['install', '--legacy-peer-deps', '--no-audit', '--no-fund'])
                }

                if (installResult.code !== 0) {
                    const excerpt = (installResult.output || '').trim().split('\n').slice(-20).join('\n')
                    throw new Error(`npm install failed (exit ${installResult.code})\n${excerpt}`)
                }

                WC.installedPkg = pkgStr
                WC.serverRunning = false // Force dev server restart after new install
            } else {
                // Same deps — just update src files
                setStatus('starting')
                const srcFiles = Object.fromEntries(
                    Object.entries(fileMap).filter(([k]) => k.startsWith('src/'))
                )
                if (Object.keys(srcFiles).length > 0) {
                    await wc.mount(toFS(srcFiles))
                }
            }

            if (!WC.serverRunning) {
                setStatus('starting')
                // Mount everything if we only mounted src above
                if (WC.installedPkg && getPkgDepsHash(WC.installedPkg) === getPkgDepsHash(pkgStr)) {
                    // Mount non-src config files too
                    const configFiles = Object.fromEntries(
                        Object.entries(fileMap).filter(([k]) => !k.startsWith('src/'))
                    )
                    await wc.mount(toFS(configFiles))
                }

                const dev = await wc.spawn('npm', ['run', 'dev'])

                let terminalBuffer = ''
                
                // Scan Vite stdout for the local URL and Fatal Errors
                dev.output.pipeTo(new WritableStream({
                    write(chunk) {
                        const text = typeof chunk === 'string'
                            ? chunk
                            : (() => { try { return new TextDecoder().decode(chunk) } catch { return '' } })()
                            
                        terminalBuffer += text
                        if (terminalBuffer.length > 10000) terminalBuffer = terminalBuffer.slice(-10000)

                        // 1. Match any localhost URL Vite prints
                        const m = terminalBuffer.match(/http:\/\/localhost:(\d{2,5})/)
                        if (m && !WC.serverRunning) {
                            WC.serverUrl = `http://localhost:${m[1]}`
                        }

                        // 2. Catch fatal terminal build errors
                        // We use terminalBuffer because text chunks might be split mid-word
                        const errPattern = /(?:Error:|✘ \[ERROR\]|Internal server error:|SyntaxError:|\[plugin:[^\]]+\])\s+([\s\S]{1,400})/
                        const errorMatch = terminalBuffer.match(errPattern)
                        
                        if (errorMatch) {
                            // Strip terminal ansi color codes
                            const cleanError = errorMatch[0].replace(/\u001b\[[0-9;]*m/g, '').trim()
                            
                            // Prevent endless firing for the same error
                            terminalBuffer = ''
                            
                            // Send raw error string first (will be enriched on receiver side)
                            const fingerprint = `VITE_ERROR:${cleanError.slice(0, 240)}`
                            const now = Date.now()
                            const last = lastPostedErrorRef.current

                            if (last.fingerprint === fingerprint && now - last.ts < 5000) {
                                return
                            }
                            lastPostedErrorRef.current = { fingerprint, ts: now }
                            
                            // Send to React UI so the user sees the "Fix this error" button
                            if (window.parent) {
                                window.parent.postMessage({
                                    type: 'VITE_ERROR',
                                    error: cleanError
                                }, '*');
                            }
                        }
                    }
                }))

                // Timeout guard — if server-ready never fires after 45s, report real timeout rather than fake success
                let bootTimeoutId = setTimeout(() => {
                    if (!WC.serverRunning && !WC.serverUrl) {
                        WC.serverRunning = false
                        WC.launching = false
                        setStatus('error')
                        setErrorMsg('WebContainer dev server startup timed out. Click Retry to restart the preview container.')
                    }
                }, 45000)

                // PRIMARY: server-ready gives the REAL WebContainer URL
                // This URL is NOT localhost:3000 — it's a special proxy URL
                wc.on('server-ready', (port, url) => {
                    if (bootTimeoutId) {
                        clearTimeout(bootTimeoutId)
                        bootTimeoutId = null
                    }
                    WC.serverUrl = url
                    WC.serverRunning = true
                    WC.launching = false
                    setStatus('ready')
                    if (iframeRef.current) {
                        iframeRef.current.src = url
                    }
                })

            } else {
                // Server already running, verify valid URL before setting ready
                WC.launching = false
                if (WC.serverUrl) {
                    setStatus('ready')
                    if (iframeRef.current) {
                        iframeRef.current.src = WC.serverUrl
                    }
                } else {
                    // Stale state: flagged running without URL -> perform fresh launch
                    WC.serverRunning = false
                    setStatus('loading')
                    return launch(filesObj)
                }
            }

        } catch (e) {
            console.error('[WC Launch Error]', e)
            WC.launching = false
            WC.booting = null
            setStatus('error')
            
            const errMsg = String(e?.message || e)
            let displayMsg = errMsg
            
            // Smartly handle different boot/startup failures
            if (errMsg.includes('locked') || errMsg.includes('persistently')) {
                displayMsg = '🔒 WebContainer instance is locked. Try these steps:\n' +
                    '1. Close ALL other browser tabs with this project\n' +
                    '2. Refresh this page (Ctrl+R)\n' +
                    '3. If still stuck, open DevTools (F12) Console and run: window.__forceKillWebContainer()\n' +
                    '4. Close all tabs, then reload\n' +
                    '5. Last resort: Use an incognito window'
            } else if (errMsg.includes('after 6 attempts')) {
                displayMsg = '❌ WebContainer failed to initialize after 6 retries.\n' +
                    'The instance is stuck and won\'t release. Try:\n' +
                    '1. Refreshing the page\n' +
                    '2. Closing all tabs with this project\n' +
                    '3. Using an incognito/private window'
            } else if (errMsg.includes('already running') || errMsg.includes('single instance')) {
                displayMsg = '⚠️ WebContainer instance already exists. ' +
                    'Close ALL other browser tabs with this project, then refresh. ' +
                    'If problem persists, try an incognito/private window.'
            } else if (errMsg.includes('running in another tab')) {
                displayMsg = '⚠️ WebContainer is running in another browser tab. ' +
                    'Close all other tabs with this project, then refresh this page.'
            } else if (errMsg.includes('boot failed') || errMsg.includes('WebContainer.boot') || errMsg.includes('failed after')) {
                displayMsg = '❌ WebContainer failed to start. ' +
                    'Try refreshing the page (Ctrl+R), clearing cache (Ctrl+Shift+Delete), or using an incognito window.'
            } else if (errMsg.includes('npm install failed')) {
                displayMsg = '⚠️ Package installation failed. Check package.json for invalid dependencies.'
            } else if (errMsg.includes('ENOENT') || errMsg.includes('file not found')) {
                displayMsg = '❌ Referenced file not found. Verify all imports and file paths are correct.'
            } else if (errMsg.includes('SyntaxError') || errMsg.includes('Parse error')) {
                displayMsg = '❌ Syntax error in generated code. Fix JSX/JavaScript syntax issues.'
            } else {
                displayMsg = errMsg || 'Preview failed'
            }
            
            setErrorMsg(displayMsg)
        }
    }, [])

    useEffect(() => {
        if (!files || isGenerating || isRevisionPending) return

        let parsed
        try {
            parsed = typeof files === 'string' ? JSON.parse(files) : files
        } catch (e) {
            setStatus('error')
            setErrorMsg('Cannot parse project files')
            return
        }

        if (!parsed || typeof parsed !== 'object' || !Object.keys(parsed).length) return
        if (!parsed['package.json']) {
            setStatus('error')
            setErrorMsg('Project missing package.json — generation incomplete')
            return
        }

        // --- INJECT VITE ERROR CATCHER + CONSOLE INTERCEPTOR ---
        // We cannot inject directly via iframe.contentDocument due to cross-origin rules.
        // Instead, we inject it directly into index.html before sending to WebContainer.
        if (parsed['index.html'] && typeof parsed['index.html'] === 'string') {
            if (!parsed['index.html'].includes('window.parent.postMessage')) {
                const errorScript = `
<script>
    (function() {
        const sentErrors = new Set();
        
        // Filter out non-critical console messages
        function isCritical(msg) {
            if (!msg) return false;
            const lower = String(msg).toLowerCase();
            // Skip non-critical warnings
            if (lower.includes('autoclicker')) return false;
            if (lower.includes('preload') && lower.includes('not used')) return false;
            if (lower.includes('resizeobserver')) return false;
            if (lower.includes('fast refresh')) return false;
            // Skip React Router v7 migration warnings (not real errors)
            if (lower.includes('react router') && lower.includes('future flag')) return false;
            if (lower.includes('v7_starttransition')) return false;
            // Skip other router/navigation warnings
            if (lower.includes('router will begin wrapping')) return false;
            // Include everything else
            return true;
        }
        
        // Store original methods
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalFetch = window.fetch;
        
        // Helper to send error only once
        function sendUnique(data) {
            const key = JSON.stringify(data);
            if (!sentErrors.has(key)) {
                sentErrors.add(key);
                window.parent?.postMessage(data, '*');
            }
        }
        
        window.addEventListener('vite:error', (e) => {
            const msg = e.detail?.message || e.detail?.err?.message || 'Unknown Vite error';
            if (isCritical(msg)) {
                sendUnique({
                    type: 'VITE_ERROR',
                    error: msg
                });
            }
        });
        
        // Global error handler (catches uncaught exceptions)
        window.addEventListener('error', (e) => {
            if (isCritical(e.message)) {
                const errorMsg = (e.message || 'Error') + (e.filename ? ' in ' + e.filename.split('/').pop() : '');
                sendUnique({
                    type: 'VITE_ERROR',
                    error: errorMsg
                });
                window.parent?.postMessage({
                    type: 'CONSOLE_MESSAGE',
                    severity: 'error',
                    message: errorMsg,
                    timestamp: Date.now()
                }, '*');
            }
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            const msg = 'Unhandled promise rejection: ' + ((e.reason && e.reason.message) ? e.reason.message : e.reason);
            if (isCritical(msg)) {
                sendUnique({
                    type: 'VITE_ERROR',
                    error: msg
                });
            }
        });
        
        // Intercept fetch to catch network errors (404, 500, etc)
        window.fetch = function(...args) {
            return originalFetch.apply(this, args)
                .then(response => {
                    if (!response.ok && response.status >= 400) {
                        const errorMsg = 'HTTP \${response.status} error fetching \${response.url || args[0]}';
                        if (isCritical(errorMsg)) {
                            window.parent?.postMessage({
                                type: 'CONSOLE_MESSAGE',
                                severity: 'error',
                                message: errorMsg,
                                timestamp: Date.now()
                            }, '*');
                        }
                    }
                    return response;
                })
                .catch(err => {
                    const errorMsg = 'Network error: ' + (err.message || String(err));
                    if (isCritical(errorMsg)) {
                        window.parent?.postMessage({
                            type: 'CONSOLE_MESSAGE',
                            severity: 'error',
                            message: errorMsg,
                            timestamp: Date.now()
                        }, '*');
                    }
                    throw err;
                });
        };
        
        // Intercept console.error
        console.error = function(...args) {
            originalError.apply(console, args);
            try {
                const msg = args.map(a => {
                    if (typeof a === 'string') return a;
                    if (a && typeof a === 'object') {
                        // Properly extract error message from error objects
                        return a.message || a.error || a.err || String(a);
                    }
                    return String(a || '');
                }).filter(s => s && s !== '[object Object]').join(' | ');
                
                if (isCritical(msg)) {
                    // Send as VITE_ERROR if it looks serious
                    if (msg.includes('Error:') || msg.includes('500') || msg.includes('404')) {
                        window.parent?.postMessage({ type: 'VITE_ERROR', error: msg.substring(0, 300) }, '*');
                    }
                    // Always send to console panel
                    window.parent?.postMessage({
                        type: 'CONSOLE_MESSAGE',
                        severity: 'error',
                        message: msg.substring(0, 500),
                        timestamp: Date.now()
                    }, '*');
                }
            } catch(e) {}
        };
        
        // Intercept console.warn
        console.warn = function(...args) {
            originalWarn.apply(console, args);
            try {
                const msg = args.map(a => {
                    if (typeof a === 'string') return a;
                    if (a && typeof a === 'object') {
                        return a.message || a.error || a.err || String(a);
                    }
                    return String(a || '');
                }).filter(s => s && s !== '[object Object]').join(' | ');
                
                if (isCritical(msg) && msg.trim()) {
                    window.parent?.postMessage({
                        type: 'CONSOLE_MESSAGE',
                        severity: 'warning',
                        message: msg.substring(0, 500),
                        timestamp: Date.now()
                    }, '*');
                }
            } catch(e) {}
        };
        
        // Intercept console.log (only important ones)
        console.log = function(...args) {
            originalLog.apply(console, args);
            try {
                const logStr = args.map(a => {
                    if (typeof a === 'string') return a;
                    if (a && typeof a === 'object') {
                        return a.message || a.error || a.err || String(a);
                    }
                    return String(a || '');
                }).filter(s => s && s !== '[object Object]').join(' ');
                
                if (isCritical(logStr) && (logStr.includes('ERROR') || logStr.includes('error') || logStr.includes('Failed'))) {
                    window.parent?.postMessage({
                        type: 'CONSOLE_MESSAGE',
                        severity: 'log',
                        message: logStr.substring(0, 500),
                        timestamp: Date.now()
                    }, '*');
                }
            } catch(e) {}
        };
        
        // Signal ready
        window.parent?.postMessage({
            type: 'ERROR_INTERCEPTOR_READY',
            timestamp: Date.now()
        }, '*');
    })();
</script>
</head>`;
                parsed = { ...parsed, 'index.html': parsed['index.html'].replace('</head>', errorScript) };
            }
        }

        // If server running and same deps — just hot-update src files
        if (WC.serverRunning && WC.instance) {
            const newHash = getPkgDepsHash(parsed['package.json'])
            const oldHash = WC.installedPkg ? getPkgDepsHash(WC.installedPkg) : null

            if (newHash === oldHash) {
                // Hot update all non-package.json files (src, public, configs)
                const updateFiles = Object.fromEntries(
                    Object.entries(parsed).filter(([k]) => k !== 'package.json')
                )
                WC.instance.mount(toFS(updateFiles)).catch(console.warn)
                setStatus('ready')
                if (iframeRef.current && WC.serverUrl) {
                    iframeRef.current.src = WC.serverUrl
                }
                return
            }
            // Deps changed — need reinstall
            WC.serverRunning = false
        }

        WC.launching = false // Reset so launch() can proceed
        launch(parsed)
    }, [files, isGenerating, isRevisionPending, launch])

    // Restore iframe on tab switch (Code -> Preview)
    useEffect(() => {
        if (status === 'ready' && iframeRef.current && WC.serverUrl) {
            iframeRef.current.src = WC.serverUrl
        }
    }, [status])

    // Detect Vite error overlay in iframe
    useEffect(() => {
        if (status !== 'ready' || !iframeRef.current) return
        
        const iframe = iframeRef.current
        
        const handleIframeLoad = () => {
            try {
                // Inject error detection script into iframe
                const script = iframe.contentDocument?.createElement('script')
                if (!script) return
                script.textContent = `
                    // Listen for Vite HMR error events
                    window.addEventListener('vite:error', (e) => {
                        window.parent.postMessage({
                            type: 'VITE_ERROR',
                            error: e.detail?.message || e.detail?.err?.message || 'Unknown error'
                        }, '*')
                    })
                    // Also catch unhandled errors
                    window.addEventListener('error', (e) => {
                        if (e.message && !e.message.includes('ResizeObserver')) {
                            window.parent.postMessage({
                                type: 'VITE_ERROR', 
                                error: e.message + (e.filename ? ' in ' + e.filename.split('/').pop() : '')
                            }, '*')
                        }
                    })
                `
                iframe.contentDocument?.head?.appendChild(script)
            } catch(e) {
                // Cross-origin — can't inject, use postMessage listener only
            }
        }
        
        iframe.addEventListener('load', handleIframeLoad)
        return () => iframe.removeEventListener('load', handleIframeLoad)
    }, [status])

    // Classify and enrich error information for better auto-fix handling
    const enrichError = useCallback((errorText) => {
        if (!errorText) return { message: 'Unknown error', type: 'UNKNOWN', severity: 'error', suggestion: 'Check browser console for details' }
        
        // Handle case where function receives an object instead of string
        let originalText = ''
        if (typeof errorText === 'string') {
            originalText = errorText
        } else if (typeof errorText === 'object' && errorText.message) {
            originalText = String(errorText.message)
        } else if (typeof errorText === 'object') {
            originalText = String(Object.values(errorText).find(v => typeof v === 'string') || errorText)
        } else {
            originalText = String(errorText)
        }

        // Prevent [object Object] from being shown
        if (originalText === '[object Object]') {
            return { message: 'Unreadable error object', type: 'UNKNOWN', severity: 'error', suggestion: 'Check browser console for details' }
        }
        
        const text = originalText.toLowerCase()
        
        // Provider errors (useCart, useTheme, etc.)
        if (text.includes('must be used within') || text.includes('usecart') || text.includes('hook') || text.includes('provider')) {
            return { 
                message: originalText, 
                type: 'MISSING_PROVIDER',
                severity: 'error',
                suggestion: 'Wrap the root component with the required context provider'
            }
        }
        
        // Invalid export errors (lucide icons, etc.)
        if (text.includes('does not provide an export named') || text.includes('lucide')) {
            return { 
                message: originalText, 
                type: 'INVALID_EXPORT',
                severity: 'error',
                suggestion: 'Use a valid export or import from a different library'
            }
        }
        
        // Import path errors
        if (text.includes('module not found') || text.includes('cannot find module') || text.includes('file not found') || text.includes('enoent')) {
            return { 
                message: originalText, 
                type: 'IMPORT_ERROR',
                severity: 'error',
                suggestion: 'Verify all file paths and imports are correct'
            }
        }
        
        // Syntax errors
        if (text.includes('syntax error') || text.includes('unexpected token') || text.includes('parse error')) {
            return { 
                message: originalText, 
                type: 'SYNTAX_ERROR',
                severity: 'error',
                suggestion: 'Fix JSX/JavaScript syntax errors in your code'
            }
        }
        
        // Missing dependency
        if (text.includes('is not defined') || text.includes('undefined is not') || text.includes('cannot read property')) {
            return { 
                message: originalText, 
                type: 'REFERENCE_ERROR',
                severity: 'error',
                suggestion: 'Ensure all variables and functions are properly defined and imported'
            }
        }
        
        // Generic runtime errors — don't auto-fix
        return { 
            message: originalText, 
            type: 'RUNTIME_ERROR',
            severity: 'error',
            suggestion: 'Open browser DevTools (F12) → Console tab to see the exact error and debug'
        }
    }, [])

    // Listen for VITE_ERROR from iframe
    useEffect(() => {
        const handleMessage = (event) => {
            // Validate event source originates from our preview iframe
            if (iframeRef.current?.contentWindow && event.source && event.source !== iframeRef.current.contentWindow) {
                return;
            }

            if (event.data?.type === 'VITE_ERROR') {
                const errorText = event.data.error || 'Code error in generated website'
                const enrichedError = enrichError(errorText)
                const fingerprint = `${enrichedError?.type || 'UNKNOWN'}:${String(enrichedError?.message || '').slice(0, 240)}`
                const now = Date.now()
                const last = lastPostedErrorRef.current

                if (last.fingerprint === fingerprint && now - last.ts < 5000) {
                    return
                }
                lastPostedErrorRef.current = { fingerprint, ts: now }

                if (onError) onError(enrichedError)
            } else if (event.data?.type === 'CONSOLE_MESSAGE') {
                // Handle console messages from iframe
                const { severity, message, timestamp } = event.data
                const analyzed = analyzeError(message, '')
                
                const consoleError = {
                    type: analyzed.errorType,
                    message: message || 'Console message',
                    severity: severity || 'log',
                    timestamp: timestamp || Date.now(),
                    isAutoFixable: analyzed.autoFixable,
                    fixSuggestion: analyzed.fixSuggestion,
                }
                
                // Deduplicate using same fingerprint logic
                const fingerprint = `${consoleError.type}:${String(consoleError.message).slice(0, 240)}`
                const now = Date.now()
                const last = lastPostedErrorRef.current

                // Only pass significant errors (not logs), and avoid duplicates within 5s
                if (severity !== 'log' && (last.fingerprint !== fingerprint || now - last.ts >= 5000)) {
                    lastPostedErrorRef.current = { fingerprint, ts: now }
                    if (onError) onError(consoleError)
                }
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [onError, enrichError])

    const handleRetry = useCallback(() => {
        // Full reset of WebContainer state and boot attempts
        WC.instance = null
        WC.booting = null
        WC.installedPkg = null
        WC.serverUrl = null
        WC.serverRunning = false
        WC.launching = false
        WC.bootAttempts = 0 // Reset boot attempt counter using new property
        WC.lastBootAttemptTime = 0
        setStatus('idle')
        setErrorMsg('')
        if (files) {
            try {
                const p = typeof files === 'string' ? JSON.parse(files) : files
                if (p?.['package.json']) setTimeout(() => launch(p), 300)
            } catch {}
        }
    }, [files, launch])

    const deviceClass = device === 'phone'
        ? 'max-w-93.75 h-166.75 mx-auto'
        : device === 'tablet'
        ? 'max-w-192 h-256 mx-auto'
        : 'w-full h-full'

    if (isGenerating || isRevisionPending) {
        return (
            <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden">
                <LoaderSteps mode={isRevisionPending ? 'update' : 'create'} />
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-center p-8">
                <div>
                    <p className="text-red-400 font-medium mb-3">Preview failed</p>
                    <p className="text-gray-400 text-sm mb-6 max-w-sm">{errorMsg}</p>
                    <button onClick={handleRetry}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col bg-gray-900 p-2 md:p-4 relative">
            {/* Validation Status Badge - Enhanced */}
            {validationStatus && status === 'ready' && (
                <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700">
                    <div className="flex items-center gap-3">
                        {validationStatus === 'validating' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-blue-300">Validating code...</span>
                                </div>
                            </>
                        )}
                        {validationStatus === 'fixing' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-amber-300">Auto-fixing errors...</span>
                                </div>
                            </>
                        )}
                        {validationStatus === 'valid' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-sm font-medium text-green-300">Code validation passed</span>
                                </div>
                            </>
                        )}
                        {validationStatus === 'has-errors' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400">⚠</span>
                                    <span className="text-sm font-medium text-red-300">Errors detected</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main preview area */}
            <div className="flex-1 flex items-center justify-center relative">
                {status !== 'ready' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 gap-4">
                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center">
                            <p className="text-white text-sm font-medium">
                                {status === 'idle' && 'Preparing preview...'}
                                {status === 'booting' && 'Starting environment...'}
                                {status === 'installing' && 'Installing packages...'}
                                {status === 'starting' && 'Starting dev server...'}
                            </p>
                            <p className="text-gray-500 text-xs mt-1.5">
                                {status === 'installing'
                                    ? 'First time only — cached after this'
                                    : '~30 seconds on first load'}
                            </p>
                        </div>
                    </div>
                )}
                <div
                    className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-opacity duration-500 w-full h-full ${deviceClass}`}
                    style={{ opacity: status === 'ready' ? 1 : 0 }}
                >
                    <iframe
                        ref={iframeRef}
                        title="Generated Website Preview"
                        className="w-full h-full border-none"
                        allow="cross-origin-isolated"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>
            </div>
        </div>
    )
}

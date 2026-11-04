import Sandbox from '@e2b/code-interpreter';
import path from 'path';

/**
 * e2b Sandbox Manager
 * 
 * Manages the lifecycle of e2b Code Interpreter sandboxes for website projects.
 * One sandbox per project, persistent across code edits.
 */

const PROJECT_ROOT = '/home/user/project';

// Helper to normalize paths for e2b
export function toProjectPath(p) {
    const normalized = p.replace(/\\\\/g, '/').trim();
    if (normalized.startsWith('/')) return normalized;
    return path.posix.join(PROJECT_ROOT, normalized);
}

/**
 * Connect to existing sandbox
 * @param {string} sandboxId - e2b sandbox ID
 * @returns {Promise<Sandbox>}
 */
export async function connectSandbox(sandboxId) {
    try {
        console.log(`[e2b] Connecting to sandbox: ${sandboxId}`);
        const sandbox = await Sandbox.connect(sandboxId);
        console.log(`[e2b] Connected to sandbox: ${sandboxId}`);
        return sandbox;
    } catch (error) {
        console.error(`[e2b] Failed to connect to sandbox ${sandboxId}:`, error.message);
        throw new Error(`Failed to connect to sandbox: ${error.message}`);
    }
}

/**
 * Create a new sandbox from e2b template
 * @param {object} options - Configuration options
 * @returns {Promise<Sandbox>}
 */
export async function createSandbox(options = {}) {
    try {
        console.log('[e2b] Creating new sandbox...');
        
        // Create sandbox from default e2b template
        // e2b provides standard environment (Node.js, npm, etc.)
        const sandbox = await Sandbox.create({
            timeout: options.timeout || 60 * 1000 // 60s default
        });
        
        console.log(`[e2b] Created sandbox: ${sandbox.sandboxId}`);
        return sandbox;
    } catch (error) {
        console.error('[e2b] Failed to create sandbox:', error.message);
        throw new Error(`Failed to create sandbox: ${error.message}`);
    }
}

/**
 * Get or create sandbox for a project
 * @param {string} projectId - Project ID
 * @param {string | null} existingSandboxId - Existing sandbox ID if any
 * @returns {Promise<{sandbox: Sandbox, sandboxId: string, isNew: boolean}>}
 */
export async function getOrCreateSandbox(projectId, existingSandboxId = null) {
    try {
        // Try to reuse existing sandbox
        if (existingSandboxId) {
            try {
                console.log(`[e2b] Attempting to reuse sandbox: ${existingSandboxId}`);
                const sandbox = await connectSandbox(existingSandboxId);
                console.log(`[e2b] Reusing sandbox: ${existingSandboxId}`);
                return { sandbox, sandboxId: existingSandboxId, isNew: false };
            } catch (reuseError) {
                console.warn(`[e2b] Could not reuse sandbox ${existingSandboxId}, creating new one:`, reuseError.message);
            }
        }

        // Create new sandbox
        const sandbox = await createSandbox();
        console.log(`[e2b] Created new sandbox for project ${projectId}: ${sandbox.sandboxId}`);
        
        return { sandbox, sandboxId: sandbox.sandboxId, isNew: true };
    } catch (error) {
        console.error(`[e2b] Failed to get or create sandbox for ${projectId}:`, error.message);
        throw error;
    }
}

/**
 * Write files to sandbox filesystem
 * @param {Sandbox} sandbox - e2b sandbox instance
 * @param {object} files - Map of path -> content
 * @param {string} baseDir - Base directory in sandbox
 */
export async function writeFilesToSandbox(sandbox, files, baseDir = PROJECT_ROOT) {
    try {
        console.log(`[e2b] Writing ${Object.keys(files).length} files to sandbox...`);
        
        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.posix.join(baseDir, filePath);
            const dirPath = path.posix.dirname(fullPath);
            
            // Ensure directory exists
            try {
                await sandbox.execRaw({
                    command: `mkdir -p "${dirPath}"`
                });
            } catch { /* directory might exist */ }
            
            // Write file
            try {
                await sandbox.writeFile(fullPath, content);
            } catch (writeError) {
                console.warn(`[e2b] Warning: failed to write ${filePath}:`, writeError.message);
                // Continue with other files
            }
        }
        
        console.log('[e2b] Files written successfully');
        return true;
    } catch (error) {
        console.error('[e2b] Failed to write files:', error.message);
        throw error;
    }
}

/**
 * Execute command in sandbox
 * @param {Sandbox} sandbox - e2b sandbox instance
 * @param {string} command - Shell command to execute
 * @param {object} options - Execution options
 */
export async function executeSandboxCommand(sandbox, command, options = {}) {
    try {
        const timeout = options.timeout || 30 * 1000; // 30s default
        
        console.log(`[e2b] Executing: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
        
        const result = await Promise.race([
            sandbox.execRaw({ command }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), timeout)
            )
        ]);
        
        if (result.error) {
            console.error(`[e2b] Command error:`, result.error);
            throw new Error(`Command failed: ${result.error}`);
        }
        
        console.log(`[e2b] Command succeeded`);
        return result;
    } catch (error) {
        console.error(`[e2b] Execution failed:`, error.message);
        throw error;
    }
}

/**
 * Start development server in sandbox
 * @param {Sandbox} sandbox - e2b sandbox instance
 * @param {number} port - Port to expose
 * @param {string} workDir - Working directory
 */
export async function startDevServer(sandbox, port = 5173, workDir = PROJECT_ROOT) {
    try {
        console.log(`[e2b] Starting dev server on port ${port}...`);
        
        // Install dependencies — increased to 120s (from 60s) for React + Tailwind + Framer Motion
        console.log('[e2b] Installing dependencies...');
        await executeSandboxCommand(sandbox, `cd "${workDir}" && npm install`, { timeout: 120 * 1000 });
        
        // Start dev server (non-blocking, runs in background)
        console.log('[e2b] Launching dev server...');
        // Note: We don't await this, as it's a long-running process
        // The sandbox automatically exposes the port
        sandbox.execRaw({
            command: `cd "${workDir}" && npm run dev`
        }).catch(err => console.warn('[e2b] Dev server error:', err.message));
        
        // Give server time to start
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('[e2b] Dev server started');
        return { port, url: `http://localhost:${port}` };
    } catch (error) {
        console.error('[e2b] Failed to start dev server:', error.message);
        throw error;
    }
}

/**
 * Get sandbox URL for iframe access using the e2b Relay.
 * In production, e2b Relay exposes sandboxes at:
 *   https://{sandboxId}-{port}.e2b.app
 *
 * FIX #3: Was returning hardcoded 'http://localhost:{port}' which only works
 * on the machine running the sandbox, never in a deployed/production environment.
 */
export async function getSandboxURL(sandbox, port = 5173) {
    try {
        const sandboxId = sandbox?.sandboxId;
        if (!sandboxId) {
            throw new Error('Cannot get sandbox URL: sandboxId is missing');
        }
        
        // e2b Relay URL format: https://{sandboxId}-{port}.e2b.app
        // This is the correct production URL that works from any client browser.
        const relayUrl = `https://${sandboxId}-${port}.e2b.app`;
        console.log(`[e2b] Relay URL: ${relayUrl}`);
        return relayUrl;
    } catch (error) {
        console.error('[e2b] Failed to get sandbox URL:', error.message);
        throw error;
    }
}

/**
 * Clean up and destroy sandbox
 * @param {Sandbox} sandbox - e2b sandbox instance
 */
export async function destroySandbox(sandbox) {
    try {
        if (!sandbox || !sandbox.sandboxId) {
            console.warn('[e2b] Invalid sandbox for destruction');
            return;
        }
        
        console.log(`[e2b] Destroying sandbox: ${sandbox.sandboxId}`);
        
        // Close sandbox and release resources
        if (typeof sandbox.close === 'function') {
            await sandbox.close();
        } else if (typeof sandbox.kill === 'function') {
            await sandbox.kill();
        }
        
        console.log(`[e2b] Sandbox destroyed: ${sandbox.sandboxId}`);
    } catch (error) {
        console.warn(`[e2b] Error destroying sandbox:`, error.message);
        // Don't throw - best effort cleanup
    }
}

/**
 * Check if sandbox is alive
 * @param {Sandbox} sandbox - e2b sandbox instance
 */
export async function isSandboxAlive(sandbox) {
    try {
        if (!sandbox || !sandbox.sandboxId) return false;
        
        // Try to execute a simple command
        const result = await executeSandboxCommand(sandbox, 'echo alive', { timeout: 5000 });
        return !!result;
    } catch {
        return false;
    }
}

'use client';

import { Loader2, Unplug, ExternalLink, Layers } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * OAuth connect/disconnect UI for Figma.
 * Shows a connect prompt when not connected, or disconnect option when connected.
 */
export default function FigmaConnectionPanel({
  isConnected,
  connectionLoading,
  onConnect,
  onDisconnect,
  loadingStates = {},
}) {
  const isConnecting = loadingStates.connect;
  const isDisconnecting = loadingStates.disconnect;

  if (isConnected) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Figma Connected
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          {isDisconnecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Unplug className="w-3.5 h-3.5 mr-1" />
          )}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-3 border border-violet-200 dark:border-violet-700">
          <Layers className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <CardTitle className="text-lg">Connect Figma</CardTitle>
        <CardDescription>
          Connect your Figma account to convert designs to code, generate diagrams, extract design systems, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          onClick={onConnect}
          disabled={isConnecting || connectionLoading}
          className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          {isConnecting ? 'Connecting...' : 'Connect Figma Account'}
        </Button>
      </CardContent>
    </Card>
  );
}

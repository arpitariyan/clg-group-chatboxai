'use client';

import { useEffect, useState } from 'react';
import { Layers, AlertCircle } from '@/components/ui/animated-icon';
import AuthGuard from '@/app/_components/AuthGuard';
import { FigmaProvider } from '@/contexts/FigmaContext';
import { useFigmaIntegration } from '@/hooks/useFigmaIntegration';

import FigmaConnectionPanel from './_components/FigmaConnectionPanel';
import FigmaFileBrowser from './_components/FigmaFileBrowser';
import FigmaPreview from './_components/FigmaPreview';
import FigmaActionBar from './_components/FigmaActionBar';
import CodeOutputPanel from './_components/CodeOutputPanel';
import DiagramCanvas from './_components/DiagramCanvas';
import DesignTokensPanel from './_components/DesignTokensPanel';
import AssetExportPanel from './_components/AssetExportPanel';
import ComponentMappingPanel from './_components/ComponentMappingPanel';

function FigmaPageContent() {
  const {
    isConnected,
    connectionLoading,
    connectFigma,
    disconnectFigma,
    selectedFile,
    selectedNode,
    fetchFiles,
    selectFile,
    selectNode,
    convertToCode,
    generateDiagram,
    extractDesignSystem,
    exportAssets,
    mapComponents,
    analyzeContext,
    results,
    loadingStates,
    errors,
    clearError,
    credits,
    creditCosts,
  } = useFigmaIntegration();

  const [diagramPrompt, setDiagramPrompt] = useState('');

  // Fetch files when connected
  useEffect(() => {
    if (isConnected) {
      fetchFiles();
    }
  }, [isConnected]);

  // Extract data from results
  const filesData = results.files?.files || results.files || [];
  const fileMetadata = results.metadata || null;
  const nodeData = results.nodes || null;
  const codeResult = results.convert || null;
  const diagramResult = results.diagram || null;
  const designSystemResult = results.designSystem || null;
  const assetsResult = results.assets || null;
  const componentMapResult = results.componentMap || null;

  const handleGenerateDiagram = () => {
    if (diagramPrompt.trim()) {
      generateDiagram(diagramPrompt);
    }
  };

  // Show connection panel when not connected
  if (!isConnected && !connectionLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <FigmaConnectionPanel
          isConnected={false}
          connectionLoading={connectionLoading}
          onConnect={connectFigma}
          onDisconnect={disconnectFigma}
          loadingStates={loadingStates}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <h1 className="text-xl font-semibold tracking-tight">Figma Integration</h1>
        </div>
        <FigmaConnectionPanel
          isConnected={isConnected}
          connectionLoading={connectionLoading}
          onConnect={connectFigma}
          onDisconnect={disconnectFigma}
          loadingStates={loadingStates}
        />
      </div>

      {/* Error display */}
      {Object.keys(errors).length > 0 && (
        <div className="space-y-2 shrink-0">
          {Object.entries(errors).map(([key, error]) => (
            <div
              key={key}
              className="flex items-center gap-2 p-3 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => clearError(key)}
                className="text-xs underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main split-panel layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left panel - 40% - File browser & Preview */}
        <div className="w-full lg:w-[40%] flex flex-col gap-4 min-h-0">
          <FigmaFileBrowser
            files={Array.isArray(filesData) ? filesData : []}
            selectedFile={selectedFile}
            selectedNode={selectedNode}
            fileMetadata={fileMetadata}
            onFetchFiles={fetchFiles}
            onSelectFile={selectFile}
            onSelectNode={selectNode}
            loadingStates={loadingStates}
          />
          <FigmaPreview
            selectedNode={selectedNode}
            nodeData={nodeData}
            loading={loadingStates.nodes}
          />
        </div>

        {/* Right panel - 60% - Actions & Output */}
        <div className="w-full lg:w-[60%] flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Action bar */}
          <FigmaActionBar
            selectedFile={selectedFile}
            selectedNode={selectedNode}
            credits={credits}
            creditCosts={creditCosts}
            onConvertToCode={convertToCode}
            onGenerateDiagram={handleGenerateDiagram}
            onExtractDesignSystem={extractDesignSystem}
            onExportAssets={exportAssets}
            onAnalyzeContext={analyzeContext}
            onMapComponents={mapComponents}
            loadingStates={loadingStates}
          />

          {/* Diagram prompt input */}
          {selectedNode && (
            <div className="flex gap-2">
              <input
                type="text"
                value={diagramPrompt}
                onChange={(e) => setDiagramPrompt(e.target.value)}
                placeholder="Describe a diagram to generate (e.g., 'user authentication flow')..."
                className="flex-1 h-9 px-3.5 rounded-xl border border-border/60 bg-background/80 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateDiagram();
                }}
              />
            </div>
          )}

          {/* Output panels - shown based on results */}
          {codeResult?.code && (
            <CodeOutputPanel
              code={codeResult.code}
              language={codeResult.language || 'jsx'}
              fileName={codeResult.fileName || 'Component.jsx'}
            />
          )}

          {diagramResult?.svg && (
            <DiagramCanvas
              svgContent={diagramResult.svg}
              diagramType={diagramResult.diagramType}
              title={diagramResult.title || 'Generated Diagram'}
            />
          )}

          {designSystemResult?.tokens && (
            <DesignTokensPanel
              tokens={designSystemResult.tokens}
              format={designSystemResult.format || 'css'}
              formattedOutput={designSystemResult.formattedOutput || ''}
            />
          )}

          {assetsResult?.assets && (
            <AssetExportPanel
              assets={assetsResult.assets}
              onExport={(nodeId, format, scale) => exportAssets(selectedFile, [nodeId], format, scale)}
              loading={loadingStates.assets}
            />
          )}

          {componentMapResult?.mappings && (
            <ComponentMappingPanel
              mappings={componentMapResult.mappings}
              onConfirm={(mapping) => {
                // Confirm mapping - would call API to store
                console.log('Confirmed mapping:', mapping);
              }}
              onReject={(mapping) => {
                // Reject mapping
                console.log('Rejected mapping:', mapping);
              }}
              loading={loadingStates.componentMap}
            />
          )}

          {/* Empty state when no results */}
          {!codeResult && !diagramResult && !designSystemResult && !assetsResult && !componentMapResult && selectedNode && (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed bg-muted/10 min-h-50">
              <div className="text-center">
                <Layers className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select an action above to get started
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Convert to code, generate diagrams, extract tokens, and more
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FigmaPage() {
  return (
    <AuthGuard>
      <FigmaProvider>
        <div className="w-full h-full p-4 md:p-6">
          <FigmaPageContent />
        </div>
      </FigmaProvider>
    </AuthGuard>
  );
}

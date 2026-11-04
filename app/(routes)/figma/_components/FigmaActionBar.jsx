'use client';

import { Code, GitBranch, Palette, Download, Scan, Puzzle, Loader2 } from '@/components/ui/animated-icon';
import { Button } from '@/components/ui/button';
import CreditCostIndicator from './CreditCostIndicator';

/**
 * Action buttons with credit cost indicators.
 * Shows available operations when a node is selected.
 */
export default function FigmaActionBar({
  selectedFile,
  selectedNode,
  credits = 0,
  creditCosts = {},
  onConvertToCode,
  onGenerateDiagram,
  onExtractDesignSystem,
  onExportAssets,
  onAnalyzeContext,
  onMapComponents,
  loadingStates = {},
}) {
  if (!selectedNode) return null;

  const actions = [
    {
      id: 'convert',
      label: 'Convert to Code',
      icon: Code,
      cost: creditCosts.component || 20,
      onClick: () => onConvertToCode(selectedFile, selectedNode),
      loading: loadingStates.convert,
    },
    {
      id: 'diagram',
      label: 'Generate Diagram',
      icon: GitBranch,
      cost: creditCosts.diagram || 15,
      onClick: onGenerateDiagram,
      loading: loadingStates.diagram,
    },
    {
      id: 'designSystem',
      label: 'Extract Tokens',
      icon: Palette,
      cost: creditCosts.designSystem || 30,
      onClick: () => onExtractDesignSystem(selectedFile),
      loading: loadingStates.designSystem,
    },
    {
      id: 'assets',
      label: 'Export Assets',
      icon: Download,
      cost: creditCosts.assets || 5,
      onClick: () => onExportAssets(selectedFile, [selectedNode]),
      loading: loadingStates.assets,
    },
    {
      id: 'context',
      label: 'Analyze Context',
      icon: Scan,
      cost: creditCosts.context || 10,
      onClick: () => onAnalyzeContext(selectedFile, selectedNode),
      loading: loadingStates.context,
    },
    {
      id: 'componentMap',
      label: 'Map Components',
      icon: Puzzle,
      cost: creditCosts.componentMap || 10,
      onClick: () => onMapComponents(selectedFile, selectedNode),
      loading: loadingStates.componentMap,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
      {actions.map((action) => {
        const Icon = action.icon;
        const isLoading = action.loading;
        const canAfford = credits >= action.cost;

        return (
          <div key={action.id} className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              disabled={isLoading || !canAfford}
              className="h-9 text-xs gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {action.label}
            </Button>
            <CreditCostIndicator
              cost={action.cost}
              available={credits}
              className="scale-90"
            />
          </div>
        );
      })}
    </div>
  );
}

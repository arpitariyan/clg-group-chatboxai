'use client';

import { Coins } from '@/components/ui/animated-icon';
import { Badge } from '@/components/ui/badge';

/**
 * Displays the credit cost for a Figma operation before execution.
 * Shows cost and whether user has sufficient credits.
 */
export default function CreditCostIndicator({ cost, available, className = '' }) {
  const sufficient = available >= cost;

  return (
    <Badge
      variant={sufficient ? 'secondary' : 'destructive'}
      className={`gap-1 text-xs ${className}`}
    >
      <Coins className="w-3 h-3" />
      <span>{cost} credits</span>
      {!sufficient && (
        <span className="ml-1 opacity-75">({available} available)</span>
      )}
    </Badge>
  );
}

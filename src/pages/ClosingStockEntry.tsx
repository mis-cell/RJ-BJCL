import React, { useState } from 'react';
import StockSummary from './StockSummary';

interface ClosingStockEntryProps {
  onClose?: () => void;
}

export default function ClosingStockEntry({ onClose }: ClosingStockEntryProps) {
  // Isolated dedicated tab state for Closing Stock Entry so switching tabs in StockSummary never mutates this view
  const [isolatedTabKey] = useState<'opening'>('opening');

  return (
    <div data-isolated-module="closing_stock_entry" className="w-full h-full flex flex-col">
      <StockSummary
        key={`closing-stock-isolated-${isolatedTabKey}`}
        initialSubTab={isolatedTabKey}
        onClose={onClose}
      />
    </div>
  );
}

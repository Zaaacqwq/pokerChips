"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DENOMINATIONS,
  CHIP_COLORS,
  breakdownTotal,
  suggestBreakdown,
  type ChipBreakdown,
  type Denomination,
} from "@/lib/chips";

interface ChipCounterProps {
  breakdown: ChipBreakdown;
  onChange: (breakdown: ChipBreakdown) => void;
  chipRate: number;
  disabled?: boolean;
  showAutoFill?: boolean;
}

export function ChipCounter({
  breakdown,
  onChange,
  chipRate,
  disabled = false,
  showAutoFill = true,
}: ChipCounterProps) {
  const total = breakdownTotal(breakdown);
  const [amountInput, setAmountInput] = useState("");

  function update(denom: Denomination, delta: number) {
    const current = breakdown[denom] || 0;
    const next = Math.max(0, current + delta);
    onChange({ ...breakdown, [denom]: next });
  }

  function handleAutoFill() {
    const amount = parseInt(amountInput);
    if (!amount || amount <= 0) return;
    onChange(suggestBreakdown(amount));
  }

  return (
    <div className="space-y-2">
      {/* Quick fill by amount */}
      {!disabled && showAutoFill && (
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min="1"
            placeholder="输入金额自动分配"
            className="h-8 flex-1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAutoFill()}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!amountInput || parseInt(amountInput) <= 0}
            onClick={handleAutoFill}
          >
            自动分配
          </Button>
        </div>
      )}

      {/* Denomination grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {DENOMINATIONS.map((d) => (
          <div
            key={d}
            className="flex items-center rounded-lg border px-2 py-1"
          >
            <span
              className={`${CHIP_COLORS[d]} rounded-full w-7 h-7 flex items-center justify-center text-[10px] font-bold shrink-0`}
            >
              {d}
            </span>
            <div className="flex items-center flex-1 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-base"
                disabled={disabled || breakdown[d] === 0}
                onClick={() => update(d, -1)}
              >
                -
              </Button>
              <span className="font-mono text-sm w-7 text-center">
                {breakdown[d] || 0}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-base"
                disabled={disabled}
                onClick={() => update(d, 1)}
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between text-sm font-medium pt-1 border-t">
        <span>合计</span>
        <span className="font-mono">
          {total} chips (¥{total * chipRate})
        </span>
      </div>
    </div>
  );
}

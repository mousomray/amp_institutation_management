"use client";

import React, { useMemo, useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";

type Installment = {
  index: number;
  amount: number;
  dueDate: Date;
};

export default function SetInstallmentSection() {
  const TOTAL_AMOUNT = 509073;
  const TOTAL_DURATION = 12; // months

  const [installmentCount, setInstallmentCount] = useState<number | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [showList, setShowList] = useState(false);

  /** Generate installment preview */
  const generatedInstallments: Installment[] = useMemo(() => {
    if (!installmentCount || installmentCount <= 0) return [];

    const base = Math.floor(TOTAL_AMOUNT / installmentCount);
    const remainder = TOTAL_AMOUNT - base * installmentCount;
    const startDate = new Date();

    return Array.from({ length: installmentCount }, (_, i) => {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      return {
        index: i + 1,
        amount: i === installmentCount - 1 ? base + remainder : base,
        dueDate: date,
      };
    });
  }, [installmentCount]);

  const handleSave = () => {
    setInstallments(generatedInstallments);
    setShowList(true);
  };

  const reset = () => {
    setInstallmentCount(null);
    setInstallments([]);
    setShowList(false);
  };

  return (
    <Card className="max-w-lg mx-auto shadow-lg rounded-xl">
     
      {!showList && (
        <>
          <h2 className="text-lg font-semibold mb-2">
            Set Installment Plan
          </h2>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-lg font-semibold text-blue-600">
                ₹{TOTAL_AMOUNT.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Total Duration</p>
              <p className="text-lg font-semibold text-gray-800">
                {TOTAL_DURATION} Months
              </p>
            </div>
          </div>

          <Divider />

       
          <label className="block text-sm font-medium mb-1">
            Number of Installments
          </label>
          <InputNumber
            value={installmentCount}
            onValueChange={(e: any) => setInstallmentCount(e.value)}
            min={1}
            max={24}
            showButtons
            className="w-full mb-3"
          />

          
          {generatedInstallments.length > 0 && (
            <div className="space-y-2 mb-4">
              {generatedInstallments.map((inst) => (
                <div
                  key={inst.index}
                  className="flex justify-between border rounded-lg px-3 py-2 bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Installment {inst.index}
                    </p>
                    <p className="text-xs text-gray-500">
                      {inst.dueDate.toDateString()}
                    </p>
                  </div>
                  <p className="font-semibold text-blue-600">
                    ₹{inst.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Button
            label="Save Installment Plan"
            icon="pi pi-check"
            className="w-full"
            disabled={!installmentCount}
            onClick={handleSave}
          />
        </>
      )}

      {/* ================= LIST VIEW ================= */}
      {showList && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            Installment Payment List
          </h2>

          <div className="space-y-3">
            {installments.map((inst) => (
              <div
                key={inst.index}
                className="flex justify-between items-center border rounded-lg px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    Installment {inst.index}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {inst.dueDate.toDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-600">
                    ₹{inst.amount.toLocaleString()}
                  </span>

                  <Button
                    icon="pi pi-credit-card"
                    rounded
                    severity="success"
                    tooltip="Make Payment"
                    onClick={() =>
                      alert(`Pay Installment ${inst.index}`)
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <Divider />

          <Button
            label="Back to Edit"
            icon="pi pi-arrow-left"
            className="w-full"
            severity="secondary"
            onClick={reset}
          />
        </>
      )}
    </Card>
  );
}

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";

type Props = {
  enrollmentId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddOtherFees({ enrollmentId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!enrollmentId || !token) return;
    fetchData();
  }, [enrollmentId, token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const receiptsRes = await axiosInstance.get(`/receipt/get-receipts-by-enrollment/${enrollmentId}`, { headers });
      const mastersRes = await axiosInstance.get(`/fees-master/get-all-fees-master`, { headers });

      const recs = receiptsRes?.data?.data ?? [];
      const allMasters = mastersRes?.data?.data ?? [];

      setReceipts(recs);
      // filter masters that are not present in receipts' heads
      const existingHeadNames = new Set<string>();
      recs.forEach((r: any) => {
        (r.heads || []).forEach((h: any) => existingHeadNames.add(h.feesHeadName));
      });

      const filteredMasters = allMasters.filter((m: any) => !existingHeadNames.has(m.name));
      setMasters(filteredMasters);

      // initialize amounts to 0 for filtered masters
      const init: Record<string, number> = {};
      filteredMasters.forEach((m: any) => { init[m._id] = 0; });
      setAmounts(init);
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to load data");
      else toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

  const handleChangeAmount = (id: string, val: number | undefined) => {
    setAmounts((p) => ({ ...p, [id]: val ?? 0 }));
  };

  const selectedHeads = masters
    .map((m) => ({ ...m, amount: Number(amounts[m._id] || 0) }))
    .filter((m) => m.amount > 0);

  const selectedTotal = selectedHeads.reduce((s, h) => s + (h.amount || 0), 0);

  // CHANGED: send payload as { enrollmentId, details: [{ feesMasterId, amount }, ...] } to /receipt/create-receipt
  const handleSubmit = async () => {
    // build details from masters-only selections
    const details = selectedHeads.map((m: any) => ({
      feesMasterId: m._id,
      amount: Number(m.amount),
    }));

    if (!details.length) {
      toast.warn("Please enter amount for at least one fee head");
      return;
    }

    const payload = {
      enrollmentId,
      details,
    };

    try {
      setLoading(true);
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      // use create-receipt endpoint
      await axiosInstance.post("/receipt/create-receipt", payload, { headers });

      toast.success("Other payment(s) added");
      onSuccess();
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to submit");
      else toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Add Other Payment</h3>
          <p className="text-sm text-gray-500">Review previous receipts (read-only) and add additional fee heads.</p>
        </div>
        <div className="text-sm text-gray-500">{enrollmentId ? `Enrollment: ${enrollmentId}` : ""}</div>
      </div>

      {/* Body: two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: existing receipts */}
        <div className="bg-white border rounded shadow-sm p-4 h-80 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-gray-700">Existing Receipts</div>
            <div className="text-xs text-gray-500">{receipts.length} found</div>
          </div>

          {receipts.length ? (
            receipts.map((r: any) => (
              <div key={r._id} className="border rounded p-3 mb-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">{r.receiptNo}</div>
                  <div className="text-xs text-gray-500">{new Date(r.receiptDate).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm text-gray-700">Total: <span className="font-medium">{fmt(r.totalAmount)}</span></div>

                <div className="mt-3 space-y-1">
                  {(r.heads || []).map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                      <div>{h.feesHeadName}</div>
                      <div className="font-medium">{fmt(h.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No previous receipts</div>
          )}
        </div>

        {/* Right: add new heads */}
        <div className="bg-white border rounded shadow-sm p-4 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-gray-700">Add Fee Heads</div>
            <div className="text-xs text-gray-500">Only fee masters not present in receipts</div>
          </div>

          <div className="flex-1 overflow-auto space-y-3 pr-2">
            {masters.length ? (
              masters.map((m: any) => (
                <div key={m._id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">{m.name}</div>
                    <div className="text-xs text-gray-500">ID: {m._id}</div>
                  </div>

                  <div className="w-40">
                    <InputNumber
                      value={amounts[m._id] ?? 0}
                      onValueChange={(e) => handleChangeAmount(m._id, e.value ?? undefined)}
                      mode="currency"
                      currency="INR"
                      locale="en-IN"
                      showButtons
                      className="w-full"
                      inputClassName="text-right"
                      min={0}
                      disabled={loading}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No additional fee heads available to add</div>
            )}
          </div>

          {/* Selected preview & subtotal */}
          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Selected</div>
              <div className="text-sm font-semibold text-gray-800">{fmt(selectedTotal)}</div>
            </div>

            {selectedHeads.length ? (
              <div className="mt-2 space-y-1 text-sm">
                {selectedHeads.map((h) => (
                  <div key={h._id} className="flex items-center justify-between text-gray-700">
                    <div className="truncate pr-2">{h.name}</div>
                    <div className="font-medium">{fmt(h.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">No selection yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t">
        <Button label="Cancel" className="p-button-text" onClick={onClose} disabled={loading} />
        <Button label="Submit" onClick={handleSubmit} loading={loading} disabled={loading || selectedTotal <= 0} />
      </div>
    </div>
  );
}

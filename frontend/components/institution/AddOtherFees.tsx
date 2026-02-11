import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";
import { Badge } from "primereact/badge";
import { Chip } from "primereact/chip";

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
  const [receiptAmounts, setReceiptAmounts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!enrollmentId || !token) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const initReceiptAmounts: Record<string, Record<string, number>> = {};
      recs.forEach((r: any) => {
        initReceiptAmounts[r._id] = {};
        (r.heads || []).forEach((h: any, idx: number) => {
          initReceiptAmounts[r._id][`head-${idx}`] = h.amount || 0;
        });
      });
      setReceiptAmounts(initReceiptAmounts);

      const existingHeadNames = new Set<string>();
      recs.forEach((r: any) => {
        (r.heads || []).forEach((h: any) => existingHeadNames.add(h.feesHeadName));
      });

      const filteredMasters = allMasters.filter((m: any) => !existingHeadNames.has(m.name));
      setMasters(filteredMasters);

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

  const handleReceiptHeadChange = (receiptId: string, headKey: string, val: number | undefined) => {
    setReceiptAmounts((prev) => ({
      ...prev,
      [receiptId]: {
        ...prev[receiptId],
        [headKey]: val ?? 0,
      },
    }));
  };

  const handleDeleteReceipt = (receiptId: string, receiptNo: string) => {
    confirmDialog({
      message: `Are you sure you want to delete receipt "${receiptNo}"? This action cannot be undone.`,
      header: "Delete Receipt",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          setLoading(true);
          const headers = { Authorization: `Bearer ${token}` };
         const res =  await axiosInstance.delete(`/receipt/delete/receipt/${receiptId}`, { headers });
          toast.success(res.data.message || "Receipt deleted successfully");
          fetchData();
        } catch (err: any) {
          if (axios.isAxiosError(err)) {
            toast.error(err.response?.data?.message || "Failed to delete receipt");
          } else {
            toast.error("Unexpected error");
          }
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleUpdateReceipt = async (receipt: any) => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const updatedHeads = (receipt.heads || []).map((h: any, idx: number) => ({
        ...h,
        amount: receiptAmounts[receipt._id]?.[`head-${idx}`] ?? h.amount,
      }));

      const payload = {
        ...receipt,
        heads: updatedHeads,
        totalAmount: updatedHeads.reduce((sum: number, h: any) => sum + (h.amount || 0), 0),
      };

      await axiosInstance.put(`/receipt/update-receipt/${receipt._id}`, payload, { headers });
      toast.success("Receipt updated successfully");
      fetchData();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to update receipt");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedHeads = masters
    .map((m) => ({ ...m, amount: Number(amounts[m._id] || 0) }))
    .filter((m) => m.amount > 0);

  const selectedTotal = selectedHeads.reduce((s, h) => s + (h.amount || 0), 0);

  const handleDeleteHead = (id: string) => {
    setAmounts((p) => ({ ...p, [id]: 0 }));
    toast.info("Fee head removed from selection");
  };

  const handleSubmit = async () => {
    const details = selectedHeads.map((m: any) => ({
      feesMasterId: m._id,
      amount: Number(m.amount),
    }));

    if (!details.length) {
      toast.warn("Please enter amount for at least one fee head");
      return;
    }

    const payload = { enrollmentId, details };

    try {
      setLoading(true);
      const headers = { Authorization: token ? `Bearer ${token}` : "" };
      await axiosInstance.post("/receipt/create-receipt", payload, { headers });
      toast.success("Other payment(s) added successfully!");
      onSuccess();
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Failed to submit");
      else toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const calculateReceiptTotal = (receiptId: string, originalHeads: any[]) => {
    return originalHeads.reduce((sum, h, idx) => {
      return sum + (receiptAmounts[receiptId]?.[`head-${idx}`] ?? h.amount ?? 0);
    }, 0);
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6  -m-6 mb-6  ">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 ">
          <div className="text-white">
            <h3 className="text-2xl font-bold mb-1 flex items-center gap-3">
              <i className="pi pi-wallet text-3xl"></i>
              Add Other Payment
            </h3>
            <p className="text-blue-100 text-sm">Review existing receipts or add additional fee heads</p>
          </div>
          {enrollmentId && (
            <Chip 
              label={`ID: ${enrollmentId.substring(0, 8)}...`} 
              className="bg-white/20 text-white border-0"
              icon="pi pi-id-card"
            />
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Panel: Existing Receipts */}
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-2 rounded-lg">
                  <i className="pi pi-file-edit text-xl"></i>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Existing Receipts</h4>
                  <p className="text-blue-100 text-xs">Edit or delete receipts</p>
                </div>
              </div>
              <Badge value={receipts.length} severity="info" className="bg-white text-blue-600" />
            </div>
          </div>

          <div className="p-4 h-[450px] overflow-y-auto overflow-x-hidden">
            {receipts.length ? (
              <div className="space-y-4">
                {receipts.map((r: any) => {
                  const currentTotal = calculateReceiptTotal(r._id, r.heads || []);
                  const hasChanges = currentTotal !== r.totalAmount;

                  return (
                    <div key={r._id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all duration-300 hover:border-blue-300">
                      {/* Receipt Header */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                            <i className="pi pi-receipt text-blue-600 text-lg"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-800 truncate">{r.receiptNo}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <i className="pi pi-calendar text-xs"></i>
                              {new Date(r.receiptDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          icon="pi pi-trash"
                          rounded
                          text
                          severity="danger"
                          onClick={() => handleDeleteReceipt(r._id, r.receiptNo)}
                          disabled={loading}
                          tooltip="Delete receipt"
                          tooltipOptions={{ position: 'left' }}
                          className="hover:bg-red-50 flex-shrink-0"
                        />
                      </div>

                      {/* Receipt Total */}
                      <div className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-lg mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Total Amount</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-lg font-bold ${hasChanges ? 'text-orange-600' : 'text-green-600'}`}>
                            {fmt(currentTotal)}
                          </span>
                          {hasChanges && (
                            <Badge value="Modified" severity="warning" className="text-xs" />
                          )}
                        </div>
                      </div>

                      {/* Fee Heads */}
                      <div className="space-y-2 mb-3">
                        {(r.heads || []).map((h: any, i: number) => (
                          <div key={i} className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <i className="pi pi-tag text-gray-400 text-xs flex-shrink-0"></i>
                                <span className="text-sm font-medium text-gray-700 truncate flex-1">{h.feesHeadName}</span>
                              </div>
                              <div className="w-full">
                                <InputNumber
                                  value={receiptAmounts[r._id]?.[`head-${i}`] ?? h.amount ?? 0}
                                  onValueChange={(e) => handleReceiptHeadChange(r._id, `head-${i}`, e.value ?? undefined)}
                                  mode="currency"
                                  currency="INR"
                                  locale="en-IN"
                                  className="w-full"
                                  inputClassName="text-right text-sm p-2 w-full"
                                  min={0}
                                  disabled={loading}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Save Button */}
                      {hasChanges && (
                        <Button
                          label="Save Changes"
                          icon="pi pi-save"
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 border-0 text-white shadow-md hover:shadow-lg transition-shadow"
                          onClick={() => handleUpdateReceipt(r)}
                          disabled={loading}
                          loading={loading}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                <div className="bg-gray-100 p-8 rounded-full mb-4">
                  <i className="pi pi-inbox text-6xl"></i>
                </div>
                <p className="text-lg font-medium">No Receipts Found</p>
                <p className="text-sm text-gray-500">Add new fee heads to create a receipt</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Add New Heads */}
        <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 p-2 rounded-lg">
                  <i className="pi pi-plus-circle text-xl"></i>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Add Fee Heads</h4>
                  <p className="text-green-100 text-xs">Available fee masters</p>
                </div>
              </div>
              <Badge value={masters.length} severity="success" className="bg-white text-green-600" />
            </div>
          </div>

          <div className="p-4 h-[450px] flex flex-col overflow-hidden">
            {/* Available Masters List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-3 mb-4">
              {masters.length ? (
                masters.map((m: any) => (
                  <div key={m._id} className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
                    <div className="flex flex-col gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate flex items-center gap-2">
                          <i className="pi pi-tag text-green-600 flex-shrink-0"></i>
                          <span className="truncate">{m.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">ID: {m._id.substring(0, 12)}...</div>
                      </div>
                      <div className="w-full">
                        <InputNumber
                          value={amounts[m._id] ?? 0}
                          onValueChange={(e) => handleChangeAmount(m._id, e.value ?? undefined)}
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          showButtons
                          buttonLayout="horizontal"
                          className="w-full"
                          inputClassName="text-right w-full"
                          min={0}
                          disabled={loading}
                          decrementButtonClassName="p-button-success"
                          incrementButtonClassName="p-button-success"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                  <div className="bg-gray-100 p-8 rounded-full mb-4">
                    <i className="pi pi-check-circle text-6xl"></i>
                  </div>
                  <p className="text-lg font-medium text-center">All Fee Heads Added</p>
                  <p className="text-sm text-gray-500 text-center">No additional fee masters available</p>
                </div>
              )}
            </div>

            {/* Selected Items Summary */}
            {selectedHeads.length > 0 && (
              <div className="border-t-2 border-gray-200 pt-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-700 font-bold min-w-0">
                      <i className="pi pi-shopping-cart flex-shrink-0"></i>
                      <span className="truncate">Selected ({selectedHeads.length})</span>
                    </div>
                    <div className="text-xl font-bold text-green-600 flex-shrink-0">{fmt(selectedTotal)}</div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto overflow-x-hidden space-y-2 pr-2">
                  {selectedHeads.map((h) => (
                    <div key={h._id} className="bg-white border-2 border-blue-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{h.name}</div>
                          </div>
                          <Button
                            icon="pi pi-trash"
                            rounded
                            text
                            severity="danger"
                            onClick={() => handleDeleteHead(h._id)}
                            disabled={loading}
                            tooltip="Remove"
                            tooltipOptions={{ position: 'left' }}
                            className="hover:bg-red-50 flex-shrink-0"
                          />
                        </div>
                        <div className="w-full">
                          <InputNumber
                            value={amounts[h._id] ?? 0}
                            onValueChange={(e) => handleChangeAmount(h._id, e.value ?? undefined)}
                            mode="currency"
                            currency="INR"
                            locale="en-IN"
                            className="w-full"
                            inputClassName="text-right text-sm p-2 w-full"
                            min={0}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Divider />

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-3 text-sm overflow-hidden">
          {selectedHeads.length > 0 ? (
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg min-w-0">
              <i className="pi pi-info-circle text-blue-600 flex-shrink-0"></i>
              <span className="text-gray-700 truncate">
                <span className="font-semibold">{selectedHeads.length}</span> fee head{selectedHeads.length > 1 ? 's' : ''} • 
                <span className="font-bold text-green-600 ml-1">{fmt(selectedTotal)}</span>
              </span>
            </div>
          ) : (
            <div className="text-gray-400 bg-gray-50 px-4 py-2 rounded-lg">
              <i className="pi pi-info-circle mr-2"></i>
              Select fee heads to proceed
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <Button
            label="Cancel"
            icon="pi pi-times"
            outlined
            severity="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto order-2 sm:order-1"
          />
          <Button
            label={loading ? "Processing..." : "Submit Payment"}
            icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check-circle"}
            onClick={handleSubmit}
            loading={loading}
            disabled={loading || selectedTotal <= 0}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transition-shadow order-1 sm:order-2 whitespace-nowrap"
          />
        </div>
      </div>

      <ConfirmDialog />
    </div>
  );
}
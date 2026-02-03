"use client";

import React, { useState, useEffect } from "react";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import AddPayment from "@/components/institution/AddPayment";

type Installment = {
  installmentNo: number;
  amount: number;
  dueDate: string;
};

type Props = {
  studentFeesId: string | null;
  onClose: () => void;
  onAssign?: () => void;
};

export default function SetInstallmentSection({ studentFeesId, onClose, onAssign }: Props) {
  const [installmentCount, setInstallmentCount] = useState<number | null>(2);
  const [preview, setPreview] = useState<{
    studentFeesId?: string;
    totalAmount?: number;
    installmentCount?: number;
    totalCourseDuration?: string;
    installments?: Installment[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<any[] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (studentFeesId && token) {
      fetchInstallmentItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentFeesId, token]);

  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "₹0";

  const fetchInstallmentItems = async () => {
    try {
      setItemsLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/institution/list-installment-items/${studentFeesId}`;
      const res = await axiosInstance.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExistingItems(res.data.data || []);
    } catch (err: any) {
      console.error(err);
      // if 404 or empty, it means no installments assigned yet
      setExistingItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const fetchPreview = async () => {
    if (!studentFeesId) return toast.error("No student fees selected");
    if (!installmentCount || installmentCount <= 0) return toast.error("Enter valid installment count");

    try {
      setLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/institution/student-fees/${studentFeesId}/installment-preview`;
      const res = await axiosInstance.get(url, {
        params: { count: installmentCount },
        headers: { Authorization: `Bearer ${token}` },
      });
      setPreview(res.data.data);
      toast.success(res.data.message || "Preview generated");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!preview?.installments || !studentFeesId) return toast.error("Generate preview first");
    try {
      setAssigning(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/institution/assign-installments-to-student-fees/${studentFeesId}`;
      await axiosInstance.post(
        url,
        { installments: preview.installments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Installments assigned successfully");
      // refetch items
      await fetchInstallmentItems();
      setPreview(null); // clear preview
      if (onAssign) onAssign();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to assign installments");
    } finally {
      setAssigning(false);
    }
  };

  const statusBadge = (status: string) => {
    const cls =
      status === "PAID" ? "bg-green-100 text-green-800 border-green-200" :
      status === "PARTIAL" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
      "bg-red-100 text-red-800 border-red-200";
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>{status}</span>;
  };

  const hasInstallments = existingItems && existingItems.length > 0;

  return (
    <>
      {/* HEADER with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -m-4 mb-4 p-6 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <i className="pi pi-money-bill text-2xl text-white"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {hasInstallments ? "Installment Payment Plan" : "Set Installment Plan"}
            </h2>
            <p className="text-sm text-white/80">
              {hasInstallments ? "Manage your payment schedule" : "Configure your payment schedule"}
            </p>
          </div>
        </div>
      </div>

      {itemsLoading && (
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
        </div>
      )}

      {!itemsLoading && hasInstallments && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <i className="pi pi-list text-blue-600"></i>
                <div className="font-semibold text-gray-800">Assigned Installments</div>
              </div>
              <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                {existingItems.length} items
              </div>
            </div>

            <div className="space-y-3">
              {existingItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Installment {idx + 1}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <i className="pi pi-calendar text-xs"></i>
                          Due: {new Date(item.dueDate).toLocaleDateString("en-IN")}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-xs text-gray-600">
                            Paid: <span className="font-semibold text-green-700">{fmt(item.paidAmount)}</span>
                          </div>
                          <div className="text-xs text-gray-400">/</div>
                          <div className="text-xs text-gray-600">
                            Total: <span className="font-semibold">{fmt(item.amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {statusBadge(item.status)}
                      {item.status !== "PAID" && (
                        <Button
                          icon="pi pi-credit-card"
                          label="Pay"
                          size="small"
                          className="p-button-sm"
                          onClick={() => {
                            setSelectedItemId(item._id);
                            setPaymentVisible(true);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button label="Close" className="w-full" onClick={onClose} />
        </div>
      )}

      {!itemsLoading && !hasInstallments && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="pi pi-wallet text-blue-600"></i>
                <div className="text-xs text-gray-600">Total Amount</div>
              </div>
              <div className="text-xl font-bold text-blue-700">{preview ? fmt(preview.totalAmount) : "—"}</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="pi pi-clock text-indigo-600"></i>
                <div className="text-xs text-gray-600">Duration</div>
              </div>
              <div className="text-xl font-bold text-indigo-700">{preview?.totalCourseDuration ?? "—"}</div>
            </div>
          </div>

          <Divider />

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="pi pi-chart-bar text-blue-600"></i>
              Number of Installments
            </label>
            <InputNumber
              value={installmentCount}
              onValueChange={(e: any) => setInstallmentCount(e.value)}
              min={1}
              max={24}
              showButtons
              className="w-full"
              inputClassName="text-center font-semibold"
            />
          </div>

          <div className="flex gap-2">
            <Button
              label={loading ? "Generating..." : "Generate Preview"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-eye"}
              onClick={fetchPreview}
              disabled={loading || !installmentCount}
              className="flex-1"
            />
            <Button label="Cancel" className="p-button-text" onClick={onClose} />
          </div>

          {preview && preview.installments && (
            <div className="space-y-3 pt-3">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="pi pi-list text-gray-700"></i>
                      <div className="font-semibold text-gray-800">Preview Breakdown</div>
                    </div>
                    <div className="text-sm text-gray-500">{preview.installmentCount} items</div>
                  </div>
                </div>

                <div className="divide-y max-h-80 overflow-y-auto">
                  {preview.installments.map((inst: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {inst.installmentNo}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700">Installment {inst.installmentNo}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <i className="pi pi-calendar text-xs"></i>
                            {new Date(inst.dueDate).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{fmt(inst.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  label={assigning ? "Saving..." : "Save Plan"}
                  icon={assigning ? "pi pi-spin pi-spinner" : "pi pi-check"}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 border-0"
                  onClick={handleAssign}
                  disabled={assigning}
                />
                <Button label="Reset" className="p-button-text" onClick={() => setPreview(null)} />
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog header="Pay Installment" visible={paymentVisible} style={{ width: "420px" }} onHide={() => setPaymentVisible(false)}>
        <AddPayment
          id={selectedItemId}
          isInstallment={true}
          studentFeesId={studentFeesId as string}
          onClose={() => setPaymentVisible(false)}
          onSuccess={() => {
            setPaymentVisible(false);
            fetchInstallmentItems();
            if (onAssign) onAssign();
          }}
        />
      </Dialog>
    </>
  );
}

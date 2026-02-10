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
import { Calendar } from "primereact/calendar"; // added import

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
    monthsGap?: number;
    installments?: Installment[];
  } | null>(null);
  const [monthsGap, setMonthsGap] = useState<number>(1);
  const [firstInstallmentAmount, setFirstInstallmentAmount] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<any[] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showTotal, setShowTotal] = useState<boolean>(false);

  // new states to allow opening config when installments exist and using due amount
  const [showConfig, setShowConfig] = useState<boolean>(true);
  const [useDueAmount, setUseDueAmount] = useState<boolean>(false);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  // Reset state and refetch specifically for the incoming studentFeesId
  useEffect(() => {
    // clear any previous data so UI won't show previous student's installments
    setExistingItems(null);
    setPreview(null);
    setPaymentVisible(false);
    setSelectedItemId(null);
    setInstallmentCount(2);
    // reset new fields
    setMonthsGap(1);
    setFirstInstallmentAmount(null);
    setStartDate(new Date());
    // hide total on initial load / when studentFeesId changes
    setShowTotal(false);

    // keep config visibility default true when no installments; will be adjusted when items load
    setShowConfig(true);
    setUseDueAmount(false);

    console.log("Fetching installments for studentFeesId:", studentFeesId);

    if (!studentFeesId || !token) {
      // nothing to fetch (yet) — keep existingItems as null to indicate "not loaded"
      return;
    }

    fetchInstallmentItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentFeesId, token]);

  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "₹0";

  const fetchInstallmentItems = async () => {
    // guard: ensure we're fetching for the current studentFeesId and we have token
    if (!studentFeesId || !token) {
      setExistingItems(null);
      return;
    }

    try {
      setItemsLoading(true);
      // clear previous items immediately so UI won't reuse old entries while fetching
      setExistingItems(null);
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
    if (monthsGap === null || monthsGap < 0) return toast.error("Enter valid months gap");
    if (!firstInstallmentAmount || firstInstallmentAmount <= 0) return toast.error("Enter first installment amount");
    if (!startDate) return toast.error("Select start date");

    try {
      setLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/institution/student-fees/${studentFeesId}/installment-preview`;
      const payload = {
        installmentCount: installmentCount,
        monthsGap: monthsGap,
        firstInstallmentAmount: firstInstallmentAmount,
        startDate: startDate.toISOString(),
      };
      const res = await axiosInstance.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // normalize server response: map payableAmount -> totalAmount so UI shows payable amount
      const data = res.data.data || {};
      const normalized = { ...data, totalAmount: data.totalAmount ?? data.payableAmount ?? 0 };
      setPreview(normalized);
      // show total after successful preview
      setShowTotal(true);
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
      setShowTotal(false); // hide total after assign
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

  // use strict check: existingItems === null -> loading/not-loaded, [] -> no installments
  const hasInstallments = existingItems !== null && existingItems.length > 0;

  // Calculate outstanding due amount from existing installments
  const dueAmount = existingItems?.reduce((sum, item) => sum + (item.amount - (item.paidAmount || 0)), 0) ?? 0;

  // When existingItems change, default showConfig = !hasInstallments (show config by default only when none exist)
  useEffect(() => {
    const has = existingItems !== null && existingItems.length > 0;
    setShowConfig(!has);
    if (!has) {
      setUseDueAmount(false);
    }
  }, [existingItems]);

  console.log("Selected Item ID:", selectedItemId);

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

            <div className="text-sm text-gray-600 mb-3">
              Outstanding due: <span className="font-semibold text-red-700 ml-2">{fmt(dueAmount)}</span>
            </div>

            <div className="space-y-3">
              {existingItems.map((item, idx) => (
                <div
                  key={item?._id ?? idx}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
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
                          type="button"
                          icon="pi pi-credit-card"
                          label="Pay"
                          size="small"
                          className="p-button-sm pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation();

                            if (!item?._id) {
                              toast.error("Invalid installment item");
                              return;
                            }

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

          <div className="flex gap-3">
            <Button 
              type="button" 
              label={showConfig ? "Hide Plan Builder" : "Create New Plan"} 
              onClick={() => setShowConfig(prev => !prev)} 
              className="flex-1" 
            />
            <Button type="button" label="Close" className="w-40" onClick={onClose} />
          </div>
        </div>
      )}

      {/* Show config form when showConfig is true (either no installments exist, or user clicked "Create New Plan") */}
      {!itemsLoading && showConfig && (
        <div className="space-y-6">
          {/* Summary: show Total Amount only after preview generated */}
          {showTotal && preview && (
            <div className="grid grid-cols-1 gap-4">
              <Card className="shadow-sm border border-gray-200 bg-white p-4">
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className="text-2xl font-bold text-blue-700 mt-2">{fmt(preview.totalAmount)}</div>
                <div className="text-xs text-gray-500 mt-1">{preview.installmentCount} installments • {preview.monthsGap ?? monthsGap} month(s) gap</div>
              </Card>
            </div>
          )}

          <Divider />

          {/* Config card */}
          <Card className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Configure Installments</h3>
              <p className="text-sm text-gray-500">Provide details to generate a payment schedule preview</p>
            </div>

            {/* Top row fields aligned */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Installments</label>
                <div className="p-inputgroup w-full">
                  <span className="p-inputgroup-addon bg-blue-50 text-blue-600">
                    <i className="pi pi-list" />
                  </span>
                  <InputNumber
                    value={installmentCount}
                    onValueChange={(e: any) => setInstallmentCount(e.value)}
                    min={1}
                    max={24}
                    step={1}
                    className="w-full"
                    inputClassName="h-10 text-center font-semibold"
                    placeholder="e.g. 3"
                  />
                </div>
                <small className="text-xs text-gray-500 mt-1 block">Between 1 and 24</small>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Months Gap</label>
                <div className="p-inputgroup w-full">
                  <span className="p-inputgroup-addon bg-blue-50 text-blue-600">
                    <i className="pi pi-clock" />
                  </span>
                  <InputNumber
                    value={monthsGap}
                    onValueChange={(e: any) => setMonthsGap(e.value ?? 0)}
                    min={0}
                    max={60}
                    step={1}
                    className="w-full"
                    inputClassName="h-10 text-center font-semibold"
                    placeholder="e.g. 1"
                  />
                </div>
                <small className="text-xs text-gray-500 mt-1 block">Gap in months between installments</small>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <div className="p-inputgroup w-full">
                  <span className="p-inputgroup-addon bg-blue-50 text-blue-600">
                    <i className="pi pi-calendar" />
                  </span>
                  <Calendar
                    value={startDate}
                    onChange={(e: any) => setStartDate(e.value)}
                    dateFormat="dd/mm/yy"
                    showIcon
                    appendTo={() => document.body}
                    className="w-full"
                    inputClassName="h-10 font-semibold"
                    placeholder="dd/mm/yyyy"
                  />
                </div>
                <small className="text-xs text-gray-500 mt-1 block">First installment due date</small>
              </div>
            </div>

            {/* Amount row with 'use due amount' toggle */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">First Installment Amount (₹)</label>
                {hasInstallments && (
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <input
                      id="useDue"
                      type="checkbox"
                      checked={useDueAmount}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setUseDueAmount(val);
                        if (val) setFirstInstallmentAmount(dueAmount || 0);
                      }}
                      className="mr-1"
                    />
                    <label htmlFor="useDue" className="select-none cursor-pointer">Use outstanding due ({fmt(dueAmount)})</label>
                  </div>
                )}
              </div>
              <div className="p-inputgroup w-full">
                <span className="p-inputgroup-addon bg-blue-50 text-blue-600">
                  <i className="pi pi-money-bill" />
                </span>
                <InputNumber
                  value={firstInstallmentAmount}
                  onValueChange={(e: any) => setFirstInstallmentAmount(e.value)}
                  min={1}
                  mode="currency"
                  currency="INR"
                  locale="en-IN"
                  className="w-full"
                  inputClassName="h-10 font-semibold"
                  placeholder="e.g. 300"
                  disabled={useDueAmount}
                />
              </div>
              <small className="text-xs text-gray-500 mt-1 block">
                Amount for the first installment. Remaining will be split across the rest.
              </small>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-5">
              <Button
                label={loading ? "Generating..." : "Generate Preview"}
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-eye"}
                onClick={fetchPreview}
                disabled={loading || !installmentCount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 border-0 text-white h-11"
              />
              <Button
                label="Cancel"
                onClick={() => {
                  // if user cancels while config was opened from assigned list, close it; else close dialog
                  if (hasInstallments) {
                    setShowConfig(false);
                    // Reset preview and form when closing config on existing installments
                    setPreview(null);
                    setShowTotal(false);
                    setUseDueAmount(false);
                  } else {
                    onClose();
                  }
                }}
                className="h-11 px-5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              />
            </div>

            {/* Preview */}
            {preview && preview.installments && (
              <div className="space-y-3 pt-3">
                <Card className="overflow-hidden border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <div className="flex items-center gap-2">
                      <i className="pi pi-list text-gray-700"></i>
                      <div className="font-semibold text-gray-800">Preview Breakdown</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {preview.installmentCount} items • {preview.monthsGap ?? monthsGap} month(s) gap
                      </div>
                      {showTotal && (
                        <div className="text-lg font-bold text-blue-700">{fmt(preview.totalAmount)}</div>
                      )}
                    </div>
                  </div>

                  <div className="divide-y max-h-80 overflow-y-auto">
                    {preview.installments.map((inst: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                </Card>

                <div className="flex gap-3">
                  <Button
                    label={assigning ? "Saving..." : "Save Plan"}
                    icon={assigning ? "pi pi-spin pi-spinner" : "pi pi-check"}
                    onClick={handleAssign}
                    disabled={assigning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 border-0 text-white h-11"
                  />
                  <Button
                    label="Reset"
                    onClick={() => {
                      setPreview(null);
                      setShowTotal(false);
                    }}
                    className="h-11 px-5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Dialog
        header="Pay Installment"
        visible={paymentVisible}
        modal
        dismissableMask
        appendTo={() => document.body}
        style={{ width: "420px" }}
        onHide={() => {
          setPaymentVisible(false);
          setSelectedItemId(null);
        }}
      >
        {selectedItemId ? (
          <AddPayment
            id={selectedItemId}
            isInstallment={true}
            studentFeesId={studentFeesId as string}
            onClose={() => {
              setPaymentVisible(false);
              setSelectedItemId(null);
            }}
            onSuccess={() => {
              setPaymentVisible(false);
              setSelectedItemId(null);
              fetchInstallmentItems();
              if (onAssign) onAssign();
            }}
          />
        ) : (
          <div className="p-4 text-sm text-gray-500">
            No installment selected.
          </div>
        )}
      </Dialog>

    </>
  );
}

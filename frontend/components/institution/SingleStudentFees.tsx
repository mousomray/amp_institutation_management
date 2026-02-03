"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "primereact/button";

type Props = {
  id: string | null;
  onClose: () => void;
};

export default function SingleStudentFees({ id, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (id && token) fetchSingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const fetchSingle = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/institution/get-single-student-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data || null);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load details");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

  const calcPercent = () => {
    const total = data?.summary?.totalAmount ?? 0;
    const paid = data?.summary?.paidAmount ?? 0;
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  if (!id) return <div className="text-sm text-gray-500">No record selected</div>;

  // small helpers for subtotals
  const coursesTotal = (data?.courses || []).reduce((s: number, c: any) => s + (c?.amount ?? 0), 0);
  const masterTotal = (data?.masterFees || []).reduce((s: number, m: any) => s + (m?.amount ?? 0), 0);

  const statusClass = (s?: string) =>
    s === "PAID" ? "bg-green-100 text-green-800" : s === "PARTIAL" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-2xl font-semibold text-indigo-700">
            {data?.student?.name ? data.student.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("") : "S"}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{data?.student?.name ?? "Student"}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(data?.summary?.status)}`}>
                {(data?.summary?.status ?? "DUE").toUpperCase()}
              </div>
              {/* Course badges */}
              <div className="flex items-center gap-1 flex-wrap">
                {(data?.courses || []).slice(0, 4).map((c: any, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    <i className="pi pi-book mr-1" /> {c?.name}
                  </span>
                ))}
                {(data?.courses || []).length > 4 && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">+{(data?.courses || []).length - 4} more</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
          <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={onClose} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-white border rounded shadow-sm flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded text-indigo-600"><i className="pi pi-wallet" /></div>
          <div>
            <div className="text-xs text-gray-500">Total Amount</div>
            <div className="text-lg font-semibold text-gray-800 mt-1">{fmt(data?.summary?.totalAmount)}</div>
          </div>
        </div>
        <div className="p-3 bg-white border rounded shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded text-green-600"><i className="pi pi-check" /></div>
          <div>
            <div className="text-xs text-gray-500">Paid Amount</div>
            <div className="text-lg font-semibold text-green-700 mt-1">{fmt(data?.summary?.paidAmount)}</div>
          </div>
        </div>
        <div className="p-3 bg-white border rounded shadow-sm flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded text-red-600"><i className="pi pi-clock" /></div>
          <div>
            <div className="text-xs text-gray-500">Due Amount</div>
            <div className="text-lg font-semibold text-red-700 mt-1">{fmt(data?.summary?.dueAmount)}</div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="text-sm text-gray-600 mb-2">Payment Progress</div>
        <div className="w-full bg-gray-100 rounded h-3 overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${calcPercent()}%` }} />
        </div>
        <div className="text-xs text-gray-500 mt-1">{calcPercent()}% paid</div>
      </div>

      {/* Breakdown panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Courses */}
        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-medium text-gray-800">Courses ({(data?.courses || []).length})</div>
            <div className="text-sm text-gray-500 font-semibold">Subtotal: {fmt(coursesTotal)}</div>
          </div>
          <div className="divide-y max-h-56 overflow-auto">
            {(data?.courses || []).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="text-indigo-600 mt-0.5"><i className="pi pi-book" /></div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{c?.name}</div>
                    {/* optional subtitle */}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900"> {fmt(c?.amount)}</div>
              </div>
            ))}
            {!(data?.courses || []).length && <div className="px-4 py-3 text-sm text-gray-500">No courses</div>}
          </div>
        </div>

        {/* Master Fees */}
        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-medium text-gray-800">Master Fees ({(data?.masterFees || []).length})</div>
            <div className="text-sm text-gray-500 font-semibold">Subtotal: {fmt(masterTotal)}</div>
          </div>
          <div className="divide-y max-h-56 overflow-auto">
            {(data?.masterFees || []).map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-600 mt-0.5"><i className="pi pi-money-bill" /></div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{m?.name}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900"> {fmt(m?.amount)}</div>
              </div>
            ))}
            {!(data?.masterFees || []).length && <div className="px-4 py-3 text-sm text-gray-500">No master fees</div>}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}
    </div>
  );
}

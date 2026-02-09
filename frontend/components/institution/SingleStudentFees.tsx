"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { formatDate } from "@/helper/DateTime"; // added import

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
    if (!id) return;
    setData(null);        
    if (token) fetchSingle();
  }, [id, token]);

  const fetchSingle = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/student-fees-ledger/single-student-fees/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.data?.data) {
        setData(null);
        toast.error("No data found for this student");
        return;
      }

      setData(res.data.data);
    } catch (err) {
      setData(null);
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  // Normalize data to a consistent structure so UI works for older and newer responses
  const summary = {
    totalAmount:
      data?.summary?.totalAmount ??
      data?.totalAmount ??
      data?.course?.fees ??
      0,
    paidAmount: data?.summary?.paidAmount ?? data?.paidAmount ?? 0,
    dueAmount:
      data?.summary?.dueAmount ??
      data?.dueAmount ??
      ( (data?.totalAmount ?? data?.course?.fees ?? 0) - (data?.paidAmount ?? 0) ),
    status: data?.summary?.status ?? data?.status ?? "DUE",
    discountAmount: data?.summary?.discountAmount ?? data?.discountAmount ?? (data?.enrollment?.discountAmount ?? 0),
    paymentType: data?.summary?.paymentType ?? data?.paymentType ?? "UNKNOWN",
    createdAt: data?.summary?.createdAt ?? data?.createdAt ?? null,
  };

  const coursesArr = data?.courses ?? (data?.course ? [data.course] : []);
  const masterFees = data?.masterFees ?? [];
  const installments = data?.installments ?? [];

  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

  const calcPercent = () => {
    const total = summary.totalAmount ?? 0;
    const paid = summary.paidAmount ?? 0;
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  if (!id) return <div className="text-sm text-gray-500">No record selected</div>;

  // small helpers
  const initials = (name?: string) =>
    name ? name.split(" ").map(s => s[0]).slice(0, 2).join("") : "S";

  const statusClass = (s?: string) =>
    s === "PAID" ? "bg-green-100 text-green-800" : s === "PARTIAL" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar / Photo */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
            {data?.student?.photo ? (
              <img src={data.student.photo} alt={data.student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-2xl font-semibold text-indigo-700">{initials(data?.student?.name)}</div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{data?.student?.name ?? "Student"}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${statusClass(summary.status)}`}>
                {summary.status?.toUpperCase() ?? "DUE"}
              </div>
              <div className="text-sm text-gray-500">Payment: <span className="font-medium text-gray-700">{summary.paymentType}</span></div>
              {data?.enrollment?._id && <div className="text-sm text-gray-500">Enrollment: <span className="font-medium text-gray-700">{data.enrollment._id}</span></div>}
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {coursesArr.map((c: any, i: number) => (
                <div key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{c.name}</div>
              ))}
              {masterFees.map((m: any, i: number) => (
                <div key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">{m.name}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button icon="pi pi-cloud-download" className="p-button-text" onClick={() => window.print()} title="Download/Print" />
          <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={onClose} />
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{fmt(summary.totalAmount)}</div>
          <div className="text-sm text-gray-500 mt-1">Created: {summary.createdAt ? formatDate(summary.createdAt) : "—"}</div>
        </div>

        <div className="p-4 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Paid</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{fmt(summary.paidAmount)}</div>
          <div className="text-sm text-gray-500 mt-1">Discount: <span className="font-medium">{fmt(summary.discountAmount)}</span></div>
        </div>

        <div className="p-4 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Due</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{fmt(summary.dueAmount)}</div>
          <div className="text-sm text-gray-500 mt-1">Due count: <span className="font-medium">{installments.filter((it: any) => it.status !== "PAID").length}</span></div>
        </div>

        <div className="p-4 bg-white border rounded shadow-sm flex items-center gap-4">
          {/* Simple circular progress */}
          <div className="w-20 h-20 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-16 h-16">
              <path d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#e6e6e6" strokeWidth="3.5"></path>
              <path
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3.5"
                strokeDasharray={`${calcPercent()}, 100`}
                strokeLinecap="round"
              ></path>
              <text x="18" y="20" alignmentBaseline="central" textAnchor="middle" className="text-sm font-semibold" fill="#111827">{calcPercent()}%</text>
            </svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Progress</div>
            <div className="font-semibold text-gray-800">{calcPercent()}% paid</div>
            <div className="text-sm text-gray-500 mt-1">Method: <span className="font-medium">{summary.paymentType}</span></div>
          </div>
        </div>
      </div>

      {/* Main panels: Details & Installments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Details */}
        <div className="lg:col-span-1 bg-white border rounded shadow-sm p-4">
          <div className="text-sm text-gray-500">Student Details</div>
          <div className="mt-3 space-y-2">
            <div className="text-sm text-gray-700"><span className="text-gray-500">Name:</span> {data?.student?.name}</div>
            <div className="text-sm text-gray-700"><span className="text-gray-500">Student ID:</span> {data?.student?._id ?? "—"}</div>
            <div className="text-sm text-gray-700"><span className="text-gray-500">Course Fees:</span> {fmt(data?.course?.fees)}</div>
            <div className="text-sm text-gray-700"><span className="text-gray-500">Net Payable:</span> {fmt(data?.enrollment?.netPayableAmount ?? summary.totalAmount)}</div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">Payment Summary</div>
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">Total</div>
              <div className="font-medium text-gray-800">{fmt(summary.totalAmount)}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="text-gray-600">Paid</div>
              <div className="font-medium text-green-700">{fmt(summary.paidAmount)}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <div className="text-gray-600">Due</div>
              <div className="font-medium text-red-700">{fmt(summary.dueAmount)}</div>
            </div>
          </div>
        </div>

        {/* Right Top: Course & Fee Breakdown */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium text-gray-800">Course & Fee Breakdown</div>
              <div className="text-sm text-gray-500 font-semibold">Subtotal: {fmt(coursesArr.reduce((s: number, c: any) => s + (c?.fees ?? c?.amount ?? 0), 0) + masterFees.reduce((s: number, m: any) => s + (m?.amount ?? 0), 0))}</div>
            </div>
            <div className="divide-y max-h-48 overflow-auto">
              {coursesArr.length ? coursesArr.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="text-indigo-600 mt-0.5"><i className="pi pi-book" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{c?.name}</div>
                      <div className="text-xs text-gray-500">Duration: {c?.duration ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900"> {fmt(c?.fees ?? c?.amount)}</div>
                </div>
              )) : <div className="px-4 py-3 text-sm text-gray-500">No courses</div>}
              {masterFees.length ? masterFees.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 mt-0.5"><i className="pi pi-money-bill" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{m?.name}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900"> {fmt(m?.amount)}</div>
                </div>
              )) : null}
            </div>
          </div>

          {/* Installments timeline */}
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium text-gray-800">Installments ({installments.length})</div>
              <div className="text-sm text-gray-500 font-semibold">{fmt(installments.reduce((s: number, it: any) => s + (it?.amount ?? 0), 0))}</div>
            </div>

            <div className="divide-y max-h-64 overflow-auto">
              {installments.length ? installments.map((it: any, idx: number) => (
                <div key={it._id ?? idx} className="px-4 py-4 flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${it.status === "PAID" ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-gray-200 text-gray-500"}`}>
                      {it.status === "PAID" ? <i className="pi pi-check" /> : idx + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Installment {idx + 1}</div>
                        <div className="text-xs text-gray-500">Due: {formatDate(it?.dueDate)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Amount</div>
                        <div className="font-semibold text-gray-900">{fmt(it?.amount)}</div>
                        <div className="text-xs mt-1">
                          <span className="text-green-700 font-medium">{fmt(it?.paidAmount)}</span>
                          <span className="text-gray-500"> paid</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(it?.status)}`}>{(it?.status ?? "DUE").toUpperCase()}</div>
                      <div className="text-xs text-gray-500">Ledger: {it._id ?? "—"}</div>
                    </div>
                  </div>
                </div>
              )) : <div className="px-4 py-3 text-sm text-gray-500">No installments set</div>}
            </div>

            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">Next due</div>
              <div className="text-sm font-medium text-gray-800">
                {(() => {
                  const next = installments.find((x: any) => x?.status !== "PAID");
                  return next ? `${formatDate(next.dueDate)} • ${fmt(next.dueAmount ?? (next.amount - (next.paidAmount ?? 0)))}` : "All paid";
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}
    </div>
  );
}

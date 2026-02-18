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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendingPDF, setSendingPDF] = useState(false);
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

  // compute SVG circle values for accurate progress rendering
  const percent = calcPercent();
  const R = 15.9155; // matches the original arc radius used in the SVG path
  const C = 2 * Math.PI * R; // circumference (~100)
  const dash = (percent / 100) * C;

  const downloadPDF = async () => {
    if (!id || !token) {
      toast.error('Missing ID or authentication token');
      return;
    }

    const newTab = window.open("about:blank");
    setPdfLoading(true);

    try {
      const res = await axiosInstance.get(
        `/student-fees-ledger/single-student-fees/pdf/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
          timeout: 60000
        }
      );

      const blobData = res?.data;
      if (!blobData) {
        toast.error('No PDF returned from server.');
        if (newTab) newTab.close();
        return;
      }

      const blob = new Blob([blobData], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      if (newTab) newTab.location.href = blobUrl;
      else window.open(blobUrl, "_blank");
      // revoke after some time
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      toast.success('PDF opened in new tab!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to generate PDF");
      } else {
        toast.error("Unexpected error while generating PDF");
      }
      if (newTab) newTab.close();
    } finally {
      setPdfLoading(false);
    }
  };

  const sendPDF = async () => {
    if (!id || !token) {
      toast.error('Missing ID or authentication token');
      return;
    }

    setSendingPDF(true);

    try {
      const res = await axiosInstance.get(
        `/student-fees-ledger/sent-student-fees/pdf/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000
        }
      );

      toast.success(res.data?.message || 'PDF sent successfully!');
    } catch (err: any) {
      console.error('PDF send error:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to send PDF");
      } else {
        toast.error("Unexpected error while sending PDF");
      }
    } finally {
      setSendingPDF(false);
    }
  };


  if (!id) return <div className="text-sm text-gray-500">No record selected</div>;

  // small helpers
  const initials = (name?: string) =>
    name ? name.split(" ").map(s => s[0]).slice(0, 2).join("") : "S";

  const statusClass = (s?: string) =>
    s === "PAID" ? "bg-green-100 text-green-800" : s === "PARTIAL" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg overflow-hidden print:shadow-none">
        {/* Receipt header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {data?.institution?.initials ?? "IN"}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">{data?.institution?.name ?? "Institute Name"}</div>
              <div className="text-sm text-gray-500">{data?.institution?.address ?? "Institute address"}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Receipt</div>
            <div className="text-xl font-bold text-gray-800">#{data?._id ?? id}</div>
            <div className="text-sm text-gray-500">{formatDate(summary.createdAt ?? new Date().toISOString())}</div>
          </div>
        </div>
        
        {/* Invoice body */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student / Invoice Info */}
            <div className="md:col-span-2 bg-gray-50 p-4 rounded">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded bg-white flex items-center justify-center text-indigo-700 font-semibold">
                  {data?.student?.photo ? <img src={data.student.photo} alt={data.student.name} className="w-full h-full object-cover rounded" /> : initials(data?.student?.name)}
                </div>
                <div>
                  <div className="text-sm text-gray-500">Student</div>
                  <div className="text-lg font-semibold text-gray-800">{data?.student?.name ?? "Student"}</div>
                  <div className="text-sm text-gray-500 mt-1">ID: <span className="font-medium text-gray-700">{data?.student?._id ?? "—"}</span></div>
                  <div className="text-sm text-gray-500 mt-1">Payment Status: <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${statusClass(summary.status)}`}>{(summary.status ?? "DUE").toUpperCase()}</span></div>
                </div>
              </div>
            </div>
            
            {/* Summary totals */}
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-500">Summary</div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">Total</div>
                  <div className="font-semibold text-gray-800">{fmt(summary.totalAmount)}</div>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <div className="text-gray-600">Paid</div>
                  <div className="font-semibold text-green-700">{fmt(summary.paidAmount)}</div>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <div className="text-gray-600">Due</div>
                  <div className="font-semibold text-red-700">{fmt(summary.dueAmount)}</div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="-rotate-90" width="48" height="48" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r={R} fill="none" stroke="#eef2ff" strokeWidth="4" />
                      <circle cx="18" cy="18" r={R} fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">{percent}%</div>
                  </div>
                  <div className="text-sm text-gray-500">Payment progress</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Charges table */}
          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-3">Charges</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3 text-xs text-gray-600">Description</th>
                    <th className="p-3 text-xs text-gray-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesArr.map((c: any, i: number) => (
                    <tr key={`c-${i}`} className="border-b">
                      <td className="p-3">{c?.name} <div className="text-xs text-gray-500">{c?.duration ?? ""}</div></td>
                      <td className="p-3 text-right font-semibold">{fmt(c?.fees ?? c?.amount)}</td>
                    </tr>
                  ))}
                  {masterFees.map((m: any, i: number) => (
                    <tr key={`m-${i}`} className="border-b">
                      <td className="p-3">{m?.name}</td>
                      <td className="p-3 text-right font-semibold">{fmt(m?.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-3 text-right text-sm text-gray-600">Subtotal</td>
                    <td className="p-3 text-right font-semibold">{fmt(coursesArr.reduce((s: number, c: any) => s + (c?.fees ?? c?.amount ?? 0), 0) + masterFees.reduce((s: number, m: any) => s + (m?.amount ?? 0), 0))}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-right text-sm text-gray-600">Discount</td>
                    <td className="p-3 text-right font-semibold">{fmt(summary.discountAmount)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-3 text-right text-sm font-semibold">Grand Total</td>
                    <td className="p-3 text-right text-lg font-bold">{fmt(summary.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Installments / Payments */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-gray-800">Installments ({installments.length})</div>
                <div className="text-sm text-gray-500 font-semibold">{fmt(installments.reduce((s: number, it: any) => s + (it?.amount ?? 0), 0))}</div>
              </div>
              <div className="divide-y max-h-48 overflow-auto">
                {installments.length ? installments.map((it: any, idx: number) => (
                  <div key={it._id ?? idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{`#${idx + 1} • ${formatDate(it?.dueDate)}`}</div>
                      <div className="text-xs text-gray-500 mt-1">{it.note ?? ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmt(it?.amount)}</div>
                      <div className="text-xs mt-1"><span className="text-green-700 font-medium">{fmt(it?.paidAmount)}</span> paid</div>
                      <div className="text-xs mt-1"><span className={`px-2 py-0.5 rounded text-xs ${statusClass(it?.status)}`}>{(it?.status ?? "DUE").toUpperCase()}</span></div>
                    </div>
                  </div>
                )) : <div className="py-3 text-sm text-gray-500">No installments set</div>}
              </div>
            </div>
            
            <div className="bg-white border rounded p-4">
              <div className="text-sm text-gray-500 mb-3">Payment Details</div>
              <div className="text-sm"><span className="text-gray-600">Method:</span> <span className="font-medium">{summary.paymentType}</span></div>
              <div className="text-sm mt-2"><span className="text-gray-600">Next Due:</span>
                <span className="font-medium ml-2">
                  {(() => {
                    const next = installments.find((x: any) => x?.status !== "PAID");
                    return next ? `${formatDate(next.dueDate)} • ${fmt(next.dueAmount ?? (next.amount - (next.paidAmount ?? 0)))}` : "All paid";
                  })()}
                </span>
              </div>
              
              <div className="mt-6 flex flex-col gap-2 no-print">
                <div className="flex gap-2">
                  <Button 
                    icon="pi pi-file-pdf" 
                    label={pdfLoading ? 'Opening PDF...' : 'View PDF'} 
                    className="flex-1 p-button-primary" 
                    onClick={downloadPDF}
                    loading={pdfLoading}
                    disabled={pdfLoading || sendingPDF}
                  />
                  <Button 
                    icon="pi pi-send" 
                    label={sendingPDF ? 'Sending...' : 'Send PDF'} 
                    className="flex-1 p-button-success" 
                    onClick={sendPDF}
                    loading={sendingPDF}
                    disabled={pdfLoading || sendingPDF}
                  />
                </div>
                {/* <Button 
                  icon="pi pi-print" 
                  label="Print" 
                  className="flex-1" 
                  onClick={printReceipt} 
                /> */}
                <Button label="Close" className="p-button-text" onClick={onClose} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

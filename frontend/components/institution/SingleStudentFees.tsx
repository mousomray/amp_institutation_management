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

  // compute SVG circle values for accurate progress rendering
  const percent = calcPercent();
  const R = 15.9155; // matches the original arc radius used in the SVG path
  const C = 2 * Math.PI * R; // circumference (~100)
  const dash = (percent / 100) * C;

  const escapeHtml = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const printReceipt = () => {
    const inst = data?.institution ?? {};
    const student = data?.student ?? {};
    interface Institution {
      initials?: string;
      name?: string;
      address?: string;
    }

    interface Student {
      _id?: string;
      name?: string;
      email?: string;
      photo?: string;
    }

    interface Course {
      name?: string;
      duration?: string;
      fees?: number;
      amount?: number;
    }

    interface MasterFee {
      name: string;
      amount: number;
    }

    interface Installment {
      _id?: string;
      dueDate: string;
      amount: number;
      paidAmount?: number;
      status?: string;
      note?: string;
    }

    const html: string = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt - ${escapeHtml(student?.name ?? 'Student')}</title>
      <style>
      body{font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;color:#111;margin:0;padding:20px}
      .wrap{max-width:800px;margin:0 auto;background:#fff;padding:22px;border-radius:6px}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #4f46e5;padding-bottom:12px}
      .h-left{display:flex;gap:14px;align-items:center}
      .logo{width:64px;height:64px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px}
      .title{font-size:18px;font-weight:700}
      .meta{font-size:12px;color:#6b7280}
      .grid{display:grid;grid-template-columns:1fr 240px;gap:18px;margin-top:16px}
      .card{background:#f8fafc;padding:12px;border-radius:6px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{padding:10px;border-bottom:1px solid #e6e9ef;text-align:left}
      th{background:#f3f4f6;font-size:13px}
      .text-right{text-align:right}
      .small{font-size:12px;color:#6b7280}
      .muted{color:#6b7280;font-size:12px}
      .footer{margin-top:18px;text-align:center;color:#9ca3af;font-size:12px}
      @media print{ body{padding:0} .wrap{box-shadow:none;border-radius:0;padding:12mm} .no-print{display:none} }
      </style>
    </head>
    <body>
      <div class="wrap">
      <div class="header">
        <div class="h-left">
        <div class="logo">${escapeHtml((inst as Institution)?.initials ?? 'IN')}</div>
        <div>
          <div class="title">${escapeHtml((inst as Institution)?.name ?? 'Institute')}</div>
          <div class="meta">${escapeHtml((inst as Institution)?.address ?? '')}</div>
        </div>
        </div>
        <div class="muted">
        <div>Receipt</div>
        <div style="font-weight:700;margin-top:6px">#${escapeHtml(String(data?._id ?? ''))}</div>
        <div class="small" style="margin-top:6px">${escapeHtml(formatDate(summary.createdAt ?? new Date().toISOString()))}</div>
        </div>
      </div>

      <div class="grid">
        <div>
        <div style="display:flex;gap:12px;align-items:center">
          <div style="width:72px;height:72px;border-radius:8px;overflow:hidden;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-weight:700;color:#4f46e5">
          ${data?.student?.photo ? `<img src="${escapeHtml(data.student.photo)}" style="width:100%;height:100%;object-fit:cover"/>` : escapeHtml(initials(data?.student?.name))}
          </div>
          <div>
          <div style="font-weight:700">${escapeHtml((student as Student)?.name ?? 'Student')}</div>
          <div class="small">ID: ${escapeHtml((student as Student)?._id ?? '')} • ${escapeHtml((student as Student)?.email ?? '')}</div>
          <div class="small" style="margin-top:6px">Status: <strong>${escapeHtml((summary.status ?? 'DUE').toString().toUpperCase())}</strong></div>
          </div>
        </div>

        <div style="margin-top:14px" class="card">
          <div class="small">Summary</div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:700">
          <div>Total</div><div>${escapeHtml(fmt(summary.totalAmount))}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px">
          <div>Paid</div><div style="color:#059669">${escapeHtml(fmt(summary.paidAmount))}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px">
          <div>Due</div><div style="color:#b91c1c">${escapeHtml(fmt(summary.dueAmount))}</div>
          </div>
        </div>

        <div style="margin-top:12px">
          <div class="small">Charges</div>
          <table>
          <thead>
            <tr><th>Description</th><th class="text-right">Amount</th></tr>
          </thead>
          <tbody>
            ${(coursesArr as Course[]).map(c => `<tr><td>${escapeHtml(c?.name ?? '')}${c?.duration ? ` <div class="muted">${escapeHtml(c.duration)}</div>` : ''}</td><td class="text-right"><strong>${escapeHtml(fmt(c?.fees ?? c?.amount))}</strong></td></tr>`).join('')}
            ${(masterFees as MasterFee[]).map(m => `<tr><td>${escapeHtml(m?.name)}</td><td class="text-right"><strong>${escapeHtml(fmt(m?.amount))}</strong></td></tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td class="muted text-right">Subtotal</td><td class="text-right"><strong>${escapeHtml(fmt((coursesArr as Course[]).reduce((s:number,c:any)=>s+(c?.fees??c?.amount??0),0) + (masterFees as MasterFee[]).reduce((s:number,m:any)=>s+(m?.amount??0),0)))}</strong></td></tr>
            <tr><td class="muted text-right">Discount</td><td class="text-right"><strong>${escapeHtml(fmt(summary.discountAmount))}</strong></td></tr>
            <tr><td class="muted text-right">Grand Total</td><td class="text-right"><strong>${escapeHtml(fmt(summary.totalAmount))}</strong></td></tr>
          </tfoot>
          </table>
        </div>
        </div>

        <div>
        <div class="card">
          <div class="small">Payment Details</div>
          <div style="margin-top:8px">Method: <strong>${escapeHtml(summary.paymentType)}</strong></div>
          <div style="margin-top:8px">Next Due: <strong>${escapeHtml((() => { const next = (installments as Installment[]).find((x:any)=>x?.status !== 'PAID'); return next ? `${formatDate(next.dueDate)} • ${fmt(next.amount - (next.paidAmount ?? 0))}` : 'All paid'; })())}</strong></div>
        </div>

        <div style="margin-top:12px" class="card">
          <div class="small">Installments</div>
          <div style="margin-top:8px">
          ${(installments as Installment[]).length ? (installments as Installment[]).map((it: Installment, idx: number) => `<div style="padding:8px 0;border-bottom:1px dashed #eef2f6"><div style="font-weight:700">#${idx+1} • ${escapeHtml(formatDate(it?.dueDate))}</div><div class="muted">${escapeHtml(it.note ?? '')}</div><div style="margin-top:6px"><strong>${escapeHtml(fmt(it?.amount))}</strong> • Paid ${escapeHtml(fmt(it?.paidAmount))} • <span style="background:${it?.status==='PAID'?'#ecfccb':'#fff7ed'};padding:4px 8px;border-radius:6px;font-size:12px">${escapeHtml((it?.status ?? 'DUE').toString().toUpperCase())}</span></div></div>`).join('') : '<div class="muted">No installments</div>'}
          </div>
        </div>
        </div>
      </div>

      <div class="footer">This is a computer generated receipt — no signature required.</div>
      </div>
    </body>
    </html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Popup blocked. Allow popups to print.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { try { win.focus(); win.print(); } catch(e){ console.error(e); } };
  };

  if (!id) return <div className="text-sm text-gray-500">No record selected</div>;

  // small helpers
  const initials = (name?: string) =>
    name ? name.split(" ").map(s => s[0]).slice(0, 2).join("") : "S";

  const statusClass = (s?: string) =>
    s === "PAID" ? "bg-green-100 text-green-800" : s === "PARTIAL" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

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
              
              <div className="mt-6 flex gap-3 no-print">
                <Button icon="pi pi-print" label="Print" className="flex-1" onClick={printReceipt} />
                <Button label="Close" className="p-button-text" onClick={onClose} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

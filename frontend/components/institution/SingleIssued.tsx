"use client";

import React, { useEffect, useState } from "react";
import microInstance from "@/service/micro.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDate } from "@/helper/DateTime";

type BookItem = {
  _id?: string;
  name?: string;
  bookName?: string;
  image?: string;
  book_image?: string;
  authorName?: string;
  language?: string;
  book_fee?: number;
  return_date?: string;
  issue_date?: string;
  status?: string;
};

type IssueData = {
  // new API shape
  issueId?: string;
  status?: string;
  dates?: { issue_date?: string; return_date?: string; actual_return_date?: string; delay_days?: number };
  book?: BookItem;
  student?: { id?: string; name?: string; email?: string; phone?: string; photo?: string };
  payment?: {
    book_fee?: number;
    fine_per_day?: number;
    total_fine?: number;
    total_amount?: number;
    paid_amount?: number;
    due_amount?: number;
    payment_status?: string;
    payment_date?: string;
  };

  // legacy shape
  _id?: string;
  books?: BookItem[];
  total_amount?: number;
  paid_amount?: number;
  payment_status?: string;
  issue_date?: string;
  return_date?: string;
  actual_return_date?: string;
  book_fee?: number;
  late_fine?: number;
};

export default function SingleIssued({ issueId }: { issueId?: string }) {
  const [data, setData] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(false);

  // default ID if none provided (as requested)
  const defaultId = "6996f70c1e80dceab6c6d124";
  const idToUse = issueId || defaultId;

  useEffect(() => {
    if (!idToUse) return;
    fetchIssue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToUse]);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const res = await microInstance.get(`/api/get-single-issue/${idToUse}`);
      setData(res.data?.data ?? res.data ?? null);
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load issue");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  const viewPdf = async () => {
    try {
      setPdfLoading(true);
      const res = await microInstance.get(`/api/get-single-issue-pdf/${idToUse}`, {
        params: { pdf: true },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // revoke later
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load PDF");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const sendPdf = async () => {
    try {
      setSendLoading(true);
      const res = await microInstance.get(`/api/sent-single-issue-pdf/${idToUse}`);
      const msg = res.data?.message ?? res.data?.data?.message ?? "Issue PDF generated and sent successfully";
      toast.success(msg);
    } catch (err: any) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to send PDF");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setSendLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((s) => s.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const stringToBg = (name?: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-orange-500",
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const fmt = (n?: number) => (typeof n === "number" ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }) : "₹0.00");

  // Normalize values for rendering: support both API shapes
  const isNewShape = Boolean((data as any)?.issueId || (data as any)?.book);
  const student = (data as any)?.student ?? null;
  const bookSingle: BookItem | null = (data as any)?.book ?? ((data as any)?.books ? (data as any).books[0] : null);
  const booksList: BookItem[] = (data as any)?.books ?? (bookSingle ? [bookSingle] : []);
  const dates = (data as any)?.dates ?? { issue_date: (data as any)?.issue_date, return_date: (data as any)?.return_date, actual_return_date: (data as any)?.actual_return_date, delay_days: (data as any)?.delay_days };
  const payment = (data as any)?.payment ?? { book_fee: (data as any)?.payment?.book_fee ?? (data as any)?.book_fee ?? 0, fine_per_day: (data as any)?.payment?.fine_per_day ?? (data as any)?.late_fine ?? 0, total_fine: (data as any)?.payment?.total_fine ?? 0, total_amount: (data as any)?.payment?.total_amount ?? (data as any)?.total_amount ?? 0, paid_amount: (data as any)?.payment?.paid_amount ?? (data as any)?.paid_amount ?? 0, due_amount: (data as any)?.payment?.due_amount ?? 0, payment_status: (data as any)?.payment?.payment_status ?? (data as any)?.payment_status ?? (data as any)?.paymentStatus };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-semibold ${stringToBg(
              student?.name || student?.id
            )}`}>
              {getInitials(student?.name || student?.id)}
            </div>
            {student?.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.photo}
                alt={student.name}
                className="w-20 h-20 rounded-full object-cover border absolute left-0 top-0 z-10"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>

          <div>
            <div className="text-lg font-semibold">{student?.name || "-"}</div>
            <div className="text-sm text-gray-500">{student?.email || ""}</div>
            <div className="text-sm text-gray-500">{student?.phone || ""}</div>
            <div className="text-xs text-gray-400 mt-1">Issue ID: {(data as any)?.issueId ?? (data as any)?._id ?? idToUse}</div>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${((data as any)?.status || '').toString().toLowerCase() === 'returned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {((data as any)?.status || (data as any)?.payment?.payment_status || '')?.toString()?.toUpperCase?.() || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Issue Date</div>
          <div className="font-medium">{formatDate(dates?.issue_date)}</div>
          <div className="text-sm text-gray-500 mt-2">Expected Return</div>
          <div className="font-medium">{formatDate(dates?.return_date)}</div>
          <div className="text-sm text-gray-500 mt-2">Actual Return</div>
          <div className="font-medium">{formatDate(dates?.actual_return_date)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div>
          <h3 className="text-md font-semibold mb-2">Book Details</h3>
          <div className="overflow-auto border rounded p-2">
            {bookSingle ? (
              <div className="flex items-center gap-4">
                {bookSingle.image || bookSingle.book_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bookSingle.image ?? bookSingle.book_image} alt={bookSingle.name ?? bookSingle.bookName} className="w-20 h-20 object-cover rounded" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                ) : (
                  <div className="w-20 h-20 rounded bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">{getInitials(bookSingle.name ?? bookSingle.bookName)}</div>
                )}
                <div>
                  <div className="font-semibold">{bookSingle.name ?? bookSingle.bookName}</div>
                  <div className="text-sm text-gray-500">{bookSingle.authorName}</div>
                  <div className="text-sm text-gray-500">{bookSingle.language}</div>
                  <div className="text-xs text-gray-500 mt-1">Delay Days: {dates?.delay_days ?? '-'}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No book information available.</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-md font-semibold mb-2">Payment Summary</h3>
          <div className="border rounded p-3 grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Book Fee</div>
            <div className="text-right font-medium">{fmt(payment?.book_fee)}</div>
            <div className="text-gray-500">Fine / day</div>
            <div className="text-right">{fmt(payment?.fine_per_day)}</div>
            <div className="text-gray-500">Total Fine</div>
            <div className="text-right">{fmt(payment?.total_fine)}</div>
            <div className="text-gray-500">Total Amount</div>
            <div className="text-right font-semibold">{fmt(payment?.total_amount)}</div>
            <div className="text-gray-500">Paid</div>
            <div className="text-right text-green-700 font-semibold">{fmt(payment?.paid_amount)}</div>
            <div className="text-gray-500">Due</div>
            <div className="text-right text-red-600">{fmt(payment?.due_amount)}</div>
            <div className="text-gray-500">Payment Status</div>
            <div className="text-right">{(payment?.payment_status || payment?.paymentStatus || '-')?.toString().toUpperCase()}</div>
            <div className="text-gray-500">Payment Date</div>
            <div className="text-right">{formatDate(payment?.payment_date)}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 justify-end">
        <button
          type="button"
          className="p-button p-component p-button-primary"
          onClick={() => viewPdf()}
          disabled={pdfLoading}
        >
          {pdfLoading ? "Loading PDF..." : "View PDF"}
        </button>

        <button
          type="button"
          className="p-button p-component p-button-secondary"
          onClick={() => sendPdf()}
          disabled={sendLoading}
        >
          {sendLoading ? "Sending..." : "Send PDF"}
        </button>

        <button className="p-button p-component p-button-secondary" onClick={() => fetchIssue()}>
          Refresh
        </button>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

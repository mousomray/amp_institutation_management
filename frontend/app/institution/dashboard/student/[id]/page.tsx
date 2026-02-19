"use client";

import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { useParams, useRouter } from "next/navigation";

export default function StudentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendingPDF, setSendingPDF] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("institution-token")
      : null;

  const generatePdf = async (studentId?: string) => {
    const idToUse = studentId || student?._id || id;
    if (!idToUse) return toast.error("Student id missing");

    // Prefer env var, fallback to localhost:8080 (dev)
    // Configure NEXT_PUBLIC_API_BASE_URL at build time if different
    const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) || `${window.location.protocol}//${window.location.hostname}:8080`;

    const url = `${apiBase}/student-fees-ledger/generate-single-pdf/${idToUse}`;

    const newTab = window.open("about:blank");
    setPdfLoading(true);

    try {
      const auth = token || (localStorage.getItem("institution-token") as string | null);
      const res = await axios.get(url, {
        responseType: "blob",
        headers: { Authorization: auth ? `Bearer ${auth}` : undefined },
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      if (newTab) newTab.location.href = blobUrl;
      else window.open(blobUrl, "_blank");
      // revoke after some time
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to generate PDF");
      } else {
        toast.error("Unexpected error while generating PDF");
      }
      if (newTab) newTab.close();
    } finally {
      setPdfLoading(false);
    }
  };

  /* ================= FETCH STUDENT FINANCIAL SUMMARY ================= */
  useEffect(() => {
    if (id && token) fetchFinancialSummary();
  }, [id, token]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/student-fees-ledger/student-full-financial-summary/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStudent(res.data.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load student financial summary");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !student) {
    return (
      <>
        <div className="p-6">
          <div className="animate-pulse max-w-4xl mx-auto space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const sendPDF = async (studentId?: string) => {
   const idToUse = studentId || student?._id || id;
    if (!idToUse) return toast.error("Student id missing");

    setSendingPDF(true);

    try {
      const res = await axiosInstance.get(
        `/student-fees-ledger/sent-single-pdf/${id}`,
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



  return (
    <div className="p-6 space-y-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-end mb-2 gap-2">
            <Button
              label={pdfLoading ? "Opening PDF..." : "Open PDF"}
              icon="pi pi-file-pdf"
              className="p-button-sm p-button-danger"
              disabled={pdfLoading}
              onClick={() => generatePdf()}
            />
            <Button
              icon="pi pi-send"
              label={sendingPDF ? 'Sending...' : 'Send PDF'}
              className=" p-button-success"
              onClick={() => sendPDF()}
              loading={sendingPDF}
              disabled={pdfLoading || sendingPDF}
            />
          </div>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-28">
              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center text-2xl font-bold text-indigo-700">
                  {student.studentInfo?.photo && !imgError ? (
                    <img
                      src={student.studentInfo.photo}
                      alt={student.studentInfo?.name || 'student'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    (student.studentInfo?.name || '').split(' ').map((s: string) => s[0]).slice(0, 2).join('')
                  )}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{student.studentInfo?.name}</h3>
                <div className="text-sm text-gray-500">{student.studentInfo?.email}</div>
                <div className="text-sm text-gray-500">{student.studentInfo?.phone}</div>
              </div>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Total Fees</div>
                  <div className="text-2xl font-bold">₹{(student.overallTotalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Overall Paid</div>
                  <div className="text-2xl font-bold text-green-700">₹{(student.overallPaidAmount || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Overall Due</div>
                  <div className="text-2xl font-bold text-red-600">₹{(student.overallDueAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="mt-4">
                {(() => {
                  const total = student.overallTotalAmount || 0;
                  const paid = student.overallPaidAmount || 0;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div>Payment Progress</div>
                        <div className="font-medium">{pct}%</div>
                      </div>
                      <div className="w-full bg-gray-200 h-3 rounded mt-2 overflow-hidden">
                        <div className="h-3 bg-green-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {student.courses?.map((c: any) => (
          <div key={c.enrollmentId} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start gap-4">
              <div className="w-16 flex-shrink-0">
                {c.course?.image ? (
                  <img src={c.course.image} alt={c.course.name} className="w-16 h-16 rounded object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-indigo-700 font-semibold">{(c.course?.name || '').slice(0, 2).toUpperCase()}</div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{c.course?.name}</div>
                    <div className="text-xs text-gray-500">{c.course?.duration} • Fee: ₹{(c.course?.fee || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="font-semibold">₹{(c.totalAmount || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-gray-500">Paid: ₹{(c.totalPaid || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-red-600">Due: ₹{(c.totalDue || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {c?.ledgers?.map((l: any) => (
                    <div key={l?.ledgerId || Math.random()} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">{l.status || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{l.paymentType || '-'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{(l.paidAmount || 0).toLocaleString('en-IN')}</div>
                          <div className="text-xs text-gray-500">Total: ₹{(l.totalAmount || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {l.installments && l.installments.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium">Installments</div>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {l.installments.map((it: any) => (
                              <div key={it._id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                  <div className={`px-2 py-1 rounded text-xs ${it.status === 'PAID' ? 'bg-green-100 text-green-800' : it.status === 'DUE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{it.status}</div>
                                  <div>{formatDate(it.dueDate)}</div>
                                </div>
                                <div className="text-right">₹{(it.amount || 0).toLocaleString('en-IN')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {l.receiptDetails && l.receiptDetails.length > 0 && (
                        <div className="mt-3 text-sm text-gray-600">
                          <div className="font-medium">Receipts</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {l.receiptDetails.map((r: any) => (
                              <div key={r._id} className="px-2 py-1 bg-gray-100 rounded text-xs">R: {r.receiptId} • ₹{(r.amount || 0).toLocaleString('en-IN')}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button label="Back" icon="pi pi-arrow-left" outlined onClick={() => router.back()} />
      </div>
    </div>
  );
}

/* ================= INFO COMPONENT ================= */
function Info({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p
        className={`font-medium ${highlight ? "text-red-600" : "text-gray-900"
          }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

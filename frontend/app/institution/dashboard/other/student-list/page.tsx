"use client";

import React, { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { toast, ToastContainer } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { Tag } from "primereact/tag";
import { Menu } from "primereact/menu";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Card } from "primereact/card";

function fmtCurrency(n?: number) {
  if (typeof n !== "number") return "₹0";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default function OtherPaymentStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [collectVisible, setCollectVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [collecting, setCollecting] = useState<Record<string, boolean>>({});
  const challanRef = useRef<HTMLDivElement | null>(null);

  const searchRef = useRef<number | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, rows]);

  // debounce search
  useEffect(() => {
    if (!token) return;
    if (searchRef.current) window.clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {
      setPage(1);
      fetchStudents(1);
    }, 400);
    // cleanup handled by effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchStudents = async (overridePage?: number) => {
    try {
      setLoading(true);
      const currentPage = overridePage ?? page;
      const params: any = { page: currentPage, limit: rows };
      if (search && String(search).trim().length) params.search = String(search).trim();

      const res = await axiosInstance.get("/other-payment/students", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        params,
      });

      const data = res.data?.data ?? [];
      const pagination = res.data?.pagination;
      setStudents(data);
      setTotalRecords(pagination?.totalDocuments ?? res.data?.count ?? data.length);
      if (pagination?.currentPage) setPage(pagination.currentPage);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load students");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  };

  const studentBody = (row: any) => {
    const initials = row.studentName
      ? String(row.studentName)
          .split(" ")
          .map((s: string) => s[0])
          .slice(0, 2)
          .join("")
      : "?";

    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-700">
          {row.photo ? (
            <img
              src={row.photo}
              alt={row.studentName || "Student"}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
              }}
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">{row.studentName}</span>
          <span className="text-xs text-gray-500">{row.email}</span>
        </div>
      </div>
    );
  };

  const feeCell = (row: any) => {
    if (!row.fees || !row.fees.length) return <div className="text-sm text-gray-500">—</div>;
    return (
      <div className="space-y-1 text-sm">
        {row.fees.map((f: any) => (
          <div key={f.paymentId} className="flex items-center justify-between gap-3">
            <div className="truncate">{f.name}</div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{fmtCurrency(f.amount)}</div>
              <Tag
                value={String(f.status || "pending").toUpperCase()}
                severity={String(f.status || "").toLowerCase() === "paid" ? "success" : "warning"}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const actionTemplate = (row: any) => {
    const menuRef = useRef<Menu | null>(null);
    const items = [
      {
        label: "View Challan",
        icon: "pi pi-file",
        command: () => {
          setSelectedStudent(row);
          setDetailVisible(true);
        },
      },
      {
        label: "Collect",
        icon: "pi pi-wallet",
        command: () => {
          const init: Record<string, number> = {};
          (row.fees || []).forEach((f: any) => {
            init[f.paymentId] = Number(f.dueAmount ?? 0);
          });
          setPaymentAmounts(init);
          setSelectedStudent(row);
          setCollectVisible(true);
        },
      },
    ];

    return (
      <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
        <Menu model={items} popup ref={menuRef} />
        <Button
          icon="pi pi-ellipsis-v"
          rounded
          text
          onClick={(e) => {
            e.stopPropagation();
            menuRef.current?.toggle(e);
          }}
        />
      </div>
    );
  };

  const handleCollect = async (paymentId: string, dueAmount: number) => {
    const amt = Number(dueAmount ?? 0);
    if (!token) return toast.error("Authentication token missing");
    if (!(amt > 0)) return toast.warn("Invalid due amount");

    try {
      setCollecting((c) => ({ ...c, [paymentId]: true }));
      const headers = { Authorization: token ? `Bearer ${token}` : "" };
      const res = await axiosInstance.post(`/other-payment/payment-collect/${paymentId}`, { paidAmount: amt }, { headers });
      toast.success(res.data?.message || "Payment collected");
      await fetchStudents(1);
      setCollectVisible(false);
    } catch (err: any) {
      if (axios.isAxiosError(err)) toast.error(err.response?.data?.message || "Collect failed");
      else toast.error("Unexpected error");
    } finally {
      setCollecting((c) => ({ ...c, [paymentId]: false }));
    }
  };

  const challanNo =
    selectedStudent && selectedStudent.fees && selectedStudent.fees.length
      ? selectedStudent.fees[0].paymentId
      : "-";

  const handlePrint = () => {
    if (typeof window === "undefined" || !challanRef.current) return;
    const printContent = challanRef.current.innerHTML;
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Student Challan</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; background: #f3f4f6; }
            .challan-card { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; padding: 24px; }
            .challan-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .challan-title { font-size: 18px; font-weight: 700; }
            .challan-sub { font-size: 12px; color: #6b7280; }
            .challan-section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
            th { background: #f9fafb; text-align: left; font-weight: 600; }
            .text-right { text-align: right; }
            .summary-row td { font-weight: 600; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Other Payment - Students</h2>
        <p className="text-sm text-white/90">Search and manage students with other payment heads</p>
      </div>

      <div className="flex items-center gap-3">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name..." />
        </IconField>
      </div>
    </div>
  );

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <div className="mb-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
          {header}
        </div>
      </div>

      <DataTable
        value={students}
        header={undefined}
        paginator
        first={(page - 1) * rows}
        rows={rows}
        totalRecords={totalRecords}
        onPage={(e) => {
          setPage((e.page ?? 0) + 1);
          setRows(e.rows ?? 5);
        }}
        rowsPerPageOptions={[5, 10, 25]}
        lazy
        loading={loading}
        responsiveLayout="stack"
        emptyMessage="No students found"
        stripedRows
        rowHover
        className="shadow-sm rounded-lg"
        rowClassName={() => "odd:bg-white even:bg-gray-50"}
      >
        <Column field="studentName" header="Student" body={studentBody} />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone" />
        <Column header="Total" body={(r) => <div className="font-semibold">{fmtCurrency(r.totalAmount)}</div>} style={{ width: "120px" }} />
        <Column header="Paid" body={(r) => <div className="text-success">{fmtCurrency(r.totalPaid)}</div>} style={{ width: "120px" }} />
        <Column header="Due" body={(r) => <div className="text-red-600 font-medium">{fmtCurrency(r.totalDue)}</div>} style={{ width: "120px" }} />
        <Column header="Fees" body={feeCell} style={{ minWidth: "300px" }} />
        <Column header="Actions" body={actionTemplate} style={{ width: "120px" }} />
      </DataTable>

      {/* Challan dialog – show photo + signature */}
      <Dialog
        header={`Student Challan — ${selectedStudent?.studentName ?? ""}`}
        visible={detailVisible}
        style={{ width: "70vw", maxWidth: "1000px" }}
        onHide={() => setDetailVisible(false)}
      >
        {selectedStudent ? (
          <div className="space-y-4">
            <div ref={challanRef} className="bg-gray-50 p-4 rounded-lg">
              <div className="challan-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                {/* Top header */}
                <div className="challan-header flex items-start justify-between border-b border-gray-200 pb-3 mb-2">
                  <div>
                    <div className="challan-title text-lg font-bold text-gray-900">Other Payment Challan</div>
                    <div className="challan-sub text-xs text-gray-500">Student payment details</div>
                  </div>
                  <div className="text-right text-xs text-gray-600 space-y-1">
                    <div>
                      <span className="font-semibold">Challan No:</span> {challanNo}
                    </div>
                    <div>
                      <span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Student info + summary + signature */}
                <div className="flex flex-col gap-4 mb-2">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    {/* Photo + basic info */}
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                        {selectedStudent.photo ? (
                          <img
                            src={selectedStudent.photo}
                            alt={selectedStudent.studentName || "Student"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              el.style.display = "none";
                            }}
                          />
                        ) : (
                          String(selectedStudent.studentName || "")
                            .split(" ")
                            .map((s: string) => s[0])
                            .slice(0, 2)
                            .join("")
                        )}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-800">{selectedStudent.studentName}</div>
                        <div className="text-gray-500">{selectedStudent.email}</div>
                        <div className="text-gray-500">{selectedStudent.phone}</div>
                      </div>
                    </div>

                    {/* Summary + signature block */}
                    <div className="flex-1 flex flex-col md:flex-row md:justify-end gap-4">
                      <div className="text-xs text-gray-700 bg-gray-50 rounded-md px-3 py-2 min-w-[140px]">
                        <div className="font-semibold mb-1 text-right">Summary</div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-semibold">{fmtCurrency(selectedStudent.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paid:</span>
                          <span className="font-semibold text-green-700">
                            {fmtCurrency(selectedStudent.totalPaid)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Due:</span>
                          <span className="font-semibold text-red-700">
                            {fmtCurrency(selectedStudent.totalDue)}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-700 flex flex-col items-center">
                        <span className="mb-1 font-semibold">Signature</span>
                        <div className="border border-gray-200 rounded-md bg-white w-32 h-16 flex items-center justify-center overflow-hidden">
                          {selectedStudent.signature ? (
                            <img
                              src={selectedStudent.signature}
                              alt="Signature"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400">No signature</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee table */}
                <div>
                  <div className="challan-section-title text-sm font-semibold text-gray-700 mb-1">Fee Details</div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-2 border-b border-gray-200">Fee Head</th>
                        <th className="text-right py-2 px-2 border-b border-gray-200">Amount</th>
                        <th className="text-right py-2 px-2 border-b border-gray-200">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedStudent.fees || []).map((f: any) => (
                        <tr key={f.paymentId}>
                          <td className="py-2 px-2 border-b border-gray-100">{f.name}</td>
                          <td className="py-2 px-2 border-b border-gray-100 text-right">
                            {fmtCurrency(f.amount)}
                          </td>
                          <td className="py-2 px-2 border-b border-gray-100 text-right">
                            {String(f.status || "pending").toUpperCase()}
                          </td>
                        </tr>
                      ))}
                      <tr className="summary-row">
                        <td className="py-2 px-2 text-sm font-semibold">Total</td>
                        <td className="py-2 px-2 text-right text-sm font-semibold">
                          {fmtCurrency(selectedStudent.totalAmount)}
                        </td>
                        <td className="py-2 px-2" />
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-[11px] text-gray-500">
                  This is a system-generated challan for other payments. No signature is required.
                </div>
              </div>
            </div>

            {/* Dialog actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button
                label="Print Challan"
                icon="pi pi-print"
                className="p-button-outlined p-button-secondary"
                onClick={handlePrint}
              />
              <Button label="Close" className="p-button-text" onClick={() => setDetailVisible(false)} />
            </div>
          </div>
        ) : (
          <div>No student selected</div>
        )}
      </Dialog>

      {/* Collect dialog (unchanged) */}
      <Dialog
        header={`Collect Payment — ${selectedStudent?.studentName ?? ""}`}
        visible={collectVisible}
        style={{ width: "52vw", maxWidth: "800px" }}
        onHide={() => setCollectVisible(false)}
      >
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Collect payment for</div>
                <div className="text-lg font-semibold">{selectedStudent.studentName}</div>
                <div className="text-xs text-gray-500 mt-1">{selectedStudent.email}</div>
              </div>
              <div className="text-sm text-gray-400">{new Date().toLocaleDateString()}</div>
            </div>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <div className="space-y-3">
                {(selectedStudent.fees || []).map((f: any) => {
                  const due = Number(f.dueAmount ?? 0);
                  const alreadyPaid = String(f.status || "").toLowerCase() === "paid" || due <= 0;

                  return (
                    <div
                      key={f.paymentId}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{f.name}</div>
                        <div className="text-xs text-gray-500">
                          Status: {String(f.status || "pending").toUpperCase()}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 w-full md:w-auto md:justify-end">
                        <div className="flex flex-col items-start md:items-end w-full md:w-40">
                          <div className="text-xs text-gray-500 mb-1">Due</div>
                          <div className="w-full max-w-xs">
                            <InputNumber
                              value={due}
                              mode="decimal"
                              className="w-full"
                              inputClassName="w-full text-right"
                              disabled
                            />
                          </div>
                        </div>

                        <div className="flex-shrink-0 w-full md:w-auto">
                          <Button
                            label={alreadyPaid ? "Collected" : "Collect"}
                            icon={alreadyPaid ? "pi pi-check" : "pi pi-credit-card"}
                            className={`w-full md:w-auto ${
                              alreadyPaid ? "p-button-secondary" : "p-button-primary"
                            }`}
                            onClick={() => handleCollect(f.paymentId, due)}
                            loading={Boolean(collecting[f.paymentId])}
                            disabled={alreadyPaid}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="text-xs text-gray-500 mt-2">
              Note: The due amount is read-only. Clicking Collect will record the full due amount as paid.
            </div>
          </div>
        ) : (
          <div>No student selected</div>
        )}
      </Dialog>

      <ToastContainer />
    </div>
  );
}

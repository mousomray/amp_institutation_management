"use client";

import React, { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { useRouter } from "next/navigation";
import { Dialog } from "primereact/dialog";
import SingleStudentFees from "@/components/institution/SingleStudentFees";
import AddPayment from "@/components/institution/AddPayment";
import AddOtherFees from "@/components/institution/AddOtherFees";
import { Menu } from "primereact/menu";
import SetInstallmentFrom from "@/components/institution/SetInstallmentFrom";

export default function StudentFeesPage() {
  const [data, setData] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchDebounceRef = React.useRef<any>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedFeesId, setSelectedFeesId] = useState<string | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const [installmentVisible, setInstallmentVisible] = useState(false)
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null)
  const [otherVisible, setOtherVisible] = useState(false);
  const [selectedOtherEnrollmentId, setSelectedOtherEnrollmentId] = useState<string | null>(null);

  // shared menu ref (useRef must be at top level of component)
  const [menuRow, setMenuRow] = useState<any>(null);
  const menuRef = useRef<Menu | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, rows, searchTerm]);

  // debounce globalFilter -> searchTerm
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    // reset to first page when user changes search text
    if (page !== 1) setPage(1);
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm((globalFilter || "").trim());
    }, 500);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const params: any = { page, limit: rows };
      if (searchTerm) params.search = searchTerm;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/student-fees-ledger/list-student-fees`, {
        params,
        headers,
      });

      // API shape: { success, total, data: [...] }
      setData(res.data.data || []);
      setTotalRecords(res.data.total ?? 0);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load student fees");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // student renderer: use row.student and receipt from API
  const studentBody = (row: any) => {
    const student = row.student;
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-600">
            {student?.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-medium text-gray-800">{student?.name || "-"}</span>
          <span className="text-xs text-gray-500">
            {row.receipt?.receiptNo ? `Receipt: ${row.receipt.receiptNo}` : ""}
          </span>
        </div>
      </div>
    );
  };

  // course renderer: single course + enrollment netPayableAmount
  const coursesBody = (row: any) => {
    const course = row.course;
    const enrollment = row.enrollment;
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm text-gray-700">{course?.name || "-"}</div>
        <div className="text-xs text-gray-500">Duration: {course?.duration || "-"}</div>

        <div className="flex justify-between items-center mt-1 px-2">
          <div className="text-xs text-gray-500">Course Fee</div>
          <div className="text-sm font-semibold">₹{course?.fees ?? "-"}</div>
        </div>

        <div className="flex justify-between items-center px-2">
          <div className="text-xs text-gray-500">Net Payable</div>
          <div className="text-sm font-semibold">₹{enrollment?.netPayableAmount ?? "-"}</div>
        </div>
      </div>
    );
  };

  // heads renderer (was masterFeesBody): show fees heads and subtotal
  const headsBody = (row: any) => {
    if (!row.heads || !row.heads.length) return <span className="text-sm text-gray-500">—</span>;
    const headsSum = (row.heads || []).reduce((s: number, h: any) => s + (h?.amount ?? 0), 0);
    return (
      <div className="flex flex-col gap-1">
        <div className="bg-white/50 rounded border border-gray-100">
          {(row.heads || []).map((h: any, i: number) => (
            <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50">
              <div className="text-sm text-gray-700">{h?.feesHeadName ?? "-"}</div>
              <div className="text-sm font-medium text-gray-900">₹{h?.amount ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-1 px-2">
          <div className="text-xs text-gray-500">Heads Total</div>
          <div className="text-sm font-semibold">₹{headsSum}</div>
        </div>
      </div>
    );
  };

  // currency formatter
  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

  // improved payment type badge with icon
  const paymentTypeBody = (row: any) => {
    const type = String(row?.paymentType ?? "DUE").toUpperCase();
    const cls =
      type === "INSTALLMENT"
        ? "bg-indigo-50 text-indigo-700"
        : type === "FULL"
          ? "bg-green-50 text-green-700"
          : "bg-gray-50 text-gray-700";
    const icon = type === "INSTALLMENT" ? "pi pi-clock" : type === "FULL" ? "pi pi-wallet" : "pi pi-question";
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
        <i className={`${icon} text-sm`} />
        <span>{type}</span>
      </div>
    );
  };

  // nicer status pill with icon
  const statusBody = (row: any) => {
    const s = String(row?.status ?? "DUE").toUpperCase();
    const cls =
      s === "PAID"
        ? "bg-green-100 text-green-800 border-green-200"
        : s === "PARTIAL"
          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
          : "bg-red-100 text-red-800 border-red-200";
    const icon = s === "PAID" ? "pi pi-check" : s === "PARTIAL" ? "pi pi-info-circle" : "pi pi-clock";
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>
        <i className={`${icon} text-sm`} />
        <span>{s}</span>
      </div>
    );
  };

  // optional small renderers for currency columns
  const totalBody = (r: any) => <div className="font-semibold text-gray-800">{fmt(r.totalAmount)}</div>;
  const paidBody = (r: any) => <div className="text-green-700 font-medium">{fmt(r.paidAmount)}</div>;
  const dueBody = (r: any) => <div className="text-red-700 font-medium">{fmt(r.dueAmount)}</div>;

  const header = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Student Fees</h2>
        <p className="text-sm text-white/90">List of student fees with course & master fees</p>
      </div>

      <div className="flex items-center gap-3">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search by student, course..." />
        </IconField>
      </div>
    </div>
  );

  const actionTemplate = (row: any) => {
    const menuRef = useRef<Menu | null>(null);

    // status flags
    const isPaid = row?.status === "PAID";

    // detect if installments are assigned for this student fees row
    const hasInstallments = Array.isArray(row?.installments) ? row.installments.length > 0 : !!row?.hasInstallments;

    // detect paymentType sent by API
    const isInstallmentType = String(row?.paymentType ?? "").toUpperCase() === "INSTALLMENT";

    // Rules updated:
    // - Hide Full Payment only when paymentType === "INSTALLMENT"
    // - Do NOT disable Full Payment when status is PARTIAL (removed previous PARTIAL check)
    // - Full Payment disabled only when already PAID
    const hideFull = isInstallmentType; // was: isInstallmentType || hasInstallments
    const disabledFull = isPaid; // removed isPartial check
    const disabledInstallment = isPaid;

    const items: any[] = [
      {
        label: "View Details",
        icon: "pi pi-eye",
        command: () => {
          setSelectedFeesId(row._id);
          setDetailVisible(true);
        },
      },
    ];

    if (!hideFull) {
      items.push({
        label: "Full Payment",
        icon: "pi pi-credit-card",
        disabled: disabledFull,
        command: () => {
          setSelectedPaymentId(row._id);
          setPaymentVisible(true);
        },
      });
    }

    items.push({
      label: "Installment Payment",
      icon: "pi pi-credit-card",
      disabled: disabledInstallment,
      command: () => {
        setSelectedInstallmentId(row._id);
        setInstallmentVisible(true);
      },
    });

    // Add Other Payment option (uses enrollment id from row.enrollment._id)
    items.push({
      label: "Add Other Payment",
      icon: "pi pi-plus",
      command: () => {
        setSelectedOtherEnrollmentId(row?.enrollment?._id ?? null);
        setOtherVisible(true);
      },
    });

    return (
      <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
        <Menu model={items} popup ref={menuRef} />
        <Button
          icon="pi pi-ellipsis-v"
          rounded
          text
          onClick={(e) => {
            e.stopPropagation();
            setMenuRow(row);
            menuRef.current?.toggle(e);
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="card bg-white p-4 rounded-lg shadow-md">
        <div className="mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
            {header}
          </div>
        </div>

        <div className="w-full overflow-auto">
          <DataTable
            value={data}
            loading={loading}
            paginator
            lazy
            first={(page - 1) * rows}
            rows={rows}
            totalRecords={totalRecords}
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPage={(e) => {
              if (e.page !== undefined) setPage(e.page + 1);
              if (e.rows !== undefined) setRows(e.rows);
            }}
            className="shadow-sm rounded-lg"
            rowHover
            stripedRows
            globalFilter={globalFilter}
            emptyMessage="No student fees found"
            selectionMode="single"
            rowClassName={(data) => "odd:bg-white even:bg-gray-50"}
          >
            <Column header="Student" body={studentBody} style={{ width: "15%" }} />
            <Column header="Course" body={coursesBody} style={{ width: "15%" }} />
            <Column header="Heads" body={headsBody} style={{ width: "20%" }} />
            <Column field="totalAmount" header="Total" body={totalBody} style={{ width: "10%" }} />
            <Column field="paidAmount" header="Paid" body={paidBody} style={{ width: "10%" }} />
            <Column field="dueAmount" header="Due" body={dueBody} style={{ width: "10%" }} />
            <Column header="Type" body={paymentTypeBody} style={{ width: "10%" }} />
            <Column header="Status" body={statusBody} style={{ width: "10%" }} />
            <Column header="" body={actionTemplate} style={{ width: "5%" }} />
          </DataTable>
        </div>

        <Dialog
          header="Student Fees Details"
          visible={detailVisible}
          style={{ width: "90vw", maxWidth: "1400px" }}
          onHide={() => setDetailVisible(false)}
          maximizable
        >
          <SingleStudentFees id={selectedFeesId} onClose={() => setDetailVisible(false)} />
        </Dialog>

        <Dialog
          header="Add Payment"
          visible={paymentVisible}
          style={{ width: "90vw", maxWidth: "500px" }}
          onHide={() => setPaymentVisible(false)}
        >
          <AddPayment
            id={selectedPaymentId}
            studentFeesId={selectedPaymentId}
            onClose={() => setPaymentVisible(false)}
            onSuccess={() => {
              setPaymentVisible(false);
              fetchList();
            }}
          />
        </Dialog>

        <Dialog
          header="Add Other Payment"
          visible={otherVisible}
          style={{ width: "90vw", maxWidth: "800px" }}
          onHide={() => setOtherVisible(false)}
        >
          <AddOtherFees
            enrollmentId={selectedOtherEnrollmentId}
            onClose={() => setOtherVisible(false)}
            onSuccess={() => {
              setOtherVisible(false);
              fetchList();
            }}
          />
        </Dialog>

        <Dialog 
          header="Set Installment"
          style={{ width: "90vw", maxWidth: "500px" }} 
          onHide={() => setInstallmentVisible(false)} 
          visible={installmentVisible}
        >
          <SetInstallmentFrom
            studentFeesId={selectedInstallmentId}
            onClose={() => setInstallmentVisible(false)}
            onAssign={() => {
              setInstallmentVisible(false);
              fetchList();
            }}
          />
        </Dialog>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

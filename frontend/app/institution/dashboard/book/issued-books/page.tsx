"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import microInstance from "@/service/micro.service";
import axios from "axios";
import { toast , ToastContainer } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useRouter } from "next/navigation";
import { Menu } from "primereact/menu"; // added

export default function IssuedBooksTable() {
  const [allIssues, setAllIssues] = useState<any[]>([]); // full dataset from backend
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);
   const [page, setPage] = useState(1); // current page
  const [rows, setRows] = useState(5); // rows per page
  const [totalRecords, setTotalRecords] = useState(0);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  // helper: calculate per-day late fine only after due date
  const calcLateFine = (row: any) => {
    const toDateOnly = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };
    const dayMs = 1000 * 60 * 60 * 24;

    const bookFee = Number(row.book_fee || 0);
    const perDayFine = Number(row.late_fine || 0);

    // if already returned, fine = total - base
    if (row.status === "returned") {
      const total = Number(row.total_amount || 0);
      const fine = total - bookFee;
      return fine > 0 ? fine : 0;
    }

    // not returned: compute late days from today vs return_date
    const today = toDateOnly(new Date());
    const due = toDateOnly(new Date(row.return_date));
    if (today <= due) return 0;

    const diffDays = Math.ceil((today.getTime() - due.getTime()) / dayMs);
    return Math.max(0, diffDays) * perDayFine;
  };

  const currency = (n: number) =>
    (typeof n === "number" ? n : 0).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

  const bookFeeBody = (row: any) => <span>{currency(Number(row.book_fee || 0))}</span>;
  const lateFineBody = (row: any) => <span>{currency(calcLateFine(row))}</span>;
  const totalBody = (row: any) => {
    const total = Number(row.book_fee || 0) + calcLateFine(row);
    return <span className="font-semibold">{currency(total)}</span>;
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) fetchAllIssues();
  }, [token, page, rows]);

  // fetch full list (backend pagination not available)
  const fetchAllIssues = async () => {
    try {
      setLoading(true);
      const res = await microInstance.get("/api/bookissues", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // backend shape: { success, message, total, data: [...] } in sample
      const data = res.data?.data ?? [];
      setAllIssues(Array.isArray(data) ? data : []);
      setTotalRecords(res.data?.total ?? data.length ?? 0);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load issued books");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // client-side filtering by book.name and student.name
  const filtered = useMemo(() => {
    const q = (globalFilter || "").trim().toLowerCase();
    if (!q) return allIssues;
    return allIssues.filter((it: any) => {
      const bName = String(it.book?.name ?? "").toLowerCase();
      const sName = String(it.student?.name ?? it.studentName ?? "").toLowerCase();
      return bName.includes(q) || sName.includes(q);
    });
  }, [allIssues, globalFilter]);

  const handleReturn = (issue: any) => {
    if (issue.status === "returned") return;
    confirmDialog({
      message: `Mark book "${issue.book?.name || 'book'}" as returned?`,
      header: "Confirm Return",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-success",
      accept: async () => {
        try {
          const res = await microInstance.put(`/api/issues/return/${issue._id}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const payload = res.data || {};
          if (payload.isLate) {
            toast.info(payload.message || "Book returned late.");
          } else {
            toast.success(payload.message || "Book returned successfully");
          }
          fetchAllIssues();
        } catch (err: any) {
          if (axios.isAxiosError(err)) {
            toast.error(err.response?.data?.message || "Return failed");
          } else {
            toast.error("Unexpected error occurred");
          }
        }
      },
      reject: () => {
        toast.info("Return cancelled");
      },
    });
  };

  const openRowMenu = (row: any, event: any) => {
    const items = [
      {
        label: row.status === "returned" ? "Already Returned" : "Return",
        icon: "pi pi-check",
        disabled: row.status === "returned",
        command: () => handleReturn(row),
      },
    ];
    setMenuModel(items);
    // show popup menu at click position
    menu.current && menu.current.toggle(event);
  };

  const menu = useRef<any>(null);
  const [menuModel, setMenuModel] = useState<any[]>([]);

  const imageSrc = (img?: string) =>
    img
      ? img.startsWith("http")
        ? img
        : `${(process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/+$/, "")}/${img.replace(/^\/+/, "").replace(/\\/g, "/")}`
      : null;

  const bookTemplate = (row: any) => {
    const src = imageSrc(row.book?.image);
    return (
      <div className="flex items-center gap-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={row.book?.name} className="w-12 h-12 object-cover rounded" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">No</div>
        )}
        <div className="min-w-0">
          <div className="font-semibold truncate">{row.book?.name || row.bookName || "-"}</div>
          <div className="text-sm text-gray-500 truncate">{row.book?.authorName || "-"}</div>
        </div>
      </div>
    );
  };

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        onClick={(e) => openRowMenu(rowData, e)}
        aria-label="Actions"
      />
    </div>
  );

  const header = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <i className="pi pi-list"></i>
          Issued Books
        </h2>
        <p className="text-sm text-blue-50 mt-1">Manage and track issued books</p>
      </div>

      <IconField iconPosition="left" className="w-full md:w-auto">
        <InputIcon className="pi pi-search" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by book or student..."
          className="w-full md:w-80"
        />
      </IconField>
    </div>
  );

  const studentTemplate = (row: any) =>
    row.student ? `${row.student.name || row.student.fullName || ""}${row.student.studentId ? ` (${row.student.studentId})` : ""}` : (row.studentName || "-");

  const actualReturnTemplate = (row: any) =>
    row.actual_return_date ? formatDate(row.actual_return_date) : <span className="text-gray-400">null</span>;

  return (
    <div className="card bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <Menu model={menuModel} popup ref={menu} />
      <DataTable
        value={allIssues}
        loading={loading}
        paginator
        lazy
        first={(page - 1) * rows}      // starting index
        rows={rows}
        totalRecords={totalRecords}     // total from backend
        rowsPerPageOptions={[5, 10, 25, 50]}
        onPage={(e) => {
          setPage((e.page ?? 0) + 1);  // e.page is zero-based
          setRows(e.rows ?? 5);
        }}
        stripedRows
        responsiveLayout="scroll"
        header={header}
         emptyMessage="No issued books found"
        selectionMode="single"
        className="text-sm"
      >
        <Column header="Book" body={bookTemplate} />
        <Column header="Student" body={studentTemplate} />
        {/* Base Rate, Late Fine (calculated), Total */}
        <Column header="Base Rate" body={bookFeeBody} />
        <Column header="Late Fine" body={lateFineBody} />
        <Column header="Total" body={totalBody} />
        {/* Dates */}
        <Column field="return_date" header="Return Date" body={(r) => formatDate(r.return_date)} />
        <Column header="Actual Return" body={actualReturnTemplate} />
        {/* Status + actions */}
        <Column field="status" header="Status" />
        <Column header="Actions" body={actionTemplate} style={{ width: "4rem" }} />
      </DataTable>

      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}

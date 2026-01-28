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
import { Dialog } from "primereact/dialog";
import { Menu } from "primereact/menu"; // added

export default function IssuedBooksTable() {
  const [allIssues, setAllIssues] = useState<any[]>([]); // full dataset from backend
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);

  // fine modal state
  const [fineModalVisible, setFineModalVisible] = useState(false);
  const [currentIssueForFine, setCurrentIssueForFine] = useState<any | null>(null);
  const [fineValue, setFineValue] = useState<number>(0);

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) fetchAllIssues();
  }, [token]);

  // fetch full list (backend pagination not available)
  const fetchAllIssues = async () => {
    try {
      setLoading(true);
      const res = await microInstance.get("/api/bookissues", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // backend shape: { success, message, total, data: [...] } in sample
      const data = res.data?.data ?? res.data ?? [];
      setAllIssues(Array.isArray(data) ? data : []);
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
            setCurrentIssueForFine(issue);
            setFineValue(typeof payload.fine === "number" ? payload.fine : 0);
            setFineModalVisible(true);
            toast.info("Book is returned late. Please set fine.");
          } else {
            toast.success(payload.message || "Book returned successfully");
            fetchAllIssues();
          }
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

  const submitFine = async () => {
    if (!currentIssueForFine) return;
    try {
      const id = currentIssueForFine._id;
      const res = await microInstance.put(`/api/issues/set-fine/${id}`, { fine: Number(fineValue) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Fine set successfully");
      setFineModalVisible(false);
      setCurrentIssueForFine(null);
      setFineValue(0);
      fetchAllIssues();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Set fine failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  const openRowMenu = (row: any, event: any) => {
    const items = [
      {
        label: row.status === "returned" ? "Already Returned" : "Return",
        icon: "pi pi-check",
        disabled: row.status === "returned",
        command: () => handleReturn(row),
      },
      {
        label: "Set Fine",
        icon: "pi pi-money-bill",
        command: () => {
          setCurrentIssueForFine(row);
          setFineValue(0);
          setFineModalVisible(true);
        },
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
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Issued Books</h2>
        <p className="text-sm text-black">List of issued books</p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by book title or student name..."
        />
      </IconField>
    </div>
  );

  const studentTemplate = (row: any) =>
    row.student ? `${row.student.name || row.student.fullName || ""}${row.student.studentId ? ` (${row.student.studentId})` : ""}` : (row.studentName || "-");

  const actualReturnTemplate = (row: any) =>
    row.actual_return_date ? formatDate(row.actual_return_date) : <span className="text-gray-400">null</span>;

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <Menu model={menuModel} popup ref={menu} />
      <DataTable
        value={filtered}
        loading={loading}
        paginator
        rows={5}
        rowsPerPageOptions={[5, 10, 25, 50]}
        stripedRows
        responsiveLayout="scroll"
        header={header}
        emptyMessage="No issued books found"
        onRowClick={(e) => router.push(`/institution/dashboard/book/issued-books/${e.data._id}`)}
        selectionMode="single"
      >
        <Column header="Book" body={bookTemplate} />
        <Column header="Student" body={studentTemplate} />
        <Column field="base_rate" header="Base Rate" />
        <Column field="fine" header="Fine" />
        <Column field="total_amount" header="Total" />
        <Column field="issue_duration_days" header="Issue Days" />
        <Column field="delay_days" header="Delay Days" />
        <Column field="return_date" header="Return Date" body={(r) => formatDate(r.return_date)} />
        <Column header="Actual Return" body={actualReturnTemplate} />
        <Column field="issue_date" header="Issued At" body={(r) => formatDate(r.issue_date || r.createdAt)} />
        <Column field="status" header="Status" />
        <Column header="Actions" body={actionTemplate} style={{ width: "4rem" }} />
      </DataTable>

      <ConfirmDialog />
      <Dialog header="Set Fine" visible={fineModalVisible} style={{ width: "400px" }} onHide={() => setFineModalVisible(false)}>
        <div className="space-y-3">
          <p className="text-sm">Enter fine amount for returned late book:</p>
          <input
            type="number"
            value={fineValue}
            onChange={(e) => setFineValue(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setFineModalVisible(false)} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={submitFine} className="px-4 py-2 bg-primary text-white rounded">Save Fine</button>
          </div>
        </div>
      </Dialog>

      <ToastContainer />
    </div>
  );
}

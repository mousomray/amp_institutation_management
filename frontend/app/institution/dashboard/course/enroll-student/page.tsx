"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { formatDate } from "@/helper/DateTime";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">🎓</div>
    <h2 className="text-xl font-semibold text-gray-700">No Enrollments</h2>
    <p className="text-gray-500 mt-2 max-w-md">No enrollment records found.</p>
  </div>
);

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const [pagination, setPagination] = useState({ page: 1, rows: 5, total: 0 });
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchEnrollments();
  }, [token, pagination.page, pagination.rows, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/student-course/get-all-enrollments", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const dataArr = res?.data?.data ?? [];
      const pag = res?.data?.pagination ?? {};

      setEnrollments(dataArr);
      setPagination((prev) => ({
        ...prev,
        total: pag?.totalRecords ?? res?.data?.total ?? prev.total,
        page: pag?.currentPage ?? prev.page,
        rows: pag?.limit ?? prev.rows,
      }));
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to load enrollments");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  };

  const studentTemplate = (row: any) => {
    const student = row.student;

    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      const letters = parts.map((p) => p.charAt(0));
      return letters.slice(0, 2).join("").toUpperCase();
    };

    const stringToBg = (str?: string) => {
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
      if (!str) return colors[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(student?.name || student?.studentId || "");
    const bgClass = stringToBg(student?.name || student?.studentId || "");

    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border overflow-hidden relative flex items-center justify-center flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${bgClass}`}>
            {initials || <i className="pi pi-user text-white" />}
          </div>
          {student?.photo ? (
            <img
              src={student.photo}
              alt={student?.name ?? "student"}
              className="w-10 h-10 rounded-full object-cover absolute top-0 left-0"
              onError={(e) => {(e.currentTarget as HTMLImageElement).style.display = "none";}}
            />
          ) : null}
        </div>

        <div className="flex flex-col">
          <span className="font-medium">{student?.name || "-"}</span>
          <span className="text-xs text-gray-500">{student?.email || ""}</span>
        </div>
      </div>
    );
  };

  const courseTemplate = (row: any) => {
    const course = row.course;

    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    };

    const stringToBg = (str?: string) => {
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
      if (!str) return colors[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const initials = getInitials(course?.name || course?.courseName || "");
    const bgClass = stringToBg(course?.name || course?.courseName || "");

    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded overflow-hidden relative flex items-center justify-center flex-shrink-0">
          <div className={`h-10 w-10 rounded flex items-center justify-center text-white font-semibold ${bgClass}`}>
            {initials || <i className="pi pi-book text-white" />}
          </div>
          {course?.image ? (
            <img
              src={course.image}
              alt={course?.name}
              className="h-10 w-10 object-cover rounded absolute top-0 left-0"
              onError={(e) => {(e.currentTarget as HTMLImageElement).style.display = "none";}}
            />
          ) : null}
        </div>

        <div className="flex flex-col">
          <span className="font-medium">{course?.name}</span>
          <span className="text-xs text-gray-500">{course?.duration}</span>
        </div>
      </div>
    );
  };

  const ledgerTemplate = (row: any) => {
    const l = row.ledgerSummary || {};
    return (
      <div className="flex flex-col text-right">
        <span className="font-medium">{fmt(l.totalAmount)}</span>
        <span className="text-xs text-green-700">{fmt(l.paidAmount)} paid</span>
        <span className="text-xs text-red-600">{fmt(l.dueAmount)} due</span>
      </div>
    );
  };

  const statusTemplate = (row: any) => {
    const s = row.ledgerSummary?.status ?? "DUE";
    const cls = s === "PAID" ? "text-green-700" : s === "PARTIAL" ? "text-yellow-700" : "text-red-700";
    return <span className={`font-semibold ${cls}`}>{s}</span>;
  };

  const fmt = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Enrollments</h2>
        <p className="text-sm text-black">List of all student enrollments</p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by student name"
          className="p-inputtext-sm"
        />
      </IconField>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={enrollments}
          header={header}
          lazy
          paginator
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[3,5,10,25,50]}
          onPage={(e) =>
            setPagination((prev) => ({ ...prev, page: (e.page ?? 0) + 1, rows: e.rows ?? prev.rows }))
          }
          responsiveLayout="scroll"
          emptyMessage="No enrollments found"
        >
          <Column field="invoiceNo" header="Invoice No" />
          <Column header="Enrollment Date" body={(r: any) => formatDate(r.enrollmentDate)} />
          <Column header="Entry Date" body={(r: any) => formatDate(r.entryDate)} />
          <Column header="Student" body={studentTemplate} />
          <Column header="Course" body={courseTemplate} />
          <Column header="Ledger" body={ledgerTemplate} style={{ minWidth: "160px" }} />
          <Column header="Status" body={statusTemplate} style={{ width: "120px" }} />
        </DataTable>

        {enrollments.length === 0 && !loading && <EmptyState />}

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

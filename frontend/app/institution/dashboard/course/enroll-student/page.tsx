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
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setEnrollments(res.data.data || []);
      setPagination((prev) => ({ ...prev, total: res.data.total || 0 }));
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

  const studentTemplate = (row: any) => (
    <div className="flex flex-col">
      <span className="font-medium">{row.student?.name}</span>
      <span className="text-xs text-gray-500">{row.student?.email}</span>
    </div>
  );

  const courseTemplate = (row: any) => (
    <div className="flex items-center gap-2">
      {row.course?.image ? (
        // simple img tag to avoid Next/Image SSR issues inside tables
        <img src={row.course.image} alt={row.course?.name} className="h-10 w-10 object-cover rounded" />
      ) : (
        <div className="h-10 w-10 bg-gray-200 rounded" />
      )}
      <div className="flex flex-col">
        <span className="font-medium">{row.course?.name}</span>
        <span className="text-xs text-gray-500">{row.course?.duration}</span>
      </div>
    </div>
  );

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
          placeholder="Search enrollments"
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
          rowsPerPageOptions={[5, 10, 25, 50]}
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
        </DataTable>

        {enrollments.length === 0 && !loading && <EmptyState />}

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

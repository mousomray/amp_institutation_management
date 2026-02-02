"use client";

import React, { useEffect, useState } from "react";
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
import { useRef } from "react";
import { Menu } from "primereact/menu";
import SetInstallmentFrom from "@/components/institution/SetInstallmentFrom";

export default function StudentFeesPage() {
  const [data, setData] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
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


  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchList();
  }, [token, page, rows]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/institution/list-student-fees", {
        params: { page, limit: rows },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data || []);
      setTotalRecords(res.data.totalCount ?? res.data.data?.length ?? 0);
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

  // Improved Master Fees renderer: neat two-column list + subtotal
  const masterFeesBody = (row: any) => {
    if (!row.masterFees || !row.masterFees.length) return <span className="text-sm text-gray-500">—</span>;

    const masterSum = (row.masterFees || []).reduce((s: number, m: any) => s + (m?.amount ?? 0), 0);

    return (
      <div className="flex flex-col gap-1">
        <div className="bg-white/50 rounded border border-gray-100">
          {(row.masterFees || []).map((m: any, i: number) => (
            <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50">
              <div className="text-sm text-gray-700">{m?.fee?.name ?? "-"}</div>
              <div className="text-sm font-medium text-gray-900">₹{m?.amount ?? 0}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-1 px-2">
          <div className="text-xs text-gray-500">Master Total</div>
          <div className="text-sm font-semibold">₹{masterSum}</div>
        </div>
      </div>
    );
  };

  // nicer status pill
  const statusBody = (row: any) => {
    const cls =
      row.status === "PAID"
        ? "bg-green-100 text-green-800"
        : row.status === "PARTIAL"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800";
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{row.status ?? "DUE"}</span>;
  };


  // Enhanced header layout
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
    const menuRef = useRef<Menu>(null);

    const items = [
      {
        label: "View Details",
        icon: "pi pi-eye",
        command: () => {
          setSelectedFeesId(row._id);
          setDetailVisible(true);
        },
      },
      {
        label: "Full Payment",
        icon: "pi pi-credit-card",
        command: () => {
          setSelectedPaymentId(row._id);
          setPaymentVisible(true);
        },
      },

      {
        label: "Installment Payment",
        icon: "pi pi-credit-card",
        command: () => {
          setSelectedInstallmentId(row._id)
          setInstallmentVisible(true)
        },
      },
    ];

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex justify-center"
      >
        <Menu model={items} popup ref={menuRef} />

        <Button
          icon="pi pi-ellipsis-v"
          rounded
          text
          onClick={(e) => menuRef.current?.toggle(e)}
        />
      </div>
    );
  };

  return (
    <div className="card bg-white p-4 rounded-lg shadow-md">
      <div className="mb-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
          {header}
        </div>
      </div>

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
          setPage((e.page ?? 0) + 1);
          setRows(e.rows ?? 5);
        }}
        className="shadow-sm rounded-lg"
        tableStyle={{ minWidth: "900px" }}
        rowHover
        stripedRows
        responsiveLayout="scroll"
        globalFilter={globalFilter}
        emptyMessage="No student fees found"
        selectionMode="single"
      >
        <Column header="Student" body={(r) => <div className="font-medium text-gray-800">{r.student?.name ?? "-"}</div>} />
        <Column header="Course" body={(r) => <div className="text-sm text-gray-700">{r.course?.name ?? "-"}</div>} />
        <Column field="courseFee" header="Course Fee" body={(r) => <div className="font-medium">₹{r.courseFee ?? 0}</div>} />
        <Column header="Master Fees" body={masterFeesBody} style={{ minWidth: "300px" }} />
        <Column field="totalAmount" header="Total" body={(r) => <div className="font-semibold">₹{r.totalAmount ?? 0}</div>} />
        <Column field="paidAmount" header="Paid" body={(r) => <div className="text-green-700 font-medium">₹{r.paidAmount ?? 0}</div>} />
        <Column field="dueAmount" header="Due" body={(r) => <div className="text-red-700 font-medium">₹{r.dueAmount ?? 0}</div>} />
        <Column header="Status" body={statusBody} />
        {/* <Column field="createdAt" header="Created At" body={(r) => formatDate(r.createdAt)} /> */}
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <Dialog
        header="Student Fees Details"
        visible={detailVisible}
        style={{ width: "50vw" }}
        onHide={() => setDetailVisible(false)}
      >
        <SingleStudentFees id={selectedFeesId} onClose={() => setDetailVisible(false)} />
      </Dialog>

      <Dialog
        header="Add Payment"
        visible={paymentVisible}
        style={{ width: "50vw" }}
        onHide={() => setPaymentVisible(false)}
      >
        <AddPayment
          id={selectedPaymentId}
          onClose={() => setPaymentVisible(false)}
          onSuccess={() => {
            setPaymentVisible(false);
            fetchList(); // refresh list after payment
          }}
        />
      </Dialog>

      <Dialog style={{width: "30vw"}} onHide={() => setInstallmentVisible(false)} visible={installmentVisible}>
        <SetInstallmentFrom />
      </Dialog>

      <ToastContainer />
    </div>
  );
}

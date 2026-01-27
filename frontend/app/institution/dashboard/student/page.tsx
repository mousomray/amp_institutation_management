"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import EditStudent from "@/components/institution/EditStudent";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast , ToastContainer } from "react-toastify";
import { formatDateTime,formatDate } from "@/helper/DateTime";
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useRouter } from "next/navigation";





export default function StudentTable() {
  const [students, setStudents] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const router = useRouter()

  // 🔥 PAGINATION STATE
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);

  const [token, setToken] = useState<string | null>(null);

  /* ================= GET TOKEN ================= */
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (token) {
      studentGet();
    }
  }, [token, page, rows]);

  const studentGet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/institution/get-student", {
        params: {
          page,
          limit: rows,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStudents(res.data.data);
      setTotalRecords(res.data.totalCount);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load students");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIONS ================= */
  const handleUpdate = (rowData: any) => {
  setSelectedStudent(rowData);
  setVisible(true);
};

const onRowClick = (e: any) => {
  router.push(`/institution/dashboard/student/${e.data._id}`);
};

    const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",

      accept: async () => {
        try {
         const res =  await axiosInstance.delete(`/institution/delete-student/${rowData._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          toast.success(res.data.message);
          await studentGet();
        } catch (error: any) {
          if (axios.isAxiosError(error)) {
            toast.error(error.response?.data?.message || "Delete failed");
          } else {
            toast.error("Unexpected error occurred");
          }
        }
      },

      reject: () => {
        toast.info("Delete cancelled");
      },
    });
  };
  /* ================= TEMPLATES ================= */
  const photoTemplate = (rowData: any) =>
    rowData.photo ? (
      <img
        src={rowData.photo}
        alt={rowData.name}
        className="w-10 h-10 rounded-full object-cover border"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border">
        <i className="pi pi-user text-gray-500"></i>
      </div>
    );

  const signatureTemplate = (rowData: any) => (
    <img src={rowData.signature} className="h-8 object-contain" />
  );

  const actionTemplate = (rowData: any) => (
  <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
    <Button
      icon="pi pi-pencil"
      rounded
      text
      severity="info"
      onClick={() => handleUpdate(rowData)}
    />
    <Button
      icon="pi pi-trash"
      rounded
      text
      severity="danger"
      onClick={() => confirmDelete(rowData)}
    />
  </div>
);

  /* ================= HEADER ================= */
  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Student Details</h2>
        <p className="text-sm text-black">Registered students list</p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search student..."
        />
      </IconField>
    </div>
  );

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <DataTable
       value={students}
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
  stripedRows
  responsiveLayout="scroll"
  globalFilter={globalFilter}
  header={header}
  emptyMessage="No students found"
  onRowClick={onRowClick}      
  selectionMode="single"
      >
        <Column field="studentId" header="Student ID" />
        <Column header="Photo" body={photoTemplate} />
        <Column field="name" header="Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone" />
        <Column
  field="dob"
  header="Date of Birth"
  body={(rowData) => formatDate(rowData.dob)}
/>
        <Column field="fatherName" header="Father Name" />
        <Column field="bloodGroup" header="Blood Group" />
        <Column field="admissionDate" body={(rowData) => formatDate(rowData.admissionDate)} header="Admission Date" />
        <Column header="Signature" body={signatureTemplate} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <Dialog
        header="Edit Student"
        visible={visible}
        style={{ width: "50vw" }}
        onHide={() => setVisible(false)}
      >
        <EditStudent onClose={() => setVisible(false)} student={selectedStudent} refetch={studentGet}/>
      </Dialog>
       <ConfirmDialog />
       <ToastContainer/>
    </div>
  );
}

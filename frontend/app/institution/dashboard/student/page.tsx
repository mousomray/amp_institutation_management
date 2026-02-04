"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { formatDate } from "@/helper/DateTime";
import EditStudent from "@/components/institution/EditStudent";
import { useRouter } from "next/navigation";

export default function StudentTable() {
  const router = useRouter();

  /* ================= STATE ================= */
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // ✅ Server pagination
  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  /* ================= GET TOKEN ================= */
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (token) fetchStudents();
  }, [token, pagination.page, pagination.rows]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/institution/get-student", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStudents(res.data.data);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination.total,
      }));
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
          const res = await axiosInstance.delete(
            `/institution/delete-student/${rowData._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          toast.success(res.data.message);
          fetchStudents();
        } catch {
          toast.error("Delete failed");
        }
      },
    });
  };

  /* ================= COLUMN TEMPLATES ================= */
  const photoTemplate = (rowData: any) =>
    rowData.photo ? (
      <img
        src={rowData.photo}
        alt={rowData.name}
        className="w-10 h-10 rounded-full object-cover border"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border">
        <i className="pi pi-user text-gray-500" />
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
          placeholder="Search Students"
          className="p-inputtext-sm"
        />
      </IconField>
    </div>
  );
  console.log("selected student", selectedStudent)

  /* ================= RENDER ================= */
  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <DataTable
        value={students}
        loading={loading}
        lazy
        paginator
        first={(pagination.page - 1) * pagination.rows}
        rows={pagination.rows}
        totalRecords={pagination.total}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onPage={(e) =>
          setPagination((prev) => ({
            ...prev,
            page: (e.page ?? 0) + 1,
            rows: e.rows ?? 5,
          }))
        }
        stripedRows
        responsiveLayout="scroll"
        header={header}
        emptyMessage="No students found"
        onRowClick={onRowClick}
        selectionMode="single"
        globalFilter={globalFilter}
        globalFilterFields={[
          "studentId",
          "name",
          "email",
          "phone",
          "fatherName",
          "bloodGroup",
        ]}
      >
        <Column field="studentId" header="Student ID" />
        <Column header="Photo" body={photoTemplate} />
        <Column field="name" header="Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone" />
        <Column header="DOB" body={(rowData) => formatDate(rowData.dob)} />
        <Column field="fatherName" header="Father Name" />
        <Column field="bloodGroup" header="Blood Group" />
        <Column
          header="Admission Date"
          body={(rowData) => formatDate(rowData.admissionDate)}
        />
        <Column header="Signature" body={signatureTemplate} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <Dialog
        header="Edit Student"
        visible={visible}
        style={{ width: "50vw" }}
        onHide={() => setVisible(false)}
        
      >
        <EditStudent
          onClose={() => setVisible(false)}
          student={selectedStudent}
          refetch={fetchStudents}
        />
      </Dialog>

      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}

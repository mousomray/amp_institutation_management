"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
//import { Toast } from "primereact/toast";
import { InputIcon } from 'primereact/inputicon';
import { IconField } from 'primereact/iconfield';
import { Dialog } from 'primereact/dialog';
import AdminInstutionEdit from "../../../../components/admin/AdminInstutionEdit";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import axiosInstance from "@/service/axios.service";
import { useAppSelector } from "@/lib/store/hooks"
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';


export default function InstitutionTable() {
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  //const toast = useRef<Toast>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);


  
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null);

  useEffect(() => {
      const storedToken = localStorage.getItem("admin-token");
       setToken(storedToken)
   }, []);

   useEffect(() => {
  if (token !== null) {
    institutionDataGet();
  }
}, [token, page, rows]);
 
 

  const institutionDataGet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/admin/all-institutions", {
        params: {
          page,
          limit: rows,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      setInstitutes(res.data.data);
      setTotalRecords(res.data.totalCount);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }



  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);

  };

  const handleUpdate = (rowData: any) => {
    setVisible(true);
    setSelectedInstitution(rowData);
  };

  const handleDelete = (rowData: any) => {
    setInstitutes((prev) =>
      prev.filter((item) => item.registrationNo !== rowData.registrationNo)
    );

  };


  console.log("edit data", selectedInstitution)


  const passwordTemplate = (rowData: any) => (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{rowData.password}</span>
      <Button
        icon="pi pi-copy"
        text
        rounded
        onClick={() => copyPassword(rowData.password)}
        tooltip="Copy Password"
      />
    </div>
  );



  const confirmDeleteInstitution = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",

      accept: async () => {
        try {
          await axiosInstance.delete(`/admin/delete-institution/${rowData._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          toast.success("Institution deleted successfully");
          institutionDataGet();
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


  const actionTemplate = (rowData: any) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-pencil"
        rounded
        text
        severity="info"
        onClick={() => handleUpdate(rowData)}
        tooltip="Update"
      />
      <Button
        icon="pi pi-trash"
        rounded
        text
        severity="danger"
        onClick={() => confirmDeleteInstitution(rowData)}
        tooltip="Delete"
      />
    </div>
  );



  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Institution Details
        </h2>
        <p className="text-sm text-black">
          Registered institutions list
        </p>
      </div>

      <div className="flex justify-content-end">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Keyword Search" />
        </IconField>
      </div>
    </div>
  );

  const FromHeader = (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800">
        Institution Form
      </h2>
      <p className="text-sm text-gray-500">
        Edit institution details
      </p>
    </div>
  )



  return (
    <div className="card bg-white p-4 rounded-lg shadow">


      <DataTable
        value={institutes}
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
        globalFilter={globalFilter}
        stripedRows
        responsiveLayout="scroll"
        emptyMessage="No institutions found"
      >
        <Column field="name" header="Institution Name" />
        <Column field="email" header="Email Address" />
        <Column field="phone" header="Phone No" />
        <Column
          field="website"
          header="Website"
          body={(row) => (
            <a
              href={row.website}
              target="_blank"
              className="text-blue-600 underline"
              rel="noreferrer"
            >
              {row.website}
            </a>
          )}
        />
        <Column field="establishDate" header="Establish Date" />
        <Column field="registrationNo" header="Registration No" />
        <Column header="Password" body={passwordTemplate} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <div className="card flex justify-content-center">
        <Dialog header={FromHeader} visible={visible} style={{ width: '50vw' }} onHide={() => { if (!visible) return; setVisible(false); }}>
          <AdminInstutionEdit
            institution={selectedInstitution}
            onClose={() => setVisible(false)}
            onSuccess={() => {
              setVisible(false);
              institutionDataGet();
            }}
          />

        </Dialog>
        <ConfirmDialog />
      </div>

      <ToastContainer />
    </div>
  );
}

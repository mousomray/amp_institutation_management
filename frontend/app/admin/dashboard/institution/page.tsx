"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { Dialog } from "primereact/dialog";
import { Menu } from "primereact/menu";
import { ConfirmDialog } from "primereact/confirmdialog";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import { formatDate } from "@/helper/DateTime";

import AdminInstutionEdit from "../../../../components/admin/AdminInstutionEdit";
import axiosInstance from "@/service/axios.service";

export default function InstitutionTable() {
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null);


  useEffect(() => {
    const storedToken = localStorage.getItem("admin-token");
    setToken(storedToken);
  }, []);


  useEffect(() => {
    if (token) institutionDataGet();
  }, [token, page, rows]);

  const institutionDataGet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/admin/all-institutions", {
        params: { page, limit: rows },
        headers: { Authorization: `Bearer ${token}` },
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
  };

  const handelSendPassword = async (id: any) => {
    try {
      const res = await axiosInstance.post(`/admin/send-password/${id}`)
      toast.success(res.data.message);
      institutionDataGet();
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




  const passwordTemplate = (rowData: any) => (
    <div className="flex justify-center">
      <Button
        label="Send"
        icon="pi pi-envelope"
        size="small"
        className="p-button-outlined p-button-info"
        onClick={() => handelSendPassword(rowData._id)}
      />
    </div>
  );




  const updateStatus = async (status: "ACTIVE" | "INACTIVE", rowData: any) => {
    try {
      const res = await axiosInstance.post(
        `/admin/update-status/${rowData._id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      institutionDataGet();
    } catch {
      toast.error("Status update failed");
    }
  };
  const actionTemplate = (rowData: any) => {
    const menuRef = React.useRef<Menu>(null);

    const items = [
      {
        label: "Edit",
        icon: "pi pi-pencil",
        command: () => {
          setSelectedInstitution(rowData);
          setVisible(true);
        },
      },
      {
        label: "Mark Active",
        icon: "pi pi-check",
        command: () => updateStatus("ACTIVE", rowData),
      },
      {
        label: "Mark Inactive",
        icon: "pi pi-times",
        className: "p-menuitem-danger",
        command: () => updateStatus("INACTIVE", rowData),
      },
    ];

    return (
      <>
        <Menu model={items} popup ref={menuRef} />
        <Button
          icon="pi pi-ellipsis-v"
          text
          rounded
          onClick={(e) => menuRef.current?.toggle(e)}
        />
      </>
    );
  };


  const header = (
    <div className="flex flex-col md:flex-row justify-between gap-3 bg-primary p-4 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Institution Details
        </h2>
        <p className="text-sm text-white/80">
          Registered institutions list
        </p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search text-gray-400" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search institution..."
          className="w-full md:w-64"
        />
      </IconField>
    </div>
  );

  return (
    <>
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
        rowHover
        pt={{
          thead: {
            style: {
              backgroundColor: "#ffffff",
            },
          },
        }}
        responsiveLayout="scroll"
        emptyMessage={
          <div className="text-center py-6 text-gray-500">
            No institutions found
          </div>
        }
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
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              {row.website}
            </a>
          )}
        />
        <Column header="Establish Date" body={(roeData) => (
          <span>{formatDate(roeData.establishDate)}</span>
        )} />
        <Column field="registrationNo" header="Registration No" />
        <Column header="Password" body={passwordTemplate} />
        <Column
          header="Status"
          body={(row) => (
            <div className="flex justify-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${row.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                  }`}
              >
                {row.status}
              </span>
            </div>
          )}
        />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <Dialog
        header="Edit Institution"
        visible={visible}
        style={{ width: "50vw" }}
        onHide={() => setVisible(false)}
      >
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
      <ToastContainer />
    </>
  );
}

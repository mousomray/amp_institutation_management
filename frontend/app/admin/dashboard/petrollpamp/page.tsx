"use client";

import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import { Menu } from "primereact/menu";
import { Dialog } from "primereact/dialog";
import { ConfirmDialog } from "primereact/confirmdialog";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import { formatDate } from "@/helper/DateTime";
import petrollInstance from "@/service/petroll.service";
import AdminPetrollEdit from "@/components/admin/AdminPetrollEdit";
import "react-toastify/dist/ReactToastify.css";

export default function PetrolPumpAdminTable() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin-token");
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) fetchAdmins();
  }, [token, page, rows]);

  // Debounce search input: when `globalFilter` changes wait briefly
  // then fetch with page reset to 1.
  useEffect(() => {
    const t = setTimeout(() => {
      // reset to first page when performing a new search
      setPage(1);
      if (token) fetchAdmins();
    }, 400);

    return () => clearTimeout(t);
  }, [globalFilter, token, rows]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      const params: any = { page, limit: rows };
      if (globalFilter && String(globalFilter).trim() !== "") {
        params.search = String(globalFilter).trim();
      }

      const res = await petrollInstance.get("/api/register/all-admins", {
        params,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      setAdmins(res.data.users || []);
      setTotalRecords(res.data.totalUsers || 0);
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

  const updateStatus = async (status: boolean, rowData: any) => {
    try {
      const res = await petrollInstance.patch(
        `/api/register/update-status/${rowData._id}`,
        { isActive: status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "Status updated successfully");
      fetchAdmins();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Status update failed");
      } else {
        toast.error("Status update failed");
      }
    }
  };

  const actionTemplate = (rowData: any) => {
    const menuRef = React.useRef<Menu>(null);

    const items = [
      {
        label: "Edit",
        icon: "pi pi-pencil",
        command: () => {
          setSelectedUserId(rowData._id);
          setVisible(true);
        },
      },
      // Removed Mark Active / Mark Inactive actions per request
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
          Petrol Pump Admin Details
        </h2>
        <p className="text-sm text-white/80">Registered admins list</p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search text-gray-400" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search admin..."
          className="w-full md:w-64"
        />
      </IconField>
    </div>
  );

  return (
    <>
      <DataTable
        value={admins}
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
        header={header}
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
            No admins found
          </div>
        }
      >
        <Column field="name" header="Name" />
        <Column field="email" header="Email Address" />
        <Column field="phone" header="Phone No" />
        <Column field="role" header="Role" />
        
        <Column
          header="Created At"
          body={(rowData) => <span>{formatDate(rowData.createdAt)}</span>}
        />
        <Column
          header="Status"
          body={(row) => (
            <div className="flex justify-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  row.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {row.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          )}
        />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

        <Dialog
          header="Edit Admin"
          visible={visible}
          style={{ width: "50vw" }}
          onHide={() => setVisible(false)}
        >
          <AdminPetrollEdit
            userId={selectedUserId}
            onClose={() => setVisible(false)}
            onSuccess={() => {
              setVisible(false);
              fetchAdmins();
            }}
          />
        </Dialog>

        <ConfirmDialog />
        <ToastContainer />
    </>
  );
}


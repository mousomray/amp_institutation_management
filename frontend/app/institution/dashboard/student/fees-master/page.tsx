"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ContextMenu } from "primereact/contextmenu";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import EditFeesMaster from "@/components/institution/EditFeesMaster";
import { formatDate } from "@/helper/DateTime";
import AddFeeMaster from "@/components/institution/AddFeeMaster"


export default function FeesMasterTable() {
  const [fees, setFees] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);

  const [token, setToken] = useState<string | null>(null);

  // dialog / edit state
  const [visible, setVisible] = useState(false);
  const [addFromVisible, setAddFromVisible] = useState(false)
  const [selectedFeesId, setSelectedFeesId] = useState<string | null>(null);
  // new: keep the whole row for edit/delete commands
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // ContextMenu ref
  const cm = useRef<any>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) fetchFees();
  }, [token, page, rows]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/institution/get-all-fees-master", {
        params: { page, limit: rows },
        headers: { Authorization: `Bearer ${token}` },
      });
      setFees(res.data.data || []);
      setTotalRecords(res.data.totalCount || (res.data.data?.length ?? 0));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load fees master");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // delete handler
  const handleDelete = async (id?: string | null) => {
    const feeId = id ?? selectedFeesId;
    if (!feeId) return;
    if (!token) return toast.error("Authentication token missing");
    if (!confirm("Are you sure you want to delete this fee?")) return;
    try {
      const res = await axiosInstance.delete(`/institution/delete-fees-master/${feeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Fee deleted");
      fetchFees();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to delete fee");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  // menu items for ContextMenu; commands use the stored selectedRow / selectedFeesId
  const menuItems = useMemo(() => [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedRow) {
          handleEdit(selectedRow);
        }
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => handleDelete(),
    },
  ], [selectedRow, selectedFeesId, token]);

  // open edit dialog (three-dots)
  const handleEdit = (rowData: any) => {
    setSelectedFeesId(rowData._id);
    setSelectedRow(rowData);
    setVisible(true);
  };

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setSelectedFeesId(rowData._id);
          setSelectedRow(rowData);
          cm.current?.show(e.nativeEvent);
        }}
      />
    </div>
  );

  const header = (
    <div className="flex justify-between items-center bg-primary  p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Fees Setting</h2>
        <p className="text-sm text-black">List of fees master entries</p>
      </div>

      <div className="flex flex-row gap-4 it">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search fees..." />
        </IconField>
        <Button
        onClick={() => setAddFromVisible(true)}
          unstyled
          className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50"
        >
          Add Fee Setting
        </Button>

      </div>
    </div>
  );

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <DataTable
        value={fees}
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
        emptyMessage="No fees master found"
        selectionMode="single"
      >
        <Column field="name" header="Name" />
        <Column field="amount" header="Amount" body={(row) => `₹${row.amount}`} />
        <Column field="createdAt" header="Created At" body={(row) => formatDate(row.createdAt)} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      {/* ContextMenu placed once; it will act on the selectedRow/selectedFeesId */}
      <ContextMenu model={menuItems} ref={cm} />

      <Dialog  visible={visible} style={{ width: "40vw" }} onHide={() => setVisible(false)}>
        <EditFeesMaster id={selectedFeesId} onClose={() => setVisible(false)} refetch={fetchFees} />
      </Dialog>
      <Dialog style={{ width: "40vw" }} onHide={()=> setAddFromVisible(false)} visible={addFromVisible}>
            <AddFeeMaster onfetchFees={fetchFees} onClose={() => setAddFromVisible(false)}/>
      </Dialog>

      <ToastContainer />
    </div>
  );
}

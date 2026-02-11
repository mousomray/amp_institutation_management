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
import { formatDate } from "@/helper/DateTime";
import { Tag } from "primereact/tag";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import AddOtherMaster from "@/components/institution/AddOtherMaster";

export default function OtherPaymentsTable() {
  const [payments, setPayments] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);

  const [token, setToken] = useState<string | null>(null);

  // dialog / edit state
  const [editVisible, setEditVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  // ContextMenu ref
  const cm = useRef<any>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, rows]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/other-payment/all-other-payment-master", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: rows },
      });
      const data = res.data?.data ?? [];
      setPayments(data);
      setTotalRecords(res.data?.totalCount ?? data.length);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load other payments");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        if (!token) return toast.error("Authentication token missing");
        try {
          // delete endpoint: attempt the obvious path used in similar modules
          const res = await axiosInstance.delete(`/other-payment/delete-other-payment-master/${rowData._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success(res.data?.message || "Deleted successfully");
          await fetchPayments();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  const menuItems = useMemo(
    () => [
      {
        label: "Edit",
        icon: "pi pi-pencil",
        command: () => {
          if (selectedRow) {
            setEditVisible(true);
          }
        },
      },
      {
        label: "Delete",
        icon: "pi pi-trash",
        command: () => {
          if (selectedRow) confirmDelete(selectedRow);
        },
      },
    ],
    [selectedRow]
  );

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex gap-2">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setSelectedRow(rowData);
          cm.current?.show(e.nativeEvent);
        }}
      />
    </div>
  );

  const header = (
    <div className="flex justify-between items-center bg-primary  p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Other Payments</h2>
        <p className="text-sm text-black">List of other payment master entries</p>
      </div>

      <div className="flex flex-row gap-4 it">
        <IconField iconPosition="left">
          <InputIcon className="pi pi-search" />
          <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search payments..." />
        </IconField>
        <Button
          onClick={() => setAddVisible(true)}
          unstyled
          className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded hover:bg-blue-50"
        >
          Add Other Payment
        </Button>
      </div>
    </div>
  );

  const statusBodyTemplate = (rowData: any) => {
    const isActive = rowData.isActive ?? true;
    return (
      <Tag
        value={isActive ? "Active" : "Inactive"}
        severity={isActive ? "success" : "danger"}
        icon={isActive ? "pi pi-check-circle" : "pi pi-times-circle"}
        className="px-3 py-1"
      />
    );
  };

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <DataTable
        value={payments}
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
        emptyMessage="No other payments found"
        selectionMode="single"
      >
        <Column field="name" header="Name" />
        <Column
          field="amount"
          header="Amount"
          body={(row) =>
            row.amount != null
              ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(row.amount)
              : "-"
          }
        />
        <Column field="description" header="Description" />
        <Column field="createdAt" header="Created At" body={(row) => formatDate(row.createdAt)} />
        <Column header="Status" body={statusBodyTemplate} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <ContextMenu model={menuItems} ref={cm} />

      <Dialog header="Edit Other Payment" visible={editVisible} style={{ width: "30vw" }} onHide={() => setEditVisible(false)}>
        {/* lightweight placeholder edit UI (no external component required) */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Edit is not implemented in this view. Selected: {selectedRow?.name}</p>
          <div className="flex justify-end gap-2">
            <Button label="Close" onClick={() => setEditVisible(false)} />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Add Other Payment"
        visible={addVisible}
        style={{ width: "30vw" }}
        onHide={() => setAddVisible(false)}
      >
        <AddOtherMaster
          onClose={() => setAddVisible(false)}
          onSuccess={async () => {
            await fetchPayments();
            setAddVisible(false);
          }}
        />
      </Dialog>

      <ConfirmDialog />
      <ToastContainer />
    </div>
  );
}

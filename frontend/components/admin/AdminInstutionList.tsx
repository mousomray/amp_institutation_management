import React, { useEffect, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";

export default function InstitutionTable() {
  const [institutes, setInstitutes] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const toast = useRef<Toast>(null);

  useEffect(() => {
    setInstitutes([
      {
        name: "ABC Institute of Technology",
        email: "contact@abcinstitute.com",
        phone: "+91 9876543210",
        website: "https://abcinstitute.com",
        establishDate: "2015-04-12",
        registrationNo: "REG-IND-001",
        password: "ABC@1234",
      },
      {
        name: "Global Education Center",
        email: "info@globaledu.org",
        phone: "+91 9123456789",
        website: "https://globaledu.org",
        establishDate: "2018-08-20",
        registrationNo: "REG-IND-002",
        password: "Global@5678",
      },
    ]);
  }, []);

  /* ================= Actions ================= */

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    toast.current?.show({
      severity: "success",
      summary: "Copied",
      detail: "Password copied to clipboard",
      life: 2000,
    });
  };

  const handleUpdate = (rowData: any) => {
    toast.current?.show({
      severity: "info",
      summary: "Update",
      detail: `Update ${rowData.name}`,
    });
  };

  const handleDelete = (rowData: any) => {
    setInstitutes((prev) =>
      prev.filter((item) => item.registrationNo !== rowData.registrationNo)
    );

    toast.current?.show({
      severity: "warn",
      summary: "Deleted",
      detail: `${rowData.name} removed`,
    });
  };

  /* ================= Column Templates ================= */

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
        onClick={() => handleDelete(rowData)}
        tooltip="Delete"
      />
    </div>
  );

  /* ================= Header ================= */

  const header = (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Institution Details
        </h2>
        <p className="text-sm text-gray-500">
          Registered institutions list
        </p>
      </div>

      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          placeholder="Search institutions..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </span>
    </div>
  );

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <Toast ref={toast} />

      <DataTable
        value={institutes}
        paginator
        rows={5}
        stripedRows
        responsiveLayout="scroll"
        globalFilter={globalFilter}
        header={header}
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
    </div>
  );
}

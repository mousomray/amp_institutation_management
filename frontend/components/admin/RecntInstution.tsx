import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

// Define the type for the props
type Institution = {
  instituteName: string;
  email: string;
  phone: string;
  registrationNo: string;
};

type Props = {
  institutions: Institution[];
  loading?: boolean;
  rows?: number; // number of rows per page
};

export default function RecentInstitution({ institutions, loading = false, rows = 5 }: Props) {
  return (
    <div className="card w-[50%] bg-white p-4 rounded-lg shadow">
      {/* TABLE TITLE */}
      <div className="mb-4 bg-primary p-3 rounded-lg">
        <h2 className="text-lg font-semibold text-white">
          Recent Institutions
        </h2>
        <p className="text-sm text-black">
          Newly registered institutions
        </p>
      </div>

      {/* DATA TABLE */}
      <DataTable
        value={institutions}
        paginator
        rows={rows}
        responsiveLayout="scroll"
        stripedRows
       
      >
        <Column field="name" header="Institute Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone" />
      </DataTable>
    </div>
  );
}

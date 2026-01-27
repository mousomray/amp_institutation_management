import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

// ✅ Type for each student
export type StudentType = {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  admissionDate: string; // or Date if you convert it before passing
};

// ✅ Props type
type RecentStudentTableProps = {
  students: StudentType[];
};

const RecentStudentTable: React.FC<RecentStudentTableProps> = ({ students }) => {
  return (
    <div className="card w-[70%] bg-white p-4 rounded-lg shadow">
      {/* TABLE HEADER */}
      <div className="mb-4 bg-primary p-3 rounded-lg">
        <h2 className="text-lg font-semibold text-white">
          Recent Students
        </h2>
        <p className="text-sm text-black">
          Recently admitted students list
        </p>
      </div>

      {/* DATA TABLE */}
      <DataTable
        value={students}
        paginator
        rows={5}
        responsiveLayout="scroll"
        stripedRows
      >
        <Column field="studentId" header="Student ID" />
        <Column field="name" header="Student Name" />
        <Column field="email" header="Email" />
        <Column field="phone" header="Phone Number" />
        <Column 
          field="admissionDate" 
          header="Admission Date"
          body={(rowData) => new Date(rowData.admissionDate).toLocaleDateString()}
        />
      </DataTable>
    </div>
  );
};

export default RecentStudentTable;

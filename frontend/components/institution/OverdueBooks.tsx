import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { formatDate } from "@/helper/DateTime";

export type OverdueBookType = {
  book: {
    name: string;
    image: string;
  };
  return_date: string;
  lateDays: number;
  estimatedFine: number;
  student: {
    name: string;
    phone: string;
  };
};

type OverdueBooksProps = {
  overdueBooks: OverdueBookType[];
};

export default function OverdueBooks({ overdueBooks }: OverdueBooksProps) {
  const bookTemplate = (rowData: OverdueBookType) => (
    <div className="flex items-center gap-3">
      <img
        src={rowData.book.image}
        alt={rowData.book.name}
        className="w-12 h-12 object-cover rounded-lg shadow-sm"
        onError={(e: any) => (e.target.src = "/placeholder-book.png")}
      />
      <span className="font-medium text-gray-800">{rowData.book.name}</span>
    </div>
  );

  const studentTemplate = (rowData: OverdueBookType) => (
    <div>
      <div className="font-semibold text-gray-800">{rowData.student.name}</div>
      <div className="text-xs text-gray-500">{rowData.student.phone}</div>
    </div>
  );

  const lateDaysTemplate = (rowData: OverdueBookType) => (
    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
      {rowData.lateDays} days
    </span>
  );

  const fineTemplate = (rowData: OverdueBookType) => (
    <span className="font-bold text-red-600 text-lg">₹{rowData.estimatedFine.toFixed(2)}</span>
  );

  const returnDateTemplate = (rowData: OverdueBookType) => (
    <span className="text-sm text-gray-700">{formatDate(rowData.return_date)}</span>
  );

  return (
    <div className="card bg-white p-5 rounded-xl shadow-md border border-gray-100">
      <div className="mb-4 bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white">Overdue Books</h2>
        <p className="text-sm text-red-50 mt-1">Books pending return with late fees</p>
      </div>

      <DataTable
        value={overdueBooks}
        paginator
        rows={5}
        responsiveLayout="scroll"
        stripedRows
        emptyMessage="No overdue books"
        className="text-sm"
      >
        <Column header="Book" body={bookTemplate} style={{ minWidth: '200px' }} />
        <Column header="Student" body={studentTemplate} style={{ minWidth: '150px' }} />
        <Column header="Due Date" body={returnDateTemplate} />
        <Column header="Late Days" body={lateDaysTemplate} />
        <Column header="Estimated Fine" body={fineTemplate} />
      </DataTable>
    </div>
  );
}

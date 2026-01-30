import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { formatDate } from "@/helper/DateTime";

export type ActivityType = {
  issue_date: string;
  return_date: string;
  status: string;
  total_amount: number;
  book: {
    name: string;
    image: string;
  };
  student: {
    name: string;
    email: string;
    phone: string;
  };
};

type RecentActivitiesProps = {
  activities: ActivityType[];
};

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  const bookTemplate = (rowData: ActivityType) => (
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

  const studentTemplate = (rowData: ActivityType) => (
    <div>
      <div className="font-semibold text-gray-800">{rowData.student.name}</div>
      <div className="text-xs text-gray-500">{rowData.student.phone}</div>
    </div>
  );

  const statusTemplate = (rowData: ActivityType) => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        rowData.status === "issued"
          ? "bg-blue-100 text-blue-700"
          : rowData.status === "returned"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)}
    </span>
  );

  const dateTemplate = (rowData: ActivityType) => (
    <span className="text-sm text-gray-700">{formatDate(rowData.issue_date)}</span>
  );

  const returnDateTemplate = (rowData: ActivityType) => (
    <span className="text-sm text-gray-700">{formatDate(rowData.return_date)}</span>
  );

  const amountTemplate = (rowData: ActivityType) => (
    <span className="font-semibold text-gray-800">₹{rowData.total_amount}</span>
  );

  return (
    <div className="card bg-white p-5 rounded-xl shadow-md border border-gray-100">
      <div className="mb-4 bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white">Recent Activities</h2>
        <p className="text-sm text-blue-50 mt-1">Latest book issue and return activities</p>
      </div>

      <DataTable
        value={activities}
        paginator
        rows={5}
        responsiveLayout="scroll"
        stripedRows
        emptyMessage="No recent activities"
        className="text-sm"
      >
        <Column header="Book" body={bookTemplate} style={{ minWidth: '200px' }} />
        <Column header="Student" body={studentTemplate} style={{ minWidth: '150px' }} />
        <Column header="Issue Date" body={dateTemplate} />
        <Column header="Return Date" body={returnDateTemplate} />
        <Column header="Status" body={statusTemplate} />
        <Column header="Amount" body={amountTemplate} />
      </DataTable>
    </div>
  );
}

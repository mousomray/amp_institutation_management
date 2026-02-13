import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

export type CourseType = {
  _id: string;
  name: string;
  duration: string;
  fee: number;
};

type RecentCourseProps = {
  courses: CourseType[]; 
};

export default function RecentCourse({courses}: RecentCourseProps) {
  const feeTemplate = (rowData: CourseType) => (
    <span className="font-semibold text-gray-800">₹{rowData.fee}</span>
  );

  return (
    <div className="card  bg-white p-5 rounded-xl shadow-md border border-gray-100">
      {/* TABLE HEADER */}
      <div className="mb-4 bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white">
          Recent Courses
        </h2>
        <p className="text-sm text-purple-50 mt-1">
          Available courses overview
        </p>
      </div>

      {/* DATA TABLE */}
      <DataTable
        value={courses}
        paginator
        rows={5}
        responsiveLayout="scroll"
        stripedRows
        emptyMessage="No courses available"
        className="text-sm"
      >
        <Column field="name" header="Course Name" style={{ minWidth: '200px' }} />
        <Column header="Course Fee" body={feeTemplate} />
      </DataTable>
    </div>
  );
}

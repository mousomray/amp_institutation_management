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
 

  return (
    <div className="card w-[70%] bg-white p-4 rounded-lg shadow">
      {/* TABLE HEADER */}
      <div className="mb-4 bg-primary p-3 rounded-lg">
        <h2 className="text-lg font-semibold text-white">
          Recent Courses
        </h2>
        <p className="text-sm text-black">
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
      >
        <Column field="name" header="Course Name" />
        <Column field="fee" header="Course Fee" />
        <Column field="duration" header="Duration" />
      </DataTable>
    </div>
  );
}

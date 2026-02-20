"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import EditCourseForm from "@/components/institution/EditCoures";
import CourseEnroll from "@/components/institution/CourseEnroll";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { Menu } from "primereact/menu";
import { formatDate } from "@/helper/DateTime";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="text-6xl mb-4">📚</div>
    <h2 className="text-xl font-semibold text-gray-700">
      No Courses Available
    </h2>
    <p className="text-gray-500 mt-2 max-w-md">
      You haven’t added any courses yet. Once you create a course, it will appear
      here for management.
    </p>
  </div>
);

function Page() {
  const [loading, setLoading] = useState(false);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const [endrollVisible, setEndrollVisible] = useState(false);
  const [enrollCoursename, setEnrollCoursename] = useState<string>("");
  const [enrollCourseImage, setEnrollCourseImage] = useState<string>("");
  const [enrollCourseDuration, setEnrollCourseDuration] = useState<string>("");
  const [enrollCourseFee, setEnrollCourseFee] = useState<string | number>("");
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const menu = React.useRef<Menu | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    rows: 5,
    total: 0,
  });

  // search input (immediate) and debouncedSearch (sent to server)
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  /* ================= GET TOKEN ================= */
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH COURSES (server-side pagination) ================= */
  // fetch when token, page, rows or debounced search change
  useEffect(() => {
    if (token) {
      courseDataGet();
    }
  }, [token, pagination.page, pagination.rows, debouncedSearch]);

  // debounce searchInput -> debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // when debounced search changes reset to first page
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const courseDataGet = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/institution/all-courses", {
        params: {
          page: pagination.page,
          limit: pagination.rows,
          ...(debouncedSearch ? { name: debouncedSearch } : {}),
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCourseData(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.pagination?.total || 0,
      }));
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

  /* ================= ACTIONS ================= */
  const handleUpdate = (rowData: any) => {
    setSelectedCourse(rowData);
    setVisible(true);
  };

  const handelEndroll = (rowData: any) => {
    if (rowData) {
      setEndrollVisible(true);
      setEnrollCourseDuration(rowData.duration);
      setEnrollCourseFee(rowData.fee);
      setEnrollCoursename(rowData.name);
      setEnrollCourseImage(rowData.image);
      setEnrollCourseId(rowData._id);
    }
  };

  const confirmDelete = (rowData: any) => {
    confirmDialog({
      message: `Are you sure you want to delete "${rowData.name}"?`,
      header: "Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          const res = await axiosInstance.delete(
            `/institution/soft-delete-course/${rowData._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          toast.success(res.data.message);
          await courseDataGet();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Delete failed");
        }
      },
    });
  };

  /* ================= COLUMN TEMPLATES ================= */
  const imageTemplate = (rowData: any) =>
    {
      const getInitials = (name?: string) => {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      };

      const stringToBg = (str?: string) => {
        const colors = [
          "bg-blue-500",
          "bg-green-500",
          "bg-red-500",
          "bg-yellow-500",
          "bg-indigo-500",
          "bg-pink-500",
          "bg-teal-500",
          "bg-orange-500",
        ];
        if (!str) return colors[0];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
      };

      const initials = getInitials(rowData?.name || rowData?.courseName || "");
      const bgClass = stringToBg(rowData?.name || rowData?.courseName || "");

      return (
        <div className="h-12 w-12 rounded overflow-hidden relative flex items-center justify-center">
          <div className={`h-12 w-12 rounded flex items-center justify-center text-white font-semibold ${bgClass}`}>
            {initials || <i className="pi pi-book text-white" />}
          </div>
          {rowData?.image ? (
            <img
              src={rowData.image}
              alt={rowData.name}
              className="h-12 w-12 object-cover rounded absolute top-0 left-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
        </div>
      );
    }

  const actionTemplate = (rowData: any) => (
    <div onClick={(e) => e.stopPropagation()} className="flex">
      <Button
        icon="pi pi-ellipsis-v"
        rounded
        text
        aria-label="More actions"
        onClick={(e) => showRowMenu(e, rowData)}
      />
    </div>
  );

  const showRowMenu = (event: any, rowData: any) => {
    event.stopPropagation();
    setSelectedCourse(rowData);
    menu.current?.show(event);
  };

  const menuModel = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => {
        if (selectedCourse) handleUpdate(selectedCourse);
      },
    },
    {
      label: "Enroll Student",
      icon: "pi pi-user-plus",
      command: () => {
        if (selectedCourse) handelEndroll(selectedCourse);
      },
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => {
        if (selectedCourse) confirmDelete(selectedCourse);
      },
    },
  ];

  const header = (
    <div className="flex justify-between items-center bg-primary p-3 rounded-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Courses</h2>
        <p className="text-sm text-black">Manage courses</p>
      </div>

      <IconField iconPosition="left">
        <InputIcon className="pi pi-search" />
        <InputText
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search course"
          className="p-inputtext-sm"
        />
      </IconField>
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full card bg-white p-4 rounded-lg shadow">
        <DataTable
          value={courseData}
          header={header}
          lazy
          paginator
          first={(pagination.page - 1) * pagination.rows}
          rows={pagination.rows}
          totalRecords={pagination.total}
          loading={loading}
          rowsPerPageOptions={[5, 10, 25, 50]}
          onPage={(e) =>
            setPagination((prev) => ({
              ...prev,
              page: (e.page ?? 0) + 1,
              rows: e.rows ?? prev.rows,
            }))
          }
          responsiveLayout="scroll"
          emptyMessage="No courses found"
        // server-side search used via debouncedSearch -> name param
        >
          <Column field="name" header="Name" sortable />
          <Column header="Image" body={imageTemplate} />
          <Column field="duration" header="Duration" />
          <Column field="fee" header="Fee" />
          <Column header="Created" body={(row: any) => formatDate(row.createdAt)} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>

        {/* popup menu (single instance) */}
        <Menu model={menuModel} popup ref={menu} />

        <Dialog header="Edit Course" visible={visible} style={{ width: "40vw" }} onHide={() => setVisible(false)}>
          <EditCourseForm onClose={() => setVisible(false)} course={selectedCourse} refetch={courseDataGet} />
        </Dialog>

        <Dialog visible={endrollVisible} onHide={() => setEndrollVisible(false)} header="Enroll Students" style={{ width: "40vw" }}>
          {endrollVisible && token !== null && (
            <CourseEnroll
              token={token}
              courseId={enrollCourseId}
              courseName={enrollCoursename}
              courseImage={enrollCourseImage}
              courseDuration={enrollCourseDuration}
              courseFee={enrollCourseFee}
              onClose={() => setEndrollVisible(false)}
            />
          )}
        </Dialog>
        <ConfirmDialog />
        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default Page;

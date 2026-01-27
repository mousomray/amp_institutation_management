"use client";

import React, { useEffect, useState } from "react";
import CourseCard from "@/components/institution/CourseCart";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import EditCourseForm from "@/components/institution/EditCoures";
function Page() {
  const [loading, setLoading] = useState(false);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  /* ================= GET TOKEN ================= */
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (token) {
      courseDataGet()
    }
  }, [token]);

  const courseDataGet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/institution/get-course", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      setCourseData(res.data.data);
      setTotalRecords(res.data.pagination?.total || 0);
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



  const handelDelete = async (id: any) => {
    if (id) {
      try {
        const res = await axiosInstance.delete(`/institution/delete-course/${id}`);
        toast.success(res.data.message);
        await courseDataGet();
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Delete failed");
        } else {
          toast.error("Unexpected error occurred");
        }
      }
    }
  }
  const handleUpdate = (rowData: any) => {
    console.log("==>",rowData)
    setSelectedCourse(rowData);
    setVisible(true);
  };

  
  


  return (
    <div className="w-full h-[calc(100vh-96px)] flex justify-center items-center">
      <CourseCard  onDelete={handelDelete} courses={courseData} onEdit={handleUpdate} />
      <ToastContainer />
      <Dialog
        header="Edit Couses"
        visible={visible}
        style={{ width: "30vw" }}
        onHide={() => setVisible(false)}
      >
        <EditCourseForm onClose={() => setVisible(false)} course={selectedCourse} refetch={courseDataGet} />
      </Dialog>
    </div>
  );
}

export default Page;

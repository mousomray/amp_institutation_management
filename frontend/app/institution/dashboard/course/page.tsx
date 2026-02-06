"use client";

import React, { useEffect, useState } from "react";
import CourseCard from "@/components/institution/CourseCart";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Dialog } from "primereact/dialog";
import EditCourseForm from "@/components/institution/EditCoures";
import CourseEnroll from "@/components/institution/CourseEnroll";

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
  const [totalRecords, setTotalRecords] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [endrollVisible, setEndrollVisible] = useState(false)
  const [enrollCoursename, setEnrollCoursename] = useState<string>("");
  const [enrollCourseImage, setEnrollCourseImage] = useState<string>("");
  const [enrollCourseDuration, setEnrollCourseDuration] = useState<string>("");
  const [enrollCourseFee, setEnrollCourseFee] = useState<string | number>("");
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null)

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
        console.log("Error dellete course", error);
        toast.error(error.response?.data?.message);
      }
    }
  }
  const handleUpdate = (rowData: any) => {
    console.log("==>", rowData)
    setSelectedCourse(rowData);
    setVisible(true);
  };

  const handelEndroll = (rowData: any) => {
    if (rowData) {
      setEndrollVisible(true)
      setEnrollCourseDuration(rowData.duration)
      setEnrollCourseFee(rowData.fee)
      setEnrollCoursename(rowData.name)
      setEnrollCourseImage(rowData.image)
      setEnrollCourseId(rowData._id)
    }
  }





  return (
    <div className="w-full  flex justify-center items-center">
      {loading && (
        <div className="flex justify-center items-center h-full text-gray-500">
          Loading courses...
        </div>
      )}
      {!loading && courseData.length === 0 && <EmptyState />}
      {!loading && courseData.length > 0 && (

        <CourseCard
          courses={courseData}
          onDelete={handelDelete}
          onEdit={handleUpdate}
          onEndroll={handelEndroll}
        />

      )}
      <Dialog
        header="Edit Couses"
        visible={visible}
        style={{ width: "30vw" }}
        onHide={() => setVisible(false)}
      >
        <EditCourseForm onClose={() => setVisible(false)} course={selectedCourse} refetch={courseDataGet} />
      </Dialog>

      <Dialog
        visible={endrollVisible}
        onHide={() => setEndrollVisible(false)}
        header="Enroll Students"
        style={{ width: "30vw" }}
      >
        {endrollVisible && token !== null && (
          <CourseEnroll
            token={token}
            courseId={enrollCourseId}
            courseName={enrollCoursename}
            courseImage={enrollCourseImage}
            courseDuration={enrollCourseDuration}
            courseFee={enrollCourseFee}
            onClose={() => {
              setEndrollVisible(false);
            }}
          />
        )}
      </Dialog>
      <ToastContainer position="top-right" />
    </div>
  );
}

export default Page;

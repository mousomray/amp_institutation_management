"use client";

import React, { useEffect, useState } from 'react'


import InstutionTable from '@/components/admin/RecntInstution';
import RecntStudentTable from '@/components/admin/RecntStudent';
import InstutionDataCart from '@/components/institution/InstutionDataCart';
import RecentCourse from '@/components/institution/RecentCourse';
import axiosInstance from "@/service/axios.service";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";


function page() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allStudents,setAllStudents] = useState(0)
  const [allCourse,setAllCourse] = useState(0)
  const [recntStudents, setRecntStudents] = useState([])
  const [recntCourse, setRecntCourse] = useState([])
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH STUDENTS ================= */
  useEffect(() => {
    if (token) {
      dashBoardData()
    }
  }, [token]);



  const dashBoardData = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/institution/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });
      setAllCourse(res.data.data.totalCourses)
      setAllStudents(res.data.data.totalStudents)
      setRecntStudents(res.data.data.recentStudents)
      setRecntCourse(res.data.data.recentCourses)
      console.log("data", res.data)
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

  return (
    <
      >
      <div className=' sm:px-6 px-2 sm:py-3 py-1'>
        {
          allCourse !== 0 ? <InstutionDataCart Courses={allCourse} student={allStudents}/> : null
        }
      </div>
      <div className=' sm:px-6 px-2 sm:py-3 py-1 flex flex-row gap-4 '>
        <RecentCourse courses={recntCourse}  />
        <RecntStudentTable students={recntStudents} />
        <ToastContainer />
      </div>
    </>
  )
}

export default page
"use client";

import React, { useEffect, useState } from 'react'
import { useAppSelector } from "../../../lib/store/hooks"
import DataCart from '@/components/admin/DataCart';
import InstutionTable from '@/components/admin/RecntInstution';
import RecntStudentTable from '@/components/admin/RecntStudent';
import axiosInstance from '@/service/axios.service';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';


function page() {

  const [loading, setLoading] = useState(false)
  const [row, setRow] = useState(10)
  const [recntStudents, setRecntStudents] = useState([])
  const [allStudents, setAllStudents] = useState(0)
  const [allCourse, setAllCourse] = useState(0)
  const [allInstitution, setAllInstitution] = useState(0)
  const [recntInstitution, setRecntInstitution] = useState([])
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const storedToken = localStorage.getItem("admin-token");
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

      const res = await axiosInstance.get("/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      console.log("data", res.data)
      setRecntInstitution(res.data.recent.institutions)
      setRecntStudents(res.data.recent.students)
      setAllCourse(res.data.stats.totalCourses)
      setAllInstitution(res.data.stats.totalInstitutions)
      setAllStudents(res.data.stats.totalStudents)
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <
      >
      <div className=' sm:px-6 px-2 sm:py-3 py-1'>
        <DataCart totalInstitutions={allInstitution} />
      </div>

      <InstutionTable institutions={recntInstitution} rows={row} />
      <ToastContainer />

    </>
  )
}

export default page
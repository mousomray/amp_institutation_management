"use client";

import React, { useEffect, useState } from 'react'

import RecntStudentTable from '@/components/admin/RecntStudent';
import InstutionDataCart from '@/components/institution/InstutionDataCart';
import RecentCourse from '@/components/institution/RecentCourse';
import BookSummaryCards from '@/components/institution/BookSummaryCards';
import RecentActivities from '@/components/institution/RecentActivities';
import OverdueBooks from '@/components/institution/OverdueBooks';
import axiosInstance from "@/service/axios.service";
import microInstance from "@/service/micro.service";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";

function page() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState(0)
  const [allCourse, setAllCourse] = useState(0)
  const [recntStudents, setRecntStudents] = useState([])
  const [recntCourse, setRecntCourse] = useState([])
  
  // Book library dashboard data
  const [bookSummary, setBookSummary] = useState({
    totalBooks: 0,
    availableBooks: 0,
    issuedBooks: 0,
    todayIssued: 0,
    todayReturned: 0,
    totalFineCollected: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
      dashBoardData();
      fetchBookDashboardData();
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

  const fetchBookDashboardData = async () => {
    try {
      const res = await microInstance.get("/api/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      if (res.data?.success && res.data?.data) {
        const { summary, recentActivities, overdueBooks } = res.data.data;
        setBookSummary(summary);
        setRecentActivities(recentActivities);
        setOverdueBooks(overdueBooks);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load book dashboard");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  return (
    <>
      <div className='sm:px-6 px-2 sm:py-3 py-1'>
        <InstutionDataCart Courses={allCourse} student={allStudents} />
      </div>

      {/* Book Library Summary */}
      <div className='sm:px-6 px-2 sm:py-3 py-1'>
        <BookSummaryCards summary={bookSummary} />
      </div>

      {/* Recent Activities and Overdue Books */}
      <div className='sm:px-6 px-2 sm:py-3 py-1 space-y-4'>
        <RecentActivities activities={recentActivities} />
        <OverdueBooks overdueBooks={overdueBooks} />
      </div>

      {/* Courses and Students */}
      <div className='sm:px-6 px-2 sm:py-3 py-1 flex flex-row gap-4'>
        <RecentCourse courses={recntCourse} />
        <RecntStudentTable students={recntStudents} />
      </div>

      <ToastContainer />
    </>
  )
}

export default page
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
  const [otherStats, setOtherStats] = useState<any | null>(null);
  
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
      fetchOtherPaymentStats();
    }
  }, [token]);

  const fmtCurrency = (n?: number) =>
    typeof n === "number"
      ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
      : "₹0";

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

  const fetchOtherPaymentStats = async () => {
    try {
      const res = await axiosInstance.get("/other-payment/statistics", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (res.data?.success) {
        setOtherStats(res.data.data || null);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load other payment statistics");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  const overall = otherStats?.overall || null;
  const byStatus: any[] = otherStats?.byStatus || [];
  const paidStat = byStatus.find((s) => String(s.status).toLowerCase() === "paid") || { totalAmount: 0, totalPaid: 0, totalDue: 0, count: 0 };
  const pendingStat = byStatus.find((s) => String(s.status).toLowerCase() === "pending") || { totalAmount: 0, totalPaid: 0, totalDue: 0, count: 0 };
  const totalAmount = overall?.totalAmount || 0;

  return (
    <div className="w-full">
      <div className='sm:px-6 px-2 sm:py-3 py-1'>
        <InstutionDataCart Courses={allCourse} student={allStudents} />
      </div>

      {/* Other Payment Summary */}
      {overall && (
        <div className="sm:px-6 px-2 sm:py-3 py-1">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <i className="pi pi-wallet text-blue-600" />
                  Other Payment Overview
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">Summary of all other payment collections</p>
              </div>
            </div>

            {/* Top metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-blue-700 font-semibold uppercase tracking-wide">Total Payments</span>
                <span className="text-lg font-bold text-blue-900">{overall.totalPayments}</span>
                <span className="text-[11px] text-blue-700/80">across all heads</span>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-indigo-700 font-semibold uppercase tracking-wide">Total Amount</span>
                <span className="text-lg font-bold text-indigo-900">{fmtCurrency(overall.totalAmount)}</span>
                <span className="text-[11px] text-indigo-700/80">billed</span>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">Total Paid</span>
                <span className="text-lg font-bold text-emerald-900">{fmtCurrency(overall.totalPaid)}</span>
                <span className="text-[11px] text-emerald-700/80">collected</span>
              </div>
              <div className="bg-rose-50 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-rose-700 font-semibold uppercase tracking-wide">Total Due</span>
                <span className="text-lg font-bold text-rose-900">{fmtCurrency(overall.totalDue)}</span>
                <span className="text-[11px] text-rose-700/80">remaining</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wide">Students</span>
                <span className="text-lg font-bold text-slate-900">{overall.totalStudents}</span>
                <span className="text-[11px] text-slate-700/80">with other payments</span>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">By Status</span>
                  <span className="text-xs text-gray-500">Pending vs Paid</span>
                </div>
                {[pendingStat, paidStat].map((s, idx) => {
                  const status = idx === 0 ? "Pending" : "Paid";
                  const color = idx === 0 ? "bg-amber-500" : "bg-emerald-500";
                  const amount = s.totalAmount || 0;
                  const percent = totalAmount ? Math.round((amount / totalAmount) * 100) : 0;
                  return (
                    <div key={status} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs ${color}`}
                          >
                            {status[0]}
                          </span>
                          <span className="text-xs font-medium text-gray-700">
                            {status} <span className="text-[11px] text-gray-500">({s.count || 0} payments)</span>
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-800">
                          {fmtCurrency(amount)}{" "}
                          <span className="text-[11px] text-gray-500">({percent || 0}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${color} h-1.5 rounded-full`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">Collection Progress</span>
                </div>
                <div className="space-y-2 text-xs text-gray-600 mb-2">
                  <div className="flex justify-between">
                    <span>Collected</span>
                    <span className="font-semibold text-emerald-700">{fmtCurrency(overall.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span className="font-semibold text-rose-700">{fmtCurrency(overall.totalDue)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        totalAmount ? Math.round((overall.totalPaid / totalAmount) * 100) : 0
                      )}%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-gray-500 text-right">
                  {totalAmount
                    ? `${Math.round((overall.totalPaid / totalAmount) * 100)}% of total other payments collected`
                    : "No other payments yet"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <div className='flex flex-row '>
        <RecentCourse courses={recntCourse} />
        <RecntStudentTable students={recntStudents} />
      </div>

      <ToastContainer />
    </div>
  )
}

export default page
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import microInstance from "@/service/micro.service";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { IssueSchema } from "@/helper/schema/Schema"; // <-- import moved schema

type IssueForm = z.infer<typeof IssueSchema>;

export default function BookIssuePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IssueForm>({
    resolver: zodResolver(IssueSchema) as Resolver<IssueForm>,
    defaultValues: {
      book_id: "",
      student_id: "",
      base_rate: 0,
      return_date: "",
    },
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        // axiosInstance should be configured to point to http://localhost:8080/api (or similar)
        const res = await axiosInstance.get("/institution/all-students");
        setStudents(res.data.data || res.data || []);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          toast.error(err.response?.data?.message || "Failed to load students");
        } else {
          toast.error("Failed to load students");
        }
      } finally {
        setLoadingStudents(false);
      }
    };

    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const res = await microInstance.get("/book/allbooks");
        console.log("Books fetched:", res.data);
        setBooks(res.data.books);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          toast.error(err.response?.data?.message || "Failed to load books");
        } else {
          toast.error("Failed to load books");
        }
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchStudents();
    fetchBooks();
  }, []);

  const onSubmit = async (values: IssueForm) => {
    setSubmitting(true);
    try {
      const payload = {
        book_id: values.book_id,
        student_id: values.student_id,
        base_rate: values.base_rate,
        return_date: values.return_date,
      };

      // Adjust endpoint if your backend expects a different route
      const res = await microInstance.post("/api/issue", payload);
      toast.success(res.data?.message || "Book issued successfully");
      reset();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Issue failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 text-center">Issue Book</h2>
          <p className="text-gray-500 text-center mt-2">Select student and book, set base rate and return date</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Student *</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
              {...register("student_id")}
            >
              <option value="">Select student</option>
              {loadingStudents ? (
                <option value="" disabled>Loading students...</option>
              ) : (
                students.map((s: any) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name || s.studentName || `${s.firstName || ""} ${s.lastName || ""}`} {s.studentId ? `(${s.studentId})` : ""}
                  </option>
                ))
              )}
            </select>
            {errors.student_id && <p className="text-red-500 text-xs mt-1">{errors.student_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Book *</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white"
              {...register("book_id")}
            >
              <option value="">Select book</option>
              {loadingBooks ? (
                <option value="" disabled>Loading books...</option>
              ) : (
                books.map((b: any) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.name} {b.authorName ? `- ${b.authorName}` : ""}
                  </option>
                ))
              )}
            </select>
            {errors.book_id && <p className="text-red-500 text-xs mt-1">{errors.book_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Base Rate *</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                {...register("base_rate", { valueAsNumber: true })}
              />
              {errors.base_rate && <p className="text-red-500 text-xs mt-1">{(errors.base_rate as any).message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Return Date *</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                {...register("return_date")}
              />
              {errors.return_date && <p className="text-red-500 text-xs mt-1">{errors.return_date.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold ${submitting ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-blue-700"}`}
          >
            {submitting ? "Issuing Book..." : "Issue Book"}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

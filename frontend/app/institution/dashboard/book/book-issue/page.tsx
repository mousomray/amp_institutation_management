"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import { IssueSchema } from "@/helper/schema/Schema";
import microInstance from "@/service/micro.service";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import z from "zod";

// PrimeReact
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";


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
    setValue,
    watch,
  } = useForm<IssueForm>({
    resolver: zodResolver(IssueSchema) as Resolver<IssueForm>,
    defaultValues: {
      student_id: "",
      book_id: "",
      base_rate: 0,
      return_date: "",
    },
  });

  const selectedStudent = watch("student_id");
  const selectedBook = watch("book_id");
  const selectedDate = watch("return_date");
  const baseRate = watch("base_rate");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await axiosInstance.get("/institution/all-students");
        setStudents(res.data.data || res.data || []);
      } catch (err) {
        toast.error(axios.isAxiosError(err) ? err.response?.data?.message || "Failed to load students" : "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };

    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const res = await microInstance.get("/book/allbooks");
        setBooks(res.data.books || []);
      } catch (err) {
        toast.error(axios.isAxiosError(err) ? err.response?.data?.message || "Failed to load books" : "Failed to load books");
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
        student_id: values.student_id,
        book_id: values.book_id,
        base_rate: values.base_rate,
        return_date: values.return_date,
      };
      const res = await microInstance.post("/api/issue", payload);
      toast.success(res.data?.message || "Book issued successfully");
      reset();
    } catch (err: any) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.message || "Issue failed" : "Unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Issue Book</h2>
          <p className="text-gray-500 mt-2">Select student and book, set base rate and return date</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Student Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Student *</label>
            <Dropdown
              className="w-full"
              value={selectedStudent}
              options={students.map((s: any) => ({
                label: `${s.name || `${s.firstName || ""} ${s.lastName || ""}`}${s.studentId ? ` (${s.studentId})` : ""}`,
                value: s._id || s.id,
              }))}
              onChange={(e) => setValue("student_id", e.value, { shouldValidate: true })}
              placeholder={loadingStudents ? "Loading students..." : "Select student"}
              disabled={loadingStudents}
            />
            {errors.student_id && <p className="text-red-500 text-xs mt-1">{errors.student_id.message}</p>}
          </div>

          {/* Book Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Book *</label>
            <Dropdown
              className="w-full"
              value={selectedBook}
              options={books.map((b: any) => ({
                label: `${b.name}${b.authorName ? ` - ${b.authorName}` : ""}`,
                value: b._id || b.id,
              }))}
              onChange={(e) => setValue("book_id", e.value, { shouldValidate: true })}
              placeholder={loadingBooks ? "Loading books..." : "Select book"}
              disabled={loadingBooks}
            />
            {errors.book_id && <p className="text-red-500 text-xs mt-1">{errors.book_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Base Rate */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Base Rate *</label>
              <InputNumber
                className="w-full"
                value={baseRate}
                mode="currency"
                currency="INR"
                locale="en-IN"
                onValueChange={(e) => setValue("base_rate", e.value ?? 0, { shouldValidate: true })}
              />
              {errors.base_rate && <p className="text-red-500 text-xs mt-1">{errors.base_rate.message}</p>}
            </div>

            {/* Return Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Return Date *</label>
              <Calendar
                className="w-full"
                value={selectedDate ? new Date(selectedDate) : null}
                onChange={(e) => {
                  const dateValue = e.value as Date | null;
                  const isoString = dateValue ? dateValue.toISOString().split("T")[0] : "";
                  setValue("return_date", isoString, { shouldValidate: true });
                }}
                dateFormat="yy-mm-dd"
                showIcon
              />
              {errors.return_date && <p className="text-red-500 text-xs mt-1">{errors.return_date.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full  bg-primary text-white py-3 rounded-lg font-semibold ${submitting ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-blue-700"}`}
          >
            {submitting ? "Issuing Book..." : "Issue Book"}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

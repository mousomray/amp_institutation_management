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
import { z } from "zod";

// PrimeReact
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";

// Derive page-local schema without base_rate to match UI
const IssueFormSchema = IssueSchema.omit({ base_rate: true });
type IssueForm = z.infer<typeof IssueFormSchema>;

export default function BookIssuePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<IssueForm>({
    resolver: zodResolver(IssueFormSchema) as Resolver<IssueForm>,
    defaultValues: {
      student_id: "",
      book_id: "",
      return_date: "",
    },
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  const selectedStudent = watch("student_id");
  const selectedBook = watch("book_id");
  const selectedDate = watch("return_date");

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await axiosInstance.get("/student/student-dropdown");
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

  // prepare options with image url
  const bookOptions = books.map((b: any) => {
    const raw = b.image || "";
    const imageUrl =
      raw.startsWith("http") || raw.startsWith("https")
        ? raw
        : `${process.env.NEXT_PUBLIC_API_URL || ""}${raw}`;

    return {
      label: `${b.name}${b.authorName ? ` - ${b.authorName}` : ""}`,
      value: b._id || b.id,
      image: imageUrl,
    };
  });

  const bookItemTemplate = (option: any) => {
    if (!option) return null;
    return (
      <div className="flex items-center gap-3">
        <img
          src={option.image}
          alt={option.label}
          className="w-8 h-8 rounded-md object-cover"
          onError={(e: any) => (e.currentTarget.style.display = "none")}
        />
        <div className="text-sm">{option.label}</div>
      </div>
    );
  };

  const bookValueTemplate = (selected: any) => {
    if (!selected) return <span>{loadingBooks ? "Loading books..." : "Select book"}</span>;
    return (
      <div className="flex items-center gap-3">
        <img
          src={selected.image}
          alt={selected.label}
          className="w-6 h-6 rounded-md object-cover"
          onError={(e: any) => (e.currentTarget.style.display = "none")}
        />
        <span className="text-sm">{selected.label}</span>
      </div>
    );
  };

  const onSubmit = async (values: IssueForm) => {
    setSubmitting(true);
    try {
      const payload = {
        student_id: values.student_id,
        book_id: values.book_id,
        return_date: values.return_date,
      };

      const res = await microInstance.post("/api/issue", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        withCredentials: true,
      });

      toast.success(res.data?.message || "Book issued successfully");
      reset();
    } catch (err: any) {
      console.error("Issue error:", err);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-book text-3xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Issue Book</h2>
          <p className="text-gray-500">Select student and book, set return date</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Student Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Student <span className="text-red-500">*</span>
            </label>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Book <span className="text-red-500">*</span>
            </label>
            <Dropdown
              className="w-full"
              value={selectedBook}
              options={bookOptions}
              optionLabel="label"
              optionValue="value"
              itemTemplate={bookItemTemplate}
              valueTemplate={bookValueTemplate}
              onChange={(e) => setValue("book_id", e.value, { shouldValidate: true })}
              placeholder={loadingBooks ? "Loading books..." : "Select book"}
              disabled={loadingBooks}
            />
            {errors.book_id && <p className="text-red-500 text-xs mt-1">{errors.book_id.message}</p>}
          </div>

          {/* Return Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Return Date <span className="text-red-500">*</span>
            </label>
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

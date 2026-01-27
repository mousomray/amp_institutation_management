"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { z } from "zod";
import { CourseSchema } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import axios from "axios";

type CourseFormData = z.infer<typeof CourseSchema>;

type EditCourseProps = {
  course: any | null;
  refetch: () => void;
  onClose: () => void;
};

const durationOptions = [
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "6 Months",
  "8 Months",
  "12 Months",
];

export default function EditCourseForm({
  course,
  refetch,
  onClose,
}: EditCourseProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CourseFormData>({
    resolver: zodResolver(CourseSchema),
  });

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (!course) return;

    reset({
      name: course.name,
      duration: course.duration,
      fee: String(course.fee),
      description: course.description,
    });

    setPreview(course.image || null);
  }, [course, reset]);

  /* ================= SUBMIT ================= */
  const onSubmit = async (data: CourseFormData) => {
    try {
      const res = await axiosInstance.put(
        `/institution/update-course/${course._id}`,
        data 
      );

      toast.success(res.data.message || "Course updated successfully");
      refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  if (!course) return null;

  return (
    <div className="w-full bg-white rounded-xl p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-5 text-center">
        Edit Course
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* IMAGE (READ ONLY) */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Course Image
          </label>

          <div className="relative h-40 w-full border rounded-lg overflow-hidden">
            {preview ? (
              <Image
                src={preview}
                alt="Course"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
          </div>
        </div>

        {/* NAME */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Course Name
          </label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded-lg"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-red-500 text-xs">{errors.name.message}</p>
          )}
        </div>

        {/* DURATION */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Duration
          </label>
          <select
            className="w-full mt-1 px-3 py-2 border rounded-lg bg-white"
            {...register("duration")}
          >
            <option value="">Select duration</option>
            {durationOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {errors.duration && (
            <p className="text-red-500 text-xs">
              {errors.duration.message}
            </p>
          )}
        </div>

        {/* FEE */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Fee
          </label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded-lg"
            {...register("fee")}
          />
          {errors.fee && (
            <p className="text-red-500 text-xs">{errors.fee.message}</p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Description
          </label>
          <textarea
            rows={4}
            className="w-full mt-1 px-3 py-2 border rounded-lg resize-none"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-red-500 text-xs">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Update Course
          </button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}

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

const durationOptions = [
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "6 Months",
  "8 Months",
  "12 Months",
];

export default function AddCourseForm() {
  const [token, setToken] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CourseFormData>({
    resolver: zodResolver(CourseSchema),
  });

  // ✅ Read token once
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  const onSubmit = async (data: CourseFormData) => {
    try {
      if (!imageFile) {
        toast.error("Image is required");
        return;
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("duration", data.duration);
      formData.append("fee", data.fee);
      formData.append("description", data.description); // ✅ added
      formData.append("image", imageFile);

      const res = await axiosInstance.post(
        "/institution/create-course",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      toast.success(res.data.message);
      reset();
      setPreview(null);
      setImageFile(null);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  const handleImagePreview = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-5 text-center">
          Add New Course
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Course Image
            </label>

            <div className="relative h-40 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {preview ? (
                <Image src={preview} alt="Preview" fill className="object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">
                  Upload course image
                </span>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  handleImagePreview(file);
                }
              }}
            />
          </div>

          {/* Name */}
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

          {/* Duration */}
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
              <p className="text-red-500 text-xs">{errors.duration.message}</p>
            )}
          </div>

          {/* Fee */}
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

          {/* ✅ Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe the course..."
              className="w-full mt-1 px-3 py-2 border rounded-lg resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-xs">
                {errors.description.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-lg font-medium"
          >
            Add Course
          </button>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
}

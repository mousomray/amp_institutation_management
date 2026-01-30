"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { z } from "zod";
import { CourseSchema } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import axios from "axios";

// PrimeReact Components
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";

type CourseFormData = z.infer<typeof CourseSchema>;

const durationOptions = [
  { label: "1 Month", value: "1 Month" },
  { label: "2 Months", value: "2 Months" },
  { label: "3 Months", value: "3 Months" },
  { label: "4 Months", value: "4 Months" },
  { label: "6 Months", value: "6 Months" },
  { label: "8 Months", value: "8 Months" },
  { label: "12 Months", value: "12 Months" },
];

export default function AddCourseForm() {
  const [token, setToken] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CourseFormData>({
    resolver: zodResolver(CourseSchema),
  });

  // Watch duration for Dropdown
  const selectedDuration = watch("duration");

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  const handleImagePreview = (file: File) => {
    if (preview) URL.revokeObjectURL(preview);
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);
    try {
      if (!imageFile) {
        toast.error("Image is required");
        return;
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("duration", data.duration);
      formData.append("fee", data.fee);
      formData.append("description", data.description);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white py-4 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-5 text-center">
          Add New Course
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Course Image <span className="text-red-500">*</span>
            </label>
            <div 
              className="relative h-40 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-indigo-400 cursor-pointer transition-colors"
              onClick={() => imageInputRef.current?.click()}
            >
              {preview ? (
                <Image src={preview} alt="Preview" fill className="object-cover" />
              ) : (
                <div className="text-center">
                  <i className="pi pi-image text-4xl text-gray-400"></i>
                  <p className="mt-2 text-gray-500 text-sm">Click to upload course image</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF</p>
                </div>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  handleImagePreview(file);
                }
              }}
            />
          </div>

          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Course Name <span className="text-red-500">*</span>
            </label>
            <InputText
              className="w-full"
              {...register("name")}
              placeholder="Enter course name"
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Duration <span className="text-red-500">*</span>
            </label>
            <Dropdown
              className="w-full"
              options={durationOptions}
              placeholder="Select duration"
              value={selectedDuration}
              onChange={(e) => setValue("duration", e.value, { shouldValidate: true })}
            />
            {errors.duration && (
              <p className="text-red-500 text-xs">{errors.duration.message}</p>
            )}
          </div>

          {/* Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Fee <span className="text-red-500">*</span>
            </label>
            <InputText
              type="number"
              className="w-full"
              {...register("fee")}
              placeholder="Enter course fee"
            />
            {errors.fee && (
              <p className="text-red-500 text-xs">{errors.fee.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Description <span className="text-red-500">*</span>
            </label>
            <InputTextarea
              className="w-full"
              rows={4}
              autoResize
              placeholder="Enter course description"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-xs">{errors.description.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-primary text-white py-2 rounded-lg font-medium transition-all shadow-lg ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-blue-700 transform hover:scale-[1.02]"
            }`}
          >
            {isSubmitting ? "Adding Course..." : "Add Course"}
          </button>
        </form>

        <ToastContainer />
      </div>
    </div>
  );
}

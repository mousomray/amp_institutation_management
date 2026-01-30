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
import { Button } from "primereact/button";
import { Card } from "primereact/card";

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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <Card className="w-full max-w-3xl shadow-2xl border-0">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-graduation-cap text-3xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Add New Course</h2>
          <p className="text-gray-500">Create a new course with details and image</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Image Upload Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="pi pi-image text-blue-600"></i>
              Course Image
            </h3>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Course Image <span className="text-red-500">*</span>
              </label>
              <div
                className="relative h-52 w-full border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center overflow-hidden bg-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                onClick={() => imageInputRef.current?.click()}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Course Image Preview"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="pi pi-cloud-upload text-4xl text-blue-500"></i>
                    </div>
                    <p className="text-blue-600 font-semibold text-lg mb-1">
                      Click to upload course image
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG or GIF up to 10MB
                    </p>
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
          </div>

          {/* Course Details */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-info-circle text-blue-600"></i>
              Course Details
            </h3>

            {/* Course Name & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-book text-blue-600"></i>
                  </span>
                  <InputText
                    className="w-full"
                    {...register("name")}
                    placeholder="e.g., Web Development Bootcamp"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <i className="pi pi-exclamation-circle"></i>
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Duration <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-clock text-blue-600"></i>
                  </span>
                  <Dropdown
                    className="w-full"
                    options={durationOptions}
                    placeholder="Select duration"
                    value={selectedDuration}
                    onChange={(e) => setValue("duration", e.value, { shouldValidate: true })}
                  />
                </div>
                {errors.duration && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <i className="pi pi-exclamation-circle"></i>
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            {/* Fee */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Course Fee <span className="text-red-500">*</span>
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50">
                  <i className="pi pi-indian-rupee text-blue-600"></i>
                </span>
                <InputText
                  type="number"
                  className="w-full"
                  {...register("fee")}
                  placeholder="Enter course fee"
                />
              </div>
              {errors.fee && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.fee.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <InputTextarea
                className="w-full"
                rows={5}
                autoResize
                placeholder="Describe the course content, objectives, and key features..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <i className="pi pi-exclamation-circle"></i>
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              label={isSubmitting ? "Creating Course..." : "Create Course"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-plus-circle"}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            />
          </div>
        </form>

        <ToastContainer position="top-right" />
      </Card>
    </div>
  );
}

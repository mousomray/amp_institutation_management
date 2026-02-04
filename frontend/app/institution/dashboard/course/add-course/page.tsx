"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CourseSchema } from "@/helper/schema/Schema";

import { z } from "zod";

type CourseFormData = z.infer<typeof CourseSchema>;
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

// PrimeReact
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Card } from "primereact/card";

const durationUnitOptions = [
  { label: "Days", value: "Days" },
  { label: "Months", value: "Months" },
  { label: "Years", value: "Years" },
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
    reset,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(CourseSchema),
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);

    try {
      if (!imageFile) {
        toast.error("Image is required");
        return;
      }


      const duration = `${data.durationValue} ${data.durationUnit}`;

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("duration", duration);
      formData.append("fee", data.fee);
      formData.append("description", data.description);
      formData.append("image", imageFile);

      const res = await axiosInstance.post(
        "/institution/create-course",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(res.data.message);
      reset();
      setImageFile(null);
      setPreview(null);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, [preview]); const handleImagePreview = (file: File) => { if (preview) URL.revokeObjectURL(preview); const imageUrl = URL.createObjectURL(file); setPreview(imageUrl); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-book text-3xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Course Registration</h2>
          <p className="text-gray-500">Add new Course with complete information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Course Name */}
          <div>
            <label className="font-semibold">Course Name *</label>
            <InputText
              className="w-full mt-1"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Duration Value */}
            <div>
              <label className="font-semibold">Duration *</label>
              <InputText
                type="number"
                className="w-full mt-1"
                {...register("durationValue", { valueAsNumber: true })}
              />
              {errors.durationValue && (
                <p className="text-red-500 text-sm">
                  {errors.durationValue.message}
                </p>
              )}
            </div>

            {/* Duration Unit */}
            <div>
              <label className="font-semibold">Duration Unit *</label>
              <Dropdown
                className="w-full mt-1"
                options={durationUnitOptions}
                placeholder="Select unit"
                value={watch("durationUnit")}
                onChange={(e) =>
                  setValue("durationUnit", e.value, { shouldValidate: true })
                }
              />
              {errors.durationUnit && (
                <p className="text-red-500 text-sm">
                  {errors.durationUnit.message}
                </p>
              )}
            </div>
          </div>

          {/* Fee */}
          <div>
            <label className="font-semibold">Fee *</label>
            <InputText
              type="number"
              className="w-full mt-1"
              {...register("fee")}
            />
            {errors.fee && (
              <p className="text-red-500 text-sm">{errors.fee.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold">Description *</label>
            <InputTextarea
              rows={4}
              className="w-full mt-1"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Image */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100"> <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"> <i className="pi pi-image text-blue-600"></i> Course Image </h3> <div className="space-y-2"> <label className="block text-sm font-semibold text-gray-700"> Course Image <span className="text-red-500">*</span> </label> <div className="relative h-52 w-full border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center overflow-hidden bg-white hover:border-blue-500 cursor-pointer transition-all duration-300" onClick={() => imageInputRef.current?.click()} > {preview ? (<img src={preview} alt="Course Image Preview" className="w-full h-full object-contain p-4" />) : (<div className="text-center p-6"> <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"> <i className="pi pi-cloud-upload text-4xl text-blue-500"></i> </div> <p className="text-blue-600 font-semibold text-lg mb-1"> Click to upload course image </p> <p className="text-sm text-gray-500"> PNG, JPG or GIF up to 10MB </p> </div>)} </div> <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setImageFile(file); handleImagePreview(file); } }} /> </div> </div>

          <Button
            type="submit"
            label={isSubmitting ? "Creating..." : "Create Course"}
            loading={isSubmitting}
            className="w-full"
          />
        </form>

        <ToastContainer position="top-right" />
      </Card>
    </div>
  );
}

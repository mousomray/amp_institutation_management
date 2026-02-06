"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

import { CourseSchema } from "@/helper/schema/Schema";
import axiosInstance from "@/service/axios.service";

import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Card } from "primereact/card";

type CourseFormData = z.infer<typeof CourseSchema>;

type EditCourseProps = {
  course: any | null;
  refetch: () => void;
  onClose: () => void;
};

const durationUnitOptions = [
  { label: "Days", value: "Days" },
  { label: "Months", value: "Months" },
  { label: "Years", value: "Years" },
];

export default function EditCourseForm({
  course,
  refetch,
  onClose,
}: EditCourseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (!course) return;

    const [value, unit] = course.duration.split(" ");

    reset({
      name: course.name,
      durationValue: Number(value),
      durationUnit: unit,
      fee: String(course.fee),
      description: course.description,
    });

    setPreview(course.image);
  }, [course, reset]);

  /* ================= SUBMIT ================= */
  const onSubmit = async (data: CourseFormData) => {
    try {
      setIsSubmitting(true);

      const payload = {
        name: data.name,
        duration: `${data.durationValue} ${data.durationUnit}`,
        fee: data.fee,
        description: data.description,
      };

      const res = await axiosInstance.put(
        `/institution/edit-course/${course._id}`,
        payload
      );

      toast.success(res.data.message);
      refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!course) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center  p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* NAME */}
        <div>
          <label className="font-semibold">Course Name <span className="text-red-500 text-sm">*</span></label>
          <InputText className="w-full mt-1" {...register("name")} />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}
        </div>

        {/* DURATION */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-semibold">Duration <span className="text-red-500 text-sm">*</span></label>
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

          <div>
            <label className="font-semibold">Unit <span className="text-red-500 text-sm">*</span></label>
            <Dropdown
              className="w-full mt-1"
              options={durationUnitOptions}
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

        {/* FEE */}
        <div>
          <label className="font-semibold">Fee <span className="text-red-500 text-sm">*</span></label>
          <InputText
            type="number"
            className="w-full mt-1"
            {...register("fee")}
          />
          {errors.fee && (
            <p className="text-red-500 text-sm">{errors.fee.message}</p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="font-semibold">Description <span className="text-red-500 text-sm">*</span></label>
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

        {/* IMAGE (READ ONLY) */}
        <div>
          <label className="font-semibold">Course Image</label>
          <div className="h-52 w-full border rounded-2xl bg-white flex items-center justify-center overflow-hidden mt-2">
            {preview ? (
              <img
                src={preview}
                alt="Course"
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <p className="text-gray-400">No image available</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          label={isSubmitting ? "Updating..." : "Update Course"}
          loading={isSubmitting}
          className="w-full"
        />
      </form>

      <ToastContainer />
    </div>
  );
}

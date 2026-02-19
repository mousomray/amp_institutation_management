"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { MultiSelect } from "primereact/multiselect";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { StudentSchema } from "@/helper/schema/Schema";

/* ================= TYPES ================= */

type StudentFormData = z.infer<typeof StudentSchema>;

type EditStudentProps = {
  student: any | null;
  refetch: () => void;
  onClose: () => void;
};

/* ================= CONSTANTS ================= */

const bloodGroups = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
];

/* ================= COMPONENT ================= */

export default function EditStudent({
  student,
  refetch,
  onClose,
}: EditStudentProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(StudentSchema),
  });


  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signPreview, setSignPreview] = useState<string | null>(null);


  useEffect(() => {
    if (!student) return;

    reset({
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      phone: student.phone,
      fatherName: student.fatherName,
      bloodGroup: student.bloodGroup,
      dob: student.dob ? new Date(student.dob) : undefined,
      admissionDate: student.admissionDate
        ? new Date(student.admissionDate)
        : undefined,
    });

    setPhotoPreview(student.photo);
    setSignPreview(student.signature);
  }, [student, reset]);

 

  


  /* ================= SUBMIT ================= */

  const onSubmit = async (data: StudentFormData) => {
    try {
      const payload = {
        ...data,
      };

      const res = await axiosInstance.put(
        `/student/update-student/${student._id}`,
        payload
      );

      toast.success(res.data.message || "Student updated successfully");
      refetch();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  /* ================= UI ================= */

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4  px-10">

      {/* STUDENT ID */}
      <div>
        <label className="text-sm font-medium">Student ID</label>
        <InputText className="w-full mt-1" {...register("studentId")} disabled />
        {errors.studentId && (
          <small className="text-red-500">{errors.studentId.message}</small>
        )}

      </div>

      {/* NAME */}
      <div>
        <label className="text-sm font-medium">Name</label>
        <InputText
          className="w-full mt-1"
          {...register("name")}
          onKeyDown={(e: any) => {
            const input = e.currentTarget as HTMLInputElement;
            const start = input.selectionStart ?? 0;

            // Prevent leading space
            if (e.key === " ") {
              const prefix = input.value.substring(0, start);
              if (start === 0 || prefix.trim().length === 0) {
                e.preventDefault();
                return;
              }
            }
          }}
          onPaste={(e: any) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData("text");
            const cleanedInsert = pastedText.replace(/^\s+/, "");
            const input = e.target as HTMLInputElement;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentValue = input.value;
            const newValue =
              currentValue.substring(0, start) +
              cleanedInsert +
              currentValue.substring(end);
            const normalized = newValue.replace(/^\s+/, "");
            input.value = normalized;
            setValue("name", normalized);
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }}
        />
        {errors.name && (
          <small className="text-red-500">{errors.name.message}</small>
        )}
      </div>

      {/* EMAIL */}
      <div>
        <label className="text-sm font-medium">Email</label>
        <InputText className="w-full mt-1" {...register("email")} />
        {errors.email && (
          <small className="text-red-500">{errors.email.message}</small>
        )}
      </div>

      {/* PHONE */}
      <div>
        <label className="text-sm font-medium">Phone</label>
        <InputText type="number" className="w-full mt-1" {...register("phone")} />
        {errors.phone && (
          <small className="text-red-500">{errors.phone.message}</small>
        )}
      </div>

      {/* DOB */}
      <div>
        <label className="text-sm font-medium">Date of Birth</label>
        <Controller
          name="dob"
          control={control}
          render={({ field }) => (
            <Calendar
              className="w-full mt-1"
              showIcon
              value={field.value ?? null}
              onChange={(e) => field.onChange(e.value ?? undefined)}
            />
          )}
        />
        {errors.dob && (
          <small className="text-red-500">{errors.dob.message}</small>
        )}
      </div>

      {/* BLOOD GROUP */}
      <div>
        <label className="text-sm font-medium">Blood Group</label>
        <Controller
          name="bloodGroup"
          control={control}
          render={({ field }) => (
            <Dropdown
              {...field}
              options={bloodGroups}
              className="w-full mt-1"
              placeholder="Select blood group"
            />
          )}
        />
        {errors.bloodGroup && (
          <small className="text-red-500">{errors.bloodGroup.message}</small>
        )}
      </div>

      {/* ADMISSION DATE */}
      <div>
        <label className="text-sm font-medium">Admission Date</label>
        <Controller
          name="admissionDate"
          control={control}
          render={({ field }) => (
            <Calendar
              className="w-full mt-1"
              showIcon
              value={field.value ?? null}
              onChange={(e) => field.onChange(e.value ?? undefined)}
            />
          )}
        />
        {errors.admissionDate && (
          <small className="text-red-500">{errors.admissionDate.message}</small>
        )}
      </div>

      {/* PHOTO PREVIEW */}
      {photoPreview && (
        <img src={photoPreview} className="h-16 rounded border" />
      )}

      {/* SIGNATURE PREVIEW */}
      {signPreview && (
        <img src={signPreview} className="h-10 rounded border" />
      )}

      <Button
        type="submit"
        label="Update Student"
        icon="pi pi-save"
        className="w-full"
      />
    </form>
  );
}

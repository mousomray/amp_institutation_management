"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
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

/* ================= HELPERS ================= */

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}/${path}`;
};

/* ================= COMPONENT ================= */

export default function EditStudent({ student, refetch,onClose }: EditStudentProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(StudentSchema),
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signPreview, setSignPreview] = useState<string | null>(null);

  /* ================= PREFILL ================= */

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

    setPhotoPreview(getImageUrl(student.photo));
    setSignPreview(getImageUrl(student.signature));
  }, [student, reset]);

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: StudentFormData) => {
    try {
      const res = await axiosInstance.put(
        `/institution/update-student/${student._id}`,
        data
      );

      toast.success(res.data.message || "Student updated successfully");
      refetch();
     onClose()
    } catch (error) {
      console.error(error);
      toast.error("Update failed");
    }
  };

  /* ================= UI ================= */

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* STUDENT ID */}
      <div>
        <label className="text-sm font-medium">Student ID</label>
        <InputText
          className="w-full mt-1"
          {...register("studentId")}
          disabled
        />
      </div>

      {/* PHOTO */}
      <div>
        <label className="text-sm font-medium">Photo</label>
        <div className="flex items-center gap-4 mt-1">
          <div className="w-16 h-16 rounded-full border overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Student"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <i className="pi pi-user text-gray-400 text-2xl"></i>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NAME */}
      <div>
        <label className="text-sm font-medium">Name</label>
        <InputText className="w-full mt-1" {...register("name")} />
      </div>

      {/* EMAIL */}
      <div>
        <label className="text-sm font-medium">Email</label>
        <InputText className="w-full mt-1" {...register("email")} />
      </div>

      {/* PHONE */}
      <div>
        <label className="text-sm font-medium">Phone</label>
        <InputText className="w-full mt-1" {...register("phone")} />
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
              value={field.value ?? null}
              showIcon
              onChange={(e) => field.onChange(e.value ?? undefined)}
            />
          )}
        />
      </div>

      {/* FATHER NAME */}
      <div>
        <label className="text-sm font-medium">Father Name</label>
        <InputText className="w-full mt-1" {...register("fatherName")} />
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
              value={field.value ?? null}
              showIcon
              onChange={(e) => field.onChange(e.value ?? undefined)}
            />
          )}
        />
      </div>

      {/* SIGNATURE */}
      <div>
        <label className="text-sm font-medium">Signature</label>
        {signPreview && (
          <img
            src={signPreview}
            alt="Signature"
            className="h-10 border rounded mt-1"
          />
        )}
      </div>

      <Button
        type="submit"
        label="Update Student"
        icon="pi pi-save"
        className="w-full"
      />
    </form>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { StudentSchema } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { z } from "zod";
import axios from "axios";

type StudentFormData = z.infer<typeof StudentSchema>;

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

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signPreview, setSignPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  
  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);





  useEffect(() => {
    if (token) {
      courseDataGet()
    }
  }, [token])
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(StudentSchema),
  });

  const onSubmit = async (data: StudentFormData) => {
    try {
      if (!photoFile) return toast.error("Photo is required");
      if (!signatureFile) return toast.error("Signature is required");

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("phone", data.phone);

      // Optional fields
      if (data.studentId) formData.append("studentId", data.studentId);
      if (data.dob) formData.append("dob", data.dob.toISOString());
      if (data.fatherName) formData.append("fatherName", data.fatherName);
      if (data.bloodGroup) formData.append("bloodGroup", data.bloodGroup);
      if (data.admissionDate) formData.append("admissionDate", data.admissionDate.toISOString());
      if (selectedCourse) formData.append("courseId", selectedCourse._id); // send course ID

      // Files
      formData.append("image", photoFile);
      formData.append("signature", signatureFile);

      if (token) {
        const res = await axiosInstance.post("/institution/create-student", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success(res.data.message);
        reset();
        setPhotoFile(null);
        setSignatureFile(null);
        setPhotoPreview(null);
        setSignPreview(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
      reset();
        setPhotoFile(null);
        setSignatureFile(null);
        setPhotoPreview(null);
        setSignPreview(null);
    }
  };


  const courseDataGet = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/institution/get-course", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      setCourseData(res.data.data);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  console.log("=>", courseData)

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Student Registration
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Add student information
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* STUDENT ID */}
          <div>
            <label className="text-sm font-medium">Student ID</label>
            <InputText className="w-full mt-1" {...register("studentId")} />
            {errors.studentId && (
              <small className="text-red-500">
                {errors.studentId.message}
              </small>
            )}
          </div>

          {/* PHOTO */}
          <div>
            <label className="text-sm font-medium">Photo <span className=" text-xl text-red-500">*</span></label>
            <div className="flex items-center gap-4 mt-1">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" />
                ) : (
                  <i className="pi pi-user text-gray-400 text-2xl"></i>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>

          {/* NAME */}
          <div>
            <label className="text-sm font-medium">Name  <span className=" text-xl text-red-500">*</span> </label>
            <InputText className="w-full mt-1" {...register("name")} />
            {errors.name && <small className="text-red-500">{errors.name.message}</small>}
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium">Email  <span className=" text-xl text-red-500">*</span></label>
            <InputText className="w-full mt-1" {...register("email")} />
            {errors.email && (
              <small className="text-red-500">
                {errors.email.message}
              </small>
            )}
          </div>

          {/* PHONE */}
          <div>
            <label className="text-sm font-medium">Phone number  <span className=" text-xl text-red-500">*</span></label>
            <InputText className="w-full mt-1" {...register("phone")} />
            {errors.phone && (
              <small className="text-red-500">
                {errors.phone.message}
              </small>
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
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
          </div>

          {/* FATHER NAME */}
          <div>
            <label className="text-sm font-medium">Father Name</label>
            <InputText className="w-full mt-1" {...register("fatherName")} />
            {errors.fatherName && (
              <small className="text-red-500">
                {errors.fatherName.message}
              </small>
            )}
          </div>

          {/* BLOOD GROUP ✅ FIXED */}
          <div>
            <label className="text-sm font-medium">Blood Group</label>
            <Controller
              name="bloodGroup"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  options={bloodGroups}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select blood group"
                  className="w-full mt-1"
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
            {errors.bloodGroup && (
              <small className="text-red-500">
                {errors.bloodGroup.message}
              </small>
            )}
          </div>


          <div>
            <label className="text-sm font-medium">Add Course</label>
            <Controller
              name="course"
              control={control}
              render={({ field }) => (
                <Dropdown
                  {...field}
                  value={selectedCourse}
                  options={courseData}
                  optionLabel="name"
                  placeholder="Select Course"
                  className="w-full mt-1"
                  onChange={(e) => {
                    setSelectedCourse(e.value);
                    field.onChange(e.value);
                  }}
                  itemTemplate={(course) => (
                    <div className="flex items-center gap-3">
                      <img
                        src={course.image}
                        alt={course.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium">{course.name}</div>
                        <div className="text-sm text-gray-500">${course.fee}</div>
                      </div>
                    </div>
                  )}
                  valueTemplate={(course) =>
                    course ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={course.image}
                          alt={course.name}
                          className="w-6 h-6 object-cover rounded"
                        />
                        <span>{course.name}</span>
                      </div>
                    ) : (
                      <span>Select course</span>
                    )
                  }
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
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
          </div>

          {/* SIGNATURE */}
          <div>
            <label className="text-sm font-medium">Signature  <span className=" text-xl text-red-500">*</span></label>
            <div className="flex items-center gap-4 mt-1">
              {signPreview && (
                <img src={signPreview} className="h-10 border rounded" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSignatureFile(file);
                    setSignPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>

          {/* SUBMIT */}
          <Button
            label="Save Student"
            icon="pi pi-check"
            className="w-full mt-3"
          />
        </form>

        <ToastContainer />
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { StudentSchema } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import { z } from "zod";
import axios from "axios";
import { MultiSelect } from "primereact/multiselect";

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
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesMaster, setFeesMaster] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);


  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  // Cleanup on unmount or when previews change: stop webcam and revoke object URLs
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        streamRef.current = null;
      }
      if (photoPreview) {
        try { URL.revokeObjectURL(photoPreview); } catch (e) {}
      }
      if (signPreview) {
        try { URL.revokeObjectURL(signPreview); } catch (e) {}
      }
    };
  }, [photoPreview, signPreview]);



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

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    try {
      // Photo and signature are optional now; append only when provided

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      if (data.studentId) formData.append("studentId", data.studentId);
      if (data.dob) formData.append("dob", data.dob.toISOString());
      if (data.fatherName) formData.append("fatherName", data.fatherName);
      if (data.bloodGroup) formData.append("bloodGroup", data.bloodGroup);
      if (data.admissionDate) formData.append("admissionDate", data.admissionDate.toISOString());
      if (photoFile) {
        formData.append("image", photoFile);
      }
      if (signatureFile) {
        formData.append("signature", signatureFile);
      }

      if (token) {
        const res = await axiosInstance.post("/student/create-student", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success(res.data.message);
        reset();
        setPhotoFile(null);
        setSignatureFile(null);
        setPhotoPreview(null);
        setSignPreview(null);
        setSelectedCourses([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8">
      <Card className="w-full max-w-4xl shadow-md border-0">
        {/* Header (compact) */}
        <div className="text-center mb-4 pb-3 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-2 shadow-sm">
            <i className="pi pi-user-plus text-2xl text-white"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Student Registration</h2>
          <p className="text-sm text-gray-500">Add new student with complete information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">


          {/* Photo & Student ID Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="pi pi-id-card text-blue-600"></i>
              Identity Information
            </h3>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student ID */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Student ID <span className="text-red-500">*</span></label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-white">
                    <i className="pi pi-hashtag text-blue-600"></i>
                  </span>
                  <InputText className="w-full" {...register("studentId")} placeholder="Auto-generated or custom" />
                </div>
                {errors.studentId && (
                  <small className="text-red-500 flex items-center gap-1">
                    <i className="pi pi-exclamation-circle"></i>
                    {errors.studentId.message}
                  </small>
                )}
              </div>

              {/* PHOTO */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                    Student Photo (optional)
                </label>
                <div
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-blue-300 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all bg-white shadow-sm group-hover:shadow-md">
                    {photoPreview ? (
                      <img src={photoPreview} className="w-full h-full object-cover" alt="Photo preview" />
                    ) : (
                      <i className="pi pi-camera text-blue-400 text-3xl"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium mb-1">Click to upload student photo</p>
                    <p className="text-xs text-gray-500">JPG, PNG (Max 5MB)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" className="p-2 text-sm text-blue-600" onClick={() => photoInputRef.current?.click()}>Choose file</button>
                  <button type="button" className="p-2 text-sm text-blue-600" onClick={async () => {
                    if (webcamOpen) {
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach((t) => t.stop());
                        streamRef.current = null;
                      }
                      setWebcamOpen(false);
                      return;
                    }
                    try {
                      const s = await navigator.mediaDevices.getUserMedia({ video: true });
                      streamRef.current = s;
                      setWebcamOpen(true);
                      setTimeout(() => {
                        if (videoRef.current) {
                          videoRef.current.srcObject = s;
                          videoRef.current.play().catch(() => {});
                        }
                      }, 50);
                    } catch (err) {
                      console.error('Webcam error', err);
                      toast.error('Unable to access webcam');
                    }
                  }}>Use Webcam</button>
                </div>

                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (photoPreview) URL.revokeObjectURL(photoPreview);
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }} />

                {webcamOpen && (
                  <div className="mt-3">
                    <video ref={videoRef} className="w-full rounded-md border" />
                    <div className="flex gap-2 mt-2">
                      <button type="button" className="p-2 bg-blue-600 text-white rounded" onClick={async () => {
                        try {
                          const video = videoRef.current;
                          if (!video) return;
                          const canvas = document.createElement('canvas');
                          canvas.width = video.videoWidth || 640;
                          canvas.height = video.videoHeight || 480;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                          canvas.toBlob((blob) => {
                            if (!blob) return;
                            const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: blob.type });
                            if (photoPreview) URL.revokeObjectURL(photoPreview);
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));

                            // Stop webcam stream and close video after capture
                            if (streamRef.current) {
                              try {
                                streamRef.current.getTracks().forEach((t) => t.stop());
                              } catch (e) {}
                              streamRef.current = null;
                            }
                            if (videoRef.current) {
                              try { videoRef.current.pause(); } catch (e) {}
                              try { (videoRef.current.srcObject as MediaStream | null) = null; } catch (e) {}
                            }
                            setWebcamOpen(false);
                          }, 'image/jpeg');
                        } catch (err) {
                          console.error(err);
                          toast.error('Failed to capture photo');
                        }
                      }}>Capture</button>
                      <button type="button" className="p-2 border rounded" onClick={() => {
                        if (streamRef.current) {
                          streamRef.current.getTracks().forEach((t) => t.stop());
                          streamRef.current = null;
                        }
                        setWebcamOpen(false);
                      }}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-user text-blue-600"></i>
              Personal Information
            </h3>

            {/* NAME, EMAIL, PHONE - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-user text-blue-600"></i>
                  </span>
                  <InputText
                    className="w-full"
                    {...register("name")}
                    placeholder="Enter full name"
                    onKeyDown={(e: any) => {
                      const input = e.currentTarget as HTMLInputElement;
                      const start = input.selectionStart ?? 0;
                      const end = input.selectionEnd ?? 0;

                      // prevent leading space
                      if (e.key === " ") {
                        const prefix = input.value.substring(0, start);
                        if (start === 0 || prefix.trim().length === 0) {
                          e.preventDefault();
                          return;
                        }
                      }

                      // prevent numbers
                      if (e.key >= "0" && e.key <= "9") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e: any) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData("text");
                      const textWithoutNumbers = pastedText.replace(/[0-9]/g, "");
                      const cleanedInsert = textWithoutNumbers.replace(/^\s+/, "");
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
                </div>
                {errors.name && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.name.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-envelope text-blue-600"></i>
                  </span>
                  <InputText className="w-full" {...register("email")} placeholder="Enter your emaill" />
                </div>
                {errors.email && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.email.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-phone text-blue-600"></i>
                  </span>
                  <InputText
                    className="w-full"
                    {...register("phone")}
                    placeholder="Enter your phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey || e.altKey) return;
                      const allowed = ["Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Tab", "Home", "End"];
                      if (allowed.includes(e.key)) return;
                      if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                    }}
                    onPaste={(e) => {
                      const paste = (e.clipboardData || (window as any).clipboardData).getData('text') || '';
                      const digits = paste.replace(/\D/g, '');
                      if (!digits) {
                        e.preventDefault();
                        return;
                      }
                      e.preventDefault();
                      const el = e.currentTarget as HTMLInputElement;
                      const start = el.selectionStart || 0;
                      const end = el.selectionEnd || 0;
                      const newVal = el.value.slice(0, start) + digits + el.value.slice(end);
                      el.value = newVal;
                      setValue('phone', newVal);
                      el.dispatchEvent(new Event('input', { bubbles: true }));
                    }}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLInputElement;
                      const cleaned = el.value.replace(/\D/g, '');
                      if (el.value !== cleaned) {
                        el.value = cleaned;
                        setValue('phone', cleaned);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                  />
                </div>
                {errors.phone && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.phone.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Guardian's Name</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-users text-blue-600"></i>
                  </span>
                  <InputText
                    className="w-full"
                    {...register("fatherName")}
                    placeholder="Enter guardian's name"
                    onKeyDown={(e: any) => {
                      const input = e.currentTarget as HTMLInputElement;
                      const start = input.selectionStart ?? 0;
                      const end = input.selectionEnd ?? 0;

                      // prevent leading space
                      if (e.key === " ") {
                        const prefix = input.value.substring(0, start);
                        if (start === 0 || prefix.trim().length === 0) {
                          e.preventDefault();
                          return;
                        }
                      }

                      // prevent numbers
                      if (e.key >= "0" && e.key <= "9") {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e: any) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData("text");
                      const textWithoutNumbers = pastedText.replace(/[0-9]/g, "");
                      const cleanedInsert = textWithoutNumbers.replace(/^\s+/, "");
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
                      setValue("fatherName", normalized);
                      input.dispatchEvent(new Event("input", { bubbles: true }));
                    }}
                  />
                </div>
                {errors.fatherName && <small className="text-red-500">{errors.fatherName.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Date of Birth</label>
                <Controller
                  name="dob"
                  control={control}
                  render={({ field }) => (
                    <Calendar placeholder="Select date of birth"className="w-full" showIcon value={field.value} onChange={(e) => field.onChange(e.value)} dateFormat="dd/mm/yy" />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Blood Group</label>
                <Controller
                  name="bloodGroup"
                  control={control}
                  render={({ field }) => (
                    <Dropdown {...field} options={bloodGroups} optionLabel="label" optionValue="value" placeholder="Select blood group" className="w-full" value={field.value} onChange={(e) => field.onChange(e.value)} />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Admission Date</label>
                <Controller
                  name="admissionDate"
                  control={control}
                  render={({ field }) => (
                    <Calendar placeholder="Select admission date" className="w-full" showIcon value={field.value} onChange={(e) => field.onChange(e.value)} dateFormat="dd/mm/yy" />
                  )}
                />
              </div>
            </div>
          </div>
          {/* SIGNATURE */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Signature (optional)
            </label>
            <div
              className="border-2 border-dashed border-blue-300 rounded-2xl p-6 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all bg-gradient-to-br from-blue-50 to-indigo-50 group"
              onClick={() => signatureInputRef.current?.click()}
            >
              {signPreview ? (
                <img src={signPreview} className="h-20 max-w-full object-contain" alt="Signature preview" />
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="pi pi-pencil text-3xl text-blue-600"></i>
                  </div>
                  <p className="text-blue-600 font-semibold mb-1">Click to upload signature</p>
                  <p className="text-xs text-gray-500">PNG, JPG (Max 2MB)</p>
                </div>
              )}
            </div>
            <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSignatureFile(file);
                setSignPreview(URL.createObjectURL(file));
              }
            }} />
          </div>

          {/* SUBMIT */}
          <div className="pt-4">
            <Button
              type="submit"
              label={isSubmitting ? "Saving Student..." : "Register Student"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-user-plus"}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
              disabled={isSubmitting}
            />
          </div>
        </form>

        <ToastContainer />
      </Card>
    </div>
  );
}

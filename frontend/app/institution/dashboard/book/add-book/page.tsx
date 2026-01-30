"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import Image from "next/image";
import { z } from "zod";
import { BookSchema } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import microInstance from "@/service/micro.service";
import axios from "axios";

// PrimeReact Components
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Card } from "primereact/card";
import { Button } from "primereact/button";

type BookFormData = z.infer<typeof BookSchema>;

const languageOptions = [
  { label: "English", value: "English" },
  { label: "Hindi", value: "Hindi" },
  { label: "Bengali", value: "Bengali" },
  { label: "Spanish", value: "Spanish" },
  { label: "French", value: "French" },
  { label: "German", value: "German" },
  { label: "Chinese", value: "Chinese" },
  { label: "Japanese", value: "Japanese" },
  { label: "Other", value: "Other" },
];

export default function AddBookForm() {
  const [token, setToken] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<BookFormData>({
    resolver: zodResolver(BookSchema) as Resolver<BookFormData>,
    defaultValues: {
      bookFee: 0,
      lateFee: 0,
    },
  });

  const selectedLanguage = watch("language");
  const bookFee = watch("bookFee");
  const lateFee = watch("lateFee");

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH ACTIVE SETTINGS ================= */
  useEffect(() => {
    if (!token) return;

    const fetchActiveSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await microInstance.get("/api/book/settings", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        console.log("Settings fetch response:", res);

        if (res.data?.success && res.data?.data) {
          const settingsData = res.data.data;

          // Check if settings is active and prefill
          if (settingsData.isActive) {
            setValue("bookFee", settingsData.book_fee || 0);
            setValue("lateFee", settingsData.late_fine || 0);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch settings:", error);
        toast.error(error?.response?.data?.message);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchActiveSettings();
  }, [token, setValue]);

  const handleImagePreview = (file: File) => {
    // This already revokes the previous URL and sets a new one
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: BookFormData) => {
    if (!imageFile) {
      toast.error("Book image is required");
      return;
    }
    if (!token) {
      toast.error("Authentication token not found. Please login.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("authorName", data.authorName);
      formData.append("language", data.language);
      formData.append("description", data.description);
      if (data.bookFee !== undefined && data.bookFee !== null) {
        formData.append("book_fee", data.bookFee.toString());
      }
      if (data.lateFee !== undefined && data.lateFee !== null) {
        formData.append("late_fine", data.lateFee.toString());
      }
      formData.append("image", imageFile);

      const res = await microInstance.post("/book/createbook", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      toast.success(res.data?.message || "Book added successfully!");
      reset();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setImageFile(null);
    } catch (error: any) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("Preview URL:", preview);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="min-h-screen w-full flex items-start justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 pt-24">
      <Card className="w-full max-w-4xl shadow-2xl border-0">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-book text-3xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Add New Book</h2>
          <p className="text-gray-500">Add a book to your library collection</p>
        </div>

        {loadingSettings && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <i className="pi pi-spin pi-spinner text-blue-600 text-xl"></i>
            <span className="text-blue-700 font-medium">Loading default fee settings...</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Image Upload Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="pi pi-image text-blue-600"></i>
              Book Cover
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Book Cover Image <span className="text-red-500">*</span>
              </label>
              <div
                className="relative h-64 w-full border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center overflow-hidden bg-white hover:border-blue-500 cursor-pointer transition-all duration-300"
                onClick={() => imageInputRef.current?.click()}
              >
                {preview ? (
                  // Use native img like the student page to avoid next/image + blob URL issues
                  <img
                    src={preview}
                    alt="Book Cover Preview"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="pi pi-cloud-upload text-5xl text-blue-500"></i>
                    </div>
                    <p className="text-blue-600 font-semibold text-lg mb-2">
                      Click to upload book cover
                    </p>
                    <p className="text-sm text-gray-500">PNG, JPG or GIF up to 10MB</p>
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

          {/* Book Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <i className="pi pi-info-circle text-blue-600"></i>
              Book Information
            </h3>

            {/* Book Name & Author Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Book Name <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-book text-blue-600"></i>
                  </span>
                  <InputText className="w-full" placeholder="Enter book title" {...register("name")} />
                </div>
                {errors.name && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.name.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Author Name <span className="text-red-500">*</span>
                </label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon bg-blue-50">
                    <i className="pi pi-user text-blue-600"></i>
                  </span>
                  <InputText className="w-full" placeholder="Enter author name" {...register("authorName")} />
                </div>
                {errors.authorName && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.authorName.message}</small>}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Language <span className="text-red-500">*</span>
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50">
                  <i className="pi pi-globe text-blue-600"></i>
                </span>
                <Dropdown
                  className="w-full"
                  options={languageOptions}
                  value={selectedLanguage}
                  placeholder="Select language"
                  onChange={(e) => setValue("language", e.value, { shouldValidate: true })}
                />
              </div>
              {errors.language && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.language.message}</small>}
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
                placeholder="Describe the book content, genre, and key features..."
                {...register("description")}
              />
              {errors.description && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.description.message}</small>}
            </div>
          </div>

          {/* Fee Information */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="pi pi-wallet text-blue-600"></i>
              Fee Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Book Fee <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  className="w-full"
                  mode="currency"
                  currency="INR"
                  locale="en-IN"
                  placeholder="₹0.00"
                  minFractionDigits={2}
                  value={bookFee}
                  onValueChange={(e) => setValue("bookFee", e.value ?? 0, { shouldValidate: true })}
                />
                {errors.bookFee && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.bookFee.message}</small>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Late Fee (per day) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  className="w-full"
                  mode="currency"
                  currency="INR"
                  locale="en-IN"
                  placeholder="₹0.00"
                  minFractionDigits={2}
                  value={lateFee}
                  onValueChange={(e) => setValue("lateFee", e.value ?? 0, { shouldValidate: true })}
                />
                {errors.lateFee && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.lateFee.message}</small>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              label={isSubmitting ? "Adding Book..." : "Add Book to Library"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-plus-circle"}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            />
          </div>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </Card>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 pt-24">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-8">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">Add New Book</h2>
          <p className="text-gray-500 mt-2">Fill in the details to add a book to your library</p>
        </div>

        {loadingSettings && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <i className="pi pi-spin pi-spinner mr-2"></i>
            Loading default fee settings...
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Book Cover Image <span className="text-red-500">*</span>
            </label>

            <div className="relative z-0 h-48 w-full border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 hover:border-indigo-400 cursor-pointer">
              {preview ? (
                <Image src={preview} alt="Book Cover Preview" fill className="object-contain p-2" />
              ) : (
                <div className="text-center">
                  <i className="pi pi-image text-5xl text-gray-400"></i>
                  <p className="mt-2 text-gray-500">Click to upload book cover</p>
                </div>
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

          {/* Book Name & Author Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Book Name <span className="text-red-500">*</span>
              </label>
              <InputText
                className="w-full"
                placeholder="Enter book name"
                {...register("name")}
              />
              {errors.name && <small className="text-red-500">{errors.name.message}</small>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Author Name <span className="text-red-500">*</span>
              </label>
              <InputText
                className="w-full"
                placeholder="Enter author name"
                {...register("authorName")}
              />
              {errors.authorName && <small className="text-red-500">{errors.authorName.message}</small>}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Language <span className="text-red-500">*</span>
            </label>
            <Dropdown
              className="w-full"
              options={languageOptions}
              value={selectedLanguage}
              placeholder="Select language"
              onChange={(e) => setValue("language", e.value, { shouldValidate: true })}
            />
            {errors.language && <small className="text-red-500">{errors.language.message}</small>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <InputTextarea
              className="w-full"
              rows={5}
              autoResize
              placeholder="Describe the book content, genre, and key features..."
              {...register("description")}
            />
            {errors.description && <small className="text-red-500">{errors.description.message}</small>}
          </div>

          {/* Book Fee & Late Fee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
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
              {errors.bookFee && <small className="text-red-500">{errors.bookFee.message}</small>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Late Fee <span className="text-red-500">*</span>
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
              {errors.lateFee && <small className="text-red-500">{errors.lateFee.message}</small>}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full  bg-primary text-white py-3 rounded-lg font-semibold text-lg transition-all shadow-lg ${isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-blue-700 transform hover:scale-[1.02]"}`}
          >
            {isSubmitting ? "Adding Book..." : "Add Book to Library"}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
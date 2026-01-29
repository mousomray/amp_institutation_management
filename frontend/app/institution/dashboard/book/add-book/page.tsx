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

type BookFormData = z.infer<typeof BookSchema>;

const languageOptions = [
  "English",
  "Hindi",
  "Bengali",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Other",
];

export default function AddBookForm() {
  const [token, setToken] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BookFormData>({
    resolver: zodResolver(BookSchema) as Resolver<BookFormData>,
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  const onSubmit = async (data: BookFormData) => {
    console.log("Image file....", imageFile);
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
      formData.append("image", imageFile);

      console.log("Sending book create request", { url: "/book/createbook", token });
      const res = await microInstance.post("/book/createbook", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type for FormData here; browser will set boundary
        },
        withCredentials: true,
      });

      console.log("API success:", res.data);
      toast.success(res.data?.message || "Book added successfully!");
      reset();
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setPreview(null);
      setImageFile(null);
    } catch (error: any) {
      console.error("API Error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImagePreview = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    // revoke previous preview if exists
    if (preview) URL.revokeObjectURL(preview);
    setPreview(imageUrl);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center">Add New Book</h2>
          <p className="text-gray-500 text-center mt-2">Fill in the details to add a book to your library</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-2">
              Book Cover Image <span className="text-red-500">*</span>
            </label>

            {/* make preview area clickable by wrapping in a label tied to the file input */}
            <label
              htmlFor="bookImage"
              className="relative h-48 w-full border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 hover:border-indigo-400 transition-colors cursor-pointer"
            >
              {preview ? (
                <Image 
                  src={preview} 
                  alt="Book Cover Preview" 
                  fill 
                  className="object-contain p-2" 
                />
              ) : (
                <div className="text-center pointer-events-none">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    Click to upload book cover
                  </p>
                </div>
              )}
            </label>

            {/* hidden file input tied to the above label; required for intent */}
            <input
              id="bookImage"
              type="file"
              accept="image/*"
              className="mt-2 block"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  handleImagePreview(file);
                }
              }}
              aria-required="true"
              required
            />
          </div>

          {/* Name and Author Name - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Book Name */}
            <div>
              <label className="block text-xl font-semibold text-gray-700 mb-1">
                Book Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter book name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                {...register("name")}
                aria-required="true"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-xl font-semibold text-gray-700 mb-1">
                Author Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter author name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                {...register("authorName")}
                aria-required="true"
              />
              {errors.authorName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.authorName.message}
                </p>
              )}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-1">
              Language <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              {...register("language")}
              aria-required="true"
            >
              <option value="">Select language</option>
              {languageOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            {errors.language && (
              <p className="text-red-500 text-xs mt-1">
                {errors.language.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Describe the book content, genre, and key features..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              {...register("description")}
              aria-required="true"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold text-lg transition-all shadow-lg ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:from-indigo-700 hover:to-blue-700 transform hover:scale-[1.02]"
            }`}
          >
            {isSubmitting ? "Adding Book..." : "Add Book to Library"}
          </button>
        </form>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

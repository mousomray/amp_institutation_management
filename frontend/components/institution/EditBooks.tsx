"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import microInstance from "@/service/micro.service";
import axios from "axios";

type EditBookProps = {
  book: any | null;
  refetch?: () => void;
  onClose: () => void;
};

export default function EditBookForm({
  book,
  refetch,
  onClose,
}: EditBookProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>();

  /* PREFILL */
  useEffect(() => {
    if (!book) return;
    reset({
      name: book.name,
      authorName: book.authorName,
      language: book.language,
      description: book.description,
      isAvailable: !!book.isAvailable,
    });
    setPreview(book.image || null);
  }, [book, reset]);

  /* SUBMIT */
  const onSubmit = async (data: any) => {
    try {
      // send update request (adjust endpoint if your API differs)
      const res = await microInstance.put(`/book/updatebook/${book._id}`, data);

      toast.success(res.data.message || "Book updated successfully");
      refetch && refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  if (!book) return null;

  return (
    <div className="w-full bg-white rounded-xl p-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-5 text-center">
        Edit Book
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* IMAGE (READ ONLY) */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Book Image
          </label>

          <div className="relative h-40 w-full border rounded-lg overflow-hidden">
            {preview ? (
              // use plain <img> to avoid next/image host config
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.startsWith("http") ? preview : `${(process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/+$/, "")}/${preview.replace(/^\/+/, "").replace(/\\/g, "/")}`}
                alt="Book"
                className="object-cover h-full w-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No Image
              </div>
            )}
          </div>
        </div>

        {/* NAME */}
        <div>
          <label className="block text-sm font-medium text-gray-600">Book Title</label>
          <input type="text" className="w-full mt-1 px-3 py-2 border rounded-lg" {...register("name")} />
          {errors.name && <p className="text-red-500 text-xs">{(errors as any).name?.message}</p>}
        </div>

        {/* AUTHOR */}
        <div>
          <label className="block text-sm font-medium text-gray-600">Author Name</label>
          <input type="text" className="w-full mt-1 px-3 py-2 border rounded-lg" {...register("authorName")} />
          {errors.authorName && <p className="text-red-500 text-xs">{(errors as any).authorName?.message}</p>}
        </div>

        {/* LANGUAGE */}
        <div>
          <label className="block text-sm font-medium text-gray-600">Language</label>
          <input type="text" className="w-full mt-1 px-3 py-2 border rounded-lg" {...register("language")} />
          {errors.language && <p className="text-red-500 text-xs">{(errors as any).language?.message}</p>}
        </div>

        {/* AVAILABILITY */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isAvailable" {...register("isAvailable")} />
          <label htmlFor="isAvailable" className="text-sm text-gray-600">Available</label>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-sm font-medium text-gray-600">Description</label>
          <textarea rows={4} className="w-full mt-1 px-3 py-2 border rounded-lg resize-none" {...register("description")} />
          {errors.description && <p className="text-red-500 text-xs">{(errors as any).description?.message}</p>}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">Update Book</button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}

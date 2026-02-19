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

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<any>();

  const nameValue = watch("name");
  const authorValue = watch("authorName");

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="edit-book-title"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-4xl mx-4">
        <div
          className="bg-white rounded-xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 id="edit-book-title" className="text-lg font-semibold text-gray-800">Edit Book</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                aria-label="Close edit book"
                className="text-gray-500 hover:text-gray-700 rounded-md p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LEFT: Image */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-600 mb-2">Book Image</label>
                <div className="relative h-56 w-full border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.startsWith("http") ? preview : `${(process.env.NEXT_PUBLIC_LIBRARY_API || "").replace(/\/+$/, "")}/${preview.replace(/^\/+/, "").replace(/\\/g, "/")}`}
                      alt="Book"
                      className="object-contain h-full w-full p-3"
                    />
                  ) : (
                    <div className="text-gray-400">No Image</div>
                  )}
                </div>
              </div>

              {/* RIGHT: Fields */}
              <div className="col-span-2">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Book Title</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      {...register("name")}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        const target = e.target as HTMLInputElement;
                        const isSpace = e.key === " ";
                        if (isSpace && (target.selectionStart === 0 || target.value.length === 0)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                        const paste = e.clipboardData.getData("text");
                        const cleaned = paste.replace(/^\s+/, "");
                        if (cleaned !== paste) {
                          e.preventDefault();
                          const newVal = (nameValue || "") + cleaned;
                          setValue("name", newVal, { shouldValidate: true });
                        }
                      }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        const val = e.target.value || "";
                        const cleaned = val.replace(/^\s+/, "");
                        if (cleaned !== val) setValue("name", cleaned, { shouldValidate: true });
                      }}
                    />
                    {errors.name && <p className="text-red-500 text-xs">{(errors as any).name?.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600">Author Name</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      {...register("authorName", {
                        required: "Author name is required",
                        validate: (v: string) => {
                          const cleaned = (v || "").replace(/^\s+/, "");
                          if (cleaned.length < 3) return "Author name must be at least 3 characters";
                          if (/\d/.test(cleaned)) return "Author name cannot contain numbers";
                          return true;
                        },
                      })}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (/\d/.test(e.key)) {
                          e.preventDefault();
                          return;
                        }
                        const target = e.target as HTMLInputElement;
                        const isSpace = e.key === " ";
                        if (isSpace && (target.selectionStart === 0 || target.value.length === 0)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                        const paste = e.clipboardData.getData("text");
                        const cleaned = paste.replace(/\d+/g, "").replace(/^\s+/, "");
                        e.preventDefault();
                        const newVal = (authorValue || "") + cleaned;
                        setValue("authorName", newVal, { shouldValidate: true });
                      }}
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        let val = e.target.value || "";
                        val = val.replace(/\d+/g, "").replace(/^\s+/, "");
                        if (val !== authorValue) setValue("authorName", val, { shouldValidate: true });
                      }}
                    />
                    {errors.authorName && <p className="text-red-500 text-xs">{(errors as any).authorName?.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600">Language</label>
                    <input type="text" className="w-full mt-1 px-3 py-2 border rounded-lg" {...register("language")} />
                    {errors.language && <p className="text-red-500 text-xs">{(errors as any).language?.message}</p>}
                  </div>

                  {/* <div className="flex items-center gap-3">
                    <input type="checkbox" id="isAvailable" {...register("isAvailable")} />
                    <label htmlFor="isAvailable" className="text-sm text-gray-600">Available</label>
                  </div> */}

                  <div>
                    <label className="block text-sm font-medium text-gray-600">Description</label>
                    <textarea rows={4} className="w-full mt-1 px-3 py-2 border rounded-lg resize-none" {...register("description")} />
                    {errors.description && <p className="text-red-500 text-xs">{(errors as any).description?.message}</p>}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Update Book</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}

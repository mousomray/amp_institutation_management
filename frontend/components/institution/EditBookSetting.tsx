"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { bookSetting } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { InputNumber } from "primereact/inputnumber";
import { ToastContainer, toast } from "react-toastify";
import microInstance from "@/service/micro.service";
import axios from "axios";

type BookSettingForm = z.infer<typeof bookSetting>;

type EditBookSettingProps = {
  setting: any | null;
  refetch: () => void;
  onClose: () => void;
};

export default function EditBookSetting({
  setting,
  refetch,
  onClose,
}: EditBookSettingProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loadingSingle, setLoadingSingle] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookSettingForm>({
    resolver: zodResolver(bookSetting as any),
  });

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  /* ================= FETCH SINGLE SETTING ================= */
  useEffect(() => {
    if (!setting?._id || !token) return;

    const fetchSingle = async () => {
      setLoadingSingle(true);
      try {
        const res = await microInstance.get(`/api/book/settings/${setting._id}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        const data = res.data?.data;
        if (data) {
          reset({
            bookFee: data.book_fee || 0,
            lateFee: data.late_fine || 0,
          });
        }
      } catch (error: any) {
        console.error(error);
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to fetch setting");
        } else {
          toast.error("Unexpected error occurred");
        }
      } finally {
        setLoadingSingle(false);
      }
    };

    fetchSingle();
  }, [setting?._id, token, reset]);

  /* ================= SUBMIT UPDATE ================= */
  const onSubmit = async (data: BookSettingForm) => {
    if (!token) {
      toast.error("Authentication token not found. Please login.");
      return;
    }

    if (!setting?._id) {
      toast.error("Setting ID is missing");
      return;
    }

    try {
      const payload = {
        book_fee: data.bookFee,
        late_fine: data.lateFee,
      };

      const res = await microInstance.put(
        `/api/book/updatesettings/${setting._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success(res.data?.message || "Book setting updated successfully");
      refetch();
      onClose();
    } catch (error: any) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  if (!setting) return null;

  return (
    <div className="w-full bg-white rounded-xl shadow p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Book Setting</h2>

      {loadingSingle ? (
        <p className="text-gray-500">Loading setting...</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* BOOK FEE */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Book Fee <span className="text-red-500">*</span>
            </label>

            <Controller
              name="bookFee"
              control={control}
              render={({ field }) => (
                <InputNumber
                  value={field.value}
                  onValueChange={(e) => field.onChange(e.value)}
                  mode="currency"
                  currency="INR"
                  locale="en-IN"
                  minFractionDigits={2}
                  className="w-full"
                  placeholder="₹0.00"
                />
              )}
            />

            {errors.bookFee && (
              <p className="text-red-500 text-xs mt-1">{errors.bookFee.message}</p>
            )}
          </div>

          {/* LATE FEE */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Late Fee <span className="text-red-500">*</span>
            </label>

            <Controller
              name="lateFee"
              control={control}
              render={({ field }) => (
                <InputNumber
                  value={field.value}
                  onValueChange={(e) => field.onChange(e.value)}
                  mode="currency"
                  currency="INR"
                  locale="en-IN"
                  minFractionDigits={2}
                  className="w-full"
                  placeholder="₹0.00"
                />
              )}
            />

            {errors.lateFee && (
              <p className="text-red-500 text-xs mt-1">{errors.lateFee.message}</p>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 bg-primary text-white rounded-lg ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
              }`}
            >
              {isSubmitting ? "Saving..." : "Update Setting"}
            </button>
          </div>
        </form>
      )}

      <ToastContainer />
    </div>
  );
}

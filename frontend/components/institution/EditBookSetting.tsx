"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { bookSetting } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { InputNumber } from "primereact/inputnumber";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
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
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookSettingForm>({
    resolver: zodResolver(bookSetting as any),
  });

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (!setting) return;

    reset({
      bookFee: setting.bookFee,
      lateFee: setting.lateFee,
    });
  }, [setting, reset]);

  /* ================= SUBMIT ================= */
  const onSubmit = async (data: BookSettingForm) => {
    try {
      const res = await axiosInstance.put(
        `/institution/update-book-setting/${setting._id}`,
        data
      );

      toast.success(res.data.message || "Book setting updated");
      refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };

  if (!setting) return null;

  return (
    <div className="w-full bg-white rounded-xl p-4">

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* BOOK FEE */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
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
                className="w-full mt-1"
                  placeholder="₹0.00"
              />
            )}
          />

          {errors.bookFee && (
            <p className="text-red-500 text-xs">{errors.bookFee.message}</p>
          )}
        </div>

        {/* LATE FEE */}
        <div>
          <label className="block text-sm font-medium text-gray-600">
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
                className="w-full mt-1"
                  placeholder="₹0.00"
              />
            )}
          />

          {errors.lateFee && (
            <p className="text-red-500 text-xs">{errors.lateFee.message}</p>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Update Setting"}
          </button>
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}

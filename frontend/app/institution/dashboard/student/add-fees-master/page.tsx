"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const FeesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().nonnegative("Amount must be >= 0"),
});
type FeesFormData = z.infer<typeof FeesSchema>;

export default function Page() {
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeesFormData>({
    resolver: zodResolver(FeesSchema),
  });

  const onSubmit = async (data: FeesFormData) => {
    setIsSubmitting(true);
    try {
      if (!token) return toast.error("Authentication token missing");
      const payload = { name: data.name, amount: data.amount };
      const res = await axiosInstance.post("/institution/add-fees-master", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Fees master added");
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <div className="text-center mb-6 pb-4 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-3 shadow-lg">
            <i className="pi pi-wallet text-2xl text-white"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Add Fees Master</h2>
          <p className="text-gray-500">Create a new fees entry</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Fee Name <span className="text-red-500">*</span></label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50"><i className="pi pi-tag text-blue-600"></i></span>
                <InputText className="w-full" {...register("name")} placeholder="e.g. Electric Fees" />
              </div>
              {errors.name && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{errors.name.message}</small>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Amount (₹) <span className="text-red-500">*</span></label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50"><i className="pi pi-money-bill text-blue-600"></i></span>
                <InputText type="number" step="0.01" className="w-full" {...register("amount", { valueAsNumber: true })} placeholder="200" />
              </div>
              {errors.amount && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle"></i>{String(errors.amount.message)}</small>}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              label={isSubmitting ? "Saving..." : "Add Fees"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
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

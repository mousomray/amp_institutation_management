"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";
import axios from "axios";

// Define schema locally to ensure it matches
const FeesSchema = z.object({
  name: z.string().refine((s) => s.trim().length > 0, { message: "Name is required" }),
  isActive: z.boolean().optional().default(true),
});

type FeesForm = z.infer<typeof FeesSchema>;

type Props = {
  id: string | null;
  refetch: () => void;
  onClose: () => void;
};

export default function EditFeesMaster({ id, refetch, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  console.log("-->", id)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<FeesForm>({
    resolver: zodResolver(FeesSchema as any),
    defaultValues: { name: "", isActive: true },
  });

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) {
      setToken(t);
      console.log("Token found:", t ? "Yes" : "No");
    } else {
      console.warn("No token found in localStorage");
    }
  }, []);

  useEffect(() => {
    if (!id || !token) {
      console.log("Skipping fetch - id:", id, "token:", token ? "exists" : "missing");
      return;
    }
    fetchSingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const fetchSingle = async () => {
    console.log("Fetching fee data for id:", id);
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/fees-master/get-single-fees-master/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      console.log("Fetched data:", data);
      if (data) {
        reset({ name: data.name ?? "", isActive: !!data.isActive });
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to fetch fee");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (form: FeesForm) => {
    console.log("==> Form submitted with data:", form);
    console.log("==> ID:", id);
    console.log("==> Token exists:", !!token);

    // Validate id exists
    if (!id) {
      console.error("ID is missing");
      toast.error("Fee ID is missing");
      return;
    }

    // Validate token exists
    if (!token) {
      console.error("Token is missing");
      toast.error("Authentication token missing");
      return;
    }

    // Trim and validate name to prevent whitespace-only submission
    const trimmedName = String(form.name ?? "").trim();
    if (!trimmedName) {
      console.error("Name is empty after trimming");
      toast.error("Name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = { 
        name: trimmedName, 
        isActive: form.isActive ?? true 
      };
      
      console.log("==> Sending PUT request with payload:", payload);
      console.log("==> URL:", `/fees-master/update-fees-master/${id}`);

      const res = await axiosInstance.put(
        `/fees-master/update-fees-master/${id}`, 
        payload, 
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("==> API Response:", res.data);
      
      toast.success(res.data.message || "Fees master updated successfully");
      refetch();
      onClose();
    } catch (error: any) {
      console.error("==> API Error:", error);
      console.error("==> Error response:", error.response?.data);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || "Update failed";
        console.error("==> Axios error message:", errorMessage);
        toast.error(errorMessage);
      } else {
        console.error("==> Non-axios error:", error);
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Fee Name <span className="text-red-500">*</span>
          </label>
          <div className="p-inputgroup mt-1">
            <span className="p-inputgroup-addon bg-blue-50">
              <i className="pi pi-tag text-blue-600"></i>
            </span>
            <InputText
              className="w-full"
              {...register("name")}
              placeholder="Enter fee name"
              onBlur={() => {
                const v = getValues("name") ?? "";
                setValue("name", String(v).trim());
              }}
            />
          </div>
          {errors.name && (
            <small className="text-red-500 flex items-center gap-1 mt-1">
              <i className="pi pi-exclamation-circle"></i>
              {String(errors.name.message)}
            </small>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Checkbox 
                inputId="isActive" 
                checked={!!field.value} 
                onChange={(e) => field.onChange(e.checked)} 
              />
            )}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
            Active
          </label>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            label={loading ? "Saving..." : "Update Fees"} 
            icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"} 
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            disabled={loading} 
          />
        </div>
      </form>
    </div>
  );
}
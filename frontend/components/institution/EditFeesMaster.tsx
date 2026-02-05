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
import { FeesSchema } from "@/helper/schema/Schema";

type FeesForm = z.infer<typeof FeesSchema>;

type Props = {
  id: string | null;
  refetch: () => void;
  onClose: () => void;
};

export default function EditFeesMaster({ id, refetch, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(FeesSchema),
    defaultValues: { name: "", amount: 0, isActive: true },
  });

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!id || !token) return;
    fetchSingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const fetchSingle = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/institution/get-single-fees-master/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      if (data) {
        reset({ name: data.name ?? "", amount: Number(data.amount ?? 0), isActive: !!data.isActive });
      }
    } catch (error: any) {
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
    if (!id) return;
    // Trim and validate name to prevent whitespace-only submission
    const trimmedName = String(form.name ?? "").trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = { name: trimmedName, amount: form.amount, isActive: form.isActive };
      const res = await axiosInstance.put(`/institution/update-fees-master/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message || "Fees master updated successfully");
      refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
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
          <label className="text-sm font-medium">Fee Name</label>
          <InputText
            className="w-full mt-1"
            {...register("name")}
            onBlur={() => {
              const v = getValues("name") ?? "";
              setValue("name", String(v).trim());
            }}
          />
          {errors.name && <small className="text-red-500">{String(errors.name.message)}</small>}
        </div>

        <div>
          <label className="text-sm font-medium">Amount</label>
          <InputText type="number" step="0.01" className="w-full mt-1" {...register("amount", { valueAsNumber: true })} />
          {errors.amount && <small className="text-red-500">{String(errors.amount.message)}</small>}
        </div>

        <div className="flex items-center gap-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox inputId="isActive" checked={!!field.value} onChange={(e) => field.onChange(e.checked)} />
                <label htmlFor="isActive" className="text-sm ml-2">Active</label>
              </>
            )}
          />
        </div>

        <Button type="submit" label={loading ? "Saving..." : "Update Fees"} icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"} className="w-full" disabled={loading} />
      </form>
    </div>
  );
}

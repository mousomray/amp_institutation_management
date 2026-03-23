"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { ToastContainer, toast } from "react-toastify";
import petrollInstance from "@/service/petroll.service";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Phone is required"),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
});

type UserFormData = z.infer<typeof UserSchema>;

type Props = {
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminPetrollEdit({ userId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({ resolver: zodResolver(UserSchema) });

  useEffect(() => {
    const stored = localStorage.getItem("admin-token");
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await petrollInstance.get(`/api/register/single-user/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const u = res.data.user || res.data;
        reset({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          role: u.role || "",
          isActive: typeof u.isActive === "boolean" ? u.isActive : true,
        });
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message || "Failed to load user");
        } else {
          toast.error("Failed to load user");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, token, reset]);

  const onSubmit = async (data: UserFormData) => {
    if (!userId) return;
    try {
      setLoading(true);

      const payload: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        isActive: !!data.isActive,
      };

      const res = await petrollInstance.put(`/api/register/update-user/${userId}`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      toast.success(res.data.message || "User updated successfully");
      onSuccess();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const onError = (errs: any) => console.log("Validation errors:", errs);

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl">
      <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-medium">Name</label>
          <InputText className="w-full mt-1" disabled={loading} {...register("name")} />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <InputText type="email" className="w-full mt-1" disabled={loading} {...register("email")} />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Phone</label>
          <InputText
            type="tel"
            inputMode="numeric"
            className="w-full mt-1"
            disabled={loading}
            {...register("phone", {
              setValueAs: (v) => String(v ?? "").replace(/\D/g, ""),
            })}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              const allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab"];
              if (allowedKeys.includes(e.key)) return;
              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
            }}
          />
          {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Role</label>
          <InputText
            className="w-full mt-1 bg-gray-100 text-gray-700 cursor-not-allowed"
            readOnly
            disabled
            {...register("role")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium">Active</label>
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input type="checkbox" className="mr-2" disabled={loading} {...register("isActive")} />
              <span className="text-sm">Is Active</span>
            </label>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="button" label="Cancel" severity="secondary" onClick={onClose} disabled={loading} />
          <Button type="submit" label={loading ? "Updating..." : "Update"} loading={loading} disabled={loading} />
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}

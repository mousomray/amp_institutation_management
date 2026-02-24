"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import petrollInstance from "@/service/petroll.service";
import { PetrolPumpAdminSchema } from "@/helper/schema/Schema";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

type PetrolPumpAdminFormData = z.infer<typeof PetrolPumpAdminSchema>;

export default function PetrolPumpAdminForm() {
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin-token");
    if (storedToken !== null) {
      setToken(storedToken);
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PetrolPumpAdminFormData>({
    resolver: zodResolver(PetrolPumpAdminSchema),
  });

  const onSubmit = async (data: PetrolPumpAdminFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      };

      const res = await petrollInstance.post(
        "/api/register/create-admin",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("✅ Admin created successfully:", res);
      toast.success(res.data.message || "Admin created successfully!");
      reset();
    } catch (error: any) {
        console.log("❌ Error creating admin:", error);
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || "Something went wrong";
        toast.error(message);
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.log("❌ Validation errors:", errors);
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-6">
      <div className="bg-white p-6 rounded-lg shadow max-w-2xl w-full">
        {/* FORM HEADER */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Petrol Pump Admin Registration
          </h2>
          <p className="text-sm text-gray-500">
            Add new petrol pump admin details
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit, onError)}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Name */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Name <span className="text-red-500 text-xl">*</span>
            </label>
            <InputText
              placeholder="Enter full name"
              className="w-full mt-1"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Email Address <span className="text-red-500 text-xl">*</span>
            </label>
            <InputText
              type="email"
              placeholder="Enter email address"
              className="w-full mt-1"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Phone No <span className="text-red-500 text-xl">*</span>
            </label>
            <InputText
              type="tel"
              inputMode="numeric"
              placeholder="Enter phone number"
              className="w-full mt-1"
              {...register("phone", {
                setValueAs: (v) => {
                  const s = String(v ?? "").replace(/\D/g, "");
                  return s === "" ? undefined : s;
                },
              })}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                const allowedKeys = [
                  "Backspace",
                  "ArrowLeft",
                  "ArrowRight",
                  "Delete",
                  "Tab",
                ];
                if (allowedKeys.includes(e.key)) return;
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Password <span className="text-red-500 text-xl">*</span>
            </label>
            <InputText
              type="password"
              placeholder="Enter password"
              className="w-full mt-1"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <Button
              type="button"
              label="Reset"
              severity="secondary"
              onClick={() => reset()}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              label={isSubmitting ? "Creating Admin..." : "Create Admin"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
              disabled={isSubmitting}
              className={isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
            />
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

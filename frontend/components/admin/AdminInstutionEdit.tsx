"use client";

import { useForm } from "react-hook-form";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { InstitutionSchema } from "@/helper/schema/Schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axiosInstance from "@/service/axios.service";
import axios from "axios";

type InstitutionFormData = z.infer<typeof InstitutionSchema>;

type Props = {
  institution: any | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminInstutionEdit({
  institution,
  onClose,
  onSuccess,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(InstitutionSchema),
  });

  
  useEffect(() => {
    if (institution) {
      reset({
        name: institution.name,
        email: institution.email,
        phone: institution.phone,
        website: institution.website || "",
        registrationNo: institution.registrationNo ? institution.registrationNo : '',
        establishDate: institution.establishDate
          ? institution.establishDate.split("T")[0]
          : "",
          address: institution.address
      });
    }
  }, [institution, reset]);

  const onSubmit = async (data: InstitutionFormData) => {
    try {
      const res = await axiosInstance.put(
        `/admin/update-institution/${institution._id}`,
        data,
        
      );

      toast.success(res.data.message || "Institution updated successfully");
      onSuccess(); 
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error occurred");
      }
    }
  };
   const onError = (errors: any) => {
  console.log('❌ Validation errors:', errors)
}

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl">
      <form
        onSubmit={handleSubmit(onSubmit , onError)}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {/* Institution Name */}
        <div>
          <label className="text-sm font-medium">Institution Name</label>
          <InputText className="w-full mt-1" {...register("name")} />
          {errors.name && (
            <p className="text-red-500 text-xs">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium">Email Address</label>
          <InputText className="w-full mt-1" {...register("email")} />
          {errors.email && (
            <p className="text-red-500 text-xs">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium">Phone No</label>
          <InputText className="w-full mt-1" {...register("phone")} />
        </div>

        {/* Website */}
        <div>
          <label className="text-sm font-medium">Website</label>
          <InputText className="w-full mt-1" {...register("website")} />
        </div>

        {/* Establish Date */}
        <div>
          <label className="text-sm font-medium">Establish Date</label>
          <InputText
            type="date"
            className="w-full mt-1"
            {...register("establishDate")}
          />
        </div>

        {/* Registration No (Read-only) */}
        <div>
          <label className="text-sm font-medium">Registration No</label>
          <InputText
            className="w-full mt-1"
            {...register("registrationNo")}
            disabled
          />
        </div>

         <div className="md:col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <InputText
                      className="w-full mt-1"
                      {...register("address")}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs">
                        {errors.address.message}
                      </p>
                    )}
                  </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            onClick={onClose}
          />
          <Button type="submit" label="Update" />
        </div>
      </form>

      <ToastContainer />
    </div>
  );
}

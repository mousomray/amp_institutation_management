"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InstitutionSchema } from "@/helper/schema/Schema"
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import axiosInstance from "@/service/axios.service";
import { useAppSelector } from "@/lib/store/hooks"
import { ToastContainer, toast } from 'react-toastify';
import axios from "axios";


type InstitutionFormData = {
  name: string;
  email: string;
  phone: string;
  website: string;
  establishDate: string;
  registrationNo: string;
};

export default function InstitutionForm() {

const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
      const storedToken = localStorage.getItem("admin-token");
      if(storedToken !== null){
        setToken(storedToken)
      }
    },[token])
  type InstitutionFormData = z.infer<typeof InstitutionSchema>
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstitutionFormData>(
    {
      resolver: zodResolver(InstitutionSchema)
    }
  );

  const onSubmit = async (data: InstitutionFormData) => {
   
    try {
      const res = await axiosInstance.post("/admin/create-institution", data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success(res.data.message)
      reset()
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || 'Something went wrong'
        toast.error(message)
      } else {
        toast.error('Unexpected error occurred')
      }
    }
    reset()

  };

  const onError = (errors: any) => {
  console.log('❌ Validation errors:', errors)
}

  return (
    <div className=" w-full h-full flex flex-col justify-center items-center p-6">
      <div className="bg-white p-6 rounded-lg shadow max-w-4xl">
        {/* FORM HEADER */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Institution Form
          </h2>
          <p className="text-sm text-gray-500">
            Add institution details
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Institution Name */}
          <div>
            <label className="text-sm font-medium">Institution Name</label>
            <InputText
              className="w-full mt-1"
              {...register("name", { required: "Institution name is required" })}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <InputText
              className="w-full mt-1"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium">Phone No</label>
            <InputText
              className="w-full mt-1"
              {...register("phone", { required: "Phone number is required" })}
            />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
          </div>

          {/* Website */}
          <div>
            <label className="text-sm font-medium">Website</label>
            <InputText
              className="w-full mt-1"
              {...register("website")}
            />
          </div>

          {/* Establish Date */}
          <div>
            <label className="text-sm font-medium">Establish Date</label>
            <InputText
              type="date"
              className="w-full mt-1"
              {...register("establishDate", { required: true })}
            />
            {errors.establishDate && <p className="text-red-500 text-xs">{errors.establishDate.message}</p>}
          </div>

          {/* Registration No */}
          <div>
            <label className="text-sm font-medium">Registration No</label>
            <InputText
              className="w-full mt-1"
              {...register("registrationNo", { required: true })}
            />
            {errors.registrationNo && <p className="text-red-500 text-xs">{errors.registrationNo.message}</p>}
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



          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <Button
              type="button"
              label="Reset"
              severity="secondary"
              onClick={() => reset()}
            />
            <Button type="submit" label="Save Institution" />
          </div>
        </form>
      </div>
      <ToastContainer/>
    </div>
  );
}

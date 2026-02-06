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
    // disallow names that are only whitespace by checking trimmed length
    name: z.string().refine((s) => s.trim().length > 0, { message: "Name is required" }),
    amount: z.number().nonnegative("Amount must be >= 0"),
});
/** @typedef {import('zod').infer<typeof FeesSchema>} FeesFormData */

type AddFeeMasterProps = {
    onClose: () => void;
    onfetchFees: () => void;
};

export default function AddFeeMaster({ onClose, onfetchFees }: AddFeeMasterProps) {
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
        setValue,
        getValues,
    } = useForm({
        resolver: zodResolver(FeesSchema),
    });

    /** @param {FeesFormData} data */
    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (!token) return toast.error("Authentication token missing");
            // ensure trimmed name is sent
            const payload = { name: String(data.name).trim(), amount: data.amount };
            const res = await axiosInstance.post("/institution/add-fees-master", payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(res.data?.message || "Fees master added");
            reset();
            onClose()
            onfetchFees()
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="px-10 ">
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Fee Name <span className="text-red-500">*</span></label>
                        <div className="p-inputgroup">
                            <span className="p-inputgroup-addon bg-blue-50"><i className="pi pi-tag text-blue-600"></i></span>
                            <InputText
                                className="w-full"
                                {...register("name")}
                                placeholder="Please Enter Electric Fees"
                                onBlur={() => {
                                    // trim the stored value on blur so whitespace-only gets cleaned
                                    const v = getValues("name") ?? "";
                                    setValue("name", String(v).trim());
                                }}
                            />
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

        </div>
    );
}

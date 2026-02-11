import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const OtherSchema = z.object({
  name: z.string().refine((s) => s.trim().length > 0, { message: "Name is required" }),
  amount: z.number().min(1, { message: "Amount must be greater than 0" }),
  description: z.string().optional(),
});
type OtherFormData = z.infer<typeof OtherSchema>;

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddOtherMaster({ onClose, onSuccess }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<OtherFormData>({
    resolver: zodResolver(OtherSchema),
    defaultValues: { name: "", amount: 0, description: "" },
  });

  const onSubmit = async (data: OtherFormData) => {
    setIsSubmitting(true);
    try {
      if (!token) return toast.error("Authentication token missing");
      const payload = { name: String(data.name).trim(), amount: data.amount, description: String(data.description || "").trim() };
      const res = await axiosInstance.post("/other-payment/add-other-payment-master", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Other payment master added");
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm">
              <i className="pi pi-money-bill text-white text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Add Other Payment</h3>
              <p className="text-sm text-gray-500">Create a new other payment master entry</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Name <span className="text-red-500">*</span></label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50"><i className="pi pi-tag text-blue-600"></i></span>
                <InputText
                  className="w-full"
                  {...register("name")}
                  placeholder="Please enter name e.g. Travel Fees"
                  onBlur={() => {
                    const v = getValues("name") ?? "";
                    setValue("name", String(v).trim());
                  }}
                />
              </div>
              {errors.name && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle" />{errors.name.message}</small>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Amount <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? 0)}
                    mode="decimal"
                    showButtons
                    min={0}
                    className="w-full"
                    inputClassName="text-right"
                    placeholder="0"
                  />
                )}
              />
              {errors.amount && <small className="text-red-500 flex items-center gap-1"><i className="pi pi-exclamation-circle" />{errors.amount.message}</small>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <InputTextarea {...register("description")} rows={4} className="w-full" placeholder="Optional: brief description or note" />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            label={isSubmitting ? "Saving..." : "Add Other Payment"}
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

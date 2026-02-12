import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import axiosInstance from "@/service/axios.service";

const OtherSchema = z.object({
  name: z.string().refine((s) => s.trim().length > 0, { message: "Name is required" }),
  amount: z.number().min(0, { message: "Amount must be >= 0" }),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
type OtherFormData = z.infer<typeof OtherSchema>;

interface Props {
  id: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditOtherMaster({ id, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<OtherFormData>({
    resolver: zodResolver(OtherSchema),
    defaultValues: { name: "", amount: 0, description: "", isActive: true },
  });

  useEffect(() => {
    if (!id) {
      reset();
      return;
    }
    let mounted = true;
    const fetchOne = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("institution-token");
        const res = await axiosInstance.get(`/other-payment/other-payment-master/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.data ?? {};
        if (!mounted) return;
        setValue("name", data.name ?? "");
        setValue("amount", data.amount ?? 0);
        setValue("description", data.description ?? "");
        setValue("isActive", data.isActive ?? true);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load item");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOne();
    return () => {
      mounted = false;
    };
  }, [id, reset, setValue]);

  const onSubmit = async (data: OtherFormData) => {
    if (!id) return toast.error("Invalid item");
    try {
      setLoading(true);
      const token = localStorage.getItem("institution-token");
      const payload = {
        name: String(data.name).trim(),
        amount: Number(data.amount),
        description: String(data.description || "").trim(),
        isActive: typeof data.isActive === "boolean" ? data.isActive : true,
      };
      const res = await axiosInstance.put(`/other-payment/update-other-payment-master/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Updated successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm">
              <i className="pi pi-pencil text-white text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Edit Other Payment</h3>
              <p className="text-sm text-gray-500">Update name, amount, description and status</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="p-inputgroup">
                <span className="p-inputgroup-addon bg-blue-50">
                  <i className="pi pi-tag text-blue-600" />
                </span>
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
              {errors.name && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle" />
                  {errors.name.message}
                </small>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Amount <span className="text-red-500">*</span>
              </label>
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
              {errors.amount && (
                <small className="text-red-500 flex items-center gap-1">
                  <i className="pi pi-exclamation-circle" />
                  {errors.amount.message}
                </small>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <InputTextarea {...register("description")} rows={4} className="w-full" placeholder="Optional: brief description or note" />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Active</label>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <InputSwitch checked={!!field.value} onChange={(e) => field.onChange(e.value)} />
                )}
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-end gap-2">
            <Button type="button" label="Cancel" className="p-button-text" onClick={onClose} disabled={loading || isSubmitting} />
            <Button
              type="submit"
              label={loading ? "Saving..." : "Save Changes"}
              icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
              className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-2 px-4 rounded"
              disabled={loading || isSubmitting}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

import { CourseSchema } from "@/helper/schema/Schema";
import axiosInstance from "@/service/axios.service";

import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Card } from "primereact/card";

type CourseFee = {
  feesMasterId: string;
  feesName: string;
  amount: number;
  selected: boolean;
};

type CourseFormData = z.infer<typeof CourseSchema>;

type EditCourseProps = {
  course: any | null;
  refetch: () => void;
  onClose: () => void;
};

const durationUnitOptions = [
  { label: "Days", value: "Days" },
  { label: "Months", value: "Months" },
  { label: "Years", value: "Years" },
];

export default function EditCourseForm({
  course,
  refetch,
  onClose,
}: EditCourseProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [courseFees, setCourseFees] = useState<CourseFee[]>([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feesMaster, setFeesMaster] = useState<any[]>([]);
  const [feeToAdd, setFeeToAdd] = useState<string | null>(null);
  const [feeToAddAmount, setFeeToAddAmount] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(CourseSchema),
  });

  /* ================= FETCH FEES MASTER ================= */
  const fetchFeesMaster = async () => {
    try {
      const res = await axiosInstance.get("/fees-master/get-all-fees-master");
      setFeesMaster(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch fees master", err);
    }
  };

  /* ================= FETCH COURSE FEES ================= */
  const fetchCourseFees = async (courseId: string) => {
    try {
      setLoadingFees(true);
      const res = await axiosInstance.get(`/course-fees/get-course-fees/${courseId}`);
      const fees = res?.data?.data?.fees || [];
      
      // Map to include selected state (all existing fees are selected by default)
      const mappedFees: CourseFee[] = fees.map((f: any) => ({
        feesMasterId: f.feesMasterId,
        feesName: f.feesName,
        amount: Number(f.amount) || 0,
        selected: true, // existing fees are selected by default
      }));
      
      setCourseFees(mappedFees);
    } catch (err) {
      console.error("Failed to fetch course fees", err);
      // If no fees exist, it's okay - just leave empty
      setCourseFees([]);
    } finally {
      setLoadingFees(false);
    }
  };

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (!course) return;

    const [value, unit] = course.duration.split(" ");

    reset({
      name: course.name,
      durationValue: Number(value),
      durationUnit: unit,
      fee: String(course.fee),
      description: course.description,
    });

    setPreview(course.image);
    
    // Fetch fees master and course fees
    fetchFeesMaster();
    if (course._id) {
      fetchCourseFees(course._id);
    }
  }, [course, reset]);

  /* ================= SUBMIT ================= */
  const onSubmit = async (data: CourseFormData) => {
    try {
      setIsSubmitting(true);

      // Update course basic info
      const payload = {
        name: data.name,
        duration: `${data.durationValue} ${data.durationUnit}`,
        fee: data.fee,
        description: data.description,
      };

      const res = await axiosInstance.put(
        `/institution/edit-course/${course._id}`,
        payload
      );

      toast.success(res.data.message);

      // Update course fees (only selected ones)
      const selectedFees = courseFees
        .filter((f) => f.selected && f.amount > 0)
        .map((f) => ({
          feesMasterId: f.feesMasterId,
          amount: Number(f.amount),
        }));

      if (selectedFees.length > 0) {
        try {
          await axiosInstance.put(
            `/course-fees/update-course-fees/${course._id}`,
            {
              courseId: course._id,
              fees: selectedFees,
            }
          );
          toast.success("Course fees updated successfully");
        } catch (err: any) {
          console.error("Failed to update course fees", err);
          toast.error(err.response?.data?.message || "Failed to update course fees");
        }
      }

      refetch();
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Update failed");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!course) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center  p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* NAME */}
        <div>
          <label className="font-semibold">Course Name <span className="text-red-500 text-sm">*</span></label>
          <InputText className="w-full mt-1" {...register("name")} />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}
        </div>

        {/* DURATION */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-semibold">Duration <span className="text-red-500 text-sm">*</span></label>
            <InputText
              type="number"
              inputMode="numeric"
              className="w-full mt-1"
              {...register("durationValue", { valueAsNumber: true })}
              step="1"
              min="0"
              onKeyDown={(e: any) => {
                if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                  e.preventDefault();
                }
              }}
              onWheel={(e: any) => (e.target as HTMLInputElement).blur()}
            />
            {errors.durationValue && (
              <p className="text-red-500 text-sm">
                {errors.durationValue.message}
              </p>
            )}
          </div>

          <div>
            <label className="font-semibold">Unit <span className="text-red-500 text-sm">*</span></label>
            <Dropdown
              className="w-full mt-1"
              options={durationUnitOptions}
              value={watch("durationUnit")}
              onChange={(e) =>
                setValue("durationUnit", e.value, { shouldValidate: true })
              }
            />
            {errors.durationUnit && (
              <p className="text-red-500 text-sm">
                {errors.durationUnit.message}
              </p>
            )}
          </div>
        </div>

        {/* FEE */}
        <div>
          <label className="font-semibold">Fee <span className="text-red-500 text-sm">*</span></label>
          <InputText
            type="number"
            inputMode="numeric"
            className="w-full mt-1"
            {...register("fee")}
            step="1"
            min="0"
            onKeyDown={(e: any) => {
              if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                e.preventDefault();
              }
            }}
            onWheel={(e: any) => (e.target as HTMLInputElement).blur()}
          />
          {errors.fee && (
            <p className="text-red-500 text-sm">{errors.fee.message}</p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="font-semibold">Description (optional)</label>
          <InputTextarea
            rows={4}
            className="w-full mt-1"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-red-500 text-sm">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* IMAGE (READ ONLY) */}
        <div>
          <label className="font-semibold">Course Image</label>
          <div className="h-52 w-full border rounded-2xl bg-white flex items-center justify-center overflow-hidden mt-2">
            {preview ? (
              <img
                src={preview}
                alt="Course"
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <p className="text-gray-400">No image available</p>
            )}
          </div>
        </div>

        {/* COURSE FEES SECTION */}
        {loadingFees ? (
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <i className="pi pi-spin pi-spinner text-2xl text-gray-400 mb-2"></i>
            <p className="text-sm text-gray-500">Loading course fees...</p>
          </div>
        ) : courseFees.length > 0 ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <i className="pi pi-wallet text-2xl text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Essential Fees </h3>
                <p className="text-xs text-gray-500">Check/uncheck to include or exclude fees</p>
              </div>
            </div>

            {/* Add New Fee Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <i className="pi pi-plus-circle text-green-600"></i>
                Add New Fee
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Fee Type</label>
                  <Dropdown
                    options={feesMaster
                      .filter((fm) => !courseFees.some((cf) => cf.feesMasterId === fm._id))
                      .map((fm) => ({ label: fm.name, value: fm._id }))}
                    value={feeToAdd}
                    onChange={(e) => setFeeToAdd(e.value)}
                    placeholder="Select fee type"
                    className="w-full"
                    filter
                    emptyMessage="All fees already added"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
                  <InputNumber
                    value={feeToAddAmount}
                    onValueChange={(e) => setFeeToAddAmount(e.value as number | null)}
                    mode="currency"
                    currency="INR"
                    locale="en-IN"
                    placeholder="0.00"
                    inputClassName="w-full"
                    showButtons={false}
                    min={0}
                  />
                </div>

                <div className="md:col-span-3">
                  <Button
                    type="button"
                    label="Add"
                    icon="pi pi-plus"
                    onClick={() => {
                      if (!feeToAdd) return toast.error("Please select a fee type");
                      if (!feeToAddAmount || Number(feeToAddAmount) <= 0) return toast.error("Please enter a valid amount");
                      const exists = courseFees.find((s) => s.feesMasterId === feeToAdd);
                      if (exists) return toast.error("This fee is already added");
                      const fm = feesMaster.find((x) => x._id === feeToAdd)!;
                      setCourseFees((prev) => [
                        ...prev,
                        {
                          feesMasterId: feeToAdd!,
                          feesName: fm.name,
                          amount: Number(feeToAddAmount),
                          selected: true,
                        },
                      ]);
                      setFeeToAdd(null);
                      setFeeToAddAmount(null);
                      toast.success(`${fm.name} added successfully`);
                    }}
                    className="w-full bg-green-600 border-green-600 hover:bg-green-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {courseFees.map((fee, idx) => (
                <div key={fee.feesMasterId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={fee.selected}
                        onChange={(e) => {
                          const updated = [...courseFees];
                          updated[idx].selected = e.target.checked;
                          setCourseFees(updated);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-green-700">{idx + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{fee.feesName}</div>
                        <div className="text-xs text-gray-400 font-mono">{fee.feesMasterId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-40">
                        <InputNumber
                          value={fee.amount}
                          onValueChange={(e) => {
                            const val = e.value as number | null;
                            const updated = [...courseFees];
                            updated[idx].amount = val ?? 0;
                            setCourseFees(updated);
                          }}
                          mode="currency"
                          currency="INR"
                          locale="en-IN"
                          disabled={!fee.selected}
                          inputClassName="w-full text-right font-semibold"
                          showButtons={false}
                          min={0}
                        />
                      </div>
                      <Button
                        type="button"
                        icon="pi pi-trash"
                        className="p-button-danger p-button-text p-button-sm"
                        onClick={() => {
                          const updated = courseFees.filter((_, i) => i !== idx);
                          setCourseFees(updated);
                          toast.info(`${fee.feesName} removed`);
                        }}
                        tooltip="Remove fee"
                        tooltipOptions={{ position: 'left' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  Selected Fees: {courseFees.filter((f) => f.selected).length}
                </span>
                <span className="text-sm text-gray-500">
                  Total: ₹{courseFees.filter((f) => f.selected).reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
            <i className="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
            <p className="text-sm text-gray-500">No fees attached to this course</p>
          </div>
        )}

        <Button
          type="submit"
          label={isSubmitting ? "Updating..." : "Update Course"}
          icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
          loading={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200"
        />
      </form>

      <ToastContainer />
    </div>
  );
}

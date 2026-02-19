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
    <div className="w-full p-4 max-h-[85vh] overflow-y-auto">
      <Card className="w-full shadow-xl border-0">
        {/* Header */}
        <div className="text-center mb-6 pb-5 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-pencil text-3xl text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">Edit Course</h2>
          <p className="text-gray-500 text-sm">Update course information and manage its fee structure</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* NAME */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Course Name <span className="text-red-500 text-sm">*</span>
            </label>
            <InputText
              className="w-full"
              placeholder="e.g. Full Stack Web Development"
              {...register("name")}
              onKeyDown={(e: any) => {
                if (e.key >= "0" && e.key <= "9") {
                  e.preventDefault();
                  toast.warning("Numbers are not allowed in course name");
                }
              }}
              onPaste={(e: any) => {
                e.preventDefault();
                const pastedText = e.clipboardData.getData("text");
                const textWithoutNumbers = pastedText.replace(/[0-9]/g, "");
                const input = e.target as HTMLInputElement;
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                const currentValue = input.value;
                const newValue =
                  currentValue.substring(0, start) +
                  textWithoutNumbers +
                  currentValue.substring(end);
                setValue("name", newValue, { shouldValidate: true });
                if (pastedText !== textWithoutNumbers) {
                  toast.warning("Numbers were removed from pasted text");
                }
              }}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* DURATION & UNIT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Duration <span className="text-red-500 text-sm">*</span>
              </label>
              <InputText
                type="number"
                inputMode="numeric"
                className="w-full"
                placeholder="e.g. 6"
                {...register("durationValue", { valueAsNumber: true })}
                step="1"
                min="0"
                onKeyDown={(e: any) => {
                  if (["e", "E", "+", "-", "."].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onWheel={(e: any) => (e.target as HTMLInputElement).blur()}
              />
              {errors.durationValue && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.durationValue.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Unit <span className="text-red-500 text-sm">*</span>
              </label>
              <Dropdown
                className="w-full"
                options={durationUnitOptions}
                placeholder="Select unit"
                value={watch("durationUnit")}
                onChange={(e) =>
                  setValue("durationUnit", e.value, { shouldValidate: true })
                }
              />
              {errors.durationUnit && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.durationUnit.message}
                </p>
              )}
            </div>
          </div>

          {/* FEE */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Fee <span className="text-red-500 text-sm">*</span>
            </label>
            <InputText
              type="number"
              inputMode="numeric"
              className="w-full"
              placeholder="e.g. 5000"
              {...register("fee")}
              step="1"
              min="0"
              onKeyDown={(e: any) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onWheel={(e: any) => (e.target as HTMLInputElement).blur()}
            />
            {errors.fee && (
              <p className="text-red-500 text-sm mt-1">{errors.fee.message}</p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Description (optional)
            </label>
            <InputTextarea
              rows={4}
              className="w-full"
              placeholder="Briefly describe the course, syllabus and outcomes"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* IMAGE (READ ONLY) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <i className="pi pi-image text-blue-600" />
              Course Image
            </h3>
            <div className="h-52 w-full border-2 border-dashed border-blue-300 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt="Course"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-center p-4">
                  <i className="pi pi-image text-5xl text-gray-300 mb-2" />
                  <p className="text-gray-400 text-sm">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* COURSE FEES SECTION */}
          {loadingFees ? (
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <i className="pi pi-spin pi-spinner text-2xl text-blue-500 mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                Loading course fees...
              </p>
            </div>
          ) : courseFees.length > 0 ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-2xl border border-green-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <i className="pi pi-wallet text-2xl text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Essential Fees
                  </h3>
                  <p className="text-xs text-gray-600">
                    Check / uncheck to include or exclude fees
                  </p>
                </div>
              </div>

              {/* Add New Fee */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <i className="pi pi-plus-circle text-green-600" />
                  Add New Fee
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Fee Type
                    </label>
                    <Dropdown
                      options={feesMaster
                        .filter(
                          (fm) =>
                            !courseFees.some(
                              (cf) => cf.feesMasterId === fm._id
                            )
                        )
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
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Amount (₹)
                    </label>
                    <InputNumber
                      value={feeToAddAmount}
                      onValueChange={(e) =>
                        setFeeToAddAmount(e.value as number | null)
                      }
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
                        if (!feeToAdd)
                          return toast.error("Please select a fee type");
                        if (!feeToAddAmount || Number(feeToAddAmount) <= 0)
                          return toast.error("Please enter a valid amount");
                        const exists = courseFees.find(
                          (s) => s.feesMasterId === feeToAdd
                        );
                        if (exists)
                          return toast.error("This fee is already added");
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
                      className="w-full bg-green-600 border-green-600 hover:bg-green-700 shadow-md"
                    />
                  </div>
                </div>
              </div>

              {/* Existing Fees List */}
              <div className="space-y-3">
                {courseFees.map((fee, idx) => (
                  <div
                    key={fee.feesMasterId}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Top row: checkbox, label, remove icon */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={fee.selected}
                        onChange={(e) => {
                          const updated = [...courseFees];
                          updated[idx].selected = e.target.checked;
                          setCourseFees(updated);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-green-700">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {fee.feesName}
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate">
                          {fee.feesMasterId}
                        </div>
                      </div>
                      <Button
                        type="button"
                        icon="pi pi-trash"
                        className="p-button-danger p-button-text p-button-sm ml-2 flex-shrink-0"
                        onClick={() => {
                          const updated = courseFees.filter((_, i) => i !== idx);
                          setCourseFees(updated);
                          toast.info(`${fee.feesName} removed`);
                        }}
                        tooltip="Remove fee"
                        tooltipOptions={{ position: "left" }}
                      />
                    </div>

                    {/* Bottom row: amount input full width */}
                    <div className="mt-3">
                      <InputNumber
                        className="w-full"
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
                  </div>
                ))}
                <div className="flex items-center justify-between px-2 pt-3 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    Selected Fees: {courseFees.filter((f) => f.selected).length}
                  </span>
                  <span className="text-sm font-semibold text-green-700">
                    Total: ₹
                    {courseFees
                      .filter((f) => f.selected)
                      .reduce((sum, f) => sum + f.amount, 0)
                      .toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
              <i className="pi pi-inbox text-4xl text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                No fees attached to this course
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              label={isSubmitting ? "Updating Course..." : "Update Course"}
              icon={
                isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check-circle"
              }
              loading={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 border-0 text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200 rounded-xl"
              disabled={isSubmitting}
            />
          </div>
        </form>
      </Card>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CourseSchema } from "@/helper/schema/Schema";

import { z } from "zod";

type CourseFormData = z.infer<typeof CourseSchema>;
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

type FeeMaster = {
  _id: string;
  name: string;
};

// PrimeReact
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Button } from "primereact/button";
import { Card } from "primereact/card";

const durationUnitOptions = [
  { label: "Days", value: "Days" },
  { label: "Months", value: "Months" },
  { label: "Years", value: "Years" },
];

export default function AddCourseForm() {
  const [token, setToken] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [feesMaster, setFeesMaster] = useState<FeeMaster[]>([]);
  const [showFees, setShowFees] = useState(false);
  const [selectedFees, setSelectedFees] = useState<Array<{ feesMasterId: string; name: string; amount: number }>>([]);
  const [feeToAdd, setFeeToAdd] = useState<string | null>(null);
  const [feeToAddAmount, setFeeToAddAmount] = useState<number | null>(null);
  const [selectedFeesMap, setSelectedFeesMap] = useState<Record<string, { selected: boolean; amount: number | "" }>>({});

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

  useEffect(() => {
    const storedToken = localStorage.getItem("institution-token");
    if (storedToken) setToken(storedToken);
  }, []);

  // fetch fees master once token is available
  useEffect(() => {
    if (!token) return;

    const fetchFeesMaster = async () => {
      try {
        const res = await axiosInstance.get("/fees-master/get-all-fees-master", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.data || [];
        setFeesMaster(data);

        // leave selectedFees empty; user will add via dropdown
        setSelectedFees([]);
      } catch (err) {
        console.error("Failed to fetch fees master", err);
      }
    };

    fetchFeesMaster();
  }, [token]);

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);

    try {
      const duration = `${data.durationValue} ${data.durationUnit}`;

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("duration", duration);
      formData.append("fee", data.fee);
      formData.append("description", data.description ?? "");
      // Image is optional; append only if provided
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axiosInstance.post("/institution/add-course", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(res.data?.message || "Course created");

      // determine created course id from known response shapes
      const createdCourseId =
        res.data?.course?._id || res.data?.data?._id || res.data?.data?.id || res.data?._id || res.data?.id;

      // collect selected fees
      const feesPayload = selectedFees
        .filter((f) => typeof f.amount === "number" && Number(f.amount) > 0)
        .map((f) => ({ feesMasterId: f.feesMasterId, amount: Number(f.amount) }));

      if (feesPayload.length > 0) {
        if (!createdCourseId) {
          toast.error("Course created but server did not return course id. Fees not added.");
        } else {
          try {
            await axiosInstance.post(
              "/course-fees/add-course-fees",
              { courseId: createdCourseId, fees: feesPayload },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // toast.success("Course fees attached successfully");
          } catch (err: any) {
            if (axios.isAxiosError(err)) {
              toast.error(err.response?.data?.message || "Failed to attach course fees");
            } else {
              toast.error("Failed to attach course fees");
            }
          }
        }
      }

      // reset form & UI state
      reset();
      setImageFile(null);
      setPreview(null);
      setShowFees(false);
      // re-init selected fees map
      const emptyMap: Record<string, { selected: boolean; amount: number | "" }> = {};
      feesMaster.forEach((f) => (emptyMap[f._id] = { selected: false, amount: "" }));
      setSelectedFeesMap(emptyMap);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImagePreview = (file: File) => {
    if (preview) URL.revokeObjectURL(preview);
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
            <i className="pi pi-book text-3xl text-white"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Add Course</h2>
          <p className="text-gray-500">Add new Course with complete information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Course Name */}
          <div>
            <label className="font-semibold">Course Name <span className=" text-red-500">*</span></label>
            <InputText
              className="w-full mt-1"
              placeholder="e.g. Full Stack Web Development"
              aria-label="Course name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Duration Value */}
            <div>
              <label className="font-semibold">Duration <span className=" text-red-500">*</span></label>
              <InputText
                type="number"
                inputMode="numeric"
                className="w-full mt-1"
                placeholder="e.g. 6"
                {...register("durationValue", { valueAsNumber: true })}
                step="1"
                min="0"
                onKeyDown={(e: any) => {
                  // Prevent scientific notation and explicit signs
                  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
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

            {/* Duration Unit */}
            <div>
              <label className="font-semibold">Duration Unit <span className=" text-red-500">*</span></label>
              <Dropdown
                className="w-full mt-1"
                options={durationUnitOptions}
                placeholder="Select unit"
                aria-label="Duration unit"
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

          {/* Fee */}
          <div>
            <label className="font-semibold">Fee <span className=" text-red-500">*</span></label>
            <InputText
              type="number"
              inputMode="numeric"
              className="w-full mt-1"
              placeholder="e.g. 5000"
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

          {/* Description */}
          <div>
            <label className="font-semibold">Description (optional)</label>
            <InputTextarea
              rows={4}
              className="w-full mt-1"
              placeholder="Briefly describe the course, syllabus and outcomes"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Image */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100"> <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"> <i className="pi pi-image text-blue-600"></i> Course Image </h3> <div className="space-y-2"> <label className="block text-sm font-semibold text-gray-700"> Course Image (optional) </label> <div role="button" tabIndex={0} aria-label="Upload course image area" className="relative h-52 w-full border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center overflow-hidden bg-white hover:border-blue-500 cursor-pointer transition-all duration-300" onClick={() => imageInputRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click(); }} > {preview ? (<img src={preview} alt="Course Image Preview" className="w-full h-full object-contain p-4" />) : (<div className="text-center p-6"> <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"> <i className="pi pi-cloud-upload text-4xl text-blue-500"></i> </div> <p className="text-blue-600 font-semibold text-lg mb-1"> Click to upload course image </p> <p className="text-sm text-gray-500"> PNG, JPG or GIF up to 10MB </p> </div>)} </div> <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Upload course image" title="Upload course image" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setImageFile(file); handleImagePreview(file); } }} /> </div> </div>

          {/* Essential Fees section - Professional Design */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <i className="pi pi-wallet text-2xl text-white"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    Essential Fees
                  </h3>
                  <p className="text-xs text-gray-500">Attach recurring or one-time fees to this course</p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFees}
                  onChange={(e) => setShowFees(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable</span>
              </label>
            </div>

            {showFees && (
              <div className="space-y-4">
                {feesMaster.length === 0 ? (
                  <div className="p-6 rounded-xl border-2 border-dashed border-gray-300 bg-white text-center">
                    <i className="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
                    <p className="text-sm text-gray-500">No fees available in master list</p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <i className="pi pi-plus-circle text-green-600"></i>
                      Add Fee Item
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Fee Type</label>
                        <Dropdown
                          options={feesMaster.map((fm) => ({ label: fm.name, value: fm._id }))}
                          value={feeToAdd}
                          onChange={(e) => setFeeToAdd(e.value)}
                          placeholder="Select fee type"
                          className="w-full"
                          filter
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
                            const exists = selectedFees.find((s) => s.feesMasterId === feeToAdd);
                            if (exists) return toast.error("This fee is already added");
                            const fm = feesMaster.find((x) => x._id === feeToAdd)!;
                            setSelectedFees((prev) => [...prev, { feesMasterId: feeToAdd!, name: fm.name, amount: Number(feeToAddAmount) }]);
                            setFeeToAdd(null);
                            setFeeToAddAmount(null);
                            toast.success(`${fm.name} added successfully`);
                          }}
                          className="w-full bg-green-600 border-green-600 hover:bg-green-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected fees list with professional cards */}
                {selectedFees.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <i className="pi pi-list text-green-600"></i>
                        Added Fees ({selectedFees.length})
                      </h4>
                      <span className="text-xs text-gray-500">
                        Total: ₹{selectedFees.reduce((sum, f) => sum + (f.amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    {selectedFees.map((s, idx) => (
                      <div key={s.feesMasterId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-green-700">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-800">{s.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{s.feesMasterId}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-40">
                              <InputNumber
                                value={s.amount}
                                onValueChange={(e) => {
                                  const val = e.value as number | null;
                                  setSelectedFees((prev) => prev.map((p) => (p.feesMasterId === s.feesMasterId ? { ...p, amount: val ?? 0 } : p)));
                                }}
                                mode="currency"
                                currency="INR"
                                locale="en-IN"
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
                                setSelectedFees((prev) => prev.filter((p) => p.feesMasterId !== s.feesMasterId));
                                toast.info(`${s.name} removed`);
                              }}
                              tooltip="Remove fee"
                              tooltipOptions={{ position: 'left' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button - Always Available */}
          <div className="pt-2">
            <Button
              type="submit"
              label={isSubmitting ? "Creating Course..." : "Create Course"}
              icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check-circle"}
              loading={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200"
            />
          </div>
        </form>

        <ToastContainer position="top-right" />
      </Card>
    </div>
  );
}

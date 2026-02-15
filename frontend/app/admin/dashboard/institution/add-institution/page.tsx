"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

import axiosInstance from "@/service/axios.service";
import { InstitutionSchema } from "@/helper/schema/Schema";

import { ToastContainer, toast } from "react-toastify";
import axios from "axios";

import "leaflet/dist/leaflet.css";



const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

const LocationPicker = dynamic(
  () => import("@/helper/LocationPicker"),
  { ssr: false }
);


type InstitutionFormData = {
  name: string;
  email: string;
  phone: string;
  website: string;
  establishDate: string;
  registrationNo: string;
};

const MapWithNoSSR = dynamic(
  async () => {
    const { MapContainer, TileLayer, Marker } = await import("react-leaflet");
    return ({ children, center, zoom }: any) => (
      <MapContainer center={center} zoom={zoom} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {children}
      </MapContainer>
    );
  },
  { ssr: false }
);


const DynamicMarker = dynamic(
  async () => {
    const { Marker } = await import("react-leaflet");
    return ({ lat, lng }: { lat: number; lng: number }) => <Marker position={[lat, lng]} />;
  },
  { ssr: false }
);



export default function InstitutionForm() {

  const [token, setToken] = useState<string | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signPreview, setSignPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin-token");
    if (storedToken !== null) {
      setToken(storedToken)
    }
  }, [token])


  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    });
  }, []);





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

    if (!photoFile) {
      toast.error("Institution Image  is required");
      return;
    }
    if (!location) {
      toast.error("Location is required");
      return;
    }

    setIsSubmitting(true);

    try {

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      // phone and whatsAppNo are stored as digit-only strings in the form state
      if (typeof data.phone !== "undefined" && data.phone !== null) formData.append("phone", (data.phone as unknown as string));
      if (typeof (data as any).whatsAppNo !== "undefined" && (data as any).whatsAppNo !== null)
        formData.append("whatsAppNo", (data as any).whatsAppNo as string);
      if (data.website) formData.append("website", data.website);
      if (data.establishDate) formData.append("establishDate", data.establishDate);
      if (data.registrationNo) formData.append("registrationNo", data.registrationNo);
      if (data.address) formData.append("address", data.address);

      formData.append("photo", photoFile);
      if (bannerImageFile) formData.append("banner", bannerImageFile);

      formData.append("lat", location.lat.toString());
      formData.append("lng", location.lng.toString());

      const res = await axiosInstance.post("/admin/create-institution",  formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      toast.success(res.data.message)
      reset()
      setBannerImageFile(null)
      setPhotoFile(null)
      setBannerPreview(null)
      setPhotoPreview(null)
      setLocation(null)
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || 'Something went wrong'
        toast.error(message)
      } else {
        toast.error('Unexpected error occurred')
      }
      // reset()
      // setBannerImageFile(null)
      // setPhotoFile(null)
      // setBannerPreview(null)
      // setPhotoPreview(null)
      // setLocation(null)
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    console.log('❌ Validation errors:', errors)
  }

  const handleImageBannerPreview = (file: File) => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    const imageUrl = URL.createObjectURL(file);
    setBannerPreview(imageUrl);
  };

  console.log("==>", location)
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

        
        <form onSubmit={handleSubmit(onSubmit, onError)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Institution Banner Image */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Institution banner iamge Image <span className="text-red-500">*</span>
            </label>

            <div 
              className="relative h-40 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 hover:border-indigo-400 cursor-pointer transition-colors"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerPreview ? (
                <Image src={bannerPreview} alt="Banner Preview" fill className="object-cover" />
              ) : (
                <div className="text-center">
                  <i className="pi pi-image text-4xl text-gray-400"></i>
                  <p className="mt-2 text-gray-500 text-sm">Click to upload institution banner</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG or GIF</p>
                </div>
              )}
            </div>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setBannerImageFile(file);
                  handleImageBannerPreview(file);
                }
              }}
            />
          </div>

          {/* Photo */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Photo <span className="text-red-500 text-xl">*</span></label>
            <div 
              className="flex items-center gap-4 mt-1 cursor-pointer"
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-colors">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" alt="Photo preview" />
                ) : (
                  <i className="pi pi-user text-gray-400 text-2xl"></i>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Click to upload institution photo</p>
                <p className="text-xs text-gray-400">JPG, PNG or GIF (Max 5MB)</p>
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>

          {/* Institution Name */}
          <div>
            <label className="text-sm font-medium">Institution Name <span className=" text-red-500 text-xl">*</span></label>
            <InputText
            placeholder="Enter institution name"
              className="w-full mt-1"
              {...register("name", { required: "Institution name is required" })}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email Address <span className=" text-red-500 text-xl">*</span></label>
            <InputText
             placeholder="Enter email address"
              className="w-full mt-1"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium">Phone No <span className=" text-red-500 text-xl">*</span></label>
            <InputText
              type="tel"
              inputMode="numeric"
              placeholder="Enter phone number"
              className="w-full mt-1"
              {...register("phone", {
                required: "Phone number is required",
                setValueAs: (v) => {
                  const s = String(v ?? "").replace(/\D/g, "");
                  return s === "" ? undefined : s; // keep as digit-only string
                },
                validate: (v) => typeof v === "string" && /^\d+$/.test(v) && v.length >= 6 || "Enter a valid phone number"
              })}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                // allow navigation keys, backspace, etc.
                const allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab"];
                if (allowedKeys.includes(e.key)) return;
                // prevent non-digit input (blocks letters like 'e')
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
            />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
          </div>


          <div>
            <label className="text-sm font-medium">WhatsApp No <span className=" text-red-500 text-xl">*</span></label>
            <InputText
             type="tel"
             inputMode="numeric"
             placeholder="Enter WhatsApp number"
              className="w-full mt-1"
              {...register("whatsAppNo", {
                required: "WhatsApp number is required",
                setValueAs: (v) => {
                  const s = String(v ?? "").replace(/\D/g, "");
                  return s === "" ? undefined : s; // keep as digit-only string
                },
                validate: (v) => typeof v === "string" && /^\d+$/.test(v) && v.length >= 6 || "Enter a valid WhatsApp number"
              })}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                const allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab"];
                if (allowedKeys.includes(e.key)) return;
                if (!/^[0-9]$/.test(e.key)) e.preventDefault();
              }}
            />
            {errors.whatsAppNo && <p className="text-red-500 text-xs">{errors.whatsAppNo.message}</p>}
          </div>

          {/* Website */}
          <div>
            <label className="text-sm font-medium">Website</label>
            <InputText
             placeholder="https://example.com"
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
               placeholder="Select establishment date"
            />
            {errors.establishDate && <p className="text-red-500 text-xs">{errors.establishDate.message}</p>}
          </div>

          {/* Registration No */}
          <div>
            <label className="text-sm font-medium">Registration No</label>
            <InputText
             placeholder="Enter registration number"
              className="w-full mt-1"
              {...register("registrationNo", { required: true })}
            />
            {errors.registrationNo && <p className="text-red-500 text-xs">{errors.registrationNo.message}</p>}
          </div>

          <div >
            <label className="text-sm font-medium">Address</label>
            <InputText
              className="w-full mt-1"
              {...register("address")}
              placeholder="Enter full address"
            />
            {errors.address && (
              <p className="text-red-500 text-xs">
                {errors.address.message}
              </p>
            )}
          </div>

           <div className="md:col-span-2">
            <label className="text-sm font-medium">Institution Location <span className=" text-red-500 text-xl">*</span></label>
            <div className="h-64 w-full mt-2 rounded-lg overflow-hidden border">
              <MapWithNoSSR center={[22.5726, 88.3639]} zoom={13}>
                <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
                {location && <DynamicMarker lat={location.lat} lng={location.lng} />}
              </MapWithNoSSR>
            </div>
          </div>




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
              label={isSubmitting ? "Saving Institution..." : "Save Institution"}
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

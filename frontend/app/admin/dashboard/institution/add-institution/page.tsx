"use client";

import React, { useEffect, useState } from "react";
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
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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



    try {

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      if (data.phone) formData.append("phone", data.phone);
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
    }
    reset()
setBannerImageFile(null)
      setPhotoFile(null)
      setBannerPreview(null)
      setPhotoPreview(null)
      setLocation(null)
  };

  const onError = (errors: any) => {
    console.log('❌ Validation errors:', errors)
  }

  const handleImageBannerPreview = (file: File) => {
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
          {/* Institution Name */}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Institution banner iamge Image
            </label>

            <div className="relative h-40 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {bannerPreview ? (
                <Image src={bannerPreview} alt="Preview" fill className="object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">
                  Institution image 
                </span>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setBannerImageFile(file);
                  handleImageBannerPreview(file);
                }
              }}
            />
          </div>


          <div className="md:col-span-2">
            <label className="text-sm font-medium">Photo</label>
            <div className="flex items-center gap-4 mt-1">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" />
                ) : (
                  <i className="pi pi-user text-gray-400 text-2xl"></i>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Institution Name <span className=" text-red-500 text-xl">*</span></label>
            <InputText
              className="w-full mt-1"
              {...register("name", { required: "Institution name is required" })}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email Address <span className=" text-red-500 text-xl">*</span></label>
            <InputText
              className="w-full mt-1"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium">Phone No <span className=" text-red-500 text-xl">*</span></label>
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
            />
            <Button type="submit" label="Save Institution" />
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}

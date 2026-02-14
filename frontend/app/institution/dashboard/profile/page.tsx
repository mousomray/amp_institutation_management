"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Badge } from "primereact/badge";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { InputText } from "primereact/inputtext";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { InstitutionSchema } from "@/helper/schema/Schema"


interface Institution {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    establishDate: string;
    registrationNo?: string | null;
    status: string;
    institutionImage: string;
    institutionBanner?: string;
    whatsAppNo: string;
    geoLocation?: {
        lat: string;
        lng: string;
    };
}



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


export default function InstitutionProfilePage() {
    const [data, setData] = useState<Institution | null>(null);
    const [formData, setFormData] = useState<Institution | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [location, setLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);

    const photoInputRef = useRef<HTMLInputElement>(null);

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

    /* ================= DATE FORMAT ================= */

    const formatDateForInput = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split("T")[0];
    };

    const LocationPicker = dynamic(
        () => import("@/helper/LocationPicker"),
        { ssr: false }
    );

    useEffect(() => {
        const fixLeafletIcon = async () => {
            const L = await import("leaflet");

            delete (L.Icon.Default.prototype as any)._getIconUrl;

            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
                iconUrl:
                    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                shadowUrl:
                    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
            });
        };

        fixLeafletIcon();
    }, []);



    /* ================= IMAGE HELPERS ================= */

    const isValidImageUrl = (url?: string) => {
        if (!url || url === "0") return false;
        try {
            new URL(url.startsWith("http") ? url : `${BASE_URL}/${url}`);
            return true;
        } catch {
            return false;
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        return `${BASE_URL}/${path}`;
    };

    /* ================= TOKEN ================= */

    useEffect(() => {
        const storedToken = localStorage.getItem("institution-token");
        if (storedToken) setToken(storedToken);
    }, []);

    useEffect(() => {
        if (token) getInstitutionData();
    }, [token]);

    /* ================= FETCH ================= */

    const getInstitutionData = async () => {
        try {
            const res = await axiosInstance.get("/institution/get-institution", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data?.data) {
                const formattedData = {
                    ...res.data.data,
                    establishDate: formatDateForInput(res.data.data.establishDate),
                };

                setData(formattedData);
                setFormData(formattedData);
            }
        } catch (error) {
            toast.error("Failed to fetch institution data");
        } finally {
            setLoading(false);
        }
    };

    /* ================= HANDLE INPUT CHANGE ================= */

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        if (!formData) return;

        const { name, value } = e.target;

        if (name === "lat" || name === "lng") {
            setFormData({
                ...formData,
                geoLocation: {
                    ...formData.geoLocation!,
                    [name]: value,
                },
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    /* ================= SAVE ================= */

    const handleSave = async () => {
        if (!formData) return;

        const latValue = location
            ? String(location.lat)
            : String(formData.geoLocation?.lat || "");

        const lngValue = location
            ? String(location.lng)
            : String(formData.geoLocation?.lng || "");

        const validation = InstitutionSchema.safeParse({
            ...formData,
            registrationNo: "",
            lat: latValue,
            lng: lngValue,
        });

        if (!validation.success) {
            const fieldErrors: Record<string, string> = {};

            validation.error.issues.forEach((issue) => {
                const fieldName = issue.path[0] as string;
                fieldErrors[fieldName] = issue.message;
            });

            setErrors(fieldErrors);
            return;
        }

        setErrors({})

        try {
            const formPayload = new FormData();

            formPayload.append("name", formData.name);
            formPayload.append("email", formData.email);
            formPayload.append("phone", formData.phone);
            formPayload.append("whatsAppNo", formData.whatsAppNo);
            formPayload.append("address", formData.address);
            formPayload.append("website", formData.website);
            formPayload.append(
                "establishDate",
                new Date(formData.establishDate).toISOString()
            );

            if (formData.registrationNo)
                formPayload.append("registrationNo", formData.registrationNo);

            formPayload.append("lat", latValue);
            formPayload.append("lng", lngValue);

            if (photoFile) {
                formPayload.append("photo", photoFile);
            }

            await axiosInstance.put(
                "/institution/update-institution",
                formPayload,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            toast.success("Profile Updated Successfully");

            setPhotoPreview(null);
            setPhotoFile(null);
            setEditing(false);
            getInstitutionData();
        } catch (error) {
            toast.error("Update failed");
        }
    };

    /* ================= LOADING ================= */

    if (loading)
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );

    if (!formData) return <div>No Data Found</div>;

    /* ================= UI ================= */

    return (
        <div className="max-w-5xl mx-auto p-6">
            {/* Banner */}
            <div className="relative h-64 w-full rounded-xl overflow-hidden">
                {isValidImageUrl(formData.institutionBanner) ? (
                    <Image
                        src={getImageUrl(formData.institutionBanner)}
                        alt="Banner"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-700" />
                )}
            </div>

            {/* Card */}
            <div className="bg-white rounded-xl shadow-xl p-6 -mt-16 relative">
                <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">

                        {/* ================= LOGO ================= */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white">
                                {photoPreview ? (
                                    <Image
                                        src={photoPreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : isValidImageUrl(formData.institutionImage) ? (
                                    <Image
                                        src={getImageUrl(formData.institutionImage)}
                                        alt="Logo"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm">
                                        No Image
                                    </div>
                                )}
                            </div>

                            {editing && (
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        className="px-4 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                                    >
                                        Change Photo
                                    </button>

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
                            )}
                        </div>

                        {/* ================= NAME ================= */}
                        <div>
                            <h1 className="text-2xl font-bold">{formData.name}</h1>

                            <Badge
                                value={formData.status}
                                severity={
                                    formData.status === "ACTIVE" ? "success" : "danger"
                                }
                                className="mt-2"
                            />
                        </div>
                    </div>

                    {/* ================= BUTTONS ================= */}
                    <div>
                        {editing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="bg-green-600 text-white px-4 py-2 rounded mr-2"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setFormData(data);
                                        setPhotoPreview(null);
                                        setPhotoFile(null);
                                        setEditing(false);
                                    }}
                                    className="bg-gray-400 text-white px-4 py-2 rounded"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditing(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* ================= FIELDS ================= */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <EditableField error={errors.email}  label="Email" name="email" value={formData.email || ""} editing={editing} onChange={handleChange} />
                    <EditableField error={errors.phone} label="Phone" name="phone" value={formData.phone || ""} editing={editing} onChange={handleChange} />
                    <EditableField error={errors.whatsAppNo} label="WhatsApp number" name="whatsAppNo" value={formData.whatsAppNo || ""} editing={editing} onChange={handleChange} />
                    <EditableField error={errors.website} label="Website" name="website" value={formData.website} editing={editing} onChange={handleChange} />
                    <EditableField error={errors.registrationNo} label="Registration No" name="registrationNo" value={formData.registrationNo || ""} editing={editing} onChange={handleChange} />
                    <EditableField error={errors.establishDate} label="Established Date" name="establishDate" value={formData.establishDate || ""} editing={editing} onChange={handleChange} type="date" />
                </div>

                <div className="mt-6">
                    <EditableField label="Address" name="address" value={formData.address} editing={editing} onChange={handleChange} />
                </div>

                {formData.geoLocation && (
                    <div className="md:col-span-2 mt-2">
                        <p className="text-sm text-gray-500">Institution Location </p>
                        <div className="h-64 w-full mt-2 rounded-lg overflow-hidden border">
                            <MapWithNoSSR center={[22.5726, 88.3639]} zoom={13}>
                                <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
                                {
                                    formData.geoLocation && !location && <DynamicMarker lat={Number(formData.geoLocation.lat)} lng={Number(formData.geoLocation.lng)} />}

                                {location && <DynamicMarker lat={location.lat} lng={location.lng} />}
                            </MapWithNoSSR>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



function EditableField({
    label,
    name,
    value,
    editing,
    onChange,
    type = "text",
    error,
}: {
    label: string;
    name: string;
    value: string;
    editing: boolean;
    onChange: any;
    type?: string;
    error?: string;
}) {
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            {editing ? (
                <>
                    <InputText
                        type={type}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        className={`border p-2 rounded w-full mt-1 ${error ? "border-red-500" : ""
                            }`}
                    />

                    {error && (
                        <p className="text-red-500 text-sm mt-1">
                            {error}
                        </p>
                    )}
                </>
            ) : (
                <p className="font-medium mt-1">{value || "-"}</p>
            )}
        </div>
    );
}
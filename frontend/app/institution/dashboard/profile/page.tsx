"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Badge } from "primereact/badge";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import "leaflet/dist/leaflet.css";
import "primeicons/primeicons.css";
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

    const [appPassword, setAppPassword] = useState("");
    const [confirmAppPassword, setConfirmAppPassword] = useState("");
    const [appPasswordErrors, setAppPasswordErrors] = useState<{
        appPassword?: string;
        confirmPassword?: string;
    }>({});
    const [appPasswordLoading, setAppPasswordLoading] = useState(false);

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

        // Validate numeric fields - only allow digits
        if (name === "phone" || name === "whatsAppNo") {
            const numericValue = value.replace(/\D/g, ''); // Remove all non-digit characters
            setFormData({
                ...formData,
                [name]: numericValue,
            });
            return;
        }

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

    /* ================= APP PASSWORD UPDATE ================= */

    const handleAppPasswordUpdate = async () => {
        // Reset errors
        setAppPasswordErrors({});

        // Validation
        const validationErrors: { appPassword?: string; confirmPassword?: string } = {};

        if (!appPassword || appPassword.trim() === "") {
            validationErrors.appPassword = "Google App Password is required";
        } else if (appPassword.replace(/\s/g, '').length < 16) {
            validationErrors.appPassword = "Google App Password must be 16 characters (spaces will be preserved)";
        }

        if (!confirmAppPassword || confirmAppPassword.trim() === "") {
            validationErrors.confirmPassword = "Please confirm your Google App Password";
        } else if (appPassword !== confirmAppPassword) {
            validationErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(validationErrors).length > 0) {
            setAppPasswordErrors(validationErrors);
            return;
        }

        setAppPasswordLoading(true);

        try {
            const response = await axiosInstance.put(
                "/institution/update-institution-app-password",
                { appPassword: appPassword },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setAppPassword("");
            setConfirmAppPassword("");
            setAppPasswordLoading(false);
            
            toast.success(response?.data?.message, {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error: any) {
            setAppPasswordLoading(false);
            toast.error(
                error?.response?.data?.message || "Failed to save Google App Password. Please try again.",
                {
                    position: "top-right",
                    autoClose: 3000,
                }
            );
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
                    <EditableField error={errors.phone} label="Phone" name="phone" value={formData.phone || ""} editing={editing} onChange={handleChange} type="tel" maxLength={15} />
                    <EditableField error={errors.whatsAppNo} label="WhatsApp number" name="whatsAppNo" value={formData.whatsAppNo || ""} editing={editing} onChange={handleChange} type="tel" maxLength={15} />
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

            {/* ================= APP VAULT PASSWORD SECTION ================= */}
            <div className="bg-white rounded-xl shadow-xl p-8 mt-8">
                <div className="border-b pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <i className="pi pi-lock text-indigo-600" style={{ fontSize: '1.5rem' }}></i>
                        Google APP Vault Password
                    </h2>
                    <div className="mt-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                        <p className="text-gray-700 text-sm font-semibold mb-2">
                            <i className="pi pi-exclamation-triangle text-amber-600 mr-2"></i>
                            Important: This is NOT your website login password!
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed mb-2">
                            If you want to send emails (receipts, reports, notifications) to your students, you need to create a 
                            <strong> Google App Password</strong> from your Google Account settings.
                        </p>
                        <div className="mt-3 bg-white p-3 rounded border border-amber-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">📌 How to create Google App Password:</p>
                            <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
                                <li>Go to your Google Account → Security</li>
                                <li>Enable 2-Step Verification (if not enabled)</li>
                                <li>Search for "App Passwords" in security settings</li>
                                <li>Generate a new app password for "Mail"</li>
                                <li>Copy the 16-character password and paste it below</li>
                            </ol>
                            <p className="text-xs text-indigo-600 mt-2 font-medium">
                                Example: "abcd efgh ijkl mnop" (4 groups of 4 characters)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* APP Password Field */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Google App Password <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={appPassword}
                                onChange={(e) => setAppPassword(e.target.value)}
                                placeholder="abcd efgh ijkl mnop"
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                    appPasswordErrors.appPassword ? "border-red-500" : ""
                                }`}
                            />
                            {appPasswordErrors.appPassword && (
                                <small className="text-red-500 mt-1 block">
                                    {appPasswordErrors.appPassword}
                                </small>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm App Password <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={confirmAppPassword}
                                onChange={(e) => setConfirmAppPassword(e.target.value)}
                                placeholder="Re-enter the same password"
                                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                    appPasswordErrors.confirmPassword ? "border-red-500" : ""
                                }`}
                            />
                            {appPasswordErrors.confirmPassword && (
                                <small className="text-red-500 mt-1 block">
                                    {appPasswordErrors.confirmPassword}
                                </small>
                            )}
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 mb-2">
                            <i className="pi pi-info-circle mr-2"></i>
                            Google App Password Format:
                        </p>
                        <ul className="text-sm text-green-800 space-y-1 ml-6 list-disc">
                            <li>16 characters long (typically in 4 groups of 4 characters)</li>
                            <li>Generated from your Google Account security settings</li>
                            <li>Used exclusively for sending emails from this application</li>
                            <li>You can paste it with or without spaces</li>
                        </ul>
                    </div>

                    {/* Update Button */}
                    <div className="mt-6">
                        <Button
                            label="Save Google App Password"
                            icon="pi pi-shield"
                            loading={appPasswordLoading}
                            onClick={handleAppPasswordUpdate}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                            disabled={appPasswordLoading}
                        />
                        <p className="text-xs text-gray-500 mt-3">
                            <i className="pi pi-shield mr-1"></i>
                            This password will be securely stored and used only for sending emails to students.
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer position="top-right" autoClose={3000} />
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
    maxLength,
}: {
    label: string;
    name: string;
    value: string;
    editing: boolean;
    onChange: any;
    type?: string;
    error?: string;
    maxLength?: number;
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
                        maxLength={maxLength}
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
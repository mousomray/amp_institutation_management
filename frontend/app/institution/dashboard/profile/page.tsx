"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "primereact/badge";
import axios from "axios";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";

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
    geoLocation?: {
        lat: string;
        lng: string;
    };
}

export default function InstitutionProfilePage() {
    const [data, setData] = useState<Institution | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);


    useEffect(() => {
        const storedToken = localStorage.getItem("institution-token");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    useEffect(() => {
        if (token) {
            getInstitutionData();
        }
    }, [token]);

    const getInstitutionData = async () => {
        if (!token) return;

        try {
            const res = await axiosInstance.get(
                "/institution/get-institution",
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );

            if (res.data) {
                setData(res.data.data || null);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message || "Something went wrong"
                );
            } else {
                toast.error("Unexpected error occurred");
            }
        } finally {
            setLoading(false);   // ✅ THIS WAS MISSING
        }
    };


    console.log("--->", data)

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-lg font-semibold">Loading...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-lg font-semibold text-red-500">
                    No Institution Data Found
                </p>
            </div>
        );
    }

    const formattedDate = new Date(
        data.establishDate
    ).toLocaleDateString();

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* ================= Banner ================= */}
            <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-md">
                {data.institutionBanner &&
                    data.institutionBanner !== "0" ? (
                    <Image
                        src={data.institutionBanner}
                        alt="Banner"
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-600 to-indigo-700" />
                )}
            </div>

            {/* ================= Profile Card ================= */}
            <div className="relative bg-white rounded-2xl shadow-xl p-6 mt-[-80px]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {/* Logo */}
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <Image
                                src={data.institutionImage}
                                alt="Institution Logo"
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Name & Status */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                {data.name}
                            </h1>

                            <div className="mt-2">
                                <Badge
                                    value={data.status}
                                    severity={
                                        data.status === "ACTIVE"
                                            ? "success"
                                            : "danger"
                                    }
                                />
                            </div>

                            {data.registrationNo && (
                                <p className="text-sm text-gray-500 mt-2">
                                    Reg No: {data.registrationNo}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ================= Details Grid ================= */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <InfoItem label="Email" value={data.email} />
                    <InfoItem label="Phone" value={data.phone} />

                    <InfoItem label="Website">
                        <a
                            href={`https://${data.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            {data.website}
                        </a>
                    </InfoItem>

                    <InfoItem
                        label="Established"
                        value={formattedDate}
                    />
                </div>

                {/* Address */}
                <div className="mt-6">
                    <InfoItem
                        label="Address"
                        value={data.address}
                    />
                </div>

                {/* Geo Location */}
                {data.geoLocation && (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm text-gray-500">Location</p>

                        {/* Google Maps Embed */}
                        <div className="w-full h-64 rounded-xl overflow-hidden shadow-md">
                            <iframe
                                width="100%"
                                height="100%"
                                loading="lazy"
                                allowFullScreen
                                src={`https://www.google.com/maps?q=${data.geoLocation.lat},${data.geoLocation.lng}&hl=es;z=14&output=embed`}
                            />
                        </div>

                        {/* Open in Google Maps */}
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${data.geoLocation.lat},${data.geoLocation.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                        >
                            Open in Google Maps
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ================= Reusable Info Component ================= */

function InfoItem({
    label,
    value,
    children,
}: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-sm text-gray-500">
                {label}
            </p>
            <div className="text-gray-800 font-medium mt-1">
                {children || value || "-"}
            </div>
        </div>
    );
}
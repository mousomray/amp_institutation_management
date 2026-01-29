"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { bookSetting } from "@/helper/schema/Schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { ToastContainer, toast } from "react-toastify";
import { InputNumber } from "primereact/inputnumber";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Menu } from "primereact/menu";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import EditBookSetting from "@/components/institution/EditBookSetting";
import microInstance from "@/service/micro.service";
import axios from "axios";

type BookFormData = z.infer<typeof bookSetting>;

export default function AddBookForm() {
    const [token, setToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visible, setVisible] = useState<boolean>(false);
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSetting, setSelectedSetting] = useState<any>(null);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<BookFormData>({
        resolver: zodResolver(bookSetting as any),
        defaultValues: {
            bookFee: 0,
            lateFee: 0,
        },
    });

    useEffect(() => {
        const storedToken = localStorage.getItem("institution-token");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    /* ================= FETCH ALL SETTINGS ================= */
    const fetchSettings = async () => {
        if (!token) return;
        
        setLoading(true);
        try {
            const res = await microInstance.get("/api/book/settings", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            if (res.data?.success) {
                // Handle both array and single object response
                const data = Array.isArray(res.data.data) 
                    ? res.data.data 
                    : [res.data.data];
                
                setTableData(data.map((item: any) => ({
                    _id: item._id,
                    bookFee: item.book_fee,
                    lateFee: item.late_fine,
                    isActive: item.isActive,
                    createdAt: item.createdAt,
                })));
            }
        } catch (error: any) {
            console.error(error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Failed to fetch settings");
            } else {
                toast.error("Unexpected error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchSettings();
        }
    }, [token]);

    /* ================= CREATE NEW SETTING ================= */
    const onSubmit = async (data: BookFormData) => {
        if (!token) {
            toast.error("Authentication token not found. Please login.");
            return;
        }

        try {
            setIsSubmitting(true);
            
            const payload = {
                book_fee: data.bookFee,
                late_fine: data.lateFee,
            };

            const res = await microInstance.post("/api/book/createsetting", payload, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

            toast.success(res.data?.message || "Book setting saved successfully");
            reset();
            fetchSettings(); // Refresh the list
        } catch (error: any) {
            console.error(error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Failed to save setting");
            } else {
                toast.error(error?.message || "Something went wrong");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ================= TOGGLE ACTIVE/INACTIVE ================= */
    const toggleSettingStatus = async (settingId: string, currentStatus: boolean) => {
        if (!token) {
            toast.error("Authentication token not found");
            return;
        }

        try {
            const res = await microInstance.put(
                `/api/book/togglesettings/${settingId}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                }
            );

            toast.success(
                res.data?.message || 
                `Marked ${!currentStatus ? "active" : "inactive"} successfully`
            );
            fetchSettings(); // Refresh the list
        } catch (error: any) {
            console.error(error);
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || "Failed to update status");
            } else {
                toast.error("Unexpected error occurred");
            }
        }
    };

    const statusTemplate = (rowData: any) => (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${rowData.isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
        >
            {rowData.isActive ? "Active" : "Inactive"}
        </span>
    );

    const actionTemplate = (rowData: any) => {
        const menuRef = React.useRef<Menu>(null);

        const menuItems = [
            {
                label: "Edit",
                icon: "pi pi-pencil",
                command: () => {
                    setSelectedSetting(rowData);
                    setVisible(true);
                },
            },
            {
                label: rowData.isActive ? "Mark Inactive" : "Mark Active",
                icon: rowData.isActive ? "pi pi-times" : "pi pi-check",
                className: rowData.isActive ? "p-menuitem-danger" : "",
                command: () => {
                    toggleSettingStatus(rowData._id, rowData.isActive);
                },
            },
        ];

        return (
            <>
                <Menu model={menuItems} popup ref={menuRef} />
                <Button
                    icon="pi pi-ellipsis-v"
                    text
                    rounded
                    onClick={(e) => menuRef.current?.toggle(e)}
                    tooltip="Actions"
                />
            </>
        );
    };

    const FromHeader = (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
                Book Setting
            </h2>
            <p className="text-sm text-gray-500">
                Edit institution details
            </p>
        </div>
    )


    return (
        <div className="min-h-screen w-full bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ================= LEFT : DATA TABLE ================= */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Book Fee Settings</h3>

                    <DataTable
                        value={tableData}
                        paginator
                        rows={5}
                        responsiveLayout="scroll"
                        className="text-sm"
                        loading={loading}
                        emptyMessage="No settings found"
                    >
                        <Column field="bookFee" header="Book Fee (₹)" />
                        <Column field="lateFee" header="Late Fee (₹)" />
                        <Column header="Status" body={statusTemplate} />
                        <Column header="Actions" body={actionTemplate} />
                    </DataTable>
                </div>

                {/* ================= RIGHT : FORM ================= */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-3xl font-bold text-gray-800 text-center">
                        Book Settings
                    </h2>
                    <p className="text-gray-500 text-center mt-2">
                        Configure book fee and late fee for your library
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">

                        {/* Book Fee */}
                        <div>
                            <label className="text-sm font-medium">
                                Book Fee <span className="text-red-500">*</span>
                            </label>

                            <Controller
                                name="bookFee"
                                control={control}
                                render={({ field }) => (
                                    <InputNumber
                                        value={field.value}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        className="w-full mt-1"
                                        mode="currency"
                                        currency="INR"
                                        locale="en-IN"
                                        minFractionDigits={2}
                                    />
                                )}
                            />

                            {errors.bookFee && (
                                <small className="text-red-500">
                                    {errors.bookFee.message}
                                </small>
                            )}
                        </div>

                        {/* Late Fee */}
                        <div>
                            <label className="text-sm font-medium">
                                Late Fee <span className="text-red-500">*</span>
                            </label>

                            <Controller
                                name="lateFee"
                                control={control}
                                render={({ field }) => (
                                    <InputNumber
                                        value={field.value}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        className="w-full mt-1"
                                        mode="currency"
                                        currency="INR"
                                        locale="en-IN"
                                        minFractionDigits={2}
                                    />
                                )}
                            />

                            {errors.lateFee && (
                                <small className="text-red-500">
                                    {errors.lateFee.message}
                                </small>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white py-3 rounded-lg font-semibold"
                        >
                            {isSubmitting ? "Saving..." : "Save Settings"}
                        </button>
                    </form>

                    <ToastContainer position="top-right" autoClose={3000} />
                </div>
            </div>
            
            <div className="card flex justify-content-center">
                <Dialog 
                    header={FromHeader} 
                    visible={visible} 
                    style={{ width: '30vw' }} 
                    onHide={() => { 
                        setVisible(false);
                        setSelectedSetting(null);
                    }}
                >
                    <EditBookSetting
                        setting={selectedSetting}
                        refetch={fetchSettings}
                        onClose={() => {
                            setVisible(false);
                            setSelectedSetting(null);
                        }}
                    />
                </Dialog>
            </div>
        </div>
    );
}

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


type BookFormData = z.infer<typeof bookSetting>;

export default function AddBookForm() {
    const [token, setToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visible, setVisible] = useState<boolean>(false);

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
        if (storedToken) setToken(storedToken);
    }, []);

    const onSubmit = async (data: BookFormData) => {
        try {
            setIsSubmitting(true);
            console.log("FORM DATA 👉", data);
            toast.success("Book setting saved successfully");
            reset();
        } catch (error: any) {
            toast.error(error?.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    const tableData = [
        { bookFee: 2323.4, lateFee: 3434.3, isActive: true },
        { bookFee: 1500, lateFee: 500, isActive: false },
        { bookFee: 3000, lateFee: 1000, isActive: true },
    ];

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
                    setVisible(true)
                },
            },
            {
                label: "Mark Active",
                icon: "pi pi-check",
                command: () => {
                    toast.success(`Marked active`);
                },
            },
            {
                label: "Mark Inactive",
                icon: "pi pi-times",
                className: "p-menuitem-danger",
                command: () => {
                    toast.warn(`Marked inactive`);
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
                <Dialog header={FromHeader} visible={visible} style={{ width: '30vw' }} onHide={() => { if (!visible) return; setVisible(false); }}>
                    <EditBookSetting
                        setting={[]}
                        refetch={() =>{}}
                        onClose={() => setVisible(false)}
                    />

                </Dialog>

            </div>
        </div>
    );
}

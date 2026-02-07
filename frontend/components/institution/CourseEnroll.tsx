"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";

type CourseEnrollProps = {
    courseName: string;
    courseImage: string;
    courseDuration: string;
    courseFee: number | string;
    courseId: string | null;
    token: string;
    onClose?: () => void;
};

function CourseEnroll({
    courseName,
    courseImage,
    courseDuration,
    courseFee,
    courseId,
    token,
    onClose,
}: CourseEnrollProps) {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
    const [enrollmentDate, setEnrollmentDate] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // fees masters state
    const [feesMasters, setFeesMasters] = useState<any[]>([]);
    const [selectedFees, setSelectedFees] = useState<string[]>([]); // feesMasterIds
    const [feeAmounts, setFeeAmounts] = useState<Record<string, number>>({}); // map feesMasterId -> amount

    /* ================= FETCH STUDENTS ================= */
    const fetchStudents = async () => {
        try {
            const res = await axiosInstance.get("/student/student-dropdown");
            setStudents(res.data.data || []);
        } catch {
            toast.error("Failed to load students");
        }
    };

    /* ================= FETCH FEES MASTER ================= */
    const fetchFeesMasters = async () => {
        try {
            const res = await axiosInstance.get("/fees-master/get-all-fees-master");
            setFeesMasters(res.data.data || []);
        } catch {
            toast.error("Failed to load fees master");
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchFeesMasters();
    }, []);

    // Robust parser: accepts "yyyy-mm-dd", "dd/mm/yyyy" or other parsable forms.
    const parseToDate = (s: string): Date | null => {
        if (!s) return null;
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (isoMatch) {
            const [, y, m, d] = isoMatch;
            return new Date(Number(y), Number(m) - 1, Number(d));
        }
        const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
        if (dmyMatch) {
            const [, dd, mm, yyyy] = dmyMatch;
            return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        }
        const fallback = new Date(s);
        return isNaN(fallback.getTime()) ? null : fallback;
    };

    const formatDateToDDMMYYYY = (dateStr: string) => {
        const d = parseToDate(dateStr);
        if (!d) return "";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const formatDateToISO = (dateStr: string) => {
        const d = parseToDate(dateStr);
        if (!d) return "";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
    };

    /* ================= ENROLL ================= */
    const handleEnroll = async () => {
        if (!selectedStudents.length) {
            toast.error("Please select at least one student");
            return;
        }
        if (!enrollmentDate) {
            toast.error("Please select enrollment date");
            return;
        }
        // validate fees selection
        if (!selectedFees.length) {
            toast.error("Please select at least one fee item and enter amount");
            return;
        }
        const details = selectedFees.map((id) => {
            const amount = Number(feeAmounts[id] ?? 0);
            return { feesMasterId: id, amount };
        });
        if (details.some((d) => !d.amount || d.amount <= 0)) {
            toast.error("Please enter valid amounts for selected fees");
            return;
        }

        try {
            setLoading(true);
            if (courseId !== null) {
                const studentId = selectedStudents[0]?._id;
                const isoDate = formatDateToISO(enrollmentDate);
                if (!isoDate) {
                    toast.error("Invalid enrollment date");
                    setLoading(false);
                    return;
                }
                const payload = {
                    studentId,
                    enrollmentDate: isoDate, // send yyyy-mm-dd
                };

                const res = await axiosInstance.post(
                    `/student-course/enroll-student/${courseId}`,
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        withCredentials: true,
                    }
                );

                // extract enrollmentId robustly
                const getEnrollmentId = (r: any) => {
                    return (
                        r?.data?._id ||
                        r?.data?.data?._id ||
                        r?.data?.enrollmentId ||
                        r?.data?.data?._id ||
                        r?.data
                    );
                };
                const enrollmentId: string | undefined = getEnrollmentId(res);
                if (!enrollmentId) {
                    toast.error("Enrollment succeeded but enrollmentId not returned");
                    setLoading(false);
                    return;
                }

                // create receipt
                const receiptPayload = { enrollmentId, details };
                const resReceipt = await axiosInstance.post("/receipt/create-receipt", receiptPayload, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                // extract receiptMasterId (API returns data.receiptId)
                const receiptMasterId =
                    resReceipt?.data?.data?.receiptId ||
                    resReceipt?.data?.receiptId ||
                    resReceipt?.data?._id;
                if (!receiptMasterId) {
                    toast.error("Receipt creation failed: no receipt id returned");
                    setLoading(false);
                    return;
                }

                // assign student fees
                await axiosInstance.post(
                    "/student-fees-ledger/assign-studentfees",
                    { enrollmentId, receiptMasterId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                toast.success(`${res.data.message || "Enrolled successfully"} (${formatDateToDDMMYYYY(enrollmentDate)})`);

                setSelectedStudents([]);
                setEnrollmentDate("");
                setSelectedFees([]);
                setFeeAmounts({});
                onClose?.();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Enrollment failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* COURSE INFO */}
            <div className="flex gap-4 items-center">
                <Image
                    src={courseImage}
                    alt={courseName}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                />

                <div>
                    <h3 className="text-lg font-semibold">{courseName}</h3>
                    <p className="text-sm text-gray-500">
                        Duration: {courseDuration}
                    </p>
                    <p className="text-primary font-bold text-lg">
                        ₹{courseFee}
                    </p>
                </div>
            </div>

            {/* STUDENTS */}
            <div>
                <label className="text-sm font-medium">Students</label>
                <MultiSelect
                    value={selectedStudents}
                    options={students}
                    selectionLimit={1}
                    optionLabel="name"
                    display="chip"
                    placeholder="Select students"
                    className="w-full mt-1"
                    filter
                    filterBy="name,email,studentId"
                    filterPlaceholder="Search students..."
                    emptyFilterMessage="No students found"
                    onChange={(e) => setSelectedStudents(e.value)}
                    panelStyle={{ maxHeight: "300px" }}
                    itemTemplate={(student) => (
                        <div className="flex flex-col">
                            <span className="font-medium">{student.name}</span>
                            <span className="text-xs text-gray-500">{student.email}</span>
                        </div>
                    )}
                />
            </div>

            {/* ENROLLMENT DATE */}
            <div>
                <label className="text-sm font-medium">Enrollment Date</label>
                <input
                    type="date"
                    value={enrollmentDate}
                    onChange={(e) => setEnrollmentDate(e.target.value)}
                    className="w-full mt-1 p-2 border rounded"
                    placeholder="dd/mm/yyyy"
                />
            </div>

            {/* FEES SELECTION */}
            <div>
                <label className="text-sm font-medium">Fees</label>
                <MultiSelect
                    value={selectedFees}
                    options={feesMasters}
                    optionLabel="name"
                    optionValue="_id"
                    display="chip"
                    placeholder="Select fees"
                    className="w-full mt-1"
                    onChange={(e) => {
                        const next: string[] = e.value || [];
                        setSelectedFees(next);
                        // initialize amounts for newly selected fees
                        const nextAmounts = { ...feeAmounts };
                        next.forEach((id) => {
                            if (!nextAmounts[id]) nextAmounts[id] = 0;
                        });
                        // remove amounts for unselected
                        Object.keys(nextAmounts).forEach((k) => {
                            if (!next.includes(k)) delete nextAmounts[k];
                        });
                        setFeeAmounts(nextAmounts);
                    }}
                />

                {selectedFees.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {selectedFees.map((id) => {
                            const master = feesMasters.find((f) => f._id === id);
                            return (
                                <div key={id} className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{master?.name || id}</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={feeAmounts[id] ?? ""}
                                        onChange={(e) =>
                                            setFeeAmounts((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                                        }
                                        className="w-32 p-2 border rounded"
                                        placeholder="Amount"
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ACTION */}
            <Button
                label={loading ? "Enrolling..." : "Enroll Students"}
                className="w-full"
                loading={loading}
                onClick={handleEnroll}
            />
            <ToastContainer/>
        </div>
    );
}

export default CourseEnroll;

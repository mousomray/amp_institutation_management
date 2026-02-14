"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import axiosInstance from "@/service/axios.service";
import { toast, ToastContainer } from "react-toastify";
import AddNewStudent from "./AddNewStudent";

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
    const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);

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

    // New: fetch course-specific fees (API changed). If courseId provided, this returns
    // { data: { fees: [{ feesMasterId, feesName, amount }], course: "..." } }
    const fetchCourseFees = async (cId: string) => {
        try {
            const res = await axiosInstance.get(`/course-fees/get-course-fees/${cId}`);
            const fees = res?.data?.data?.fees || [];

            // build feesMasters list (so MultiSelect options remain compatible)
            const masters = fees.map((f: any) => ({ _id: f.feesMasterId, name: f.feesName }));
            setFeesMasters(masters);

            // select all returned fees by default
            const selected = fees.map((f: any) => f.feesMasterId);
            setSelectedFees(selected);

            // set default amounts
            const amounts: Record<string, number> = {};
            fees.forEach((f: any) => {
                amounts[f.feesMasterId] = Number(f.amount) || 0;
            });
            setFeeAmounts(amounts);
        } catch (err) {
            console.error("Failed to load course fees", err);
            toast.error("Failed to load course fees");
        }
    };

    useEffect(() => {
        fetchStudents();
        if (courseId) {
            fetchCourseFees(courseId);
        } else {
            // fallback to global fees master if no courseId
            fetchFeesMasters();
        }
    }, [courseId]);

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

    const AddStudentDialogHeader = (
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
                <i className="pi pi-user-plus text-3xl text-white"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Student Registration</h2>
            <p className="text-gray-500">Add new student with complete information</p>
        </div>
    );

    const handleStudentCreated = async (newStudent: any) => {
        console.log("New student created:", newStudent);
        
        // Refresh the student list
        await fetchStudents();
        
        // Auto-select the newly created student
        setSelectedStudents([newStudent]);
        
        toast.success("Student added and selected!");
    };

    return (
        <div className="space-y-6">
            {/* COURSE INFO */}
            <div className="flex gap-4 items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    {courseImage ? (
                        <Image
                            src={courseImage}
                            alt={courseName}
                            width={80}
                            height={80}
                            className="rounded-xl object-cover shadow-md"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shadow-md">
                            <i className="pi pi-image text-3xl text-gray-400" />
                        </div>
                    )}

                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{courseName}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                        <i className="pi pi-clock text-blue-600"></i>
                        Duration: {courseDuration}
                    </p>
                    <p className="text-blue-600 font-bold text-lg flex items-center gap-1">
                        <i className="pi pi-indian-rupee"></i>
                        {courseFee}
                    </p>
                </div>
            </div>

            {/* STUDENTS SECTION WITH ADD BUTTON */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                        Select Student <span className="text-red-500">*</span>
                    </label>
                    <Button
                        label="Add New Student"
                        icon="pi pi-user-plus"
                        onClick={() => setShowAddStudentDialog(true)}
                        className="p-button-sm"
                        outlined
                        severity="success"
                        size="small"
                        tooltip="Register a new student"
                        tooltipOptions={{ position: 'left' }}
                    />
                </div>
                <MultiSelect
                    value={selectedStudents}
                    options={students}
                    selectionLimit={1}
                    optionLabel="name"
                    display="chip"
                    placeholder="Select a student to enroll"
                    className="w-full"
                    filter
                    filterBy="name,email,studentId"
                    filterPlaceholder="Search by name, email or ID..."
                    emptyFilterMessage="No students found"
                    onChange={(e) => setSelectedStudents(e.value)}
                    panelStyle={{ maxHeight: "300px" }}
                    itemTemplate={(student) => (
                        <div className="flex flex-col py-2">
                            <span className="font-medium text-gray-800">{student.name}</span>
                            <span className="text-xs text-gray-500">{student.email}</span>
                            <span className="text-xs text-blue-600">ID: {student.studentId}</span>
                        </div>
                    )}
                />
                {selectedStudents.length === 0 && (
                    <small className="text-gray-500 flex items-center gap-1 mt-1">
                        <i className="pi pi-info-circle"></i>
                        Student not in the list? Click "Add New Student" button above
                    </small>
                )}
            </div>

            {/* ENROLLMENT DATE */}
            <div>
                <label className="text-sm font-semibold text-gray-700">
                    Enrollment Date <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <i className="pi pi-calendar"></i>
                    </span>
                    <input
                        type="date"
                        value={enrollmentDate}
                        onChange={(e) => setEnrollmentDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="dd/mm/yyyy"
                    />
                </div>
            </div>

            {/* FEES SELECTION */}
            <div>
                <label className="text-sm font-semibold text-gray-700">
                    Select Fees <span className="text-red-500">*</span>
                </label>
                <MultiSelect
                    value={selectedFees}
                    options={feesMasters}
                    optionLabel="name"
                    optionValue="_id"
                    display="chip"
                    placeholder="Select fee items"
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
                    <div className="mt-3 space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <i className="pi pi-money-bill text-green-600"></i>
                            Fee Amounts
                        </div>
                        {selectedFees.map((id) => {
                            const master = feesMasters.find((f) => f._id === id);
                            return (
                                <div key={id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800">{master?.name || id}</div>
                                    </div>
                                    <div className="relative w-40">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={feeAmounts[id] ?? ""}
                                            onChange={(e) =>
                                                setFeeAmounts((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                                            }
                                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300 mt-3">
                            <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                            <span className="text-lg font-bold text-blue-600">
                                ₹{Object.values(feeAmounts).reduce((sum, amt) => sum + amt, 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ACTION */}
            <Button
                label={loading ? "Processing Enrollment..." : "Enroll Student"}
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check-circle"}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                loading={loading}
                onClick={handleEnroll}
            />

            {/* ADD STUDENT DIALOG */}
            <Dialog
                header={AddStudentDialogHeader}
                visible={showAddStudentDialog}
                style={{ width: "50vw" }}
                onHide={() => setShowAddStudentDialog(false)}
                modal
            >
                <Dialog
                    header={AddStudentDialogHeader}
                    visible={showAddStudentDialog}
                    style={{ width: "60vw", maxHeight: "100vh" }}
                    onHide={() => setShowAddStudentDialog(false)}
                    modal
                    className="overflow-hidden"
                >
                    <AddNewStudent
                        onClose={() => setShowAddStudentDialog(false)}
                        onSuccess={handleStudentCreated}
                    />
                </Dialog>
            </Dialog>
        </div>
    );
}

export default CourseEnroll;
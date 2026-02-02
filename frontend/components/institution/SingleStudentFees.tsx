"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import axios from "axios";
import { toast } from "react-toastify";
import { Button } from "primereact/button";

type Props = {
  id: string | null;
  onClose: () => void;
};

export default function SingleStudentFees({ id, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (id && token) fetchSingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const fetchSingle = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/institution/get-single-student-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data || null);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to load details");
      } else {
        toast.error("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n?: number) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "₹0";

  const calcPercent = () => {
    const total = data?.summary?.totalAmount ?? 0;
    const paid = data?.summary?.paidAmount ?? 0;
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  if (!id) return <div className="text-sm text-gray-500">No record selected</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl font-semibold text-blue-700">
            {data?.student?.name ? data.student.name.split(" ").map((s:string)=>s[0]).slice(0,2).join("") : "S"}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{data?.student?.name ?? "Student"}</h3>
            <div className="text-sm text-gray-500">{data?.course?.name ?? "-"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button icon="pi pi-print" className="p-button-text" onClick={() => window.print()} />
          <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={onClose} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{fmt(data?.summary?.totalAmount)}</div>
        </div>
        <div className="p-3 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Paid Amount</div>
          <div className="text-lg font-semibold text-green-700 mt-1">{fmt(data?.summary?.paidAmount)}</div>
        </div>
        <div className="p-3 bg-white border rounded shadow-sm">
          <div className="text-xs text-gray-500">Due Amount</div>
          <div className="text-lg font-semibold text-red-700 mt-1">{fmt(data?.summary?.dueAmount)}</div>
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-600 mb-2">Payment Progress</div>
        <div className="w-full bg-gray-100 rounded h-3 overflow-hidden">
          <div
            className="h-3 bg-gradient-to-r from-green-400 to-green-600"
            style={{ width: `${calcPercent()}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">{calcPercent()}% paid</div>
      </div>

      <div className="bg-white border rounded shadow-sm">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-800">Fees Breakdown</div>
            <div className="text-sm text-gray-500">{data?.fees?.length ?? 0} items</div>
          </div>
        </div>

        <div className="divide-y">
          {(data?.fees || []).map((f: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-700">{f.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{f.type ?? ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-gray-900">{fmt(f.amount)}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${f.type === "COURSE" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-700"}`}>
                  {f.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading...</div>}
    </div>
  );
}

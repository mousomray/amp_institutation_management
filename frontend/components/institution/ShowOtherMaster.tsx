import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { formatDate } from "@/helper/DateTime";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Divider } from "primereact/divider";
import { Tag } from "primereact/tag";
import { Skeleton } from "primereact/skeleton";

interface Props {
  id: string | null;
  onClose: () => void;
}

export default function ShowOtherMaster({ id, onClose }: Props) {
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setItem(null);
      return;
    }
    let mounted = true;
    const fetchOne = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("institution-token");
        const res = await axiosInstance.get(`/other-payment/other-payment-master/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setItem(res.data?.data ?? null);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load details");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOne();
    return () => {
      mounted = false;
    };
  }, [id]);

  const fmt = (v: number | null | undefined) =>
    v != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v) : "-";

  return (
    <Card className="w-full">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
          <i className="pi pi-money-bill text-2xl" />
        </div>
        <div className="flex-1">
          {/* use block-level containers to avoid placing Skeleton (a div) inside inline/heading tags */}
          <div role="heading" aria-level={2} className="text-xl font-semibold text-gray-800">
            {loading ? <Skeleton width="60%" height="1.4rem" /> : item?.name ?? "-"}
          </div>
          <div className="text-sm text-gray-500">
            {loading ? <Skeleton width="40%" /> : item?.description ?? "No description available"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {loading ? (
              <>
                <Skeleton width="80" height="28" />
                <Skeleton width="120" height="28" />
              </>
            ) : (
              <>
                <Tag value={item?.isActive ? "Active" : "Inactive"} severity={item?.isActive ? "success" : "danger"} />
                <small className="text-xs text-gray-500">Created: {item ? formatDate(item.createdAt) : "-"}</small>
                <small className="text-xs text-gray-500">• By: {item?.createdBy?.email ?? item?.createdByUser?.email ?? "-"}</small>
              </>
            )}
          </div>
        </div>
      </div>

      <Divider className="my-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Amount</div>
          <div className="text-lg font-medium text-gray-800">{loading ? <Skeleton width="120" /> : fmt(item?.amount)}</div>

          <div className="text-sm text-gray-600 mt-4">Description</div>
          <div className="text-sm text-gray-700">{loading ? <Skeleton /> : item?.description ?? "-"}</div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-600">Status</div>
          <div>{loading ? <Skeleton width="80" /> : <Tag value={item?.isActive ? "Active" : "Inactive"} severity={item?.isActive ? "success" : "danger"} />}</div>

          <div className="text-sm text-gray-600 mt-4">Created At</div>
          <div className="text-sm text-gray-700">{loading ? <Skeleton width="140" /> : (item ? formatDate(item.createdAt) : "-")}</div>
        </div>
      </div>

      <Divider className="my-4" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Students Assigned</div>
          <div className="text-lg font-semibold text-gray-800">{loading ? <Skeleton width="40" /> : item?.totalStudentsAssigned ?? "-"}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-lg font-semibold text-gray-800">{loading ? <Skeleton width="80" /> : fmt(item?.totalAmount)}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Total Paid</div>
          <div className="text-lg font-semibold text-gray-800">{loading ? <Skeleton width="80" /> : fmt(item?.totalPaid)}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Total Due</div>
          <div className="text-lg font-semibold text-gray-800">{loading ? <Skeleton width="80" /> : fmt(item?.totalDue)}</div>
        </div>
      </div>

      <div className="flex justify-end mt-4 gap-2">
        <Button label="Close" onClick={onClose} className="p-button-text" />
      </div>
    </Card>
  );
}

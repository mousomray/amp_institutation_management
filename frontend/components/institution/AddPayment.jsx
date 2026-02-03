import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";

export default function AddPayment({ id, onClose, onSuccess, isInstallment = false, studentFeesId }) {
  const [amount, setAmount] = useState(null);
  const [mode, setMode] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [fetchingAmount, setFetchingAmount] = useState(false);
  const [token, setToken] = useState(null);

  const paymentModes = [
    { label: "Cash", value: "CASH", icon: "pi pi-money-bill" },
    { label: "UPI", value: "UPI", icon: "pi pi-qrcode" },
    { label: "Bank", value: "BANK", icon: "pi pi-university" },
    { label: "Card", value: "CARD", icon: "pi pi-credit-card" },
  ];

  useEffect(() => {
    const t = localStorage.getItem("institution-token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (isInstallment && id && token && studentFeesId) {
      fetchInstallmentAmount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstallment, id, token, studentFeesId]);

  const fetchInstallmentAmount = async () => {
    try {
      setFetchingAmount(true);
      const res = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/institution/list-installment-items/${studentFeesId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data || [];
      const item = items.find((i) => i._id === id);
      if (item) {
        const remaining = item.amount - item.paidAmount;
        setAmount(remaining);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch installment amount");
    } finally {
      setFetchingAmount(false);
    }
  };

  const modeOptionTemplate = (option) => {
    if (!option) return null;
    return (
      <div className="flex items-center gap-3">
        <i className={`${option.icon} text-lg text-blue-600`} />
        <div>
          <div className="text-sm font-medium">{option.label}</div>
          <div className="text-xs text-gray-500">{option.value}</div>
        </div>
      </div>
    );
  };

  const modeValueTemplate = (option) => {
    if (!option) return <span className="text-gray-400">Select mode</span>;
    return (
      <div className="flex items-center gap-3">
        <i className={`${option.icon} text-lg text-blue-600`} />
        <span className="text-sm">{option.label}</span>
      </div>
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!id) return toast.error("No payment target selected");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");

    try {
      setLoading(true);
      const payload = { amount: Number(amount), paymentMode: mode };

      let url;
      if (isInstallment && studentFeesId) {
        // installment payment
        url = `/institution/pay-installment/${studentFeesId}/${id}`;
      } else {
        // full fees payment
        url = `/institution/pay-student-fees/${id}`;
      }

      const res = await axiosInstance.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Payment successful");
      setAmount(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="px-2">
        <label className="text-sm font-medium text-gray-700">
          Amount (₹) {isInstallment && <span className="text-xs text-gray-500">(Remaining)</span>}
        </label>
        <div className="mt-2">
          {fetchingAmount ? (
            <div className="text-sm text-gray-500">Loading amount...</div>
          ) : (
            <InputNumber
              value={amount}
              onValueChange={(e) => !isInstallment && setAmount(e.value)}
              mode="currency"
              currency="INR"
              locale="en-IN"
              min={0}
              className="w-full"
              inputClassName="p-2"
              placeholder="Enter amount"
              disabled={loading || isInstallment}
              readOnly={isInstallment}
            />
          )}
        </div>
      </div>

      <div className="px-2">
        <label className="text-sm font-medium text-gray-700">Payment Mode</label>
        <div className="mt-2">
          <Dropdown
            value={mode}
            options={paymentModes}
            onChange={(e) => setMode(e.value)}
            optionLabel="label"
            optionValue="value"
            itemTemplate={modeOptionTemplate}
            valueTemplate={modeValueTemplate}
            placeholder="Select payment mode"
            className="w-full"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex gap-2 px-2">
        <Button
          type="submit"
          label={loading ? "Processing..." : "Pay"}
          icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
          className="w-full p-button-primary"
          disabled={loading || fetchingAmount}
        />
        <Button type="button" label="Cancel" className="p-button-text" onClick={onClose} disabled={loading} />
      </div>
    </form>
  );
}

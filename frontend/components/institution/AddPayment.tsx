import React, { useEffect, useState } from "react";
import axiosInstance from "@/service/axios.service";
import { toast } from "react-toastify";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";

type Props = {
  id?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
  isInstallment?: boolean;
  studentFeesId?: string | null;
};

export default function AddPayment({ id, onClose, onSuccess, isInstallment = false, studentFeesId }: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const [instrumentId, setInstrumentId] = useState<string>(""); // for UPI/bank/check references
  const [mode, setMode] = useState<string>("CASH");
  const [loading, setLoading] = useState(false);
  const [fetchingAmount, setFetchingAmount] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const paymentModes = [
    { label: "Cash", value: "CASH", icon: "pi pi-money-bill" },
    { label: "UPI", value: "UPI", icon: "pi pi-qrcode" },
    { label: "Bank", value: "BANK", icon: "pi pi-university" },
    { label: "Card", value: "CARD", icon: "pi pi-credit-card" },
    { label: "Cheque", value: "CHEQUE", icon: "pi pi-file" }, // added cheque
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
      const item = items.find((i: any) => i._id === id);
      if (item) {
        const remaining = Number(item.amount || 0) - Number(item.paidAmount || 0);
        setAmount(Number.isFinite(remaining) ? remaining : 0);
      } else {
        setAmount(0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch installment amount");
      setAmount(0);
    } finally {
      setFetchingAmount(false);
    }
  };

  // Fetch total for non-installment payments
  useEffect(() => {
    if (!isInstallment && id && token) {
      fetchStudentFeesTotal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstallment, id, token]);

  const fetchStudentFeesTotal = async () => {
    try {
      setFetchingAmount(true);
      const res = await axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/student-fees-ledger/single-student-fees/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const item = res.data?.data || {};
      console.log("Fetched student fees item:", item);
      const total = Number(item?.dueAmount ?? 0);
      setAmount(Number.isFinite(total) ? total : 0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch total amount");
      setAmount(0);
    } finally {
      setFetchingAmount(false);
    }
  };

  const modeOptionTemplate = (option: any) => {
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

  const modeValueTemplate = (option: any) => {
    if (!option) return <span className="text-gray-400">Select mode</span>;
    return (
      <div className="flex items-center gap-3">
        <i className={`${option.icon} text-lg text-blue-600`} />
        <span className="text-sm">{option.label}</span>
      </div>
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return toast.error("No payment target selected");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");

    // require instrument id for cheque payments
    if (mode === "CHEQUE" && (!instrumentId || instrumentId.trim().length === 0)) {
      return toast.error("Enter cheque number");
    }

    try {
      setLoading(true);
      // include instrumentId only when provided (for UPI/bank/check references)
      const payload: any = { amount: Number(amount), paymentMode: mode };
      if (instrumentId && instrumentId.trim().length > 0) payload.instrumentId = instrumentId.trim();

      let url: string;
      if (isInstallment && studentFeesId) {
        url = `/institution/pay-installment/${id}`;
      } else {
        url = `/institution/pay-student-fees/${id}`;
      }

      const res = await axiosInstance.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data?.message || "Payment successful");
      setAmount(null);
      setInstrumentId("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
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
              onValueChange={(e: any) => {
                // keep numeric value; amount is read-only for installment payments
                setAmount(e.value ?? null);
              }}
              mode="currency"
              currency="INR"
              locale="en-IN"
              min={0}
              className="w-full"
              inputClassName="p-2"
              placeholder="Enter amount"
              disabled={loading || fetchingAmount}
              readOnly={isInstallment} // installment payments are read-only (show remaining amount)
            />
          )}
        </div>
      </div>

      {/* instrumentId input for UPI/Bank/CHEQUE modes */}
      {mode && mode !== "CASH" && (
        <div className="px-2">
          <label className="text-sm font-medium text-gray-700">
            {mode === "CHEQUE" ? "Cheque Number" : "Transaction / Instrument ID"}
          </label>
          <div className="mt-2">
            <input
              value={instrumentId}
              onChange={(e) => setInstrumentId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder={
                mode === "CHEQUE"
                  ? "e.g. Cheque number"
                  : "e.g. UPI txn id or cheque number (optional)"
              }
              disabled={loading}
            />
          </div>
        </div>
      )}

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
        <Button
          type="button"
          label="Cancel"
          className="p-button-text"
          onClick={onClose}
          disabled={loading}
        />
      </div>
    </form>
  );
}

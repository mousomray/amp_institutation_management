"use client"
import React, { useEffect, useState } from 'react';
import axiosInstance from '@/service/axios.service';
import axios from 'axios';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Tag } from 'primereact/tag';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Student = { _id: string; name: string; email?: string; photo?: string };
type Course = { _id: string; name: string; image?: string };

type Installment = {
	_id: string;
	dueDate?: string;
	amount?: number;
	paidAmount?: number;
	status?: 'PAID' | 'DUE' | 'PARTIAL' | string;
	createdAt?: string;
	updatedAt?: string;
};

type OtherFee = { feesHeadName?: string; feesHeadId?: string; amount?: number };

type Breakdown = {
	courseFeesTotal: number;
	otherFeesTotal: number;
};

type FeeHeadSummary = {
	feesHeadName: string;
	totalAmount: number;
};

type RecordItem = {
	_id: string;
	totalAmount: number;
	paidAmount: number;
	dueAmount: number;
	paymentType: 'NORMAL' | 'INSTALLMENT' | string;
	status: 'PAID' | 'DUE' | 'PARTIAL' | string;
	createdAt: string;
	student: Student;
	course: Course;
	installments: Installment[];
	otherFees: OtherFee[];
	enrollmentDate: string;
};

const DATE_FMT_UTC = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
const DATETIME_FMT_UTC = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'UTC',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
});

function formatDateUTC(value?: string) {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : DATE_FMT_UTC.format(d);
}
function formatDateTimeUTC(value?: string) {
	if (!value) return '';
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? '' : DATETIME_FMT_UTC.format(d);
}

const fmtINR = (n?: number) =>
	typeof n === 'number' ? n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '₹0';

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center h-full text-center">
		<div className="text-6xl mb-4">📊</div>
		<h2 className="text-xl font-semibold text-gray-700">No Report Data</h2>
		<p className="text-gray-500 mt-2 max-w-md">No financial report records found.</p>
	</div>
);

export default function ReportPage() {
	// Note: avoid next/navigation's useSearchParams to prevent SSR prerender errors.
	// Read query params from window.location when running in browser.

	const [data, setData] = useState<RecordItem[]>([]);
	const [allData, setAllData] = useState<RecordItem[]>([]);
	const [summary, setSummary] = useState<{ totalAmount: number; totalPaidAmount: number; totalDueAmount: number } | null>(null);
	const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
	const [otherFeesHeadSummary, setOtherFeesHeadSummary] = useState<FeeHeadSummary[]>([]);

	const [token, setToken] = useState<string | null>(null);
	const reportPath = '/student-fees-ledger/student-financial-report';

	const [pagination, setPagination] = useState({ page: 1, rows: 5, total: 0, totalPages: 1 });
	const [loading, setLoading] = useState<boolean>(false);

	const [searchInput, setSearchInput] = useState<string>('');
	const [debouncedSearch, setDebouncedSearch] = useState<string>('');

	const [year, setYear] = useState<string>('');
	const [month, setMonth] = useState<string>('');
	const [date, setDate] = useState<string>('');
	const [period, setPeriod] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
	const [course, setCourse] = useState<string>('');

	const [expandedRows, setExpandedRows] = useState<any>(null);

	const [error, setError] = useState<string>('');

	useEffect(() => {
		const t = localStorage.getItem('institution-token');
		if (t) setToken(t);
	}, []);

	useEffect(() => {
		// Supports opening this page with: ?course=SQL
		if (typeof window === 'undefined') {
			setCourse('');
			return;
		}
		try {
			const params = new URLSearchParams(window.location.search || '');
			const c = (params.get('course') ?? '').trim();
			setCourse(c);
		} catch (err) {
			setCourse('');
		}
	}, []);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
		return () => clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		setPagination((p) => ({ ...p, page: 1 }));
	}, [debouncedSearch, year, month, date, period, course]);

	useEffect(() => {
		if (!token) return;
		let active = true;

		(async () => {
			try {
				setLoading(true);
				setError('');

				const params: Record<string, any> = {
					page: pagination.page,
					perPage: pagination.rows,
					...(debouncedSearch ? { search: debouncedSearch } : {})
				};

				// keep your existing query fields
				if (year) params.year = year;
				if (month) params.month = month;
				if (date) params.date = date;
				if (course) params.course = course;

				if (period === 'week') {
					const today = new Date();
					const start = new Date(today);
					start.setDate(today.getDate() - 7);
					params.startDate = start.toISOString().slice(0, 10);
					params.endDate = today.toISOString().slice(0, 10);
				}

				const res = await axiosInstance.get(reportPath, {
					params,
					headers: { Authorization: `Bearer ${token}` }
				});

				if (!active) return;

				const json = res?.data ?? {};
				const pag = json.pagination ?? {};

				// Support API responses with `data` or `paginatedData`
				const pageData = json.data ?? json.paginatedData ?? [];

				setData(pageData);
				setAllData(json.allData ?? []);
				setSummary(json.summary ?? null);
				setBreakdown(json.breakdown ?? null);
				setOtherFeesHeadSummary(json.otherFeesHeadSummary ?? []);

				// Normalize pagination fields from different API shapes
				setPagination((prev) => ({
					...prev,
					total: pag?.totalRecords ?? pag?.total ?? prev.total,
					page: pag?.currentPage ?? pag?.page ?? prev.page,
					rows: pag?.perPage ?? pag?.per_page ?? pag?.limit ?? prev.rows,
					totalPages: pag?.totalPages ?? pag?.total_pages ?? prev.totalPages
				}));
			} catch (err: any) {
				if (!active) return;
				console.error(err);

				let msg = 'Failed to fetch report.';
				if (axios.isAxiosError(err)) msg = err.response?.data?.message || `Request failed (${err.response?.status ?? 'unknown'})`;

				setError(msg);
				toast.error(msg);
			} finally {
				if (active) setLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [token, pagination.page, pagination.rows, debouncedSearch, year, month, date, period, course]);

	const statusSeverity = (s?: string) => (s === 'PAID' ? 'success' : s === 'PARTIAL' ? 'warning' : 'danger');
	const typeSeverity = (t?: string) => (t === 'INSTALLMENT' ? 'info' : 'secondary');

	const rowExpansionTemplate = (row: RecordItem) => {
		const installments = row.installments || [];
		const otherFees = row.otherFees || [];
		return (
			<div className="p-3 bg-gray-50 rounded-md border border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<div className="font-semibold mb-2">Installments ({installments.length})</div>
						{installments.length === 0 ? (
							<div className="text-sm text-gray-500">No installment records.</div>
						) : (
							<div className="overflow-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-left border-b">
											<th className="py-2 pr-2">Due Date</th>
											<th className="py-2 pr-2">Amount</th>
											<th className="py-2 pr-2">Paid</th>
											<th className="py-2 pr-2">Status</th>
										</tr>
									</thead>
									<tbody>
										{installments.map((ins) => (
											<tr key={ins._id} className="border-b last:border-b-0">
												<td className="py-2 pr-2">{formatDateUTC(ins.dueDate)}</td>
												<td className="py-2 pr-2">{fmtINR(ins.amount)}</td>
												<td className="py-2 pr-2">{fmtINR(ins.paidAmount)}</td>
												<td className="py-2 pr-2">
													<Tag value={ins.status ?? 'DUE'} severity={statusSeverity(ins.status)} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div>
						<div className="font-semibold mb-2">Other Fees ({otherFees.length})</div>
						{otherFees.length === 0 ? (
							<div className="text-sm text-gray-500">No other fee heads.</div>
						) : (
							<div className="overflow-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-left border-b">
											<th className="py-2 pr-2">Head</th>
											<th className="py-2 pr-2">Amount</th>
										</tr>
									</thead>
									<tbody>
										{otherFees.map((f, idx) => (
											<tr key={`${row._id}-fee-${idx}`} className="border-b last:border-b-0">
												<td className="py-2 pr-2">{f.feesHeadName ?? '-'}</td>
												<td className="py-2 pr-2">{fmtINR(f.amount)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>

				<div className="text-xs text-gray-500 mt-3">
					Created: <span className="font-mono">{formatDateTimeUTC(row.createdAt)}</span>
				</div>
			</div>
		);
	};

	const exportCSV = () => {
		// Use allData for CSV export to get all records, not just current page
		const exportData = allData.length > 0 ? allData : data;
		if (exportData.length === 0) {
			toast.info('No data to export.');
			return;
		}
		const rows = [
			['Student', 'Email', 'Course', 'Type', 'Total', 'Paid', 'Due', 'Status', 'EnrollmentDate', 'CreatedAt'],
			...exportData.map((r) => [
				r.student?.name ?? '',
				r.student?.email ?? '',
				r.course?.name ?? '',
				r.paymentType ?? '',
				String(r.totalAmount ?? 0),
				String(r.paidAmount ?? 0),
				String(r.dueAmount ?? 0),
				r.status ?? '',
				formatDateUTC(r.enrollmentDate),
				formatDateTimeUTC(r.createdAt)
			])
		];
		const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const suffix = [course ? `course_${course}` : null, year ? `year_${year}` : null, month ? `month_${month}` : null, date ? `date_${date}` : null]
			.filter(Boolean)
			.join('_');
		a.download = `financial_report_${suffix || 'filtered'}_${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const escapeHtml = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

	const printReport = () => {
		const exportData = allData.length > 0 ? allData : data;
		if (!exportData || exportData.length === 0) {
			toast.info('No data to print.');
			return;
		}

		const win = window.open('', '_blank');
		if (!win) {
			toast.error('Popup blocked. Please allow popups.');
			return;
		}

		const filterParts = [
			course ? `Course: ${course}` : '',
			year ? `Year: ${year}` : '',
			month ? `Month: ${month}` : '',
			date ? `Date: ${date}` : '',
			period && period !== 'all' ? `Period: ${period}` : ''
		].filter(Boolean);
		const filterLine = filterParts.length ? filterParts.join(' | ') : 'All Records';

		let html = `<!doctype html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Financial Report - Institute Library Management</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { 
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
			color: #1f2937; 
			padding: 20px;
			background: #fff;
		}
		.header { 
			border-bottom: 3px solid #3b82f6; 
			padding-bottom: 12px; 
			margin-bottom: 16px; 
		}
		.header h1 { 
			font-size: 22px; 
			color: #1f2937; 
			margin-bottom: 4px; 
		}
		.meta { 
			font-size: 11px; 
			color: #6b7280; 
			margin-top: 4px; 
		}
		.summary { 
			display: grid; 
			grid-template-columns: repeat(3, 1fr); 
			gap: 12px; 
			margin: 16px 0; 
		}
		.summary-card { 
			border: 1px solid #e5e7eb; 
			border-radius: 8px; 
			padding: 12px; 
		}
		.summary-card .label { 
			font-size: 11px; 
			color: #6b7280; 
			text-transform: uppercase; 
			letter-spacing: 0.5px; 
		}
		.summary-card .value { 
			font-size: 20px; 
			font-weight: 700; 
			margin-top: 4px; 
		}
		.summary-card.total .value { color: #1f2937; }
		.summary-card.paid .value { color: #059669; }
		.summary-card.due .value { color: #dc2626; }
		
		.record { 
			border: 1px solid #e5e7eb; 
			border-radius: 8px; 
			margin-bottom: 16px; 
			padding: 12px; 
			page-break-inside: avoid; 
		}
		.record-header { 
			display: grid; 
			grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr; 
			gap: 8px; 
			padding: 10px; 
			background: #f9fafb; 
			border-radius: 6px; 
			margin-bottom: 8px; 
			font-size: 12px; 
		}
		.record-header > div { }
		.record-header .label { 
			font-size: 10px; 
			color: #6b7280; 
			margin-bottom: 2px; 
		}
		.record-header .val { 
			font-weight: 600; 
			color: #1f2937; 
		}
		.badge { 
			display: inline-block; 
			padding: 2px 8px; 
			border-radius: 4px; 
			font-size: 10px; 
			font-weight: 600; 
		}
		.badge.paid { background: #d1fae5; color: #065f46; }
		.badge.partial { background: #fef3c7; color: #92400e; }
		.badge.due { background: #fee2e2; color: #991b1b; }
		.badge.installment { background: #dbeafe; color: #1e40af; }
		.badge.normal { background: #e5e7eb; color: #374151; }
		
		.sub-section { 
			margin-top: 8px; 
			padding: 8px; 
			background: #fafbfc; 
			border-radius: 4px; 
		}
		.sub-section h4 { 
			font-size: 11px; 
			color: #374151; 
			margin-bottom: 6px; 
			text-transform: uppercase; 
			letter-spacing: 0.5px; 
		}
		table { 
			width: 100%; 
			border-collapse: collapse; 
			font-size: 11px; 
		}
		table th, table td { 
			border: 1px solid #e5e7eb; 
			padding: 6px 8px; 
			text-align: left; 
		}
		table th { 
			background: #f3f4f6; 
			font-weight: 600; 
			color: #374151; 
		}
		.no-data { 
			font-size: 11px; 
			color: #9ca3af; 
			font-style: italic; 
		}
		@media print {
			body { padding: 8mm; }
			.record { page-break-inside: avoid; }
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>📊 Financial Report</h1>
		<div class="meta">Institute Library Management System</div>
		<div class="meta">Filters: ${escapeHtml(filterLine)}</div>
		<div class="meta">Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
	</div>

	<div class="summary">
		<div class="summary-card total">
			<div class="label">Total Amount</div>
			<div class="value">${escapeHtml(fmtINR(summary?.totalAmount))}</div>
		</div>
		<div class="summary-card paid">
			<div class="label">Total Paid</div>
			<div class="value">${escapeHtml(fmtINR(summary?.totalPaidAmount))}</div>
		</div>
		<div class="summary-card due">
			<div class="label">Total Due</div>
			<div class="value">${escapeHtml(fmtINR(summary?.totalDueAmount))}</div>
		</div>
	</div>

	${breakdown ? `
	<div class="breakdown" style="margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">
		<h3 style="font-size:14px;font-weight:600;color:#374151;margin-bottom:12px">💰 Fee Breakdown</h3>
		<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:12px">
			<div style="padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:6px">
				<div style="font-size:10px;color:#6b7280;margin-bottom:4px">COURSE FEES TOTAL</div>
				<div style="font-size:18px;font-weight:700;color:#2563eb">${escapeHtml(fmtINR(breakdown.courseFeesTotal))}</div>
			</div>
			<div style="padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:6px">
				<div style="font-size:10px;color:#6b7280;margin-bottom:4px">OTHER FEES TOTAL</div>
				<div style="font-size:18px;font-weight:700;color:#7c3aed">${escapeHtml(fmtINR(breakdown.otherFeesTotal))}</div>
			</div>
		</div>
		${otherFeesHeadSummary.length > 0 ? `
			<div style="margin-top:12px">
				<h4 style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px">Other Fees by Head:</h4>
				<table style="width:100%;border-collapse:collapse;font-size:11px">
					<thead>
						<tr style="background:#f3f4f6">
							<th style="border:1px solid #e5e7eb;padding:6px 8px;text-align:left">Fee Head</th>
							<th style="border:1px solid #e5e7eb;padding:6px 8px;text-align:right">Total Amount</th>
						</tr>
					</thead>
					<tbody>
						${otherFeesHeadSummary.map(head => `
							<tr>
								<td style="border:1px solid #e5e7eb;padding:6px 8px;background:#fff">${escapeHtml(head.feesHeadName)}</td>
								<td style="border:1px solid #e5e7eb;padding:6px 8px;text-align:right;background:#fff;font-weight:600">${escapeHtml(fmtINR(head.totalAmount))}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		` : ''}
	</div>
	` : ''}

	<div class="records">
		${exportData.map((r, idx) => {
			const installments = r.installments || [];
			const otherFees = r.otherFees || [];
			return `
				<div class="record">
					<div class="record-header">
						<div>
							<div class="label">Student</div>
							<div class="val">${escapeHtml(r.student?.name)}</div>
							<div style="font-size:10px;color:#6b7280">${escapeHtml(r.student?.email)}</div>
						</div>
						<div>
							<div class="label">Course</div>
							<div class="val">${escapeHtml(r.course?.name)}</div>
							<div style="font-size:10px;color:#6b7280">${escapeHtml(r.paymentType)}</div>
						</div>
						<div>
							<div class="label">Total</div>
							<div class="val">${escapeHtml(fmtINR(r.totalAmount))}</div>
						</div>
						<div>
							<div class="label">Paid</div>
							<div class="val" style="color:#059669">${escapeHtml(fmtINR(r.paidAmount))}</div>
						</div>
						<div>
							<div class="label">Due</div>
							<div class="val" style="color:#dc2626">${escapeHtml(fmtINR(r.dueAmount))}</div>
						</div>
						<div>
							<div class="label">Status</div>
							<div>
								<span class="badge ${r.status?.toLowerCase()}">${escapeHtml(r.status)}</span>
							</div>
						</div>
					</div>

					${installments.length > 0 ? `
						<div class="sub-section">
							<h4>Installments (${installments.length})</h4>
							<table>
								<thead>
									<tr>
										<th>Due Date</th>
										<th>Amount</th>
										<th>Paid Amount</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									${installments.map(ins => `
										<tr>
											<td>${escapeHtml(formatDateUTC(ins.dueDate))}</td>
											<td>${escapeHtml(fmtINR(ins.amount))}</td>
											<td>${escapeHtml(fmtINR(ins.paidAmount))}</td>
											<td><span class="badge ${ins.status?.toLowerCase()}">${escapeHtml(ins.status)}</span></td>
										</tr>
									`).join('')}
								</tbody>
							</table>
						</div>
					` : ''}

					${otherFees.length > 0 ? `
						<div class="sub-section">
							<h4>Other Fees (${otherFees.length})</h4>
							<table>
								<thead>
									<tr>
										<th>Fee Head</th>
										<th>Amount</th>
									</tr>
								</thead>
								<tbody>
									${otherFees.map((fee: any) => `
										<tr>
											<td>${escapeHtml(fee.feesHeadName || '-')}</td>
											<td>${escapeHtml(fmtINR(fee.amount))}</td>
										</tr>
									`).join('')}
								</tbody>
							</table>
						</div>
					` : ''}

					${installments.length === 0 && otherFees.length === 0 ? `
						<div class="meta" style="padding:8px;text-align:center">No additional fee details</div>
					` : ''}
				</div>
			`;
		}).join('')}
	</div>

	<div class="meta" style="margin-top:20px;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px">
		Total Records: ${exportData.length} | Page 1 of 1
	</div>
</body>
</html>`;

		win.document.open();
		win.document.write(html);
		win.document.close();

		win.onload = () => {
			try {
				win.focus();
				win.print();
			} catch (err) {
				console.error('Print failed', err);
			}
		};
	};



	return (
		<div className="min-h-screen bg-gray-50 w-full">
			<div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-4">
				{/* Top bar */}
				<div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
					<div>
						<div className="text-lg md:text-xl font-semibold text-gray-900">Financial Report</div>
						<div className="text-sm text-gray-500">Student fees ledger report (installments & other fees)</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end w-full lg:w-auto">
						<IconField iconPosition="left" className="w-full sm:w-[320px]">
							<InputIcon className="pi pi-search" />
							<InputText
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search student name / email"
								className="p-inputtext-sm w-full"
							/>
						</IconField>

						<div className="flex gap-2 justify-end">
							<button className="p-button p-component p-button-help p-button-sm" onClick={exportCSV}>
								Download CSV
							</button>
							<button className="p-button p-component p-button-warning p-button-sm" onClick={printReport}>
								Print / PDF
							</button>
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
					<div className="flex items-center justify-between gap-3">
						<div className="text-sm font-semibold text-gray-800">Filters</div>
						<div className="flex gap-2">
							<button className="p-button p-component p-button-sm" onClick={() => setPagination((p) => ({ ...p, page: 1 }))}>
								Apply
							</button>
							<button
								className="p-button p-component p-button-secondary p-button-sm"
								onClick={() => {
									setSearchInput('');
									setYear('');
									setMonth('');
									setDate('');
									setPeriod('all');
									setCourse('');
									setPagination((p) => ({ ...p, page: 1 }));
								}}
							>
								Reset
							</button>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
						<div className="flex flex-col gap-1">
							<label className="text-xs text-gray-500">Period</label>
							<select
								className="p-inputtext p-component p-inputtext-sm"
								value={period}
								onChange={(e) => setPeriod(e.target.value as any)}
							>
								<option value="all">All</option>
								<option value="day">Day</option>
								<option value="week">Last 7 days</option>
								<option value="month">Month</option>
								<option value="year">Year</option>
							</select>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs text-gray-500">Date</label>
							<InputText className="p-inputtext-sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-xs text-gray-500">Year</label>
							<Calendar
								view="year"
								dateFormat="yy"
								className="p-inputtext-sm"
								value={year ? new Date(Number(year), 0, 1) : null}
								onChange={(e) => {
									const d = e.value as Date | null;
									setYear(d ? String(d.getFullYear()) : '');
								}}
								showIcon
								placeholder="Select year"
							/>
						</div>


						<div className="flex flex-col gap-1">
							<label className="text-xs text-gray-500">Course</label>
							<InputText className="p-inputtext-sm" placeholder="e.g. SQL" value={course} onChange={(e) => setCourse(e.target.value)} />
						</div>

						{/* Month and Rows controls removed as requested */}
					</div>
				</div>

				{/* Summary */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="bg-white border border-gray-200 rounded-2xl p-4">
						<div className="text-xs text-gray-500">Total Amount</div>
						<div className="text-2xl font-semibold text-gray-900 mt-1">{fmtINR(summary?.totalAmount)}</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-2xl p-4">
						<div className="text-xs text-gray-500">Total Paid</div>
						<div className="text-2xl font-semibold text-green-700 mt-1">{fmtINR(summary?.totalPaidAmount)}</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-2xl p-4">
						<div className="text-xs text-gray-500">Total Due</div>
						<div className="text-2xl font-semibold text-red-700 mt-1">{fmtINR(summary?.totalDueAmount)}</div>
					</div>
				</div>

				{/* Breakdown */}
				{breakdown && (
					<div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
						<div className="text-sm font-semibold text-gray-800 mb-4">💰 Fee Breakdown</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
							<div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
								<div className="text-xs text-blue-600 font-medium">Course Fees Total</div>
								<div className="text-xl font-bold text-blue-700 mt-1">{fmtINR(breakdown.courseFeesTotal)}</div>
							</div>
							<div className="border border-purple-200 bg-purple-50 rounded-lg p-3">
								<div className="text-xs text-purple-600 font-medium">Other Fees Total</div>
								<div className="text-xl font-bold text-purple-700 mt-1">{fmtINR(breakdown.otherFeesTotal)}</div>
							</div>
						</div>

						{otherFeesHeadSummary.length > 0 && (
							<div className="mt-4">
								<div className="text-xs font-semibold text-gray-700 mb-2">Other Fees by Head:</div>
								<div className="overflow-auto">
									<table className="w-full text-sm border-collapse">
										<thead>
											<tr className="bg-gray-100">
												<th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-600">Fee Head</th>
												<th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-600">Total Amount</th>
											</tr>
										</thead>
										<tbody>
											{otherFeesHeadSummary.map((head, idx) => (
												<tr key={idx} className="hover:bg-gray-50">
													<td className="border border-gray-300 px-3 py-2">{head.feesHeadName}</td>
													<td className="border border-gray-300 px-3 py-2 text-right font-semibold text-purple-700">{fmtINR(head.totalAmount)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Error */}
				{error ? (
					<div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800">
						<strong>Report API error:</strong> <span className="whitespace-pre-wrap">{error}</span>
						<div className="text-xs mt-1">
							Path: <code>{reportPath}</code>
						</div>
					</div>
				) : null}

				{/* Charts removed (not needed) */}

				{/* Table */}
				<div className="bg-white rounded-2xl border border-gray-200 p-3 md:p-4">
					<div className="flex items-center justify-between gap-3 pb-2">
						<div className="text-sm font-semibold text-gray-800">Records</div>
						<div className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</div>
					</div>
					<DataTable
						value={data}
						loading={loading}
						lazy
						paginator
						first={(pagination.page - 1) * pagination.rows}
						rows={pagination.rows}
						totalRecords={pagination.total}
						rowsPerPageOptions={[3, 5, 10, 25, 50]}
						onPage={(e) => setPagination((prev) => ({ ...prev, page: (e.page ?? 0) + 1, rows: e.rows ?? prev.rows }))}
						expandedRows={expandedRows}
						onRowToggle={(e) => setExpandedRows(e.data)}
						rowExpansionTemplate={rowExpansionTemplate}
						responsiveLayout="scroll"
						emptyMessage="No report records found"
						className="mt-2"
					>
						<Column expander style={{ width: '3rem' }} />
						<Column
							header="Student"
							body={(r: RecordItem) => (
								<div className="flex items-center gap-2">
									{r.student?.photo ? (
										<img src={r.student.photo} alt={r.student?.name} className="h-10 w-10 object-cover rounded" />
									) : (
										<div className="h-10 w-10 bg-gray-200 rounded" />
									)}
									<div className="flex flex-col">
										<span className="font-medium">{r.student?.name}</span>
										<span className="text-xs text-gray-500">{r.student?.email}</span>
									</div>
								</div>
							)}
						/>
						<Column
							header="Course"
							body={(r: RecordItem) => (
								<div className="flex items-center gap-2">
									{r.course?.image ? (
										<img src={r.course.image} alt={r.course?.name} className="h-10 w-10 object-cover rounded" />
									) : (
										<div className="h-10 w-10 bg-gray-200 rounded" />
									)}
									<div className="flex flex-col">
										<span className="font-medium">{r.course?.name}</span>
										<span className="text-xs text-gray-500">{r.paymentType}</span>
									</div>
								</div>
							)}
						/>
						<Column header="Type" body={(r: RecordItem) => <Tag value={r.paymentType} severity={typeSeverity(r.paymentType)} />} style={{ width: '140px' }} />
						<Column header="Total" body={(r: RecordItem) => <span className="font-medium">{fmtINR(r.totalAmount)}</span>} />
						<Column header="Paid" body={(r: RecordItem) => <span className="text-green-700 font-medium">{fmtINR(r.paidAmount)}</span>} />
						<Column header="Due" body={(r: RecordItem) => <span className="text-red-600 font-medium">{fmtINR(r.dueAmount)}</span>} />
						<Column header="Status" body={(r: RecordItem) => <Tag value={r.status} severity={statusSeverity(r.status)} />} style={{ width: '120px' }} />
					</DataTable>
					{data.length === 0 && !loading && <div className="py-8"><EmptyState /></div>}
				</div>

				<ToastContainer position="top-right" />
			</div>
		</div>
	);
}
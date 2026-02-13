'use client'
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import axiosInstance from '@/service/axios.service';
import axios from 'axios';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Tag } from 'primereact/tag';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Chart = dynamic(
	() => import('primereact/chart').then((mod) => mod.Chart || (mod as any).default),
	{ ssr: false, loading: () => <div>Loading chart...</div> }
) as any;

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

type OtherFee = { headName?: string; amount?: number };

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
	const [data, setData] = useState<RecordItem[]>([]);
	const [allData, setAllData] = useState<RecordItem[]>([]);
	const [summary, setSummary] = useState<{ totalAmount: number; totalPaidAmount: number; totalDueAmount: number } | null>(null);

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

	const [chartsAvailable, setChartsAvailable] = useState<boolean | null>(null);
	const [mounted, setMounted] = useState(false);

	const [expandedRows, setExpandedRows] = useState<any>(null);

	const [error, setError] = useState<string>('');
	const [chartTheme, setChartTheme] = useState({
		primary: '#3B82F6',
		warn: '#F59E0B',
		purple: '#8B5CF6',
		text: '#374151',
		grid: '#E5E7EB'
	});

	useEffect(() => {
		const t = localStorage.getItem('institution-token');
		if (t) setToken(t);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
		return () => clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		setPagination((p) => ({ ...p, page: 1 }));
	}, [debouncedSearch, year, month, date, period]);

	useEffect(() => {
		if (!mounted) return;
		const cs = getComputedStyle(document.documentElement);
		const primary = (cs.getPropertyValue('--primary-color') || '').trim() || chartTheme.primary;
		const text = (cs.getPropertyValue('--text-color') || '').trim() || chartTheme.text;
		const grid = (cs.getPropertyValue('--surface-border') || '').trim() || chartTheme.grid;
		setChartTheme((prev) => ({ ...prev, primary, text, grid }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mounted]);

	useEffect(() => {
		let mountedFlag = true;
		(async () => {
			try {
				await import('chart.js/auto');
				if (mountedFlag) setChartsAvailable(true);
			} catch (err) {
				console.error('Charts not available:', err);
				if (mountedFlag) setChartsAvailable(false);
			}
		})();
		return () => {
			mountedFlag = false;
		};
	}, []);

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

				setData(json.data || []);
				setAllData(json.allData || []);
				setSummary(json.summary || null);

				setPagination((prev) => ({
					...prev,
					total: pag?.totalRecords ?? prev.total,
					page: pag?.currentPage ?? prev.page,
					rows: pag?.perPage ?? pag?.limit ?? prev.rows,
					totalPages: pag?.totalPages ?? prev.totalPages
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
	}, [token, pagination.page, pagination.rows, debouncedSearch, year, month, date, period]);

	const chartOptions = useMemo(
		() => ({
			responsive: true,
			plugins: {
				legend: { labels: { color: chartTheme.text } },
				tooltip: { enabled: true }
			},
			scales: {
				x: { ticks: { color: chartTheme.text }, grid: { color: chartTheme.grid } },
				y: { ticks: { color: chartTheme.text }, grid: { color: chartTheme.grid } }
			}
		}),
		[chartTheme]
	);

	const chartData = useMemo(() => {
		const paid = summary?.totalPaidAmount ?? 0;
		const due = summary?.totalDueAmount ?? 0;
		
		// Use allData for charts so they don't change with pagination
		const chartSource = allData.length > 0 ? allData : data;

		return {
			doughnut: {
				labels: ['Paid', 'Due'],
				datasets: [
					{
						data: [paid, due],
						backgroundColor: [chartTheme.primary, chartTheme.warn],
						hoverBackgroundColor: [chartTheme.primary, chartTheme.warn]
					}
				]
			},
			bar: {
				labels: chartSource.map((d) => d.course?.name ?? 'Unknown'),
				datasets: [
					{ label: 'Total', backgroundColor: chartTheme.purple, data: chartSource.map((d) => d.totalAmount) },
					{ label: 'Paid', backgroundColor: chartTheme.primary, data: chartSource.map((d) => d.paidAmount) },
					{ label: 'Due', backgroundColor: chartTheme.warn, data: chartSource.map((d) => d.dueAmount) }
				]
			}
		};
	}, [summary, allData, data, chartTheme]);

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
												<td className="py-2 pr-2">{f.headName ?? '-'}</td>
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
		a.download = `financial_report_all_data_${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="w-full flex justify-center items-center">
			<div className="w-full card bg-white p-4 rounded-lg shadow">
				{/* Header (same style idea as enrollments) */}
				<div className="flex flex-col gap-3 bg-primary p-3 rounded-lg">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-white">Financial Report</h2>
							<p className="text-sm text-black">Student fees ledger report (with installments & other fees)</p>
						</div>

						<IconField iconPosition="left">
							<InputIcon className="pi pi-search" />
							<InputText
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search student / course"
								className="p-inputtext-sm"
							/>
						</IconField>
					</div>

					{/* Filters */}
					<div className="flex flex-wrap gap-2 items-center">
						<select className="p-inputtext p-component p-inputtext-sm" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
							<option value="all">All</option>
							<option value="day">Day</option>
							<option value="week">Last 7 days</option>
							<option value="month">Month</option>
							<option value="year">Year</option>
						</select>

						<InputText className="p-inputtext-sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
						<InputText className="p-inputtext-sm" placeholder="Year (e.g. 2026)" value={year} onChange={(e) => setYear(e.target.value)} />
						<InputText className="p-inputtext-sm" placeholder="Month (1-12)" value={month} onChange={(e) => setMonth(e.target.value)} />

						<button
							className="p-button p-component p-button-sm"
							onClick={() => {
								setPagination((p) => ({ ...p, page: 1 }));
							}}
						>
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
								setPagination((p) => ({ ...p, page: 1 }));
							}}
						>
							Reset
						</button>

						<div className="ml-auto flex gap-2">
							<button className="p-button p-component p-button-help p-button-sm" onClick={exportCSV}>
								Download CSV
							</button>
							<button className="p-button p-component p-button-warning p-button-sm" onClick={() => window.print()}>
								Print / PDF
							</button>
						</div>
					</div>
				</div>

				{/* Summary cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Amount</div>
						<div className="text-xl font-semibold">{fmtINR(summary?.totalAmount)}</div>
					</div>
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Paid</div>
						<div className="text-xl font-semibold text-green-700">{fmtINR(summary?.totalPaidAmount)}</div>
					</div>
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Due</div>
						<div className="text-xl font-semibold text-red-700">{fmtINR(summary?.totalDueAmount)}</div>
					</div>
				</div>

				{/* Error */}
				{error ? (
					<div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800">
						<strong>Report API error:</strong> <span className="whitespace-pre-wrap">{error}</span>
						<div className="text-xs mt-1">
							Path: <code>{reportPath}</code>
						</div>
					</div>
				) : null}

				{/* Charts */}
				<div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
					{!mounted || chartsAvailable === null ? (
						<div className="border rounded-lg p-3">Loading charts...</div>
					) : chartsAvailable === false ? (
						<div className="border rounded-lg p-3 bg-red-50 text-red-800">
							<strong>Charts unavailable.</strong>
							<div className="mt-2 text-sm">
								Install Chart.js: <code>npm install chart.js</code> then restart.
							</div>
						</div>
					) : (
						<>
							<div className="border rounded-lg p-3">
								<div className="font-semibold mb-2">Paid vs Due</div>
								<Chart type="doughnut" data={chartData.doughnut} options={chartOptions} />
							</div>
							<div className="border rounded-lg p-3 lg:col-span-2">
						<div className="font-semibold mb-2">Amounts by Course (all records)</div>
								<Chart type="bar" data={chartData.bar} options={chartOptions} style={{ height: 260 }} />
							</div>
						</>
					)}
				</div>

				{/* DataTable */}
				<div className="mt-4">
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
						<Column header="Enrolled" body={(r: RecordItem) => formatDateUTC(r.enrollmentDate)} style={{ width: '130px' }} />
					</DataTable>

					{data.length === 0 && !loading && <EmptyState />}
					<div className="text-xs text-gray-500 mt-2">
						Page {pagination.page} of {pagination.totalPages}
					</div>
				</div>

				<ToastContainer position="top-right" />
			</div>
		</div>
	);
}
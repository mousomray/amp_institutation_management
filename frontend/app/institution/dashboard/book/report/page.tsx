"use client"
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import microInstance from '@/service/micro.service';
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

type Book = {
	book_id?: string;
	book_name?: string;
	book_image?: string;
	issue_date?: string;
	return_date?: string;
	actual_return_date?: string;
	delay_days?: number;
	book_fee?: number;
	late_fine_per_day?: number;
	total_amount?: number;
	status?: string;
};

type Student = { id?: string; name?: string; email?: string; phone?: string; photo?: string };

type RecordItem = {
	student: Student;
	totalBooks?: number;
	totalBookFee?: number;
	totalFine?: number;
	totalAmount?: number;
	books?: Book[];
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

const fmtINR = (n?: number) => (typeof n === 'number' ? n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '₹0');

function getInitials(name?: string) {
	if (!name) return '';
	return name
		.split(' ')
		.map((s) => s.charAt(0))
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

function normalizePaymentStatus(value: any): string {
	if (!value) return '';
	return String(value).trim().toLowerCase();
}

function derivePaymentStatus(row: any): string {
	const topLevel = normalizePaymentStatus(row?.paymentStatus ?? row?.payment_status);
	const books: any[] = Array.isArray(row?.books) ? row.books : [];
	const bookStatuses = books
		.map((b) => normalizePaymentStatus(b?.payment_status ?? b?.paymentStatus))
		.filter(Boolean);

	// Prefer book-level truth if present
	if (bookStatuses.length > 0) {
		if (bookStatuses.every((s) => s === 'paid')) return 'paid';
		if (bookStatuses.some((s) => s === 'pending')) return 'pending';
		if (bookStatuses.some((s) => s === 'unpaid')) return 'unpaid';
		// fallback for custom statuses
		return bookStatuses[0];
	}

	return topLevel;
}

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center h-full text-center">
		<div className="text-6xl mb-4">📚</div>
		<h2 className="text-xl font-semibold text-gray-700">No Report Data</h2>
		<p className="text-gray-500 mt-2 max-w-md">No library report records found.</p>
	</div>
);

export default function ReportPage() {
	const [data, setData] = useState<RecordItem[]>([]);
	const [allData, setAllData] = useState<RecordItem[]>([]);
	const [totalStudents, setTotalStudents] = useState<number>(0);
	const [pagination, setPagination] = useState({ page: 1, rows: 5, total: 0, totalPages: 1 });
	const [loading, setLoading] = useState<boolean>(false);

	const [searchInput, setSearchInput] = useState<string>('');
	const [debouncedSearch, setDebouncedSearch] = useState<string>('');

	const [chartsAvailable, setChartsAvailable] = useState<boolean | null>(null);
	const [mounted, setMounted] = useState(false);
	const [expandedRows, setExpandedRows] = useState<any>(null);
	const [error, setError] = useState<string>('');
	const [totalsFetched, setTotalsFetched] = useState(false);
	const [globalTotals, setGlobalTotals] = useState<{
		totalBooks: number;
		totalBookFee: number;
		totalFine: number;
		totalAmount: number;
		totalPaid: number;
		totalDue: number;
	} | null>(null);

	const [chartTheme, setChartTheme] = useState({ primary: '#3B82F6', warn: '#F59E0B', purple: '#8B5CF6', text: '#374151', grid: '#E5E7EB' });

	// Polling control (milliseconds)
	const POLL_INTERVAL = 20000;
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 500);
		return () => clearTimeout(t);
	}, [searchInput]);

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
		let active = true;
		(async () => {
			try {
				setLoading(true);
				setError('');

				const params: Record<string, any> = { page: pagination.page, limit: pagination.rows };
				if (debouncedSearch) params.search = debouncedSearch;

				const token = localStorage.getItem('institution-token');

				// Using full URL as requested
				const res = await axios.get(`${process.env.NEXT_PUBLIC_LIBRARY_API}api/student-library-report`, {
					params,
					headers: token ? { Authorization: `Bearer ${token}` } : undefined
				});

				if (!active) return;
				const json = res?.data ?? {};

				setData(json.data || []);
				setAllData(json.allData || []);
				setTotalStudents(Number(json.totalStudents ?? (json.total ?? 0)));

				// Compute global totals from allData
				if (json.allData && json.allData.length > 0 && !totalsFetched) {
					const allDataArray: RecordItem[] = json.allData || [];
					const totals = allDataArray.reduce(
						(acc, item) => {
							acc.totalBooks += Number(item.totalBooks ?? 0);
							acc.totalBookFee += Number(item.totalBookFee ?? 0);
							acc.totalFine += Number(item.totalFine ?? 0);
							acc.totalAmount += Number(item.totalAmount ?? 0);
							acc.totalPaid += Number((item as any).totalPaid ?? 0);
							acc.totalDue += Number((item as any).totalDue ?? 0);
							return acc;
						},
						{ totalBooks: 0, totalBookFee: 0, totalFine: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 }
					);
					setGlobalTotals(totals);
					setTotalsFetched(true);
				}

				setPagination((prev) => ({
					...prev,
					total: Number(json.totalStudents ?? prev.total),
					page: Number(json.page ?? prev.page),
					rows: Number(json.limit ?? prev.rows),
					totalPages: Number(json.pages ?? prev.totalPages)
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
	}, [pagination.page, pagination.rows, debouncedSearch, mounted]);

	// refreshData: reusable fetch for manual refresh and polling
	const refreshData = async () => {
		try {
			setLoading(true);
			setError('');

			const params: Record<string, any> = { page: pagination.page, limit: pagination.rows };
			if (debouncedSearch) params.search = debouncedSearch;

			const token = localStorage.getItem('institution-token');
			const res = await axios.get(`${process.env.NEXT_PUBLIC_LIBRARY_API}api/student-library-report`, {
				params,
				headers: token ? { Authorization: `Bearer ${token}` } : undefined
			});

			const json = res?.data ?? {};
			setData(json.data || []);
			setAllData(json.allData || []);
			setTotalStudents(Number(json.totalStudents ?? (json.total ?? 0)));

			setPagination((prev) => ({
				...prev,
				total: Number(json.totalStudents ?? prev.total),
				page: Number(json.page ?? prev.page),
				rows: Number(json.limit ?? prev.rows),
				totalPages: Number(json.pages ?? prev.totalPages)
			}));

			// Compute global totals from allData if not already done
			if (json.allData && json.allData.length > 0 && !totalsFetched) {
				const allDataArray: RecordItem[] = json.allData || [];
				const totals = allDataArray.reduce(
					(acc, item) => {
						acc.totalBooks += Number(item.totalBooks ?? 0);
						acc.totalBookFee += Number(item.totalBookFee ?? 0);
						acc.totalFine += Number(item.totalFine ?? 0);
						acc.totalAmount += Number(item.totalAmount ?? 0);
						acc.totalPaid += Number((item as any).totalPaid ?? 0);
						acc.totalDue += Number((item as any).totalDue ?? 0);
						return acc;
					},
					{ totalBooks: 0, totalBookFee: 0, totalFine: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 }
				);
				setGlobalTotals(totals);
				setTotalsFetched(true);
			}
		} catch (err) {
			console.error('Refresh failed', err);
			// swallow - main effect handles toasts
		} finally {
			setLoading(false);
		}
	};

	// Polling effect to refresh data periodically so payment status updates appear
	useEffect(() => {
		let mountedFlag = true;
		if (!mounted) return;
		const id = setInterval(() => {
			if (!mountedFlag) return;
			refreshData();
		}, POLL_INTERVAL);
		return () => {
			mountedFlag = false;
			clearInterval(id);
		};
	// include debouncedSearch and pagination so polling fetches correct page
	}, [mounted, debouncedSearch, pagination.page, pagination.rows]);

	const chartOptions = useMemo(
		() => ({
			responsive: true,
			plugins: { legend: { labels: { color: chartTheme.text } }, tooltip: { enabled: true } },
			scales: { x: { ticks: { color: chartTheme.text }, grid: { color: chartTheme.grid } }, y: { ticks: { color: chartTheme.text }, grid: { color: chartTheme.grid } } }
		}),
		[chartTheme]
	);

	const chartData = useMemo(() => {
		// Use allData for charts so they don't change with pagination
		const chartSource = allData.length > 0 ? allData : data;
		return {
			bar: {
				labels: chartSource.map((d) => d.student?.name ?? 'Unknown'),
				datasets: [
					{ label: 'Total Amount', backgroundColor: chartTheme.purple, data: chartSource.map((d) => d.totalAmount ?? 0) },
					{ label: 'Total Fine', backgroundColor: chartTheme.warn, data: chartSource.map((d) => d.totalFine ?? 0) }
				]
			}
		};
	}, [allData, data, chartTheme]);

	const rowExpansionTemplate = (row: RecordItem) => {
		const books = row.books || [];
		return (
			<div className="p-3 bg-gray-50 rounded-md border border-gray-200">
				<div className="font-semibold mb-2">Books ({books.length})</div>
				{books.length === 0 ? (
					<div className="text-sm text-gray-500">No books.</div>
				) : (
					<div className="overflow-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b">
										<th className="py-2 pr-2">Name</th>
										<th className="py-2 pr-2">Issued</th>
										<th className="py-2 pr-2">Return</th>
										<th className="py-2 pr-2">Actual Return</th>
										<th className="py-2 pr-2">Delay</th>
										<th className="py-2 pr-2">Total</th>
										<th className="py-2 pr-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{books.map((b) => (
									<tr key={b.book_id} className="border-b last:border-b-0">
										<td className="py-2 pr-2 flex items-center gap-2">
											{b.book_image ? <img src={b.book_image} alt={b.book_name} className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-gray-200 rounded" />}
											<div>{b.book_name}</div>
										</td>
										<td className="py-2 pr-2">{formatDateUTC(b.issue_date)}</td>
										<td className="py-2 pr-2">{formatDateUTC(b.return_date)}</td>
										<td className="py-2 pr-2">{formatDateUTC((b as any).actual_return_date ?? (b as any).actualReturnDate)}</td>
										<td className="py-2 pr-2">{b.delay_days ?? 0}</td>
										<td className="py-2 pr-2">{fmtINR((b as any).total_amount ?? (b as any).totalAmount)}</td>
										<td className="py-2 pr-2"><Tag value={(b as any).status} severity={(b as any).status === 'returned' ? 'success' : 'info'} /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		);
	};

	const exportCSV = () => {
		// Use allData for CSV export to get all records, not just current page
		const exportData = allData.length > 0 ? allData : data;
		const rows = [
			['Student', 'Email', 'Phone', 'TotalBooks', 'TotalBookFee', 'TotalFine', 'TotalAmount', 'TotalPaid', 'TotalDue', 'PaymentStatus'],
			...exportData.map((r) => [
				r.student?.name ?? '',
				r.student?.email ?? '',
				r.student?.phone ?? '',
				String(r.totalBooks ?? 0),
				String(r.totalBookFee ?? 0),
				String(r.totalFine ?? 0),
				String(r.totalAmount ?? 0),
				String((r as any).totalPaid ?? 0),
				String((r as any).totalDue ?? 0),
				derivePaymentStatus(r)
			])
		];
		const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `library_report_all_data_${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="w-full flex justify-center items-center">
			<div className="w-full card bg-white p-4 rounded-lg shadow">
				<div className="flex flex-col gap-3 bg-primary p-3 rounded-lg">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-white">Library Report</h2>
							<p className="text-sm text-black">Student library usage and fines</p>
						</div>

						<IconField iconPosition="left">
							<InputIcon className="pi pi-search" />
							<InputText value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search student" className="p-inputtext-sm" />
						</IconField>
					</div>

					<div className="flex items-center gap-2">
						<button className="p-button p-component p-button-help p-button-sm" onClick={exportCSV}>Download CSV</button>
						<button className="p-button p-component p-button-secondary p-button-sm" onClick={() => refreshData()}>Refresh</button>
						<button className="p-button p-component p-button-warning p-button-sm" onClick={() => window.print()}>Print / PDF</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Students</div>
						<div className="text-xl font-semibold">{totalStudents}</div>
					</div>
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Books</div>
						<div className="text-xl font-semibold">{globalTotals ? globalTotals.totalBooks : data.reduce((s, d) => s + (d.totalBooks ?? 0), 0)}</div>
						<div className="text-xs text-gray-500 mt-1">{globalTotals ? 'Across all records' : 'Current page'}</div>
					</div>
					<div className="border rounded-lg p-3">
						<div className="text-sm text-gray-600">Total Amount</div>
						<div className="text-xl font-semibold">{globalTotals ? fmtINR(globalTotals.totalAmount) : fmtINR(data.reduce((s, d) => s + (d.totalAmount ?? 0), 0))}</div>
						<div className="text-xs text-gray-500 mt-1">{globalTotals ? 'Across all records' : 'Current page'}</div>
					</div>
				</div>

				{error ? (
					<div className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-800">
						<strong>Report API error:</strong> <span className="whitespace-pre-wrap">{error}</span>
						<div className="text-xs mt-1">Path: <code>http://localhost:3004/api/student-library-report</code></div>
					</div>
				) : null}

				<div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
					{!mounted || chartsAvailable === null ? (
						<div className="border rounded-lg p-3">Loading charts...</div>
					) : chartsAvailable === false ? (
						<div className="border rounded-lg p-3 bg-red-50 text-red-800">
							<strong>Charts unavailable.</strong>
							<div className="mt-2 text-sm">Install Chart.js: <code>npm install chart.js</code> then restart.</div>
						</div>
					) : (
						<>
							<div className="border rounded-lg p-3">
								<div className="font-semibold mb-2">Amounts by Student (all records)</div>
								<Chart type="bar" data={chartData.bar} options={chartOptions} style={{ height: 260 }} />
							</div>
								<div className="border rounded-lg p-3 lg:col-span-2">
									<div className="flex items-center justify-between">
										<div>
											<div className="font-semibold mb-1">Recent Students</div>
											<div className="text-sm text-gray-500">Showing page {pagination.page} of {pagination.totalPages}</div>
										</div>
									</div>

									<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
										{data.length === 0 ? (
											<div className="text-sm text-gray-500">No students on this page.</div>
										) : (
											data.map((d, idx) => (
												<div key={d.student?.id ?? idx} className="flex items-center gap-3 p-2 border rounded-md bg-white">
													{d.student?.photo ? (
														<img src={d.student.photo} alt={d.student?.name} className="h-12 w-12 object-cover rounded-md" />
													) : (
														<div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">{getInitials(d.student?.name)}</div>
													)}

													<div className="flex-1">
														<div className="font-medium">{d.student?.name}</div>
														<div className="text-xs text-gray-500">{d.student?.email}</div>
														<div className="text-xs text-gray-500 mt-1">{d.totalBooks ?? 0} book(s) • {fmtINR(d.totalAmount)}</div>
													</div>

													<div className="text-sm">
														<Tag value={d.totalBooks && d.totalBooks > 0 ? 'Has books' : 'No books'} severity={d.totalBooks && d.totalBooks > 0 ? 'info' : 'warning'} />
													</div>
												</div>
											))
										)}
									</div>
								</div>
						</>
					)}
				</div>

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
								<div className="flex items-center gap-3">
									{r.student?.photo ? (
										<img src={r.student.photo} alt={r.student?.name} className="h-10 w-10 object-cover rounded" />
									) : (
										<div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">{getInitials(r.student?.name)}</div>
									)}
									<div className="flex flex-col">
										<span className="font-medium">{r.student?.name}</span>
										<span className="text-xs text-gray-500">{r.student?.email} • {r.student?.phone}</span>
									</div>
								</div>
							)}
						/>
						<Column header="Books" body={(r: RecordItem) => <span className="font-medium">{r.totalBooks}</span>} />
						<Column header="Book Fee" body={(r: RecordItem) => <span>{fmtINR(r.totalBookFee)}</span>} />
						<Column header="Fine" body={(r: RecordItem) => <span className="text-red-600">{fmtINR(r.totalFine)}</span>} />
						<Column header="Paid" body={(r: RecordItem) => <span className="text-green-700">{fmtINR((r as any).totalPaid ?? 0)}</span>} />
						<Column header="Due" body={(r: RecordItem) => <span className="text-red-600">{fmtINR((r as any).totalDue ?? 0)}</span>} />
						<Column
							header="Payment Status"
							body={(r: RecordItem) => {
								const ps = derivePaymentStatus(r);
								const sev = ps === 'paid' ? 'success' : ps === 'pending' ? 'warning' : ps === 'unpaid' ? 'danger' : 'info';
								return <Tag value={ps ? String(ps).toUpperCase() : '-'} severity={sev} />;
							}}
						/>
						<Column header="Total" body={(r: RecordItem) => <span className="font-medium">{fmtINR(r.totalAmount)}</span>} />
					</DataTable>

					{data.length === 0 && !loading && <EmptyState />}
					<div className="text-xs text-gray-500 mt-2">Page {pagination.page} of {pagination.totalPages}</div>
				</div>

				<ToastContainer position="top-right" />
			</div>
		</div>
	);
}


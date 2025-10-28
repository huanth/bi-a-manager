import { useState, useEffect } from 'react';
import { RevenueTransaction } from '../types/revenue';
import { Order } from '../types/order';
import { getData, DB_KEYS } from '../services/database';
import LoadingSpinner from './LoadingSpinner';

// Timezone mặc định: Asia/Ho Chi Minh (UTC+7)
const TIMEZONE = 'Asia/Saigon';

// Helper function để lấy thông tin ngày, tháng, năm theo timezone Vietnam
const getDateComponents = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    // Sử dụng Intl.DateTimeFormat để lấy giá trị theo timezone Vietnam
    const parts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: TIMEZONE,
    }).formatToParts(date);

    return {
        year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1, // month is 0-indexed
        day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    };
};

const RevenueStats = () => {
    const [revenueData, setRevenueData] = useState<RevenueTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState<string>('');

    useEffect(() => {
        // Khởi tạo filterDate theo timezone Vietnam
        const now = new Date();
        const todayComponents = getDateComponents(now);
        const initialDate = `${todayComponents.year}-${String(todayComponents.month + 1).padStart(2, '0')}-${String(todayComponents.day).padStart(2, '0')}`;
        setFilterDate(initialDate);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load revenue transactions
                const transactions = await getData<RevenueTransaction[]>(DB_KEYS.REVENUE, []);
                setRevenueData(transactions);

                // Load orders để tính doanh thu từ đơn hàng
                const ordersData = await getData<Order[]>(DB_KEYS.ORDERS, []);
                setOrders(ordersData);
            } catch (error) {
                // Error loading revenue data
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Tính tổng doanh thu chỉ từ revenue transactions (đã bao gồm thanh toán bàn + đơn hàng)
    const totalRevenue = revenueData.reduce((sum, t) => sum + t.amount, 0);

    // Tính doanh thu theo ngày (từ 00:00 đến 23:59) theo timezone Vietnam
    // Chỉ tính từ revenue transactions (đã thanh toán bàn và đơn hàng)
    const getRevenueByDate = (date: string) => {
        // Parse target date theo timezone Vietnam
        const targetDateComponents = getDateComponents(new Date(date + 'T00:00:00Z'));
        const { year: targetYear, month: targetMonth, day: targetDay } = targetDateComponents;

        // Chỉ tính doanh thu từ revenue transactions
        return revenueData
            .filter(t => {
                const { year, month, day } = getDateComponents(t.createdAt);
                return year === targetYear && month === targetMonth && day === targetDay;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    };

    // Tính doanh thu 7 ngày gần nhất theo timezone Vietnam
    const getLast7DaysRevenue = () => {
        const days = [];

        // Lấy ngày hôm nay theo timezone Vietnam
        const now = new Date();
        const todayComponents = getDateComponents(now);

        for (let i = 6; i >= 0; i--) {
            // Tính ngày cần lấy (i ngày trước)
            const targetDate = new Date(todayComponents.year, todayComponents.month, todayComponents.day);
            targetDate.setDate(targetDate.getDate() - i);

            // Format date string
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const revenue = getRevenueByDate(dateStr);

            // Format date label
            const dateLabel = targetDate.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
            });

            days.push({
                date: dateStr,
                revenue,
                dateLabel,
            });
        }
        return days;
    };

    // Tính doanh thu tháng hiện tại theo timezone Vietnam
    const getCurrentMonthRevenue = () => {
        const now = new Date();
        const components = getDateComponents(now);
        const currentMonth = components.month;
        const currentYear = components.year;

        // Chỉ tính doanh thu từ revenue transactions
        return revenueData
            .filter(t => {
                const { year, month } = getDateComponents(t.createdAt);
                return month === currentMonth && year === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    };

    // Tính doanh thu hôm nay theo timezone Vietnam
    const now = new Date();
    const todayComponents = getDateComponents(now);
    const todayDateStr = `${todayComponents.year}-${String(todayComponents.month + 1).padStart(2, '0')}-${String(todayComponents.day).padStart(2, '0')}`;
    const todayRevenue = getRevenueByDate(todayDateStr);
    const last7Days = getLast7DaysRevenue();
    const monthRevenue = getCurrentMonthRevenue();

    // Lấy danh sách giao dịch của ngày được chọn (từ 00:00 đến 23:59) theo timezone Vietnam
    // Chỉ lấy từ revenue transactions (đã thanh toán bàn và đơn hàng)
    const getTransactionsForSelectedDate = () => {
        // Nếu chưa có filterDate thì trả về mảng rỗng
        if (!filterDate) return [];

        // Parse target date theo timezone Vietnam
        const targetDateComponents = getDateComponents(new Date(filterDate + 'T00:00:00Z'));
        const { year: targetYear, month: targetMonth, day: targetDay } = targetDateComponents;

        // Chỉ lấy từ revenue transactions
        return revenueData
            .filter(t => {
                const { year, month, day } = getDateComponents(t.createdAt);
                return year === targetYear && month === targetMonth && day === targetDay;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const selectedDateTransactions = getTransactionsForSelectedDate();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: TIMEZONE,
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <LoadingSpinner text="Đang tải thống kê doanh thu từ API..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Tổng doanh thu</p>
                    <p className="text-3xl font-bold">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Hôm nay</p>
                    <p className="text-3xl font-bold">{todayRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Tháng này</p>
                    <p className="text-3xl font-bold">{monthRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Đơn hàng</p>
                    <p className="text-3xl font-bold">{orders.filter(o => o.status === 'completed').length}</p>
                </div>
            </div>

            {/* Chart 7 ngày gần nhất */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh thu 7 ngày gần nhất</h3>
                <div className="space-y-3">
                    {last7Days.map((day, index) => {
                        const maxRevenue = Math.max(...last7Days.map(d => d.revenue), 1);
                        const percentage = (day.revenue / maxRevenue) * 100;
                        return (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-24 text-sm text-gray-600">{day.dateLabel}</div>
                                <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${day.revenue > 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : ''
                                            }`}
                                        style={{ width: `${percentage}%` }}
                                    >
                                        {day.revenue > 0 && (
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-xs font-semibold">
                                                {day.revenue.toLocaleString('vi-VN')}đ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chi tiết theo ngày */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Chi tiết giao dịch</h3>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {selectedDateTransactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Không có giao dịch nào trong ngày này
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bàn</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người xử lý</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {selectedDateTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatDate(transaction.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${transaction.type === 'table'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {transaction.type === 'table' ? '💰 Bàn bi a' : '🍽️ Đơn hàng'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {transaction.tableName || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-indigo-600">
                                            {transaction.amount.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {transaction.createdBy || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-800">
                                        Tổng trong ngày:
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-indigo-600">
                                        {selectedDateTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RevenueStats;


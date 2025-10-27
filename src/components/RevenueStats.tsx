import { useState, useEffect } from 'react';
import { RevenueTransaction } from '../types/revenue';
import { Order } from '../types/order';
import { getData, DB_KEYS } from '../services/database';
import LoadingSpinner from './LoadingSpinner';

const RevenueStats = () => {
    const [revenueData, setRevenueData] = useState<RevenueTransaction[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

    // Tính tổng doanh thu từ tất cả nguồn
    const totalRevenue = revenueData.reduce((sum, t) => sum + t.amount, 0) +
        orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);

    // Tính doanh thu theo ngày
    const getRevenueByDate = (date: string) => {
        const dateStr = date.split('T')[0];

        // Doanh thu từ transactions
        const transactionsRevenue = revenueData
            .filter(t => t.createdAt.startsWith(dateStr))
            .reduce((sum, t) => sum + t.amount, 0);

        // Doanh thu từ orders completed trong ngày
        const ordersRevenue = orders
            .filter(o => o.status === 'completed' && o.completedAt && o.completedAt.startsWith(dateStr))
            .reduce((sum, o) => sum + o.totalAmount, 0);

        return transactionsRevenue + ordersRevenue;
    };

    // Tính doanh thu 7 ngày gần nhất
    const getLast7DaysRevenue = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const revenue = getRevenueByDate(dateStr);
            days.push({
                date: dateStr,
                revenue,
                dateLabel: date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            });
        }
        return days;
    };

    // Tính doanh thu tháng hiện tại
    const getCurrentMonthRevenue = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthTransactions = revenueData.filter(t => {
            const date = new Date(t.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, t) => sum + t.amount, 0);

        const monthOrders = orders.filter(o => {
            if (o.status !== 'completed' || !o.completedAt) return false;
            const date = new Date(o.completedAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, o) => sum + o.totalAmount, 0);

        return monthTransactions + monthOrders;
    };

    // Tính doanh thu hôm nay
    const todayRevenue = getRevenueByDate(new Date().toISOString().split('T')[0]);
    const last7Days = getLast7DaysRevenue();
    const monthRevenue = getCurrentMonthRevenue();

    // Lấy danh sách giao dịch của ngày được chọn
    const selectedDateTransactions = [
        ...revenueData.filter(t => t.createdAt.startsWith(filterDate)),
        ...orders
            .filter(o => o.status === 'completed' && o.completedAt && o.completedAt.startsWith(filterDate))
            .map(o => ({
                id: o.id,
                type: 'order' as const,
                orderId: o.id,
                tableId: o.tableId,
                tableName: o.tableName,
                amount: o.totalAmount,
                createdAt: o.completedAt!,
                createdBy: o.createdBy,
                note: `Đơn hàng #${o.id}`,
            } as RevenueTransaction)),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
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


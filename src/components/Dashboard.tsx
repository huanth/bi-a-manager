import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BilliardTables from './BilliardTables';
import TableManagement from './TableManagement';
import EmployeeManagement from './EmployeeManagement';
import OrderManagement from './OrderManagement';
import MenuManagement from './MenuManagement';
import RevenueStats from './RevenueStats';
import { getData, DB_KEYS } from '../services/database';
import { RevenueTransaction } from '../types/revenue';
import { Order } from '../types/order';

const Dashboard = () => {
    const { user, logout, hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState<'service' | 'tables' | 'orders' | 'menu' | 'revenue' | 'employees'>('service');
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

    // Load tổng doanh thu và đếm đơn hàng chưa hoàn thành
    const loadData = async () => {
        try {
            const transactions = await getData<RevenueTransaction[]>(DB_KEYS.REVENUE, []);
            const orders = await getData<Order[]>(DB_KEYS.ORDERS, []);

            const transactionsTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
            const ordersTotal = orders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.totalAmount, 0);

            setTotalRevenue(transactionsTotal + ordersTotal);

            // Đếm số đơn hàng chưa hoàn thành (pending, preparing, ready)
            const pendingCount = orders.filter(o =>
                o.status !== 'completed' && o.status !== 'cancelled'
            ).length;
            setPendingOrdersCount(pendingCount);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    useEffect(() => {
        // Load dữ liệu lần đầu
        loadData();

        // Reload mỗi 30 giây để cập nhật doanh thu và số đơn hàng
        const interval = setInterval(loadData, 30000);

        // Lắng nghe custom event để refresh khi có action API
        const handleDataChange = () => {
            loadData();
        };

        window.addEventListener('ordersUpdated', handleDataChange);
        window.addEventListener('revenueUpdated', handleDataChange);
        window.addEventListener('tablePaymentCompleted', handleDataChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('ordersUpdated', handleDataChange);
            window.removeEventListener('revenueUpdated', handleDataChange);
            window.removeEventListener('tablePaymentCompleted', handleDataChange);
        };
    }, []);

    const handleLogout = () => {
        logout();
        // AuthContext sẽ tự động update và App sẽ re-render với Login
    };

    const isOwner = hasRole('owner');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-800">BI A Manager</h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-700">
                                    Xin chào, <strong>{user?.username}</strong>
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOwner
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {isOwner ? 'Chủ cửa hàng' : 'Nhân viên'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className={`grid grid-cols-1 ${isOwner ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-8`}>


                    {isOwner && (
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm">Tổng doanh thu</p>
                                    <p className="text-3xl font-bold mt-2">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs cho Owner */}
                {isOwner && (
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('service')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'service'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Phục vụ Bàn Bi A
                                </button>
                                <button
                                    onClick={() => setActiveTab('tables')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'tables'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Bàn Bi A
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition relative ${activeTab === 'orders'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Đơn hàng
                                    {pendingOrdersCount > 0 && (
                                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                            {pendingOrdersCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'menu'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Menu
                                </button>
                                <button
                                    onClick={() => setActiveTab('revenue')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'revenue'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    📊 Doanh thu
                                </button>
                                <button
                                    onClick={() => setActiveTab('employees')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'employees'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Nhân viên
                                </button>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Tabs cho Employee */}
                {!isOwner && (
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('service')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'service'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Phục vụ Bàn Bi A
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`px-6 py-3 font-medium text-sm border-b-2 transition relative ${activeTab === 'orders'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Đơn hàng
                                    {pendingOrdersCount > 0 && (
                                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                            {pendingOrdersCount}
                                        </span>
                                    )}
                                </button>
                            </nav>
                        </div>
                    </div>
                )}

                {/* Content based on active tab */}
                {isOwner ? (
                    activeTab === 'service' ? (
                        <BilliardTables serviceMode={true} />
                    ) : activeTab === 'tables' ? (
                        <TableManagement />
                    ) : activeTab === 'orders' ? (
                        <OrderManagement />
                    ) : activeTab === 'menu' ? (
                        <MenuManagement />
                    ) : activeTab === 'revenue' ? (
                        <RevenueStats />
                    ) : (
                        <EmployeeManagement />
                    )
                ) : (
                    activeTab === 'service' ? (
                        <BilliardTables serviceMode={true} />
                    ) : (
                        <OrderManagement />
                    )
                )}
            </main>
        </div>
    );
};

export default Dashboard;


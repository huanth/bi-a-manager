import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BilliardTables from './BilliardTables';
import TableManagement from './TableManagement';
import EmployeeManagement from './EmployeeManagement';
import OrderManagement from './OrderManagement';
import MenuManagement from './MenuManagement';
import RevenueStats from './RevenueStats';
import Settings from './Settings';
import { getData, DB_KEYS } from '../services/database';
import { Order } from '../types/order';

const Dashboard = () => {
    const { user, logout, hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState<'service' | 'tables' | 'orders' | 'menu' | 'revenue' | 'employees' | 'settings'>('service');
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

    // Đếm đơn hàng chưa hoàn thành
    const loadData = async () => {
        try {
            const orders = await getData<Order[]>(DB_KEYS.ORDERS, []);
            // Đếm số đơn hàng chưa hoàn thành (pending)
            const pendingCount = orders.filter(o => o.status === 'pending').length;
            setPendingOrdersCount(pendingCount);
        } catch (error) {
            // Error loading data
        }
    };

    useEffect(() => {
        // Load dữ liệu lần đầu
        loadData();

        // Reload mỗi 30 giây để cập nhật số đơn hàng
        const interval = setInterval(loadData, 30000);

        // Lắng nghe custom event để refresh khi có action API
        const handleDataChange = () => {
            loadData();
        };

        window.addEventListener('ordersUpdated', handleDataChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('ordersUpdated', handleDataChange);
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <img src="/logo.svg" alt="BI A Manager Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">BI A Manager</h1>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                <span className="text-sm sm:text-base text-gray-700">
                                    Xin chào, <strong>{user?.username}</strong>
                                </span>
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${isOwner
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {isOwner ? 'Chủ cửa hàng' : 'Nhân viên'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm sm:text-base"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs cho Owner */}
                {isOwner && (
                    <div className="mb-6">
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <nav className="flex -mb-px min-w-max sm:min-w-0">
                                <button
                                    onClick={() => setActiveTab('service')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'service'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Phục vụ Bàn
                                </button>
                                <button
                                    onClick={() => setActiveTab('tables')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'tables'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Quản lý Bàn
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition relative whitespace-nowrap ${activeTab === 'orders'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Đơn hàng
                                    {pendingOrdersCount > 0 && (
                                        <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                            {pendingOrdersCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'menu'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Menu
                                </button>
                                <button
                                    onClick={() => setActiveTab('revenue')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'revenue'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    📊 Doanh thu
                                </button>
                                <button
                                    onClick={() => setActiveTab('employees')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'employees'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Nhân viên
                                </button>
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`px-3 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'settings'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    ⚙️ Cài đặt
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
                                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition ${activeTab === 'service'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Phục vụ Bàn
                                </button>
                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`flex-1 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition relative ${activeTab === 'orders'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Đơn hàng
                                    {pendingOrdersCount > 0 && (
                                        <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
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
                    ) : activeTab === 'settings' ? (
                        <Settings />
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


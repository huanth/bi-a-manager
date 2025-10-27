import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BilliardTables from './BilliardTables';
import TableManagement from './TableManagement';
import EmployeeManagement from './EmployeeManagement';
import OrderManagement from './OrderManagement';
import MenuManagement from './MenuManagement';
import RevenueStats from './RevenueStats';
import Settings from './Settings';
import Modal from './Modal';
import { getData, DB_KEYS } from '../services/database';
import { Order } from '../types/order';

const Dashboard = () => {
    const { user, logout, hasRole } = useAuth();
    const [activeTab, setActiveTab] = useState<'service' | 'tables' | 'orders' | 'menu' | 'revenue' | 'employees' | 'settings'>('service');
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);

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
                        <button
                            onClick={() => setActiveTab('service')}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <img src="/logo.svg" alt="BI A Manager Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">BI A Manager</h1>
                        </button>
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

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <span>© {new Date().getFullYear()} BI A Manager. All rights reserved.</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowTermsModal(true)}
                                className="hover:text-indigo-600 transition-colors underline"
                            >
                                Điều khoản
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => setShowAboutModal(true)}
                                className="hover:text-indigo-600 transition-colors underline"
                            >
                                Về chúng tôi
                            </button>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Terms Modal */}
            <Modal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                title="Điều khoản sử dụng"
                message=""
                type="info"
            >
                <div className="text-left space-y-4 max-h-96 overflow-y-auto px-2">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">1. Chấp nhận điều khoản</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Bằng việc sử dụng hệ thống BI A Manager, bạn đồng ý tuân thủ các điều khoản và điều kiện sử dụng được nêu trong tài liệu này.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">2. Quyền sử dụng</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Bạn được cấp quyền sử dụng hệ thống cho mục đích quản lý quán bi-a của mình. Không được phép sao chép, phân phối hoặc bán hệ thống này cho bên thứ ba.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">3. Bảo mật dữ liệu</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Chúng tôi cam kết bảo vệ thông tin của bạn. Tất cả dữ liệu được mã hóa và lưu trữ an toàn trên server.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">4. Trách nhiệm</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Người dùng chịu trách nhiệm về tính chính xác của dữ liệu nhập vào hệ thống và việc sử dụng hệ thống đúng mục đích.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">5. Thay đổi điều khoản</h3>
                        <p className="text-sm text-gray-600">
                            Chúng tôi có quyền thay đổi các điều khoản này bất cứ lúc nào. Việc tiếp tục sử dụng hệ thống sau khi có thay đổi được xem như bạn đã chấp nhận các điều khoản mới.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* About Modal */}
            <Modal
                isOpen={showAboutModal}
                onClose={() => setShowAboutModal(false)}
                title="Về chúng tôi"
                message=""
                type="info"
            >
                <div className="text-left space-y-4 max-h-96 overflow-y-auto px-2">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">BI A Manager</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Hệ thống quản lý quán bi-a hiện đại được phát triển để hỗ trợ quản lý bàn bi-a, đơn hàng, menu, nhân viên và theo dõi doanh thu một cách hiệu quả.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Tính năng chính</h3>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside mb-4">
                            <li>Quản lý bàn bi-a với nhiều trạng thái</li>
                            <li>Tính giá tự động theo khung giờ</li>
                            <li>Quản lý đơn hàng và menu</li>
                            <li>Thống kê doanh thu chi tiết</li>
                            <li>Thanh toán qua QR Code</li>
                            <li>Phân quyền Owner/Employee</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Công nghệ</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Được xây dựng bằng React + TypeScript, sử dụng Tailwind CSS cho giao diện đẹp mắt và responsive trên mọi thiết bị.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Phiên bản</h3>
                        <p className="text-sm text-gray-600">
                            Version 1.0.0 - 2025
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;


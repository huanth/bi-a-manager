import { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types/order';
import { getData, saveData, DB_KEYS } from '../services/database';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

const OrderManagement = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
    const [loading, setLoading] = useState(true);
    // Customer Order feature removed: no customer-driven popup
    const modal = useModal();

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await getData<Order[]>(DB_KEYS.ORDERS, []);
                // Sắp xếp theo thời gian tạo mới nhất
                const sortedData = data.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setOrders(sortedData);
            } catch (error) {
                // Error loading orders
            } finally {
                setLoading(false);
            }
        };
        loadOrders();

        // Customer Order event listeners removed
        return () => {};
    }, [modal]);

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(order => order.status === filterStatus);

    const getStatusConfig = (status: OrderStatus) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Chờ xử lý',
                    bgColor: 'bg-yellow-100',
                    textColor: 'text-yellow-800',
                    borderColor: 'border-yellow-300',
                };
            case 'completed':
                return {
                    label: 'Hoàn thành',
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-800',
                    borderColor: 'border-gray-300',
                };
        }
    };

    const handleUpdateStatus = async (orderId: number, newStatus: OrderStatus) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const updatedOrders = orders.map(order =>
                order.id === orderId
                    ? {
                        ...order,
                        status: newStatus,
                        completedAt: newStatus === 'completed' ? new Date().toISOString() : order.completedAt,
                    }
                    : order
            );
            setOrders(updatedOrders);
            await saveData(DB_KEYS.ORDERS, updatedOrders);

            // Thông báo Dashboard cập nhật
            window.dispatchEvent(new CustomEvent('ordersUpdated'));

            // Toast notification
            if (newStatus === 'completed') {
                modal.showSuccess('Đã đánh dấu đơn hàng hoàn thành!');
            }

            // KHÔNG tự động tạo revenue transaction khi mark completed
            // Doanh thu chỉ được tính khi thanh toán bàn (trong BilliardTables component)
            // Đơn hàng sẽ được tính vào revenue khi thanh toán bàn, tránh tính trùng
        } catch (error) {
            modal.showError('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
    };

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
                <p>Đang tải...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Tổng đơn</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
                    <p className="text-xs sm:text-sm text-yellow-700 mb-1">Chờ xử lý</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Tất cả ({stats.total})
                </button>
                <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Chờ xử lý ({stats.pending})
                </button>
                <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'completed'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Hoàn thành ({stats.completed})
                </button>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Không có đơn hàng nào</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        return (
                            <div
                                key={order.id}
                                className={`border-2 ${statusConfig.borderColor} rounded-lg p-3 sm:p-4`}
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 mb-3 sm:mb-4">
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                            <h3 className="text-base sm:text-lg font-bold text-gray-800">
                                                Đơn #{order.id} - {order.tableName}
                                            </h3>
                                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} self-start sm:self-auto`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600">
                                            Tạo lúc: {formatDate(order.createdAt)}
                                        </p>
                                        {order.createdBy && (
                                            <p className="text-xs sm:text-sm text-gray-600">
                                                Người tạo: {order.createdBy}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-left sm:text-right w-full sm:w-auto">
                                        <p className="text-xl sm:text-2xl font-bold text-indigo-600">
                                            {order.totalAmount.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                </div>

                                {/* Order items */}
                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                    <h4 className="font-semibold text-gray-700 mb-2">Chi tiết đơn hàng:</h4>
                                    <div className="space-y-2">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-gray-700">
                                                    {item.menuItemName} × {item.quantity}
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                {order.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                        >
                                            Hoàn thành
                                        </button>
                                    </div>
                                )}

                                {order.status === 'completed' && order.completedAt && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Hoàn thành lúc: {formatDate(order.completedAt)}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Customer Order popup removed */}

            {/* Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={modal.close}
                handleConfirm={modal.handleConfirm}
                message={modal.message}
                title={modal.title}
                type={modal.type}
            />
        </div>
    );
};

export default OrderManagement;


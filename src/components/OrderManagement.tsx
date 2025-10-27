import { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types/order';
import { RevenueTransaction } from '../types/revenue';
import { getData, saveData, DB_KEYS } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const OrderManagement = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
    const [loading, setLoading] = useState(true);

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
                console.error('Error loading orders:', error);
            } finally {
                setLoading(false);
            }
        };
        loadOrders();
    }, []);

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
            case 'preparing':
                return {
                    label: 'Đang chuẩn bị',
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    borderColor: 'border-blue-300',
                };
            case 'ready':
                return {
                    label: 'Sẵn sàng',
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    borderColor: 'border-green-300',
                };
            case 'completed':
                return {
                    label: 'Hoàn thành',
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-800',
                    borderColor: 'border-gray-300',
                };
            case 'cancelled':
                return {
                    label: 'Đã hủy',
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-800',
                    borderColor: 'border-red-300',
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

            // Nếu đơn hàng được đánh dấu là completed, lưu vào revenue
            if (newStatus === 'completed' && order.status !== 'completed') {
                try {
                    const revenueTransactions = await getData<RevenueTransaction[]>(DB_KEYS.REVENUE, []);

                    // Kiểm tra xem đã có transaction cho đơn hàng này chưa
                    const existingTransaction = revenueTransactions.find(
                        t => t.type === 'order' && t.orderId === orderId
                    );

                    if (!existingTransaction) {
                        const newTransaction: RevenueTransaction = {
                            id: Date.now(),
                            type: 'order',
                            orderId: order.id,
                            tableId: order.tableId,
                            tableName: order.tableName,
                            amount: order.totalAmount,
                            createdAt: new Date().toISOString(),
                            createdBy: user?.username || 'unknown',
                            note: `Đơn hàng #${order.id} - ${order.tableName}`,
                        };

                        await saveData(DB_KEYS.REVENUE, [...revenueTransactions, newTransaction]);
                    }
                } catch (error) {
                    console.error('Error saving revenue transaction:', error);
                }
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái đơn hàng');
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
            await handleUpdateStatus(orderId, 'cancelled');
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        completed: orders.filter(o => o.status === 'completed').length,
    };

    const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, order) => sum + order.totalAmount, 0);

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
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Tổng đơn</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-sm text-yellow-700 mb-1">Chờ xử lý</p>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Đang chuẩn bị</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.preparing}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Sẵn sàng</p>
                    <p className="text-2xl font-bold text-green-800">{stats.ready}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-700 mb-1">Doanh thu</p>
                    <p className="text-2xl font-bold text-purple-800">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Tất cả ({stats.total})
                </button>
                <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Chờ xử lý ({stats.pending})
                </button>
                <button
                    onClick={() => setFilterStatus('preparing')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'preparing'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Đang chuẩn bị ({stats.preparing})
                </button>
                <button
                    onClick={() => setFilterStatus('ready')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'ready'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Sẵn sàng ({stats.ready})
                </button>
                <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'completed'
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
                                className={`border-2 ${statusConfig.borderColor} rounded-lg p-4`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-800">
                                                Đơn #{order.id} - {order.tableName}
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Tạo lúc: {formatDate(order.createdAt)}
                                        </p>
                                        {order.createdBy && (
                                            <p className="text-sm text-gray-600">
                                                Người tạo: {order.createdBy}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-indigo-600">
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
                                {order.status !== 'completed' && order.status !== 'cancelled' && (
                                    <div className="flex gap-2">
                                        {order.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                                >
                                                    Bắt đầu chuẩn bị
                                                </button>
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="px-4 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                                                >
                                                    Hủy
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'preparing' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'ready')}
                                                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                            >
                                                Đã sẵn sàng
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'completed')}
                                                className="flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                                            >
                                                Hoàn thành
                                            </button>
                                        )}
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
        </div>
    );
};

export default OrderManagement;


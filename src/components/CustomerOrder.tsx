import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BilliardTable } from '../types/table';
import { Order, OrderItem } from '../types/order';
import { MenuItem } from '../types/order';
import { getData, saveData, DB_KEYS } from '../services/database';

const CustomerOrder = () => {
    const { id } = useParams<{ id: string }>();
    const tableId = id ? parseInt(id) : 0;

    const [table, setTable] = useState<BilliardTable | null>(null);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Map<number, { quantity: number; note?: string }>>(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Load bàn bi a
                const tables = await getData<BilliardTable[]>(DB_KEYS.TABLES, []);
                const foundTable = tables.find(t => t.id === tableId);
                setTable(foundTable || null);

                // Load menu
                const menuData = await getData<MenuItem[]>(DB_KEYS.MENU, []);
                setMenu(menuData.filter(item => item.isActive !== false));
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();

        // Reload data khi có thay đổi từ trang quản trị
        const handleOrdersUpdated = () => {
            loadData();
        };

        window.addEventListener('ordersUpdated', handleOrdersUpdated);

        return () => {
            window.removeEventListener('ordersUpdated', handleOrdersUpdated);
        };
    }, [tableId]);

    const handleAddItem = (menuItem: MenuItem) => {
        const current = selectedItems.get(menuItem.id) || { quantity: 0 };
        setSelectedItems(new Map(selectedItems.set(menuItem.id, { ...current, quantity: current.quantity + 1 })));
    };

    const handleRemoveItem = (menuItemId: number) => {
        const current = selectedItems.get(menuItemId);
        if (current && current.quantity > 0) {
            const newMap = new Map(selectedItems);
            if (current.quantity === 1) {
                newMap.delete(menuItemId);
            } else {
                newMap.set(menuItemId, { ...current, quantity: current.quantity - 1 });
            }
            setSelectedItems(newMap);
        }
    };

    const handleUpdateQuantity = (menuItemId: number, quantity: number) => {
        if (quantity <= 0) {
            const newMap = new Map(selectedItems);
            newMap.delete(menuItemId);
            setSelectedItems(newMap);
        } else {
            const current = selectedItems.get(menuItemId) || { quantity: 0 };
            const newMap = new Map(selectedItems);
            newMap.set(menuItemId, { ...current, quantity });
            setSelectedItems(newMap);
        }
    };

    const handleSubmitOrder = async () => {
        if (selectedItems.size === 0) {
            alert('Vui lòng chọn ít nhất một món');
            return;
        }

        if (!table) {
            alert('Không tìm thấy bàn');
            return;
        }

        // Chỉ cho phép order khi bàn đang chơi
        if (table.status !== 'playing') {
            alert('Bàn này hiện không sẵn sàng để đặt món. Vui lòng báo nhân viên bắt đầu bàn.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Load orders hiện tại
            const orders = await getData<Order[]>(DB_KEYS.ORDERS, []);

            // Tạo order items
            const orderItems: OrderItem[] = Array.from(selectedItems.entries()).map(([menuItemId, data]) => {
                const menuItem = menu.find(m => m.id === menuItemId)!;
                return {
                    id: Date.now() + menuItemId,
                    menuItemId,
                    menuItemName: menuItem.name,
                    quantity: data.quantity,
                    price: menuItem.price,
                    note: data.note,
                };
            });

            // Tính tổng tiền
            const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Tạo order mới
            const newOrder: Order = {
                id: Date.now(),
                tableId: table.id,
                tableName: table.name,
                items: orderItems,
                status: 'pending',
                totalAmount,
                createdAt: new Date().toISOString(),
                createdBy: 'customer',
            };

            // Lưu order
            await saveData(DB_KEYS.ORDERS, [...orders, newOrder]);

            // Thông báo cho trang quản lý
            window.dispatchEvent(new CustomEvent('newOrder', {
                detail: {
                    order: newOrder,
                    message: `Có đơn hàng mới từ bàn ${table.name}!`
                }
            }));

            setShowSuccess(true);
            setSelectedItems(new Map());

            // Tự động ẩn thông báo sau 3 giây
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Có lỗi xảy ra khi đặt món');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalAmount = Array.from(selectedItems.entries()).reduce((sum, [menuItemId, data]) => {
        const menuItem = menu.find(m => m.id === menuItemId);
        return sum + (menuItem ? menuItem.price * data.quantity : 0);
    }, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Đang tải...</h2>
                </div>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️</h2>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy bàn</h2>
                    <p className="text-gray-600">Vui lòng kiểm tra lại QR code</p>
                </div>
            </div>
        );
    }

    // Kiểm tra trạng thái bàn
    const canOrder = table.status === 'playing';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sticky top-0 z-10 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold text-center">🍽️ Đặt món tại {table.name}</h1>
                    <p className="text-center text-indigo-100 mt-1">Chọn món bạn muốn order</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 pb-20">
                {/* Warning Message - Bàn không sẵn sàng */}
                {!canOrder && (
                    <div className="mb-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg">
                        <p className="font-bold text-lg">⚠️ Bàn hiện không sẵn sàng</p>
                        <p className="text-sm mt-1">Bàn {table.name} đang ở trạng thái "{table.status === 'empty' ? 'Trống' : table.status === 'maintenance' ? 'Bảo trì' : 'Không xác định'}"</p>
                        <p className="text-sm mt-1">Vui lòng báo nhân viên bắt đầu bàn để có thể đặt món</p>
                    </div>
                )}

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-4 bg-green-500 text-white p-4 rounded-lg shadow-lg">
                        <p className="font-bold text-lg">✅ Đặt món thành công!</p>
                        <p className="text-sm mt-1">Cảm ơn bạn, đơn hàng đang được xử lý...</p>
                    </div>
                )}

                {/* Menu Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {menu.map((item) => {
                        const selectedData = selectedItems.get(item.id);
                        const quantity = selectedData?.quantity || 0;

                        return (
                            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                                        <p className="text-gray-600 text-sm mt-1">{item.description || ''}</p>
                                        <p className="text-indigo-600 font-bold text-lg mt-2">
                                            {item.price.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                    {quantity > 0 && (
                                        <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                                            {quantity}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {quantity === 0 ? (
                                        <button
                                            onClick={() => handleAddItem(item)}
                                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                                        >
                                            + Thêm
                                        </button>
                                    ) : (
                                        <div className="flex gap-2 flex-1">
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="w-10 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-bold"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                value={quantity}
                                                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                className="flex-1 text-center border border-gray-300 rounded-lg px-2"
                                            />
                                            <button
                                                onClick={() => handleAddItem(item)}
                                                className="w-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Order Summary - Sticky Bottom */}
                {selectedItems.size > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-500 shadow-2xl p-4 z-20">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-700 font-semibold">Tổng cộng:</span>
                                <span className="text-2xl font-bold text-indigo-600">
                                    {totalAmount.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <button
                                onClick={handleSubmitOrder}
                                disabled={isSubmitting || !canOrder}
                                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Đang xử lý...' : canOrder ? '✅ Xác nhận đặt món' : '⛔ Không thể đặt (Bàn chưa bắt đầu)'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerOrder;


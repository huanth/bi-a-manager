import { useState, useEffect } from 'react';
import { MenuItem, OrderItem } from '../types/order';
import { BilliardTable } from '../types/table';
import { getData, saveData, DB_KEYS } from '../services/database';
import { initialMenu } from '../data/menuData';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

interface OrderModalProps {
    table: BilliardTable;
    onClose: () => void;
    onOrderComplete: () => void;
}

const OrderModal = ({ table, onClose, onOrderComplete }: OrderModalProps) => {
    const { user } = useAuth();
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Map<number, { quantity: number; note?: string }>>(new Map());
    const [activeCategory, setActiveCategory] = useState<'food' | 'drink'>('food');
    const [loading, setLoading] = useState(true);
    const modal = useModal();

    useEffect(() => {
        const loadMenu = async () => {
            try {
                const menuData = await getData<MenuItem[]>(DB_KEYS.MENU, initialMenu);
                setMenu(menuData.filter(item => item.isActive !== false));
            } catch (error) {
                console.error('Error loading menu:', error);
                setMenu(initialMenu.filter(item => item.isActive !== false));
            } finally {
                setLoading(false);
            }
        };
        loadMenu();
    }, []);

    const filteredMenu = menu.filter(item => item.category === activeCategory);

    const handleAddItem = (item: MenuItem) => {
        const current = selectedItems.get(item.id) || { quantity: 0 };
        setSelectedItems(new Map(selectedItems.set(item.id, { ...current, quantity: current.quantity + 1 })));
    };

    const handleRemoveItem = (itemId: number) => {
        const current = selectedItems.get(itemId);
        if (current && current.quantity > 1) {
            setSelectedItems(new Map(selectedItems.set(itemId, { ...current, quantity: current.quantity - 1 })));
        } else {
            const newMap = new Map(selectedItems);
            newMap.delete(itemId);
            setSelectedItems(newMap);
        }
    };

    const handleUpdateQuantity = (itemId: number, quantity: number) => {
        if (quantity <= 0) {
            const newMap = new Map(selectedItems);
            newMap.delete(itemId);
            setSelectedItems(newMap);
        } else {
            const current = selectedItems.get(itemId) || { quantity: 0 };
            setSelectedItems(new Map(selectedItems.set(itemId, { ...current, quantity })));
        }
    };

    const handleSubmitOrder = async () => {
        if (selectedItems.size === 0) {
            modal.showError('Vui lòng chọn ít nhất một món');
            return;
        }

        try {
            // Load orders hiện tại
            const orders = await getData<any[]>(DB_KEYS.ORDERS, []);

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
            const newOrder = {
                id: Date.now(),
                tableId: table.id,
                tableName: table.name,
                items: orderItems,
                status: 'pending' as const,
                totalAmount,
                createdAt: new Date().toISOString(),
                createdBy: user?.username || 'unknown',
            };

            // Lưu order
            await saveData(DB_KEYS.ORDERS, [...orders, newOrder]);

            // Thông báo Dashboard cập nhật
            window.dispatchEvent(new CustomEvent('ordersUpdated'));

            modal.showSuccess('Đặt món thành công!');
            onOrderComplete();
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error) {
            console.error('Error creating order:', error);
            modal.showError('Có lỗi xảy ra khi đặt món');
        }
    };

    const selectedItemsList = Array.from(selectedItems.entries()).map(([menuItemId, data]) => {
        const menuItem = menu.find(m => m.id === menuItemId);
        return menuItem ? { menuItem, ...data } : null;
    }).filter(Boolean) as Array<{ menuItem: MenuItem; quantity: number; note?: string }>;

    const totalAmount = selectedItemsList.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-800">Đặt món - {table.name}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
                    {/* Menu */}
                    <div className="w-full sm:w-2/3 border-r-0 sm:border-r border-gray-200 border-b sm:border-b-0 overflow-y-auto p-4 sm:p-6">
                        {/* Category tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveCategory('food')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${activeCategory === 'food'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                🍕 Đồ ăn
                            </button>
                            <button
                                onClick={() => setActiveCategory('drink')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${activeCategory === 'drink'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                🥤 Nước uống
                            </button>
                        </div>

                        {/* Menu items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {filteredMenu.map((item) => (
                                <div
                                    key={item.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                                    onClick={() => handleAddItem(item)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                                        <span className="text-indigo-600 font-bold">
                                            {item.price.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                    {item.description && (
                                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                    )}
                                    <div className="text-xs text-gray-500 text-right">
                                        Nhấn để thêm
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected items */}
                    <div className="w-full sm:w-1/3 p-4 sm:p-6 overflow-y-auto bg-gray-50">
                        <h4 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Đơn hàng</h4>

                        {selectedItemsList.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Chưa có món nào được chọn</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedItemsList.map(({ menuItem, quantity, note }) => (
                                    <div key={menuItem.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-sm">{menuItem.name}</span>
                                            <span className="text-indigo-600 font-bold text-sm">
                                                {(menuItem.price * quantity).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRemoveItem(menuItem.id)}
                                                className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(e) => handleUpdateQuantity(menuItem.id, parseInt(e.target.value) || 1)}
                                                className="w-12 text-center border border-gray-300 rounded py-1 text-sm"
                                            />
                                            <button
                                                onClick={() => handleAddItem(menuItem)}
                                                className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Total */}
                        {selectedItemsList.length > 0 && (
                            <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-300">
                                <div className="flex justify-between items-center mb-3 sm:mb-4">
                                    <span className="text-base sm:text-lg font-bold">Tổng tiền:</span>
                                    <span className="text-xl sm:text-2xl font-bold text-indigo-600">
                                        {totalAmount.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <button
                                    onClick={handleSubmitOrder}
                                    className="w-full bg-green-600 text-white py-2.5 sm:py-3 rounded-lg hover:bg-green-700 transition font-medium text-sm sm:text-base"
                                >
                                    Xác nhận đặt món
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

export default OrderModal;


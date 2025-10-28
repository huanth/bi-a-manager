import { useState, useEffect } from 'react';
import { Order } from '../types/order';

interface NewOrderPopupProps {
    order: Order;
    onClose: () => void;
}

const NewOrderPopup = ({ order, onClose }: NewOrderPopupProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsVisible(true), 100);

        // Auto close after 10 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const handleClose = () => {
        setIsVisible(false);
        // setTimeout(onClose, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={handleClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-60"></div>

            {/* Popup */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-2xl p-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="bg-white bg-opacity-20 rounded-full p-3">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Đơn hàng mới!</h2>
                            <p className="text-green-100">Khách đã đặt món</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Bàn */}
                    <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg mb-4">
                        <span className="text-gray-600 font-medium">Bàn:</span>
                        <span className="text-2xl font-bold text-indigo-600">{order.tableName}</span>
                    </div>

                    {/* Chi tiết đơn hàng */}
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Chi tiết đơn hàng:</h3>
                        <div className="space-y-2">
                            {order.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                    <span className="text-gray-700">{item.menuItemName} × {item.quantity}</span>
                                    <span className="font-bold text-indigo-600">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                                </div>
                            ))}
                            {order.items.length > 3 && (
                                <p className="text-xs text-gray-500 text-center">...và {order.items.length - 3} món khác</p>
                            )}
                        </div>
                    </div>

                    {/* Tổng tiền */}
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                        <span className="text-white font-bold">Tổng cộng:</span>
                        <span className="text-2xl font-bold text-white">
                            {order.totalAmount.toLocaleString('vi-VN')}đ
                        </span>
                    </div>

                    {/* Time */}
                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                            ⏰ {new Date(order.createdAt).toLocaleTimeString('vi-VN')}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 pb-6">
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-bold"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={() => {
                                // Dispatch event to refresh orders
                                window.dispatchEvent(new CustomEvent('ordersUpdated'));
                                handleClose();
                            }}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-bold"
                        >
                            Xem chi tiết →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewOrderPopup;


export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface MenuItem {
    id: number;
    name: string;
    category: 'food' | 'drink'; // Đồ ăn hoặc nước uống
    price: number;
    description?: string;
    image?: string;
    isActive?: boolean; // Để ẩn/hiện món trong menu
}

export interface OrderItem {
    id: number;
    menuItemId: number;
    menuItemName: string;
    quantity: number;
    price: number;
    note?: string; // Ghi chú đặc biệt cho món này
}

export interface Order {
    id: number;
    tableId: number;
    tableName: string;
    items: OrderItem[];
    status: OrderStatus;
    totalAmount: number;
    createdAt: string; // ISO date string
    createdBy?: string; // Username của người tạo đơn
    completedAt?: string; // ISO date string
    note?: string; // Ghi chú chung cho đơn hàng
}


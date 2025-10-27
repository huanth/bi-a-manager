export interface RevenueTransaction {
    id: number;
    type: 'table' | 'order'; // Doanh thu từ bàn bi a hoặc đơn hàng
    tableId?: number;
    tableName?: string;
    orderId?: number;
    amount: number;
    createdAt: string; // ISO date string
    createdBy?: string;
    note?: string; // Ghi chú thêm
}


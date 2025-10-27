export type TableStatus = 'playing' | 'empty' | 'maintenance';

export interface TimePrice {
    id: number;
    startTime: string; // Format: "HH:mm" ví dụ "08:00"
    endTime: string;   // Format: "HH:mm" ví dụ "12:00"
    pricePerHour: number;
    label: string;     // Ví dụ: "Sáng", "Chiều", "Tối"
}

export interface BilliardTable {
    id: number;
    name: string;
    status: TableStatus;
    defaultPrice: number; // Giá mặc định
    timePrices?: TimePrice[]; // Giá theo khoảng thời gian
    pricePerHour?: number; // Giá cũ (để tương thích với dữ liệu cũ)
    currentPlayer?: string;
    startTime?: string;
    duration?: number; // minutes
}


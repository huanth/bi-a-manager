export interface TimePrice {
    id: number;
    startTime: string; // Format: "HH:mm" ví dụ "08:00"
    endTime: string;   // Format: "HH:mm" ví dụ "12:00"
    pricePerHour: number;
    label: string;     // Ví dụ: "Sáng", "Chiều", "Tối"
}

export interface TablePricing {
    tableId: number;
    defaultPrice: number; // Giá mặc định nếu không có khoảng thời gian nào khớp
    timePrices: TimePrice[];
}


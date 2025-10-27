import { BilliardTable, TimePrice } from '../types/table';

/**
 * Tính giá hiện tại của bàn dựa trên thời gian
 */
export const getCurrentPrice = (table: BilliardTable): number => {
    // Nếu không có timePrices, trả về defaultPrice hoặc pricePerHour (tương thích cũ)
    if (!table.timePrices || table.timePrices.length === 0) {
        return (table.defaultPrice || table.pricePerHour || 100000);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Convert to minutes

    // Tìm khoảng thời gian khớp
    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        // Kiểm tra nếu thời gian hiện tại nằm trong khoảng
        if (currentTime >= startTime && currentTime < endTime) {
            return timePrice.pricePerHour;
        }
    }

    // Không có khoảng nào khớp, trả về giá mặc định
    return table.defaultPrice || table.pricePerHour || 100000;
};

/**
 * Lấy label cho khoảng thời gian hiện tại
 */
export const getCurrentTimeLabel = (table: BilliardTable): string | null => {
    if (!table.timePrices || table.timePrices.length === 0) {
        return null;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime >= startTime && currentTime < endTime) {
            return timePrice.label;
        }
    }

    return null;
};

/**
 * Tính giá tại một thời điểm cụ thể
 */
export const getPriceAtTime = (table: BilliardTable, time: Date): number => {
    if (!table.timePrices || table.timePrices.length === 0) {
        return table.defaultPrice || table.pricePerHour || 100000;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 60 + minute;

    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime >= startTime && currentTime < endTime) {
            return timePrice.pricePerHour;
        }
    }

    return table.defaultPrice || table.pricePerHour || 100000;
};

/**
 * Tính tổng tiền dựa trên thời gian chơi
 * Xử lý trường hợp chơi qua nhiều khung giờ khác nhau
 */
export const calculateTotalPrice = (
    table: BilliardTable, 
    startTime: string, 
    endTime: Date
): { total: number; details: { period: string; hours: number; price: number; amount: number }[] } => {
    // Parse start time từ string "HH:mm"
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(startHour, startMin, 0, 0);
    
    const start = new Date(startDate);
    const end = new Date(endTime);
    
    const details: { period: string; hours: number; price: number; amount: number }[] = [];
    let total = 0;
    let current = new Date(start);
    
    // Tính từng khoảng thời gian
    while (current < end) {
        const currentPrice = getPriceAtTime(table, current);
        const nextHour = new Date(current);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        
        const periodEnd = nextHour < end ? nextHour : end;
        const minutes = (periodEnd.getTime() - current.getTime()) / (1000 * 60);
        const hours = minutes / 60;
        
        const amount = currentPrice * hours;
        total += amount;
        
        const timeLabel = getTimeLabel(table, current);
        details.push({
            period: timeLabel || 'Mặc định',
            hours: parseFloat(hours.toFixed(2)),
            price: currentPrice,
            amount: Math.round(amount),
        });
        
        current = nextHour;
    }
    
    return {
        total: Math.round(total),
        details,
    };
};

/**
 * Lấy label cho một thời điểm cụ thể
 */
const getTimeLabel = (table: BilliardTable, time: Date): string | null => {
    if (!table.timePrices || table.timePrices.length === 0) {
        return null;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 60 + minute;

    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime >= startTime && currentTime < endTime) {
            return timePrice.label;
        }
    }

    return null;
};


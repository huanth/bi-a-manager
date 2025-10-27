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
        let endTime = endHour * 60 + endMin;

        // Xử lý trường hợp khung giờ qua ngày (ví dụ: 22:00 - 02:00)
        if (endTime <= startTime) {
            endTime += 24 * 60;
        }

        // Kiểm tra nếu thời gian hiện tại nằm trong khoảng
        let currentTimeCheck = currentTime;
        if (endTime > 24 * 60 && currentTimeCheck < startTime) {
            currentTimeCheck += 24 * 60;
        }

        if (currentTimeCheck >= startTime && currentTimeCheck < endTime) {
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
        let endTime = endHour * 60 + endMin;

        // Xử lý trường hợp khung giờ qua ngày (ví dụ: 22:00 - 02:00)
        if (endTime <= startTime) {
            endTime += 24 * 60;
        }

        // Kiểm tra nếu thời gian hiện tại nằm trong khoảng
        let currentTimeCheck = currentTime;
        if (endTime > 24 * 60 && currentTimeCheck < startTime) {
            currentTimeCheck += 24 * 60;
        }

        if (currentTimeCheck >= startTime && currentTimeCheck < endTime) {
            return timePrice.label;
        }
    }

    return null;
};

/**
 * Tính giá tại một thời điểm cụ thể
 */
export const getPriceAtTime = (table: BilliardTable, time: Date): number => {
    // Nếu không có khung giờ, trả về giá mặc định
    if (!table.timePrices || table.timePrices.length === 0) {
        return table.defaultPrice || table.pricePerHour || 100000;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 60 + minute;

    // Tìm khung giờ phù hợp
    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        let endTime = endHour * 60 + endMin;

        // Xử lý trường hợp khung giờ qua ngày (ví dụ: 22:00 - 02:00)
        if (endTime <= startTime) {
            endTime += 24 * 60;
        }

        // Kiểm tra nếu thời gian hiện tại nằm trong khoảng
        let currentTimeCheck = currentTime;
        if (endTime > 24 * 60 && currentTimeCheck < startTime) {
            currentTimeCheck += 24 * 60;
        }

        if (currentTimeCheck >= startTime && currentTimeCheck < endTime) {
            return timePrice.pricePerHour;
        }
    }

    // Không tìm thấy khung giờ phù hợp, trả về giá mặc định
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
    
    // Xử lý trường hợp chơi qua ngày
    const end = new Date(endTime);
    if (end < startDate) {
        end.setDate(end.getDate() + 1);
    }
    
    const start = new Date(startDate);
    const details: { period: string; hours: number; price: number; amount: number }[] = [];
    let total = 0;
    let current = new Date(start);
    
    // Tính từng khoảng thời gian theo khung giờ
    while (current < end) {
        const currentPrice = getPriceAtTime(table, current);
        const currentLabel = getTimeLabel(table, current);
        
        // Tìm điểm kết thúc của khung giờ hiện tại
        let periodEnd: Date;
        
        if (table.timePrices && table.timePrices.length > 0) {
            // Tìm khung giờ hiện tại
            const hour = current.getHours();
            const minute = current.getMinutes();
            const currentTimeInMinutes = hour * 60 + minute;
            
            let foundTimePrice = null;
            for (const timePrice of table.timePrices) {
                const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
                const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
                
                const startTimeInMinutes = startHour * 60 + startMin;
                let endTimeInMinutes = endHour * 60 + endMin;
                
                // Xử lý trường hợp khung giờ qua ngày (ví dụ: 22:00 - 02:00)
                if (endTimeInMinutes <= startTimeInMinutes) {
                    endTimeInMinutes += 24 * 60;
                }
                
                // Kiểm tra xem thời gian hiện tại có trong khung giờ này không
                let currentTimeCheck = currentTimeInMinutes;
                if (endTimeInMinutes > 24 * 60 && currentTimeCheck < startTimeInMinutes) {
                    currentTimeCheck += 24 * 60;
                }
                
                if (currentTimeCheck >= startTimeInMinutes && currentTimeCheck < endTimeInMinutes) {
                    foundTimePrice = timePrice;
                    break;
                }
            }
            
            if (foundTimePrice) {
                // Tính điểm kết thúc của khung giờ này
                const [endHour, endMin] = foundTimePrice.endTime.split(':').map(Number);
                periodEnd = new Date(current);
                periodEnd.setHours(endHour, endMin, 0, 0);
                
                // Nếu điểm kết thúc nhỏ hơn điểm bắt đầu, nghĩa là qua ngày
                if (periodEnd <= current) {
                    periodEnd.setDate(periodEnd.getDate() + 1);
                }
            } else {
                // Không tìm thấy khung giờ (thời gian không nằm trong khung nào)
                // Tính đến khi tìm thấy khung giờ tiếp theo hoặc đến cuối phiên chơi
                let nextPeriodStart: Date | null = null;
                
                // Tìm khung giờ gần nhất tiếp theo
                for (const timePrice of table.timePrices) {
                    const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
                    const periodStartDate = new Date(current);
                    periodStartDate.setHours(startHour, startMin, 0, 0);
                    
                    // Nếu khung giờ này bắt đầu sau thời điểm hiện tại
                    if (periodStartDate > current) {
                        if (!nextPeriodStart || periodStartDate < nextPeriodStart) {
                            nextPeriodStart = periodStartDate;
                        }
                    }
                }
                
                if (nextPeriodStart) {
                    periodEnd = nextPeriodStart;
                } else {
                    // Không có khung giờ nào tiếp theo, tính đến cuối hoặc đến giờ tiếp theo
                    periodEnd = new Date(current);
                    periodEnd.setHours(periodEnd.getHours() + 1, 0, 0, 0);
                }
            }
        } else {
            // Không có khung giờ, tính theo giờ
            periodEnd = new Date(current);
            periodEnd.setHours(periodEnd.getHours() + 1, 0, 0, 0);
        }
        
        // Không được vượt quá thời gian kết thúc
        if (periodEnd > end) {
            periodEnd = new Date(end);
        }
        
        // Tính số phút và giờ trong khoảng này
        const minutes = (periodEnd.getTime() - current.getTime()) / (1000 * 60);
        const hours = minutes / 60;
        
        const amount = currentPrice * hours;
        total += amount;
        
        details.push({
            period: currentLabel || 'Mặc định',
            hours: parseFloat(hours.toFixed(4)),
            price: currentPrice,
            amount: Math.round(amount),
        });
        
        current = periodEnd;
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
    // Nếu không có khung giờ, trả về null (sẽ hiển thị "Mặc định")
    if (!table.timePrices || table.timePrices.length === 0) {
        return null;
    }

    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTime = hour * 60 + minute;

    // Tìm khung giờ phù hợp
    for (const timePrice of table.timePrices) {
        const [startHour, startMin] = timePrice.startTime.split(':').map(Number);
        const [endHour, endMin] = timePrice.endTime.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        let endTime = endHour * 60 + endMin;

        // Xử lý trường hợp khung giờ qua ngày (ví dụ: 22:00 - 02:00)
        if (endTime <= startTime) {
            endTime += 24 * 60;
        }

        // Kiểm tra nếu thời gian hiện tại nằm trong khoảng
        let currentTimeCheck = currentTime;
        if (endTime > 24 * 60 && currentTimeCheck < startTime) {
            currentTimeCheck += 24 * 60;
        }

        if (currentTimeCheck >= startTime && currentTimeCheck < endTime) {
            return timePrice.label;
        }
    }

    // Không tìm thấy khung giờ phù hợp, trả về null (sẽ hiển thị "Mặc định")
    return null;
};


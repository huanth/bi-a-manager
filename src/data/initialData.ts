import { BilliardTable } from '../types/table';
import { saveData, DB_KEYS } from '../services/database';

/**
 * Dữ liệu khởi tạo cho database
 */

export const initialTables: BilliardTable[] = [
    { id: 1, name: 'Bàn 1', status: 'playing', pricePerHour: 100000, currentPlayer: 'Nguyễn Văn A', startTime: '14:30', duration: 45 },
    { id: 2, name: 'Bàn 2', status: 'empty', pricePerHour: 100000 },
    { id: 3, name: 'Bàn 3', status: 'playing', pricePerHour: 120000, currentPlayer: 'Trần Thị B', startTime: '15:00', duration: 30 },
    { id: 4, name: 'Bàn 4', status: 'maintenance', pricePerHour: 100000 },
    { id: 5, name: 'Bàn 5', status: 'empty', pricePerHour: 100000 },
    { id: 6, name: 'Bàn 6', status: 'playing', pricePerHour: 120000, currentPlayer: 'Lê Văn C', startTime: '14:15', duration: 60 },
    { id: 7, name: 'Bàn 7', status: 'empty', pricePerHour: 100000 },
    { id: 8, name: 'Bàn 8', status: 'empty', pricePerHour: 100000 },
];

/**
 * Khởi tạo database với dữ liệu mặc định
 */
export const initializeDatabase = async (): Promise<void> => {
    try {
        // Khởi tạo dữ liệu mặc định
        await saveData(DB_KEYS.TABLES, initialTables);
        console.log('Database initialized with default data');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};


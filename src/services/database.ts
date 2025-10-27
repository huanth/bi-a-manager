/**
 * API Database Service
 * GET dữ liệu từ API endpoint
 * POST toàn bộ JSON khi có thay đổi
 */

// Trong development, sử dụng proxy /api
// Trong production, sử dụng API_URL từ env
const isDev = import.meta.env.DEV;
const API_URL = isDev 
    ? '/api' 
    : (import.meta.env.VITE_API_URL || 'https://bi-a.one-triple-nine.top');

// Database keys
export const DB_KEYS = {
    TABLES: 'tables',
    CUSTOMERS: 'customers',
    ORDERS: 'orders',
    EMPLOYEES: 'employees',
    USERS: 'users',
    MENU: 'menu',
    REVENUE: 'revenue',
} as const;

/**
 * Load dữ liệu từ API (GET)
 */
export const loadDatabaseFromFile = async (): Promise<Record<string, unknown>> => {
    try {
        const response = await fetch(`${API_URL}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.error('Error loading from API:', error);
    }
    
    // Return empty data nếu không load được
    return {
        tables: [],
        customers: [],
        orders: [],
        employees: [],
        menu: [],
        revenue: [],
    };
};

/**
 * Lấy dữ liệu từ API
 */
export const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
        const db = await loadDatabaseFromFile();
        const value = db[key] as T | undefined;
        
        if (value !== undefined) {
            return value;
        }
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
    }
    return defaultValue;
};

/**
 * Lấy dữ liệu đồng bộ (trả về giá trị mặc định)
 */
export const getDataSync = <T>(_key: string, defaultValue: T): T => {
    return defaultValue;
};

/**
 * Lưu dữ liệu: Lấy toàn bộ dữ liệu hiện tại từ API, cập nhật key cần thiết, rồi POST lên API
 */
export const saveData = async <T>(key: string, data: T): Promise<void> => {
    try {
        // Lấy toàn bộ dữ liệu hiện tại từ API
        const currentData = await loadDatabaseFromFile();
        
        // Cập nhật key cần lưu
        currentData[key] = data;

        // POST toàn bộ JSON lên API
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(currentData),
        });

        if (!response.ok) {
            throw new Error('Failed to sync to API');
        }
        
        console.log(`Successfully synced ${key} to API`);
    } catch (error) {
        console.error(`Error saving ${key}:`, error);
        throw error;
    }
};

/**
 * Xóa dữ liệu khỏi API
 */
export const deleteData = async (key: string): Promise<void> => {
    try {
        const currentData = await loadDatabaseFromFile();
        currentData[key] = [];
        
        await fetch(`${API_URL}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(currentData),
        });
    } catch (error) {
        console.error(`Error deleting ${key}:`, error);
        throw error;
    }
};

/**
 * Xóa tất cả dữ liệu database
 */
export const clearAllData = async (): Promise<void> => {
    const emptyData: Record<string, unknown> = {};
    Object.values(DB_KEYS).forEach((key) => {
        emptyData[key] = [];
    });
    
    try {
        await fetch(`${API_URL}`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(emptyData),
        });
    } catch (error) {
        console.error('Error clearing all data:', error);
        throw error;
    }
};

/**
 * Export tất cả dữ liệu ra JSON file (download)
 * Export từ API
 */
export const exportToJSON = async (): Promise<void> => {
    try {
        const data = await loadDatabaseFromFile();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `database.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting JSON:', error);
        throw error;
    }
};

/**
 * Import dữ liệu từ JSON file
 */
export const importFromJSON = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                
                // POST toàn bộ JSON lên API
                try {
                    const response = await fetch(`${API_URL}`, {
                        method: 'POST',
                        mode: 'cors',
                        credentials: 'omit',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to sync import to API');
                    }
                } catch (error) {
                    console.error('API sync failed during import:', error);
                    reject(error);
                    return;
                }
                
                resolve();
            } catch (error) {
                reject(new Error('Invalid JSON file'));
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
};


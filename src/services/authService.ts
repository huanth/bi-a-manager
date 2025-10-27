import { UserRole } from '../types/auth';
import { UserAccount } from '../types/user';
import { loadDatabaseFromFile } from './database';

interface LoginResponse {
    success: boolean;
    role?: UserRole;
    message?: string;
}

/**
 * Check user credentials from database.json
 * Chỉ kiểm tra từ database, không có fallback tự động
 */
export const loginAPI = async (username: string, password: string): Promise<LoginResponse> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Validate input
    if (!username || !password) {
        return {
            success: false,
            message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu',
        };
    }

    // Trim whitespace
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
        return {
            success: false,
            message: 'Tên đăng nhập và mật khẩu không được để trống',
        };
    }

    try {
        // Load users from database.json
        const db = await loadDatabaseFromFile();
        const users = (db.users || []) as UserAccount[];

        if (!users || users.length === 0) {
            return {
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác',
            };
        }

        // Find user by username (case-insensitive)
        const user = users.find(
            u => u.username.toLowerCase() === trimmedUsername.toLowerCase()
        );

        if (!user) {
            return {
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác',
            };
        }

        // Check password (case-sensitive)
        if (user.password !== trimmedPassword) {
            return {
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác',
            };
        }

        // Validate role
        if (!user.role || (user.role !== 'owner' && user.role !== 'employee')) {
            return {
                success: false,
                message: 'Tài khoản không hợp lệ',
            };
        }

        // Success - return user role
        return {
            success: true,
            role: user.role,
        };
    } catch (error) {
        return {
            success: false,
            message: 'Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.',
        };
    }
};


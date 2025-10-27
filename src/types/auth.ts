export type UserRole = 'owner' | 'employee';

export interface User {
    username: string;
    role: UserRole;
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string, role: UserRole) => void;
    logout: () => void;
    hasRole: (role: UserRole) => boolean;
}


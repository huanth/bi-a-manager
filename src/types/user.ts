import { UserRole } from './auth';

export interface UserAccount {
    id: number;
    username: string;
    password: string;
    role: UserRole;
    fullName?: string;
    createdAt?: string;
}


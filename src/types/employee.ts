export interface Employee {
    id: number;
    fullName: string;
    phone: string;
    username: string;
    password: string;
    status: 'active' | 'inactive';
    startDate: string;
    createdAt?: string;
}


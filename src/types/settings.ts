export interface Settings {
    bankAccount: {
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        qrCode?: string;
    };
}

export const DEFAULT_SETTINGS: Settings = {
    bankAccount: {
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        qrCode: '',
    },
};


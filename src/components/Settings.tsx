import { useState, useEffect } from 'react';
import Select, { SingleValue } from 'react-select';
import { getData, saveData, DB_KEYS } from '../services/database';
import { Settings as SettingsType, DEFAULT_SETTINGS } from '../types/settings';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from './LoadingSpinner';

interface Bank {
    id: number;
    name: string;
    code: string;
    bin: string;
    shortName: string;
    logo: string;
    transferSupported: number;
    lookupSupported: number;
}

interface BankOption {
    value: string;
    label: string;
    logo: string;
}

const Settings = () => {
    const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingBanks, setLoadingBanks] = useState(true);
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    // Load danh sách ngân hàng từ API
    useEffect(() => {
        const loadBanks = async () => {
            try {
                // Đọc danh sách ngân hàng từ file JSON trong public
                const response = await fetch('/bank.json');
                if (!response.ok) {
                    throw new Error('Không tìm thấy file bank.json');
                }
                
                const data = await response.json();
                if (data.code === '00' && data.data) {
                    setBanks(data.data);
                } else {
                    toast.showError('Không thể tải danh sách ngân hàng');
                }
            } catch (error) {
                toast.showError('Lỗi khi tải danh sách ngân hàng');
            } finally {
                setLoadingBanks(false);
            }
        };
        loadBanks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần khi component mount

    // Load settings từ database
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await getData<SettingsType>(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
                setSettings(data);
            } catch (error) {
                toast.showError('Lỗi khi tải cài đặt');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần khi component mount

    if (loading || loadingBanks) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <LoadingSpinner text="Đang tải cài đặt..." />
            </div>
        );
    }

    // Lưu settings
    const handleSave = async () => {
        setSaving(true);
        try {
            await saveData(DB_KEYS.SETTINGS, settings);
            toast.showSuccess('Đã lưu cài đặt thành công!');
        } catch (error) {
            toast.showError('Lỗi khi lưu cài đặt');
        } finally {
            setSaving(false);
        }
    };

    // Chuẩn bị options cho react-select
    const bankOptions: BankOption[] = banks.map((bank) => ({
        value: bank.shortName,
        label: bank.name,
        logo: bank.logo,
    }));

    // Tìm selected bank
    const selectedBank = bankOptions.find((option) => option.value === settings.bankAccount.bankName);

    // Handler khi chọn ngân hàng
    const handleBankChange = (selected: SingleValue<BankOption>) => {
        setSettings({
            ...settings,
            bankAccount: {
                ...settings.bankAccount,
                bankName: selected?.value || '',
            },
        });
    };

    // Custom styles cho react-select
    const customStyles = {
        control: (base: any) => ({
            ...base,
            borderColor: '#d1d5db',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            '&:hover': {
                borderColor: '#d1d5db',
            },
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected
                ? '#4f46e5'
                : state.isFocused
                ? '#eef2ff'
                : 'white',
            color: state.isSelected ? 'white' : '#111827',
        }),
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Cài đặt tài khoản ngân hàng</h2>

                {/* Tài khoản ngân hàng */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Thông tin tài khoản</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                                Tên ngân hàng
                            </label>
                            <Select<BankOption>
                                id="bankName"
                                options={bankOptions}
                                value={selectedBank || null}
                                onChange={handleBankChange}
                                placeholder="-- Chọn ngân hàng --"
                                isSearchable={true}
                                styles={customStyles}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                noOptionsMessage={() => 'Không tìm thấy ngân hàng'}
                            />
                        </div>
                        <div>
                            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Số tài khoản
                            </label>
                            <input
                                id="accountNumber"
                                type="text"
                                value={settings.bankAccount.accountNumber}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        bankAccount: { ...settings.bankAccount, accountNumber: e.target.value },
                                    })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="Nhập số tài khoản"
                            />
                        </div>
                        <div>
                            <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-2">
                                Chủ tài khoản
                            </label>
                            <input
                                id="accountHolder"
                                type="text"
                                value={settings.bankAccount.accountHolder}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        bankAccount: { ...settings.bankAccount, accountHolder: e.target.value },
                                    })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="Tên chủ tài khoản"
                            />
                        </div>
                    </div>
                </div>

                {/* Nút lưu */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;


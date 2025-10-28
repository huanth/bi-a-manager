import { useState, useEffect } from 'react';
import { BilliardTable, TableStatus } from '../types/table';
import { getData, saveData, DB_KEYS, exportToJSON, importFromJSON, loadDatabaseFromFile } from '../services/database';
import { initialTables } from '../data/initialData';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPrice, getCurrentTimeLabel, calculateTotalPrice } from '../utils/pricing';
import OrderModal from './OrderModal';
import { RevenueTransaction } from '../types/revenue';
import { Order } from '../types/order';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';
import { Settings } from '../types/settings';

interface BilliardTablesProps {
    serviceMode?: boolean; // Chế độ phục vụ - cho phép cả owner phục vụ bàn
}

const BilliardTables = ({ serviceMode = false }: BilliardTablesProps) => {
    const { hasRole, user } = useAuth();
    const isOwner = hasRole('owner');
    const modal = useModal();

    // Khởi tạo với mảng rỗng, sẽ load từ API
    const [tables, setTables] = useState<BilliardTable[]>([]);

    const [filterStatus, setFilterStatus] = useState<TableStatus | 'all'>('all');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
    const [formData, setFormData] = useState<Partial<BilliardTable>>({
        name: '',
        status: 'empty',
        defaultPrice: 100000,
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentTable, setPaymentTable] = useState<BilliardTable | null>(null);
    const [paymentDetails, setPaymentDetails] = useState<{ total: number; details: { period: string; hours: number; price: number; amount: number }[] } | null>(null);
    const [orderTotal, setOrderTotal] = useState<number>(0);
    const [orderDetails, setOrderDetails] = useState<Order[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [orderTable, setOrderTable] = useState<BilliardTable | null>(null);
    const [bankSettings, setBankSettings] = useState<Settings | null>(null);
    const [bankCode, setBankCode] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

    // Hàm format thời gian từ số giờ (số thập phân) sang "X giờ Y phút"
    const formatDuration = (hours: number): string => {
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        if (h === 0) {
            return `${m} phút`;
        } else if (m === 0) {
            return `${h} giờ`;
        } else {
            return `${h} giờ ${m} phút`;
        }
    };

    // Hàm tính duration từ startTime đến hiện tại
    const calculateDuration = (startTime: string, referenceTime: Date = new Date()): number => {
        if (!startTime) return 0;

        const [startHour, startMin] = startTime.split(':').map(Number);
        const currentHour = referenceTime.getHours();
        const currentMin = referenceTime.getMinutes();

        const startMinutes = startHour * 60 + startMin;
        const currentMinutes = currentHour * 60 + currentMin;

        // Xử lý trường hợp chơi qua ngày (sau 24h)
        let diff = currentMinutes - startMinutes;
        if (diff < 0) {
            diff += 24 * 60; // Thêm 24 giờ nếu âm
        }

        return diff;
    };

    // Load dữ liệu từ file JSON khi component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadDatabaseFromFile();
                const data = await getData<BilliardTable[]>(DB_KEYS.TABLES, initialTables);

                // Tính lại duration cho các bàn đang chơi
                const now = new Date();
                const updatedData = data.map(table => {
                    if (table.status === 'playing' && table.startTime) {
                        return {
                            ...table,
                            duration: calculateDuration(table.startTime, now)
                        };
                    }
                    return table;
                });

                setTables(updatedData);
            } catch (error) {
                // Error loading data
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Load bank settings để tạo QR code
    useEffect(() => {
        const loadBankSettings = async () => {
            try {
                const settings = await getData<Settings>(DB_KEYS.SETTINGS, {} as Settings);
                if (settings && settings.bankAccount && settings.bankAccount.bankName) {
                    setBankSettings(settings);
                    // Tìm bank code từ shortName
                    const banksResponse = await fetch('/bank.json');
                    const banksData = await banksResponse.json();
                    if (banksData.code === '00' && banksData.data) {
                        const bank = banksData.data.find((b: { shortName: string; code: string }) => b.shortName === settings.bankAccount.bankName);
                        if (bank) {
                            setBankCode(bank.code);
                        }
                    }
                }
            } catch (error) {
                // Error loading bank settings
            }
        };
        loadBankSettings();
    }, []);

    // Cập nhật thời gian hiện tại mỗi phút để trigger re-render và tính lại duration
    useEffect(() => {
        if (loading) return;

        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Cập nhật mỗi phút

        return () => clearInterval(interval);
    }, [loading]);

    // Lưu dữ liệu vào API mỗi khi tables thay đổi
    useEffect(() => {
        if (!loading) {
            saveData(DB_KEYS.TABLES, tables);
        }
    }, [tables, loading]);

    const getStatusConfig = (status: TableStatus) => {
        switch (status) {
            case 'playing':
                return {
                    label: 'Đang chơi',
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    borderColor: 'border-green-300',
                    dotColor: 'bg-green-500',
                };
            case 'empty':
                return {
                    label: 'Đang trống',
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    borderColor: 'border-blue-300',
                    dotColor: 'bg-blue-500',
                };
            case 'maintenance':
                return {
                    label: 'Bảo trì',
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-800',
                    borderColor: 'border-red-300',
                    dotColor: 'bg-red-500',
                };
        }
    };

    const filteredTables = filterStatus === 'all'
        ? tables
        : tables.filter(table => table.status === filterStatus);

    const stats = {
        total: tables.length,
        playing: tables.filter(t => t.status === 'playing').length,
        empty: tables.filter(t => t.status === 'empty').length,
        maintenance: tables.filter(t => t.status === 'maintenance').length,
    };

    // Xử lý các actions
    const handleStartTable = (tableId: number) => {
        modal.showConfirm('Xác nhận bắt đầu bàn này?', () => {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const startTime = `${hours}:${minutes}`;

            const table = tables.find(t => t.id === tableId);
            setTables(tables.map(table =>
                table.id === tableId
                    ? { ...table, status: 'playing', startTime, duration: 0 }
                    : table
            ));
            modal.showSuccess(`Bắt đầu bàn ${table?.name || ''} thành công!`);
        });
    };

    const handleEndTable = async (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.startTime) {
            modal.showError('Không tìm thấy thông tin bàn hoặc thời gian bắt đầu');
            return;
        }

        // Tính toán chi tiết thanh toán bàn
        const now = new Date();
        const priceDetails = calculateTotalPrice(table, table.startTime, now);

        // Load và tính tổng tiền đơn hàng của bàn này (chỉ trong phiên chơi hiện tại)
        try {
            const orders = await getData<Order[]>(DB_KEYS.ORDERS, []);
            const now = new Date();

            // Tính thời gian bắt đầu của phiên chơi (từ startTime)
            const [startHour, startMin] = table.startTime.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(startHour, startMin, 0, 0);

            // Xử lý trường hợp chơi qua ngày: nếu startTime (VD: 23:00) > giờ hiện tại (VD: 01:00)
            // thì có nghĩa là bắt đầu từ ngày hôm qua
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMin;
            const startTimeInMinutes = startHour * 60 + startMin;

            // Nếu thời gian bắt đầu > thời gian hiện tại (ví dụ: 23:00 > 01:00), nghĩa là đã qua ngày
            if (startTimeInMinutes > currentTimeInMinutes) {
                startDate.setDate(startDate.getDate() - 1);
            }

            // Lọc các đơn hàng trong phiên chơi: cùng bàn, trong khoảng thời gian phiên chơi
            // Bao gồm CẢ order của nhân viên VÀ order của khách (khách order qua QR)
            const tableOrders = orders.filter(order => {
                // Chỉ lấy order của bàn hiện tại
                if (order.tableId !== tableId) {
                    return false;
                }

                // Chỉ lấy order pending (order đã completed sẽ không tính lại)
                if (order.status !== 'pending') {
                    return false;
                }

                // Kiểm tra thời gian tạo đơn hàng trong phiên chơi
                const orderCreatedAt = new Date(order.createdAt);
                return orderCreatedAt >= startDate && orderCreatedAt <= now;
            });

            const totalOrderAmount = tableOrders.reduce((sum, order) => sum + order.totalAmount, 0);

            setOrderTotal(totalOrderAmount);
            setOrderDetails(tableOrders);
        } catch (error) {
            setOrderTotal(0);
            setOrderDetails([]);
        }

        setPaymentTable(table);
        setPaymentDetails(priceDetails);
        setShowPaymentModal(true);
    };

    // In hóa đơn thanh toán
    const printInvoice = () => {
        if (!paymentTable || !paymentDetails) return;

        const totalAmount = paymentDetails.total + orderTotal;
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN');
        const timeStr = now.toLocaleTimeString('vi-VN');

        // Tạo nội dung hóa đơn
        let invoiceContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hóa đơn thanh toán - ${paymentTable.name}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
        }
        .info {
            margin: 10px 0;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        .item-label {
            font-weight: bold;
        }
        .section {
            border-top: 1px dashed #ccc;
            padding-top: 10px;
            margin-top: 10px;
        }
        .total {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px dashed #000;
        }
        .thank-you {
            text-align: center;
            margin-top: 20px;
            font-style: italic;
        }
        @media print {
            body {
                max-width: 100%;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>HÓA ĐƠN THANH TOÁN</h1>
        <p>Bàn: ${paymentTable.name}</p>
    </div>
    
    <div class="info">
        <div class="info-item">
            <span class="item-label">Ngày:</span>
            <span>${dateStr}</span>
        </div>
        <div class="info-item">
            <span class="item-label">Giờ:</span>
            <span>${timeStr}</span>
        </div>
        <div class="info-item">
            <span class="item-label">Nhân viên:</span>
            <span>${user?.username || 'Unknown'}</span>
        </div>
    </div>`;

        // Chi tiết tính tiền bàn
        if (paymentDetails.details && paymentDetails.details.length > 0) {
            invoiceContent += `
    <div class="section">
        <h3 style="margin: 10px 0 5px 0; font-size: 16px;">CHI TIẾT GIỜ CHƠI BÀN:</h3>`;
            paymentDetails.details.forEach(detail => {
                invoiceContent += `
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${detail.period}</span>
            <span>${detail.hours.toFixed(1)}h × ${detail.price.toLocaleString('vi-VN')}đ/h = ${detail.amount.toLocaleString('vi-VN')}đ</span>
        </div>`;
            });
            invoiceContent += `
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 5px;">
            <span>Tiền chơi bàn:</span>
            <span>${paymentDetails.total.toLocaleString('vi-VN')}đ</span>
        </div>
    </div>`;
        } else {
            invoiceContent += `
    <div class="section">
        <div style="display: flex; justify-content: space-between;">
            <span class="item-label">Tiền chơi bàn:</span>
            <span>${paymentDetails.total.toLocaleString('vi-VN')}đ</span>
        </div>
    </div>`;
        }

        // Chi tiết đơn hàng
        if (orderDetails.length > 0) {
            invoiceContent += `
    <div class="section">
        <h3 style="margin: 10px 0 5px 0; font-size: 16px;">CHI TIẾT ĐƠN HÀNG:</h3>`;
            orderDetails.forEach(order => {
                order.items.forEach(item => {
                    invoiceContent += `
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.menuItemName} × ${item.quantity}</span>
            <span>${(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
        </div>`;
                });
            });
            invoiceContent += `
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 5px;">
            <span>Tiền đơn hàng:</span>
            <span>${orderTotal.toLocaleString('vi-VN')}đ</span>
        </div>
    </div>`;
        }

        invoiceContent += `
    <div class="total">
        TỔNG CỘNG: ${totalAmount.toLocaleString('vi-VN')}đ
    </div>
    
    <div class="thank-you">
        Cảm ơn quý khách!<br>
        Chúc quý khách vui vẻ!
    </div>
</body>
</html>`;

        // Mở cửa sổ mới để in
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(invoiceContent);
            printWindow.document.close();
            printWindow.focus();
            // Đợi một chút rồi mới in để đảm bảo nội dung đã load
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleConfirmPayment = async () => {
        if (paymentTable && paymentDetails) {
            // Tính tổng tiền bao gồm cả đơn hàng
            const totalAmount = paymentDetails.total + orderTotal;

            // Cập nhật trạng thái bàn trong state
            const updatedTables: BilliardTable[] = tables.map(table =>
                table.id === paymentTable.id
                    ? { ...table, status: 'empty' as TableStatus, startTime: undefined, duration: undefined } as BilliardTable
                    : table
            );
            setTables(updatedTables);

            // Lưu trạng thái bàn vào database ngay lập tức
            try {
                await saveData(DB_KEYS.TABLES, updatedTables);
            } catch (error) {
                modal.showError('Có lỗi xảy ra khi lưu trạng thái bàn');
                return;
            }

            // Lưu giao dịch doanh thu (bao gồm cả tiền bàn và đơn hàng)
            try {
                const revenueTransactions = await getData<RevenueTransaction[]>(DB_KEYS.REVENUE, []);

                // Lưu giao dịch tổng
                const newTransaction: RevenueTransaction = {
                    id: Date.now(),
                    type: 'table',
                    tableId: paymentTable.id,
                    tableName: paymentTable.name,
                    amount: totalAmount,
                    createdAt: new Date().toISOString(),
                    createdBy: user?.username || 'unknown',
                    note: `Thanh toán bàn ${paymentTable.name} (${paymentDetails.total.toLocaleString('vi-VN')}đ chơi bàn + ${orderTotal.toLocaleString('vi-VN')}đ đơn hàng)`,
                };

                await saveData(DB_KEYS.REVENUE, [...revenueTransactions, newTransaction]);

                // Thông báo thành công
                modal.showSuccess(`Thanh toán thành công!\nTổng tiền: ${totalAmount.toLocaleString('vi-VN')}đ`);

                // In hóa đơn
                setTimeout(() => {
                    printInvoice();
                }, 500);

                // Đánh dấu các đơn hàng trong phiên chơi hiện tại đã được thanh toán
                // Chỉ đánh dấu những đơn hàng có trong orderDetails (đã được lọc theo thời gian)
                const orders = await getData<Order[]>(DB_KEYS.ORDERS, []);
                const orderIdsInSession = new Set(orderDetails.map(o => o.id));
                const updatedOrders = orders.map(order => {
                    // Chỉ đánh dấu completed nếu đơn hàng thuộc phiên chơi hiện tại và đang pending
                    if (orderIdsInSession.has(order.id) && order.status === 'pending') {
                        return {
                            ...order,
                            status: 'completed' as const,
                            completedAt: new Date().toISOString(),
                        };
                    }
                    return order;
                });
                await saveData(DB_KEYS.ORDERS, updatedOrders);

                // Thông báo Dashboard cập nhật đơn hàng và doanh thu
                window.dispatchEvent(new CustomEvent('ordersUpdated'));
                window.dispatchEvent(new CustomEvent('revenueUpdated'));
                window.dispatchEvent(new CustomEvent('tablePaymentCompleted'));
            } catch (error) {
                // Error saving revenue transaction
            }

            setShowPaymentModal(false);
            setPaymentTable(null);
            setPaymentDetails(null);
            setOrderTotal(0);
            setOrderDetails([]);
        }
    };

    const handleCancelPayment = () => {
        setShowPaymentModal(false);
        setPaymentTable(null);
        setPaymentDetails(null);
        setOrderTotal(0);
        setOrderDetails([]);
    };

    const handleOpenOrderModal = (table: BilliardTable) => {
        setOrderTable(table);
        setShowOrderModal(true);
    };

    const handleCloseOrderModal = () => {
        setShowOrderModal(false);
        setOrderTable(null);
    };

    const handleOrderComplete = () => {
        // Reload orders hoặc cập nhật UI nếu cần
    };

    const handleMaintenanceComplete = (tableId: number) => {
        modal.showConfirm('Hoàn thành bảo trì bàn này?', () => {
            const table = tables.find(t => t.id === tableId);
            setTables(tables.map(table =>
                table.id === tableId
                    ? { ...table, status: 'empty' }
                    : table
            ));
            modal.showSuccess(`Hoàn thành bảo trì bàn ${table?.name || ''}!`);
        });
    };

    // Quản lý bàn (chỉ dành cho owner)
    const handleOpenModal = (table?: BilliardTable) => {
        if (table) {
            setEditingTable(table);
            setFormData(table);
        } else {
            setEditingTable(null);
            setFormData({
                name: '',
                status: 'empty',
                defaultPrice: 100000,
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTable(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.defaultPrice) {
            modal.showError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (editingTable) {
            // Update existing table
            setTables(tables.map(table =>
                table.id === editingTable.id
                    ? {
                        ...table,
                        name: formData.name!,
                        status: formData.status || 'empty',
                        defaultPrice: formData.defaultPrice!,
                        pricePerHour: formData.defaultPrice, // Giữ để tương thích
                    } as BilliardTable
                    : table
            ));
            modal.showSuccess('Cập nhật bàn thành công!');
        } else {
            // Add new table
            const newTable: BilliardTable = {
                id: tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1,
                name: formData.name!,
                status: formData.status || 'empty',
                defaultPrice: formData.defaultPrice!,
                pricePerHour: formData.defaultPrice, // Giữ để tương thích
            };
            setTables([...tables, newTable]);
            modal.showSuccess('Thêm bàn mới thành công!');
        }

        handleCloseModal();
    };

    const handleDelete = (id: number) => {
        modal.showConfirm('Bạn có chắc chắn muốn xóa bàn này?', () => {
            setTables(tables.filter(table => table.id !== id));
            modal.showSuccess('Xóa bàn thành công!');
        });
    };

    // Export/Import JSON
    const handleExport = async () => {
        try {
            await exportToJSON();
            modal.showSuccess('Export dữ liệu thành công!');
        } catch (error) {
            modal.showError('Lỗi khi export dữ liệu');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await importFromJSON(file);
                // Reload tables sau khi import
                const importedTables = await getData<BilliardTable[]>(DB_KEYS.TABLES, initialTables);
                setTables(importedTables);
                modal.showSuccess('Import dữ liệu thành công!');
            } catch (error) {
                modal.showError(`Lỗi import: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                    {serviceMode ? 'Phục vụ Bàn Bi A' : 'Quản lý Bàn Bi A'}
                </h2>
                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                    {isOwner && !serviceMode && (
                        <>
                            <button
                                onClick={() => handleOpenModal()}
                                className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm sm:text-base whitespace-nowrap"
                            >
                                + Thêm bàn
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-xs sm:text-sm whitespace-nowrap"
                                title="Export dữ liệu ra file JSON"
                            >
                                📥 Export
                            </button>
                            <label className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-xs sm:text-sm cursor-pointer whitespace-nowrap">
                                📤 Import
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    className="hidden"
                                />
                            </label>
                        </>
                    )}

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Tất cả ({stats.total})
                        </button>
                        <button
                            onClick={() => setFilterStatus('playing')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'playing'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Đang chơi ({stats.playing})
                        </button>
                        <button
                            onClick={() => setFilterStatus('empty')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'empty'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Trống ({stats.empty})
                        </button>
                        <button
                            onClick={() => setFilterStatus('maintenance')}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition whitespace-nowrap ${filterStatus === 'maintenance'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Bảo trì ({stats.maintenance})
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Tổng số bàn</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
                    <p className="text-xs sm:text-sm text-green-700 mb-1">Đang chơi</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-800">{stats.playing}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                    <p className="text-xs sm:text-sm text-blue-700 mb-1">Đang trống</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-800">{stats.empty}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                    <p className="text-xs sm:text-sm text-red-700 mb-1">Bảo trì</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-800">{stats.maintenance}</p>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <LoadingSpinner text="Đang tải dữ liệu từ API..." />
            )}

            {/* Tables Grid */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {filteredTables.map((table) => {
                        const statusConfig = getStatusConfig(table.status);
                        return (
                            <div
                                key={table.id}
                                className={`border-2 ${statusConfig.borderColor} rounded-lg p-3 sm:p-4 transition hover:shadow-lg cursor-pointer`}
                            >
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-800">{table.name}</h3>
                                    <div className={`w-3 h-3 ${statusConfig.dotColor} rounded-full`}></div>
                                </div>

                                <div className={`${statusConfig.bgColor} ${statusConfig.textColor} px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-semibold mb-2 sm:mb-3 text-center`}>
                                    {statusConfig.label}
                                </div>

                                {table.status === 'playing' && (
                                    <div className="space-y-2 mb-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Bắt đầu:</span>
                                            <span className="font-semibold text-gray-800">{table.startTime}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Thời gian:</span>
                                            <span className="font-semibold text-gray-800">
                                                {(() => {
                                                    // Sử dụng currentTime để trigger re-render khi thời gian thay đổi
                                                    const now = currentTime;
                                                    return table.startTime ? calculateDuration(table.startTime, now) : (table.duration || 0);
                                                })()} phút
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {table.status === 'empty' && (
                                    <div className="text-center py-2">
                                        <p className="text-sm text-gray-600 mb-2">Sẵn sàng phục vụ</p>
                                        {(() => {
                                            // Sử dụng currentTime để trigger re-render khi thời gian thay đổi
                                            // Giá sẽ tự động cập nhật khi currentTime thay đổi
                                            const currentPrice = getCurrentPrice(table);
                                            const timeLabel = getCurrentTimeLabel(table);
                                            return (
                                                <>
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {currentPrice.toLocaleString('vi-VN')}đ/giờ
                                                    </p>
                                                    {timeLabel && (
                                                        <p className="text-xs text-indigo-600 mt-1">
                                                            ({timeLabel})
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

                                {table.status === 'maintenance' && (
                                    <div className="text-center py-2">
                                        <p className="text-sm text-red-600">Đang bảo trì</p>
                                        <p className="text-xs text-gray-500 mt-1">Không thể sử dụng</p>
                                    </div>
                                )}

                                {table.status !== 'empty' && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        {(() => {
                                            // Sử dụng currentTime để trigger re-render khi thời gian thay đổi
                                            // Giá sẽ tự động cập nhật khi currentTime thay đổi
                                            const currentPrice = getCurrentPrice(table);
                                            const timeLabel = getCurrentTimeLabel(table);
                                            return (
                                                <p className="text-xs text-gray-600">
                                                    Giá: {currentPrice.toLocaleString('vi-VN')}đ/giờ
                                                    {timeLabel && ` (${timeLabel})`}
                                                </p>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Customer Order QR removed */}

                                {/* Action buttons */}
                                <div className="mt-4 flex gap-2 flex-wrap">
                                    {/* Chế độ phục vụ: cả owner và employee đều có thể phục vụ bàn */}
                                    {serviceMode && (
                                        <>
                                            {table.status === 'empty' && (
                                                <button
                                                    onClick={() => handleStartTable(table.id)}
                                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700 transition"
                                                >
                                                    Bắt đầu
                                                </button>
                                            )}
                                            {table.status === 'playing' && (
                                                <>
                                                    <button
                                                        onClick={() => handleEndTable(table.id)}
                                                        className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 transition"
                                                    >
                                                        Kết thúc
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenOrderModal(table)}
                                                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-700 transition"
                                                    >
                                                        🍽️ Đặt món
                                                    </button>
                                                </>
                                            )}
                                            {table.status === 'maintenance' && (
                                                <button
                                                    onClick={() => handleMaintenanceComplete(table.id)}
                                                    className="flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                                                >
                                                    Hoàn thành
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* Chế độ quản lý: owner thấy nút quản lý, employee thấy nút phục vụ */}
                                    {!serviceMode && (
                                        <>
                                            {isOwner && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenModal(table)}
                                                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(table.id)}
                                                        className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                                                    >
                                                        Xóa
                                                    </button>
                                                </>
                                            )}
                                            {!isOwner && (
                                                <>
                                                    {table.status === 'empty' && (
                                                        <button
                                                            onClick={() => handleStartTable(table.id)}
                                                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                                                        >
                                                            Bắt đầu
                                                        </button>
                                                    )}
                                                    {table.status === 'playing' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEndTable(table.id)}
                                                                className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                                                            >
                                                                Kết thúc
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenOrderModal(table)}
                                                                className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                                                            >
                                                                🍽️ Đặt món
                                                            </button>
                                                        </>
                                                    )}
                                                    {table.status === 'maintenance' && (
                                                        <button
                                                            onClick={() => handleMaintenanceComplete(table.id)}
                                                            className="flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                                                        >
                                                            Hoàn thành
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && filteredTables.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">Không có bàn nào với trạng thái này</p>
                </div>
            )}

            {/* Modal thêm/sửa bàn */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingTable ? 'Sửa bàn' : 'Thêm bàn mới'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên bàn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá mỗi giờ (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.defaultPrice || ''}
                                    onChange={(e) => setFormData({ ...formData, defaultPrice: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                    min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Giá mặc định khi không có khung giờ đặc biệt</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                <select
                                    value={formData.status || 'empty'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TableStatus })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="empty">Đang trống</option>
                                    <option value="playing">Đang chơi</option>
                                    <option value="maintenance">Bảo trì</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                                >
                                    {editingTable ? 'Cập nhật' : 'Thêm'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal tính tiền */}
            {showPaymentModal && paymentTable && paymentDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="flex flex-col lg:flex-row gap-4 justify-center items-center w-full max-w-6xl">
                        {/* Modal thanh toán */}
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full lg:flex-1">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-gray-800">Tính tiền bàn</h3>
                                <button
                                    onClick={handleCancelPayment}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Thông tin bàn */}
                                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Bàn:</span>
                                        <span className="text-xl font-bold text-indigo-700">{paymentTable.name}</span>
                                    </div>
                                </div>

                                {/* Thời gian */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <p className="text-sm text-gray-600 mb-1">Bắt đầu</p>
                                        <p className="text-lg font-semibold text-gray-800">{paymentTable.startTime}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <p className="text-sm text-gray-600 mb-1">Kết thúc</p>
                                        <p className="text-lg font-semibold text-gray-800">
                                            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Chi tiết tính tiền bàn */}
                                {paymentDetails.details.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                            <p className="font-semibold text-gray-700">Chi tiết tính tiền chơi bàn</p>
                                        </div>
                                        <div className="divide-y divide-gray-200">
                                            {paymentDetails.details.map((detail, index) => (
                                                <div key={index} className="px-4 py-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm text-gray-600">{detail.period}</span>
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            {formatDuration(detail.hours)} × {detail.price.toLocaleString('vi-VN')}đ/giờ
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-indigo-600">
                                                            {detail.amount.toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700">Tổng tiền chơi bàn:</span>
                                                <span className="text-lg font-bold text-indigo-600">
                                                    {paymentDetails.total.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Chi tiết đơn hàng */}
                                {orderDetails.length > 0 && (
                                    <div className="border border-purple-200 rounded-lg overflow-hidden">
                                        <div className="bg-purple-100 px-4 py-2 border-b border-purple-200">
                                            <p className="font-semibold text-purple-700">Chi tiết đơn hàng ({orderDetails.length} đơn)</p>
                                        </div>
                                        <div className="divide-y divide-purple-100">
                                            {orderDetails.map((order) => (
                                                <div key={order.id} className="px-4 py-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-sm font-semibold text-gray-700">Đơn #{order.id}</span>
                                                        <span className="text-sm font-bold text-purple-600">
                                                            {order.totalAmount.toLocaleString('vi-VN')}đ
                                                        </span>
                                                    </div>
                                                    {/* Chi tiết các món trong đơn */}
                                                    <div className="bg-purple-50 rounded-lg p-2 mt-2 space-y-1">
                                                        {order.items.map((item) => (
                                                            <div key={item.id} className="flex justify-between text-xs">
                                                                <span className="text-gray-700">
                                                                    {item.menuItemName} × {item.quantity}
                                                                </span>
                                                                <span className="font-semibold text-gray-800">
                                                                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 bg-purple-50 border-t border-purple-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-purple-700">Tổng tiền đơn hàng:</span>
                                                <span className="text-lg font-bold text-purple-600">
                                                    {orderTotal.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tổng tiền */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold">Tổng tiền:</span>
                                            <span className="text-3xl font-bold">
                                                {(paymentDetails.total + orderTotal).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                        {orderTotal > 0 && (
                                            <div className="text-sm text-indigo-100">
                                                ({paymentDetails.total.toLocaleString('vi-VN')}đ chơi bàn + {orderTotal.toLocaleString('vi-VN')}đ đơn hàng)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Phương thức thanh toán */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-3">Phương thức thanh toán</p>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="cash"
                                                checked={paymentMethod === 'cash'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm text-gray-700">💵 Tiền mặt</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="bank"
                                                checked={paymentMethod === 'bank'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm text-gray-700">🏦 Chuyển khoản</span>
                                        </label>
                                    </div>
                                </div>


                                {/* Nút hành động */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleCancelPayment}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={printInvoice}
                                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                                    >
                                        🖨️ In hóa đơn
                                    </button>
                                    <button
                                        onClick={handleConfirmPayment}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium text-lg"
                                    >
                                        Xác nhận thanh toán
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* QR Code thanh toán - bên cạnh modal khi chọn chuyển khoản */}
                        {paymentMethod === 'bank' && bankSettings && bankSettings.bankAccount.accountNumber && bankCode && (() => {
                            const totalAmount = paymentDetails.total + orderTotal;
                            const description = `Thanh toan ban ${paymentTable.name}`;
                            const qrCodeUrl = `https://img.vietqr.io/image/${bankCode}-${bankSettings.bankAccount.accountNumber}-s6xYIGG.png?amount=${totalAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(bankSettings.bankAccount.accountHolder)}`;

                            return (
                                <div className="bg-white rounded-lg shadow-xl p-6 w-full lg:w-auto lg:flex-shrink-0">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">QR Code thanh toán</h3>
                                    <div className="flex flex-col items-center gap-4">
                                        <img
                                            src={qrCodeUrl}
                                            alt="QR Code thanh toán"
                                            className="w-64 h-64 border-2 border-gray-300 rounded-lg bg-white p-3"
                                        />
                                        <div className="text-center space-y-2 w-full">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Ngân hàng</p>
                                                <p className="text-sm font-semibold text-gray-700">{bankSettings.bankAccount.bankName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Số tài khoản</p>
                                                <p className="text-sm font-semibold text-gray-700">{bankSettings.bankAccount.accountNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Chủ tài khoản</p>
                                                <p className="text-sm font-semibold text-gray-700">{bankSettings.bankAccount.accountHolder}</p>
                                            </div>
                                            <div className="pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                                                <p className="text-lg font-bold text-indigo-600">
                                                    {totalAmount.toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Nội dung</p>
                                                <p className="text-xs font-medium text-gray-700 break-words">
                                                    {description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Order Modal */}
            {showOrderModal && orderTable && (
                <OrderModal
                    table={orderTable}
                    onClose={handleCloseOrderModal}
                    onOrderComplete={handleOrderComplete}
                />
            )}

            {/* Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={modal.close}
                handleConfirm={modal.handleConfirm}
                message={modal.message}
                title={modal.title}
                type={modal.type}
            />
        </div>
    );
};

export default BilliardTables;



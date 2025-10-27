import { useState, useEffect } from 'react';
import { BilliardTable, TableStatus, TimePrice } from '../types/table';
import { getData, getDataSync, saveData, DB_KEYS, loadDatabaseFromFile } from '../services/database';
import { initialTables } from '../data/initialData';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

const TableManagement = () => {
    // Khởi tạo với mảng rỗng, sẽ load từ API
    const [tables, setTables] = useState<BilliardTable[]>([]);

    const [loading, setLoading] = useState(true);
    const modal = useModal();
    const [showModal, setShowModal] = useState(false);
    const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
    const [formData, setFormData] = useState<Partial<BilliardTable>>({
        name: '',
        status: 'empty',
        defaultPrice: 100000,
        timePrices: [],
    });
    const [timePriceForm, setTimePriceForm] = useState<Partial<TimePrice>>({
        startTime: '08:00',
        endTime: '17:00',
        pricePerHour: 100000,
        label: '',
    });

    // Load dữ liệu từ file JSON khi component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadDatabaseFromFile();
                const data = await getData<BilliardTable[]>(DB_KEYS.TABLES, initialTables);

                // Chuyển đổi dữ liệu cũ (pricePerHour) sang defaultPrice nếu cần
                const normalizedData = data.map(table => {
                    const defaultPrice = table.defaultPrice || table.pricePerHour || 100000;
                    return {
                        ...table,
                        defaultPrice,
                        timePrices: table.timePrices || [],
                    };
                });

                setTables(normalizedData);

                // Lưu lại dữ liệu đã normalize nếu có thay đổi (chuyển từ pricePerHour sang defaultPrice)
                const needsUpdate = data.some(t => !t.defaultPrice && t.pricePerHour);
                if (needsUpdate) {
                    saveData(DB_KEYS.TABLES, normalizedData);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Lưu dữ liệu vào localStorage mỗi khi tables thay đổi
    useEffect(() => {
        if (!loading) {
            saveData(DB_KEYS.TABLES, tables);
        }
    }, [tables, loading]);

    const handleOpenModal = (table?: BilliardTable) => {
        if (table) {
            setEditingTable(table);
            setFormData({
                ...table,
                defaultPrice: table.defaultPrice || table.pricePerHour || 100000,
                timePrices: table.timePrices || [],
            });
        } else {
            setEditingTable(null);
            setFormData({
                name: '',
                status: 'empty',
                defaultPrice: 100000,
                timePrices: [],
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTable(null);
    };

    const handleAddTimePrice = () => {
        if (!timePriceForm.startTime || !timePriceForm.endTime || !timePriceForm.pricePerHour || !timePriceForm.label) {
            modal.showError('Vui lòng điền đầy đủ thông tin khoảng thời gian');
            return;
        }

        // Kiểm tra xung đột thời gian
        const newStart = timePriceForm.startTime!;
        const newEnd = timePriceForm.endTime!;

        const hasConflict = (formData.timePrices || []).some(tp => {
            const existingStart = tp.startTime;
            const existingEnd = tp.endTime;
            // Kiểm tra xem có overlap không
            return (newStart >= existingStart && newStart < existingEnd) ||
                (newEnd > existingStart && newEnd <= existingEnd) ||
                (newStart <= existingStart && newEnd >= existingEnd);
        });

        if (hasConflict) {
            modal.showError('Khoảng thời gian này đã trùng với khoảng thời gian khác. Vui lòng chọn khoảng thời gian khác.');
            return;
        }

        // Tạo ID mới dựa trên max ID hiện có
        const currentTimePrices = formData.timePrices || [];
        const maxId = currentTimePrices.length > 0
            ? Math.max(...currentTimePrices.map(tp => tp.id))
            : 0;

        const newTimePrice: TimePrice = {
            id: maxId + 1,
            startTime: timePriceForm.startTime!,
            endTime: timePriceForm.endTime!,
            pricePerHour: timePriceForm.pricePerHour!,
            label: timePriceForm.label!,
        };

        setFormData({
            ...formData,
            timePrices: [...currentTimePrices, newTimePrice].sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
            ),
        });

        setTimePriceForm({
            startTime: '08:00',
            endTime: '17:00',
            pricePerHour: formData.defaultPrice || 100000,
            label: '',
        });
    };

    const handleRemoveTimePrice = (id: number) => {
        setFormData({
            ...formData,
            timePrices: formData.timePrices?.filter(tp => tp.id !== id) || [],
        });
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
                        timePrices: formData.timePrices || [],
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
                timePrices: formData.timePrices || [],
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

    const stats = {
        total: tables.length,
        playing: tables.filter(t => t.status === 'playing').length,
        empty: tables.filter(t => t.status === 'empty').length,
        maintenance: tables.filter(t => t.status === 'maintenance').length,
    };

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

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Bàn Bi A</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                    + Thêm bàn
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Tổng số bàn</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Đang chơi</p>
                    <p className="text-2xl font-bold text-green-800">{stats.playing}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Đang trống</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.empty}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm text-red-700 mb-1">Bảo trì</p>
                    <p className="text-2xl font-bold text-red-800">{stats.maintenance}</p>
                </div>
            </div>

            {/* Tables List */}
            {loading ? (
                <LoadingSpinner text="Đang tải dữ liệu từ API..." />
            ) : tables.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">Chưa có bàn nào</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Thêm bàn đầu tiên
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên bàn</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá/giờ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tables.map((table) => {
                                const statusConfig = getStatusConfig(table.status);
                                return (
                                    <tr key={table.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{table.name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                {statusConfig.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">
                                                    Mặc định: {(table.defaultPrice || table.pricePerHour || 0).toLocaleString('vi-VN')}đ/giờ
                                                </span>
                                                {table.timePrices && table.timePrices.length > 0 && (
                                                    <span className="text-xs text-indigo-600">
                                                        + {table.timePrices.length} khung giờ đặc biệt
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(table)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(table.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal thêm/sửa bàn */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                                    Giá mặc định/giờ (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.defaultPrice || ''}
                                    onChange={(e) => setFormData({ ...formData, defaultPrice: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                    min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Giá này sẽ áp dụng khi không có khoảng thời gian nào khớp</p>
                            </div>

                            {/* Quản lý giá theo khoảng thời gian */}
                            <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Giá theo khoảng thời gian (Tùy chọn)
                                    </label>
                                    {formData.timePrices && formData.timePrices.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                            Đã thêm {formData.timePrices.length} khung giờ
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    Thiết lập giá khác nhau cho các khung giờ trong ngày. Giá sẽ tự động áp dụng khi khách chơi trong khoảng thời gian đó.
                                </p>

                                {/* Form thêm khoảng thời gian */}
                                <div className="bg-indigo-50 p-4 rounded-lg mb-3 border border-indigo-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Thêm khung giờ mới</h4>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Từ giờ</label>
                                            <input
                                                type="time"
                                                value={timePriceForm.startTime || ''}
                                                onChange={(e) => setTimePriceForm({ ...timePriceForm, startTime: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Đến giờ</label>
                                            <input
                                                type="time"
                                                value={timePriceForm.endTime || ''}
                                                onChange={(e) => setTimePriceForm({ ...timePriceForm, endTime: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Nhãn mô tả</label>
                                            <input
                                                type="text"
                                                value={timePriceForm.label || ''}
                                                onChange={(e) => setTimePriceForm({ ...timePriceForm, label: e.target.value })}
                                                placeholder="VD: Sáng, Chiều, Tối, Ca đêm"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Giá/giờ (VNĐ)</label>
                                            <input
                                                type="number"
                                                value={timePriceForm.pricePerHour || ''}
                                                onChange={(e) => setTimePriceForm({ ...timePriceForm, pricePerHour: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddTimePrice}
                                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        + Thêm khung giờ
                                    </button>
                                </div>

                                {/* Danh sách khoảng thời gian đã thêm */}
                                {formData.timePrices && formData.timePrices.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Các khung giờ đã thiết lập:</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                                            {formData.timePrices.map((tp) => (
                                                <div key={tp.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-sm text-gray-800">{tp.label}</span>
                                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                                                {tp.startTime} - {tp.endTime}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-bold text-indigo-600">
                                                            {tp.pricePerHour.toLocaleString('vi-VN')}đ/giờ
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTimePrice(tp.id)}
                                                        className="ml-3 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition"
                                                        title="Xóa khung giờ này"
                                                    >
                                                        ✕ Xóa
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

export default TableManagement;


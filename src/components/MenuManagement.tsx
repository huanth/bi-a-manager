import { useState, useEffect } from 'react';
import { MenuItem } from '../types/order';
import { getData, saveData, DB_KEYS } from '../services/database';
import { initialMenu } from '../data/menuData';
import LoadingSpinner from './LoadingSpinner';

const MenuManagement = () => {
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        name: '',
        category: 'food',
        price: 0,
        description: '',
        isActive: true,
    });
    const [filterCategory, setFilterCategory] = useState<'all' | 'food' | 'drink'>('all');

    useEffect(() => {
        const loadMenu = async () => {
            try {
                const data = await getData<MenuItem[]>(DB_KEYS.MENU, initialMenu);
                setMenu(data);
            } catch (error) {
                console.error('Error loading menu:', error);
                setMenu(initialMenu);
            } finally {
                setLoading(false);
            }
        };
        loadMenu();
    }, []);

    // Lưu menu khi có thay đổi
    useEffect(() => {
        if (!loading && menu.length > 0) {
            saveData(DB_KEYS.MENU, menu);
        }
    }, [menu, loading]);

    const filteredMenu = filterCategory === 'all'
        ? menu
        : menu.filter(item => item.category === filterCategory);

    const handleOpenModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                category: 'food',
                price: 0,
                description: '',
                isActive: true,
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (editingItem) {
            // Update existing item
            setMenu(menu.map(item =>
                item.id === editingItem.id
                    ? { ...formData, id: editingItem.id } as MenuItem
                    : item
            ));
        } else {
            // Add new item
            const newId = menu.length > 0 ? Math.max(...menu.map(m => m.id)) + 1 : 1;
            const newItem: MenuItem = {
                id: newId,
                name: formData.name!,
                category: formData.category || 'food',
                price: formData.price!,
                description: formData.description,
                isActive: formData.isActive !== false,
            };
            setMenu([...menu, newItem]);
        }

        handleCloseModal();
    };

    const handleDelete = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa món này?')) {
            setMenu(menu.filter(item => item.id !== id));
        }
    };

    const handleToggleActive = (id: number) => {
        setMenu(menu.map(item =>
            item.id === id
                ? { ...item, isActive: !item.isActive }
                : item
        ));
    };

    const stats = {
        total: menu.length,
        food: menu.filter(m => m.category === 'food').length,
        drink: menu.filter(m => m.category === 'drink').length,
        active: menu.filter(m => m.isActive !== false).length,
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <p>Đang tải...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Menu</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                    + Thêm món mới
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Tổng số món</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-orange-700 mb-1">Đồ ăn</p>
                    <p className="text-2xl font-bold text-orange-800">{stats.food}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Nước uống</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.drink}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Đang hoạt động</p>
                    <p className="text-2xl font-bold text-green-800">{stats.active}</p>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterCategory === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Tất cả ({stats.total})
                </button>
                <button
                    onClick={() => setFilterCategory('food')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterCategory === 'food'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    🍕 Đồ ăn ({stats.food})
                </button>
                <button
                    onClick={() => setFilterCategory('drink')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filterCategory === 'drink'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    🥤 Nước uống ({stats.drink})
                </button>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMenu.map((item) => (
                    <div
                        key={item.id}
                        className={`border-2 rounded-lg p-4 transition ${item.isActive !== false
                            ? 'border-gray-200 hover:shadow-md'
                            : 'border-gray-300 bg-gray-50 opacity-60'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${item.category === 'food'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {item.category === 'food' ? '🍕 Đồ ăn' : '🥤 Nước uống'}
                                    </span>
                                    {item.isActive === false && (
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                                            Đã ẩn
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="text-xl font-bold text-indigo-600">
                                {item.price.toLocaleString('vi-VN')}đ
                            </span>
                        </div>

                        {item.description && (
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        )}

                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => handleOpenModal(item)}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                            >
                                Sửa
                            </button>
                            <button
                                onClick={() => handleToggleActive(item.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${item.isActive !== false
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                            >
                                {item.isActive !== false ? 'Ẩn' : 'Hiện'}
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="px-4 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredMenu.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">Không có món nào</p>
                </div>
            )}

            {/* Modal thêm/sửa món */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingItem ? 'Sửa món' : 'Thêm món mới'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên món <span className="text-red-500">*</span>
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
                                    Loại <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.category || 'food'}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'food' | 'drink' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="food">🍕 Đồ ăn</option>
                                    <option value="drink">🥤 Nước uống</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá (VNĐ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.price || ''}
                                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive !== false}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                                    Hiển thị trong menu
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                                >
                                    {editingItem ? 'Cập nhật' : 'Thêm'}
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
        </div>
    );
};

export default MenuManagement;


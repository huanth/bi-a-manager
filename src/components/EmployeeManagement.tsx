import { useState, useEffect } from 'react';
import { Employee } from '../types/employee';
import { UserAccount } from '../types/user';
import { getData, saveData, DB_KEYS, loadDatabaseFromFile, exportToJSON } from '../services/database';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<Partial<Employee>>({
        fullName: '',
        phone: '',
        username: '',
        password: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
    });

    // Load employees từ database
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadDatabaseFromFile();
                const data = await getData<Employee[]>(DB_KEYS.EMPLOYEES, []);
                setEmployees(data);
            } catch (error) {
                console.error('Error loading employees:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Lưu vào database khi có thay đổi
    useEffect(() => {
        if (!loading) {
            saveData(DB_KEYS.EMPLOYEES, employees);
        }
    }, [employees, loading]);

    const handleOpenModal = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData(employee);
        } else {
            setEditingEmployee(null);
            setFormData({
                fullName: '',
                phone: '',
                username: '',
                password: '',
                status: 'active',
                startDate: new Date().toISOString().split('T')[0],
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmployee(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fullName || !formData.phone || !formData.username || !formData.password) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        try {
            if (editingEmployee) {
                // Update existing employee
                const updatedEmployee = { ...editingEmployee, ...formData } as Employee;
                setEmployees(employees.map(emp =>
                    emp.id === editingEmployee.id ? updatedEmployee : emp
                ));

                // Update user account
                const users = await getData<UserAccount[]>(DB_KEYS.USERS, []);
                const updatedUsers = users.map(user =>
                    user.username === editingEmployee.username
                        ? { ...user, username: updatedEmployee.username, password: updatedEmployee.password, fullName: updatedEmployee.fullName }
                        : user
                );
                saveData(DB_KEYS.USERS, updatedUsers);
            } else {
                // Check if username already exists
                const users = await getData<UserAccount[]>(DB_KEYS.USERS, []);
                const usernameExists = users.some(u => u.username.toLowerCase() === formData.username!.toLowerCase());

                if (usernameExists) {
                    alert('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
                    return;
                }

                // Add new employee
                const newEmployee: Employee = {
                    id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1,
                    fullName: formData.fullName!,
                    phone: formData.phone!,
                    username: formData.username!,
                    password: formData.password!,
                    status: formData.status || 'active',
                    startDate: formData.startDate || new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString().split('T')[0],
                };
                setEmployees([...employees, newEmployee]);

                // Create user account for login
                const newUser: UserAccount = {
                    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                    username: newEmployee.username,
                    password: newEmployee.password,
                    role: 'employee',
                    fullName: newEmployee.fullName,
                    createdAt: new Date().toISOString().split('T')[0],
                };
                saveData(DB_KEYS.USERS, [...users, newUser]);
            }

            handleCloseModal();
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Có lỗi xảy ra khi lưu thông tin nhân viên');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
            const employee = employees.find(emp => emp.id === id);

            // Xóa nhân viên
            setEmployees(employees.filter(emp => emp.id !== id));

            // Xóa tài khoản đăng nhập nếu có
            if (employee?.username) {
                try {
                    const users = await getData<UserAccount[]>(DB_KEYS.USERS, []);
                    const updatedUsers = users.filter(user => user.username !== employee.username);
                    saveData(DB_KEYS.USERS, updatedUsers);
                } catch (error) {
                    console.error('Error deleting user account:', error);
                }
            }
        }
    };

    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const inactiveEmployees = employees.filter(e => e.status === 'inactive').length;
    const [showJsonData, setShowJsonData] = useState(false);
    const [jsonData, setJsonData] = useState('');

    const handleShowJsonData = async () => {
        try {
            const db = await loadDatabaseFromFile();
            const employeesData = await getData<Employee[]>(DB_KEYS.EMPLOYEES, []);
            const usersData = await getData<UserAccount[]>(DB_KEYS.USERS, []);

            const dataToShow = {
                ...db,
                employees: employeesData,
                users: usersData,
            };

            setJsonData(JSON.stringify(dataToShow, null, 2));
            setShowJsonData(true);
        } catch (error) {
            console.error('Error loading JSON data:', error);
            alert('Lỗi khi tải dữ liệu JSON');
        }
    };

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonData);
        alert('Đã copy dữ liệu JSON vào clipboard! Bạn có thể paste vào file database.json');
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Nhân viên</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleShowJsonData}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                        title="Xem dữ liệu JSON để copy vào file"
                    >
                        📋 Xem JSON
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                await exportToJSON();
                                alert('Đã export dữ liệu ra file database.json');
                            } catch (error) {
                                alert('Lỗi khi export dữ liệu');
                            }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        title="Export dữ liệu ra file JSON"
                    >
                        📥 Export JSON
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                    >
                        + Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Tổng số nhân viên</p>
                    <p className="text-2xl font-bold text-blue-800">{employees.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Đang làm việc</p>
                    <p className="text-2xl font-bold text-green-800">{activeEmployees}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 mb-1">Đã nghỉ việc</p>
                    <p className="text-2xl font-bold text-gray-800">{inactiveEmployees}</p>
                </div>
            </div>

            {/* Employee List */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Đang tải dữ liệu...</p>
                </div>
            ) : employees.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">Chưa có nhân viên nào</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Thêm nhân viên đầu tiên
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số điện thoại</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tài khoản</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày bắt đầu</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {employees.map((employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{employee.fullName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{employee.phone}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{employee.username}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${employee.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {employee.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{employee.startDate}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenModal(employee)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(employee.id)}
                                                className="text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            {editingEmployee ? 'Sửa nhân viên' : 'Thêm nhân viên'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ tên <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName || ''}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số điện thoại <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tài khoản đăng nhập <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.username || ''}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                    disabled={!!editingEmployee}
                                />
                                {editingEmployee && (
                                    <p className="text-xs text-gray-500 mt-1">Không thể thay đổi tài khoản đăng nhập</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    value={formData.password || ''}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                <select
                                    value={formData.status || 'active'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="active">Đang làm việc</option>
                                    <option value="inactive">Đã nghỉ việc</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    value={formData.startDate || ''}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                                >
                                    {editingEmployee ? 'Cập nhật' : 'Thêm'}
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

            {/* JSON Data Modal */}
            {showJsonData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Dữ liệu JSON</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyJson}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                                >
                                    📋 Copy
                                </button>
                                <button
                                    onClick={() => setShowJsonData(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border border-gray-200">
                                <code>{jsonData}</code>
                            </pre>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p className="font-semibold mb-1">Hướng dẫn:</p>
                            <p>1. Click "Copy" để copy dữ liệu vào clipboard</p>
                            <p>2. Mở file <code className="bg-blue-100 px-1 rounded">public/database.json</code></p>
                            <p>3. Paste và thay thế toàn bộ nội dung file</p>
                            <p>4. Lưu file để áp dụng thay đổi</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;


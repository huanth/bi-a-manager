import { useState, useEffect } from 'react';
import { Employee } from '../types/employee';
import { UserAccount } from '../types/user';
import { getData, saveData, DB_KEYS, loadDatabaseFromFile, exportToJSON } from '../services/database';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const modal = useModal();
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

        if (!formData.fullName || !formData.phone) {
            modal.showError('Vui lòng điền đầy đủ thông tin bắt buộc (Họ tên và Số điện thoại)');
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
                        ? { ...user, username: updatedEmployee.username, password: updatedEmployee.password || user.password, fullName: updatedEmployee.fullName }
                        : user
                );
                await saveData(DB_KEYS.USERS, updatedUsers);
                modal.showSuccess('Cập nhật nhân viên thành công!');
            } else {
                // Load users để kiểm tra và tạo tài khoản
                const users = await getData<UserAccount[]>(DB_KEYS.USERS, []);

                // Tự động tạo username nếu không nhập (dựa trên số điện thoại hoặc tên)
                let username = formData.username?.trim();
                if (!username) {
                    // Tạo username từ số điện thoại (bỏ số 0 đầu và các ký tự đặc biệt)
                    const phoneClean = formData.phone!.replace(/\D/g, '').replace(/^0+/, '');
                    username = `nv${phoneClean}`;

                    // Kiểm tra xem username đã tồn tại chưa, nếu có thì thêm số vào cuối
                    let finalUsername = username;
                    let counter = 1;
                    while (users.some(u => u.username.toLowerCase() === finalUsername.toLowerCase())) {
                        finalUsername = `${username}${counter}`;
                        counter++;
                    }
                    username = finalUsername;
                } else {
                    // Kiểm tra username đã tồn tại chưa
                    const usernameExists = users.some(u => u.username.toLowerCase() === username!.toLowerCase());
                    if (usernameExists) {
                        modal.showError('Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.');
                        return;
                    }
                }

                // Tự động tạo mật khẩu nếu không nhập (mặc định: 123456)
                const password = formData.password?.trim() || '123456';

                // Tạo user account TRƯỚC
                const newUser: UserAccount = {
                    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
                    username: username,
                    password: password,
                    role: 'employee',
                    fullName: formData.fullName!,
                    createdAt: new Date().toISOString().split('T')[0],
                };

                // Lưu user vào database TRƯỚC khi tạo employee
                await saveData(DB_KEYS.USERS, [...users, newUser]);

                // Sau đó mới tạo employee
                const newEmployee: Employee = {
                    id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1,
                    fullName: formData.fullName!,
                    phone: formData.phone!,
                    username: username,
                    password: password,
                    status: formData.status || 'active',
                    startDate: formData.startDate || new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString().split('T')[0],
                };

                // Cập nhật state employees (useEffect sẽ tự động lưu vào database)
                setEmployees([...employees, newEmployee]);

                // Hiển thị thông tin tài khoản đã tạo
                modal.showSuccess(`Đã tạo tài khoản đăng nhập:\n\nTài khoản: ${username}\nMật khẩu: ${password}\n\nVui lòng ghi nhớ thông tin này để đăng nhập!`);
            }

            handleCloseModal();
        } catch (error) {
            console.error('Error saving employee:', error);
            modal.showError('Có lỗi xảy ra khi lưu thông tin nhân viên');
        }
    };

    const handleDelete = async (id: number) => {
        modal.showConfirm('Bạn có chắc chắn muốn xóa nhân viên này? Tài khoản đăng nhập cũng sẽ bị xóa.', async () => {
            const employee = employees.find(emp => emp.id === id);

            if (!employee) {
                modal.showError('Không tìm thấy nhân viên cần xóa');
                return;
            }

            // Xóa tài khoản đăng nhập TRƯỚC
            if (employee.username) {
                try {
                    const users = await getData<UserAccount[]>(DB_KEYS.USERS, []);
                    const updatedUsers = users.filter(user => user.username !== employee.username);
                    await saveData(DB_KEYS.USERS, updatedUsers);
                } catch (error) {
                    console.error('Error deleting user account:', error);
                    modal.showError('Có lỗi khi xóa tài khoản đăng nhập. Quá trình xóa nhân viên đã bị hủy.');
                    return;
                }
            }

            // Sau đó mới xóa nhân viên (useEffect sẽ tự động lưu vào database)
            setEmployees(employees.filter(emp => emp.id !== id));
            modal.showSuccess('Xóa nhân viên thành công!');
        });
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
            modal.showError('Lỗi khi tải dữ liệu JSON');
        }
    };

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonData);
        modal.showSuccess('Đã copy dữ liệu JSON vào clipboard! Bạn có thể paste vào file database.json');
    };

    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Quản lý Nhân viên</h2>
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
                                modal.showSuccess('Đã export dữ liệu ra file database.json');
                            } catch (error) {
                                modal.showError('Lỗi khi export dữ liệu');
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
                                    Tài khoản đăng nhập {!editingEmployee && <span className="text-gray-500 text-xs">(Tùy chọn - sẽ tự động tạo)</span>}
                                </label>
                                <input
                                    type="text"
                                    value={formData.username || ''}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder={editingEmployee ? '' : 'Để trống để tự động tạo từ số điện thoại'}
                                    disabled={!!editingEmployee}
                                />
                                {editingEmployee && (
                                    <p className="text-xs text-gray-500 mt-1">Không thể thay đổi tài khoản đăng nhập</p>
                                )}
                                {!editingEmployee && (
                                    <p className="text-xs text-gray-500 mt-1">Nếu để trống, hệ thống sẽ tự động tạo tài khoản từ số điện thoại</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mật khẩu {!editingEmployee && <span className="text-gray-500 text-xs">(Tùy chọn - mặc định: 123456)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password || ''}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder={editingEmployee ? '' : 'Để trống để dùng mật khẩu mặc định: 123456'}
                                />
                                {!editingEmployee && (
                                    <p className="text-xs text-gray-500 mt-1">Nếu để trống, mật khẩu mặc định là: 123456</p>
                                )}
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

export default EmployeeManagement;


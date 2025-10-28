# 🎱 BI A Manager - Hệ thống Quản lý Quán Bi-a

Hệ thống quản lý quán bi-a hiện đại được xây dựng bằng React + TypeScript, hỗ trợ quản lý bàn bi-a, đơn hàng, menu, nhân viên và theo dõi doanh thu.

## ✨ Tính năng chính

### 🎯 Quản lý Bàn Bi-a
- Theo dõi trạng thái bàn (đang chơi, trống, bảo trì)
- Tính giá tự động theo khung giờ (Sáng/Chiều/Tối)
- Thanh toán bàn với chi tiết thời gian chơi
- Quản lý nhiều bàn cùng lúc
- Tính tổng tiền bao gồm cả đơn hàng

### 📋 Quản lý Đơn hàng
- Theo dõi trạng thái đơn hàng (Chờ xử lý, Hoàn thành)
- Xem chi tiết đơn hàng và tổng tiền
- Tích hợp với quy trình thanh toán bàn

### 🍕 Quản lý Menu
- Thêm/sửa/xóa món ăn và nước uống
- Phân loại theo category (Đồ ăn/Nước uống)
- Quản lý giá và mô tả món
- Bật/tắt hiển thị món trong menu

### 👥 Quản lý Nhân viên
- Thêm/sửa/xóa thông tin nhân viên
- Tự động tạo tài khoản đăng nhập
- Phân quyền Owner/Employee
- Quản lý trạng thái nhân viên (Active/Inactive)

### 📊 Thống kê Doanh thu
- Xem tổng doanh thu
- Thống kê theo ngày/tuần/tháng
- Theo dõi doanh thu từ bàn và đơn hàng
- Export dữ liệu JSON

### 💳 Thanh toán & QR Code
- Thanh toán bằng tiền mặt hoặc chuyển khoản
- Tự động tạo QR Code thanh toán (VietQR)
- QR Code bao gồm: số tiền, nội dung, thông tin ngân hàng
- Hiển thị QR Code bên cạnh modal thanh toán
- Tích hợp với 55+ ngân hàng Việt Nam

### ⚙️ Cài đặt
- Cấu hình thông tin ngân hàng để nhận thanh toán
- Chọn ngân hàng từ danh sách đầy đủ các ngân hàng VN
- Nhập số tài khoản và chủ tài khoản
- Tự động tạo QR Code khi khách thanh toán

### 🔐 Phân quyền
- **Owner (Chủ cửa hàng)**: Toàn quyền quản lý
- **Employee (Nhân viên)**: Chỉ phục vụ bàn và quản lý đơn hàng

## 🛠️ Công nghệ sử dụng

- **Frontend Framework**: React 18.2.0
- **Language**: TypeScript 5.2.2
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.0
- **State Management**: React Context API + Hooks
- **Routing**: React Router DOM 6.21.1

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 16.x
- npm hoặc yarn

### Cài đặt dependencies

```bash
npm install
```

## 🚀 Chạy dự án

### Development mode

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

### Build production

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

### Lint code

```bash
npm run lint
```

## 📁 Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── BilliardTables.tsx       # Quản lý và phục vụ bàn bi-a
│   ├── Dashboard.tsx            # Trang chủ với tabs
│   ├── OrderManagement.tsx      # Quản lý đơn hàng
│   ├── TableManagement.tsx      # CRUD bàn bi-a
│   ├── MenuManagement.tsx       # Quản lý menu
│   ├── EmployeeManagement.tsx   # Quản lý nhân viên
│   ├── RevenueStats.tsx         # Thống kê doanh thu
│   ├── Login.tsx                # Đăng nhập
│   ├── OrderModal.tsx           # Modal đặt món
│   ├── Modal.tsx                # Modal component
│   ├── Toast.tsx                # Toast notification component
│   └── ToastContainer.tsx       # Toast container
├── contexts/
│   ├── AuthContext.tsx          # Authentication context
│   └── ToastContext.tsx          # Toast context
├── hooks/
│   ├── useModal.ts              # Hook quản lý modal
│   └── useToast.ts              # Hook quản lý toast
├── services/
│   ├── database.ts              # API service (GET/POST)
│   └── authService.ts           # Authentication service
├── types/                       # TypeScript type definitions
├── utils/
│   └── pricing.ts               # Logic tính giá theo khung giờ
└── data/
    └── initialData.ts           # Dữ liệu mặc định
```

## 🔧 Cấu hình

### Environment Variables

Tạo file `.env` ở thư mục gốc:

```env
VITE_API_URL=https://your-api-domain.com
```

Xem thêm chi tiết trong `README_ENV.md`

### API Configuration

Backend API endpoint được cấu hình trong `vite.config.ts`:

- **Development**: Sử dụng proxy `/api` → `https://bi-a.one-triple-nine.top`
- **Production**: Sử dụng `VITE_API_URL` từ `.env`

## 💡 Tính năng UI/UX

### Toast Notifications
- Thông báo thành công/lỗi tự động biến mất
- Animation mượt mà
- Hiển thị ở góc trên bên phải
- Hỗ trợ nhiều loại: success, error, warning, info

### Modal Confirmations
- Xác nhận các hành động quan trọng
- UI đẹp mắt với icon và màu sắc phù hợp

### Responsive Design
- Tối ưu cho cả desktop và mobile
- Tailwind CSS utility classes

## 📱 Chức năng theo vai trò

### Owner (Chủ cửa hàng)
- ✅ Phục vụ bàn bi-a
- ✅ Quản lý bàn (CRUD)
- ✅ Cài đặt khung giờ và giá cho từng bàn
- ✅ Quản lý đơn hàng
- ✅ Quản lý menu
- ✅ Quản lý nhân viên
- ✅ Xem thống kê doanh thu
- ✅ Cài đặt thông tin ngân hàng
- ✅ Export/Import dữ liệu

### Employee (Nhân viên)
- ✅ Phục vụ bàn bi-a
- ✅ Quản lý đơn hàng

## 🔒 Bảo mật

- Authentication với username/password
- Phân quyền theo vai trò
- Session management với localStorage
- API endpoints có thể cấu hình authentication
- Tất cả dữ liệu được lưu trữ trên backend API (không dùng localStorage)

## 📝 Ghi chú

- Dữ liệu được lưu trữ trên backend API
- Mỗi lần thay đổi sẽ sync toàn bộ JSON lên server
- Hỗ trợ export/import dữ liệu JSON
- Real-time updates qua custom events
- Tính giá tự động:
  - Bàn không có khung giờ: tính theo giá mặc định
  - Bàn có khung giờ: tính theo khung giờ đã cài đặt
  - Thời gian không nằm trong khung giờ: tính theo giá mặc định
- QR Code thanh toán:
  - Format: `https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NO}-compact.png`
  - Tự động thêm số tiền, nội dung và tên chủ tài khoản vào QR Code

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

## 📄 License

Private project

---

**Version**: 1.0.0  
**Last Updated**: 2025

## 🆕 Changelog

### Version 1.0.0 (2025)
- ✨ Thêm tính năng QR Code thanh toán tự động
- ✨ Cải thiện tính giá theo khung giờ
- ✨ Thêm cài đặt thông tin ngân hàng
- 🎨 Cải thiện UI/UX modal thanh toán
- 🐛 Sửa lỗi tính giá khi chơi qua nhiều khung giờ
- 🧹 Loại bỏ console.log trong production
- 🚀 Optimize build size
- 📱 Responsive design cho QR Code thanh toán

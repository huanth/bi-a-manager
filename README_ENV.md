# Cấu hình Environment Variables và API

## Tạo file .env

Tạo file `.env` ở thư mục gốc của project với nội dung:

```env
VITE_API_URL=https://your-api-domain.com
```

## Cấu hình CORS

### Development Mode
Trong development, ứng dụng sử dụng Vite proxy để tránh lỗi CORS:
- Proxy được cấu hình trong `vite.config.ts`
- Tất cả requests đến `/api` sẽ được proxy đến server thực tế
- Cập nhật `target` trong `vite.config.ts` theo API server của bạn

### Production Mode
Trong production, sử dụng API_URL từ file `.env`
- Đảm bảo server backend hỗ trợ CORS với headers:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Accept
  ```

## API Endpoints

### GET `/database` hoặc `/`
Lấy toàn bộ dữ liệu từ server
- Response: JSON object chứa tất cả dữ liệu (tables, orders, menu, revenue, ...)

### POST `/database` hoặc `/`
Lưu toàn bộ dữ liệu lên server
- Body: JSON object chứa tất cả dữ liệu
- Response: Success message

## Cách hoạt động

### Development
- Client gọi: `GET /api/database`
- Vite proxy chuyển thành: `GET https://bi-a.one-triple-nine.top`
- Tránh được lỗi CORS

### Production
- Client gọi trực tiếp: `GET https://your-api-domain.com/database`
- Server cần hỗ trợ CORS

## Lưu ý

- Nếu API không khả dụng, ứng dụng sẽ tự động fallback về localStorage
- Dữ liệu vẫn được lưu vào localStorage để đảm bảo hoạt động offline
- Mỗi khi có thay đổi dữ liệu, toàn bộ JSON sẽ được POST lên API
- Để thay đổi API URL, cập nhật `target` trong `vite.config.ts` (dev) hoặc file `.env` (production)


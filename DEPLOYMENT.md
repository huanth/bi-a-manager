# Hướng dẫn Deploy

## Vấn đề 404 khi truy cập `/order/:id`

Khi deploy lên production, các route như `/order/:id` có thể bị lỗi 404 vì server không biết cách xử lý React Router.

## Giải pháp

### 1. Apache (.htaccess đã được tạo sẵn)

File `.htaccess` đã được tạo trong `public/.htaccess` và sẽ tự động được copy vào `dist/.htaccess` khi build.

Nếu vẫn bị 404:
- Đảm bảo Apache đã bật mod_rewrite
- Kiểm tra AllowOverride được set là All hoặc FileInfo

```apache
# Trong file cấu hình Apache (httpd.conf hoặc .htaccess)
AllowOverride All
```

### 2. Nginx

Nếu server sử dụng Nginx, thêm vào file cấu hình:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Xem file `nginx.conf.example` để biết cấu hình đầy đủ.

### 3. Kiểm tra sau khi deploy

1. Build: `npm run build`
2. Upload thư mục `dist/` lên server
3. Truy cập: `https://your-domain.com/order/1` (thay 1 bằng ID bàn thực tế)
4. Nếu vẫn 404, kiểm tra server logs

## Cấu trúc file cần upload

```
dist/
├── index.html
├── .htaccess (quan trọng!)
├── assets/
├── manifest.webmanifest
├── registerSW.js
└── sw.js
```

## Kiểm tra

Sau khi deploy, test các route:
- ✅ `/` - Trang chủ
- ✅ `/order/1` - Order từ bàn 1
- ✅ `/order/2` - Order từ bàn 2
- ✅ QR code phải hoạt động


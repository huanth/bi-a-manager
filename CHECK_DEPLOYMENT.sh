#!/bin/bash

echo "🔍 Kiểm tra deployment..."
echo ""

# Check .htaccess
if [ -f "dist/.htaccess" ]; then
    echo "✅ File .htaccess có trong dist/"
else
    echo "❌ File .htaccess KHÔNG có trong dist/"
    echo "   Hãy build lại: npm run build"
fi

# Check index.html
if [ -f "dist/index.html" ]; then
    echo "✅ File index.html có trong dist/"
else
    echo "❌ File index.html KHÔNG có trong dist/"
fi

# Check assets
if [ -d "dist/assets" ]; then
    echo "✅ Thư mục assets có trong dist/"
else
    echo "❌ Thư mục assets KHÔNG có trong dist/"
fi

echo ""
echo "📋 Các file cần upload lên server:"
echo "   - dist/ (toàn bộ thư mục)"
echo ""
echo "🔗 Test sau khi deploy:"
echo "   1. https://your-domain.com/"
echo "   2. https://your-domain.com/order/1"
echo "   3. Quét QR code từ bàn"
echo ""
echo "❓ Nếu vẫn bị 404:"
echo "   1. Kiểm tra server có bật mod_rewrite (Apache)"
echo "   2. Kiểm tra AllowOverride All (Apache)"
echo "   3. Xem file DEPLOYMENT.md để biết thêm"


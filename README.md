# ☁️ VŨ CLOUD — Kho lưu trữ cá nhân

Ứng dụng web riêng tư có giao diện kiểu Google Drive: tạo thư mục, tải tệp lên/xuống, tìm kiếm trong thư mục, đổi tên, xóa, đăng nhập bằng mật khẩu. Mã nguồn nằm trong GitHub; **file cá nhân được lưu trên ổ cứng laptop Windows, không phải trong GitHub**.

## Cài trên Windows

1. Cài [Node.js LTS](https://nodejs.org/).
2. Chọn **Code → Download ZIP** tại repo này, giải nén. Mở Terminal trong thư mục.
3. Chạy `npm install`.
4. Tạo file `.env` bằng cách sao chép `.env.example`. Sửa `CLOUD_STORAGE_DIR=D:/VU-CLOUD` nếu cần.
5. Tạo mật khẩu (12 ký tự trở lên): `npm run hash -- "mat-khau-rat-dai-cua-ban"`. Điền mã hash kết quả vào `CLOUD_ADMIN_PASSWORD_HASH`.
6. Tạo khóa bí mật: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Dán vào `SESSION_SECRET`.
7. Chạy `npm start`; mở **http://localhost:3000** và đăng nhập tài khoản `admin`.

## Truy cập bằng iPhone 5G

Cài [Tailscale](https://tailscale.com/download) trên cả Windows và iPhone, đăng nhập cùng tài khoản. Trên laptop chạy PowerShell:

```powershell
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

Trên iPhone mở địa chỉ HTTPS `*.ts.net` xuất hiện trong kết quả, khi Tailscale đang bật. Đặt `COOKIE_SECURE=true` trong `.env` rồi khởi động lại máy chủ để cookie chỉ gửi qua HTTPS.

## Quan trọng

- Laptop phải bật, Node.js server đang chạy, Tailscale hoạt động mới truy cập từ xa được.
- Dung lượng thực tế phụ thuộc ổ cứng. GitHub repo không cung cấp dung lượng đám mây 100GB–1TB.
- Chỉ dành cho tài khoản cá nhân, không đưa trực tiếp ra Internet công khai.
- Upload giới hạn **128 MB mỗi tệp**, tối đa 10 tệp/lượt trong bản v1; chưa hỗ trợ video nhiều GB.
- Không chuyển được toàn bộ ứng dụng/game trên iPhone sang đây để chạy từ xa.
- Sao lưu thư mục dữ liệu sang ổ cứng khác. Chỉ xóa file trên iPhone **sau khi xác minh** bản sao lưu đã hoàn tất.
- Không commit file `.env` hay dữ liệu riêng tư vào repo công khai.
- Bản v1 chưa có tự động sao lưu ảnh iPhone hoặc đồng bộ nền.

## Trạng thái

Mã nguồn v1 đã được đăng lên GitHub. Cần cài dependency, thử tải lên/tải xuống và cấu hình Tailscale trên laptop thực tế trước khi dùng với dữ liệu quan trọng.

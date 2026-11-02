# Tool Standing In Game

Tool độc lập tách từ Bảng điểm trong trận của Overlay Studio.

## Chạy
Yêu cầu Windows x64 và Node.js 24.x để tạo ứng dụng kết nối độc lập.

Cài lần đầu từ GitHub:

```powershell
git clone https://github.com/NLHDawn2004/INGAMESTADING.git
cd INGAMESTADING
npm ci
npm run setup
```

Sau đó bấm đúp **CHAY TOOL.cmd**. Các lần sau không cần cài lại. Thư viện, bridge EXE/ZIP và dữ liệu chạy được tạo trên máy; không lưu trong repository.

Trang điều khiển: http://127.0.0.1:5183/
Mật khẩu được tạo riêng trên từng máy; xem `outputs/login-local.txt` sau khi cài đặt. Nếu máy đã có `.dev.vars`, mật khẩu hiện tại được giữ nguyên.
Đội & logo: http://127.0.0.1:5183/teams

## Dùng với game và OBS
1. Nhập đội và logo ở Đội & logo (hỗ trợ Excel/CSV và ảnh trên máy chủ).
2. Tại Bảng điểm trong trận, chọn nguồn log game, kết nối Free Fire, kiểm tra Match ID và ánh xạ đội. Có chế độ replay để thử.
3. Chọn KV, căn hàng/cột, font và màu; lưu và bật overlay.
4. Sao chép link OBS trong tool. Browser Source 1920 x 1080, nền trong suốt.
5. Máy khác cùng LAN mở http://IP-MAY-CHU:5183/. Dùng file kết nối tải từ trang trên máy game.

## Dữ liệu độc lập
Web 5183, bridge 5184. Database và ảnh upload: .wrangler/state. Cấu hình bridge: .local-bridge. Phiên đăng nhập có tên cookie riêng với tool cũ. Không sao chép dữ liệu giải, mật khẩu hash hoặc khóa bridge từ tool cũ. Không đưa `.dev.vars`, `.local-bridge`, `.wrangler`, `outputs` hoặc link OBS có token lên GitHub. Logo/font/KV mẫu được giữ để sử dụng.

Phần tính tổng tham chiếu dữ liệu bảng tổng có sẵn từ mã gốc; bản độc lập không có trang nhập bảng điểm sau trận, nên khi chưa có dữ liệu nền, tổng chỉ phản ánh nguồn trong trận theo thiết lập.

## Kiểm tra
npm test
node node_modules/typescript/bin/tsc --noEmit

Chưa thể xác nhận độ trễ hoặc độ chính xác của một trận live nếu chưa thử với game đang chạy. Không dùng dữ liệu replay làm bằng chứng live.

## Bảng dọc đỏ trắng
Giao diện & KV → Bảng dọc đỏ trắng → Lưu & áp dụng cấu hình. Mẫu 14 hàng, khung 1920×1080, nền trong suốt, bảng nằm bên phải. Các cột TEAM, PTS, ELIMS, ALIVE được căn sẵn; tên/logo/điểm do tool hiển thị. Ảnh xem trước dùng dữ liệu minh họa.

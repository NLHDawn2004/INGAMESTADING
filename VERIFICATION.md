# Kiểm tra bản độc lập

- TypeScript: tsc --noEmit --incremental false, exit 0.
- npm test: 10 file kiểm thử logic/API/bridge/log game/logo/tổng/UID/timeout đều qua.
- HTTP local: đăng nhập thành công; cookie standing_session độc lập; api/state từ chối không đăng nhập; token OBS hợp lệ hoạt động; token sai bị từ chối.
- Trang live-scoreboard, teams, account và overlay trả 200.
- Bridge 5184 chấp nhận origin 5183 và từ chối origin tool cũ 5173.
- Kiểm tra giao diện thực tế: đăng nhập và trang điều khiển tải thành công. Bridge tự ghép nối; game hiện ngừng cập nhật log.
- Đã tạo lại game-connector.exe từ nguồn riêng và self-test thành công.
- Sửa lỗi kế thừa: ô thiếu damage/placement hiển thị dấu gạch thay vì 0; test live_scoreboard_check đã thất bại trên cả bản gốc rồi qua trên bản mới sau sửa.

Chưa đo độ trễ và độ chính xác trong trận live. Chưa chạy production build; tool chạy bằng máy chủ local qua CHAY TOOL.cmd.

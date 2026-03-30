# Hướng dẫn sử dụng: Family access (Invite → Accept → Revoke)

Family access cho phép người thân theo dõi đơn thuốc của patient theo cơ chế **read-only**. Family phải **đăng nhập Google** bằng đúng email được mời và **bấm Accept** thì quyền mới có hiệu lực.

## 1) Patient: mời người thân theo dõi

1. Đăng nhập và vào `Settings → Family access`.
2. Nhập email người thân (ví dụ `family@gmail.com`) và bấm `Send invite`.
3. Hệ thống tạo một lời mời trạng thái `pending`.
4. Khi người thân accept, trạng thái chuyển `accepted`.

## 2) Family: chấp nhận lời mời

1. Đăng nhập bằng Google với đúng email đã được patient mời.
2. Vào `Family inbox` để xem danh sách lời mời.
3. Bấm `Accept`.
4. Sau khi accept, family sẽ thấy dữ liệu của patient ở chế độ xem.

## 2.1) Family: export sang Google Calendar của family

1. Vào `Family inbox` hoặc trang patient được chia sẻ.
2. Bấm `Export to my Google Calendar`.
3. Nếu chưa connect: hệ thống yêu cầu bạn cấp quyền Google Calendar (calendar scope).
4. Hệ thống tạo các event nhắc thuốc + tái khám của patient vào Google Calendar của bạn.

## 3) Patient: thu hồi quyền (revoke)

1. Vào `Settings → Family access`.
2. Ở email tương ứng, bấm `Revoke`.
3. Quyền bị thu hồi **ngay lập tức**: family không còn truy cập dữ liệu của patient (kể cả đang mở app, refresh sẽ mất quyền).
4. Nếu family đã export lịch sang Google Calendar: hệ thống sẽ **tự động xoá toàn bộ event đã export** khỏi Google Calendar của family.

## 4) Family xem được gì?

- Danh sách đơn thuốc
- Tên bệnh đã khám
- Danh sách thuốc, liều lượng, lịch nhắc/tái khám
- Ảnh đơn thuốc gốc

Family không được:

- Chỉnh sửa dữ liệu đơn thuốc
- Chạy OCR lại
- Đồng bộ Google Calendar thay cho patient

## 5) Lưu ý an toàn

- Tránh mời nhầm email: quyền chỉ có hiệu lực sau khi family accept, giúp giảm rủi ro chia sẻ nhầm.
- Khi không còn cần theo dõi, patient nên revoke ngay.

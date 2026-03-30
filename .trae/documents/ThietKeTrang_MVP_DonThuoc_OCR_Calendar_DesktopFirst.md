# Thiết kế trang (Desktop-first) – MVP Đơn thuốc OCR + Google Calendar

## Global Styles
- Layout system: desktop-first, tối ưu cho 1280px; dùng CSS Grid cho bố cục tổng, Flexbox cho hàng/nhóm nút.
- Breakpoints (responsive đầy đủ):
  - Desktop: ≥ 1280px
  - Laptop: 1024–1279px
  - Tablet: 768–1023px
  - Mobile: ≤ 767px (mốc tham chiếu 375px)
- Typography:
  - Font: Inter/system-ui.
  - Desktop: H1 24/32, H2 18/28, body 14/22, caption 12/18.
  - Mobile/tablet: body tối thiểu 16/24 để dễ đọc; caption tối thiểu 14/20.
- Color tokens:
  - Background: #0B1220; Surface: #111B2E; Card: #16213A
  - Text primary: #E6EDF6; secondary: #A7B3C7
  - Primary: #4F8CFF; Success: #22C55E; Warning: #F59E0B; Danger: #EF4444
  - Border: rgba(255,255,255,0.08)
- Buttons:
  - Primary (solid), Secondary (outline), Ghost.
  - Hover: tăng sáng 6%; Disabled: opacity 50%.
  - Touch target: tối thiểu 44px chiều cao trên mobile.
- Form:
  - Input nền Card, border mảnh; error text màu Danger.

## Responsive Navigation (Configurable)

Mục tiêu: đơn giản, dễ thao tác cho người lớn tuổi trên mobile.

- Desktop/Laptop: sidebar trái cố định (240px) + top bar.
- Tablet: sidebar thu gọn thành nav rail (icon + tooltip) hoặc hamburger drawer.
- Mobile (khuyến nghị): bottom navigation (3–4 tab) + header title.
  - Tab gợi ý: Home (`/app`), Family (`/family/inbox`), Settings (`/settings/family-access`), Profile/More (tuỳ).

Có thể thay đổi sau:
- Nếu bạn muốn tối giản hơn: chuyển mobile navigation sang top tabs.

## Lists & Tables (Mobile-first behavior)

- Desktop: table đầy đủ cột.
- Tablet: table rút gọn cột + có thể scroll ngang nếu cần.
- Mobile: chuyển table → card list (mỗi item là 1 card), ưu tiên đọc nhanh.

## Accessibility (MVP)

- Font tối thiểu 16px trên mobile/tablet.
- Button/interactive area tối thiểu 44px.
- Focus state rõ ràng cho keyboard.
- Hỗ trợ zoom 200% mà không vỡ layout (reflow, không fixed height quan trọng).
- Tương phản màu đủ cao cho text chính/phụ (có thể điều chỉnh token sau).

## Meta Information (mặc định)
- Title pattern: "Patient – {Tên trang}"
- Description: "Tải lên đơn thuốc, OCR và nhắc thuốc/tái khám qua Google Calendar."
- Open Graph: og:title theo title, og:type=website.

---

## 1) Trang Đăng nhập (/login)
### Page Structure
- Centered card layout (max-width 420px), nền gradient tối.

### Sections & Components
1. Header nhỏ: logo + tagline.
2. Login Card:
   - Nút "Đăng nhập với Google" (primary).
   - Text note: quyền cần xin (profile + calendar events).
   - Khu vực hiển thị lỗi (toast + inline).
3. Language toggle (EN/VN): đặt ở góc trên phải của card (mặc định EN).
3. Footer: link chính sách/giới thiệu (tối giản).

### Interaction states
- Loading state trên nút đăng nhập.
- Nếu đã đăng nhập → auto redirect /app.

### Responsive
- Tablet/Mobile: card full-width (max-width 100%), padding lớn hơn, nút login full-width.
- Mobile: language toggle đặt trong header của card; font body ≥ 16px.

---

## 2) Bảng điều khiển (/app)
### Layout
- Desktop: 2 cột
  - Sidebar trái (240px): điều hướng + trạng thái role.
  - Main content: grid 12 cột, spacing 24.
- Tablet: sidebar thu gọn (nav rail) hoặc hamburger drawer.
- Mobile: bottom navigation (khuyến nghị) + layout 1 cột.

### Page Structure (Main)
1. Top bar: tiêu đề + user menu (avatar, role badge, logout).
   - Language toggle (EN/VN)
2. Upload panel (card): khu vực kéo-thả + nút chọn file.
3. Search + filters (1 hàng): ô "Tìm theo tên bệnh" + chip trạng thái (Pending/Confirmed).
4. Lịch sử đơn thuốc:
   - Desktop/Tablet: table (tablet có thể rút gọn cột).
   - Mobile: card list.
5. Calendar Sync card:
   - Toggle bật/tắt
   - Dropdown chọn calendar
   - Text: "Sync gần nhất" + lỗi gần nhất.
6. Family access quick link (card hoặc sidebar item): đi tới màn quản lý family access.

### Key components
- UploadDropzone
- PrescriptionHistoryTable (desktop/tablet)
- PrescriptionHistoryCardList (mobile)
- RoleBadge
- CalendarSyncSettings
- FamilyAccessSummaryCard

### Interactions
- Upload xong → điều hướng sang /prescriptions/:id/process.
- Click 1 dòng lịch sử → mở review ở chế độ read-only (Family access) hoặc editable (Owner/Admin).

### Responsive details
- Desktop: 2 cột; Calendar Sync card và Family access card nằm bên phải hoặc dưới history.
- Tablet: chuyển thành 1 cột + sections dạng stacked; search bar sticky top (tuỳ).
- Mobile:
  - Upload panel đặt trên cùng.
  - Search + filter chuyển thành 1 hàng (search) + hàng chip phía dưới.
  - History dùng card list: mỗi card hiển thị ngày + disease + status; CTA "Open".

---

## 3) OCR Processing (/prescriptions/:id/process)

### Layout
- Desktop: split-view 2 cột
  - Trái: preview ảnh/PDF
  - Phải: trạng thái xử lý + nút hành động
 - Tablet: split-view 40/60 hoặc stacked (tuỳ kích thước preview).
 - Mobile: stacked (preview → action panel), action bar sticky bottom.

### Sections & Components
1. Header: breadcrumb "Bảng điều khiển / OCR Processing" + nút quay lại.
2. Left Column:
   - FilePreview (zoom cơ bản)
3. Right Column:
   - Status panel: status badge (`UPLOADED`, `PROCESSING`, `PENDING_REVIEW`, `FAILED`)
   - Primary action:
     - Nút `Process` (khi status=`UPLOADED` hoặc `FAILED`)
     - Loading state khi status=`PROCESSING`
   - Secondary action:
     - Nút `Next` (enabled khi status=`PENDING_REVIEW`) → đi tới `/prescriptions/:id/review`
   - Error panel (khi `FAILED`): hiển thị lỗi + gợi ý retry

### Interactions
- Click `Process` → gọi API xử lý OCR/parse và chờ response.
- Nếu user rời trang giữa lúc processing: khi quay lại vẫn hiển thị status mới nhất và cho phép `Next` khi đã xong.

### Responsive details
- Mobile:
  - Nút `Process` và `Next` full-width.
  - Status panel luôn hiển thị ở trên nút.
  - Preview thu gọn chiều cao và cho phép mở full-screen.

---

## 2.1) Quản lý Family access (/settings/family-access)

### Purpose
- Patient mời family theo dõi (read-only) bằng email.
- Quản lý trạng thái invite: `pending / accepted / rejected / revoked`.
- Revoke có hiệu lực ngay lập tức.

### Page Structure
1. Add family email (form): input email + nút "Send invite".
2. Sent invites table:
   - Columns: email, status badge, created time, actions (revoke).
3. Accepted list:
   - Columns: email, accepted time, actions (revoke).

### Responsive
- Tablet: table rút gọn cột (ẩn created time nếu cần).
- Mobile: chuyển sent/accepted thành card list; mỗi card có email + status + CTA revoke.

### Validation & states
- Email format validation.
- Không cho thêm trùng email nếu đang `pending` hoặc `accepted`.
- Khi revoke: UI cập nhật ngay; family mất quyền ngay khi refresh.

---

## 2.2) Family inbox (/family/inbox)

### Purpose
- Family (cũng là user) xem danh sách lời mời từ patient và chấp nhận để bật quyền xem.

### Page Structure
1. Inbox list:
   - Mỗi item: patient display name/email (nếu có), ngày mời, mô tả quyền.
   - Actions: Accept / Reject.
2. After accept:
   - Hiện shortcut tới danh sách patient được chia sẻ trong dashboard.
3. Export section (sau khi accept):
   - Nút `Export to my Google Calendar`.
   - Nếu chưa connect calendar: hiện modal xin quyền Google Calendar (calendar scope).
   - Hiển thị trạng thái export gần nhất (running/success/failed).

### Responsive
- Mobile: inbox list là card list; CTA Accept/Reject dạng nút lớn.
- Mobile: export button full-width + hiển thị trạng thái dưới dạng badge.

---

## 4) Xác nhận đơn thuốc (OCR/Parse) (/prescriptions/:id/review)
### Layout
- Desktop: split-view 2 cột (50/50)
  - Trái: preview ảnh/PDF + text OCR
  - Phải: form xác nhận + bảng thuốc
- Tablet: split-view 40/60 hoặc stacked.
- Mobile: stacked (preview → form) + action bar sticky bottom.

### Sections & Components
1. Header: breadcrumb "Bảng điều khiển / Xác nhận" + nút quay lại.
2. Left Column:
   - FilePreview (zoom cơ bản)
   - OCRTextPanel (scroll, copy button)
3. Right Column:
   - Form tổng quan:
     - Tên bệnh (required để search tốt)
     - Ngày bắt đầu dùng thuốc (date)
     - Ngày tái khám (optional)
   - Bảng thuốc:
     - Desktop/Tablet: editable grid.
     - Mobile: card list (mỗi thuốc là 1 card với các field theo hàng dọc) + CTA add/remove.
   - Hành động:
     - "Lưu nháp" (giữ status pending_review)
     - "Xác nhận & Đồng bộ" (nếu bật sync)
     - "Chỉ xác nhận" (không sync)
4. Read-only mode (Family):
   - Tất cả input disabled, chỉ xem.
   - Cho phép xem ảnh đơn thuốc gốc.
   - Không hiển thị hành động OCR lại / Confirm / Sync.

### Validation & states
- Tên thuốc bắt buộc từng dòng; cảnh báo nếu trống.
- Toast kết quả: OCR thành công/thất bại; sync calendar thành công/thất bại.
- Sticky action bar (desktop) để luôn thấy nút lưu/xác nhận.

### Responsive details
- Mobile:
  - OCRTextPanel mặc định collapsed (accordion), có nút "Show OCR text".
  - Action buttons full-width, đặt trong sticky bottom bar.
  - Date inputs dùng native date picker.

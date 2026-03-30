# Take Care Patient (Platform)

Take Care Patient là nền tảng hỗ trợ bệnh nhân quản lý đơn thuốc, nhắc uống thuốc và theo dõi lịch tái khám. Sản phẩm ưu tiên web trước (Next.js SSR) và thiết kế để mở rộng sang mobile app sau.

Tài liệu chi tiết về MVP/UX/flow/kiến trúc đang nằm trong `c:\Honguyen\Patient\.trae\documents\`.

## 1) Mục tiêu & nguyên tắc

- Dễ dùng cho người trung niên/lớn tuổi: font lớn, nút lớn, luồng theo từng bước.
- AI/OCR có sai số: luôn có bước `Review/Confirm` để người dùng sửa.
- Bảo mật dữ liệu y tế: ảnh đơn thuốc lưu private; cấp quyền xem bằng cơ chế invite/accept; revoke hiệu lực ngay.

## 2) Kiến trúc tổng thể (enterprise AWS)

### 2.1 Polyrepo + repo tổng thể

Chúng ta dùng **polyrepo** (mỗi service 1 repo) để CI/CD và trách nhiệm rõ ràng, nhưng vẫn có 1 repo tổng thể để team dễ onboarding.

- **Repo tổng thể** (umbrella): `takecare-platform`
  - Chứa docs, hướng dẫn, `docker-compose.yml`.
  - Dùng **git submodules** để pull các repo service.

- **Các repo service**:
  - `takecare-web`: Next.js SSR chạy container
  - `takecare-core-api`: NestJS chạy Lambda adapter (API Gateway → Lambda)
  - `takecare-workflow`: NestJS chạy Lambda adapter (EventBridge → Lambda)

- **Các repo infra (CDK)**:
  - `takecare-infra-core`: Cognito, RDS, S3 private, API Gateway, Lambda core/workflow, EventBridge, artifact bucket…
  - `takecare-infra-web`: ECR web, ECS/Fargate, ALB, CloudFront, logs/alarms…

### 2.2 Luồng runtime trên AWS

- Web SSR: `CloudFront → ALB → ECS/Fargate (Next.js)`
- Core API: `API Gateway → Lambda (NestJS adapter) → RDS/S3/Google Vision`
- Workflow: `EventBridge → Lambda (NestJS adapter) → Google Calendar API`

### 2.3 Auth & Calendar

- Login: AWS Cognito, người dùng đăng nhập bằng `Login with Google` (federation, scope cơ bản).
- Google Calendar: chỉ xin consent calendar scope khi user bật sync/export; lưu refresh token (mã hoá).

## 3) Luồng sản phẩm MVP (user-facing)

### 3.1 Wizard 3 bước cho đơn thuốc

1. **Upload** (user upload ảnh/PDF)
2. **OCR Processing** (user bấm `Process` để chạy OCR/parse; chạy **sync trong Core API**)
3. **Review/Confirm** (user sửa + xác nhận; sau đó mới sync calendar)

### 3.2 Family access (invite/accept) + export calendar

- Patient mời family bằng email → trạng thái `pending`.
- Family đăng nhập → `Accept` → có quyền xem read-only.
- Family có thể `Export to my Google Calendar`.
- Patient `Revoke` → mất quyền ngay + workflow tự xoá các event đã export trong calendar family.

## 4) OpenAPI contract (polyrepo)

FE/BE không share types trực tiếp. Hợp đồng API đi theo **OpenAPI**:

- `takecare-core-api` sinh `openapi.json`.
- Pipeline publish `openapi.json` lên **S3 artifact bucket** theo version.
- `takecare-web` tải artifact đúng version và generate SDK client trước khi build.

## 5) Local development (docker-compose MVP)

Mục tiêu: dev chạy được toàn bộ stack bằng 1 lệnh.

### 5.1 Thành phần local

- `web` (Next dev server trong container)
- `core-api` (Nest trong container)
- `workflow` (Nest trong container)
- `postgres` (local DB)

### 5.2 Auth và async ở local

- Auth local: dùng **local JWT mock** (chỉ bật ở local), để không phụ thuộc Cognito ngay.
- Async local: core-api gọi workflow qua HTTP nội bộ (dev-only). Prod dùng EventBridge.

## 6) Quy tắc làm việc cho team

### 6.1 Branching & PR

- Mỗi repo dùng PR-based workflow: `feature/*` → PR → review → merge.
- Thay đổi API contract:
  - Update `takecare-core-api` trước
  - Publish `openapi.json` version mới
  - Update `takecare-web` để pull version đó và regenerate SDK

### 6.2 Versioning

- `takecare-core-api` version theo semver (khuyến nghị).
- `openapi.json` publish theo version tag của core-api.

## 7) Tài liệu liên quan

- PRD: `c:\Honguyen\Patient\.trae\documents\PRD_MVP_DonThuoc_OCR_GoogleCalendar.md`
- Kiến trúc: `c:\Honguyen\Patient\.trae\documents\KienTrucKyThuat_MVP_DonThuoc_OCR_Calendar_Supabase.md`
- Thiết kế responsive: `c:\Honguyen\Patient\.trae\documents\ThietKeTrang_MVP_DonThuoc_OCR_Calendar_DesktopFirst.md`
- Hướng dẫn family access: `c:\Honguyen\Patient\.trae\documents\HuongDanSuDung_FamilyAccess.md`

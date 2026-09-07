# Taka Projects - Core Business Logic & Architecture

Tài liệu này lưu trữ các luồng nghiệp vụ (Business Logic) và quy ước kiến trúc cốt lõi của ứng dụng. Bất kỳ sự thay đổi hay refactor nào cũng **BẮT BUỘC** phải tôn trọng và duy trì các luồng logic này.

## 1. Hệ Thống Lưu Trữ & Trạng Thái (Storage & State)
- **Offline-First (OPFS)**: Ứng dụng ưu tiên lưu trữ cục bộ qua thư mục OPFS (Origin Private File System) giúp xử lý lượng data lớn mượt mà không bị độ trễ mạng. Dữ liệu được lưu dưới dạng các file `.json` phân tách rõ ràng.
- **Zustand (`DataContext.tsx`)**: Quản lý toàn bộ Global State của ứng dụng. 
  - **Auto-Save Debounce**: Dữ liệu thay đổi trên UI không ghi ngay xuống đĩa cứng mà được chờ trong `saveTimeoutRef` (2000ms debounce). Nếu không có thay đổi mới trong 2 giây, dữ liệu mới được `saveToHandlers` đóng gói và ghi xuống OPFS để tối ưu I/O.
- **Firebase/Cloud Sync**: Sử dụng Firestore để đồng bộ các Master Data (như Global Brand Info, Auth).

## 2. Multi-Store Sandbox (Phân tách Cơ sở Hoạt động)
- Hệ thống hoạt động độc lập giữa các cơ sở: **HCM** (Hồ Chí Minh) và **HN** (Hà Nội).
- Việc phân tách được thiết kế ở mức độ File System: Mỗi cơ sở map với một thư mục vật lý riêng. Khi người dùng "Switch Store", toàn bộ state trên RAM sẽ được clear và load lại từ thư mục tương ứng. Tuyệt đối không được gộp chung biến state dẫn đến rò rỉ (leak) dữ liệu chéo giữa 2 cơ sở.

## 3. Các Luồng Nghiệp Vụ Cốt Lõi (Core Business Flows)

### 3.1. Quản lý Đơn Vị (Unit Info) & Tự động đồng bộ Brand Name
- **Quan hệ Cấu trúc**: Một `Unit` (Mã lô/gian hàng vật lý) sẽ chứa một `Brand` (Thương hiệu) và được theo dõi tiến độ thi công qua `Project Status`.
- **Auto Sync Brand Name (Logic tự động điền tên)**: 
  - Người dùng có một nút Toggle (Công tắc) `autoUpdateBrandName` trên thanh điều hướng.
  - **Khi ON (Mặc định)**: Bất cứ khi nào tên Dự án (`Project Name`) trong Project Status thay đổi, hệ thống sẽ sử dụng thuật toán `stringSimilarity` (so khớp chuỗi) để tự động đối chiếu với danh sách Master Class Info, tìm ra Thương hiệu đúng nhất và tự động cập nhật đè (overwrite) lên trường `Brand Name` trong `UnitInfo`.
  - **Khi OFF**: Chức năng điền tự động bị tắt. Người dùng tự gõ `Brand Name` thủ công trong UnitInfo và hệ thống sẽ giữ nguyên không ghi đè, cho phép bypass các trường hợp nhận diện chuỗi bị sai.

### 3.2. Sơ đồ Bản đồ & Xuất Ảnh (Map Canvas & Cloudflare R2)
- **Công nghệ vẽ**: Sử dụng thư viện `react-konva` (Stage, Layer, Rect, Text...) để vẽ sơ đồ trực quan.
- **Tối ưu Export Ảnh (Export Optimization)**:
  - Chống tràn RAM: Sử dụng hằng số `SAFE_MAX_DIM = 3840` (Kích thước 4K chuẩn). Trình duyệt khi xuất ảnh độ phân giải cao sẽ bị giới hạn pixelRatio dựa trên Max Dimension này, tránh gây crash Safari/Chrome (vốn giới hạn kích thước Canvas string).
  - Chất lượng & Dung lượng: Khi xuất ra JPEG, thông số `jpegQuality = 0.92` được sử dụng để giảm 10 lần dung lượng file Base64 (so với 1.0) nhưng vẫn giữ được độ nét tối đa, giúp quá trình upload qua API (như fetch lên Cloudflare R2) không bị timeout.
  - Chống lỗi ảnh đen (Zero Buffer): Thẻ bao bọc Canvas ẩn bắt buộc dùng CSS `opacity: 0, zIndex: -9999, pointerEvents: 'none'` kết hợp `backgroundColor: 'white'` (Thay vì `visibility: hidden`) để ép trình duyệt phải render GPU liên tục cho ảnh xuất.

### 3.3. Xử lý Dữ liệu Bảng (Data Table & Auto-Clean)
- **Active / Unactive Lifecycle**: 
  - Khi một Row trong UnitInfo được đổi trạng thái thành `Active`, hệ thống tự động quét xem có bản ghi nào của cùng Unit đó cũng đang `Active` hay không. Nếu có, bật hộp thoại Confirm hỏi user có muốn chuyển các bản ghi cũ về `Unactive` không (Chống duplicate Active Unit).
- **Metric Scaling**: Data cũ từ server về Doanh thu (Sales) và Lợi nhuận (Profit) đã trải qua logic chia cho 1000 (`migrated_scaled_1000 = true`).
- **Tương tác UI (Debounce Input)**: Ô nhập liệu (InputCell) trong DataGrid duy trì local state và chỉ gọi hàm `updateRow` đẩy lên Zustand Store khi sự kiện `onBlur` hoặc gõ `Enter` diễn ra, tránh re-render bảng hàng nghìn dòng mỗi khi gõ phím.

## 4. Quy ước Schema & Toàn vẹn Dữ liệu (Data Integrity)
- Mọi Interface cấu trúc dữ liệu đều nằm tại `src/types.ts`.
- **Luật Cấm Đổi Tên (No Ghost Fields)**: Các field sống còn như `brandName`, `brandCode`, `unit`, `classCode` tuyệt đối không được tự ý đổi tên (VD: không được đổi `brandName` thành `name`). Việc sai lệch tên biến sẽ làm đứt gãy luồng mapping ở `ReviewTab.tsx`, `DynamicHierarchyTab.tsx` và hỏng chức năng xuất file CSV (`CsvExportTab.tsx`).
- Bất kỳ field nào thêm mới vào Store bắt buộc phải khai báo đầy đủ trong `DataContextType`, tham số khởi tạo `create(...)`, hàm lưu trữ `saveToHandlers`, và logic parse JSON khi load file.

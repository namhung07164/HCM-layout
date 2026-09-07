# AI Coding Agent Guidelines

> ⛔ **QUY TẮC BẤT KHẢ XÂM PHẠM (ABSOLUTE NON-NEGOTIABLE RULE)**:
> Toàn bộ logic nghiệp vụ, tư duy thiết kế, các chức năng và tương tác hiện có trong ứng dụng **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP XÓA, LƯỢC BỎ, DISABLE HAY THAY THẾ BẰNG MOCK/PLACEHOLDER** trong bất kỳ lần cập nhật, refactor hay upgrade nào. Mọi sự thay đổi chỉ được phép theo hướng **mở rộng (additive), tối ưu hiệu năng và hoàn thiện thêm**. Không tự ý xóa bỏ tính năng trừ khi có yêu cầu tường minh (explicit request) từ người dùng hoặc lỗi nghiêm trọng đã được người dùng xác nhận đồng ý.

---

## 1. State Management (Zustand)
- **MANDATORY**: Sử dụng Zustand (`src/DataContext.tsx` thông qua hook `useDataStore`) cho tất cả global states.
- **NO PROP-DRILLING**: Tuyệt đối không truyền các state lớn từ `App.tsx` xuống quá nhiều lớp component con.
- **ATOMIC SELECTORS**: Luôn subscribe state thông qua `useShallow` để ngăn chặn re-render diện rộng:
  ```tsx
  // ✅ DO:
  const { unitInfo } = useDataStore(useShallow(state => ({ unitInfo: state.unitInfo })));
  
  // ❌ DON'T:
  const store = useDataStore(); // Gây re-render mỗi khi bất kỳ state nào thay đổi
  ```

## 2. Hiệu Năng & Quản Lý Dữ Liệu
- **Tối ưu Network & DB Reads**: Ứng dụng này sử dụng kết hợp bộ nhớ cục bộ (OPFS) và Firebase/Google Sheets. Ưu tiên đọc từ cache in-memory của Zustand khi người dùng chuyển Tab thay vì gọi lại DB queries liên tục.
- **Anti-Read-Storm (Chống loop vô hạn)**: Tuyệt đối không đặt các Object phức tạp hoặc toàn bộ state vào mảng dependencies của `useEffect` khi thực hiện các tác vụ đồng bộ/lắng nghe. Chỉ truyền các biến nguyên thủy (primitives) cần thiết.
- **Debounced Writes**: Các thanh tìm kiếm hoặc chức năng cập nhật tự động (auto-save) BẮT BUỘC dùng kỹ thuật debounce để giảm tải write operations và UI lag.
- **Chống DOM Lag**: Danh sách và bảng dữ liệu siêu lớn (ví dụ: Unit Info, Sub Fee) phải ưu tiên xử lý DOM nhẹ, hạn chế render toàn bộ nếu không cần thiết.

## 3. Quản Lý Dependencies & Build (NPM ONLY)
- **⛔ CẤM TUYỆT ĐỐI BUN / YARN / PNPM**: Package manager duy nhất được phép sử dụng là **NPM**. Nghiêm cấm sử dụng `bun`, `yarn`, `pnpm` dưới mọi hình thức.
- **Xóa File Cấm**: Bất kỳ file `bun.lock`, `bun.lockb`, `yarn.lock`, `pnpm-lock.yaml` nào sinh ra đều BẮT BUỘC PHẢI XÓA ngay lập tức để tránh gây sập Google Cloud Buildpack. Chỉ giữ duy nhất `package-lock.json`.
- **Không Trùng Lặp Thư Viện**: 
  - Toàn bộ Icon phải đến từ `lucide-react`.
  - Mọi Animation phải dùng `motion/react` (Framer Motion).
  - Khuyến khích tái sử dụng các hàm xử lý ở `src/lib/utils.ts` thay vì cài cắm thư viện dư thừa (như momentjs, lodash-nặng).

## 4. Cấu Trúc Dữ Liệu (Cross-Module Integrity)
- **NO GHOST FIELDS**: Tuân thủ tuyệt đối định nghĩa Schema tại `src/types.ts`. KHÔNG TỰ Ý đổi tên, xóa, hoặc bịa ra field mới làm lệch cấu trúc Firestore hoặc quá trình đọc file JSON lưu trữ nội bộ.
- Đồng bộ Component: Khi cập nhật các Type cốt lõi ở `src/types.ts`, hãy đảm bảo kiểm tra lỗi (compile check) qua tất cả các Tab liên quan (DataMapping, CSV, v.v.).
- Lệnh biên dịch chuẩn là `"build": "vite build"` trỏ thẳng vào `dist/`. Không nhân bản thư mục build.

## 5. Xác Nhận Sau Code (Verification)
- Trước khi kết thúc lượt phản hồi, phải đảm bảo quá trình TypeScript Compile (`npm run lint` hoặc `tsc --noEmit`) hoàn tất mà không để lại lỗi cú pháp hay hỏng hóc nghiệp vụ. Không bao giờ bàn giao code gãy (broken code).

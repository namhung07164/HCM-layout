const fs = require('fs');
let code = fs.readFileSync('src/DataContext.tsx', 'utf8');

const oldSelect = `  const selectLocalFolder = async () => {
    try {
      if (window !== window.parent) {
        alert("Tính năng này không hỗ trợ trong chế độ xem trước (iframe). Vui lòng mở ứng dụng trong một tab mới (nút mũi tên ở góc trên bên phải) để sử dụng.");
        return;
      }
      
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirHandleRef.current = handle;
      await idbSet('dirHandle', handle); // Save handle to IndexedDB
      set({ hasLocalFolder: true });
      
      alert('Đã kết nối thư mục thành công!');
    } catch(err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        alert("Không thể chọn thư mục. Hãy chắc chắn bạn mở app trên tab mới và trình duyệt hỗ trợ File System Access API.");
      }
    }
  };`;

const newSelect = `  const selectLocalFolder = async () => {
    try {
      if (window !== window.parent) {
        alert("Tính năng này không hỗ trợ trong chế độ xem trước (iframe). Vui lòng mở ứng dụng trong một tab mới (nút mũi tên ở góc trên bên phải) để sử dụng.");
        return;
      }
      
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      dirHandleRef.current = handle;
      await idbSet('dirHandle', handle); // Save handle to IndexedDB
      set({ hasLocalFolder: true });
      
      // Prevent any pending auto-saves from overwriting the folder before we load
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      set({ isLoading: true });
      const loaded = await loadFromHandle(handle);
      if (loaded) {
        alert('Đã kết nối và tải dữ liệu từ thư mục thành công!');
      } else {
        alert('Đã kết nối thư mục, nhưng không tìm thấy dữ liệu cũ.');
      }
    } catch(err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        alert("Không thể chọn thư mục. Hãy chắc chắn bạn mở app trên tab mới và trình duyệt hỗ trợ File System Access API.");
      }
    } finally {
      set({ isLoading: false });
    }
  };`;

code = code.replace(oldSelect, newSelect);
fs.writeFileSync('src/DataContext.tsx', code);

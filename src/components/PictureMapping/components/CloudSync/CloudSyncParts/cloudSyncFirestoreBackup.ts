import { StoreLocationRecord } from '../../../DataContext';
import { getStoredR2Credentials } from '../../../lib/r2Upload';
import { cleanOrphanR2Files } from '../../../../../lib/r2StorageUtils';


export async function executeCleanR2GarbageAction(params: {
  storeLocationData: Record<string, StoreLocationRecord>;
  mapVersions: any[];
  setSyncing: (val: boolean) => void;
  setStatusText: (val: string) => void;
}): Promise<void> {
  const { storeLocationData, mapVersions, setSyncing, setStatusText } = params;
  const creds = getStoredR2Credentials();
  if (!creds) {
    alert('Chưa cấu hình Cloudflare R2 trong hệ thống.');
    return;
  }

  if (
    !confirm(
      'Hệ thống sẽ quét toàn bộ R2 Bucket và xóa tất cả ảnh nền cũ/mồ côi không còn thuộc bất kỳ version nào. Bạn có muốn tiếp tục?'
    )
  ) {
    return;
  }

  setSyncing(true);
  setStatusText('Đang quét và thu gom file rác R2...');

  try {
    const result = await cleanOrphanR2Files(
      { storeLocationData, mapVersions },
      { onProgress: (msg) => setStatusText(msg) }
    );

    if (result.deletedCount > 0) {
      alert(`🧹 Đã dọn dẹp và giải phóng thành công ${result.deletedCount} file rác trên Cloudflare R2!`);
    } else {
      alert(`✅ R2 Bucket hoàn toàn sạch sẽ! Tất cả ${result.scannedCount} file đều đang được sử dụng.`);
    }
  } catch (err: any) {
    alert(`Lỗi khi dọn rác R2: ${err.message}`);
  } finally {
    setSyncing(false);
  }
}

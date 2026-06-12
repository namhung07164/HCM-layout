import React, { useState } from "react";
import { useData } from "../DataContext";
import { RefreshCw, Lock, Unlock, Globe, Loader2 } from "lucide-react";
import { fetchProjectStatusFromGAS } from "../services/gasSync";
import { ProjectStatusInfo } from "../types";
import { cn } from "../lib/utils";

export default function GoogleSyncWidget() {
  const { setProjectStatus, units, projectStatus: currentProjectStatus, addNotification } = useData();
  const [gasUrl, setGasUrl] = useState(
    "https://script.google.com/macros/s/AKfycbxmF1Bo3md7zlBOFVFOIzvuImy34skAR7yIX3dbQALue1_uGgp4sFAnPXtvGYpB5vjU/exec",
  );
  const [isGasLoading, setIsGasLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleUnlock = () => {
    // Password to unlock sync. You can change it if needed.
    if (
      password === "admin" ||
      password === "123456" ||
      password === "Taka2026"
    ) {
      setIsUnlocked(true);
    } else {
      alert("Sai mật khẩu!");
    }
  };

  const handleGasSync = async () => {
    if (!gasUrl) {
      alert("Vui lòng nhập Web App URL");
      return;
    }
    setIsGasLoading(true);
    try {
      const data = await fetchProjectStatusFromGAS(gasUrl);

      if (data && data.status === "error") {
        alert("Lỗi từ Google Apps Script: " + data.message);
        return;
      }

      let items = data;
      if (data && data.status === "success" && Array.isArray(data.data)) {
        items = data.data;
      }

      if (Array.isArray(items)) {
        // Lọc dữ liệu: Chỉ chọn dữ liệu HCM
        const hcmData = items.filter(
          (row: any) =>
            row["Store"] === "HCM" ||
            row["store"] === "HCM" ||
            row["store"] === "hcm" ||
            row["Store"] === "hochiminh",
        );

        // Nhóm theo Project Code
        const groupedByUnit: { [key: string]: any[] } = {};
        hcmData.forEach((row: any) => {
          const unit =
            row["Code"] ||
            row["code"] ||
            row["Project Code"] ||
            row["projectCode"] ||
            "";
          if (!unit) return;
          if (!groupedByUnit[unit]) groupedByUnit[unit] = [];
          groupedByUnit[unit].push(row);
        });

        // Lấy danh sách Unit hiện có để so khớp
        const existingUnits = new Set(
          units.map((u) => u.unit?.toLowerCase().trim()),
        );

        const today = new Date().getTime();

        const mappedData: ProjectStatusInfo[] = Object.keys(groupedByUnit)
          .filter((unitKey) => existingUnits.has(unitKey.toLowerCase().trim())) // Chỉ lấy những code match với unit
          .map((unit) => {
            const tasks = groupedByUnit[unit];

            let closestTask = tasks[0];
            let minDiff = Infinity;

            tasks.forEach((task) => {
              const startDateStr =
                task["Start (Plan)"] ||
                task["startPlan"] ||
                task["Start"] ||
                task["start"];
              let diff = Infinity;
              if (startDateStr) {
                const startDate = new Date(startDateStr).getTime();
                diff = Math.abs(startDate - today);
              }
              if (diff < minDiff) {
                minDiff = diff;
                closestTask = task;
              }
            });

            const formatDate = (dateStr: string) => {
              if (!dateStr) return "";
              try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                const day = String(d.getDate()).padStart(2, "0");
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
              } catch (e) {
                return dateStr;
              }
            };

            return {
              update: new Date().toLocaleDateString("en-US"),
              taskId:
                closestTask["Task ID"] ||
                closestTask["taskId"] ||
                closestTask["ID"] ||
                closestTask["id"] ||
                "",
              projectName:
                closestTask["Project name"] || closestTask["projectName"] || "",
              unit: unit,
              task: closestTask["Detail"] || closestTask["detail"] || "",
              status:
                closestTask["Task Status"] ||
                closestTask["taskStatus"] ||
                closestTask["Project status"] ||
                closestTask["projectStatus"] ||
                "",
              startDate: formatDate(
                closestTask["Start (Plan)"] ||
                  closestTask["startPlan"] ||
                  closestTask["Start"] ||
                  closestTask["start"] ||
                  "",
              ),
              endDate: formatDate(
                closestTask["Finish (Plan)"] ||
                  closestTask["finishPlan"] ||
                  closestTask["Finish"] ||
                  closestTask["finish"] ||
                  "",
              ),
              delegationStatus:
                closestTask["Delegation Status"] ||
                closestTask["delegationStatus"] ||
                "",
              flowStatus:
                closestTask["Flow: Status"] ||
                closestTask["flow: status"] ||
                closestTask["flowStatus"] ||
                "",
              store: closestTask["Store"] || closestTask["store"] || "",
              projectYear:
                closestTask["Project Year"] ||
                closestTask["projectYear"] ||
                closestTask["Year"] ||
                closestTask["year"] ||
                "",
              party: closestTask["Party"] || closestTask["party"] || "",
            };
          },
        );

        setProjectStatus(mappedData);

        // Generate notifications for changed flowStatus
        let notifCount = 0;
        mappedData.forEach(newItem => {
          const oldItem = currentProjectStatus.find(p => p.unit === newItem.unit && p.task === newItem.task);
          if (newItem.flowStatus && newItem.flowStatus !== "") {
            // Either it's new or flowStatus changed
            if (!oldItem || oldItem.flowStatus !== newItem.flowStatus) {
               addNotification(`By Party: ${newItem.party || 'Unknown'} - Flow: ${newItem.flowStatus}`);
               notifCount++;
            }
          }
        });

        if (notifCount > 0) {
          alert(`Tải dữ liệu thành công! Có ${notifCount} thông báo mới từ Flow Status.`);
        } else {
          alert("Tải dữ liệu thành công!");
        }
      } else {
        alert("Dữ liệu không đúng định dạng JSON mảng.");
      }
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsGasLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-4 border border-slate-800/50 bg-slate-900/20 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
          <Globe size={12} className="text-blue-400" />
          Google Sync
        </p>
        {isGasLoading && (
          <Loader2 size={10} className="animate-spin text-blue-400" />
        )}
      </div>

      {!isUnlocked ? (
        <div className="space-y-2">
          <p className="text-[9px] text-slate-400">
            Yêu cầu mật khẩu để đồng bộ
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Mật khẩu..."
              className="flex-1 min-w-0 bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={handleUnlock}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1.5 rounded transition-colors text-slate-300"
            >
              <Unlock size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-green-400 mb-1">
            <Unlock size={10} /> Đã mở khóa
          </div>
          <input
            type="text"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="GAS URL"
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-2 py-1.5 text-[9px] text-slate-300 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleGasSync}
            disabled={isGasLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-blue-500/30 text-[10px] font-medium transition-colors",
              isGasLoading
                ? "bg-blue-900/50 text-blue-400 cursor-not-allowed"
                : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50",
            )}
          >
            <RefreshCw
              size={12}
              className={isGasLoading ? "animate-spin" : ""}
            />
            Tải dữ liệu (GET)
          </button>
        </div>
      )}
    </div>
  );
}

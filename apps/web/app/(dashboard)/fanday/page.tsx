"use client";

import { useState, useEffect } from "react";
import HolographicCard from "@/components/HolographicCard";
import TiltCard from "@/components/TiltCard";

export default function FandayDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchingPreview, setMatchingPreview] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"players" | "pairs" | "ops">("players");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/fanday");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/fanday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: newStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunMatching = async (dryRun: boolean = true) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/fanday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_matching", dryRun }),
      });
      const json = await res.json();
      if (res.ok) {
        if (dryRun) {
          setMatchingPreview(json.preview);
        } else {
          setMatchingPreview(null);
          await fetchData();
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff6b8b] border-t-transparent" />
      </div>
    );
  }

  const event = data?.event;
  const stats = data?.stats || { total: 0, male: 0, female: 0, locked: 0, pairs: 0 };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎀</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {event?.title || "กิจกรรมแฟนเดย์ • 753BC"}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                event?.status === "ACTIVE"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : event?.status === "PAUSED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-[#ff6b8b]/20 text-[#ff6b8b] border border-[#ff6b8b]/30"
              }`}
            >
              {event?.status || "DRAFT"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            ระบบบริหารจัดการกิจกรรมแฟนเดย์ สุ่มจับคู่ตามเพศและนิสัยด้วย AI พร้อมแผงควบคุมสด
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={event?.status || "DRAFT"}
            disabled={actionLoading}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#ff6b8b] focus:outline-none"
          >
            <option value="REGISTRATION">🟢 เปิดรับสมัคร (REGISTRATION)</option>
            <option value="MATCHING">🟡 กำลังจับคู่ (MATCHING)</option>
            <option value="ACTIVE">💗 เริ่มกิจกรรม (ACTIVE)</option>
            <option value="LETTERS">💌 เขียนจดหมาย (LETTERS)</option>
            <option value="PAUSED">🛠️ พักชั่วคราว (PAUSED)</option>
            <option value="ENDED">🏁 จบกิจกรรม (ENDED)</option>
          </select>

          <button
            onClick={() => handleRunMatching(true)}
            disabled={actionLoading}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            🔍 ทดลองจับคู่ (Dry-Run)
          </button>

          <button
            onClick={() => handleRunMatching(false)}
            disabled={actionLoading}
            className="rounded-lg bg-gradient-to-r from-[#ff6b8b] to-[#9b59b6] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            💘 ยืนยันจับคู่ (Commit)
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <TiltCard>
          <HolographicCard className="p-4">
            <div className="text-xs font-medium text-zinc-400">ผู้สมัครทั้งหมด</div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.total} คน</div>
            <div className="mt-1 text-xs text-zinc-500">ขั้นต่ำ {event?.minPlayers || 7} คน</div>
          </HolographicCard>
        </TiltCard>

        <TiltCard>
          <HolographicCard className="p-4">
            <div className="text-xs font-medium text-zinc-400">ชาย / หญิง</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {stats.male} 👨 / {stats.female} 👩
            </div>
            <div className="mt-1 text-xs text-zinc-500">สัดส่วนเพศ</div>
          </HolographicCard>
        </TiltCard>

        <TiltCard>
          <HolographicCard className="p-4">
            <div className="text-xs font-medium text-zinc-400">ขอล็อกคู่แล้ว</div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.locked} คน</div>
            <div className="mt-1 text-xs text-zinc-500">Self-Lock Pairs</div>
          </HolographicCard>
        </TiltCard>

        <TiltCard>
          <HolographicCard className="p-4">
            <div className="text-xs font-medium text-zinc-400">คู่ที่จับสำเร็จ</div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.pairs} คู่</div>
            <div className="mt-1 text-xs text-zinc-500">Active Pairs</div>
          </HolographicCard>
        </TiltCard>

        <TiltCard>
          <HolographicCard className="p-4">
            <div className="text-xs font-medium text-zinc-400">โหมดการจับคู่</div>
            <div className="mt-2 text-lg font-bold text-[#ff6b8b]">{event?.pairingMode || "MALE_FEMALE"}</div>
            <div className="mt-1 text-xs text-zinc-500">Pairing Mode</div>
          </HolographicCard>
        </TiltCard>
      </div>

      {/* Matching Dry-Run Preview Modal */}
      {matchingPreview && (
        <div className="rounded-xl border border-[#ff6b8b]/40 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              🔍 ผลการทดลองจับคู่ล่วงหน้า (Dry-Run Preview)
            </h2>
            <button
              onClick={() => setMatchingPreview(null)}
              className="text-zinc-400 hover:text-white"
            >
              ✕ ปิด
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            จับคู่ได้สำเร็จ {matchingPreview.pairs.length} คู่ | ผู้เล่นที่ยังไม่มีคู่ {matchingPreview.unpaired.length} คน | Seed: {matchingPreview.seed}
          </p>

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {matchingPreview.pairs.map((p: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{p.playerAName}</span>
                  <span className="text-[#ff6b8b]">❤️</span>
                  <span className="font-semibold text-white">{p.playerBName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="rounded bg-[#ff6b8b]/20 px-2 py-0.5 font-bold text-[#ff6b8b]">
                    {p.compatibility}%
                  </span>
                  <span className="text-zinc-400">{p.reason}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => handleRunMatching(false)}
              className="rounded-lg bg-[#ff6b8b] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ff5277]"
            >
              ยืนยันจับคู่จริงทันที
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("players")}
          className={`pb-3 pr-6 text-sm font-medium transition ${
            activeTab === "players"
              ? "border-b-2 border-[#ff6b8b] text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          รายชื่อผู้สมัคร ({event?.players?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("pairs")}
          className={`pb-3 px-6 text-sm font-medium transition ${
            activeTab === "pairs"
              ? "border-b-2 border-[#ff6b8b] text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          คู่ที่จับแล้ว ({event?.pairs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("ops")}
          className={`pb-3 px-6 text-sm font-medium transition ${
            activeTab === "ops"
              ? "border-b-2 border-[#ff6b8b] text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          ความปลอดภัย & กู้คืนฉุกเฉิน (Ops)
        </button>
      </div>

      {/* Tab: Players */}
      {activeTab === "players" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="py-3 px-4">ผู้เล่น</th>
                  <th className="py-3 px-4">เพศ</th>
                  <th className="py-3 px-4">เพศที่หา</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">ล็อกคู่</th>
                  <th className="py-3 px-4">วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {event?.players?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      ยังไม่มีผู้สมัครในรอบนี้
                    </td>
                  </tr>
                ) : (
                  event?.players?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 px-4 font-medium text-white">{p.displayName}</td>
                      <td className="py-3 px-4">{p.gender}</td>
                      <td className="py-3 px-4">{p.seeking}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.hasPartner ? "🔒 ขอล็อกคู่" : "โสด สุ่มคู่"}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500">
                        {new Date(p.joinedAt).toLocaleTimeString("th-TH")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Pairs */}
      {activeTab === "pairs" && (
        <div className="grid gap-4 md:grid-cols-2">
          {event?.pairs?.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-zinc-500">
              ยังไม่มีคู่ที่จับสำเร็จ กดปุ่ม "ยืนยันจับคู่" เมื่อพร้อม
            </div>
          ) : (
            event?.pairs?.map((pair: any) => (
              <div
                key={pair.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{pair.playerAId}</span>
                    <span className="text-[#ff6b8b]">❤️</span>
                    <span className="font-bold text-white">{pair.playerBId}</span>
                  </div>
                  <span className="rounded-full bg-[#ff6b8b]/20 px-2.5 py-0.5 text-xs font-bold text-[#ff6b8b]">
                    {pair.compatibility || 90}% เข้ากัน
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {pair.reason || "จับคู่โดยอัลกอริทึมความเข้ากัน"}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-850 pt-2 text-xs text-zinc-500">
                  <span>มินิเกม: {pair.gameSessions?.length || 0} เกม</span>
                  <span>จดหมาย: {pair.letters?.length || 0} ฉบับ</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Ops & Emergency */}
      {activeTab === "ops" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-base font-bold text-white">
              🚨 ส่งประกาศฉุกเฉินกรณีบอทดับ (Webhook Fallback)
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              หาก Discord Bot มีปัญหาไม่สามารถส่งข้อความได้ คุณสามารถยิงข้อความผ่าน Discord Webhook ได้ทันที
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="ข้อความประกาศฉุกเฉิน..."
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
              <button className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700">
                ส่งข้อความสำรอง
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-base font-bold text-white">
              💾 สำรองข้อมูลงานแฟนเดย์ (Data Snapshot Export)
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              ส่งออกรายชื่อผู้สมัครและผลการจับคู่ทั้งหมดเป็น JSON เพื่อความปลอดภัยและความโปร่งใส
            </p>
            <div className="mt-4">
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`}
                download="fanday_snapshot.json"
                className="inline-block rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
              >
                ดาวน์โหลด JSON Snapshot
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


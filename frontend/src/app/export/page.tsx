"use client";

import { useState } from "react";
import {
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Info,
} from "lucide-react";

type ExportStatus = "idle" | "generating" | "exported" | "error";

interface ExportResult {
  exported_storage_key: string;
  download_url?: string;
}

export default function ExportPage({
  params,
}: {
  params: { manuscriptId: string };
}) {
  const manuscriptId = params?.manuscriptId ?? "DEMO_MANUSCRIPT_ID";

  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerExport = async () => {
    setExportStatus("generating");
    setErrorMessage(null);
    setExportResult(null);

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/manuscripts/${manuscriptId}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Export failed with status ${res.status}`);
      }

      const data = await res.json();
      setExportResult({ exported_storage_key: data.exported_storage_key });

      // Fetch presigned download URL
      const dlRes = await fetch(
        `http://localhost:8000/api/v1/manuscripts/${manuscriptId}/export/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
          },
        }
      );
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        setExportResult((prev) => ({ ...prev!, download_url: dlData.download_url }));
      }

      setExportStatus("exported");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error during export";
      setErrorMessage(msg);
      setExportStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 mb-2">
            <FileDown className="h-3.5 w-3.5" />
            <span>Module 8 — Document Generation</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
            تصدير المخطوطة المُنسّقة
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            توليد ملف .docx جاهز للإرسال بصياغة المجلة المستهدفة
          </p>
        </div>

        {/* Prerequisite Note */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold mb-1">متطلب أساسي</p>
            <p>
              يجب أن تكون المخطوطة قد اجتازت قائمة التحقق المسبق (
              <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">
                CHECKLIST_PASSED
              </code>
              ) قبل التصدير. سيرفض النظام أي محاولة تصدير لمخطوطة لم تكتمل مراجعتها.
            </p>
          </div>
        </div>

        {/* Action Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center dark:bg-emerald-950 dark:text-emerald-400">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                توليد ملف .docx بصياغة المجلة المستهدفة
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                يقوم النظام بتطبيق قواعد الهوامش، الخطوط، تنسيق المراجع والتصريحات الإلزامية تلقائياً.
              </p>
            </div>
          </div>

          {/* Status Display */}
          {exportStatus === "idle" && (
            <button
              onClick={triggerExport}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:opacity-95 active:scale-95 transition-all"
            >
              <FileDown className="h-5 w-5" />
              <span>بدء عملية التوليد والتصدير</span>
            </button>
          )}

          {exportStatus === "generating" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
              <div className="text-center">
                <p className="text-base font-bold text-zinc-900 dark:text-white">
                  جارٍ توليد المستند...
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  يتم تطبيق تنسيق المجلة وتصميم الصفحة وعرض المراجع
                </p>
              </div>
            </div>
          )}

          {exportStatus === "exported" && exportResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/60">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    تم توليد المستند بنجاح!
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono break-all">
                    {exportResult.exported_storage_key}
                  </p>
                </div>
              </div>

              {exportResult.download_url && (
                <a
                  href={exportResult.download_url}
                  download
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-95 transition-all"
                >
                  <Download className="h-5 w-5" />
                  <span>تنزيل ملف .docx</span>
                </a>
              )}

              <button
                onClick={() => {
                  setExportStatus("idle");
                  setExportResult(null);
                }}
                className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2 transition-colors"
              >
                توليد نسخة جديدة
              </button>
            </div>
          )}

          {exportStatus === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/60">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">
                    فشل التصدير
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExportStatus("idle")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Known Limitations */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/40">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">
            ⚠️ حدود معروفة
          </h3>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1.5 list-disc pr-4">
            <li>
              معادلات LaTeX: تُعرض كنص خام مع إشارة <code>[FORMULA]</code> — التحويل إلى OMML/MathML مخطط في المرحلة الثانية.
            </li>
            <li>
              الجداول: تُكتب بنص Markdown مباشرة إذا لم تُحوَّل إلى جداول python-docx أثناء التحليل.
            </li>
            <li>
              الصور: لا تُضمَّن في المستند تلقائياً — الأصول المرفوعة تحتاج خطوة وضع منفصلة.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

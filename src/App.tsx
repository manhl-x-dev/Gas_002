import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, CheckCircle, AlertCircle, Loader2, Code, RefreshCw, Smartphone, ExternalLink, Activity } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [syncResults, setSyncResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (ai: any, prompt: string) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data; // base64 string
      }
    }
    throw new Error("لم يتم توليد الصورة");
  };

  const syncCodeToGitHub = async () => {
    setSyncLoading(true);
    setSyncResults(null);
    setError(null);

    try {
      const response = await fetch('/api/sync-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل مزامنة الكود');

      setSyncResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const generateAndUploadAssets = async () => {
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      // Initialize Gemini on Frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const assets = [
        { path: "assets/icon.png", prompt: "A professional, modern, flat design app icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024." },
        { path: "assets/splash-icon.png", prompt: "A professional, modern, flat design splash screen icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 2000x2000." },
        { path: "assets/adaptive-icon.png", prompt: "A professional, modern, flat design adaptive icon for a gas distribution system. Stylized white gas cylinder on a vibrant orange background (#f97316). 1024x1024." }
      ];

      const uploadResults = [];

      for (const asset of assets) {
        try {
          console.log(`Generating ${asset.path}...`);
          const base64Image = await generateImage(ai, asset.prompt);

          console.log(`Uploading ${asset.path} to GitHub via Proxy...`);
          const response = await fetch('/api/upload-to-github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: asset.path,
              content: base64Image
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'فشل الرفع');

          uploadResults.push({ path: asset.path, status: 'success' });
        } catch (err: any) {
          uploadResults.push({ path: asset.path, status: 'failed', error: err.message });
        }
      }

      setResults(uploadResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-orange-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">لوحة تحكم المطور</h1>
          <p className="text-orange-100 mt-2">إدارة بناء التطبيق ومزامنته مع GitHub</p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Assets */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">الأيقونات</h2>
            </div>
            <p className="text-sm text-gray-500">توليد أيقونات التطبيق وشاشة الترحيب بالذكاء الاصطناعي.</p>
            <button
              onClick={generateAndUploadAssets}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              {loading ? 'جاري التوليد...' : 'توليد ورفع الأيقونات'}
            </button>
            {results && (
              <div className="space-y-2 mt-4">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-gray-100">
                    <span className="truncate max-w-[120px]">{r.path}</span>
                    {r.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Code Sync */}
          <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <Code className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">مزامنة الكود</h2>
            </div>
            <p className="text-sm text-gray-500">رفع كافة التعديلات والإصلاحات الحالية مباشرة إلى GitHub.</p>
            <button
              onClick={syncCodeToGitHub}
              disabled={syncLoading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                syncLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {syncLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {syncLoading ? 'جاري المزامنة...' : 'مزامنة كافة الملفات'}
            </button>
            {syncResults && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                تمت مزامنة {syncResults.filter(r => r.status === 'success').length} ملف بنجاح!
              </div>
            )}
          </div>

          {/* Section 3: Build Status */}
          <div className="md:col-span-2 space-y-4 p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">حالة بناء التطبيق (Build)</h2>
              </div>
              <a 
                href="https://expo.dev/accounts/manhl-devs-organization/projects/gas-distribution/builds" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium"
              >
                فتح صفحة Expo <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-blue-800/70">
              بعد مزامنة الكود، سيبدأ GitHub Actions ببناء التطبيق. يمكنك متابعة التقدم عبر الرابط أعلاه.
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-8 mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-right">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">حدث خطأ</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Sun, 
  MapPin, 
  Wind, 
  Volume2, 
  ArrowRight,
  Loader2,
  Sparkles,
  ChevronRight,
  Info,
  X,
  Compass,
  ArrowLeft,
  Eye,
  ArrowUpCircle,
  AlertCircle,
  Home
} from 'lucide-react';
import { FlatType, UserPreferences, AnalysisResult, BTOUnit } from './types';
import { analyzeBTOPDF, analyzeSpecificUnit } from './services/geminiService';
import { SunshineMonitor } from './components/SunshineMonitor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [step, setStep] = useState<'upload' | 'preferences' | 'priorities' | 'analyzing' | 'results'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [preferences, setPreferences] = useState<UserPreferences>({
    flatType: FlatType.ROOM_4,
    floorPreference: 'High (20-30)',
    noiseSensitivity: { playground: true, road: true, mscp: true },
    sunshinePreference: { avoidAfternoonSun: true, morningSun: false },
    proximity: { mrt: true, schools: false, amenities: true },
    viewPreference: 'unblocked',
    liftWaitingTime: 'important',
    otherNotes: '',
    priorities: {
      noise: 3,
      sunshine: 3,
      proximity: 3,
      view: 3,
      lift: 3,
    },
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedUnitForSun, setSelectedUnitForSun] = useState<BTOUnit | null>(null);
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<BTOUnit | null>(null);
  const [comparisonUnit, setComparisonUnit] = useState<BTOUnit | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareForm, setCompareForm] = useState({ block: '', unit: '', floor: '' });
  const [isComparingLoading, setIsComparingLoading] = useState(false);
  const [isSunshineSearchOpen, setIsSunshineSearchOpen] = useState(false);
  const [sunshineSearchForm, setSunshineSearchForm] = useState({ block: '', unit: '', floor: '' });
  const [isSunshineSearchLoading, setIsSunshineSearchLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleSunshineSearch = async () => {
    if (!sunshineSearchForm.block || !sunshineSearchForm.unit || !sunshineSearchForm.floor) return;
    if (!pdfBase64) {
      alert("Please upload a PDF first!");
      return;
    }
    setIsSunshineSearchLoading(true);
    try {
      const unit = await analyzeSpecificUnit(
        pdfBase64,
        preferences,
        sunshineSearchForm.block,
        sunshineSearchForm.unit,
        parseInt(sunshineSearchForm.floor)
      );
      setSelectedUnitForSun(unit);
      setIsSunshineSearchOpen(false);
    } catch (error) {
      console.error("Sunshine search failed", error);
      alert("Failed to analyze unit for sunshine.");
    } finally {
      setIsSunshineSearchLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareForm.block || !compareForm.unit || !compareForm.floor) return;
    setIsComparingLoading(true);
    try {
      const unit = await analyzeSpecificUnit(
        pdfBase64,
        preferences,
        compareForm.block,
        compareForm.unit,
        parseInt(compareForm.floor)
      );
      setComparisonUnit(unit);
      setIsComparing(true);
    } catch (error) {
      console.error("Comparison failed", error);
      alert("Failed to analyze comparison unit.");
    } finally {
      setIsComparingLoading(false);
    }
  };

  const renderUnitDetails = (unit: BTOUnit, isComparison = false) => (
    <div className={cn("space-y-8", isComparison && "border-l border-gray-100 pl-8")}>
      <div className="flex items-center justify-between pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-3xl font-serif font-medium text-gray-900">Flat {unit.unitNumber}</h2>
          <p className="text-sm text-gray-500 italic font-serif mt-1">Block {unit.block} • Level {unit.floor} • {unit.type}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-serif font-medium text-[#d4a373]">{unit.score}</div>
          <div className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest">Overall Score</div>
        </div>
      </div>

      <section className="space-y-3">
        <h4 className="text-xs font-bold text-[#5a5a40] uppercase tracking-[0.2em]">Professional Insight</h4>
        <p className="text-base text-gray-700 leading-relaxed font-serif italic">"{unit.reasoning}"</p>
      </section>

      <div className="grid grid-cols-1 gap-4">
        {[
          { label: 'Noise', value: unit.detailedAnalysis.noise, grade: unit.grades.noise, icon: <Volume2 className="w-4 h-4 text-[#5a5a40]" /> },
          { label: 'Sunshine', value: unit.detailedAnalysis.sunshine, grade: unit.grades.sunshine, icon: <Sun className="w-4 h-4 text-[#d4a373]" /> },
          { label: 'Proximity', value: unit.detailedAnalysis.proximity, grade: unit.grades.proximity, icon: <MapPin className="w-4 h-4 text-green-600" /> },
          { label: 'View', value: unit.detailedAnalysis.view, grade: unit.grades.view, icon: <Eye className="w-4 h-4 text-purple-600" /> },
          { label: 'Lift', value: unit.detailedAnalysis.lift, grade: unit.grades.lift, icon: <ArrowUpCircle className="w-4 h-4 text-indigo-600" /> },
        ].map((item, i) => (
          <div key={i} className="p-5 bg-[#fdfcf9] rounded-2xl border border-[#d4a373]/5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider">{item.label}</span>
              </div>
              <div className={cn(
                "text-[10px] font-bold px-3 py-1 rounded-full border",
                item.grade >= 80 ? "bg-green-50 text-green-700 border-green-100" :
                item.grade >= 60 ? "bg-orange-50 text-orange-700 border-orange-100" :
                "bg-red-50 text-red-700 border-red-100"
              )}>
                {item.grade}%
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-serif italic">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8 pt-4">
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Key Advantages</h4>
          <div className="space-y-2">
            {unit.pros.map((pro, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-serif italic">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>{pro}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold text-red-700 uppercase tracking-widest border-b border-red-100 pb-2">Considerations</h4>
          <div className="space-y-2">
            {unit.cons.map((con, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-serif italic">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{con}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_SIZE_MB = 20;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`PDF is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please upload a PDF under ${MAX_SIZE_MB} MB.`);
        e.target.value = '';
        return;
      }
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setPdfBase64(base64);
        setStep('preferences');
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    setStep('analyzing');
    setAnalysisError(null);
    try {
      const result = await analyzeBTOPDF(pdfBase64, preferences);
      setAnalysis(result);
      setStep('results');
    } catch (error) {
      console.error("Analysis failed", error);
      const message = error instanceof Error ? error.message : String(error);
      setAnalysisError(message);
      setStep('preferences');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-black/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Dreamy BTO</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <button 
              onClick={() => setStep('upload')}
              className={cn(step === 'upload' ? "text-orange-600" : "hover:text-gray-900 transition-colors")}
            >
              Analyzer
            </button>
            <button 
              onClick={() => setIsSunshineSearchOpen(true)}
              className="hover:text-gray-900 transition-colors"
            >
              Sunshine Monitor
            </button>
            <a href="#" className="hover:text-gray-900 transition-colors">Guide</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-4xl font-bold tracking-tight text-gray-900">Find your perfect home.</h2>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                  Upload your BTO project brochure PDF and let our AI analyze the site plan, 
                  unit distribution, and sunshine exposure to find the best flat for you.
                </p>
              </div>

              <div className="max-w-xl mx-auto">
                <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-3xl bg-white hover:bg-gray-50 hover:border-orange-400 transition-all cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-orange-500" />
                    </div>
                    <p className="mb-2 text-sm text-gray-700 font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF (Max 20MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto pt-8">
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <h4 className="font-bold text-sm">1. Upload Brochure</h4>
                  <p className="text-xs text-gray-400">Upload the official HDB PDF brochure for your project.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <h4 className="font-bold text-sm">2. Set Preferences</h4>
                  <p className="text-xs text-gray-400">Tell us about your floor, noise, and sunshine preferences.</p>
                </div>
                <div className="space-y-3">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                  </div>
                  <h4 className="font-bold text-sm">3. AI Analysis</h4>
                  <p className="text-xs text-gray-400">Get ranked unit suggestions with detailed pros and cons.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {analysisError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Analysis failed</p>
                    <p className="text-xs leading-relaxed">{analysisError}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Your Preferences</h2>
                  <p className="text-gray-500 text-sm">Help us understand what matters most in your new home.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Flat Type */}
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Flat Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[FlatType.FLEXI_2_ROOM, FlatType.ROOM_4].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPreferences({ ...preferences, flatType: type })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                          preferences.flatType === type 
                            ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" 
                            : "bg-white text-gray-600 border-gray-200 hover:border-orange-200"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floor Preference */}
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" /> Floor Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Low (1-9)", "Mid (10-19)", "High (20-30)", "Very High (30+)", "No Preference"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setPreferences({ ...preferences, floorPreference: f as any })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                          preferences.floorPreference === f 
                            ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" 
                            : "bg-white text-gray-600 border-gray-200 hover:border-orange-200"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Sensitivity */}
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> Noise Sensitivity
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Playground Noise?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.noiseSensitivity.playground}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          noiseSensitivity: { ...preferences.noiseSensitivity, playground: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Road Noise?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.noiseSensitivity.road}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          noiseSensitivity: { ...preferences.noiseSensitivity, road: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Car Park (MSCP) Noise?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.noiseSensitivity.mscp}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          noiseSensitivity: { ...preferences.noiseSensitivity, mscp: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Proximity */}
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Proximity
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Near MRT/Bus?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.proximity.mrt}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          proximity: { ...preferences.proximity, mrt: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Near Schools?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.proximity.schools}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          proximity: { ...preferences.proximity, schools: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Near Amenities?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.proximity.amenities}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          proximity: { ...preferences.proximity, amenities: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Sunshine & View */}
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Environment
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Avoid Afternoon Sun?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.sunshinePreference.avoidAfternoonSun}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          sunshinePreference: { ...preferences.sunshinePreference, avoidAfternoonSun: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <span className="text-sm text-gray-600">Prefer Morning Sun?</span>
                      <input 
                        type="checkbox" 
                        checked={preferences.sunshinePreference.morningSun}
                        onChange={(e) => setPreferences({
                          ...preferences, 
                          sunshinePreference: { ...preferences.sunshinePreference, morningSun: e.target.checked }
                        })}
                        className="w-5 h-5 accent-orange-500"
                      />
                    </label>
                    <div className="pt-2">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">View Preference</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['unblocked', 'garden', 'no-preference'].map((v) => (
                          <button
                            key={v}
                            onClick={() => setPreferences({ ...preferences, viewPreference: v as any })}
                            className={cn(
                              "px-2 py-2 rounded-lg text-[10px] font-bold border capitalize transition-all",
                              preferences.viewPreference === v 
                                ? "bg-orange-500 text-white border-orange-500" 
                                : "bg-white text-gray-500 border-gray-200"
                            )}
                          >
                            {v.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                <label className="text-sm font-semibold text-gray-700">Other Notes / Specific Requirements</label>
                <textarea
                  value={preferences.otherNotes}
                  onChange={(e) => setPreferences({ ...preferences, otherNotes: e.target.value })}
                  placeholder="e.g. Near MRT, high floor with unblocked view..."
                  className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep('priorities')}
                  className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 transition-all"
                >
                  Next: Set Priorities <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'priorities' && (
            <motion.div
              key="priorities"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ArrowUpCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Set Your Priorities</h2>
                  <p className="text-gray-500 text-sm">Rank how important each factor is to you (1 = Low, 5 = High).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'noise', label: 'Noise Sensitivity', icon: <Volume2 className="w-5 h-5 text-blue-500" /> },
                  { key: 'sunshine', label: 'Sunshine Exposure', icon: <Sun className="w-5 h-5 text-orange-500" /> },
                  { key: 'proximity', label: 'Proximity & Convenience', icon: <MapPin className="w-5 h-5 text-green-500" /> },
                  { key: 'view', label: 'View & Privacy', icon: <Eye className="w-5 h-5 text-purple-500" /> },
                  { key: 'lift', label: 'Lift Waiting Time', icon: <ArrowUpCircle className="w-5 h-5 text-indigo-500" /> },
                ].map((item) => (
                  <div key={item.key} className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="font-semibold text-gray-900">{item.label}</span>
                      </div>
                      <span className="text-lg font-bold text-orange-500">{preferences.priorities[item.key as keyof typeof preferences.priorities]}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={preferences.priorities[item.key as keyof typeof preferences.priorities]}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        priorities: { ...preferences.priorities, [item.key]: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
                      <span>Low Priority</span>
                      <span>High Priority</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('preferences')}
                  className="px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={runAnalysis}
                  className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 transition-all"
                >
                  Analyze Project <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-orange-100 rounded-full animate-pulse" />
                <Loader2 className="w-24 h-24 text-orange-500 animate-spin absolute top-0" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">AI is analyzing your BTO...</h3>
                <p className="text-gray-500">Processing site plans, unit facings, and noise levels.</p>
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              {/* Project Overview */}
              <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-orange-600 font-bold uppercase tracking-wider text-xs">
                  <Info className="w-4 h-4" /> Project Overview
                </div>
                <h2 className="text-3xl font-bold">Analysis Results</h2>
                <p className="text-gray-600 leading-relaxed">{analysis.projectOverview}</p>
              </div>

              {/* Suggestions */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  Top Recommended Units
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analysis.topSuggestions.map((unit, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedUnitForDetails(unit)}
                      className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4 flex flex-col cursor-pointer hover:border-orange-200 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-serif font-medium text-[#d4a373] bg-[#fdfcf9] px-3 py-1 rounded-full border border-[#d4a373]/10 shadow-sm">
                          Score: {unit.score}
                        </div>
                        <div className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest">#{unit.unitNumber}</div>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-2xl font-serif font-medium text-gray-900">Flat {unit.unitNumber}</h4>
                        <p className="text-xs text-gray-500 italic font-serif">Block {unit.block} • {unit.type} • Floor {unit.floor}</p>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {unit.pros.slice(0, 2).map((pro, i) => (
                            <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-green-100">
                              + {pro}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3 font-serif italic leading-relaxed">"{unit.reasoning}"</p>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-gray-50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnitForSun(unit);
                          }}
                          className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Sun className="w-4 h-4" /> Sunshine
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnitForDetails(unit);
                          }}
                          className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={() => setStep('upload')}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Start Over
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sunshine Search Modal */}
      {isSunshineSearchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-8 relative"
          >
            <button 
              onClick={() => setIsSunshineSearchOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#fdfcf9] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#d4a373]/10 shadow-sm">
                  <Sun className="w-8 h-8 text-[#d4a373]" />
                </div>
                <h3 className="text-2xl font-serif font-medium text-gray-900">Sunshine Monitor</h3>
                <p className="text-sm text-gray-500 italic font-serif mt-2">Enter unit details to visualize solar impact</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest">Block</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 144A"
                      value={sunshineSearchForm.block}
                      onChange={(e) => setSunshineSearchForm({ ...sunshineSearchForm, block: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-[#fdfcf9] text-sm font-serif focus:border-[#d4a373] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest">Flat No.</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 111"
                      value={sunshineSearchForm.unit}
                      onChange={(e) => setSunshineSearchForm({ ...sunshineSearchForm, unit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-[#fdfcf9] text-sm font-serif focus:border-[#d4a373] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest">Level</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 18"
                      value={sunshineSearchForm.floor}
                      onChange={(e) => setSunshineSearchForm({ ...sunshineSearchForm, floor: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-[#fdfcf9] text-sm font-serif focus:border-[#d4a373] outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSunshineSearch}
                  disabled={isSunshineSearchLoading || !pdfBase64}
                  className="w-full py-5 bg-[#5a5a40] text-white rounded-2xl font-bold hover:bg-[#4a4a30] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSunshineSearchLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  {pdfBase64 ? "Generate Sunshine Chart" : "Upload PDF First"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sunshine Monitor Modal */}
      {selectedUnitForSun && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-y-auto relative"
          >
            <button 
              onClick={() => setSelectedUnitForSun(null)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-10">
              <SunshineMonitor 
                unitFacing={selectedUnitForSun.facing} 
                unitId={selectedUnitForSun.unitNumber}
                flatType={selectedUnitForSun.type}
                pdfData={pdfBase64}
                pageNumber={selectedUnitForSun.floorPlanPage}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      {selectedUnitForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto relative transition-all",
              isComparing ? "max-w-6xl" : "max-w-2xl"
            )}
          >
            <button 
              onClick={() => {
                setSelectedUnitForDetails(null);
                setIsComparing(false);
                setComparisonUnit(null);
              }}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-8">
              <div className={cn("grid gap-8", isComparing ? "grid-cols-2" : "grid-cols-1")}>
                {renderUnitDetails(selectedUnitForDetails)}
                {isComparing && comparisonUnit && renderUnitDetails(comparisonUnit, true)}
              </div>

              {!isComparing && (
                <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      Compare with another unit
                    </h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Block</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 144A"
                          value={compareForm.block}
                          onChange={(e) => setCompareForm({ ...compareForm, block: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Flat No.</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 111"
                          value={compareForm.unit}
                          onChange={(e) => setCompareForm({ ...compareForm, unit: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 18"
                          value={compareForm.floor}
                          onChange={(e) => setCompareForm({ ...compareForm, floor: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCompare}
                      disabled={isComparingLoading}
                      className="w-full py-3 bg-white border border-orange-200 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isComparingLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      Compare Now
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedUnitForSun(selectedUnitForDetails);
                      setSelectedUnitForDetails(null);
                    }}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    <Sun className="w-5 h-5" /> Open Sunshine Monitor
                  </button>
                </div>
              )}

              {isComparing && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                  <button
                    onClick={() => setIsComparing(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Back to Details
                  </button>
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedUnitForSun(selectedUnitForDetails);
                      }}
                      className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                    >
                      <Sun className="w-5 h-5" /> Sun (Unit 1)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUnitForSun(comparisonUnit);
                      }}
                      className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                      <Sun className="w-5 h-5" /> Sun (Unit 2)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Dreamy BTO © 2026</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacy</a>
            <a href="#" className="hover:text-gray-600">Terms</a>
            <a href="#" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

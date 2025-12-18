
import React, { useState, useCallback } from 'react';
import { 
  Clapperboard, 
  BookOpen, 
  Youtube, 
  Send, 
  Loader2, 
  Printer, 
  Copy, 
  Check, 
  AlertCircle,
  Settings,
  FileText,
  HelpCircle,
  Clock,
  MonitorPlay,
  FileCode
} from 'lucide-react';
import { LessonPlan, InputType, AcademicLevel } from './types';
import { generateLessonPlan } from './geminiService';

const App: React.FC = () => {
  // States
  const [inputType, setInputType] = useState<InputType>('movie');
  const [sourceValue, setSourceValue] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<AcademicLevel>('高中');
  const [segmentCount, setSegmentCount] = useState(3);
  const [questionCount, setQuestionCount] = useState(5);
  const [transcript, setTranscript] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LessonPlan | null>(null);
  const [showTranscriptHelp, setShowTranscriptHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!sourceValue || !subject) {
      setError('請填寫影片名稱/網址與科目');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const plan = await generateLessonPlan({
        inputType,
        sourceValue,
        subject,
        level,
        segmentCount,
        questionCount,
        transcript
      });
      setResult(plan);
    } catch (err: any) {
      setError(err.message || '生成失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `
一、單元主題
主題名稱：${result.theme.title}
教材來源：${result.theme.source}

二、搭配課程章節單元
領域/科目：${result.curriculum.domain}
適用年級：${result.curriculum.grade}
對應學習內容：
${result.curriculum.items.map(item => `${item.code}：${item.content}`).join('\n')}

三、學習段落
${result.segments.map((seg, idx) => `
段落 ${idx + 1}：${seg.title} (${seg.time})
${seg.points.map(p => `• ${p}`).join('\n')}
`).join('\n')}

四、Deep Dive
${result.deepDive.map(d => `${d.term}：${d.explanation}`).join('\n')}

五、Q&A
${result.qa.map((q, idx) => `Q${idx + 1}: ${q.question}\nA: ${q.answer}`).join('\n')}
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToWord = () => {
    if (!result) return;
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${result.theme.title}</title>
      <style>
        body { font-family: "Microsoft JhengHei", sans-serif; }
        h1 { color: #1e40af; text-align: center; }
        h2 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; }
        .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin: 10px 0; }
      </style>
      </head><body>
        <h1>${result.theme.title}</h1>
        <p>來源：${result.theme.source}</p>
        <h2>一、課綱匹配</h2>
        <p>科目：${result.curriculum.domain} | 年級：${result.curriculum.grade}</p>
        <ul>${result.curriculum.items.map(i => `<li><b>${i.code}</b>: ${i.content}</li>`).join('')}</ul>
        <h2>二、學習段落</h2>
        ${result.segments.map(s => `<h3>${s.title} (${s.time})</h3><ul>${s.points.map(p => `<li>${p}</li>`).join('')}</ul>`).join('')}
        <h2>三、專業解析</h2>
        ${result.deepDive.map(d => `<div class="box"><b>${d.term}</b>: ${d.explanation}</div>`).join('')}
        <h2>四、問答</h2>
        ${result.qa.map(q => `<p><b>Q: ${q.question}</b><br/>A: ${q.answer}</p>`).join('')}
      </body></html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.theme.title}_教案.doc`;
    link.click();
  };

  const exportToPPT = async () => {
    if (!result || !(window as any).PptxGenJS) return;
    setExporting(true);
    try {
      const PptxGenJS = (window as any).PptxGenJS;
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_16x9';

      // Cover
      let slide = pres.addSlide();
      slide.background = { color: '1e3a8a' };
      slide.addText(result.theme.title, { x: 0.5, y: 2, w: '90%', fontSize: 40, color: 'FFFFFF', align: 'center', bold: true });
      slide.addText(result.theme.source, { x: 0.5, y: 3.5, w: '90%', fontSize: 20, color: 'e2e8f0', align: 'center' });

      // Segments
      result.segments.forEach((seg, i) => {
        slide = pres.addSlide();
        slide.addText(`段落 ${i+1}: ${seg.title}`, { x: 0.5, y: 0.5, fontSize: 28, color: '1e3a8a', bold: true });
        slide.addText(seg.time, { x: 0.5, y: 1.2, fontSize: 16, color: 'ea580c' });
        const bulletPoints = seg.points.map(p => ({ text: p, options: { bullet: true, fontSize: 18 } }));
        slide.addText(bulletPoints, { x: 0.5, y: 1.8, w: '90%', h: 4 });
      });

      // Q&A
      slide = pres.addSlide();
      slide.addText('課後問答', { x: 0.5, y: 0.5, fontSize: 32, bold: true });
      const qaText = result.qa.flatMap(q => [
        { text: `Q: ${q.question}`, options: { fontSize: 18, bold: true, color: '1e40af' } },
        { text: `A: ${q.answer}`, options: { fontSize: 16, paraSpaceAfter: 10 } }
      ]);
      slide.addText(qaText, { x: 0.5, y: 1.5, w: '90%' });

      await pres.writeFile({ fileName: `${result.theme.title}_簡報.pptx` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white pb-12">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Clapperboard className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI 影音教材教案生成器</h1>
            <p className="text-xs text-indigo-100 opacity-80 uppercase tracking-widest">Educational AI Assistant • 108 Curriculum</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar: Controls */}
        <aside className="lg:col-span-4 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-900 border-b pb-4">
              <Settings className="w-5 h-5 text-indigo-600" />
              生成參數設定
            </h2>

            {/* Input Type Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setInputType('movie')}
                className={`flex-1 py-2.5 text-sm rounded-lg flex justify-center items-center gap-2 transition-all ${inputType === 'movie' ? 'bg-white shadow-md text-indigo-700 font-bold' : 'text-slate-500'}`}
              >
                <FileCode size={16} /> 電影/紀錄片
              </button>
              <button 
                onClick={() => setInputType('youtube')}
                className={`flex-1 py-2.5 text-sm rounded-lg flex justify-center items-center gap-2 transition-all ${inputType === 'youtube' ? 'bg-white shadow-md text-red-600 font-bold' : 'text-slate-500'}`}
              >
                <Youtube size={16} /> YouTube
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700">影片名稱或網址</label>
                <input 
                  type="text" 
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  placeholder={inputType === 'movie' ? '例如：奧本海默' : '貼上網址或輸入影片標題'}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-semibold text-slate-700">內容逐字稿 (建議填寫)</label>
                  <button onClick={() => setShowTranscriptHelp(!showTranscriptHelp)} className="text-indigo-500 hover:text-indigo-700"><HelpCircle size={16} /></button>
                </div>
                {showTranscriptHelp && (
                  <div className="mb-2 p-3 bg-indigo-50 text-xs text-indigo-800 rounded-lg leading-relaxed border border-indigo-100">
                    貼上字幕或逐字稿，AI 能精準提取細節，生成的教案會更實用且深入。
                  </div>
                )}
                <textarea 
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="在此貼上影片的字幕、轉錄稿或詳細介紹..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-40 text-sm leading-relaxed resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">搭配科目</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="物理、歷史..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700">適用學制</label>
                  <select 
                    value={level}
                    onChange={(e) => setLevel(e.target.value as AcademicLevel)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                  >
                    <option value="高中">普通高中</option>
                    <option value="技高">技術高中</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wide text-slate-500">
                    <label>段落數</label>
                    <span className="text-indigo-600">{segmentCount}</span>
                  </div>
                  <input type="range" min="3" max="8" value={segmentCount} onChange={(e) => setSegmentCount(Number(e.target.value))} className="w-full accent-indigo-600" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 uppercase tracking-wide text-slate-500">
                    <label>Q&A 題數</label>
                    <span className="text-indigo-600">{questionCount}</span>
                  </div>
                  <input type="range" min="3" max="10" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full accent-indigo-600" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                {loading ? 'AI 教案生成中...' : '開始生成教案'}
              </button>
            </div>
          </div>
        </aside>

        {/* Main: Preview */}
        <section className="lg:col-span-8">
          {result ? (
            <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
              {/* Toolbar */}
              <div className="bg-slate-50 p-4 flex flex-wrap gap-2 justify-between items-center border-b border-slate-200 sticky top-0 z-10 print:hidden">
                <span className="text-sm font-bold text-slate-500 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                  AI 生成教案預覽
                </span>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={exportToPPT} disabled={exporting} className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm disabled:opacity-50">
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <MonitorPlay size={16} />}
                    PPT
                  </button>
                  <button onClick={exportToWord} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm">
                    <FileText size={16} />
                    Word
                  </button>
                  <div className="w-px h-6 bg-slate-300 mx-1"></div>
                  <button onClick={handleCopy} className="flex items-center gap-2 text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                    {copied ? <Check size={16} className="text-green-600"/> : <Copy size={16} />}
                    {copied ? '已複製' : '複製內容'}
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
                    <Printer size={16} />
                    PDF
                  </button>
                </div>
              </div>

              {/* Document Container */}
              <div className="p-8 md:p-16 space-y-10 bg-white" id="lesson-plan">
                <div className="text-center space-y-4 border-b pb-8">
                  <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">影音教材教學規劃表</h1>
                  <p className="text-slate-500 font-medium tracking-wide">
                    【{inputType === 'movie' ? '電影' : '影片'}來源】 {result.theme.source}
                  </p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">1</span>
                    單元主題：{result.theme.title}
                  </h3>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 border-b pb-3">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">2</span>
                    搭配 108 課綱內容
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1 tracking-widest">領域 / 科目</p>
                      <p className="text-xl font-bold text-slate-800">{result.curriculum.domain}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <p className="text-slate-400 text-xs font-bold uppercase mb-1 tracking-widest">適用年級</p>
                      <p className="text-xl font-bold text-slate-800">{result.curriculum.grade}</p>
                    </div>
                  </div>
                  <div className="pl-11 space-y-3">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">對應學習條目</p>
                    {result.curriculum.items.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <span className="font-mono bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold h-fit min-w-[100px] text-center">{item.code}</span>
                        <p className="text-slate-700 leading-relaxed font-medium">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 border-b pb-3">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">3</span>
                    影片學習段落與解析
                  </h3>
                  <div className="pl-11 space-y-10">
                    {result.segments.map((s, i) => (
                      <div key={i} className="relative pl-8 border-l-4 border-slate-200">
                        <div className="absolute -left-[14px] top-0 bg-white border-4 border-indigo-600 w-6 h-6 rounded-full"></div>
                        <div className="space-y-3">
                          <h4 className="text-xl font-bold text-slate-800">{s.title}</h4>
                          <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-sm font-bold border border-orange-200">
                            <Clock size={16} /> {s.time}
                          </span>
                          <ul className="grid gap-2 text-slate-600 mt-4">
                            {s.points.map((p, pi) => (
                              <li key={pi} className="flex gap-3 items-start">
                                <span className="text-indigo-500 mt-1">•</span>
                                <span className="font-medium">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 border-b pb-3">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">4</span>
                    Deep Dive 深度解析
                  </h3>
                  <div className="pl-11 grid gap-4">
                    {result.deepDive.map((d, i) => (
                      <div key={i} className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 group hover:bg-indigo-50 transition-colors">
                        <h4 className="font-bold text-indigo-900 text-lg mb-2 flex items-center gap-2">
                          <BookOpen size={20} className="text-indigo-600" />
                          {d.term}
                        </h4>
                        <p className="text-slate-700 leading-relaxed font-medium">{d.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 page-break-before">
                  <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3 border-b pb-3">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold">5</span>
                    課後測驗 Q&A
                  </h3>
                  <div className="pl-11 space-y-6">
                    {result.qa.map((qa, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                          <span className="font-black text-indigo-400">Q{i+1}.</span>
                          <p className="font-bold">{qa.question}</p>
                        </div>
                        <div className="flex gap-4 p-5 bg-emerald-50 text-slate-800 rounded-2xl border border-emerald-100 ml-4">
                          <span className="font-black text-emerald-600">A.</span>
                          <p className="font-medium">{qa.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-300 text-slate-400 p-12 text-center shadow-inner">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
                <FileCode size={48} className="text-indigo-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-700 mb-3">準備好生成你的專屬教案了嗎？</h3>
              <p className="max-w-md mx-auto text-slate-500 mb-8 leading-relaxed">
                在左側輸入影片資訊與學制，AI 將會結合 108 課綱條目與影片內容，為您打造完整的教學規劃。
              </p>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-indigo-600/60">
                <span>自動匹配課綱</span>
                <span>•</span>
                <span>智能段落解析</span>
                <span>•</span>
                <span>深度術語說明</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;

import React, { useState, useRef, useMemo, useEffect } from 'react';
// import './index.css'; // --- 已移除：在当前预览环境中不需要此行，Tailwind 会自动生效 ---
import { 
  Cloud, 
  HardDrive, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Folder, 
  Search, 
  Plus, 
  UploadCloud, 
  Grid, 
  List as ListIcon, 
  Trash2,
  X,
  File,
  ChevronRight,
  AlertTriangle,
  FolderPlus,
  RefreshCw,
  Share2,
  Copy,
  LogOut,
  Lock,
  User,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Check,
  Sparkles,
  Bot,
  Send,
  Loader2,
  Eye,
  Crown,       // 新增：皇冠图标
  CreditCard,  // 新增：支付图标
  Zap,         // 新增：闪电图标（加速）
  CheckCircle2, // 新增：成功图标
  QrCode       // 新增：二维码图标
} from 'lucide-react';

// --- 全局配置 ---
const APP_NAME = "元哥云盘";

// --- Gemini API 配置 ---
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// --- 会员套餐配置 ---
const VIP_PLANS = [
  { 
    id: 'monthly', 
    name: '普通月卡', 
    price: '19', 
    period: '/月', 
    storage: '2TB', 
    features: ['2TB 超大空间', '极速下载', '视频倍速播放'],
    color: 'bg-blue-500',
    tag: null
  },
  { 
    id: 'yearly', 
    name: '超值年卡', 
    price: '198', 
    period: '/年', 
    storage: '5TB', 
    features: ['5TB 海量空间', '极速上传下载', '视频倍速播放', '大文件上传'],
    color: 'bg-indigo-600',
    tag: '推荐'
  },
  { 
    id: 'svip', 
    name: '超级会员', 
    price: '298', 
    period: '/年', 
    storage: '10TB', 
    features: ['10TB 顶级空间', '无限极速', 'AI 助手无限次', '专属客服'],
    color: 'bg-gradient-to-r from-amber-500 to-orange-600',
    tag: '尊贵'
  }
];

// --- 辅助函数 ---
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (dateObj = new Date()) => {
  const pad = (n) => n.toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hour = pad(dateObj.getHours());
  const minute = pad(dateObj.getMinutes());
  const second = pad(dateObj.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const getFileIcon = (type, mimeType) => {
  if (type === 'folder') return <Folder className="w-10 h-10 text-yellow-400 fill-current" />;
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-10 h-10 text-purple-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="w-10 h-10 text-red-500" />;
  if (mimeType?.startsWith('audio/')) return <Music className="w-10 h-10 text-pink-500" />;
  if (mimeType?.includes('pdf') || mimeType?.includes('document')) return <FileText className="w-10 h-10 text-blue-500" />;
  return <File className="w-10 h-10 text-gray-400" />;
};

// --- API 调用函数 (Gemini) ---
const callGeminiAPI = async (prompt, imageBase64 = null) => {
  const apiKey = ""; 
  
  const contents = [{
    parts: [
      { text: prompt }
    ]
  }];

  if (imageBase64) {
    contents[0].parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 暂时无法回答。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "抱歉，AI 服务连接失败，请稍后再试。";
  }
};

const blobUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Image conversion failed", e);
    return null;
  }
};

// --- 组件：Toast 提示 ---
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in-down">
      <div className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-white ${type === 'success' ? 'bg-green-600' : 'bg-gray-800'}`}>
        {type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// --- 组件：会员开通弹窗 (新增) ---
const VipUpgradeModal = ({ isOpen, onClose, onUpgradeSuccess }) => {
  const [selectedPlanId, setSelectedPlanId] = useState('yearly');
  const [step, setStep] = useState('select'); // 'select' | 'pay' | 'success'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const selectedPlan = VIP_PLANS.find(p => p.id === selectedPlanId);

  const handlePay = () => {
    setIsProcessing(true);
    // 模拟支付过程
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');
      // 2秒后自动关闭并通知父组件
      setTimeout(() => {
        onUpgradeSuccess(selectedPlan);
        onClose();
        setStep('select'); // 重置状态
      }, 2000);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-scale-in max-h-[90vh]">
        
        {/* 左侧：权益展示 */}
        <div className="bg-gray-900 text-white p-8 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-black opacity-50 z-0"></div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-600 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg">
                <Crown size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold italic">SVIP</h2>
            </div>
            <h3 className="text-3xl font-bold mb-2">开启尊贵体验</h3>
            <p className="text-gray-400 mb-8">突破限制，畅享极速云端</p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/10 rounded-full"><HardDrive size={20} className="text-blue-400"/></div>
                <div>
                  <h4 className="font-bold">海量存储</h4>
                  <p className="text-xs text-gray-400">最高 10TB 超大空间</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/10 rounded-full"><Zap size={20} className="text-yellow-400"/></div>
                <div>
                  <h4 className="font-bold">极速传输</h4>
                  <p className="text-xs text-gray-400">下载不限速，上传秒传</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/10 rounded-full"><Sparkles size={20} className="text-purple-400"/></div>
                <div>
                  <h4 className="font-bold">AI 特权</h4>
                  <p className="text-xs text-gray-400">无限次 AI 智能分析</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-8 text-xs text-gray-500 text-center">
            元哥云盘 · 让存储更简单
          </div>
        </div>

        {/* 右侧：交互区域 */}
        <div className="flex-1 bg-white p-8 flex flex-col relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>

          {step === 'select' && (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-6">选择您的会员方案</h3>
              
              <div className="grid gap-4 mb-8 overflow-y-auto pr-2 flex-1">
                {VIP_PLANS.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between ${
                      selectedPlanId === plan.id 
                        ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    {plan.tag && (
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm font-bold transform rotate-12">
                        {plan.tag}
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${plan.color}`}>
                        {plan.name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          {plan.name}
                          {selectedPlanId === plan.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                          {plan.features.slice(0, 2).map((f, i) => (
                            <span key={i} className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">¥{plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span></div>
                      <div className="text-xs text-gray-400 line-through">原价 ¥{parseInt(plan.price) * 1.5}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t border-gray-100 pt-6 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 text-sm">应付金额:</span>
                  <div className="text-3xl font-bold text-indigo-600">¥{selectedPlan.price}</div>
                </div>
                <button 
                  onClick={() => setStep('pay')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:scale-105"
                >
                  立即开通
                </button>
              </div>
            </>
          )}

          {step === 'pay' && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">支付订单</h3>
              <p className="text-gray-500 mb-8">请扫描下方二维码完成支付</p>
              
              <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-6 relative group cursor-pointer" onClick={handlePay}>
                <QrCode size={180} className="text-gray-800" />
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-indigo-600 font-bold mb-2">点击模拟支付成功</span>
                   <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                     <Check size={24} />
                   </div>
                </div>
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10">
                     <Loader2 size={40} className="animate-spin text-indigo-600 mb-2" />
                     <span className="text-sm font-medium text-gray-600">支付确认中...</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 items-center justify-center w-full mb-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div> 微信支付
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div> 支付宝
                </div>
              </div>

              <div className="w-full flex justify-between border-t border-gray-100 pt-4">
                <button onClick={() => setStep('select')} className="text-gray-500 hover:text-gray-800">返回选择</button>
                <div className="text-right">
                  <span className="text-sm text-gray-500">支付金额: </span>
                  <span className="font-bold text-lg text-red-600">¥{selectedPlan.price}</span>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full animate-scale-in text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">开通成功！</h2>
              <p className="text-gray-500 mb-8 max-w-xs">恭喜您成为尊贵的 {selectedPlan.name}，您的 {selectedPlan.storage} 空间已立即生效。</p>
              <div className="animate-bounce">
                <Crown size={32} className="text-amber-500 fill-current" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// --- 组件：文件预览模态框 (保持不变) ---
const FilePreviewModal = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col animate-fade-in">
      <div className="h-16 flex items-center justify-between px-6 bg-black/50 backdrop-blur-sm text-white">
        <div className="flex items-center gap-3 overflow-hidden">
          {getFileIcon(file.type, file.mimeType)}
          <div className="flex flex-col min-w-0">
             <span className="font-medium truncate max-w-md">{file.name}</span>
             <span className="text-xs text-gray-400">{formatBytes(file.size)} • {file.date}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {file.url && (
               <a href={file.url} download={file.name} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white" title="下载"><ArrowRight className="rotate-90" size={20} /></a>
           )}
           <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {isImage ? (
          <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain shadow-2xl" />
        ) : isVideo ? (
          <video src={file.url} controls autoPlay className="max-w-full max-h-full shadow-2xl" />
        ) : (
          <div className="text-center text-gray-400">
             <div className="mb-6 flex justify-center"><FileText size={80} className="opacity-50" /></div>
             <h3 className="text-xl font-medium text-white mb-2">无法在线预览此文件</h3>
             <p className="mb-6">该格式 ({file.mimeType || '未知'}) 暂不支持预览</p>
             {file.url && <a href={file.url} download className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"><ArrowRight className="rotate-90" size={16} />下载文件</a>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 组件：AI 助手面板 (保持不变) ---
const AIAssistantPanel = ({ isOpen, onClose, selectedFile }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: '你好！我是元哥云盘的 AI 助手。我可以帮你解读图片、总结文档或回答任何问题。' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && selectedFile) {
       setMessages(prev => [...prev, { 
         role: 'ai', 
         text: `我注意到你选中了 "${selectedFile.name}"。点击下方的 "✨ 智能解读" 按钮，我可以为你分析它。` 
       }]);
    }
  }, [selectedFile, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    const responseText = await callGeminiAPI(input);
    setIsThinking(false);
    setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) return;
    const prompt = `请详细分析并描述这个文件的内容：${selectedFile.name}。如果这是一张图片，请详细描述画面细节；如果这是一个文档，请根据文件名猜测其可能包含的核心主题。`;
    const userMsg = { role: 'user', text: `✨ 请帮我解读文件：${selectedFile.name}` };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    let imageBase64 = null;
    if (selectedFile.url && selectedFile.mimeType?.startsWith('image/')) {
        imageBase64 = await blobUrlToBase64(selectedFile.url);
    }
    const responseText = await callGeminiAPI(prompt, imageBase64);
    setIsThinking(false);
    setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col animate-slide-in-right">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-2"><Sparkles size={18} className="animate-pulse" /><span className="font-bold">AI 智能助手</span></div>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
              {msg.role === 'ai' && <Bot size={14} className="mb-1 text-indigo-500" />}{msg.text}
            </div>
          </div>
        ))}
        {isThinking && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin text-indigo-500" />Gemini 正在思考...</div></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-100">
        {selectedFile && <button onClick={handleAnalyzeFile} disabled={isThinking} className="w-full mb-3 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100 hover:bg-purple-100 flex items-center justify-center gap-2 transition"><Sparkles size={14} />AI 解读 "{selectedFile.name}"</button>}
        <div className="relative">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="问点什么..." className="w-full pl-4 pr-10 py-3 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl text-sm transition-all outline-none" />
          <button onClick={handleSend} disabled={!input.trim() || isThinking} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 transition"><Send size={14} /></button>
        </div>
      </div>
    </div>
  );
};

// --- 组件：复杂登录/注册/找回系统 (保持不变) ---
const AuthSystem = ({ onLogin }) => {
  const [mode, setMode] = useState('login-pass');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = () => {
    if (!phone || phone.length < 11) {
      setToast({ msg: '请输入正确的手机号', type: 'error' });
      return;
    }
    if (countdown > 0) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => {
      setToast({ msg: `[模拟短信] 您的验证码是 8866，有效期5分钟。`, type: 'success' });
      setCode('8866');
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (mode === 'register') {
         setToast({ msg: '注册成功，自动为您登录', type: 'success' });
         setTimeout(() => onLogin(name || '新用户'), 1000);
      } else if (mode === 'forgot') {
         setToast({ msg: '密码重置成功，请重新登录', type: 'success' });
         setMode('login-pass');
      } else {
         if (mode === 'login-pass' && (!phone || !password)) {
            setToast({ msg: '请输入账号和密码', type: 'error' });
            return;
         }
         onLogin(name || '元哥的朋友');
      }
    }, 1200);
  };

  const getTitle = () => {
    if (mode === 'register') return '创建账号';
    if (mode === 'forgot') return '重置密码';
    return '欢迎回来';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center space-x-2 mb-8 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Cloud className="text-white w-7 h-7" />
            </div>
            <span className="text-3xl font-bold text-gray-800 tracking-tight">{APP_NAME}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">{getTitle()}</h2>
          <p className="text-gray-400 text-sm mb-8 text-center">{mode === 'register' ? '加入我们，开启云端生活' : '安全存储，极速传输'}</p>
          {(mode === 'login-pass' || mode === 'login-sms') && (
            <div className="flex border-b border-gray-100 mb-6">
              <button onClick={() => setMode('login-pass')} className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'login-pass' ? 'text-blue-600' : 'text-gray-400'}`}>密码登录{mode === 'login-pass' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}</button>
              <button onClick={() => setMode('login-sms')} className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${mode === 'login-sms' ? 'text-blue-600' : 'text-gray-400'}`}>验证码登录{mode === 'login-sms' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>}</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">您的昵称</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="例如：元哥" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">手机号码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Smartphone className="h-5 w-5 text-gray-400" /></div>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="请输入11位手机号" />
              </div>
            </div>
            {(mode === 'login-pass' || mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{mode === 'forgot' ? '新密码' : '密码'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="••••••" />
                </div>
                {mode === 'login-pass' && <div className="flex justify-end mt-1"><button type="button" onClick={() => setMode('forgot')} className="text-xs text-blue-600 hover:underline">忘记密码？</button></div>}
              </div>
            )}
            {(mode === 'login-sms' || mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">验证码</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ShieldCheck className="h-5 w-5 text-gray-400" /></div>
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="4位数字" />
                  </div>
                  <button type="button" onClick={handleSendCode} disabled={countdown > 0} className={`px-4 py-2 rounded-xl text-sm font-medium min-w-[100px] transition-all ${countdown > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>{countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}</button>
                </div>
              </div>
            )}
            <button type="submit" disabled={isLoading} className={`w-full flex items-center justify-center py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <>{mode === 'login-pass' || mode === 'login-sms' ? '立即登录' : mode === 'register' ? '注册账号' : '重置密码'}<ArrowRight className="ml-2 w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-6 text-center">
            {mode.startsWith('login') ? <p className="text-sm text-gray-500">还没有账号？ <button onClick={() => setMode('register')} className="text-blue-600 font-bold hover:underline">立即注册</button></p> : <p className="text-sm text-gray-500">已有账号？ <button onClick={() => setMode('login-pass')} className="text-blue-600 font-bold hover:underline">直接登录</button></p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 组件：侧边栏 (更新支持 VIP) ---
const Sidebar = ({ activeTab, setActiveTab, storageUsed, storageLimit, userVipStatus, onOpenVip }) => {
  const usagePercent = Math.min((storageUsed / storageLimit) * 100, 100);

  const menuItems = [
    { id: 'all', label: '全部文件', icon: HardDrive },
    { id: 'image', label: '图片', icon: ImageIcon },
    { id: 'doc', label: '文档', icon: FileText },
    { id: 'media', label: '音视频', icon: Video },
    { id: 'trash', label: '回收站', icon: Trash2 },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full hidden md:flex">
      <div className="p-6 flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Cloud className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">{APP_NAME}</span>
      </div>

      <div className="flex-1 px-4 py-2 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 存储容量与会员卡片 */}
      <div className={`p-6 m-4 rounded-xl shadow-sm border ${userVipStatus.isVip ? 'bg-gradient-to-br from-gray-900 to-black border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
        <div className="flex justify-between items-center text-xs mb-2">
          <span className={userVipStatus.isVip ? "text-gray-300" : "text-gray-600"}>存储空间</span>
          <span className={`font-medium ${userVipStatus.isVip ? "text-amber-400" : "text-blue-600"}`}>{formatBytes(storageUsed)} / {formatBytes(storageLimit, 0)}</span>
        </div>
        <div className={`w-full rounded-full h-2 overflow-hidden ${userVipStatus.isVip ? "bg-gray-700" : "bg-gray-200"}`}>
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${userVipStatus.isVip ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-blue-600"}`} 
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        
        {userVipStatus.isVip ? (
           <div className="mt-4 flex items-center gap-2">
              <Crown size={16} className="text-amber-400 fill-current" />
              <span className="text-xs text-amber-400 font-bold">{userVipStatus.name}生效中</span>
           </div>
        ) : (
          <button 
            onClick={onOpenVip}
            className="w-full mt-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
          >
            <Crown size={14} />
            升级 VIP 容量
          </button>
        )}
      </div>
    </div>
  );
};

// --- 主组件 ---
export default function CloudDrive() {
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [currentFolder, setCurrentFolder] = useState('root');
  const [activeTab, setActiveTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  
  // AI 相关状态
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [selectedFileForAI, setSelectedFileForAI] = useState(null);

  // 会员相关状态
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [userVipStatus, setUserVipStatus] = useState({ isVip: false, level: 'free', name: '普通用户', storageLimit: 10 * 1024 * 1024 * 1024 });

  const [files, setFiles] = useState([
    { id: 'f1', name: '元哥的项目资料', type: 'folder', size: 0, date: '2023-10-24 09:30:00', parentId: 'root', isDeleted: false },
    { id: 'f2', name: '旅行相册', type: 'folder', size: 0, date: '2023-10-25 14:20:15', parentId: 'root', isDeleted: false },
    { id: 'd1', name: '元哥云盘使用说明.pdf', type: 'file', mimeType: 'application/pdf', size: 2500000, date: '2023-10-26 10:05:30', parentId: 'root', isDeleted: false, url: '#' },
  ]);
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // Modal States
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileToDelete, setFileToDelete] = useState(null);
  const [fileToShare, setFileToShare] = useState(null);
  const [shareLink, setShareLink] = useState('');

  const fileInputRef = useRef(null);

  // --- Auth Handler ---
  const handleLogin = (username) => {
    setCurrentUser({ name: username, avatar: 'https://i.pravatar.cc/150?img=12' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('all');
    setCurrentFolder('root');
    setIsAIAssistantOpen(false);
    // 重置VIP状态
    setUserVipStatus({ isVip: false, level: 'free', name: '普通用户', storageLimit: 10 * 1024 * 1024 * 1024 });
  };

  const showToast = (msg, type='success') => {
      setToast({ msg, type });
  };

  // --- VIP Handler ---
  const handleVipUpgrade = (plan) => {
    let limit = 10 * 1024 * 1024 * 1024; // 10GB default
    if (plan.id === 'monthly') limit = 2 * 1024 * 1024 * 1024 * 1024; // 2TB
    if (plan.id === 'yearly') limit = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
    if (plan.id === 'svip') limit = 10 * 1024 * 1024 * 1024 * 1024; // 10TB

    setUserVipStatus({
      isVip: true,
      level: plan.id,
      name: plan.name,
      storageLimit: limit
    });
    showToast(`升级成功！已开通 ${plan.name}`);
  };

  // --- Breadcrumbs ---
  const getBreadcrumbs = () => {
    if (activeTab === 'trash') return [{ id: 'trash', name: '回收站' }];
    if (currentFolder === 'root') return [{ id: 'root', name: '全部文件' }];
    
    const path = [];
    let curr = files.find(f => f.id === currentFolder);
    while (curr) {
      path.unshift(curr);
      curr = files.find(f => f.id === curr.parentId);
    }
    return [{ id: 'root', name: '全部文件' }, ...path];
  };

  // --- Filter Files ---
  const displayFiles = useMemo(() => {
    if (activeTab === 'trash') {
      return files.filter(f => f.isDeleted);
    }
    const activeFiles = files.filter(f => !f.isDeleted);
    if (activeTab === 'all') {
      return activeFiles.filter(f => f.parentId === currentFolder);
    } else if (activeTab === 'image') {
      return activeFiles.filter(f => f.type === 'file' && f.mimeType?.startsWith('image/'));
    } else if (activeTab === 'doc') {
      return activeFiles.filter(f => f.type === 'file' && !f.mimeType?.startsWith('image/') && !f.mimeType?.startsWith('video/'));
    } else if (activeTab === 'media') {
      return activeFiles.filter(f => f.type === 'file' && (f.mimeType?.startsWith('video/') || f.mimeType?.startsWith('audio/')));
    }
    return [];
  }, [files, currentFolder, activeTab]);

  const storageUsed = useMemo(() => files.reduce((acc, file) => acc + (file.size || 0), 0), [files]);

  // --- File Actions ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (storageUsed + file.size > userVipStatus.storageLimit) {
      showToast('存储空间不足，请升级会员', 'error');
      setIsVipModalOpen(true);
      return;
    }

    setUploadProgress({ fileName: file.name, percent: 0 });
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress({ fileName: file.name, percent: progress });
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const newFile = {
            id: Date.now().toString(),
            name: file.name,
            type: 'file',
            mimeType: file.type,
            size: file.size,
            date: formatDate(new Date()),
            parentId: currentFolder,
            url: URL.createObjectURL(file), // 创建本地预览链接
            isDeleted: false
          };
          setFiles(prev => [...prev, newFile]);
          setUploadProgress(null);
          showToast('文件上传成功');
        }, 500);
      }
    }, 100);
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    setFiles(prev => [...prev, {
      id: Date.now().toString(),
      name: newFolderName,
      type: 'folder',
      size: 0,
      date: formatDate(new Date()),
      parentId: currentFolder,
      isDeleted: false
    }]);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
    showToast('文件夹创建成功');
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      if (fileToDelete.isDeleted) {
        setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
        showToast('已永久删除');
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileToDelete.id ? { ...f, isDeleted: true } : f
        ));
        showToast('已移至回收站');
      }
      setFileToDelete(null);
    }
  };

  const handleRestore = (id, e) => {
    e.stopPropagation();
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, isDeleted: false } : f
    ));
    showToast('文件已还原');
  };

  const handleItemClick = (item) => {
    if (activeTab === 'trash') return;
    
    if (item.type === 'folder') {
      setCurrentFolder(item.id);
    } else {
      // 打开预览而不是新窗口
      setPreviewFile(item);
    }
    
    // 选中文件以供 AI 分析
    if (item.type === 'file') {
      setSelectedFileForAI(item);
    } else {
      setSelectedFileForAI(null);
    }
  };

  const handleDeleteClick = (file, e) => {
    e.stopPropagation();
    setFileToDelete(file);
  };

  const handleShareClick = (file, e) => {
    e.stopPropagation();
    setFileToShare(file);
    const randomCode = Math.random().toString(36).substring(7);
    setShareLink(`https://yuange.cloud/s/${randomCode}`);
    setIsShareModalOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    showToast('链接已复制到剪贴板');
  };

  const toggleAIAssistant = () => {
    setIsAIAssistantOpen(!isAIAssistantOpen);
  };

  // --- Render Login Logic ---
  if (!currentUser) {
    return <AuthSystem onLogin={handleLogin} />;
  }

  // --- Main Render ---
  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'trash') setCurrentFolder('root');
        }} 
        storageUsed={storageUsed}
        storageLimit={userVipStatus.storageLimit}
        userVipStatus={userVipStatus}
        onOpenVip={() => setIsVipModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navbar */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center flex-1 mr-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="搜索您的文件..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg text-sm transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* VIP Status Icon in Header */}
            {userVipStatus.isVip && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-amber-400 rounded-full text-xs font-bold shadow-md animate-fade-in">
                 <Crown size={14} className="fill-current"/>
                 <span>{userVipStatus.name}</span>
              </div>
            )}
            
            {/* AI Assistant Toggle Button */}
            <button 
              onClick={toggleAIAssistant}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isAIAssistantOpen 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">AI 助手</span>
            </button>

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
            
            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex items-center space-x-3 group relative cursor-pointer">
              <span className="text-sm font-medium text-gray-700">{currentUser.name}</span>
              <div className="relative">
                <img src={currentUser.avatar} alt="Avatar" className={`w-8 h-8 rounded-full border-2 ${userVipStatus.isVip ? 'border-amber-400' : 'border-gray-200'}`} />
                {userVipStatus.isVip && <div className="absolute -top-2 -right-1 text-amber-500"><Crown size={12} className="fill-current" /></div>}
              </div>
              
              <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                    <LogOut size={14} />
                    退出登录
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Breadcrumbs (保持不变) */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600 overflow-hidden">
            {activeTab === 'all' || activeTab === 'trash' ? (
              getBreadcrumbs().map((crumb, index, arr) => (
                <React.Fragment key={crumb.id}>
                  <button 
                    onClick={() => activeTab !== 'trash' && setCurrentFolder(crumb.id)}
                    className={`hover:text-blue-600 font-medium whitespace-nowrap ${index === arr.length - 1 ? 'text-gray-900' : ''} ${activeTab === 'trash' ? 'cursor-default hover:text-gray-900' : ''}`}
                  >
                    {crumb.name}
                  </button>
                  {index < arr.length - 1 && <ChevronRight size={16} className="text-gray-400" />}
                </React.Fragment>
              ))
            ) : (
              <span className="font-bold text-gray-800 text-lg">
                {activeTab === 'image' && '图片库'}
                {activeTab === 'doc' && '文档资料'}
                {activeTab === 'media' && '多媒体'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
            />
            
            {activeTab !== 'trash' && (
              <>
                <button 
                  onClick={() => {
                    setNewFolderName('');
                    setIsNewFolderModalOpen(true);
                  }}
                  className="hidden md:flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
                >
                  <Plus size={18} />
                  <span>新建文件夹</span>
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition hover:shadow-md"
                >
                  <UploadCloud size={18} />
                  <span>上传文件</span>
                </button>
              </>
            )}
             {activeTab === 'trash' && displayFiles.length > 0 && (
                 <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">提示: 30天后自动清除</span>
             )}
          </div>
        </div>

        {/* Upload Progress (保持不变) */}
        {uploadProgress && (
          <div className="mx-6 mb-4 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-3">
              <UploadCloud className="text-blue-500 animate-bounce" size={20} />
              <div>
                <p className="text-sm font-medium text-blue-900">正在上传: {uploadProgress.fileName}</p>
                <div className="w-48 bg-blue-200 rounded-full h-1.5 mt-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.percent}%` }}></div>
                </div>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-700">{uploadProgress.percent}%</span>
          </div>
        )}

        {/* File List (保持不变) */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" onClick={() => setSelectedFileForAI(null)}>
          {displayFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                {activeTab === 'trash' ? <Trash2 size={48} className="text-gray-300"/> : <Folder size={48} className="text-gray-300" />}
              </div>
              <p>{activeTab === 'trash' ? '回收站是空的' : '暂无文件，点击右上角上传'}</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {displayFiles.map(file => (
                    <div 
                      key={file.id}
                      onClick={(e) => { e.stopPropagation(); handleItemClick(file); }}
                      className={`group relative bg-white border rounded-xl p-4 transition-all duration-200 ${
                        selectedFileForAI?.id === file.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-gray-200 hover:shadow-md hover:border-blue-300'
                      } cursor-pointer`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        {getFileIcon(file.type, file.mimeType)}
                        <div className="flex space-x-1">
                            {file.isDeleted && (
                                <button 
                                    onClick={(e) => handleRestore(file.id, e)}
                                    className="text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-green-50 rounded"
                                    title="还原文件"
                                >
                                <RefreshCw size={16} />
                                </button>
                            )}
                            {!file.isDeleted && (
                                <>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); setIsAIAssistantOpen(true); setSelectedFileForAI(file); }}
                                      className="text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-50 rounded"
                                      title="AI 解读"
                                  >
                                  <Sparkles size={16} />
                                  </button>
                                  <button 
                                      onClick={(e) => handleShareClick(file, e)}
                                      className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded"
                                      title="分享"
                                  >
                                  <Share2 size={16} />
                                  </button>
                                </>
                            )}
                            <button 
                                onClick={(e) => handleDeleteClick(file, e)}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                title={file.isDeleted ? "永久删除" : "删除"}
                            >
                            <Trash2 size={16} />
                            </button>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-700 truncate mb-1" title={file.name}>{file.name}</h3>
                      <div className="flex flex-col text-xs text-gray-400 gap-1">
                        <span className="flex justify-between w-full">
                            <span>{file.type === 'folder' ? '-' : formatBytes(file.size)}</span>
                        </span>
                        <span className="text-gray-300 scale-90 origin-left">{file.date}</span>
                      </div>
                      {file.url && !file.isDeleted && (
                        <div className="absolute inset-0 z-[-1] opacity-5 bg-center bg-cover rounded-xl" style={{ backgroundImage: `url(${file.url})` }}></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">名称</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">大小</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">修改日期</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayFiles.map(file => (
                        <tr 
                          key={file.id} 
                          onClick={(e) => { e.stopPropagation(); handleItemClick(file); }}
                          className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedFileForAI?.id === file.id ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center space-x-3">
                              <div className="transform scale-75 origin-left">
                                {getFileIcon(file.type, file.mimeType)}
                              </div>
                              <span className={`text-sm font-medium ${file.isDeleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{file.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {file.type === 'folder' ? '-' : formatBytes(file.size)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500 font-mono text-xs">{file.date}</td>
                          <td className="px-6 py-3 text-right">
                             <div className="flex justify-end space-x-2">
                                {!file.isDeleted && (
                                  <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsAIAssistantOpen(true); setSelectedFileForAI(file); }}
                                        className="text-gray-400 hover:text-purple-600 p-2 hover:bg-purple-50 rounded-full transition-colors"
                                        title="AI 解读"
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleShareClick(file, e)}
                                        className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                        title="分享"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                  </>
                                )}
                                {file.isDeleted && (
                                    <button 
                                        onClick={(e) => handleRestore(file.id, e)}
                                        className="text-gray-400 hover:text-green-600 p-2 hover:bg-green-50 rounded-full transition-colors"
                                        title="还原"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => handleDeleteClick(file, e)}
                                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                                    title={file.isDeleted ? "永久删除" : "删除"}
                                >
                                <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* AI Assistant Panel */}
        <AIAssistantPanel 
          isOpen={isAIAssistantOpen} 
          onClose={() => setIsAIAssistantOpen(false)} 
          selectedFile={selectedFileForAI}
        />

        {/* File Preview Modal */}
        <FilePreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
        />

        {/* VIP Upgrade Modal */}
        <VipUpgradeModal 
          isOpen={isVipModalOpen}
          onClose={() => setIsVipModalOpen(false)}
          onUpgradeSuccess={handleVipUpgrade}
        />

        {/* Modal: New Folder */}
        {isNewFolderModalOpen && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FolderPlus size={18} className="text-blue-600" />
                  新建文件夹
                </h3>
                <button onClick={() => setIsNewFolderModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateFolder} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">文件夹名称</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="例如：我的文档"
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsNewFolderModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    取消
                  </button>
                  <button type="submit" disabled={!newFolderName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirm */}
        {fileToDelete && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="p-6 text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${fileToDelete.isDeleted ? 'bg-red-100' : 'bg-orange-100'}`}>
                  {fileToDelete.isDeleted ? (
                      <AlertTriangle className="text-red-600" size={24} />
                  ) : (
                      <Trash2 className="text-orange-600" size={24} />
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {fileToDelete.isDeleted ? "确认彻底删除?" : "移入回收站?"}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {fileToDelete.isDeleted ? (
                      <>该操作将<span className="font-bold text-red-600">永久删除</span> "{fileToDelete.name}"，无法恢复。</>
                  ) : (
                      <>您确定要将 "{fileToDelete.name}" 移入回收站吗？您稍后可以恢复它。</>
                  )}
                </p>
                <div className="flex justify-center space-x-3">
                  <button onClick={() => setFileToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    取消
                  </button>
                  <button onClick={confirmDelete} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${fileToDelete.isDeleted ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                    {fileToDelete.isDeleted ? "彻底删除" : "移入回收站"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Share */}
        {isShareModalOpen && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Share2 size={18} className="text-blue-600" />
                  分享文件: {fileToShare?.name}
                </h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  将下方链接发送给好友，他们即可查看或下载该文件。
                  <br/>
                  <span className="text-xs text-orange-500 mt-1 block">* 此链接为演示链接，有效期7天。</span>
                </p>
                
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <input 
                        type="text" 
                        readOnly 
                        value={shareLink} 
                        className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none"
                    />
                    <button 
                        onClick={copyToClipboard}
                        className="p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-colors"
                        title="复制"
                    >
                        <Copy size={16} />
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={() => setIsShareModalOpen(false)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                        完成
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
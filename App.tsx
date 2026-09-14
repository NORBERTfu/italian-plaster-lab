import React, { useState, useMemo } from 'react';
import { Space, Sheen, Texture, Method, WizardState, Product, UserInfo } from './types';
import { products } from './data';
import { ChefHat, ArrowRight, ArrowLeft, RefreshCcw, Check, Sparkles, Home, PaintBucket, Hammer, User, Mail, Phone, Send, ExternalLink } from 'lucide-react';

// 問卷送出改打同源的 /api/inquiry（Pages Function）。
// 它會在伺服器端轉發到 Google 試算表並寄出通知信，所以這裡不再需要外部網址。
const SUBMIT_ENDPOINT = '/api/inquiry';

const QuestionCard = ({ 
  title, 
  subtitle, 
  children,
  onBack,
  singleOption = false,
  maxWidth = "max-w-4xl"
}: { 
  title: string, 
  subtitle: string, 
  children?: React.ReactNode,
  onBack?: () => void,
  singleOption?: boolean,
  maxWidth?: string
}) => (
  <div className={`${maxWidth} mx-auto px-4 py-8 animate-fade-in min-h-[70vh] flex flex-col`}>
    <div className="mb-6 h-10">
      {onBack && (
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#333] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[#DDD] hover:bg-white transition-all text-sm group shadow-sm"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">返回 (Back)</span>
        </button>
      )}
    </div>
    <div className="flex-1 flex flex-col justify-center">
      <div className="mb-10 text-center">
        <h2 className="text-2xl md:text-3xl font-light mb-3 text-[#333]">{title}</h2>
        <p className="text-[#777] font-light italic">{subtitle}</p>
      </div>
      <div className={`grid grid-cols-1 ${singleOption ? 'max-w-md mx-auto w-full' : 'md:grid-cols-2'} gap-6`}>
        {children}
      </div>
    </div>
  </div>
);

const SelectionButton = ({ 
  icon: Icon, 
  label, 
  desc, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  desc?: string, 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center p-8 bg-white border border-transparent hover:border-[#BDBDBD] shadow-sm hover:shadow-md transition-all duration-300 rounded-sm text-center group h-full w-full"
  >
    <div className="mb-4 text-[#999] group-hover:text-[#333] transition-colors">
      <Icon size={40} strokeWidth={1} />
    </div>
    <h3 className="text-xl font-normal mb-2 text-[#333]">{label}</h3>
    {desc && <p className="text-sm text-[#888] font-light leading-relaxed">{desc}</p>}
  </button>
);

const App: React.FC = () => {
  const [state, setState] = useState<WizardState>({
    step: 0,
    userInfo: { name: '', email: '', phone: '' },
    selectedSpace: null,
    selectedSheen: null,
    selectedTexture: null,
    selectedMethod: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // --- Filtering Logic ---
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (state.selectedSpace) {
      filtered = filtered.filter(p => p.spaces.includes(state.selectedSpace!));
    }

    if (state.selectedMethod) {
      filtered = filtered.filter(p => p.method === state.selectedMethod!);
    }

    if (state.selectedSheen && state.selectedTexture) {
        filtered = filtered.filter(p => {
             if (state.selectedSheen === Sheen.GLOSSY) return p.sheen === Sheen.GLOSSY;
             return p.sheen === Sheen.MATTE;
        });

        filtered = filtered.filter(p => {
            if (state.selectedTexture === Texture.ROUGH) return p.texture === Texture.ROUGH;
            return p.texture === Texture.SMOOTH;
        });
    }

    return filtered;
  }, [state]);

  const handleRestart = () => {
    setState({
      step: 0,
      userInfo: { name: '', email: '', phone: '' },
      selectedSpace: null,
      selectedSheen: null,
      selectedTexture: null,
      selectedMethod: null,
    });
    setSubmitted(false);
  };

  const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));

  const prevStep = () => {
    setState(prev => {
      let targetStep = prev.step - 1;
      
      // Special logic for skipping Step 4 (Appearance)
      if (prev.step === 5) {
        if (prev.selectedSpace === Space.FLOOR || 
           (prev.selectedSpace === Space.OUTDOOR_WALL && prev.selectedMethod === Method.DIY)) {
          targetStep = 3;
        }
      }
      
      return { ...prev, step: Math.max(0, targetStep) };
    });
  };

  const handleSubmitData = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...state.userInfo,
        method: state.selectedMethod,
        space: state.selectedSpace,
        sheen: state.selectedSheen,
        texture: state.selectedTexture,
        recommendedProducts: filteredProducts.map(p => p.name).join(', '),
        timestamp: new Date().toLocaleString(),
      };

      const response = await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 端點會回報試算表與通知信各自的成敗；只要沒有真的收到單就丟錯，
      // 不再像過去用 no-cors 那樣不論成敗都顯示送出成功。
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Submission failed', error);
      alert('傳送失敗，請稍後再試，或用 LINE @doy5115r 與我們聯絡。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Components ---

  const IntroScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fade-in space-y-8">
      <div className="bg-[#BDBDBD] bg-opacity-20 p-6 rounded-full">
        <ChefHat size={64} className="text-[#555]" strokeWidth={1} />
      </div>
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-light tracking-wide text-[#333]">
          Italian Plaster Lab
        </h1>
        <p className="text-[#666] text-lg font-light leading-relaxed">
          晚安，尊貴的貴賓。歡迎來到古法灰泥 Lab。
          <br /><br />
          我是您的空間主廚。今日，讓我們一同尋覓一份能賦予您住所獨特靈魂的飾面。
          請允許我為您引導，將塗料比作精選食材，發掘最貼合您品味的「灰泥風味」。
        </p>
      </div>
      <button 
        onClick={nextStep}
        className="mt-8 px-8 py-3 bg-[#333] text-[#F5F5F0] rounded-sm hover:bg-[#555] transition-colors duration-300 tracking-widest uppercase text-sm flex items-center gap-2 group"
      >
        入座 (Start)
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );

  const UserInfoStep = () => {
    const [localInfo, setLocalInfo] = useState<UserInfo>(state.userInfo);
    const isValid = localInfo.name.trim() !== '' && 
                    localInfo.phone.trim() !== '' && 
                    /^\S+@\S+\.\S+$/.test(localInfo.email);

    return (
      <div className="max-w-md mx-auto px-4 py-8 animate-fade-in min-h-[70vh] flex flex-col justify-center">
        <div className="mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-light mb-3 text-[#333]">貴賓預約單</h2>
          <p className="text-[#777] font-light italic">請留下您的聯絡方式，以便我們為您準備專屬菜單。</p>
        </div>
        <div className="space-y-6 bg-white p-8 shadow-sm border border-[#EEE] rounded-sm">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#999] flex items-center gap-2">
              <User size={14} /> 姓名 (Name)
            </label>
            <input 
              type="text" 
              className="w-full border-b border-[#DDD] focus:border-[#333] outline-none py-2 transition-colors font-light"
              placeholder="您的稱呼"
              value={localInfo.name}
              onChange={e => setLocalInfo({...localInfo, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#999] flex items-center gap-2">
              <Mail size={14} /> 電子郵件 (Email)
            </label>
            <input 
              type="email" 
              className="w-full border-b border-[#DDD] focus:border-[#333] outline-none py-2 transition-colors font-light"
              placeholder="example@mail.com"
              value={localInfo.email}
              onChange={e => setLocalInfo({...localInfo, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#999] flex items-center gap-2">
              <Phone size={14} /> 手機號碼 (Phone)
            </label>
            <input 
              type="tel" 
              className="w-full border-b border-[#DDD] focus:border-[#333] outline-none py-2 transition-colors font-light"
              placeholder="09xx-xxx-xxx"
              value={localInfo.phone}
              onChange={e => setLocalInfo({...localInfo, phone: e.target.value})}
            />
          </div>
          <button 
            disabled={!isValid}
            onClick={() => {
              setState(prev => ({ ...prev, userInfo: localInfo, step: prev.step + 1 }));
            }}
            className={`w-full py-4 transition-colors tracking-widest uppercase text-sm flex items-center justify-center gap-2 rounded-sm ${isValid ? 'bg-[#333] text-white hover:bg-black' : 'bg-[#EEE] text-[#AAA] cursor-not-allowed'}`}
          >
            開始品鑑 (Begin)
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const StepMethod = () => (
    <QuestionCard 
      title="第一道：工藝的選擇"
      subtitle="您的時間與工藝掌握度，決定了我們提供的服務模式。"
      onBack={prevStep}
    >
      <SelectionButton 
        icon={ChefHat}
        label="連工帶料 (Professional Chef)"
        desc="由經驗豐富的工藝師團隊，以最嚴謹的方式為您服務。 ($10,000up / 坪)"
        onClick={() => {
          setState(prev => ({ ...prev, selectedMethod: Method.PRO, step: prev.step + 1 }));
        }}
      />
      <SelectionButton 
        icon={PaintBucket}
        label="DIY 自行施作 (Home Cooking)"
        desc="享受親手參與空間創作的樂趣，易於塗刷的石灰漆產品。 ($1000up/坪)"
        onClick={() => {
          setState(prev => ({ ...prev, selectedMethod: Method.DIY, step: prev.step + 1 }));
        }}
      />
    </QuestionCard>
  );

  const StepSpace = () => (
    <QuestionCard 
      title="第二道：空間定義" 
      subtitle="請問您希望施作的區域是哪裡呢？"
      onBack={prevStep}
    >
      <SelectionButton 
        icon={Home}
        label="室內壁面 (Indoor Wall)"
        desc="客廳、臥室等高雅的立面。"
        onClick={() => {
          setState(prev => ({ ...prev, selectedSpace: Space.INDOOR_WALL, step: prev.step + 1 }));
        }}
      />
      <SelectionButton 
        icon={Sparkles}
        label="戶外壁面 (Outdoor Wall)"
        desc="需要經受風雨洗禮，長久保持風采。"
        onClick={() => {
          if (state.selectedMethod === Method.DIY) {
             setState(prev => ({ ...prev, selectedSpace: Space.OUTDOOR_WALL, step: 5 })); 
          } else {
             setState(prev => ({ ...prev, selectedSpace: Space.OUTDOOR_WALL, step: prev.step + 1 }));
          }
        }}
      />
      {state.selectedMethod !== Method.DIY && (
        <>
          <SelectionButton 
            icon={Hammer}
            label="地坪 (Floor)"
            desc="承載生活重量的堅實基礎。"
            onClick={() => {
              setState(prev => ({ ...prev, selectedSpace: Space.FLOOR, step: 5 }));
            }}
          />
          <SelectionButton 
            icon={RefreshCcw}
            label="浴室 / 家具 (Bath & Furniture)"
            desc="需要細膩呵護的特殊空間。"
            onClick={() => {
              setState(prev => ({ ...prev, selectedSpace: Space.BATHROOM, step: prev.step + 1 })); 
            }}
          />
        </>
      )}
    </QuestionCard>
  );

  const StepAppearance = () => {
    if (state.selectedMethod === Method.DIY) {
      return (
        <QuestionCard 
          title="第三道：質感與觸覺"
          subtitle="請選擇您偏好的表面質感。"
          onBack={prevStep}
        >
          <SelectionButton 
            icon={Home} 
            label="平面消光 (Smooth Matte)"
            desc="表面平滑，呈現柔和的消光質感。"
            onClick={() => {
              setState(prev => ({ ...prev, selectedSheen: Sheen.MATTE, selectedTexture: Texture.SMOOTH, step: 5 }));
            }}
          />
          <SelectionButton 
            icon={Hammer} 
            label="平面顆粒 (Granular Texture)"
            desc="保留細緻的顆粒觸感，呈現質樸的手作溫度。"
            onClick={() => {
              setState(prev => ({ ...prev, selectedSheen: Sheen.MATTE, selectedTexture: Texture.ROUGH, step: 5 }));
            }}
          />
        </QuestionCard>
      );
    }

    const isBathroom = state.selectedSpace === Space.BATHROOM;

    return (
      <QuestionCard 
        title="第三道：質感與觸覺"
        subtitle="您偏愛哪種視覺與觸覺的「風味」層次？"
        onBack={prevStep}
      >
        {!isBathroom && (
          <SelectionButton 
            icon={Sparkles}
            label="平滑亮面 (Smooth & Glossy)"
            desc="如大理石般光澤、具備微反光特性。"
            onClick={() => {
              setState(prev => ({ ...prev, selectedSheen: Sheen.GLOSSY, selectedTexture: Texture.SMOOTH, step: 5 }));
            }}
          />
        )}
        <SelectionButton 
          icon={Home} 
          label="平滑平光 (Smooth & Matte)"
          desc="優雅內斂、如頂級絲綢般細膩。"
          onClick={() => {
            setState(prev => ({ ...prev, selectedSheen: Sheen.MATTE, selectedTexture: Texture.SMOOTH, step: 5 }));
          }}
        />
        <SelectionButton 
          icon={Hammer} 
          label="顆粒消光 (Rough & Matte)"
          desc="帶有時間刻痕、歲月沉澱的粗獷感。"
          onClick={() => {
            setState(prev => ({ ...prev, selectedSheen: Sheen.MATTE, selectedTexture: Texture.ROUGH, step: 5 }));
          }}
        />
      </QuestionCard>
    );
  };

  const ResultScreen = () => {
    const displayProducts = filteredProducts.length > 0 ? filteredProducts : [];

    return (
      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in pb-20">
        <div className="mb-8">
          <button 
            onClick={prevStep}
            className="inline-flex items-center gap-2 text-[#333] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[#DDD] hover:bg-white transition-all text-sm group shadow-sm"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">返回 (Back)</span>
          </button>
        </div>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light mb-4">主廚推薦 (Chef's Recommendation)</h2>
          <p className="text-[#666] leading-relaxed max-w-2xl mx-auto">
            尊貴的 {state.userInfo.name}，感謝您的耐心品鑑。根據您的空間需求、質感偏好與預算考量，
            我們為您準備了以下「菜單」。
          </p>
        </div>

        {displayProducts.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-sm shadow-sm">
            <p className="text-lg text-[#555] mb-6">
              很抱歉，我們的菜單中暫時沒有完全符合您所有要求的單品。
              <br/>建議您調整「工藝選擇」或「質感偏好」再次嘗試。
            </p>
            <button 
              onClick={handleRestart}
              className="px-6 py-2 border border-[#333] text-[#333] hover:bg-[#333] hover:text-white transition-colors uppercase text-sm"
            >
              重新點餐 (Restart)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {displayProducts.map(p => (
              <div key={p.id} className="bg-white p-8 shadow-sm border-l-4 border-[#BDBDBD] flex flex-col md:flex-row gap-6 hover:shadow-lg transition-shadow duration-300">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold tracking-widest text-[#999] uppercase">{p.category}</span>
                    <span className="text-sm font-medium text-[#555] bg-[#F5F5F0] px-2 py-1 rounded">
                      ${p.pricePerPing.toLocaleString()}/坪
                    </span>
                  </div>
                  <h3 className="text-2xl font-light text-[#333] mb-3">{p.name}</h3>
                  <p className="text-[#666] mb-4 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {p.features.map(f => (
                      <span key={f} className="text-xs bg-[#F5F5F0] text-[#555] px-3 py-1 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="md:w-48 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-[#eee] pt-4 md:pt-0 md:pl-6 gap-3">
                   <div className="w-16 h-16 rounded-full bg-[#E5E5E5] flex items-center justify-center text-[#999]">
                      <span className="text-xs">{p.id}</span>
                   </div>
                   <a
                      href={p.purchaseUrl || "https://pamaterial.com/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-[#333] text-white text-sm hover:bg-[#000] transition-colors flex justify-center items-center gap-2"
                    >
                      <span>產品介紹</span>
                      <ExternalLink size={14} />
                    </a>
                </div>
              </div>
            ))}
            
            <div className="mt-8 bg-[#333] text-[#F5F5F0] p-8 text-center rounded-sm">
              <h4 className="text-xl font-light mb-4 tracking-wide">與專業顧問聯繫</h4>
              
              <div className="mb-6 py-4 border-y border-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-[#999] mb-3">預計諮詢品項 (Inquiry Items)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {displayProducts.map(p => (
                    <span key={p.id} className="bg-white/10 px-3 py-1 rounded-sm text-sm font-light">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-sm font-light mb-6 opacity-80">
                我們將把此推薦清單連同您的資訊發送至泛亞專業顧問，以便為您提供進一步的空間諮詢。
              </p>
              {submitted ? (
                <div className="flex items-center justify-center gap-2 text-green-400 font-medium bg-green-900/20 py-4 rounded-sm">
                  <Check size={20} />
                  <span>需求已送出，泛亞專員將儘速與您聯繫！</span>
                </div>
              ) : (
                <button 
                  onClick={handleSubmitData}
                  disabled={isSubmitting}
                  className="px-10 py-3 bg-[#F5F5F0] text-[#333] hover:bg-white transition-colors tracking-widest uppercase text-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {isSubmitting ? '傳送中...' : '送出我的需求 (Send Inquiry)'}
                  {!isSubmitting && <Send size={16} />}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-16 text-center border-t border-[#ddd] pt-8">
          <p className="text-[#777] italic mb-6">
            服務員：請問您對這份建議感到滿意嗎？我們可以為您展示這些材質的樣品，讓您能更真切地感受它們的「風味」與「層次」。
          </p>
          <button 
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 mx-auto text-[#999] hover:text-[#333] transition-colors"
          >
            <RefreshCcw size={16} />
            <span>重新諮詢</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#333] selection:bg-[#BDBDBD] selection:text-white">
      <header className="fixed top-0 w-full bg-[#F5F5F0]/90 backdrop-blur-sm z-50 py-4 px-6 flex justify-between items-center border-b border-[#E5E5E5]">
        <div className="text-sm tracking-[0.2em] font-bold uppercase text-[#999]">Italian Plaster Lab</div>
        {state.step > 0 && (
           <div className="flex gap-1">
             {[1, 2, 3, 4].map(i => (
               <div 
                key={i} 
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i <= state.step - 1 ? 'bg-[#333]' : 'bg-[#DDD]'}`} 
               />
             ))}
           </div>
        )}
      </header>

      <main className="pt-20">
        {state.step === 0 && <IntroScreen />}
        {state.step === 1 && <UserInfoStep />}
        {state.step === 2 && <StepMethod />}
        {state.step === 3 && <StepSpace />}
        {state.step === 4 && <StepAppearance />}
        {state.step === 5 && <ResultScreen />}
      </main>
      
      <footer className="py-6 text-center text-[#BBB] text-xs font-light tracking-wide mt-auto">
        &copy; {new Date().getFullYear()} ITALIAN PLASTER LAB. Inspired by Oki Sato.
      </footer>
    </div>
  );
};

export default App;
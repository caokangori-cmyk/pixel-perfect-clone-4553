import { Heart, Shield, Instagram, Facebook, Youtube, X, Copy, Check, Loader2, HandHeart, HeartHandshake } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import campaignHero from "@/assets/campaign-hero.jpg";
import FakeDonationNotification from "@/components/FakeDonationNotification";

const DONATION_VALUES = [30, 40, 50, 70, 100, 150];

type ModalStep = "select" | "loading" | "pix";

const DonationModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<ModalStep>("select");
  const [pixCode, setPixCode] = useState("");
  const [qrcodeBase64, setQrcodeBase64] = useState("");
  const [externalId, setExternalId] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("select");
        setSelected(null);
        setCustom("");
        setPixCode("");
        setQrcodeBase64("");
        setExternalId("");
        setCopied(false);
        setPaymentStatus("pending");
        setError("");
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "pix" || !externalId || paymentStatus === "paid" || paymentStatus === "approved" || paymentStatus === "completed") return;

    const interval = setInterval(async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
        if (!projectId) return;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/syncpay-pix?identifier=${externalId}`,
          { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const statusData = await res.json();
        if (statusData.status === "completed" || statusData.status === "paid" || statusData.status === "approved") {
          setPaymentStatus(statusData.status);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, externalId, paymentStatus]);

  const handleDonate = async () => {
    const value = selected ?? parseFloat(custom.replace(",", ".").replace("R$", "").trim());
    if (!value || value <= 0) return;

    const amountCents = Math.round(value * 100);
    if (amountCents < 600) {
      setError("Valor mínimo de R$ 6,00");
      return;
    }

    setStep("loading");
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("syncpay-pix", {
        body: { amount: amountCents }
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPixCode(data.pixCode);
      setQrcodeBase64("");
      setExternalId(data.identifier);
      setStep("pix");
    } catch (e: any) {
      console.error("PIX error:", e);
      setError(e.message || "Erro ao gerar PIX. Tente novamente.");
      setStep("select");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = pixCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!open) return null;

  const selectedValue = selected ?? (parseFloat(custom.replace(",", ".").replace("R$", "").trim()) || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 px-4" onClick={onClose}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          <div>
            <p className="text-primary text-xs font-bold">Instituto</p>
            <p className="text-primary text-xl font-black">Viver</p>
          </div>
        </div>

        {step === "select" && (
          <>
            <h2 className="text-center text-lg font-extrabold mb-1">Doe o valor que o seu coração mandar! ❤️</h2>
            <p className="text-center text-sm font-bold text-foreground mb-4 uppercase">Qual valor você deseja doar?</p>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {DONATION_VALUES.map((val) => (
                <button
                  key={val}
                  onClick={() => { setSelected(val); setCustom(""); }}
                  className={`py-3 rounded-xl font-bold text-base transition-all ${
                    selected === val
                      ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2"
                      : "bg-primary text-primary-foreground opacity-85 hover:opacity-100"
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mb-2">Ou digite um valor:</p>
            <input
              type="text"
              placeholder="R$ 20,00"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
              className="w-full border border-border rounded-xl px-4 py-3 text-base mb-4 outline-none focus:ring-2 focus:ring-ring bg-background"
            />

            <button
              onClick={handleDonate}
              disabled={!selected && !custom}
              className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl disabled:opacity-50"
            >
              Doar Agora
            </button>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-extrabold mb-2">Gerando seu PIX...</h2>
            <p className="text-muted-foreground text-sm text-center">
              Estamos preparando o código de pagamento.<br />Aguarde um momento.
            </p>
          </div>
        )}

        {step === "pix" && (
          <>
            {paymentStatus === "paid" || paymentStatus === "approved" || paymentStatus === "completed" ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-extrabold mb-2 text-primary">Pagamento Confirmado! 🎉</h2>
                <p className="text-muted-foreground text-sm text-center mb-4">
                  Obrigado pela sua doação! O Lucas e sua família agradecem de coração. ❤️
                </p>
                <button onClick={onClose} className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-center text-lg font-extrabold mb-1">Finalize sua doação 💚</h2>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  Escaneie o QR Code ou copie o código PIX abaixo
                </p>

                <div className="flex justify-center mb-4">
                  <div className="bg-background p-4 rounded-2xl border border-border">
                    {qrcodeBase64 ? (
                      <img src={`data:image/png;base64,${qrcodeBase64}`} alt="QR Code PIX" className="w-[200px] h-[200px]" />
                    ) : (
                      <QRCodeSVG value={pixCode} size={200} />
                    )}
                  </div>
                </div>

                <p className="text-center text-primary font-extrabold text-2xl mb-4">
                  R$ {selectedValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>

                <div className="bg-muted rounded-xl p-3 mb-4">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Código PIX (copia e cola):</p>
                  <p className="text-xs break-all font-mono leading-relaxed">{pixCode.substring(0, 80)}...</p>
                </div>

                <button
                  onClick={handleCopy}
                  className="w-full bg-primary text-primary-foreground font-bold text-base py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? "Código Copiado!" : "Copiar Código PIX"}
                </button>

                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao tentar doar usando o Pix, esse nome (ou semelhante) deverá aparecer:{" "}
                    <span className="font-bold text-foreground">MARKETPLACE BRASIL SYNC LTDA</span>
                  </p>
                </div>



                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Aguardando pagamento...</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const HeroBanner = () => (
  <div className="relative w-full">
    <div className="flex">
      <div className="flex-1 bg-primary p-4 flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          <div>
            <p className="text-primary-foreground text-xs font-bold">Instituto</p>
            <p className="text-primary-foreground text-xl font-black">Viver</p>
          </div>
        </div>
        <div>
          <h2 className="text-primary-foreground text-lg font-extrabold leading-tight">Ajude o Lucas</h2>
          <p className="text-primary-foreground/90 text-sm">Na luta contra a:<br />Pneumonia Aguda</p>
        </div>
        <div className="flex items-center gap-1 mt-3">
          <div className="w-5 h-5 bg-primary-foreground rounded flex items-center justify-center">
            <span className="text-primary text-xs font-bold">V</span>
          </div>
          <span className="text-primary-foreground text-xs font-semibold">vakinha</span>
        </div>
      </div>
      <div className="flex-1">
        <img alt="Lucas no hospital" className="w-full h-full object-cover" src="/lovable-uploads/32f1d10d-fdaf-4d64-a6e0-9f806e9d7d1c.png" />
      </div>
    </div>
  </div>
);

const ProgressBar = () => {
  const raised = 22592.63;
  const goal = 35000;
  const percent = (raised / goal) * 100;

  return (
    <div className="px-4 py-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">UTI / URGÊNCIA MÉDICA</p>
      <h1 className="text-xl font-extrabold leading-tight mb-4">
        O Lucas sobreviveu à Covid, mas agora luta por cada respiração, o Pulmão dele pode não aguentar muito tempo 😔💔.
      </h1>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p>
        <span className="text-primary font-extrabold text-lg">R$ {raised.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground text-sm"> de R$ {goal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
      </p>
    </div>
  );
};

const UrgencyCard = ({ onDonate }: { onDonate: () => void }) => (
  <div className="mx-4 bg-secondary rounded-2xl p-6 text-center mb-6">
    <div className="flex items-center justify-center gap-2 mb-3">
      <Heart className="w-10 h-10 text-primary fill-primary" />
      <div>
        <p className="text-primary text-xs font-bold">Instituto</p>
        <p className="text-primary text-2xl font-black">Viver</p>
      </div>
    </div>
    <h2 className="text-lg font-extrabold mb-2">O prazo dos médicos está acabando 💔</h2>
    <p className="text-muted-foreground text-sm mb-4">
      Fechar essa página pode significar que o Lucas não terá o remédio que salva a vida dele esta semana. Por favor, não nos abandone.
    </p>
    <button onClick={onDonate} className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl mb-4">
      Quero Ajudar
    </button>
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">Corações Recebidos</span>
      <div className="flex items-center gap-1">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <span className="font-bold">343</span>
      </div>
    </div>
  </div>
);

const StorySection = () => {
  const [activeTab, setActiveTab] = useState<"sobre" | "quem">("sobre");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"contribuicoes" | "coracoes">("contribuicoes");

  const fakeNames = [
    "Maria S.", "João P.", "Ana C.", "Carlos M.", "Fernanda L.",
    "Pedro H.", "Juliana R.", "Lucas A.", "Beatriz F.", "Rafael D.",
    "Camila O.", "Bruno T.", "Larissa N.", "Diego V.", "Patrícia G.",
  ];

  return (
    <div className="px-4 mb-6">
      <div className="flex gap-6 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("sobre")}
          className={`pb-2 text-sm font-bold ${activeTab === "sobre" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
        >
          Sobre
        </button>
        <button
          onClick={() => { setDialogOpen(true); setDialogTab("contribuicoes"); }}
          className="pb-2 text-sm font-bold text-muted-foreground"
        >
          Quem ajudou
        </button>
      </div>

      {activeTab === "sobre" && (
        <div className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-xl font-extrabold">Eu vendi tudo o que tinha, mas não foi o suficiente para comprar a vida do meu filho.</h2>
          <p>Aqui é a mãe do Lucas, e eu estou escrevendo isso de dentro do hospital, vendo meu filho lutar pelo simples direito de respirar.</p>
          <p>O Lucas sempre foi um menino forte, mas a Covid deixou marcas profundas. O que parecia ser uma recuperação virou nosso pior pesadelo: uma <strong>pneumonia severa e resistente</strong>.</p>
          <p>Nós tentamos de tudo. Os médicos usaram todos os antibióticos disponíveis no hospital, mas a bactéria é forte demais. O corpo dele foi enfraquecendo dia após dia. <strong>Hoje, meu filho está tão debilitado que não consegue nem levantar para ir ao banheiro; ele teve que voltar a usar fraldas.</strong> Ver ele nessa situação, sem forças nem para falar, destrói meu coração de mãe.</p>
          <p>A única esperança tem nome e preço: <strong>Zinforo</strong>.</p>
          <p>É o único medicamento que pode combater a infecção agora. O problema? <strong>Cada frasco custa quase R$ 3.000,00 e o SUS não fornece.</strong></p>
          <p>Nós já vendemos os móveis, vendemos tudo que tinha valor, pedimos ajuda para a família... mas o dinheiro acabou. E o prazo dos médicos é cruel: <strong>se ele não tomar esse remédio ainda essa semana, o pulmão dele pode não aguentar.</strong></p>
          <p>Eu não estou pedindo luxo. Estou pedindo a chance de ver meu filho respirar sozinho de novo. Estou pedindo para não ter que enterrar meu filho por falta de dinheiro.</p>
          <p>Deus colocou você aqui por um propósito. Não desperdice a chance de ser o milagre que o Lucas precisa urgentemente.</p>
          <h3 className="text-lg font-extrabold mt-6">Veja o impacto real da sua doação HOJE:</h3>
          <p>👉 <strong>R$ 30</strong> ajuda a comprar as fraldas e itens de higiene que ele precisa agora.</p>
          <p>👉 <strong>R$ 50</strong> ajuda na alimentação especial para ele ganhar força.</p>
          <p>👉 <strong>R$ 100</strong> é uma contribuição vital para juntarmos o valor de um frasco do Zinforo.</p>
          <p>👉 <strong>R$ 300</strong> nos coloca muito mais perto de garantir o tratamento da semana.</p>
          <p>Por favor... é o grito de socorro de uma mãe. Não deixe o Lucas sem o remédio.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-extrabold">Quem ajudou</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 border-b border-border mb-4">
            <button
              onClick={() => setDialogTab("contribuicoes")}
              className={`pb-2 text-sm font-bold flex-1 text-center ${dialogTab === "contribuicoes" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              Contribuições
            </button>
            <button
              onClick={() => setDialogTab("coracoes")}
              className={`pb-2 text-sm font-bold flex-1 text-center ${dialogTab === "coracoes" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              Corações
            </button>
          </div>

          {dialogTab === "contribuicoes" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <HandHeart className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Contribuições</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mb-6">4255 pessoas doaram</p>

              <div className="space-y-3">
                {fakeNames.map((name, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      R$ {(Math.floor(Math.random() * 15) * 10 + 10).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dialogTab === "coracoes" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
                  <Heart className="w-5 h-5 text-destructive-foreground fill-destructive-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm">Corações</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">Esta vaquinha recebeu 376 corações no total</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const FinalCTA = ({ onDonate }: { onDonate: () => void }) => (
  <div className="mx-4 bg-secondary rounded-2xl p-6 text-center mb-8">
    <div className="flex items-center justify-center gap-2 mb-3">
      <Heart className="w-10 h-10 text-primary fill-primary" />
      <div>
        <p className="text-primary text-xs font-bold">Instituto</p>
        <p className="text-primary text-2xl font-black">Viver</p>
      </div>
    </div>
    <h2 className="text-lg font-extrabold mb-1">Ele precisa do remédio ESSA SEMANA!</h2>
    <p className="text-2xl mb-2">😭</p>
    <p className="text-muted-foreground text-sm mb-4">
      Sua doação ajuda a comprar o Zinforo. É a única chance dele. Ajude agora.
    </p>
    <button onClick={onDonate} className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl mb-4">
      Quero Ajudar
    </button>
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">Corações Recebidos</span>
      <div className="flex items-center gap-1">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <span className="font-bold">343</span>
      </div>
    </div>
  </div>
);

const Footer = () => (
  <footer className="bg-campaign-dark text-primary-foreground px-4 py-8">
    <div className="flex gap-4 mb-6">
      <Instagram className="w-6 h-6" />
      <Facebook className="w-6 h-6" />
      <Youtube className="w-6 h-6" />
    </div>
    <h3 className="text-primary font-bold mb-3">Links rápidos</h3>
    <div className="grid grid-cols-2 gap-2 text-sm text-primary-foreground/80 mb-6">
      <a href="#" className="hover:underline">Quem somos</a>
      <a href="#" className="hover:underline">Dúvidas frequentes</a>
      <a href="#" className="hover:underline">Vaquinhas</a>
      <a href="#" className="hover:underline">Taxas e prazos</a>
      <a href="#" className="hover:underline">Criar vaquinhas</a>
      <a href="#" className="hover:underline">Loja de corações</a>
      <a href="#" className="hover:underline">Login</a>
      <a href="#" className="hover:underline">Vakinha Premiada</a>
      <a href="#" className="hover:underline">Vaquinhas mais amadas</a>
      <a href="#" className="hover:underline">Blog do Vakinha</a>
      <a href="#" className="hover:underline">Política de privacidade</a>
      <a href="#" className="hover:underline">Segurança e transparência</a>
      <a href="#" className="hover:underline">Termos de uso</a>
      <a href="#" className="hover:underline">Busca por recibo</a>
      <a href="#" className="hover:underline">Verificação de links</a>
    </div>
    <h3 className="text-primary font-bold mb-3">Fale conosco</h3>
    <p className="text-sm text-primary-foreground/80 mb-1">Clique aqui para falar conosco</p>
    <p className="text-sm text-primary-foreground/80 mb-6">
      De Segunda à Sexta<br />Das 9:30 às 17:00
    </p>
    <div className="text-center text-xs text-primary-foreground/60 pt-4 border-t border-primary-foreground/20">
      © 2026 - Todos direitos reservados
    </div>
  </footer>
);

const SHARE_URL = "https://amoraoprotimo-ong.vercel.app";
const SHARE_TEXT = "Olá! Essa vaquinha precisa do seu apoio. Contribua fazendo uma doação ou compartilhando com seus contatos. Toda ajuda faz a diferença!";

const ShareModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SHARE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Compartilhamento rápido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Link da vaquinha:</p>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
              <span className="text-sm text-muted-foreground truncate flex-1">{SHARE_URL}</span>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold mb-1">Compartilhe também nas redes sociais e alcance ainda mais doadores</p>
            <p className="text-sm text-muted-foreground">{SHARE_TEXT}</p>
          </div>
          <div className="flex justify-around pt-2">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center"><Facebook className="w-6 h-6 text-primary-foreground" /></div>
              <span className="text-xs text-muted-foreground">Facebook</span>
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + " " + SHARE_URL)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-primary-foreground"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.61l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.376 0-4.569-.813-6.304-2.176l-.44-.352-3.276 1.098 1.098-3.276-.352-.44A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" /></svg>
              </div>
              <span className="text-xs text-muted-foreground">WhatsApp</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center"><X className="w-6 h-6 text-background" /></div>
              <span className="text-xs text-muted-foreground">X</span>
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center"><Instagram className="w-6 h-6 text-primary-foreground" /></div>
              <span className="text-xs text-muted-foreground">Instagram</span>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StickyBottomBar = ({ onDonate, onShare }: { onDonate: () => void; onShare: () => void }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 z-50">
    <div className="flex items-center justify-center gap-1 mb-2">
      <Shield className="w-4 h-4 text-primary" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doação Protegida</span>
    </div>
    <button onClick={onDonate} className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl mb-2">
      Quero Ajudar
    </button>
    <button onClick={onShare} className="w-full border border-border text-foreground font-bold text-lg py-3 rounded-xl">
      Compartilhar
    </button>
  </div>
);

const Index = () => {
  const [donationOpen, setDonationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const openDonation = () => setDonationOpen(true);

  return (
    <div className="max-w-lg mx-auto bg-background pb-48">
      <HeroBanner />
      <ProgressBar />
      <UrgencyCard onDonate={openDonation} />
      <StorySection />
      <FinalCTA onDonate={openDonation} />
      <Footer />
      <StickyBottomBar onDonate={openDonation} onShare={() => setShareOpen(true)} />
      <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <FakeDonationNotification />
    </div>
  );
};

export default Index;

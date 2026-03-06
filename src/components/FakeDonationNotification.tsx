import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";

const FIRST_NAMES = [
  "Raquel", "Eduarda", "Lucas", "Maria", "João", "Ana", "Pedro", "Juliana",
  "Carlos", "Fernanda", "Rafael", "Camila", "Bruno", "Larissa", "Gabriel",
  "Beatriz", "Thiago", "Mariana", "Diego", "Isabela", "Felipe", "Amanda",
  "Gustavo", "Letícia", "Rodrigo", "Natália", "André", "Patrícia", "Vinícius", "Débora",
];

const LAST_NAMES = [
  "Oliveira", "Santos", "Silva", "Souza", "Costa", "Pereira", "Lima",
  "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins",
  "Araújo", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira", "Monteiro",
];

function randomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function randomAmount() {
  const val = Math.random() * 150;
  return val < 5 ? 5 + Math.random() * 10 : val;
}

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function FakeDonationNotification() {
  const [notification, setNotification] = useState<{ name: string; amount: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = () => {
      const name = randomName();
      const amount = formatBRL(randomAmount());
      setNotification({ name, amount });
      setVisible(true);

      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { x: 0.85, y: 0.85 },
          colors: ["#22c55e", "#16a34a", "#86efac", "#fbbf24", "#f97316", "#ffffff"],
          gravity: 0.8,
          scalar: 0.8,
          ticks: 120,
        });
      }, 100);

      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    const initialTimer = setTimeout(() => {
      show();
      const interval = setInterval(show, 30000);
      return () => clearInterval(interval);
    }, 10000);

    return () => clearTimeout(initialTimer);
  }, []);

  if (!notification) return null;

  return (
    <div
      ref={notifRef}
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-out ${
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 bg-background rounded-2xl shadow-xl border border-border px-4 py-3 min-w-[260px] max-w-[340px]">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M4 20c0-4 4-7 8-7s8 3 8 7" fill="currentColor" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-foreground text-sm truncate">
            {notification.name}
          </span>
          <span className="text-muted-foreground text-xs">
            Acabou de doar{" "}
            <span className="font-bold text-primary">{notification.amount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

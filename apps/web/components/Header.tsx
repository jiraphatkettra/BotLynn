"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="header" id="page-header">
      <div className="header-left">
        <h2 className="header-title">{title}</h2>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>
      <div className="header-right">
        <BotStatusIndicator />
        {children}
      </div>
    </header>
  );
}

function BotStatusIndicator() {
  // In production, this would fetch real bot status
  return (
    <div className="bot-status-indicator" id="bot-status">
      <span className="bot-status-dot online" />
      <span>Bot Online</span>
    </div>
  );
}

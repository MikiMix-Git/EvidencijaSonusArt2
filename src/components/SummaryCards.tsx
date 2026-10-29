import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' RSD';
}

export default function SummaryCards({ totalIncome, totalExpenses, netBalance, transactionCount }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Ukupni prihodi',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
      arrow: ArrowUpRight,
    },
    {
      title: 'Ukupni rashodi',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: 'red',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-700',
      arrow: ArrowDownRight,
    },
    {
      title: 'Neto saldo',
      value: formatCurrency(netBalance),
      icon: Wallet,
      color: netBalance >= 0 ? 'blue' : 'orange',
      bgColor: netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50',
      iconBg: netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100',
      iconColor: netBalance >= 0 ? 'text-blue-600' : 'text-orange-600',
      valueColor: netBalance >= 0 ? 'text-blue-700' : 'text-orange-700',
      arrow: netBalance >= 0 ? ArrowUpRight : ArrowDownRight,
    },
    {
      title: 'Broj transakcija',
      value: transactionCount.toString(),
      icon: Wallet,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-700',
      arrow: ArrowUpRight,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const Arrow = card.arrow;
        return (
          <div
            key={card.title}
            className={`${card.bgColor} rounded-2xl p-5 border border-opacity-20 transition-transform hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.iconBg} p-2.5 rounded-xl`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <Arrow className={`w-5 h-5 ${card.iconColor} opacity-60`} />
            </div>
            <p className="text-sm text-gray-600 font-medium">{card.title}</p>
            <p className={`text-xl font-bold ${card.valueColor} mt-1`}>
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

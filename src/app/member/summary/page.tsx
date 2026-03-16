import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Users, CreditCard, Banknote, Wallet } from "lucide-react";

export default async function MemberSyndicateSummaryPage() {
  const session = await checkMember();
  if (!session) redirect("/");

  const totalUsers = await prisma.user.count({ where: { role: "MEMBER" } });

  const premiums = await prisma.premium.aggregate({ _sum: { amount: true } });
  const totalCollections = premiums._sum.amount || 0;

  const activeLoansCount = await prisma.loan.count({ where: { status: "ACTIVE" } });
  const loans = await prisma.loan.aggregate({ _sum: { principalAmount: true }, where: { status: "ACTIVE" } });
  const activeLoansAmount = loans._sum.principalAmount || 0;

  const pendingInstallments = await prisma.installment.aggregate({
    _sum: { amountDue: true },
    where: { status: "PENDING" }
  });

  const allLoans = await prisma.loan.aggregate({ _sum: { principalAmount: true } });
  const totalDisbursed = allLoans._sum.principalAmount || 0;

  const paidInstallments = await prisma.installment.aggregate({
    _sum: { amountPaid: true },
    where: { status: "PAID" }
  });
  const totalRepaid = paidInstallments._sum.amountPaid || 0;

  const expendituresData = await prisma.expenditure.aggregate({ _sum: { amount: true } });
  const totalExpenditures = expendituresData._sum.amount || 0;

  const cashInHand = totalCollections + totalRepaid - totalDisbursed - totalExpenditures;

  const stats = [
    { label: "Total Members", value: totalUsers, icon: Users, color: "bg-blue-500" },
    { label: "Total Premiums", value: `₹${totalCollections.toFixed(2)}`, icon: CreditCard, color: "bg-emerald-500" },
    { label: "Total Expenditures", value: `₹${totalExpenditures.toFixed(2)}`, icon: Wallet, color: "bg-rose-500" },
    { label: "Active Loans", value: activeLoansCount, icon: Banknote, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Syndicate Summary</h1>
      </div>

      <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-800 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Wallet className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h2 className="text-indigo-200 font-medium tracking-wider text-sm uppercase mb-2">Available Cash in Hand</h2>
          <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-sm">
            ₹{cashInHand.toFixed(2)}
          </div>
          <div className="flex gap-4 text-xs font-medium border-t border-white/20 pt-4 mt-2 max-w-lg">
            <div className="flex flex-col">
              <span className="text-indigo-200">Total Inflow(Premiums + Repaid)</span>
              <span className="text-emerald-300">₹{(totalCollections + totalRepaid).toFixed(2)}</span>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-indigo-200">Total Outflow</span>
              <span className="text-rose-300">₹{(totalDisbursed + totalExpenditures).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">About Group Funds</h2>
        <p className="text-slate-600">
          This dashboard shows a real-time global summary of the Master Minds Syndicate's financial standing, including total premiums collected, expenditures deducted, and loans disbursed to all members.
        </p>
      </div>
    </div>
  );
}

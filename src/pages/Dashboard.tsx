import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  upcomingBillsAmount: number;
  upcomingBillsCount: number;
  preIncomeAmount: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<FinancialData>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    upcomingBillsAmount: 0,
    upcomingBillsCount: 0,
    preIncomeAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, selectedPeriod]);

  const fetchFinancialData = async () => {
    try {
      const [year, month] = selectedPeriod.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 1).toISOString().slice(0, 10);

      // Fetch selected period income
      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('type', 'income')
        .eq('is_paid', true)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (incomeError) throw incomeError;
      // Fetch income not received yet (is_paid: false)
      const { data: pendingIncomeData, error: pendingIncomeError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('type', 'income')
        .eq('is_paid', false)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (pendingIncomeError) throw pendingIncomeError;

      // Fetch selected period expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .eq('is_paid', true)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      if (expenseError) throw expenseError;

      // Fetch upcoming bills - sum of unpaid expenses with due_date OR transaction_date in current month
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

      const { data: billsData, error: billsError } = await supabase
        .from('transactions')
        .select('amount, due_date, transaction_date')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .eq('is_paid', false)
        .or(`due_date.gte.${currentMonth}-01,and(due_date.is.null,transaction_date.gte.${currentMonth}-01)`)
        .or(`due_date.lt.${nextMonth},and(due_date.is.null,transaction_date.lt.${nextMonth})`);

      if (billsError) throw billsError;

      const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const upcomingBillsAmount = billsData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const upcomingBillsCount = billsData?.length || 0;
      const preIncomeAmount = pendingIncomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      setData({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        upcomingBillsAmount,
        upcomingBillsCount,
        preIncomeAmount,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas finanças pessoais
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(data.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total recebido este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              {formatCurrency(data.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total gasto este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.balance >= 0 ? 'text-success' : 'text-danger'
              }`}>
              {formatCurrency(data.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receitas - Despesas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas a Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(data.upcomingBillsAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.upcomingBillsCount} conta{data.upcomingBillsCount !== 1 ? 's' : ''} pendente{data.upcomingBillsCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Prevista</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(data.preIncomeAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total a receber no mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Adicionar Receita
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              Adicionar Despesa
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Calendar className="h-4 w-4 text-warning" />
              Cadastrar Conta Fixa
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Economia</span>
                <span className="text-sm font-medium">
                  {data.totalIncome > 0
                    ? `${((data.balance / data.totalIncome) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.balance >= 0 ? 'bg-success' : 'bg-danger'
                    }`}
                  style={{
                    width: data.totalIncome > 0
                      ? `${Math.min(Math.abs((data.balance / data.totalIncome) * 100), 100)}%`
                      : '0%'
                  }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.balance >= 0
                  ? 'Você está poupando dinheiro este mês!'
                  : 'Cuidado! Suas despesas estão maiores que as receitas.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
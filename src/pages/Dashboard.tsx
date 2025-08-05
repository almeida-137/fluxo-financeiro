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
  preBalanceAmount: number;
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
    preBalanceAmount: 0,
  });

  // Separar loading de períodos e loading dos dados financeiros
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [periodOptions, setPeriodOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Função para buscar a última data de receita
  const fetchLastIncomeDate = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('user_id', user?.id)
      .eq('type', 'income')
      .order('transaction_date', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data?.transaction_date; // ex: "2025-11-10"
  };

  // Gera opções de meses entre duas datas
  function generateMonthOptions(fromDate: Date, toDate: Date) {
    const options = [];
    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    while (current <= end) {
      const value = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const label = current.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
      options.push({ value, label });
      current.setMonth(current.getMonth() + 1);
    }
    return options;
  }

  // useEffect para carregar os períodos disponíveis
  useEffect(() => {
    if (!user) return;

    async function loadPeriodOptions() {
      setLoadingPeriods(true);
      try {
        const lastDateString = await fetchLastIncomeDate();
        const now = new Date();

        if (!lastDateString) {
          // Se não tiver receita, só o mês atual
          const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          setPeriodOptions([{ value: currentMonthValue, label: now.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' }) }]);
          setSelectedPeriod(currentMonthValue);
        } else {
          const lastDate = new Date(lastDateString);

          // Gerar opções do mês atual até a última receita (inclusive)
          const options = generateMonthOptions(now, lastDate);
          setPeriodOptions(options);

          const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const hasCurrentMonth = options.some(option => option.value === currentMonthValue);
          setSelectedPeriod(hasCurrentMonth ? currentMonthValue : options[options.length - 1].value);
        }
      } catch (error: any) {
        toast({
          title: 'Erro ao carregar períodos',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoadingPeriods(false);
      }
    }

    loadPeriodOptions();
  }, [user]);

  // useEffect para carregar dados financeiros quando período estiver selecionado
  useEffect(() => {
    if (!user || !selectedPeriod) return;

    async function fetchFinancialData() {
      setLoadingData(true);
      try {
        const [year, month] = selectedPeriod.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 1).toISOString().slice(0, 10);

        // Fetch selected period income
        const { data: incomeData, error: incomeError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .eq('is_paid', true)
          .gte('transaction_date', startDate)
          .lt('transaction_date', endDate);

        if (incomeError) throw incomeError;

        // Fetch income not received yet (is_paid: false)
        const { data: pendingIncomeData, error: pendingIncomeError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .eq('is_paid', false)
          .gte('transaction_date', startDate)
          .lt('transaction_date', endDate);

        if (pendingIncomeError) throw pendingIncomeError;


        const nextMonthDate = new Date(parseInt(year), parseInt(month), 1);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextMonth = nextMonthDate.toISOString().slice(0, 10);
        // Fetch selected period expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('is_paid', true)
          .gte('transaction_date', startDate)
          .lt('transaction_date', endDate);

        if (expenseError) throw expenseError;

        // Fetch upcoming bills - sum of unpaid expenses with due_date OR transaction_date in current month

        const { data: billsData, error: billsError } = await supabase
          .from('transactions')
          .select('amount, due_date, transaction_date')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('is_paid', false)
          .or(`due_date.gte.${startDate},and(due_date.is.null,transaction_date.gte.${startDate})`)
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
          preBalanceAmount: preIncomeAmount - upcomingBillsAmount,
        });
      } catch (error: any) {
        toast({
          title: "Erro ao carregar dados",
          description: error.message,
          variant: "destructive",
          duration: 2000,
        });
      } finally {
        setLoadingData(false);
      }
    }

    fetchFinancialData();
  }, [user, selectedPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Mostra loading se estiver carregando períodos ou dados financeiros
  if (loadingPeriods || loadingData) {
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
          <Select value={selectedPeriod ?? ''} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
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
            <div className={`text-2xl font-bold ${data.balance >= 0 ? 'text-success' : 'text-danger'}`}>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(data.preBalanceAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo previsto para mês
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
                  className={`h-2 rounded-full ${data.balance >= 0 ? 'bg-success' : 'bg-danger'}`}
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

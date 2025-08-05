import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Transaction } from '@/hooks/use-transactions';
import { supabase } from '@/integrations/supabase/client';

const Expenses = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const [lastTransactionDate, setLastTransactionDate] = useState<Date | null>(null);
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    async function fetchLastTransactionDate() {
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('type', 'expense')
        .order('transaction_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar última data:', error);
        return;
      }

      if (data && data.length > 0) {
        setLastTransactionDate(new Date(data[0].transaction_date));
      } else {
        setLastTransactionDate(new Date()); // fallback para hoje se não tiver dados
      }
    }

    fetchLastTransactionDate();
  }, []);


  function generateMonthOptions(from: Date, to: Date) {
    const months = [];
    const current = new Date(from.getFullYear(), from.getMonth(), 1);

    while (
      current.getFullYear() < to.getFullYear() ||
      (current.getFullYear() === to.getFullYear() && current.getMonth() <= to.getMonth())
    ) {
      const value = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const label = current.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });

      months.push({ value, label });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }


  useEffect(() => {
    if (lastTransactionDate) {
      const start = new Date(2025, 0, 1); // Janeiro 2023, você pode mudar essa data inicial
      const options = generateMonthOptions(start, lastTransactionDate);
      setMonthOptions(options);

      const now = new Date();
      const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const hasCurrentMonth = options.some(option => option.value === currentMonthValue);

      setSelectedPeriod(hasCurrentMonth ? currentMonthValue : options[options.length - 1].value);

    }
  }, [lastTransactionDate]);

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });


  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingTransaction(undefined);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTransaction(undefined);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <div>
                <h1 className="text-3xl font-bold text-foreground">Despesas</h1>
                <p className="text-muted-foreground">Gerencie suas despesas e gastos</p>
              </div> */}
              <ResponsiveModal
                open={isFormOpen}
                onOpenChange={handleOpenChange}
                title={editingTransaction ? "Editar Despesa" : "Nova Despesa"}
                description={editingTransaction ? "Edite os dados da despesa" : "Adicione uma nova despesa ao seu controle financeiro"}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Despesa
                  </Button>
                }
              >
                <TransactionForm
                  type="expense"
                  editTransaction={editingTransaction}
                  onSuccess={handleFormClose}
                />
              </ResponsiveModal>
            </div>

            <TransactionList
              type="expense"
              onEdit={handleEdit}
              period={selectedPeriod}
            />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Expenses;
import { useState } from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Transaction } from '@/hooks/use-transactions';

const Expenses = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Despesas</h1>
                <p className="text-muted-foreground">Gerencie suas despesas e gastos</p>
              </div>
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

            <TransactionList type="expense" onEdit={handleEdit} />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Expenses;
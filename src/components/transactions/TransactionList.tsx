import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit } from 'lucide-react';
import { useTransactions, Transaction } from '@/hooks/use-transactions';

interface TransactionListProps {
  type: 'income' | 'expense';
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ type, onEdit }: TransactionListProps) {
  const { transactions, updateTransaction, deleteTransaction } = useTransactions(type);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === 'paid') return transaction.is_paid;
    if (filter === 'pending') return !transaction.is_paid;
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleTogglePaid = async (transaction: Transaction) => {
    await updateTransaction.mutateAsync({
      id: transaction.id,
      data: { is_paid: !transaction.is_paid }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  const getInstallmentText = (transaction: Transaction) => {
    if (transaction.is_installment && transaction.installment_number && transaction.installment_count) {
      return `${transaction.installment_number}/${transaction.installment_count}`;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {type === 'income' ? 'Receitas' : 'Despesas'}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('paid')}
            >
              {type === 'income' ? 'Recebidas' : 'Pagas'}
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pendentes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{transaction.description || 'Sem descrição'}</div>
                        <div className="flex gap-1">
                          {transaction.is_fixed && (
                            <Badge variant="secondary" className="text-xs">Fixa</Badge>
                          )}
                          {transaction.is_recurring && (
                            <Badge variant="outline" className="text-xs">Recorrente</Badge>
                          )}
                          {getInstallmentText(transaction) && (
                            <Badge variant="outline" className="text-xs">
                              {getInstallmentText(transaction)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.categories && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: transaction.categories.color }}
                          />
                          {transaction.categories.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={transaction.is_paid}
                          onCheckedChange={() => handleTogglePaid(transaction)}
                        />
                        <span className="text-sm">
                          {transaction.is_paid ? 
                            (type === 'income' ? 'Recebido' : 'Pago') : 
                            'Pendente'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit?.(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
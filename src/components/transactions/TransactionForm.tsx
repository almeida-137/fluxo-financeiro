import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCategories } from '@/hooks/use-categories';
import { useTransactions, CreateTransactionData, Transaction } from '@/hooks/use-transactions';
import { useIsMobile } from '@/hooks/use-mobile';

interface TransactionFormProps {
  type: 'income' | 'expense';
  onSuccess?: () => void;
  editTransaction?: Transaction;
}

export function TransactionForm({ type, onSuccess, editTransaction }: TransactionFormProps) {
  const { categories } = useCategories(type);
  const { createTransaction, updateTransaction } = useTransactions();
  const [showInstallments, setShowInstallments] = useState(editTransaction?.is_installment || false);
  const [showRecurring, setShowRecurring] = useState(editTransaction?.is_recurring || false);
  const isMobile = useIsMobile();
  const isEditing = !!editTransaction;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionData>({
    defaultValues: {
      type,
      transaction_date: editTransaction?.transaction_date || new Date().toISOString().split('T')[0],
      amount: editTransaction?.amount || 0,
      description: editTransaction?.description || '',
      category_id: editTransaction?.category_id || '',
      is_paid: editTransaction?.is_paid ?? true,
      is_fixed: editTransaction?.is_fixed || false,
      is_recurring: editTransaction?.is_recurring || false,
      is_installment: editTransaction?.is_installment || false,
      installment_count: editTransaction?.installment_count || undefined,
      recurring_interval: editTransaction?.recurring_interval || undefined,
    },
  });

  const onSubmit = async (data: CreateTransactionData) => {
    try {
      if (isEditing && editTransaction) {
        await updateTransaction.mutateAsync({
          id: editTransaction.id,
          data
        });
      } else {
        await createTransaction.mutateAsync(data);
      }
      reset();
      setShowInstallments(false);
      setShowRecurring(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Effect to populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setValue('amount', editTransaction.amount);
      setValue('description', editTransaction.description || '');
      setValue('transaction_date', editTransaction.transaction_date);
      setValue('category_id', editTransaction.category_id || '');
      setValue('is_paid', editTransaction.is_paid);
      setValue('is_fixed', editTransaction.is_fixed);
      setValue('is_recurring', editTransaction.is_recurring);
      setValue('is_installment', editTransaction.is_installment);
      setValue('installment_count', editTransaction.installment_count || undefined);
      setValue('recurring_interval', editTransaction.recurring_interval || undefined);
    }
  }, [editTransaction, setValue]);

  const isInstallment = watch('is_installment');
  const isRecurring = watch('is_recurring');

  return (
    <div className={isMobile ? "pb-6" : ""}>
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing 
                ? (type === 'income' ? 'Editar Receita' : 'Editar Despesa')
                : (type === 'income' ? 'Nova Receita' : 'Nova Despesa')
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    {...register('amount', { 
                      required: 'Valor é obrigatório',
                      valueAsNumber: true,
                      min: { value: 0.01, message: 'Valor deve ser maior que zero' }
                    })}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Data</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    {...register('transaction_date', { required: 'Data é obrigatória' })}
                  />
                  {errors.transaction_date && (
                    <p className="text-sm text-destructive">{errors.transaction_date.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select onValueChange={(value) => setValue('category_id', value)} value={watch('category_id') || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição da transação..."
                  {...register('description')}
                />
              </div>

              {type === 'expense' && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_fixed"
                    checked={watch('is_fixed')}
                    onCheckedChange={(checked) => setValue('is_fixed', checked)}
                  />
                  <Label htmlFor="is_fixed">Despesa fixa</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_installment"
                  checked={showInstallments}
                  onCheckedChange={(checked) => {
                    setShowInstallments(checked);
                    setValue('is_installment', checked);
                    if (!checked) {
                      setValue('installment_count', undefined);
                    }
                  }}
                />
                <Label htmlFor="is_installment">Parcelado</Label>
              </div>

              {showInstallments && (
                <div className="space-y-2">
                  <Label htmlFor="installment_count">Número de parcelas</Label>
                  <Input
                    id="installment_count"
                    type="number"
                    min="2"
                    max="60"
                    {...register('installment_count', { 
                      valueAsNumber: true,
                      min: { value: 2, message: 'Mínimo 2 parcelas' },
                      max: { value: 60, message: 'Máximo 60 parcelas' }
                    })}
                  />
                  {errors.installment_count && (
                    <p className="text-sm text-destructive">{errors.installment_count.message}</p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_recurring"
                  checked={showRecurring}
                  onCheckedChange={(checked) => {
                    setShowRecurring(checked);
                    setValue('is_recurring', checked);
                    if (!checked) {
                      setValue('recurring_interval', undefined);
                    }
                  }}
                />
                <Label htmlFor="is_recurring">Recorrente</Label>
              </div>

              {showRecurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurring_interval">Intervalo</Label>
                <Select onValueChange={(value) => setValue('recurring_interval', value)} value={watch('recurring_interval') || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o intervalo" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                  <Switch
                    id="is_paid"
                    checked={watch('is_paid')}
                    onCheckedChange={(checked) => setValue('is_paid', checked)}
                  />
                <Label htmlFor="is_paid">
                  {type === 'income' ? 'Recebido' : 'Pago'}
                </Label>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isMobile && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="amount" className="text-base font-medium">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                className="h-12 text-lg"
                {...register('amount', { 
                  required: 'Valor é obrigatório',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Valor deve ser maior que zero' }
                })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="transaction_date" className="text-base font-medium">Data</Label>
              <Input
                id="transaction_date"
                type="date"
                className="h-12 text-lg"
                {...register('transaction_date', { required: 'Data é obrigatória' })}
              />
              {errors.transaction_date && (
                <p className="text-sm text-destructive">{errors.transaction_date.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="category_id" className="text-base font-medium">Categoria</Label>
              <Select onValueChange={(value) => setValue('category_id', value)} value={watch('category_id') || ''}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-base font-medium">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descrição da transação..."
                className="min-h-[100px] text-base"
                {...register('description')}
              />
            </div>

            {type === 'expense' && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="is_fixed" className="text-base font-medium">Despesa fixa</Label>
                <Switch
                  id="is_fixed"
                  checked={watch('is_fixed')}
                  onCheckedChange={(checked) => setValue('is_fixed', checked)}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="is_installment" className="text-base font-medium">Parcelado</Label>
              <Switch
                id="is_installment"
                checked={showInstallments}
                onCheckedChange={(checked) => {
                  setShowInstallments(checked);
                  setValue('is_installment', checked);
                  if (!checked) {
                    setValue('installment_count', undefined);
                  }
                }}
              />
            </div>

            {showInstallments && (
              <div className="space-y-3">
                <Label htmlFor="installment_count" className="text-base font-medium">Número de parcelas</Label>
                <Input
                  id="installment_count"
                  type="number"
                  min="2"
                  max="60"
                  className="h-12 text-lg"
                  {...register('installment_count', { 
                    valueAsNumber: true,
                    min: { value: 2, message: 'Mínimo 2 parcelas' },
                    max: { value: 60, message: 'Máximo 60 parcelas' }
                  })}
                />
                {errors.installment_count && (
                  <p className="text-sm text-destructive">{errors.installment_count.message}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="is_recurring" className="text-base font-medium">Recorrente</Label>
              <Switch
                id="is_recurring"
                checked={showRecurring}
                onCheckedChange={(checked) => {
                  setShowRecurring(checked);
                  setValue('is_recurring', checked);
                  if (!checked) {
                    setValue('recurring_interval', undefined);
                  }
                }}
              />
            </div>

            {showRecurring && (
              <div className="space-y-3">
                <Label htmlFor="recurring_interval" className="text-base font-medium">Intervalo</Label>
                <Select onValueChange={(value) => setValue('recurring_interval', value)} value={watch('recurring_interval') || ''}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Selecione o intervalo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="is_paid" className="text-base font-medium">
                {type === 'income' ? 'Recebido' : 'Pago'}
              </Label>
              <Switch
                id="is_paid"
                checked={watch('is_paid')}
                onCheckedChange={(checked) => setValue('is_paid', checked)}
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-background border-t pt-4 -mx-4 px-4">
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg">
              {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
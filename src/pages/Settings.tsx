import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Palette, Globe, Moon, Sun } from 'lucide-react';
import { useCategories, Category } from '@/hooks/use-categories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { categories, isLoading } = useCategories();
  const [theme, setTheme] = useState('light');
  const [currency, setCurrency] = useState('BRL');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#6366F1'
  });

  useEffect(() => {
    loadUserPreferences();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('theme, currency')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setTheme(data.theme || 'light');
      setCurrency(data.currency || 'BRL');
    }
  };

  const updatePreferences = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        theme,
        currency,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast({
        title: "Erro ao salvar preferências",
        description: error.message,
        variant: "destructive",
        duration: 2000,
      });
    } else {
      toast({
        title: "Preferências salvas",
        description: "Suas configurações foram atualizadas com sucesso.",
        duration: 2000,
      });
    }
  };

  const addCategory = async () => {
    if (!user || !newCategory.name.trim()) return;

    const { error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: newCategory.name.trim(),
        type: newCategory.type,
        color: newCategory.color
      });

    if (error) {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
        duration: 2000,
      });
    } else {
      toast({
        title: "Categoria criada",
        description: "Nova categoria adicionada com sucesso.",
        duration: 2000,
      });
      setNewCategory({ name: '', type: 'expense', color: '#6366F1' });
      setIsAddCategoryOpen(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) return;

    const { error } = await supabase
      .from('categories')
      .update({
        name: newCategory.name.trim(),
        type: newCategory.type,
        color: newCategory.color
      })
      .eq('id', editingCategory.id);

    if (error) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
        duration: 2000,
      });
    } else {
      toast({
        title: "Categoria atualizada",
        description: "Categoria editada com sucesso.",
        duration: 2000,
      });
      setEditingCategory(null);
      setNewCategory({ name: '', type: 'expense', color: '#6366F1' });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
        duration: 2000,
      });
    } else {
      toast({
        title: "Categoria excluída",
        description: "Categoria removida com sucesso.",
        duration: 2000,
      });
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      type: category.type,
      color: category.color
    });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setNewCategory({ name: '', type: 'expense', color: '#6366F1' });
  };

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
              <p className="text-muted-foreground">
                Personalize sua experiência no ControleFácil
              </p>
            </div>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Claro
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Escuro
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configurações Regionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                      <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={updatePreferences}>
                  Salvar Preferências
                </Button>
              </CardContent>
            </Card>

            {/* Categories Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Gerenciar Categorias
                  <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="Nome da categoria"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select 
                            value={newCategory.type} 
                            onValueChange={(value: 'income' | 'expense') => 
                              setNewCategory({ ...newCategory, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Receita</SelectItem>
                              <SelectItem value="expense">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Cor</Label>
                          <div className="grid grid-cols-8 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`w-8 h-8 rounded-full border-2 ${
                                  newCategory.color === color ? 'border-primary' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewCategory({ ...newCategory, color })}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={addCategory} className="flex-1">
                            Adicionar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddCategoryOpen(false)}
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Income Categories */}
                  <div>
                    <h3 className="font-medium mb-2">Categorias de Receita</h3>
                    <div className="grid gap-2">
                      {categories.filter(c => c.type === 'income').map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                            <Badge variant="outline">Receita</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expense Categories */}
                  <div>
                    <h3 className="font-medium mb-2">Categorias de Despesa</h3>
                    <div className="grid gap-2">
                      {categories.filter(c => c.type === 'expense').map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                            <Badge variant="secondary">Despesa</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Category Dialog */}
            {editingCategory && (
              <Dialog open={!!editingCategory} onOpenChange={cancelEdit}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Categoria</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Nome da categoria"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={newCategory.type} 
                        onValueChange={(value: 'income' | 'expense') => 
                          setNewCategory({ ...newCategory, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Receita</SelectItem>
                          <SelectItem value="expense">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <div className="grid grid-cols-8 gap-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              newCategory.color === color ? 'border-primary' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategory({ ...newCategory, color })}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={updateCategory} className="flex-1">
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
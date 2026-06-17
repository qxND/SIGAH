import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Download,
  Loader2,
  Pencil,
  Trash2,
  BookOpen
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Disciplina } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const SERIES_OPTIONS = [
  '1º ano fundamental 1', '2º ano fundamental 1', '3º ano fundamental 1', '4º ano fundamental 1', '5º ano fundamental 1',
  '6º ano fundamental 2', '7º ano fundamental 2', '8º ano fundamental 2', '9º ano fundamental 2',
  '1º ano ensino médio', '2º ano ensino médio', '3º ano ensino médio'
];

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [especialidadesDB, setEspecialidadesDB] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSpecialtyDialogOpen, setIsSpecialtyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSpecialty, setIsSavingSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [editingDisciplina, setEditingDisciplina] = useState<Disciplina | null>(null);
  const [deletingDisciplina, setDeletingDisciplina] = useState<Disciplina | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    especialidade: '',
    anos_ofertados: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchDisciplinas(),
      fetchEspecialidades()
    ]);
    setLoading(false);
  }

  async function fetchEspecialidades() {
    try {
      const { data, error } = await supabase
        .from('especialidades')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setEspecialidadesDB(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar especialidades:', error.message);
    }
  }

  async function fetchDisciplinas() {
    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('*')
        .order('especialidade', { ascending: true });

      if (error) throw error;
      setDisciplinas(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar disciplinas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSpecialty(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpecialtyName.trim()) {
      toast.error('Informe o nome da especialidade.');
      return;
    }

    try {
      setIsSavingSpecialty(true);
      const { error } = await supabase
        .from('especialidades')
        .insert([{ nome: newSpecialtyName.trim() }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta especialidade já está cadastrada.');
        }
        throw error;
      }

      toast.success('Especialidade cadastrada com sucesso!');
      setNewSpecialtyName('');
      setIsSpecialtyDialogOpen(false);
      fetchEspecialidades();
    } catch (error: any) {
      toast.error('Erro ao cadastrar especialidade: ' + error.message);
    } finally {
      setIsSavingSpecialty(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.especialidade) {
      toast.error('Selecione uma especialidade.');
      return;
    }
    if (formData.anos_ofertados.length === 0) {
      toast.error('Selecione pelo menos um ano ofertado.');
      return;
    }

    // Check for duplicate specialty
    const isDuplicate = disciplinas.some(d => 
      d.especialidade === formData.especialidade && 
      d.id !== editingDisciplina?.id
    );

    if (isDuplicate) {
      toast.error(`A especialidade "${formData.especialidade}" já está cadastrada.`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        especialidade: formData.especialidade,
        anos_ofertados: formData.anos_ofertados,
      };

      if (editingDisciplina) {
        const { error } = await supabase
          .from('disciplinas')
          .update(payload)
          .eq('id', editingDisciplina.id);

        if (error) throw error;
        toast.success('Disciplina atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('disciplinas')
          .insert([{ ...payload, status: 'ativo' }]);

        if (error) throw error;
        toast.success('Disciplina cadastrada com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchDisciplinas();
    } catch (error: any) {
      toast.error('Erro ao salvar disciplina: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingDisciplina) return;
    try {
      const { error } = await supabase
        .from('disciplinas')
        .delete()
        .eq('id', deletingDisciplina.id);

      if (error) throw error;
      toast.success('Disciplina excluída com sucesso!');
      fetchDisciplinas();
    } catch (error: any) {
      toast.error('Erro ao excluir disciplina: ' + error.message);
    } finally {
      setDeletingDisciplina(null);
    }
  }

  function resetForm() {
    setFormData({ especialidade: '', anos_ofertados: [] });
    setEditingDisciplina(null);
  }

  function handleEdit(disciplina: Disciplina) {
    setEditingDisciplina(disciplina);
    setFormData({
      especialidade: disciplina.especialidade || '',
      anos_ofertados: disciplina.anos_ofertados || [],
    });
    setIsDialogOpen(true);
  }

  function toggleAno(ano: string) {
    setFormData(prev => ({
      ...prev,
      anos_ofertados: prev.anos_ofertados.includes(ano)
        ? prev.anos_ofertados.filter(a => a !== ano)
        : [...prev.anos_ofertados, ano]
    }));
  }

  function selectAllAnos() {
    setFormData(prev => ({ ...prev, anos_ofertados: [...SERIES_OPTIONS] }));
  }

  function clearAllAnos() {
    setFormData(prev => ({ ...prev, anos_ofertados: [] }));
  }

  function exportToExcel() {
    const dataToExport = disciplinas.map(disc => ({
      Especialidade: disc.especialidade,
      'Anos Ofertados': disc.anos_ofertados?.join(', '),
      Status: disc.status === 'ativo' ? 'Ativo' : 'Inativo',
      'Data de Cadastro': new Date(disc.created_at).toLocaleDateString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disciplinas");
    
    XLSX.writeFile(workbook, `SIGAH_Disciplinas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório Excel gerado com sucesso!');
  }

  const availableEspecialidades = especialidadesDB.filter(esp => {
    const isAlreadyUsed = disciplinas.some(d => d.especialidade === esp.nome);
    if (editingDisciplina) {
      return !isAlreadyUsed || esp.nome === editingDisciplina.especialidade;
    }
    return !isAlreadyUsed;
  });

  const filteredDisciplinas = disciplinas.filter(disc => 
    disc.especialidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Disciplinas</h2>
          <p className="text-muted-foreground">Configure quais especialidades são ofertadas em cada ano letivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={disciplinas.length === 0}>
            <Download size={16} className="mr-2" />
            Excel
          </Button>
          
          <Button variant="secondary" size="sm" onClick={() => setIsSpecialtyDialogOpen(true)}>
            <Plus size={16} className="mr-2" />
            Cadastrar Especialidade
          </Button>

          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <BookOpen size={16} className="mr-2" />
            Designar Disciplina
          </Button>
        </div>
      </div>

      <Dialog open={isSpecialtyDialogOpen} onOpenChange={setIsSpecialtyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveSpecialty}>
            <DialogHeader>
              <DialogTitle>Cadastrar Especialidade</DialogTitle>
              <DialogDescription>
                Adicione uma nova especialidade (ex: Robótica, Música) ao catálogo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-specialty">Nome da Especialidade</Label>
                <Input 
                  id="new-specialty" 
                  placeholder="Ex: Robótica" 
                  value={newSpecialtyName}
                  onChange={(e) => setNewSpecialtyName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSpecialtyDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingSpecialty}>
                {isSavingSpecialty && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>{editingDisciplina ? 'Editar Disciplina' : 'Designar Disciplina'}</DialogTitle>
              <DialogDescription>
                Selecione a especialidade e os anos em que ela será ofertada.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="especialidade">Especialidade / Matéria</Label>
                <select 
                  id="especialidade"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.especialidade} 
                  onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                  required
                >
                  <option value="" disabled>Selecione a especialidade</option>
                  {availableEspecialidades.map((esp) => (
                    <option key={esp.id} value={esp.nome}>
                      {esp.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Anos Ofertados</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="xs" onClick={selectAllAnos} className="text-[10px] uppercase font-bold">Todos</Button>
                    <Button type="button" variant="ghost" size="xs" onClick={clearAllAnos} className="text-[10px] uppercase font-bold">Limpar</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-muted/20">
                  {SERIES_OPTIONS.map((ano) => (
                    <div key={ano} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`ano-${ano}`} 
                        checked={formData.anos_ofertados.includes(ano)}
                        onCheckedChange={() => toggleAno(ano)}
                      />
                      <label 
                        htmlFor={`ano-${ano}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-xs md:text-sm"
                      >
                        {ano}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 border-t bg-muted/10">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDisciplina ? 'Salvar Alterações' : 'Designar Disciplina'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDisciplina} onOpenChange={(open) => !open && setDeletingDisciplina(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá a oferta da especialidade <strong>{deletingDisciplina?.especialidade}</strong> para todos os anos configurados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Pesquisar especialidade..." 
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/3 text-xs md:text-sm">Especialidade / Matéria</TableHead>
                  <TableHead className="text-xs md:text-sm">Anos Ofertados</TableHead>
                  <TableHead className="w-[120px] text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-right w-[100px] text-xs md:text-sm">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando disciplinas...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredDisciplinas.length > 0 ? (
                  filteredDisciplinas.map((disciplina) => (
                    <TableRow key={disciplina.id} className="group">
                      <TableCell className="font-semibold py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary hidden md:block">
                            <BookOpen size={18} />
                          </div>
                          <span className="text-xs md:text-sm">{disciplina.especialidade}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {disciplina.anos_ofertados?.map(ano => (
                            <Badge key={ano} variant="secondary" className="text-[9px] md:text-[10px] font-normal px-2 py-0 h-5">
                              {ano}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={disciplina.status === 'ativo' ? 'default' : 'secondary'}
                          className={cn(
                            "h-5 text-[9px] md:text-[10px]",
                            disciplina.status === 'ativo' ? "bg-green-100 text-green-800 hover:bg-green-100" : ""
                          )}
                        >
                          {disciplina.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8">
                               <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(disciplina)}>
                              <Pencil size={14} className="mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingDisciplina(disciplina)}
                            >
                              <Trash2 size={14} className="mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                      Nenhuma disciplina encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

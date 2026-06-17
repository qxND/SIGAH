import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Download,
  Filter,
  Loader2,
  Pencil,
  Trash2,
  History,
  GraduationCap
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
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
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
import { Checkbox } from "@/components/ui/checkbox";
import { Professor } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export default function Professores() {
  const [professores, setProfessores] = useState<any[]>([]);
  const [especialidadesDB, setEspecialidadesDB] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [deletingProfessor, setDeletingProfessor] = useState<Professor | null>(null);

  // Ver Turmas State
  const [viewingTurmas, setViewingTurmas] = useState<{professor: any, turmas: any[]} | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    especialidades: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    await Promise.all([
      fetchProfessores(),
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

  async function fetchProfessores() {
    try {
      
      // Get all professors and their assignments
      const { data: profs, error: profError } = await supabase
        .from('professores')
        .select(`
          *,
          turma_disciplinas(
            turmas(id, nome)
          )
        `)
        .order('nome', { ascending: true });

      if (profError) throw profError;
      
      // Calculate dynamic status and format data
      const processedProfs = (profs || []).map(p => {
        const activeTurmas = p.turma_disciplinas?.map((td: any) => td.turmas).filter(Boolean) || [];
        return {
          ...p,
          status_dinamico: activeTurmas.length > 0 ? 'ativo' : 'inativo',
          turmas_vinc: activeTurmas
        };
      });

      setProfessores(processedProfs);
    } catch (error: any) {
      toast.error('Erro ao carregar professores: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // CPF Validation
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast.error('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    if (formData.especialidades.length === 0) {
      toast.error('Selecione pelo menos uma especialidade');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        nome: formData.nome,
        cpf: formData.cpf,
        especialidade: formData.especialidades.join(', '),
      };

      if (editingProfessor) {
        const { error } = await supabase
          .from('professores')
          .update(payload)
          .eq('id', editingProfessor.id);

        if (error) throw error;
        toast.success('Professor atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('professores')
          .insert([{ ...payload, status: 'ativo' }]);

        if (error) throw error;
        toast.success('Professor cadastrado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProfessores();
    } catch (error: any) {
      toast.error('Erro ao salvar professor: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingProfessor) return;
    try {
      const { error } = await supabase
        .from('professores')
        .delete()
        .eq('id', deletingProfessor.id);

      if (error) throw error;
      toast.success('Professor excluído com sucesso!');
      fetchProfessores();
    } catch (error: any) {
      toast.error('Erro ao excluir professor: ' + error.message);
    } finally {
      setDeletingProfessor(null);
    }
  }

  function resetForm() {
    setFormData({ nome: '', cpf: '', especialidades: [] });
    setEditingProfessor(null);
  }

  function handleEdit(professor: Professor) {
    setEditingProfessor(professor);
    setFormData({
      nome: professor.nome,
      cpf: professor.cpf,
      especialidades: professor.especialidade ? professor.especialidade.split(', ') : [],
    });
    setIsDialogOpen(true);
  }

  function toggleEspecialidade(esp: string) {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(esp)
        ? prev.especialidades.filter(e => e !== esp)
        : [...prev.especialidades, esp]
    }));
  }

  function exportToExcel() {
    const dataToExport = professores.map(prof => ({
      Nome: prof.nome,
      CPF: prof.cpf,
      Especialidade: prof.especialidade,
      Status: prof.status === 'ativo' ? 'Ativo' : 'Inativo',
      'Data de Cadastro': new Date(prof.created_at).toLocaleDateString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Professores");
    
    XLSX.writeFile(workbook, `SIGAH_Professores_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório Excel gerado com sucesso!');
  }

  const filteredProfessores = professores.filter(prof => {
    const matchesSearch = 
      prof.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.especialidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.cpf.includes(searchTerm);
    
    const matchesSpecialty = 
      specialtyFilter === 'all' || 
      prof.especialidade.toLowerCase().includes(specialtyFilter.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      prof.status_dinamico === statusFilter;

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Professores</h2>
          <p className="text-muted-foreground">Cadastre e gerencie o corpo docente da instituição.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={professores.length === 0}>
            <Download size={16} className="mr-2" />
            Exportar Excel
          </Button>
          
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Novo Professor
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingProfessor ? 'Editar Professor' : 'Cadastrar Novo Professor'}</DialogTitle>
              <DialogDescription>
                {editingProfessor 
                  ? `Editando dados do professor ${editingProfessor.nome}.`
                  : 'Preencha os dados abaixo para adicionar um novo professor ao sistema.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  required 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  required 
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Especialidades (Selecione uma ou mais)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md bg-muted/20">
                  {especialidadesDB.map((esp) => (
                    <div key={esp.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`esp-${esp.id}`} 
                        checked={formData.especialidades.includes(esp.nome)}
                        onCheckedChange={() => toggleEspecialidade(esp.nome)}
                      />
                      <label 
                        htmlFor={`esp-${esp.id}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {esp.nome}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProfessor ? 'Salvar Alterações' : 'Cadastrar Professor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProfessor} onOpenChange={(open) => !open && setDeletingProfessor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o professor 
              <strong> {deletingProfessor?.nome}</strong> do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingTurmas} onOpenChange={(open) => !open && setViewingTurmas(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Turmas do Professor</DialogTitle>
            <DialogDescription>
              {viewingTurmas?.professor.nome} está atrelado às seguintes turmas:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {viewingTurmas?.turmas.length ? (
              <div className="space-y-2">
                {viewingTurmas.turmas.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Este professor não possui turmas vinculadas no momento.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTurmas(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  placeholder="Pesquisar por nome, especialidade ou CPF..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Especialidade:</span>
                  <select 
                    className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs shadow-sm"
                    value={specialtyFilter}
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                  >
                    <option value="all">Todas</option>
                    {especialidadesDB.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Status:</span>
                  <select 
                    className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs shadow-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead className="hidden md:table-cell">CPF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando professores...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredProfessores.length > 0 ? (
                  filteredProfessores.map((professor) => (
                    <TableRow key={professor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                            <GraduationCap size={14} />
                          </div>
                          {professor.nome}
                        </div>
                      </TableCell>
                      <TableCell>{professor.especialidade}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{professor.cpf}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={professor.status_dinamico === 'ativo' ? 'default' : 'secondary'}
                          className={cn(
                             "h-5 text-[10px]",
                             professor.status_dinamico === 'inativo' && "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"
                          )}
                        >
                          {professor.status_dinamico === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                            <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Opções</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEdit(professor)}>
                                <Pencil size={14} className="mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewingTurmas({professor, turmas: professor.turmas_vinc})}>
                                <History size={14} className="mr-2" />
                                Ver Turmas
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingProfessor(professor)}
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
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum professor encontrado.
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

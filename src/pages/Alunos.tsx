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
  History
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
import { Aluno, Turma, Matricula } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export default function Alunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [deletingAluno, setDeletingAluno] = useState<Aluno | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  
  // History state
  const [historyAluno, setHistoryAluno] = useState<Aluno | null>(null);
  const [historyMatriculas, setHistoryMatriculas] = useState<Matricula[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    turma_id: '',
    ano_escolar: '',
    segmento_escolar: '',
  });

  useEffect(() => {
    fetchAlunos();
    fetchTurmas();
  }, []);

  async function fetchTurmas() {
    try {
      const { data } = await supabase
        .from('turmas')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');
      setTurmas(data || []);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
    }
  }

  async function fetchAlunos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          *,
          matriculas!left(
            *,
            turma:turmas(*)
          )
        `)
        .order('nome', { ascending: true });

      if (error) throw error;

      // Filter only active matriculas for the "Current Class" display
      const alunosProcessed = (data || []).map(aluno => {
        const activeMatricula = aluno.matriculas?.find((m: any) => m.status === 'ativa');
        const graduatedMatricula = aluno.matriculas?.find((m: any) => m.status === 'concluida' && m.turma?.nome?.toLowerCase().includes('3º ano ensino médio'));
        
        let status = 'Não matriculado';
        if (activeMatricula) {
          status = 'Matriculado';
        } else if (graduatedMatricula) {
          status = 'Formado';
        }

        // Calculate age
        const birthDate = new Date(aluno.data_nascimento);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        return {
          ...aluno,
          turma_atual: activeMatricula?.turma?.nome || 'Nenhuma',
          status_acad: status,
          idade: age
        };
      });

      setAlunos(alunosProcessed as any);
    } catch (error: any) {
      toast.error('Erro ao carregar alunos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateMatricula() {
    const now = new Date();
    const year = now.getFullYear();
    const semester = now.getMonth() < 6 ? '01' : '02';
    const prefix = `${year}${semester}`;

    // Get the last matricula with this prefix
    const { data, error } = await supabase
      .from('alunos')
      .select('matricula')
      .like('matricula', `${prefix}%`)
      .order('matricula', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].matricula.slice(6));
      nextNumber = lastNumber + 1;
    }

    // Format: prefix + 5 digits (00001)
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validation
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast.error('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    const birthDate = new Date(formData.data_nascimento);
    const today = new Date();
    if (birthDate > today) {
      toast.error('A data de nascimento não pode ser no futuro.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingAluno) {
        const { error } = await supabase
          .from('alunos')
          .update({
            nome: formData.nome,
            cpf: formData.cpf,
            data_nascimento: formData.data_nascimento,
            ano_escolar: formData.ano_escolar || null,
            segmento_escolar: formData.segmento_escolar || null,
          })
          .eq('id', editingAluno.id);

        if (error) throw error;

        // Handle class change if editing
        if (formData.turma_id) {
          // Check if already in this class
          const { data: currentMatriculas } = await supabase
            .from('matriculas')
            .select('*')
            .eq('aluno_id', editingAluno.id)
            .eq('status', 'ativa');
          
          const currentTurmaId = currentMatriculas?.[0]?.turma_id;

          // ONLY update if it's actually a different class
          if (currentTurmaId !== formData.turma_id) {
            // Cancel current enrollment if exists
            if (currentTurmaId) {
              await supabase
                .from('matriculas')
                .update({ status: 'cancelada', updated_at: new Date().toISOString() })
                .eq('aluno_id', editingAluno.id)
                .eq('turma_id', currentTurmaId)
                .eq('status', 'ativa');
            }

            // Check if there is an existing (inactive) enrollment for this student in this class
            const { data: existingInactive } = await supabase
              .from('matriculas')
              .select('*')
              .eq('aluno_id', editingAluno.id)
              .eq('turma_id', formData.turma_id)
              .maybeSingle();

            if (existingInactive) {
              // REACTIVATE it instead of inserting if it exists
              await supabase
                .from('matriculas')
                .update({ status: 'ativa', updated_at: new Date().toISOString() })
                .eq('id', existingInactive.id);
            } else {
              // Enroll in new class
              const { error: enrollError } = await supabase
                .from('matriculas')
                .insert([{
                  aluno_id: editingAluno.id,
                  turma_id: formData.turma_id,
                  status: 'ativa'
                }]);
              
              if (enrollError) throw enrollError;
            }
          }
        } else {
          // If "Nenhuma" is selected, cancel active enrollment
          await supabase
            .from('matriculas')
            .update({ status: 'cancelada', updated_at: new Date().toISOString() })
            .eq('aluno_id', editingAluno.id)
            .eq('status', 'ativa');
        }

        toast.success('Aluno atualizado com sucesso!');
      } else {
        const matricula = await generateMatricula();
        const { data: newAluno, error } = await supabase
          .from('alunos')
          .insert([{ 
            nome: formData.nome,
            cpf: formData.cpf,
            data_nascimento: formData.data_nascimento,
            ano_escolar: formData.ano_escolar || null,
            segmento_escolar: formData.segmento_escolar || null,
            matricula, 
            status: 'ativo' 
          }])
          .select()
          .single();

        if (error) throw error;

        // Create initial enrollment if turma is selected
        if (formData.turma_id) {
          const { error: enrollError } = await supabase
            .from('matriculas')
            .insert([{
              aluno_id: newAluno.id,
              turma_id: formData.turma_id,
              status: 'ativa'
            }]);
          
          if (enrollError) {
            toast.error('Aluno criado, mas erro ao matricular: ' + enrollError.message);
          }
        }

        toast.success('Aluno cadastrado com sucesso!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAlunos();
    } catch (error: any) {
      toast.error('Erro ao salvar aluno: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingAluno) return;
    try {
      const { error } = await supabase
        .from('alunos')
        .delete()
        .eq('id', deletingAluno.id);

      if (error) throw error;
      toast.success('Aluno excluído com sucesso!');
      fetchAlunos();
    } catch (error: any) {
      toast.error('Erro ao excluir aluno: ' + error.message);
    } finally {
      setDeletingAluno(null);
    }
  }

  function resetForm() {
    setFormData({ 
      nome: '', 
      cpf: '', 
      data_nascimento: '', 
      turma_id: '',
      ano_escolar: '',
      segmento_escolar: ''
    });
    setEditingAluno(null);
  }

  function handleEdit(aluno: any) {
    setEditingAluno(aluno);
    
    // Find active class
    const activeMatricula = aluno.matriculas?.find((m: any) => m.status === 'ativa');
    
    setFormData({
      nome: aluno.nome,
      cpf: aluno.cpf,
      data_nascimento: aluno.data_nascimento,
      turma_id: activeMatricula?.turma_id || '',
      ano_escolar: aluno.ano_escolar || '',
      segmento_escolar: aluno.segmento_escolar || '',
    });
    setIsDialogOpen(true);
  }

  async function handleViewHistory(aluno: Aluno) {
    setHistoryAluno(aluno);
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .select(`
          *,
          turma:turmas(*)
        `)
        .eq('aluno_id', aluno.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryMatriculas(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar histórico: ' + error.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  function exportToExcel() {
    const dataToExport = alunos.map(aluno => ({
      Matrícula: aluno.matricula,
      Nome: aluno.nome,
      CPF: aluno.cpf,
      'Data de Nascimento': aluno.data_nascimento,
      Status: aluno.status === 'ativo' ? 'Ativo' : 'Inativo',
      'Data de Cadastro': new Date(aluno.created_at).toLocaleDateString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    
    XLSX.writeFile(workbook, `SIGAH_Alunos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório Excel gerado com sucesso!');
  }

  const filteredAlunos = alunos.filter(aluno => {
    const a = aluno as any;
    const matchesSearch = 
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.matricula.includes(searchTerm) ||
      (a.cpf && a.cpf.includes(searchTerm));
    
    const matchesClass = 
      classFilter === 'all' || 
      (classFilter === 'none' && a.turma_atual === 'Nenhuma') ||
      a.turma_atual === classFilter;

    const matchesStatus = 
      statusFilter === 'all' || a.status_acad === statusFilter;

    const matchesAge = 
      ageFilter === 'all' || 
      (ageFilter === '18+' && a.idade >= 18) ||
      (ageFilter === '<18' && a.idade < 18) ||
      String(a.idade) === ageFilter;
      
    return matchesSearch && matchesClass && matchesStatus && matchesAge;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Alunos</h2>
          <p className="text-muted-foreground">Cadastre e gerencie os estudantes da instituição.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={alunos.length === 0}>
            <Download size={16} className="mr-2" />
            Exportar Excel
          </Button>
          
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Novo Aluno
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
              <DialogTitle>{editingAluno ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</DialogTitle>
              <DialogDescription>
                {editingAluno 
                  ? `Editando dados do aluno ${editingAluno.matricula}.`
                  : 'Preencha os dados abaixo para adicionar um novo aluno ao sistema.'}
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
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input 
                  id="data_nascimento" 
                  type="date" 
                  required 
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="turma_id">Turma</Label>
                <select 
                  id="turma_id"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.turma_id} 
                  onChange={(e) => setFormData({...formData, turma_id: e.target.value})}
                >
                  <option value="">Nenhuma</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ano_escolar">Ano Escolar (Série)</Label>
                  <select 
                    id="ano_escolar"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.ano_escolar} 
                    onChange={(e) => setFormData({...formData, ano_escolar: e.target.value})}
                  >
                    <option value="">Não informado</option>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(yr => (
                      <option key={yr} value={yr}>{yr}º Ano</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="segmento_escolar">Segmento Escolar</Label>
                  <select 
                    id="segmento_escolar"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.segmento_escolar} 
                    onChange={(e) => setFormData({...formData, segmento_escolar: e.target.value})}
                  >
                    <option value="">Não informado</option>
                    <option value="Fundamental 1">Fundamental 1</option>
                    <option value="Fundamental 2">Fundamental 2</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                  </select>
                </div>
              </div>
              {editingAluno && (
                <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                  A matrícula <strong>{editingAluno.matricula}</strong> não pode ser alterada.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAluno ? 'Salvar Alterações' : 'Cadastrar Aluno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAluno} onOpenChange={(open) => !open && setDeletingAluno(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o aluno 
              <strong> {deletingAluno?.nome}</strong> ({deletingAluno?.matricula}) do sistema.
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

      <Dialog open={!!historyAluno} onOpenChange={(open) => !open && setHistoryAluno(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Histórico Acadêmico</DialogTitle>
            <DialogDescription>
              Histórico de matrículas para <strong>{historyAluno?.nome}</strong> ({historyAluno?.matricula})
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : historyMatriculas.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Turma</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyMatriculas.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium text-sm">{m.turma?.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.turma?.ano_letivo}/{m.turma?.semestre}º
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            m.status === 'ativa' ? 'default' : 
                            m.status === 'concluida' ? 'secondary' : 'destructive'
                          } className="text-[10px] h-5">
                            {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                Nenhum histórico de matrícula encontrado para este aluno.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryAluno(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Pesquisar por nome, matrícula ou CPF..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Turma:</span>
                <select 
                  className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs shadow-sm"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="none">Sem Turma</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.nome}>{t.nome}</option>
                  ))}
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
                  <option value="Matriculado">Matriculado</option>
                  <option value="Não matriculado">Não matriculado</option>
                  <option value="Formado">Formado</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Idade:</span>
                <select 
                  className="h-8 rounded-md border border-input bg-background px-2 py-0 text-xs shadow-sm"
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="<18">&lt; 18 anos</option>
                  <option value="18+">18+ anos</option>
                  {Array.from({ length: 50 }, (_, i) => i + 5).map(age => (
                    <option key={age} value={String(age)}>{age} anos</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Turma Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando alunos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAlunos.length > 0 ? (
                  filteredAlunos.map((aluno: any) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-mono text-sm font-bold text-primary">{aluno.matricula}</TableCell>
                      <TableCell className="font-medium">{aluno.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{aluno.idade} anos</TableCell>
                      <TableCell>
                        <Badge variant={aluno.turma_atual === 'Nenhuma' ? 'outline' : 'default'} className="whitespace-nowrap text-[10px] h-5">
                          {aluno.turma_atual}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            aluno.status_acad === 'Matriculado' ? 'default' : 
                            aluno.status_acad === 'Formado' ? 'secondary' : 'outline'
                          } 
                          className={cn(
                            "whitespace-nowrap text-[10px] h-5",
                            aluno.status_acad === 'Formado' && "bg-green-100 text-green-800 hover:bg-green-100",
                            aluno.status_acad === 'Não matriculado' && "border-amber-200 text-amber-700 bg-amber-50"
                          )}
                        >
                          {aluno.status_acad}
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
                              <DropdownMenuItem onClick={() => handleEdit(aluno)}>
                                <Pencil size={14} className="mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewHistory(aluno)}>
                                <History size={14} className="mr-2" />
                                Ver Histórico
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingAluno(aluno)}
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
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum aluno encontrado.
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

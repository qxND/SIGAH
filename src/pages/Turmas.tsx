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
  Users,
  School,
  UserPlus,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { Turma, Disciplina, Professor, Aluno, Matricula, TurmaDisciplina } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const SERIES_OPTIONS = [
  '1º ano fundamental 1', '2º ano fundamental 1', '3º ano fundamental 1', '4º ano fundamental 1', '5º ano fundamental 1',
  '6º ano fundamental 2', '7º ano fundamental 2', '8º ano fundamental 2', '9º ano fundamental 2',
  '1º ano ensino médio', '2º ano ensino médio', '3º ano ensino médio'
];

const SECOES = ['A', 'B', 'C', 'D'];

export default function Turmas() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Turma Dialog States
  const [isTurmaDialogOpen, setIsTurmaDialogOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [isSubmittingTurma, setIsSubmittingTurma] = useState(false);
  
  // New grouped state
  const [formData, setFormData] = useState({
    serie: '',
    secao: 'A',
    ano_letivo: new Date().getFullYear().toString(),
    semestre: '1',
    capacidade_maxima: '30',
    ano_escolar: '',
    segmento_escolar: '',
  });

  // Allocation state: disciplina_id -> professor_id
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [useSpecialtyFilter, setUseSpecialtyFilter] = useState(true);

  // View/Manage Students
  const [viewingTurma, setViewingTurma] = useState<Turma | null>(null);
  const [loadingMatriculas, setLoadingMatriculas] = useState(false);
  
  // Student Enrollment State (New with RPC)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [originalSelectedIds, setOriginalSelectedIds] = useState<Set<string>>(new Set());
  const [isSavingMatriculas, setIsSavingMatriculas] = useState(false);
  const [searchAlunoQuery, setSearchAlunoQuery] = useState('');

  const [activeFilterTab, setActiveFilterTab] = useState<'matriculados' | 'podem_matricular' | 'excecoes'>('matriculados');
  const [rpcAlunosList, setRpcAlunosList] = useState<any[]>([]);
  const [studentSchoolInfoMap, setStudentSchoolInfoMap] = useState<Record<string, { ano_escolar: string; segmento_escolar: string }>>({});
  
  // Persistent metrics for buttons if list searched is empty
  const [vagasRestantesClass, setVagasRestantesClass] = useState(0);
  const [botaoBloqueadoClass, setBotaoBloqueadoClass] = useState(false);

  // Delete
  const [deletingTurma, setDeletingTurma] = useState<Turma | null>(null);

  useEffect(() => {
    fetchTurmas();
    fetchSupportData();
  }, []);

  async function fetchSupportData() {
    try {
      const [{ data: discData }, { data: profData }] = await Promise.all([
        supabase.from('disciplinas').select('*').order('especialidade'),
        supabase.from('professores').select('*').order('nome')
      ]);
      setDisciplinas(discData || []);
      setProfessores(profData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error.message);
    }
  }

  async function fetchTurmas() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('turmas')
        .select(`
          *,
          disciplinas_vinculadas:turma_disciplinas(
            *,
            disciplina:disciplinas(*),
            professor:professores(*)
          )
        `)
        .order('ano_letivo', { ascending: false })
        .order('nome', { ascending: true });

      if (error) throw error;
      setTurmas(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar turmas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTurmaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.serie) {
      toast.error('Por favor, selecione uma série.');
      return;
    }

    try {
      setIsSubmittingTurma(true);
      const turmaNome = `${formData.serie} - ${formData.secao}`;
      
      const turmaPayload = {
        nome: turmaNome,
        serie: formData.serie,
        ano_letivo: parseInt(formData.ano_letivo),
        semestre: parseInt(formData.semestre),
        capacidade_maxima: parseInt(formData.capacidade_maxima),
        status: 'ativo',
        ano_escolar: formData.ano_escolar || null,
        segmento_escolar: formData.segmento_escolar || null
      };

      let turmaId = editingTurma?.id;

      if (editingTurma) {
        const { error: updateError } = await supabase
          .from('turmas')
          .update(turmaPayload)
          .eq('id', editingTurma.id);
        if (updateError) throw updateError;

        // Delete old assignments to replace with new ones
        const { error: deleteAllocError } = await supabase
          .from('turma_disciplinas')
          .delete()
          .eq('turma_id', editingTurma.id);
        if (deleteAllocError) throw deleteAllocError;
      } else {
        const { data: newTurma, error: insertError } = await supabase
          .from('turmas')
          .insert([turmaPayload])
          .select()
          .single();
        if (insertError) throw insertError;
        turmaId = newTurma.id;
      }

      // Create associations for selected professor/subject pairs
      const allocationEntries = Object.entries(allocations)
        .filter(([_, professorId]) => professorId !== '')
        .map(([disciplinaId, professorId]) => ({
          turma_id: turmaId,
          disciplina_id: disciplinaId,
          professor_id: professorId
        }));

      if (allocationEntries.length > 0) {
        const { error: allocError } = await supabase
          .from('turma_disciplinas')
          .insert(allocationEntries);
        if (allocError) throw allocError;
      }

      toast.success(editingTurma ? 'Turma atualizada!' : 'Turma criada!');
      setIsTurmaDialogOpen(false);
      resetTurmaForm();
      fetchTurmas();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSubmittingTurma(false);
    }
  }

  function resetTurmaForm() {
    setFormData({
      serie: '',
      secao: 'A',
      ano_letivo: new Date().getFullYear().toString(),
      semestre: '1',
      capacidade_maxima: '30',
      ano_escolar: '',
      segmento_escolar: '',
    });
    setAllocations({});
    setEditingTurma(null);
  }

  function handleEditTurma(turma: Turma) {
    setEditingTurma(turma);
    // Split name to get serie and secao if possible
    const nameParts = turma.nome.split(' - ');
    setFormData({
      serie: turma.serie || nameParts[0],
      secao: nameParts[1] || 'A',
      ano_letivo: String(turma.ano_letivo),
      semestre: String(turma.semestre),
      capacidade_maxima: String(turma.capacidade_maxima),
      ano_escolar: turma.ano_escolar || '',
      segmento_escolar: turma.segmento_escolar || '',
    });

    // Populate allocations
    const initialAllocations: Record<string, string> = {};
    turma.disciplinas_vinculadas?.forEach(ad => {
      initialAllocations[ad.disciplina_id] = ad.professor_id;
    });
    setAllocations(initialAllocations);
    setIsTurmaDialogOpen(true);
  }

  async function handleTurmaDelete() {
    if (!deletingTurma) return;
    try {
      const { count } = await supabase
        .from('matriculas')
        .select('*', { count: 'exact', head: true })
        .eq('turma_id', deletingTurma.id);
      
      if (count && count > 0) {
        toast.error('Turma possui alunos. Inative-a primeiro.');
        return;
      }

      const { error } = await supabase.from('turmas').delete().eq('id', deletingTurma.id);
      if (error) throw error;
      toast.success('Turma excluída!');
      fetchTurmas();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setDeletingTurma(null);
    }
  }

  // Debounced effect for loading search from backend RPC function
  useEffect(() => {
    if (!viewingTurma) return;
    
    let isMounted = true;
    const debounceTimer = setTimeout(async () => {
      try {
        setLoadingMatriculas(true);
        const { data: rawRpcData, error: rpcError } = await supabase
          .rpc('listar_alunos_painel_matricula', {
            p_turma_id: viewingTurma.id,
            p_busca_nome: searchAlunoQuery
          });
        
        if (rpcError) throw rpcError;
        if (isMounted) {
          const list = rawRpcData || [];
          setRpcAlunosList(list);
          
          if (list.length > 0) {
            const vRestantes = list.find((item: any) => item.vagas_restantes !== undefined)?.vagas_restantes ?? 0;
            const bBloqueado = list.some((item: any) => item.botao_bloqueado === true);
            setVagasRestantesClass(vRestantes);
            setBotaoBloqueadoClass(bBloqueado);
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar alunos com busca filtrada:', err);
      } finally {
        if (isMounted) {
          setLoadingMatriculas(false);
        }
      }
    }, 300); // 300ms debounce
    
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [searchAlunoQuery, viewingTurma?.id]);

  async function handleViewStudents(turma: Turma) {
    setViewingTurma(turma);
    setSearchAlunoQuery('');
    setActiveFilterTab('matriculados');
    
    try {
      setLoadingMatriculas(true);
      
      const { data: rawRpcData, error: rpcError } = await supabase
        .rpc('listar_alunos_painel_matricula', {
          p_turma_id: turma.id,
          p_busca_nome: ''
        });
      
      if (rpcError) throw rpcError;
      
      const list = rawRpcData || [];
      setRpcAlunosList(list);
      
      const vRestantes = list.find((item: any) => item.vagas_restantes !== undefined)?.vagas_restantes ?? 0;
      const bBloqueado = list.some((item: any) => item.botao_bloqueado === true);
      setVagasRestantesClass(vRestantes);
      setBotaoBloqueadoClass(bBloqueado);
      
      const { data: extraData, error: extraError } = await supabase
        .from('alunos')
        .select('id, ano_escolar, segmento_escolar');
      
      if (!extraError && extraData) {
        const mapping: Record<string, { ano_escolar: string; segmento_escolar: string }> = {};
        extraData.forEach((st: any) => {
          mapping[st.id] = {
            ano_escolar: st.ano_escolar || '',
            segmento_escolar: st.segmento_escolar || ''
          };
        });
        setStudentSchoolInfoMap(mapping);
      }
      
      const initialSelected = new Set<string>();
      list.forEach((item: any) => {
        if (item.grupo_filtro === 'matriculados') {
          initialSelected.add(item.aluno_id);
        }
      });
      setSelectedStudentIds(initialSelected);
      setOriginalSelectedIds(new Set(initialSelected));
      
    } catch (error: any) {
      toast.error('Erro ao carregar dados do painel de matrícula: ' + error.message);
    } finally {
      setLoadingMatriculas(false);
    }
  }

  function toggleStudentEnrollment(studentId: string) {
    const student = rpcAlunosList.find(x => x.aluno_id === studentId);
    const groupFilter = student ? student.grupo_filtro : '';
    
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        if (groupFilter === 'excecoes') {
          const info = studentSchoolInfoMap[studentId];
          const ano = info?.ano_escolar;
          const seg = info?.segmento_escolar;
          if (!ano || !seg || String(ano).trim() === '' || String(seg).trim() === '') {
            toast.error('O sistema só aceita matrícula de exceções se o ano escolar e segmento escolar do aluno estiverem preenchidos no cadastro.');
            return prev;
          }
        }
        newSet.add(studentId);
      }
      return newSet;
    });
  }

  async function handleSaveMatriculas() {
    if (!viewingTurma) return;
    setIsSavingMatriculas(true);
    try {
      const addedIds = Array.from(selectedStudentIds).filter(id => !originalSelectedIds.has(id));
      const removedIds = Array.from(originalSelectedIds).filter(id => !selectedStudentIds.has(id));

      if (addedIds.length > 0) {
        // Cancel active enrollments in other classes for these students
        const { error: cancelOtherError } = await supabase
          .from('matriculas')
          .update({
            status: 'cancelada',
            updated_at: new Date().toISOString()
          })
          .in('aluno_id', addedIds)
          .eq('status', 'ativa')
          .neq('turma_id', viewingTurma.id);
        
        if (cancelOtherError) {
          console.error("Warning: Cancel other enrollments failed: ", cancelOtherError);
        }

        const upsertRows = addedIds.map(studentId => ({
          aluno_id: studentId,
          turma_id: viewingTurma.id,
          status: 'ativa',
          updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('matriculas')
          .upsert(upsertRows, { onConflict: 'aluno_id,turma_id' });

        if (insertError) throw insertError;
      }

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('matriculas')
          .delete()
          .eq('turma_id', viewingTurma.id)
          .in('aluno_id', removedIds);

        if (deleteError) throw deleteError;
      }

      toast.success('Matrículas atualizadas com sucesso!');
      setViewingTurma(null);
      fetchTurmas();
    } catch (error: any) {
      toast.error('Erro ao salvar as matrículas: ' + error.message);
    } finally {
      setIsSavingMatriculas(false);
    }
  }

  const hasChanges = selectedStudentIds.size !== originalSelectedIds.size ||
    Array.from(selectedStudentIds).some(id => !originalSelectedIds.has(id));

  const filteredStudents = rpcAlunosList.filter((item: any) => item.grupo_filtro === activeFilterTab);

  function exportToExcel() {
    const data = turmas.map(t => ({
      Turma: t.nome,
      'Ano Letivo': t.ano_letivo,
      Semestre: t.semestre,
      Capacidade: t.capacidade_maxima,
      Disciplinas: t.disciplinas_vinculadas?.length || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Turmas");
    XLSX.writeFile(wb, `SIGAH_Turmas.xlsx`);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Turmas</h2>
          <p className="text-muted-foreground">Grupos de alunos e alocação de disciplinas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="mr-2" size={16} /> Exportar
          </Button>
          <Button size="sm" onClick={() => { resetTurmaForm(); setIsTurmaDialogOpen(true); }}>
            <Plus className="mr-2" size={16} /> Nova Turma
          </Button>
        </div>
      </div>

      <Dialog open={isTurmaDialogOpen} onOpenChange={setIsTurmaDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleTurmaSubmit} className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>{editingTurma ? 'Editar' : 'Criar'} Turma</DialogTitle>
              <DialogDescription>Defina a série e associe professores às matérias.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Série / Ano</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={formData.serie}
                    onChange={e => setFormData({...formData, serie: e.target.value})}
                    required
                  >
                    <option value="">Selecione...</option>
                    {SERIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Seção</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={formData.secao}
                    onChange={e => setFormData({...formData, secao: e.target.value})}
                  >
                    {SECOES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Ano Letivo</Label>
                  <Input type="number" value={formData.ano_letivo} onChange={e => setFormData({...formData, ano_letivo: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Capacidade</Label>
                  <Input type="number" value={formData.capacidade_maxima} onChange={e => setFormData({...formData, capacidade_maxima: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Ano Escolar (Ref.)</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
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
                  <Label>Segmento Escolar</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
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

              {/* Disciplines Mapping */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" />
                    Disciplinas e Professores
                  </h4>
                  <div className="flex items-center gap-2">
                     <Label htmlFor="filter-toggle" className="text-[10px] uppercase font-bold text-muted-foreground">Filtrar por especialidade</Label>
                     <Checkbox 
                        id="filter-toggle" 
                        checked={useSpecialtyFilter} 
                        onCheckedChange={(checked) => setUseSpecialtyFilter(!!checked)}
                      />
                  </div>
                </div>
                
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted z-10">
                        <TableRow>
                          <TableHead className="w-1/2">Disciplina</TableHead>
                          <TableHead>Professor Responsável</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplinas
                          .filter(disc => !formData.serie || disc.anos_ofertados?.includes(formData.serie))
                          .map(disc => (
                          <TableRow key={disc.id}>
                            <TableCell className="py-2">
                              <p className="font-medium text-sm">{disc.especialidade}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">Disciplina Ofertada</p>
                            </TableCell>
                            <TableCell className="py-2">
                              <select 
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-0 text-xs"
                                value={allocations[disc.id] || ''}
                                onChange={e => setAllocations({...allocations, [disc.id]: e.target.value})}
                              >
                                <option value="">Inativa na turma</option>
                                {professores
                                  .filter(p => 
                                    !useSpecialtyFilter ||
                                    !disc.especialidade || 
                                    p.especialidade?.split(', ').includes(disc.especialidade) || 
                                    p.especialidade?.includes('Geral')
                                  )
                                  .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                                }
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 bg-muted/20 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsTurmaDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmittingTurma}>
                {isSubmittingTurma ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Turma'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-t-lg" />
              <CardContent className="h-24" />
            </Card>
          ))
        ) : turmas.map(turma => (
          <Card key={turma.id} className="overflow-hidden group hover:shadow-lg transition-shadow border-primary/10">
            <CardHeader className="bg-primary/5 pb-3">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <School size={24} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <MoreHorizontal size={16}/>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTurma(turma)}><Pencil className="mr-2" size={14}/> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewStudents(turma)}><Users className="mr-2" size={14}/> Alunos</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTurma(turma)}><Trash2 className="mr-2" size={14}/> Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="pt-4 text-xl">{turma.nome}</CardTitle>
              <Badge variant="outline">{turma.ano_letivo} - Semestre {turma.semestre}</Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Matérias:</span>
                  <span className="font-medium">{turma.disciplinas_vinculadas?.length || 0} ofertadas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Capacidade:</span>
                  <span className="font-medium">{turma.capacidade_maxima} vagas</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full text-xs h-8" onClick={() => handleViewStudents(turma)}>
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewingTurma} onOpenChange={open => {
        if (!open) {
          if (hasChanges) {
            if (window.confirm('Você possui alterações não salvas que serão perdidas. Tem certeza de que deseja fechar?')) {
              setViewingTurma(null);
            }
          } else {
            setViewingTurma(null);
          }
        }
      }}>
        <DialogContent className="sm:max-w-3xl overflow-hidden flex flex-col gap-0 p-0 max-h-[85vh]">
          <DialogHeader className="p-6 pb-2 border-b border-border bg-muted/20">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="text-primary h-5 w-5" />
                {viewingTurma?.nome} - Gestão de Alunos
              </DialogTitle>
              <DialogDescription className="mt-1">
                Gerencie matrículas com facilidade qualificando alunos elegíveis, matriculados e exceções.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Search bar inside Dialog */}
          <div className="px-6 py-3 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno por nome ou matrícula..."
                className="pl-9 h-9"
                value={searchAlunoQuery}
                onChange={e => setSearchAlunoQuery(e.target.value)}
              />
            </div>
            {searchAlunoQuery && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchAlunoQuery('')} className="h-9 px-2 shrink-0">
                Limpar
              </Button>
            )}
          </div>

          {/* Three filters between search and table */}
          <div className="px-6 py-2 border-b border-border bg-muted/10 flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              variant={activeFilterTab === 'matriculados' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilterTab('matriculados')}
              className="relative rounded-full font-medium"
            >
              Já Matriculados
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-current hover:bg-primary-foreground/20 rounded-full text-[10px]">
                {rpcAlunosList.filter((item: any) => item.grupo_filtro === 'matriculados').length} alunos
              </Badge>
            </Button>
            
            <Button
              type="button"
              variant={activeFilterTab === 'podem_matricular' ? 'default' : 'outline'}
              size="sm"
              disabled={botaoBloqueadoClass}
              onClick={() => setActiveFilterTab('podem_matricular')}
              className="relative rounded-full font-medium"
              title={botaoBloqueadoClass ? "Não há vagas restantes para matrícula nesta turma" : ""}
            >
              Podem Matricular
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-current hover:bg-primary-foreground/20 rounded-full text-[10px]">
                {vagasRestantesClass} vagas rest.
              </Badge>
            </Button>

            <Button
              type="button"
              variant={activeFilterTab === 'excecoes' ? 'default' : 'outline'}
              size="sm"
              disabled={botaoBloqueadoClass}
              onClick={() => setActiveFilterTab('excecoes')}
              className="relative rounded-full font-medium"
              title={botaoBloqueadoClass ? "Não há vagas restantes para matrícula nesta turma" : ""}
            >
              Exceções
              <Badge variant="secondary" className="ml-2 bg-primary-foreground/20 text-current hover:bg-primary-foreground/20 rounded-full text-[10px]">
                {vagasRestantesClass} vagas rest.
              </Badge>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[250px] md:max-h-[350px]">
            {loadingMatriculas ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
                <p className="text-sm">Carregando alunos e matrículas...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-muted-foreground border-2 border-dashed border-muted rounded-lg animate-fade-in">
                <Users className="h-10 w-10 mb-2 opacity-40 text-muted-foreground" />
                <p className="text-sm font-semibold">Nenhum aluno nesta categoria</p>
                <p className="text-xs max-w-sm mt-1">
                  {activeFilterTab === 'matriculados' 
                    ? 'Não existem alunos matriculados nesta turma no momento.' 
                    : activeFilterTab === 'podem_matricular' 
                    ? 'Nenhum aluno com idade regular/padrão correspondente ou idade exata sem ano definido.'
                    : 'Nenhum aluno com distorção de idade-série (exceção elegível) pertencente a este Ano/Segmento.'}
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 animate-fade-in">
                    <TableRow>
                      <TableHead className="w-[80px] text-center">Selecionar</TableHead>
                      <TableHead>Nome do Aluno</TableHead>
                      <TableHead className="w-[200px]">Matrícula</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => {
                      const isSelected = selectedStudentIds.has(student.aluno_id);
                      return (
                        <TableRow 
                          key={student.aluno_id} 
                          className={cn("hover:bg-muted/30 cursor-pointer transition-colors", isSelected && "bg-primary/5 hover:bg-primary/10")}
                          onClick={() => toggleStudentEnrollment(student.aluno_id)}
                        >
                          <TableCell className="text-center py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleStudentEnrollment(student.aluno_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm py-3 text-left">
                            <span className="block text-foreground">{student.aluno_nome}</span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground py-3 text-left">
                            {student.aluno_matricula}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Warning Banner block if there are changes */}
          {hasChanges && (
            <div className="px-6 py-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-t border-yellow-500/20 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-500" />
                <p className="leading-relaxed">
                  <strong>Atenção:</strong> Você alterou a seleção de alunos. Para salvar essas alterações de matrícula no banco de dados, você deve clicar no botão <strong>Salvar</strong>. Se clicar em <strong>Cancelar</strong> ou fechar, suas alterações serão permanentemente perdidas.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 bg-muted/20 border-t border-border flex flex-row justify-between items-center gap-4">
            <div className="text-xs text-muted-foreground font-medium">
              {!loadingMatriculas && (
                <span>
                  Selecionados: <strong>{selectedStudentIds.size}</strong> de {filteredStudents.length} aluno(s) listado(s).
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  if (hasChanges) {
                    if (window.confirm('Deseja realmente cancelar? Todas as alterações não salvas serão perdidas.')) {
                      setViewingTurma(null);
                    }
                  } else {
                    setViewingTurma(null);
                  }
                }}
                className="relative group border-destructive/20 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                title="Atenção: Se você editou a lista, o progresso será inteiramente perdido ao cancelar caso não salve."
              >
                Cancelar
                {hasChanges && (
                  <span className="absolute -top-12 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-destructive/95 text-white text-[11px] font-medium py-1.5 px-3 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                    <span className="flex items-center gap-1">
                      <AlertOctagon size={13} className="shrink-0" />
                      Alterações não salvas serão perdidas!
                    </span>
                    <span className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-destructive/95"></span>
                  </span>
                )}
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveMatriculas} 
                disabled={isSavingMatriculas || loadingMatriculas}
                className="min-w-[100px]"
              >
                {isSavingMatriculas ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={16} />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTurma} onOpenChange={o => !o && setDeletingTurma(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Turma?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTurmaDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User as UserIcon,
  Wallet,
  Calendar,
  Bell,
  Crown,
  Check,
  FileText,
  CalendarOff,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfessor } from "@/hooks/useProfessor";
import { usePage } from "@/contexts/PageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard } from "@/components/shared/SectionCard";
import { AddressMapLink } from "@/components/shared/AddressMapLink";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHead, PageHeadMobile } from "@/components/shared/PageHead";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useBloqueios } from "@/hooks/useBloqueios";
import { detectPixType, formatPixKey, formatCpfCnpj } from "@/lib/masks";
import { baixarMeusDados } from "@/lib/exportarDados";
import type { Professor } from "@/types/supabase";

/** Código do Postgres pra "function does not exist" (migration não rodou). */
const PG_FUNCAO_INEXISTENTE = "42883";

/** Palavra que o professor precisa digitar pra liberar a exclusão da conta. */
const PALAVRA_EXCLUSAO = "EXCLUIR";

const Configuracoes = () => {
  const { data: professor, isLoading } = useProfessor();
  const { data: bloqueios } = useBloqueios(professor?.id);
  const qc = useQueryClient();

  usePage("Configurações", "Perfil, pagamento e preferências", "Ajustes");

  const [aba, setAba] = useState<"conta" | "pagamento" | "aulas" | "notificacoes">("conta");
  const [novoBloqueio, setNovoBloqueio] = useState({ data: "", motivo: "" });

  const addBloqueio = useMutation({
    mutationFn: async () => {
      if (!professor || !novoBloqueio.data) return;
      const { error } = await supabase.from("bloqueios_data").insert({
        professor_id: professor.id,
        data: novoBloqueio.data,
        motivo: novoBloqueio.motivo || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
      toast.success("Data bloqueada!");
      setNovoBloqueio({ data: "", motivo: "" });
    },
    onError: () => toast.error("Erro ao bloquear data"),
  });

  const removeBloqueio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bloqueios_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bloqueios"] });
      toast.success("Data desbloqueada");
    },
  });

  const [nome, setNome] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [horasAviso, setHorasAviso] = useState(24);
  const [cobrarFalta, setCobrarFalta] = useState(true);
  const [diaVencimento, setDiaVencimento] = useState(10);

  // Hidrata UMA vez. Antes rodava a cada mudança de referência do `professor`
  // — e como `refetchOnWindowFocus` é true por padrão, voltar pra aba
  // sobrescrevia o que o professor estava digitando, sem aviso.
  const hidratado = useRef(false);
  useEffect(() => {
    if (!professor || hidratado.current) return;
    hidratado.current = true;
    // Hidratação inicial dos campos controlados.
    setNome(professor.nome);
    setPixKey(professor.chave_pix ?? "");
    setCpfCnpj(professor.cpf_cnpj ? formatCpfCnpj(professor.cpf_cnpj) : "");
    setEndereco(professor.endereco ?? "");
    setHorasAviso(professor.horas_antecedencia_aviso);
    setCobrarFalta(professor.cobrar_falta_sem_aviso);
    setDiaVencimento(professor.dia_vencimento ?? 10);
  }, [professor]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Professor>) => {
      const { error } = await supabase
        .from("professores")
        .update(data)
        .eq("id", professor!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["professor"] });
    },
    onError: (err) => {
      console.error("[Configurações] erro ao salvar:", err);
      toast.error("Não foi possível salvar. Tente novamente.");
    },
  });

  const savePerfil = async () => {
    if (!nome.trim()) {
      toast.error("Nome não pode ser vazio");
      return;
    }
    await updateMutation.mutateAsync({ nome: nome.trim() });
    toast.success("Perfil atualizado!");
  };

  const savePix = async () => {
    await updateMutation.mutateAsync({ chave_pix: pixKey || null });
    toast.success("Chave PIX salva!");
  };

  const saveRecibo = async () => {
    await updateMutation.mutateAsync({
      cpf_cnpj: cpfCnpj || null,
      endereco: endereco || null,
    });
    toast.success("Dados para recibo salvos!");
  };

  const pixType = detectPixType(pixKey);

  // ── LGPD: portabilidade (baixar) e eliminação (excluir conta) ────────────
  const [baixandoDados, setBaixandoDados] = useState(false);
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState("");
  const [excluindoConta, setExcluindoConta] = useState(false);
  const podeExcluir =
    confirmacaoExclusao.trim().toUpperCase() === PALAVRA_EXCLUSAO;

  const baixarDados = async () => {
    if (!professor || baixandoDados) return;
    setBaixandoDados(true);
    try {
      const { arquivo, totais } = await baixarMeusDados(professor.id);
      console.info("[Configurações] exportação gerada:", arquivo, totais);
      toast.success("Pronto! O arquivo foi pro seu computador.");
    } catch (err) {
      console.error("[Configurações] erro ao exportar dados:", err);
      toast.error("Não deu pra gerar o arquivo agora. Tente de novo.");
    } finally {
      setBaixandoDados(false);
    }
  };

  const fecharExclusao = (aberto: boolean) => {
    if (excluindoConta) return;
    setExcluirAberto(aberto);
    if (!aberto) setConfirmacaoExclusao("");
  };

  const excluirConta = async () => {
    if (!podeExcluir || excluindoConta) return;
    setExcluindoConta(true);
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) {
        if (error.code === PG_FUNCAO_INEXISTENTE) {
          console.error(
            "[Configurações] RPC excluir_minha_conta não existe (migration não rodou):",
            error,
          );
          toast.error(
            "Não consegui apagar sua conta automaticamente. Escreve pra contato@studoo.app que a gente apaga tudo na mão.",
            { duration: 12000 },
          );
          return;
        }
        throw error;
      }
      await supabase.auth.signOut();
      qc.clear();
      toast.success("Conta excluída. Seus dados foram apagados.");
      // Reload completo em vez de navigate(): estando numa rota protegida, o
      // ProtectedRoute reagia ao signOut e mandava pro /login antes do
      // navigate("/") valer — quem acabou de apagar a conta caía num
      // formulário de login, não na landing.
      window.location.replace("/");
    } catch (err) {
      console.error("[Configurações] erro ao excluir conta:", err);
      toast.error("Não deu pra excluir a conta agora. Tente de novo.");
    } finally {
      setExcluindoConta(false);
      setConfirmacaoExclusao("");
      setExcluirAberto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto">
        <div className="space-y-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sideItems: {
    key: typeof aba;
    label: string;
    icon: React.ElementType;
  }[] = [
    { key: "conta", label: "Perfil & conta", icon: UserIcon },
    { key: "pagamento", label: "Pagamento", icon: Wallet },
    { key: "aulas", label: "Aulas & política", icon: Calendar },
    // "Lembretes" oculto até a feature ficar funcional.
  ];

  return (
    <div className="px-4 md:px-9 lg:px-9 py-4 md:py-8 max-w-[1320px] mx-auto animate-fade-in-up">
      {/* Mobile header */}
      <PageHeadMobile
        eyebrow="Ajustes"
        title="Configurações"
        subtitle="Perfil, pagamento e preferências"
      />

      {/* Desktop page-head */}
      <PageHead
        eyebrow={professor ? `Conta · ${professor.nome.split(" ")[0]}` : "Ajustes"}
        title="Configurações"
        subtitle="Configure seu perfil, dados de pagamento, política de aulas e lembretes."
      />

      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as typeof aba)}
        className="md:grid md:grid-cols-[220px_1fr] md:gap-8 md:items-start"
      >
        {/* Mobile: TabsList no topo (variant studoo herda das tabs.tsx) */}
        <TabsList className="md:hidden">
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
          <TabsTrigger value="aulas">Aulas</TabsTrigger>
        </TabsList>

        {/* Desktop: settings-side sidebar */}
        <nav className="hidden md:flex flex-col gap-0.5 md:sticky md:top-[88px]">
          {sideItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAba(key)}
              className={cn(
                "flex items-center gap-2.5 h-[38px] px-3 rounded-[10px]",
                "text-[13.5px] font-medium transition-colors text-left",
                aba === key
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-[15px] w-[15px] opacity-90" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content (segue dentro do Tabs root, mas o wrapper é só pra grid spacing) */}
        <div className="space-y-5 mt-5 md:mt-0 min-w-0">

        <TabsContent value="conta" className="space-y-5 mt-5">

      <SectionCard
        title="Meu perfil"
        description="Como você aparece na plataforma"
        icon={UserIcon}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-conta">Email</Label>
            <Input
              id="email-conta"
              value={professor?.email ?? ""}
              disabled
              className="opacity-60 cursor-not-allowed"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={savePerfil} disabled={updateMutation.isPending} size="sm">
              Salvar perfil
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Dados para recibo"
        description="Incluídos automaticamente nos recibos gerados"
        icon={FileText}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cpf-cnpj">CPF ou CNPJ</Label>
            <Input
              id="cpf-cnpj"
              value={cpfCnpj}
              inputMode="numeric"
              onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro — Cidade/UF"
            />
            <AddressMapLink address={endereco} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveRecibo} disabled={updateMutation.isPending} size="sm">
              Salvar dados
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* LGPD: a Política de Privacidade promete portabilidade e exclusão.
          Aqui é onde o professor exerce os dois, sem precisar pedir pra
          ninguém. */}
      <SectionCard
        title="Seus dados"
        description="Levar embora ou apagar de vez"
        icon={ShieldCheck}
      >
        <div className="space-y-5">
          <p className="text-[12.5px] text-muted-foreground max-w-[62ch]">
            Os dados são seus. A lei (LGPD) garante que você pode baixar uma
            cópia de tudo quando quiser e apagar sua conta na hora que decidir —
            sem ter que pedir autorização pra gente.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Baixar todos os meus dados</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[54ch]">
                Um arquivo .json com seu perfil, alunos, horários, aulas,
                cobranças, pacotes, bloqueios e mensagens enviadas.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={baixarDados}
              disabled={baixandoDados || !professor}
              className="shrink-0 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" />
              {baixandoDados ? "Preparando..." : "Baixar meus dados"}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Excluir minha conta</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[54ch]">
                Apaga sua conta e tudo que está nela: alunos, aulas, cobranças e
                histórico. Não tem como voltar atrás depois.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setExcluirAberto(true)}
              disabled={!professor}
              className="shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir minha conta
            </Button>
          </div>
        </div>
      </SectionCard>

        </TabsContent>

        <TabsContent value="pagamento" className="space-y-5 mt-5">

      <SectionCard
        title="Chave PIX"
        description="Incluída nas mensagens de cobrança do WhatsApp"
        icon={Wallet}
        iconTone="success"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chave-pix">Chave PIX</Label>
            <div className="relative">
              <Input
                id="chave-pix"
                value={pixKey}
                onChange={(e) => setPixKey(formatPixKey(e.target.value))}
                placeholder="CPF, email, celular ou chave aleatória"
                className={pixType ? "pr-32" : ""}
              />
              {pixType && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Badge variant="secondary">{pixType}</Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            {professor?.chave_pix ? (
              <p className="text-xs text-success inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Configurada
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">Sem chave configurada</span>
            )}
            <Button onClick={savePix} disabled={updateMutation.isPending} size="sm">
              Salvar chave PIX
            </Button>
          </div>
        </div>
      </SectionCard>

        </TabsContent>

        <TabsContent value="aulas" className="space-y-5 mt-5">

      <SectionCard
        title="Política de faltas"
        description="Define como o app trata faltas e avisos"
        icon={Calendar}
        iconTone="warning"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Cobrar falta sem aviso</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cobrarFalta
                  ? "Falta sem aviso não gera reposição. Aluno paga a mensalidade cheia."
                  : "Modo flexível: falta sem aviso também vira reposição. Mensalidade segue cheia."}
              </p>
            </div>
            <Switch
              aria-label="Cobrar falta sem aviso"
              checked={cobrarFalta}
              onCheckedChange={async (v) => {
                setCobrarFalta(v);
                await updateMutation.mutateAsync({
                  cobrar_falta_sem_aviso: v,
                });
                toast.success("Política atualizada");
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Dia de vencimento</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dia do mês usado ao gerar as mensalidades. Era fixo no 10 —
                agora é seu. Meses curtos caem no último dia.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={1}
                max={31}
                value={diaVencimento}
                aria-label="Dia do mês para vencimento das cobranças"
                onChange={(e) =>
                  setDiaVencimento(
                    Math.max(1, Math.min(31, Number(e.target.value) || 10)),
                  )
                }
                onBlur={async () => {
                  if (diaVencimento === (professor?.dia_vencimento ?? 10)) return;
                  await updateMutation.mutateAsync({
                    dia_vencimento: diaVencimento,
                  });
                  toast.success("Dia de vencimento atualizado");
                }}
                className="w-20 text-center font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                Antecedência mínima para aviso
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seu critério pessoal: avisos que chegarem com menos de {horasAviso}h da aula devem ser marcados como "sem aviso". O app não detecta automaticamente — você marca conforme.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                min={1}
                max={72}
                value={horasAviso}
                aria-label="Horas de antecedência mínima para aviso de falta"
                onChange={(e) =>
                  setHorasAviso(
                    Math.max(1, Math.min(72, Number(e.target.value) || 24)),
                  )
                }
                onBlur={async () => {
                  // Só grava se realmente mudou — antes, clicar no campo e sair
                  // já disparava UPDATE + toast "atualizado".
                  if (horasAviso === professor?.horas_antecedencia_aviso) return;
                  await updateMutation.mutateAsync({
                    horas_antecedencia_aviso: horasAviso,
                  });
                  toast.success("Antecedência atualizada");
                }}
                className="w-20 text-center font-mono"
              />
              <span className="text-xs text-muted-foreground">h</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Bloqueios e folgas"
        description="Datas em que você não dá aula (feriados, viagem, etc)"
        icon={CalendarOff}
        iconTone="destructive"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2">
            <input
              type="date"
              aria-label="Data a bloquear na agenda"
              value={novoBloqueio.data}
              onChange={(e) =>
                setNovoBloqueio({ ...novoBloqueio, data: e.target.value })
              }
              min={format(new Date(), "yyyy-MM-dd")}
              className="flex h-10 w-full rounded-md border border-[hsl(var(--border-field)/0.78)] bg-input/55 px-3 text-sm shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-[background-color,border-color,box-shadow] hover:border-[hsl(var(--border-field))] hover:bg-input/75 focus-visible:outline-none focus-visible:border-primary/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.18)]"
            />
            <Input
              value={novoBloqueio.motivo}
              aria-label="Motivo do bloqueio da agenda"
              onChange={(e) =>
                setNovoBloqueio({ ...novoBloqueio, motivo: e.target.value })
              }
              placeholder="Motivo: férias, feriado..."
            />
            <Button
              onClick={() => addBloqueio.mutate()}
              disabled={!novoBloqueio.data || addBloqueio.isPending}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Bloquear
            </Button>
          </div>

          {bloqueios && bloqueios.length > 0 ? (
            <div className="border-t border-border pt-3 space-y-1">
              {bloqueios.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium first-letter:uppercase">
                      {format(new Date(b.data + "T00:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    {b.motivo && (
                      <p className="text-xs text-muted-foreground">{b.motivo}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeBloqueio.mutate(b.id)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover bloqueio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
              Nenhuma data bloqueada.
            </p>
          )}
        </div>
      </SectionCard>

        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-5 mt-5">

      <SectionCard
        title="Notificações automáticas"
        description="Lembretes para alunos"
        icon={Bell}
        action={<Badge variant="secondary">Em breve</Badge>}
      >
        <div className="bg-muted/25 border border-border/70 rounded-lg px-4 py-3">
          <p className="text-sm font-medium">Em desenvolvimento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Hoje o Studoo monta a mensagem e abre o WhatsApp — quem envia é você. Disparo automático ainda não existe, e a gente avisa aqui quando existir.
            Por enquanto, use o botão de WhatsApp em cada cobrança/aluno para enviar manualmente.
          </p>
        </div>
      </SectionCard>

        </TabsContent>
        </div>
      </Tabs>

      {/* Plano sempre visível, fora das tabs.
          Antes dizia "Studoo Pro · R$ 19,90 · Ativo" com botões desabilitados —
          ninguém paga nada, então o card mentia e os botões pareciam quebrados. */}
      <SectionCard
        title="Seu plano"
        icon={Crown}
        className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 mt-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-primary">
              Plano atual
            </p>
            <p className="text-[17px] font-semibold tracking-[-0.015em] mt-1">
              Beta aberto
            </p>
            <p className="font-mono text-[28px] font-bold tabular-nums tracking-[-0.025em] mt-1.5 leading-none">
              R$ 0
              <span className="text-sm font-medium text-muted-foreground ml-1 tracking-normal">
                /mês
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-[46ch]">
              Sem cobrança e sem cartão. Quando o Studoo passar a ser pago, a
              gente avisa por email antes — e você escolhe se continua.
            </p>
          </div>
          <Badge variant="success">Gratuito</Badge>
        </div>
      </SectionCard>

      {/* Confirmação forte da exclusão: o confirmar só libera depois que o
          professor digita EXCLUIR, e o cancelar continua clicável o tempo
          todo (é pra isso que serve o `confirmDisabled`). */}
      <ConfirmDialog
        open={excluirAberto}
        onOpenChange={fecharExclusao}
        title="Excluir minha conta"
        description="Isso é pra valer e não tem desfazer."
        variant="destructive"
        confirmLabel="Excluir minha conta"
        loadingLabel="Excluindo..."
        loading={excluindoConta}
        confirmDisabled={!podeExcluir}
        onConfirm={excluirConta}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[13px] text-foreground/85">
              No momento que você confirmar, some tudo:
            </p>
            <ul className="text-[13px] text-muted-foreground space-y-1 list-disc pl-4">
              <li>todos os seus alunos e os contatos deles</li>
              <li>todas as aulas, faltas e reposições</li>
              <li>todas as cobranças, pacotes e histórico de pagamento</li>
              <li>seu perfil, chave PIX e configurações</li>
            </ul>
            <p className="text-[13px] text-muted-foreground">
              Se quiser guardar uma cópia, feche isso aqui e clique em "Baixar
              meus dados" antes.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar-exclusao">
              Digite {PALAVRA_EXCLUSAO} pra liberar o botão
            </Label>
            <Input
              id="confirmar-exclusao"
              value={confirmacaoExclusao}
              onChange={(e) => setConfirmacaoExclusao(e.target.value)}
              placeholder={PALAVRA_EXCLUSAO}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono tracking-[0.12em] uppercase"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default Configuracoes;

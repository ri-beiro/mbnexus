import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/permissions/types";
import { HierarchyTree } from "@/features/hierarchy/HierarchyTree";
import { UsersPanel } from "@/features/hierarchy/UsersPanel";

const FUTURE_SECTIONS = [
  "Notificações",
  "E-mail",
  "Integrações (Microsoft 365 / Teams / Outlook)",
  "Permissões avançadas",
  "Status personalizados",
  "Tags",
  "Automação",
  "Templates",
  "Auditoria",
];

export function Settings() {
  const { profile, roles } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Organização, hierarquia, usuários e preferências.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Meu perfil</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="future">Próximas fases</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{profile?.full_name}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {roles.length === 0 && <Badge variant="secondary">Sem papel atribuído</Badge>}
              {roles.map((r) => (
                <Badge key={`${r.roleId}-${r.scopeId ?? "global"}`} variant="outline">
                  {ROLE_LABELS[r.key]}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader>
              <CardTitle>Gerências, coordenações e equipes</CardTitle>
              <CardDescription>Estrutura dinâmica da organização (seção 2 do prompt mestre).</CardDescription>
            </CardHeader>
            <CardContent>
              <HierarchyTree />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>Transferir de equipe, ativar/desativar.</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="future">
          <Card>
            <CardHeader>
              <CardTitle>Planejado para fases futuras</CardTitle>
              <CardDescription>Ver docs/architecture.md para o roadmap completo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {FUTURE_SECTIONS.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <SignOutHint />
      </div>
    </div>
  );
}

function SignOutHint() {
  const { signOut } = useAuth();
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut()}>
      Sair da conta
    </Button>
  );
}

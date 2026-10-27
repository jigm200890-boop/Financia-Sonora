import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highlights = [
  {
    title: "Un solo escritorio",
    detail: "Todas las aplicaciones, con su plataforma, su cuenta y su estado real.",
  },
  {
    title: "Conocimiento permanente",
    detail: "Carpetas y documentos que no se pierden cuando termina una conversación.",
  },
  {
    title: "Matriz de agentes",
    detail: "Varios agentes de IA respondiendo en paralelo, en la misma pantalla.",
  },
];

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, fullName.trim() || email.split("@")[0]);
      }
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar el acceso.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 p-10 lg:flex">
          <div className="surface-grid absolute inset-0 opacity-70" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br from-primary to-info text-sm font-bold text-primary-foreground shadow-glow">
              FS
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Financia Sonora
              </p>
              <p className="text-sm font-semibold text-foreground">Portal de Acceso Único</p>
            </div>
          </div>

          <div className="relative max-w-lg">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Centro de control, conocimiento y agentes
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground">
              Todo el ecosistema de Financia Sonora en un solo escritorio.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Aplicaciones, núcleos, documentos y agentes de IA coordinados desde el mismo lugar.
              Los núcleos existentes siguen funcionando como sistemas independientes.
            </p>

            <div className="mt-8 space-y-3">
              {highlights.map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg border border-border/70 bg-card/50 p-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-[11px] text-muted-foreground">
            No se almacenan contraseñas de plataformas externas. Cada sistema conserva su propio acceso.
          </p>
        </div>

        <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                FS
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Financia Sonora
                </p>
                <p className="text-sm font-semibold text-foreground">Portal de Acceso Único</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Inicia sesión" : "Crea tu acceso"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Entra con tu correo autorizado del portal."
                : "El primer registro queda como administrador del portal."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nombre</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre y apellido"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@financiasonora.com"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {mode === "login" ? "Entrar al portal" : "Crear acceso"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="mt-5 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "login"
                ? "¿Sin acceso todavía? Crear una cuenta"
                : "¿Ya tienes cuenta? Iniciar sesión"}
            </button>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
              El portal guarda correos y notas de acceso. Nunca contraseñas de Base44, Hércules o Google.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

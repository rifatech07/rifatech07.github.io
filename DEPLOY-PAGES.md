# Deploy: GitHub Pages + Supabase

Site estático no GitHub Pages; banco e autenticação no Supabase (plano gratuito).

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e execute `supabase/schema.sql` (Run).
3. **Authentication → Users** → **Add user** → e-mail e senha do admin.
4. (Recomendado) **Authentication → Providers** → desative sign-up público se existir a opção.
5. **Project Settings → API** → copie **Project URL** e **anon public key**.

## 2. Configurar o front-end

Na raiz do projeto:

```powershell
Copy-Item js\config.example.js js\config.js
```

Edite `js/config.js` com URL e anon key do Supabase.

Para publicar, copie também para a pasta do Pages:

```powershell
Copy-Item js\config.js docs\js\config.js
```

> A chave **anon** é pública (vai no navegador). A segurança vem das políticas RLS no Supabase.

## 3. Sincronizar pasta `docs/`

Depois de alterar HTML, CSS ou JS na raiz:

```powershell
.\sync-docs.ps1
```

Isso atualiza `docs/` (conteúdo servido pelo GitHub Pages).

## 4. GitHub Pages

### Opção A — pela interface (mais simples)

1. Envie o repositório para o GitHub.
2. **Settings → Pages** → Source: **Deploy from a branch**.
3. Branch: `main` (ou `master`) → pasta **`/docs`** → Save.
4. Em alguns minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

### Opção B — GitHub Actions

Se preferir deploy automático via workflow, use **Settings → Pages → Source: GitHub Actions** e faça push do arquivo `.github/workflows/pages.yml` (já incluído no projeto).

## 5. Testar

1. Abra a URL do Pages → **Área do comprador** → reserve uma cota.
2. **Painel admin** → login com e-mail/senha criados no Supabase → confirme pagamento ou edite cotas.

## Desenvolvimento local (opcional)

Abra `index.html` com uma extensão tipo **Live Server** (ou sirva a pasta estática) com `js/config.js` preenchido apontando para o Supabase.

## Checklist rápido

- [ ] `schema.sql` executado no Supabase
- [ ] Usuário admin criado (Auth)
- [ ] `js/config.js` e `docs/js/config.js` preenchidos
- [ ] `sync-docs.ps1` rodado antes do push
- [ ] GitHub Pages apontando para `/docs`

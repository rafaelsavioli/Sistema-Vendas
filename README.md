# Sistema de Vendas

Sistema simples de vendas (clientes, produtos e vendas) com dashboard, busca nas listagens e layout responsivo. Feito para a aula de Interface Web II e evoluído para um CRUD completo com MySQL.

## Funcionalidades

- **Dashboard** (`/`): totais de clientes, produtos, vendas e receita, ticket médio, alerta de estoque baixo (`qtd <= 5`) e últimas 5 vendas
- **Clientes**: criar, listar, editar, excluir + busca por nome, e-mail ou telefone
- **Produtos**: criar, listar, editar, excluir + busca, badges `Baixo`/`Esgotado` e preço em R$
- **Vendas**: registrar com baixa automática de estoque, validação de estoque insuficiente, busca por cliente/produto e total acumulado
- **UI**: tema dark, navegação flutuante, modais, snackbar, skeletons de carregamento, empty states e tabelas que viram cards no mobile (< 600px, sem scroll horizontal)

## Stack

- Backend: Node.js + Express 4 + `mysql2/promise`
- Frontend: HTML + CSS + JS vanilla (sem build, servido em `public/`)
- Banco: MySQL (`trabalho_escola`, criado automaticamente no boot)
- Dev: `nodemon`

> `ejs` aparece em `package.json` por histórico, mas o frontend atual é estático — nenhuma view EJS é usada em `app.js`.

## Pré-requisitos

- Node.js 18+ (testado em 22.14)
- MySQL rodando em `localhost` com usuário `root` sem senha (padrão XAMPP). Se o seu MySQL usa senha, ajuste `dbConfig` em `app.js:8`.

## Como rodar

```bash
npm install
npm start        # ou: npm run dev (nodemon)
```

Acesse **pelo servidor** (não abra o arquivo direto):

- http://localhost:3000/
- http://localhost:3000/clientes.html
- http://localhost:3000/produtos.html
- http://localhost:3000/vendas.html

O banco e as tabelas (`Clientes`, `Produtos`, `Vendas`) são criados sozinhos em `initDB()` (`app.js:17`).

## Estrutura

```
.
├── app.js              # Express + MySQL + APIs REST + initDB
├── package.json        # scripts start/dev, deps express/mysql2
└── public/
    ├── index.html      # Dashboard (GET /api/dashboard)
    ├── clientes.html   # CRUD clientes + busca
    ├── produtos.html   # CRUD produtos + busca + badges
    ├── vendas.html     # Registro de vendas + busca + total
    └── style.css       # Tema dark, tokens, cards mobile, skeleton
```

## API

Base: `http://localhost:3000`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboard` | Totais, receita, ticket médio, `estoqueBaixo`, `ultimasVendas` |
| GET | `/api/clientes` | Lista clientes (`ORDER BY id DESC`) |
| POST | `/api/clientes` | `{ nome*, email, telefone }` |
| PUT | `/api/clientes/:id` | Atualiza cliente |
| DELETE | `/api/clientes/:id` | Exclui cliente |
| GET | `/api/produtos` | Lista produtos |
| POST | `/api/produtos` | `{ nome*, qtd*, valor* }` |
| PUT | `/api/produtos/:id` | Atualiza produto |
| DELETE | `/api/produtos/:id` | Exclui produto |
| GET | `/api/vendas` | Vendas com `cliente_nome` e `produto_nome` |
| GET | `/api/vendas/opcoes` | `{ clientes, produtos }` (produtos com `qtd > 0`) |
| POST | `/api/vendas` | `{ id_cliente*, id_produto*, qtd* }` — valida estoque, calcula `valor = preço × qtd` e dá baixa |

Exemplo:

```bash
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/clientes
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Silva","email":"maria@email.com","telefone":"(11) 99999-0000"}'
```

Resposta do dashboard:

```json
{
  "totais": { "clientes": 1, "produtos": 2, "vendas": 2, "receita": 250 },
  "ticketMedio": 125,
  "estoqueBaixo": [{ "id": 1, "nome": "Camiseta Baixa", "qtd": 2, "valor": "50.00" }],
  "ultimasVendas": [{ "id": 2, "cliente_nome": "Teste A", "produto_nome": "Calca OK", "qtd": 2, "valor": "200.00" }]
}
```

## Esquema do banco

Criado automaticamente (`app.js:30-59`):

```sql
CREATE DATABASE IF NOT EXISTS trabalho_escola;
CREATE TABLE Clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telefone VARCHAR(20)
);
CREATE TABLE Produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  qtd INT NOT NULL DEFAULT 0,
  valor DECIMAL(10,2) NOT NULL
);
CREATE TABLE Vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  id_produto INT NOT NULL,
  qtd INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_cliente) REFERENCES Clientes(id),
  FOREIGN KEY (id_produto) REFERENCES Produtos(id)
);
```

## Problemas comuns

- **“Erro ao carregar dashboard” / página vazia**: você abriu o HTML como arquivo (`file://`). Abra via `http://localhost:3000/` com `node app.js` rodando.
- **`ER_ACCESS_DENIED_ERROR` / `ECONNREFUSED`**: MySQL parado ou com senha. Suba o MySQL e confira `dbConfig` em `app.js:8`.
- **Porta 3000 em uso**: outro `node app.js` rodando. Feche o processo ou mate com `taskkill /F /IM node.exe` (Windows).
- **Sem estilo / ícones quebrados offline**: fontes e Material Symbols vêm do Google Fonts e exigem internet.

## Licença

Uso educacional — aula de Interface Web II. Sinta-se à vontade para forkar e adaptar.

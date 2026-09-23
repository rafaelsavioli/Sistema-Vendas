const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'trabalho_escola'
};

let pool;

async function initDB() {
  try {
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempPool.end();
    
    pool = mysql.createPool(dbConfig);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        telefone VARCHAR(20)
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        qtd INT NOT NULL DEFAULT 0,
        valor DECIMAL(10,2) NOT NULL
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Vendas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_cliente INT NOT NULL,
        id_produto INT NOT NULL,
        qtd INT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES Clientes(id),
        FOREIGN KEY (id_produto) REFERENCES Produtos(id)
      )
    `);
    
    console.log('Banco de dados inicializado com sucesso!');
  } catch (err) {
    console.error('Erro ao inicializar banco:', err);
  }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== API CLIENTES ==========
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Clientes ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  try {
    const [result] = await pool.query('INSERT INTO Clientes (nome, email, telefone) VALUES (?, ?, ?)', [nome, email, telefone]);
    res.json({ id: result.insertId, nome, email, telefone });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  try {
    await pool.query('UPDATE Clientes SET nome = ?, email = ?, telefone = ? WHERE id = ?', [nome, email, telefone, req.params.id]);
    res.json({ id: req.params.id, nome, email, telefone });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Clientes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API PRODUTOS ==========
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Produtos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/produtos', async (req, res) => {
  const { nome, qtd, valor } = req.body;
  if (!nome || !qtd || !valor) return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  try {
    const [result] = await pool.query('INSERT INTO Produtos (nome, qtd, valor) VALUES (?, ?, ?)', [nome, qtd, valor]);
    res.json({ id: result.insertId, nome, qtd, valor });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/produtos/:id', async (req, res) => {
  const { nome, qtd, valor } = req.body;
  if (!nome || !qtd || !valor) return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  try {
    await pool.query('UPDATE Produtos SET nome = ?, qtd = ?, valor = ? WHERE id = ?', [nome, qtd, valor, req.params.id]);
    res.json({ id: req.params.id, nome, qtd, valor });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Produtos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API VENDAS ==========
app.get('/api/vendas', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*, c.nome as cliente_nome, p.nome as produto_nome 
      FROM Vendas v
      JOIN Clientes c ON v.id_cliente = c.id
      JOIN Produtos p ON v.id_produto = p.id
      ORDER BY v.data_venda DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/vendas/opcoes', async (req, res) => {
  try {
    const [clientes] = await pool.query('SELECT id, nome FROM Clientes ORDER BY nome');
    const [produtos] = await pool.query('SELECT id, nome, valor, qtd FROM Produtos WHERE qtd > 0 ORDER BY nome');
    res.json({ clientes, produtos });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ========== API DASHBOARD ==========
app.get('/api/dashboard', async (req, res) => {
  try {
    const [[c]] = await pool.query('SELECT COUNT(*) AS total FROM Clientes');
    const [[p]] = await pool.query('SELECT COUNT(*) AS total FROM Produtos');
    const [[v]] = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS receita FROM Vendas');
    const [estoqueBaixo] = await pool.query('SELECT id, nome, qtd, valor FROM Produtos WHERE qtd <= 5 ORDER BY qtd ASC LIMIT 5');
    const [ultimasVendas] = await pool.query(`
      SELECT v.id, v.qtd, v.valor, v.data_venda, c.nome as cliente_nome, p.nome as produto_nome
      FROM Vendas v
      JOIN Clientes c ON v.id_cliente = c.id
      JOIN Produtos p ON v.id_produto = p.id
      ORDER BY v.data_venda DESC LIMIT 5
    `);
    const receita = Number(v.receita) || 0;
    const totalVendas = Number(v.total) || 0;
    res.json({
      totais: { clientes: Number(c.total) || 0, produtos: Number(p.total) || 0, vendas: totalVendas, receita },
      ticketMedio: totalVendas ? receita / totalVendas : 0,
      estoqueBaixo,
      ultimasVendas
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/vendas', async (req, res) => {
  const { id_cliente, id_produto, qtd } = req.body;
  if (!id_cliente || !id_produto || !qtd) return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  
  try {
    const [produtoRows] = await pool.query('SELECT valor, qtd as estoque FROM Produtos WHERE id = ?', [id_produto]);
    if (produtoRows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
    
    const produto = produtoRows[0];
    if (parseInt(qtd) > produto.estoque) return res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${produto.estoque}` });
    
    const valorTotal = produto.valor * qtd;
    
    const [result] = await pool.query('INSERT INTO Vendas (id_cliente, id_produto, qtd, valor) VALUES (?, ?, ?, ?)', [id_cliente, id_produto, qtd, valorTotal]);
    await pool.query('UPDATE Produtos SET qtd = qtd - ? WHERE id = ?', [qtd, id_produto]);
    
    res.json({ id: result.insertId, id_cliente, id_produto, qtd, valor: valorTotal });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
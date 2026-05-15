# Dictionary API

API REST para gerenciamento de palavras, sinônimos, antônimos e significados.

## Endpoints

### GET /words

Retorna todas as palavras cadastradas.

**Resposta de sucesso (200):**

```json
{
  "words": [
    {
      "id": 1,
      "term": "EXEMPLO",
      "synonyms": ["amostra", "modelo"],
      "antonyms": []
    }
  ],
  "meanings": [
    {
      "word_id": 1,
      "part_of_speech": "substantivo",
      "definition": "algo que serve de modelo",
      "categories": ["educação"],
      "examples": ["Este é um exemplo prático."]
    }
  ]
}
```

**Erro (500):**

```
Database Error
```

---

### POST /words

Cria uma nova palavra com seu significado.

**Corpo da requisição (JSON):**

```json
{
  "word": {
    "term": "exemplo",
    "synonyms": ["amostra", "modelo"],
    "antonyms": []
  },
  "meaning": {
    "part_of_speech": "substantivo",
    "definition": "algo que serve de modelo",
    "categories": ["educação"],
    "examples": ["Este é um exemplo prático."]
  }
}
```

**Validação (400):** Caso o corpo não siga o esquema `CreateWordRequest`, retorna:

```json
{
  "error": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["word", "term"],
      "message": "Required"
    }
  ]
}
```

**Resposta de sucesso (201):**

```
Word created with Success!
```

**Erro (500):**

```
Internal Database Error.
```

---

### GET /words/:word

Retorna os dados de uma palavra específica (case‑insensitive).

**Parâmetro de rota:** `word` (string)

**Resposta de sucesso (200):**

```json
{
  "id": 1,
  "term": "EXEMPLO",
  "synonyms": ["amostra", "modelo"],
  "antonyms": []
}
```

**Erro (500):**

```
Database Error: <mensagem>
```

---

### PATCH /words/:word

Atualiza sinônimos, antônimos e/ou significado de uma palavra existente.

**Parâmetro de rota:** `word` (string)

**Corpo da requisição (JSON):**

```json
{
  "synonyms": ["amostra", "modelo", "padrão"],
  "antonyms": [],
  "meaning": {
    "part_of_speech": "substantivo",
    "definition": "algo que serve de modelo ou padrão",
    "categories": ["educação", "tecnologia"],
    "examples": ["Este é um exemplo prático.", "Siga o exemplo."]
  }
}
```

**Validação (400):** Caso o corpo não siga o esquema `PatchWordRequest`, retorna:

```json
{
  "error": [
    {
      "code": "invalid_type",
      "expected": "array",
      "received": "undefined",
      "path": ["synonyms"],
      "message": "Required"
    }
  ]
}
```

**Resposta de sucesso (200):** (sem corpo)

**Erro (500):**

```
Database Error: <mensagem>
```

---

## Esquemas de validação (Zod)

Os esquemas utilizados pelo middleware `validate` estão definidos em `src/models/dictionary.js`.

### `CreateWordRequest`

```typescript
{
  word: {
    term: string,
    synonyms: string[],
    antonyms: string[]
  },
  meaning: {
    part_of_speech: string,
    definition: string,
    categories: string[],
    examples: string[]
  }
}
```

### `PatchWordRequest`

```typescript
{
  synonyms: string[],
  antonyms: string[],
  meaning: {
    part_of_speech: string,
    definition: string,
    categories: string[],
    examples: string[]
  }
}
```

---

## Tecnologias utilizadas

- Node.js
- Express
- PostgreSQL
- Zod (validação de esquemas)
- Docker (opcional)

---

## Como executar

1. Instale as dependências:

```bash
npm install
```

2. Configure as variáveis de ambiente (veja `src/config/db.js`).

3. Inicie o servidor:

```bash
npm start
```

O servidor será iniciado na porta definida em `PORT` (padrão 3000).

---

## Licença

Projeto acadêmico – Sistemas Distribuídos.

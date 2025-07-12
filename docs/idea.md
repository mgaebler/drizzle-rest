# Technisches Konzept: Drizzle REST Adapter (Revidiert)

Die Kernidee ist eine einzige Funktion, `createDrizzleRestAdapter`, die ein Konfigurationsobjekt entgegennimmt und eine fertige Middleware zurückgibt, die mit Frameworks wie Express oder Fastify kompatibel ist. Die Middleware generiert zur Laufzeit eine REST-API basierend auf einem Drizzle-Schema.

-----

## 1\. Anwendung und Signatur

So würde ein Entwickler den Adapter verwenden. Dies ist das zentrale Zielbild.

```typescript
// In Ihrer server.ts
import express from 'express';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';
import { db } from './db/connection'; // Ihre Drizzle-Instanz
import * as schema from './db/schema'; // Ihr importiertes Drizzle-Schema

const app = express();
app.use(express.json());

// Adapter erstellen und konfigurieren
const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  // Optionale Konfigurationen
  tableOptions: {
    users: {
      // Deaktiviere das Löschen von Benutzern
      disabledEndpoints: ['DELETE']
    }
  }
});

// Die generierte API unter einem Präfix einhängen
// Ein Client könnte nun z.B. /api/v1/users?status=active&_sort=created_at&_order=desc abfragen
app.use('/api/v1', drizzleApiRouter);

app.listen(3000, () => {
  console.log('Server mit Drizzle REST Adapter läuft auf Port 3000');
});
```

-----

## 2\. Funktionsweise des Adapters

Die Funktion `createDrizzleRestAdapter` führt die folgenden Schritte zur Laufzeit (beim Serverstart) aus:

  * **Schema-Introspektion**: Der Adapter analysiert das übergebene `schema`-Objekt, um alle Tabellen- und Relations-Definitionen zu erkennen. Er inspiziert die internen Drizzle-Metadaten, um auf Tabellennamen, Spalten und Primärschlüssel zuzugreifen.

  * **Dynamische Erstellung der Zod-Schemata**: Intern und im Speicher verwendet der Adapter die Funktion `createInsertSchema` von `drizzle-zod` für jede Tabelle, um Validierungsschemata für `POST`- und `PATCH`-Anfragen automatisch zu erstellen.

  * **Dynamische Router-Erstellung**: Der Adapter erstellt eine neue Router-Instanz (z.B. `express.Router()`). Für jede im Schema gefundene Tabelle werden programmatisch die folgenden Endpunkte an den Router gebunden:

      * `GET /<table-name>`: Handler für `getMany`
      * `POST /<table-name>`: Handler für `createOne`
      * `GET /<table-name>/:id`: Handler für `getOne`
      * `PATCH /<table-name>/:id`: Handler für `updateOne`
      * `DELETE /<table-name>/:id`: Handler für `deleteOne`
      * Zusätzlich werden für definierte Relationen verschachtelte Routen erstellt: `GET /<table-name>/:id/<relation-name>`

-----

## 3\. API-Abfragesprache (JSON-Server-Dialekt)

Um eine nahtlose Migration von JSON-Server zu ermöglichen und die bekannte Syntax beizubehalten, implementiert der Adapter den **JSON-Server-Dialekt** vollständig.

### Filterung

Filter werden als direkte Query-Parameter übergeben. Mehrere Parameter werden standardmäßig mit **AND** verknüpft.

  * **Beispiel**: `GET /users?status=active&company_id=1`

Folgende Operatoren werden unterstützt:

  * **Direkte Gleichheit**: `?status=active`
  * **Bereichsfilter**: `?age_gte=18&age_lte=65`
  * **String-Suche**: `?name_like=John` (Teilstring-Suche)
  * **Negation**: `?status_ne=inactive`
  * **Array-Zugehörigkeit**: `?id=1&id=2&id=3` (mehrere IDs)

### Sortierung

Die Sortierung wird über die `_sort` und `_order` Parameter gesteuert.

  * **Syntax**: `?_sort=spalte&_order=asc` oder `?_sort=spalte&_order=desc`
  * **Beispiel**: `GET /users?_sort=created_at&_order=desc`
  * **Standard**: Aufsteigend (asc), wenn `_order` nicht angegeben

### Paginierung

Die Paginierung erfolgt über `_page` und `_limit` Parameter.

  * **Syntax**: `?_page=2&_limit=10`
  * **Beispiel**: `GET /users?_page=1&_limit=25`
  * **Standard**: `_limit=10` wenn nicht angegeben

### Beziehungen

JSON-Server's Beziehungs-Features werden ebenfalls unterstützt:

  * **Einbetten**: `?_embed=comments` (1:n Beziehungen einbetten)
  * **Erweitern**: `?_expand=user` (n:1 Beziehungen erweitern)
  * **Beispiel**: `GET /posts?_embed=comments&_expand=author`

-----

## 4\. Spezifikation der dynamischen Handler

Die generierten Handler implementieren die folgenden Features:

  * **getMany**: Verarbeitet Query-Parameter für **Filterung**, **Sortierung** und **Paginierung** gemäß dem **JSON-Server-Dialekt** und baut die Drizzle-Query dynamisch auf.

  * **getOne**: Verarbeitet den `:id`-Parameter und gibt bei Nicht-Fund einen `404`-Fehler zurück. Unterstützt den `?select=`-Parameter zur Auswahl spezifischer Spalten.

  * **createOne**: Validiert den Body gegen das dynamisch erstellte Zod-Schema (`400`-Fehler bei Fehlschlag) und gibt bei Erfolg `201 Created` zurück.

  * **updateOne (als PATCH)**: Validiert den partiellen Body und gibt bei Erfolg das aktualisierte Objekt zurück (`404` wenn nicht gefunden).

  * **deleteOne**: Löscht den Datensatz und gibt `204 No Content` zurück (`404` wenn nicht gefunden).

-----

## 5\. Konfigurationsobjekt

Die `createDrizzleRestAdapter`-Funktion akzeptiert ein Konfigurationsobjekt zur Anpassung.

```typescript
interface DrizzleRestAdapterOptions {
  /** Die Drizzle-Datenbankinstanz. Erforderlich. */
  db: DrizzleClient;

  /** Das importierte Drizzle-Schema-Objekt. Erforderlich. */
  schema: Record<string, PgTable | MySqlTable | ... | Relations>;

  /**
   * Detaillierte Konfiguration pro Tabelle.
   * Ermöglicht das Deaktivieren von Endpunkten oder das Hinzufügen von Hooks.
   */
  tableOptions?: {
    [tableName: string]: {
      disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'DELETE'>;

      // Hooks für benutzerdefinierte Logik (z.B. Berechtigungsprüfung)
      hooks?: {
        beforeOperation?: (context: HookContext) => Promise<void>;
        afterOperation?: (context: HookContext, result: any) => Promise<any>;
      }
    }
  };
}
```

-----

## 6\. Implementierungsstrategie

Die Implementierung erfolgt in mehreren aufeinander aufbauenden Phasen, um eine stabile und wartbare Codebasis zu gewährleisten.

### Phase 1: Grundlagen und Schema-Introspektion

**Ziel**: Drizzle-Schema analysieren und Metadaten extrahieren

```typescript
// Core-Modul: schema-inspector.ts
export class SchemaInspector {
  constructor(private schema: Record<string, any>) {}

  /**
   * Extrahiert alle Tabellen aus dem Schema
   */
  extractTables(): TableMetadata[] {
    return Object.entries(this.schema)
      .filter(([_, value]) => this.isTable(value))
      .map(([name, table]) => ({
        name,
        tableName: table[Table.Symbol.Name],
        columns: this.extractColumns(table),
        primaryKey: this.extractPrimaryKey(table),
        relations: [] // Will be populated later
      }));
  }

  private extractColumns(table: DrizzleTable): ColumnMetadata[] {
    // Zugriff auf Drizzle-interne Metadaten
    // table[Table.Symbol.Columns] oder ähnlich
  }
}
```

**Deliverables Phase 1**:
- Schema-Introspektion funktioniert für alle Drizzle-Tabellentypen
- Metadaten-Extraktion für Spalten, Primärschlüssel, Datentypen
- Basis-Tests für verschiedene Schema-Varianten

### Phase 2: Query-Builder und Filter-Engine

**Ziel**: JSON-Server-kompatible Query-Parameter in Drizzle-Queries übersetzen

```typescript
// Core-Modul: query-builder.ts
export class QueryBuilder {
  constructor(private table: DrizzleTable) {}

  /**
   * Baut eine Drizzle-Query aus JSON-Server Query-Parametern
   */
  buildSelectQuery(params: QueryParams): SelectQueryBuilder {
    let query = this.db.select().from(this.table);

    // Filter anwenden
    if (params.filters) {
      query = this.applyFilters(query, params.filters);
    }

    // Sortierung anwenden
    if (params._sort) {
      query = this.applySort(query, params._sort, params._order);
    }

    // Paginierung anwenden
    if (params._page || params._limit) {
      query = this.applyPagination(query, params._page, params._limit);
    }

    return query;
  }

  private applyFilters(query: SelectQueryBuilder, filters: Record<string, any>): SelectQueryBuilder {
    return Object.entries(filters).reduce((q, [key, value]) => {
      // JSON-Server Filter-Syntax parsen
      if (key.endsWith('_gte')) {
        const column = key.replace('_gte', '');
        return q.where(gte(this.table[column], value));
      }

      if (key.endsWith('_lte')) {
        const column = key.replace('_lte', '');
        return q.where(lte(this.table[column], value));
      }

      if (key.endsWith('_like')) {
        const column = key.replace('_like', '');
        return q.where(like(this.table[column], `%${value}%`));
      }

      if (key.endsWith('_ne')) {
        const column = key.replace('_ne', '');
        return q.where(ne(this.table[column], value));
      }

      // Direkte Gleichheit (Standard JSON-Server)
      if (!key.startsWith('_')) {
        if (Array.isArray(value)) {
          return q.where(inArray(this.table[key], value));
        }
        return q.where(eq(this.table[key], value));
      }

      return q;
    }, query);
  }

  private applySort(query: SelectQueryBuilder, sortField: string, order: 'asc' | 'desc' = 'asc'): SelectQueryBuilder {
    if (order === 'desc') {
      return query.orderBy(desc(this.table[sortField]));
    }
    return query.orderBy(asc(this.table[sortField]));
  }

  private applyPagination(query: SelectQueryBuilder, page: number = 1, limit: number = 10): SelectQueryBuilder {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }
}
```

**Deliverables Phase 2**:
- Vollständige Implementierung aller JSON-Server-Filteroperatoren
- Robuste Query-Parameter-Parsing für JSON-Server-Syntax
- Umfassende Tests für alle Filter-Kombinationen
- Performance-optimierte Query-Generierung
- Unterstützung für `_embed` und `_expand` Parameter

### Phase 3: HTTP-Handler und Middleware

**Ziel**: Request/Response-Handling für alle CRUD-Operationen

```typescript
// Core-Modul: handlers.ts
export class CrudHandlers {
  constructor(
    private db: DrizzleClient,
    private table: DrizzleTable,
    private validator: ZodValidator
  ) {}

  /**
   * GET /table - Liste mit Filterung, Sortierung, Paginierung
   */
  async getMany(req: Request, res: Response): Promise<void> {
    try {
      const params = this.parseQueryParams(req.query);
      const queryBuilder = new QueryBuilder(this.table);
      const query = queryBuilder.buildSelectQuery(params);

      const [results, totalCount] = await Promise.all([
        query.execute(),
        this.getTotalCount(params.filters)
      ]);

      res.set('X-Total-Count', String(totalCount));
      res.json(results);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * POST /table - Neuen Datensatz erstellen
   */
  async createOne(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = this.validator.validateInsert(req.body);
      const result = await this.db.insert(this.table).values(validatedData).returning();

      res.status(201).json(result[0]);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ... weitere Handler für getOne, updateOne, deleteOne
}
```

**Deliverables Phase 3**:
- Vollständige CRUD-Handler-Implementierung
- Robuste Fehlerbehandlung und HTTP-Status-Codes
- Validierung mit dynamisch generierten Zod-Schemas
- Request/Response-Logging und Debugging-Support

### Phase 4: Router-Assembly und Middleware-Integration

**Ziel**: Dynamische Router-Erstellung und Framework-Integration

```typescript
// Haupt-Modul: adapter.ts
export function createDrizzleRestAdapter(options: DrizzleRestAdapterOptions): Router {
  const inspector = new SchemaInspector(options.schema);
  const tables = inspector.extractTables();
  const router = express.Router();

  // Für jede Tabelle Handler erstellen und routen
  tables.forEach(tableMetadata => {
    const handlers = new CrudHandlers(
      options.db,
      options.schema[tableMetadata.name],
      new ZodValidator(tableMetadata)
    );

    const tablePath = `/${tableMetadata.name}`;
    const tableOptions = options.tableOptions?.[tableMetadata.name];

    // CRUD-Routen registrieren (falls nicht deaktiviert)
    if (!tableOptions?.disabledEndpoints?.includes('GET_MANY')) {
      router.get(tablePath, handlers.getMany.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('CREATE')) {
      router.post(tablePath, handlers.createOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('GET_ONE')) {
      router.get(`${tablePath}/:id`, handlers.getOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('UPDATE')) {
      router.patch(`${tablePath}/:id`, handlers.updateOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('DELETE')) {
      router.delete(`${tablePath}/:id`, handlers.deleteOne.bind(handlers));
    }

    // Relations-Routen für verschachtelte Ressourcen
    this.registerRelationRoutes(router, tableMetadata, handlers);
  });

  return router;
}
```

**Deliverables Phase 4**:
- Vollständige Adapter-Hauptfunktion
- Framework-agnostische Router-Erstellung
- Konfigurationsbasierte Endpunkt-Aktivierung/Deaktivierung
- Relations-Support für verschachtelte Ressourcen

### Phase 5: Erweiterte Features und Optimierungen

**Ziel**: Hooks, Performance-Optimierungen und erweiterte Funktionalitäten

```typescript
// Erweiterte Features
export class AdvancedHandlers extends CrudHandlers {
  async getMany(req: Request, res: Response): Promise<void> {
    const tableConfig = this.options.tableOptions?.[this.tableName];

    // Before-Hook ausführen
    if (tableConfig?.hooks?.beforeOperation) {
      await tableConfig.hooks.beforeOperation({
        operation: 'GET_MANY',
        table: this.tableName,
        params: req.query,
        user: req.user // falls Authentication-Middleware vorhanden
      });
    }

    // Standard-Operation ausführen
    const result = await super.getMany(req, res);

    // After-Hook ausführen
    if (tableConfig?.hooks?.afterOperation) {
      const modifiedResult = await tableConfig.hooks.afterOperation({
        operation: 'GET_MANY',
        table: this.tableName,
        result: result
      }, result);

      return modifiedResult;
    }

    return result;
  }
}
```

**Deliverables Phase 5**:
- Hook-System für benutzerdefinierte Logik
- Performance-Optimierungen (Query-Caching, Connection-Pooling)
- Erweiterte Relation-Unterstützung (Deep Nesting)
- Umfassende Dokumentation und Beispiele

### Phase 6: Testing und Produktionsreife

**Ziel**: Umfassende Tests und Produktionsoptimierungen

```typescript
// Test-Suite Beispiel
describe('DrizzleRestAdapter', () => {
  let adapter: Router;
  let testDb: DrizzleClient;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    adapter = createDrizzleRestAdapter({
      db: testDb,
      schema: testSchema
    });
  });

  describe('GET /users', () => {
    it('should return all users without filters', async () => {
      const response = await request(adapter).get('/users');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter users by status', async () => {
      const response = await request(adapter).get('/users?status=active');
      expect(response.status).toBe(200);
      expect(response.body.every(user => user.status === 'active')).toBe(true);
    });

    it('should sort users by created_at descending', async () => {
      const response = await request(adapter).get('/users?_sort=created_at&_order=desc');
      expect(response.status).toBe(200);
      expect(response.body[0].created_at).toBeGreaterThan(response.body[1].created_at);
    });

    it('should paginate users correctly', async () => {
      const response = await request(adapter).get('/users?_page=2&_limit=5');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
      expect(response.headers['x-total-count']).toBeDefined();
    });

    it('should filter with range operators', async () => {
      const response = await request(adapter).get('/users?age_gte=18&age_lte=65');
      expect(response.status).toBe(200);
      expect(response.body.every(user => user.age >= 18 && user.age <= 65)).toBe(true);
    });
  });

  // ... weitere Tests für alle CRUD-Operationen und Edge Cases
});
```

**Deliverables Phase 6**:
- Vollständige Test-Suite mit >90% Coverage
- Performance-Benchmarks und Optimierungen
- Produktions-Ready Error-Handling
- Umfassende Dokumentation und Migrationsleitfäden

### Implementierungs-Reihenfolge

1. **Wochen 1-2**: Phase 1 (Schema-Introspektion)
2. **Wochen 3-4**: Phase 2 (Query-Builder)
3. **Wochen 5-6**: Phase 3 (HTTP-Handler)
4. **Wochen 7-8**: Phase 4 (Router-Assembly)
5. **Wochen 9-10**: Phase 5 (Erweiterte Features)
6. **Wochen 11-12**: Phase 6 (Testing & Produktionsreife)

Diese Strategie ermöglicht es, bereits nach Phase 4 eine funktionsfähige Version zu haben, während die erweiterten Features in den späteren Phasen hinzugefügt werden können.
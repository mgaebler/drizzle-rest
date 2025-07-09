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
// Ein Client könnte nun z.B. /api/v1/users?tasks_count=gte.5&sort=created_at.desc abfragen
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

## 3\. API-Abfragesprache (PostgREST-Dialekt)

Um eine mächtige und standardisierte Abfrage von Listen zu ermöglichen, implementiert der Adapter einen Dialekt, der stark von **PostgREST** inspiriert ist.

### Filterung

Filter werden als Query-Parameter nach dem Muster `spalte=operator.wert` übergeben. Mehrere Parameter werden standardmäßig mit **AND** verknüpft.

  * **Beispiel**: `GET /users?status=eq.active&company_id=neq.1`

Folgende Operatoren werden unterstützt:

  * `eq`: equals (gleich)
  * `neq`: not equals (ungleich)
  * `gt`: greater than
  * `gte`: greater than or equal
  * `lt`: less than
  * `lte`: less than or equal
  * `like`: für String-Suche (z.B. `name=like.*John*`)
  * `ilike`: wie `like`, aber case-insensitive
  * `in`: Wert ist in einer kommaseparierten Liste (z.B. `status=in.active,pending`)
  * `is`: prüft auf `true`, `false` oder `null` (z.B. `is_verified=is.true`)

### Sortierung

Die Sortierung wird über den `sort`-Parameter gesteuert.

  * **Syntax**: `?sort=spalte.asc` oder `?sort=spalte.desc`
  * **Beispiel**: `GET /users?sort=created_at.desc`

### Paginierung

Die Paginierung erfolgt über `limit` und `offset`.

  * **Syntax**: `?limit=25&offset=50`

-----

## 4\. Spezifikation der dynamischen Handler

Die generierten Handler implementieren die folgenden Features:

  * **getMany**: Verarbeitet Query-Parameter für **Filterung**, **Sortierung** und **Paginierung** gemäß dem definierten PostgREST-Dialekt und baut die Drizzle-Query dynamisch auf.

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
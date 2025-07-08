Technisches Konzept: Drizzle REST Adapter
Die Kernidee ist eine einzige Funktion, createDrizzleRestAdapter, die ein Konfigurationsobjekt entgegennimmt und eine fertige Middleware zurückgibt, die mit Frameworks wie Express oder Fastify kompatibel ist.

## 1. Anwendung und Signatur
So würde ein Entwickler den Adapter verwenden. Dies ist das zentrale Zielbild.

TypeScript
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
app.use('/api/v1', drizzleApiRouter);

app.listen(3000, () => {
  console.log('Server mit Drizzle REST Adapter läuft auf Port 3000');
});
```

## 2. Funktionsweise des Adapters
Die Funktion createDrizzleRestAdapter führt die folgenden Schritte zur Laufzeit (beim Serverstart) aus:

Schema-Introspektion (zur Laufzeit)

Der Adapter erhält das schema-Objekt, das alle Tabellen- und Relations-Definitionen enthält.

Er iteriert durch die Schlüssel dieses Objekts (z.B. users, posts).

Für jede Tabelle inspiziert er die interne _-Eigenschaft (z.B. users._), die Drizzle zur Speicherung von Metadaten wie Tabellenname, Spalten, Primärschlüsseln etc. verwendet. Dies erfordert keine statische Analyse, da die Informationen im lebenden Objekt vorhanden sind.

Relations-Objekte (erstellt mit relations()) werden ebenfalls analysiert, um die Verbindungen zwischen den Tabellen zu verstehen.

Dynamische Erstellung der Zod-Schemata

Intern und im Speicher verwendet der Adapter die Funktion createInsertSchema von drizzle-zod für jede Tabelle, um Validierungsschemata für POST- und PATCH-Anfragen zu erstellen. Dies geschieht automatisch, ohne dass der Benutzer etwas tun muss.

Dynamische Router-Erstellung

Der Adapter erstellt eine neue Router-Instanz (z.B. express.Router()).

Für jede im Schema gefundene Tabelle werden programmatisch die folgenden Endpunkte an den Router gebunden:

```
GET /<table-name>: Handler für getMany
POST /<table-name>: Handler für createOne
GET /<table-name>/:id: Handler für getOne
PATCH /<table-name>/:id: Handler für updateOne
DELETE /<table-name>/:id: Handler für deleteOne

Zusätzlich werden für definierte Relationen verschachtelte Routen erstellt:
GET /<table-name>/:id/<relation-name> (z.B. /users/123/posts)
```

## 3. Spezifikation der dynamischen Handler
Die Handler werden im Speicher generiert und müssen dieselben robusten Features wie im vorherigen Konzept implementieren:

getMany: Muss Query-Parameter für Paginierung (?page=&limit=), Sortierung (?sort=) und Filterung (?columName=value) verarbeiten und die Drizzle-Query entsprechend dynamisch aufbauen.

getOne: Muss den id-Parameter verarbeiten, einen 404-Fehler bei Nicht-Fund zurückgeben und den ?include=-Parameter für Eager-Loading von Relationen unterstützen.

createOne: Validiert den Body gegen das dynamisch erstellte Zod-Schema (400-Fehler bei Fehlschlag) und gibt bei Erfolg 201 Created zurück.

updateOne (als PATCH): Validiert den partiellen Body und gibt bei Erfolg das aktualisierte Objekt zurück (404 wenn nicht gefunden).

deleteOne: Löscht den Datensatz und gibt 204 No Content zurück (404 wenn nicht gefunden).

## 4. Konfigurationsobjekt
Die createDrizzleRestAdapter-Funktion akzeptiert ein Konfigurationsobjekt zur Anpassung des Verhaltens:

TypeScript

```typescript
interface DrizzleRestAdapterOptions {
  /** Die Drizzle-Datenbankinstanz. Erforderlich. */
  db: DrizzleClient;

  /** Das importierte Drizzle-Schema-Objekt. Erforderlich. */
  schema: Record<string, PgTable | MySqlTable | ... | Relations>;

  /** * Detaillierte Konfiguration pro Tabelle.
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

Dieses Konzept führt zu einer echten "Plug-and-Play"-Lösung, die die Komplexität vor dem Entwickler verbirgt und eine extrem schnelle API-Erstellung direkt aus dem Schema ermöglicht, ohne einen zwischengeschalteten Build-Schritt.
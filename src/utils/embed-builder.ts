import { eq } from 'drizzle-orm';

import { RelationMetadata, TableMetadata } from './schema-inspector';

type DrizzleDb = any;

export class EmbedBuilder {
    constructor(
        private db: DrizzleDb,
        private schema: Record<string, any>,
        private tablesMetadata: Map<string, TableMetadata>
    ) { }

    async applyEmbeds(data: any[], tableName: string, embedKeys: string[]): Promise<any[]> {
        if (!embedKeys || embedKeys.length === 0) {
            return data;
        }

        const tableMetadata = this.tablesMetadata.get(tableName);
        if (!tableMetadata) {
            throw new Error(`Table metadata not found for ${tableName}`);
        }

        // Process each embed request
        for (const embedKey of embedKeys) {
            data = await this.applyEmbed(data, tableMetadata, embedKey);
        }

        return data;
    }

    private async applyEmbed(data: any[], tableMetadata: TableMetadata, embedKey: string): Promise<any[]> {
        const relation = this.findRelation(tableMetadata, embedKey);
        if (!relation) {
            console.warn(`No relation found for embed key '${embedKey}' in table '${tableMetadata.name}'`);
            return data;
        }

        if (relation.type === 'belongs_to') {
            return await this.embedBelongsTo(data, relation, embedKey);
        } else if (relation.type === 'has_many') {
            return await this.embedHasMany(data, relation, embedKey);
        }

        return data;
    }

    private findRelation(tableMetadata: TableMetadata, embedKey: string): RelationMetadata | null {
        // Try to find relation by exact match first
        let relation = tableMetadata.relations.find(rel =>
            this.getEmbedKeyForRelation(rel) === embedKey
        );

        if (!relation) {
            // Try fuzzy matching
            relation = tableMetadata.relations.find(rel =>
                rel.relatedTable === embedKey ||
                rel.relatedTable.replace(/s$/, '') === embedKey ||
                rel.relatedTable === embedKey + 's'
            );
        }

        return relation || null;
    }

    private getEmbedKeyForRelation(relation: RelationMetadata): string {
        if (relation.type === 'belongs_to') {
            // For belongs_to: userId -> user
            return relation.foreignKey.replace(/Id$/, '').toLowerCase();
        } else {
            // For has_many: use table name (posts, comments)
            return relation.relatedTable;
        }
    }

    private async embedBelongsTo(data: any[], relation: RelationMetadata, embedKey: string): Promise<any[]> {
        const relatedTable = this.schema[relation.relatedTable];
        if (!relatedTable) {
            console.warn(`Related table '${relation.relatedTable}' not found in schema`);
            return data;
        }

        // Get unique foreign key values
        const foreignKeyValues = [...new Set(
            data.map(item => item[relation.foreignKey]).filter(id => id != null)
        )];

        if (foreignKeyValues.length === 0) {
            // Add null embed key to all items
            return data.map(item => ({ ...item, [embedKey]: null }));
        }

        // Fetch related records
        const relatedTableMetadata = this.tablesMetadata.get(relation.relatedTable);
        const primaryKeyColumn = relatedTableMetadata?.primaryKey[0] || 'id';
        const relatedTableColumns = this.schema[relation.relatedTable];

        const relatedRecords = await this.db
            .select()
            .from(relatedTable)
            .where(eq(relatedTableColumns[primaryKeyColumn], foreignKeyValues[0])); // TODO: Handle multiple values with IN clause

        // Create lookup map
        const relatedMap = new Map();
        for (const record of relatedRecords) {
            relatedMap.set(record[primaryKeyColumn], record);
        }

        // Embed related data
        return data.map(item => ({
            ...item,
            [embedKey]: relatedMap.get(item[relation.foreignKey]) || null
        }));
    }

    private async embedHasMany(data: any[], relation: RelationMetadata, embedKey: string): Promise<any[]> {
        const relatedTable = this.schema[relation.relatedTable];
        if (!relatedTable) {
            console.warn(`Related table '${relation.relatedTable}' not found in schema`);
            return data;
        }

        // Get primary key values from main data
        const mainTableMetadata = this.tablesMetadata.get(data[0]?.constructor?.name);
        const primaryKeyColumn = mainTableMetadata?.primaryKey[0] || 'id';
        const primaryKeyValues = data.map(item => item[primaryKeyColumn]).filter(id => id != null);

        if (primaryKeyValues.length === 0) {
            // Add empty arrays to all items
            return data.map(item => ({ ...item, [embedKey]: [] }));
        }

        // Fetch related records
        const allRelatedRecords = await this.db
            .select()
            .from(relatedTable);

        // Group by foreign key
        const relatedMap = new Map();
        allRelatedRecords.forEach((record: any) => {
            const foreignKeyValue = record[relation.foreignKey];
            if (!relatedMap.has(foreignKeyValue)) {
                relatedMap.set(foreignKeyValue, []);
            }
            relatedMap.get(foreignKeyValue).push(record);
        });

        // Embed related data
        return data.map(item => ({
            ...item,
            [embedKey]: relatedMap.get(item[primaryKeyColumn]) || []
        }));
    }
}

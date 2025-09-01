// Comprehensive data normalization utilities used by the app.
// The logic is adapted from the reference implementation and kept
// intentionally verbose so the UI can offer rich export options.

export const ID_STRATEGIES: Record<string, any> = {
    sequential: {
        label: "Sequential",
        description: "Auto-incrementing integers (1, 2, 3...)",
        tooltip:
            "Traditional auto-increment IDs. Simple, predictable, and efficient for most use cases. Best for single-database deployments.",
        generate: (index: number) => index + 1,
        sqlType: "INTEGER AUTO_INCREMENT",
        example: "1, 2, 3, 4, 5...",
    },
    uuid: {
        label: "UUID v4",
        description: "Universally unique identifiers",
        tooltip:
            "Globally unique 128-bit identifiers. Perfect for distributed systems, data integration, and avoiding ID conflicts across databases.",
        generate: () => crypto.randomUUID(),
        sqlType: "VARCHAR(36)",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    },
    timestamp: {
        label: "Timestamp",
        description: "Unix timestamp with random suffix",
        tooltip:
            "Time-based IDs that are naturally sortable and provide creation order. Good for audit trails and chronological data.",
        generate: (index: number) => `${Date.now()}_${String(index).padStart(6, "0")}`,
        sqlType: "VARCHAR(20)",
        example: "1640995200000_000001",
    },
    hash: {
        label: "Content Hash",
        description: "SHA-1 hash of row content",
        tooltip:
            "Deterministic IDs based on data content. Same data always produces same ID. Useful for deduplication and data integrity.",
        generate: (_index: number, rowData: any) => {
            const content = JSON.stringify(rowData || {});
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash;
            }
            return `hash_${Math.abs(hash).toString(16)}`;
        },
        sqlType: "VARCHAR(20)",
        example: "hash_a1b2c3d4",
    },
    prefixed: {
        label: "Prefixed Sequential",
        description: "Table prefix + sequential number",
        tooltip:
            "Human-readable IDs with meaningful prefixes. Great for business applications where IDs need to be recognizable (ORDER_001, CUST_001).",
        generate: (index: number, _rowData: any, tablePrefix = "REC") =>
            `${tablePrefix}_${String(index + 1).padStart(6, "0")}`,
        sqlType: "VARCHAR(20)",
        example: "FACT_000001, DIM_000001",
    },
};

// --- Utility helpers ----------------------------------------------------

export function toSnakeCase(str: string) {
    return str
        .replace(/\W+/g, " ")
        .split(" ")
        .map((word) => word.toLowerCase())
        .join("_")
        .replace(/_{2,}/g, "_")
        .replace(/^_|_$/g, "");
}

export function inferSQLType(values: any[]): string {
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");
    if (nonNullValues.length === 0) return "VARCHAR(255)";

    const isAllNumbers = nonNullValues.every((v) => !isNaN(v) && !isNaN(parseFloat(v)));
    const isAllIntegers = nonNullValues.every((v) => Number.isInteger(parseFloat(v)));
    const isAllDates = nonNullValues.every((v) => !isNaN(Date.parse(v)));

    if (isAllNumbers) {
        return isAllIntegers ? "INTEGER" : "DECIMAL(10,2)";
    }

    if (isAllDates) {
        return "DATETIME";
    }

    const maxLength = Math.max(...nonNullValues.map((v) => String(v).length));
    return maxLength > 255 ? "TEXT" : `VARCHAR(${Math.max(50, maxLength)})`;
}

export function identifyDimensionColumns(data: any[], columns: string[]) {
    const dimensionCandidates: any[] = [];

    columns.forEach((col) => {
        const values = data
            .map((row) => row[col])
            .filter((v) => v !== null && v !== undefined && v !== "");
        const uniqueValues = [...new Set(values)];
        const uniqueRatio = uniqueValues.length / values.length;

        const isLikelyDimension =
            uniqueRatio < 0.5 && uniqueValues.length >= 2 && uniqueValues.length < values.length * 0.8;
        const isText = values.some((v) => isNaN(parseFloat(v)));
        const dimensionKeywords = [
            "category",
            "type",
            "status",
            "region",
            "department",
            "group",
            "class",
            "grade",
            "level",
        ];
        const hasKeyword = dimensionKeywords.some((keyword) => col.toLowerCase().includes(keyword));

        if (isLikelyDimension || (isText && uniqueValues.length <= 50) || hasKeyword) {
            dimensionCandidates.push({
                column: col,
                uniqueCount: uniqueValues.length,
                uniqueValues: uniqueValues,
                dataType: isText ? "VARCHAR" : "INTEGER",
            });
        }
    });

    return dimensionCandidates;
}

// --- Relational Normalization -------------------------------------------

export function normalizeForRelational(data: any[], idStrategy = "sequential") {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    const normalizedTables: Record<string, any> = {};
    const dimensionTables: Record<string, any> = {};
    const foreignKeys: Record<string, any> = {};
    const strategy = ID_STRATEGIES[idStrategy];

    const dimensions = identifyDimensionColumns(data, columns);

    dimensions.forEach((dim) => {
        const tableName = `dim_${toSnakeCase(dim.column)}`;
        const idColumn = `${toSnakeCase(dim.column)}_id`;

        const dimensionData = dim.uniqueValues.map((value: any, index: number) => {
            const id =
                idStrategy === "prefixed"
                    ? strategy.generate(index, { [dim.column]: value }, "DIM")
                    : strategy.generate(index, { [dim.column]: value });

            return {
                [idColumn]: id,
                [toSnakeCase(dim.column)]: value,
                created_at: new Date().toISOString(),
            };
        });

        dimensionTables[tableName] = {
            schema: [
                {
                    name: idColumn,
                    type: idStrategy === "sequential" ? "INTEGER AUTO_INCREMENT" : strategy.sqlType,
                    primary_key: true,
                    nullable: false,
                },
                {
                    name: toSnakeCase(dim.column),
                    type: dim.dataType === "VARCHAR" ? "VARCHAR(255)" : "INTEGER",
                    nullable: false,
                },
                { name: "created_at", type: "DATETIME", nullable: false },
            ],
            data: dimensionData,
            indexes: [`CREATE INDEX idx_${tableName}_${toSnakeCase(dim.column)} ON ${tableName}(${toSnakeCase(dim.column)})`],
        };

        foreignKeys[dim.column] = {
            table: tableName,
            key: idColumn,
            mapping: Object.fromEntries(
                dim.uniqueValues.map((value: any, index: number) => {
                    const id =
                        idStrategy === "prefixed"
                            ? strategy.generate(index, { [dim.column]: value }, "DIM")
                            : strategy.generate(index, { [dim.column]: value });
                    return [value, id];
                })
            ),
        };
    });

    const factColumns = columns.filter((col) => !dimensions.find((d) => d.column === col));

    const factSchema: any[] = [
        {
            name: "fact_id",
            type: idStrategy === "sequential" ? "INTEGER AUTO_INCREMENT" : strategy.sqlType,
            primary_key: true,
            nullable: false,
        },
    ];

    dimensions.forEach((dim) => {
        const fkColumn = `${toSnakeCase(dim.column)}_id`;
        factSchema.push({
            name: fkColumn,
            type: idStrategy === "sequential" ? "INTEGER" : strategy.sqlType,
            nullable: false,
            foreign_key: {
                references_table: `dim_${toSnakeCase(dim.column)}`,
                references_column: fkColumn,
            },
        });
    });

    factColumns.forEach((col) => {
        factSchema.push({
            name: toSnakeCase(col),
            type: inferSQLType(data.map((row) => row[col])),
            nullable: data.some((row) => !row[col]),
        });
    });

    factSchema.push(
        { name: "created_at", type: "DATETIME", nullable: false },
        { name: "updated_at", type: "DATETIME", nullable: false }
    );

    const factData = data.map((row, index) => {
        const factId =
            idStrategy === "prefixed" ? strategy.generate(index, row, "FACT") : strategy.generate(index, row);

        const factRow: Record<string, any> = {
            fact_id: factId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        dimensions.forEach((dim) => {
            const fkColumn = `${toSnakeCase(dim.column)}_id`;
            factRow[fkColumn] = foreignKeys[dim.column].mapping[row[dim.column]];
        });

        factColumns.forEach((col) => {
            factRow[toSnakeCase(col)] = row[col];
        });

        return factRow;
    });

    const factTableName = "fact_main_data";
    normalizedTables[factTableName] = {
        schema: factSchema,
        data: factData,
        indexes: [
            `CREATE INDEX idx_${factTableName}_created_at ON ${factTableName}(created_at)`,
            ...dimensions.map(
                (dim) =>
                    `CREATE INDEX idx_${factTableName}_${toSnakeCase(dim.column)}_id ON ${factTableName}(${toSnakeCase(dim.column)}_id)`
            ),
        ],
    };

    Object.assign(normalizedTables, dimensionTables);

    return {
        tables: normalizedTables,
        relationships: dimensions.map((dim) => ({
            from_table: factTableName,
            from_column: `${toSnakeCase(dim.column)}_id`,
            to_table: `dim_${toSnakeCase(dim.column)}`,
            to_column: `${toSnakeCase(dim.column)}_id`,
            relationship_type: "many-to-one",
        })),
        star_schema: {
            fact_table: factTableName,
            dimension_tables: Object.keys(dimensionTables),
            recommended_measures: factColumns.map(toSnakeCase),
            recommended_dimensions: dimensions.map((d) => toSnakeCase(d.column)),
            id_strategy: idStrategy,
        },
    };
}

// --- Document Normalization --------------------------------------------

export function normalizeForDocument(data: any[], idStrategy = "sequential") {
    if (!data || data.length === 0) return null;

    const strategy = ID_STRATEGIES[idStrategy];

    return {
        collection: "documents",
        documents: data.map((row, index) => {
            const id = idStrategy === "prefixed" ? strategy.generate(index, row, "DOC") : strategy.generate(index, row);

            return {
                _id: id,
                ...Object.fromEntries(Object.entries(row).map(([key, value]) => [toSnakeCase(key), value])),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        }),
        id_strategy: idStrategy,
    };
}

// --- NoSQL (wide-column) Normalization ---------------------------------

export function normalizeForNoSQL(data: any[], idStrategy = "sequential") {
    if (!data || data.length === 0) return null;

    const strategy = ID_STRATEGIES[idStrategy];
    const keyValuePairs: Record<string, any> = {};
    const duplicateKeys: string[] = [];
    const validationLog: string[] = [];

    data.forEach((row, index) => {
        const trainerId = row.trainer_id;
        const pokemonId = row.pokemon_id;

        if (!trainerId || !pokemonId) {
            validationLog.push(`Row ${index + 1}: Skipped due to missing trainer_id or pokemon_id`);
            return;
        }

        const compositeKey = `${trainerId}:${pokemonId}`;
        const currentLevel = parseInt(row.level) || 1;

        if (keyValuePairs[compositeKey]) {
            const existing = keyValuePairs[compositeKey];
            if (currentLevel > existing.level) {
                duplicateKeys.push(`Replaced ${compositeKey}: level ${existing.level} → ${currentLevel}`);
                keyValuePairs[compositeKey] = createNoSQLRecord(row, index, strategy, idStrategy);
            } else {
                duplicateKeys.push(`Kept existing ${compositeKey}: level ${existing.level} vs ${currentLevel}`);
            }
        } else {
            keyValuePairs[compositeKey] = createNoSQLRecord(row, index, strategy, idStrategy);
        }
    });

    return {
        keyspace: "data_records",
        records: keyValuePairs,
        id_strategy: idStrategy,
        validation_log: [...validationLog, ...duplicateKeys],
        data_quality: {
            original_rows: data.length,
            final_records: Object.keys(keyValuePairs).length,
            duplicates_resolved: duplicateKeys.length,
            null_keys_removed: validationLog.length,
        },
    };
}

function createNoSQLRecord(row: any, index: number, strategy: any, idStrategy: string) {
    const id = idStrategy === "prefixed" ? strategy.generate(index, row, "REC") : strategy.generate(index, row);

    const moveColumns = [
        "move_1",
        "move_2",
        "move_3",
        "move_4",
        "moves",
        "move1",
        "move2",
        "move3",
        "move4",
    ];
    const moves: string[] = [];

    moveColumns.forEach((col) => {
        if (row[col] && row[col].trim()) {
            moves.push(row[col].trim());
        }
    });

    if (moves.length === 0 && row.moves) {
        const splitMoves = row.moves
            .split(",")
            .map((m: string) => m.trim())
            .filter((m: string) => m);
        moves.push(...splitMoves);
    }

    const movesSet = moves.length > 0 ? `{${moves.map((m) => m.replace(/[{}]/g, "")).join(",")}}` : "{}";

    return {
        trainer_id: row.trainer_id,
        pokemon_id: row.pokemon_id,
        species: row.species || row.pokemon_species,
        level: parseInt(row.level) || 1,
        ability: row.ability,
        moves: movesSet,
        moves_array: moves,
        primary_type: row.primary_type,
        secondary_type: row.secondary_type || null,
        timestamp: Date.now(),
        ttl: 86400,
    };
}

// --- CQL Schema generation ----------------------------------------------

export function generateCQLSchema(normalizedData: any) {
    if (!normalizedData.records) return "";

    const cqlStatements: string[] = [];
    cqlStatements.push("-- Cassandra CQL Schema");
    cqlStatements.push("CREATE KEYSPACE IF NOT EXISTS pokemon_data");
    cqlStatements.push("WITH REPLICATION = {");
    cqlStatements.push("  'class': 'SimpleStrategy',");
    cqlStatements.push("  'replication_factor': 1");
    cqlStatements.push("};");
    cqlStatements.push("");
    cqlStatements.push("USE pokemon_data;");
    cqlStatements.push("");

    cqlStatements.push("CREATE TABLE IF NOT EXISTS roster_by_trainer (");
    cqlStatements.push("  trainer_id TEXT,");
    cqlStatements.push("  pokemon_id TEXT,");
    cqlStatements.push("  species TEXT,");
    cqlStatements.push("  level INT,");
    cqlStatements.push("  ability TEXT,");
    cqlStatements.push("  moves SET<TEXT>,");
    cqlStatements.push("  primary_type TEXT,");
    cqlStatements.push("  secondary_type TEXT,");
    cqlStatements.push("  timestamp BIGINT,");
    cqlStatements.push("  ttl INT,");
    cqlStatements.push("  PRIMARY KEY ((trainer_id), pokemon_id)");
    cqlStatements.push(");");
    cqlStatements.push("");

    cqlStatements.push("CREATE INDEX IF NOT EXISTS ON roster_by_trainer (species);");
    cqlStatements.push("CREATE INDEX IF NOT EXISTS ON roster_by_trainer (level);");
    cqlStatements.push("");

    cqlStatements.push("-- Load data using COPY command");
    cqlStatements.push(
        "COPY roster_by_trainer (trainer_id, pokemon_id, species, level, ability, moves, primary_type, secondary_type, timestamp, ttl)"
    );
    cqlStatements.push("FROM 'nosql_for_cassandra_copy.csv'");
    cqlStatements.push("WITH HEADER=TRUE AND DELIMITER=',';");

    return cqlStatements.join("\n");
}


import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

interface SchemaProperty {
  type?: string;
  format?: string;
  default?: string;
  description?: string;
  items?: any;
}

interface TableDefinition {
  type: string;
  required?: string[];
  properties: Record<string, SchemaProperty>;
  description?: string;
}

interface OpenAPISchema {
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, any>;
  definitions: Record<string, TableDefinition>;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env');
  process.exit(1);
}

async function fetchSchema() {
  console.log('🔄 Fetching database schema from Supabase PostgREST OpenAPI endpoint...');
  console.log(`📡 URL: ${supabaseUrl}/rest/v1/`);

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey as string,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/openapi+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
  }

  const schema: OpenAPISchema = (await response.json()) as OpenAPISchema;
  const tables = Object.keys(schema.definitions || {});

  console.log(`✅ Successfully fetched schema for ${tables.length} tables:`);
  tables.forEach((t) => console.log(`   - ${t}`));

  // Extract relations for Mermaid ER Diagram
  const foreignKeys: { fromTable: string; fromCol: string; toTable: string; toCol: string }[] = [];

  for (const [tableName, tableDef] of Object.entries(schema.definitions)) {
    for (const [colName, prop] of Object.entries(tableDef.properties || {})) {
      if (prop.description && prop.description.includes('<fk table=')) {
        const match = prop.description.match(/<fk table='([^']+)' column='([^']+)'\/>/);
        if (match) {
          foreignKeys.push({
            fromTable: tableName,
            fromCol: colName,
            toTable: match[1],
            toCol: match[2],
          });
        }
      }
    }
  }

  // Generate Markdown
  let md = `# Velaar Database Schema 🗄️\n\n`;
  md += `> Automatically extracted from live Supabase instance (${supabaseUrl}) on **${new Date().toISOString()}**.\n\n`;
  md += `## Overview\n\n`;
  md += `Velaar's persistence layer is built on PostgreSQL via Supabase. It features multi-tenant educational management with institution-level isolation, granular role-based access, automated attendance tracking, AI activity telemetry, course roadmaps, and examination analytics.\n\n`;
  md += `- **Total Tables:** ${tables.length}\n`;
  md += `- **Total Foreign Key Relationships:** ${foreignKeys.length}\n\n`;

  // Mermaid Diagram
  md += `## 📊 Entity-Relationship Diagram (ERD)\n\n`;
  md += `\`\`\`mermaid\nerDiagram\n`;
  
  for (const fk of foreignKeys) {
    md += `  ${fk.toTable.toUpperCase()} ||--o{ ${fk.fromTable.toUpperCase()} : "${fk.fromCol} -> ${fk.toCol}"\n`;
  }
  md += `\`\`\`\n\n`;

  // Tables List
  md += `## 📑 Tables Index\n\n`;
  for (const t of tables) {
    const colCount = Object.keys(schema.definitions[t].properties || {}).length;
    md += `- [${t}](#table-${t.replace(/_/g, '-')}) (${colCount} columns)\n`;
  }
  md += `\n---\n\n`;

  // Table Details
  md += `## 🔍 Detailed Table Specifications\n\n`;

  for (const [tableName, tableDef] of Object.entries(schema.definitions)) {
    const properties = tableDef.properties || {};
    const required = tableDef.required || [];

    md += `### Table: \`${tableName}\`\n\n`;
    if (tableDef.description) {
      md += `${tableDef.description}\n\n`;
    }

    md += `| Column | Type | Constraints | Default | Description / Reference |\n`;
    md += `|---|---|---|---|---|\n`;

    for (const [colName, prop] of Object.entries(properties)) {
      const type = prop.format || prop.type || 'text';
      const isPk = prop.description?.includes('<pk/>') || colName === 'id';
      const isRequired = required.includes(colName);
      
      const constraints: string[] = [];
      if (isPk) constraints.push('PRIMARY KEY');
      if (isRequired) constraints.push('NOT NULL');
      else if (!isPk) constraints.push('NULLABLE');

      let defaultVal = prop.default ? `\`${prop.default}\`` : '-';

      let description = '-';
      if (prop.description) {
        const fkMatch = prop.description.match(/<fk table='([^']+)' column='([^']+)'\/>/);
        if (fkMatch) {
          description = `🔗 FK \`-> ${fkMatch[1]}.${fkMatch[2]}\``;
        } else {
          description = prop.description.replace(/<[^>]+>/g, '').replace(/Note:\s*/, '').trim() || '-';
        }
      }

      md += `| \`${colName}\` | \`${type}\` | ${constraints.join(', ')} | ${defaultVal} | ${description} |\n`;
    }
    md += `\n`;
  }

  // Generate SQL DDL
  md += `---\n\n## 📜 SQL DDL Definition\n\n`;
  md += `You can execute this DDL in PostgreSQL or the Supabase SQL Editor to reproduce the schema:\n\n`;
  md += `\`\`\`sql\n`;

  for (const [tableName, tableDef] of Object.entries(schema.definitions)) {
    const properties = tableDef.properties || {};
    const required = tableDef.required || [];

    md += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
    const colDefs: string[] = [];

    for (const [colName, prop] of Object.entries(properties)) {
      let pgType = 'TEXT';
      const fmt = prop.format || prop.type;
      switch (fmt) {
        case 'uuid':
          pgType = 'UUID';
          break;
        case 'integer':
          pgType = 'INTEGER';
          break;
        case 'numeric':
          pgType = 'NUMERIC';
          break;
        case 'jsonb':
          pgType = 'JSONB';
          break;
        case 'date':
          pgType = 'DATE';
          break;
        case 'timestamp with time zone':
          pgType = 'TIMESTAMPTZ';
          break;
        case 'boolean':
          pgType = 'BOOLEAN';
          break;
        default:
          pgType = 'TEXT';
      }

      let line = `  ${colName} ${pgType}`;
      if (prop.description?.includes('<pk/>') || (required.includes(colName) && colName === 'id')) {
        line += ' PRIMARY KEY';
      } else if (required.includes(colName)) {
        line += ' NOT NULL';
      }

      if (prop.default) {
        line += ` DEFAULT ${prop.default}`;
      }

      const fkMatch = prop.description?.match(/<fk table='([^']+)' column='([^']+)'\/>/);
      if (fkMatch) {
        line += ` REFERENCES public.${fkMatch[1]}(${fkMatch[2]}) ON DELETE CASCADE`;
      }

      colDefs.push(line);
    }

    md += colDefs.join(',\n') + '\n);\n\n';
  }

  md += `\`\`\`\n`;

  // Write files
  const docsDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const schemaMdPath = path.join(docsDir, 'DATABASE_SCHEMA.md');
  fs.writeFileSync(schemaMdPath, md, 'utf-8');
  console.log(`\n📄 Generated Markdown Schema: ${schemaMdPath}`);

  const schemaJsonPath = path.join(docsDir, 'database_schema.json');
  fs.writeFileSync(schemaJsonPath, JSON.stringify(schema, null, 2), 'utf-8');
  console.log(`📄 Generated Raw JSON Schema: ${schemaJsonPath}`);

  console.log('\n🎉 Schema successfully exported!');
}

fetchSchema().catch((err) => {
  console.error('❌ Failed to fetch schema:', err);
  process.exit(1);
});

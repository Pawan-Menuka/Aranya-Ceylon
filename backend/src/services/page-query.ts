import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export interface PageRow { id: string; keys: string[] }
interface Cursor extends PageRow { v: 1; scope: string }
export interface OrderKey { expression: Prisma.Sql; ascending?: boolean }
export function pageIdentity(identity: unknown): string {
    return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}
export function encodePageCursor(row: PageRow, scope: string): string {
    return Buffer.from(JSON.stringify({ v: 1, scope, id: row.id, keys: row.keys })).toString('base64url');
}
export function decodePageCursor(value: string | undefined, scope: string, keyCount: number): PageRow | undefined {
    if (!value) return;
    try {
        if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
        const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
        if (cursor.v !== 1 || cursor.scope !== scope || typeof cursor.id !== 'string'
            || !cursor.id || cursor.id.length > 200 || !Array.isArray(cursor.keys)
            || cursor.keys.length !== keyCount || cursor.keys.some(key => typeof key !== 'string'
                || key.length > 100 || !/^-?\d+(\.\d+)?$/.test(key))) throw new Error();
        return cursor;
    } catch {
        throw Object.assign(new Error('Invalid page cursor for these filters and market'), { status: 400, expose: true });
    }
}
// Only generated column aliases enter raw SQL. User data always remains bound.
export function buildSeekPage(from: Prisma.Sql, where: Prisma.Sql, order: OrderKey[], limit: number, cursor?: PageRow): Prisma.Sql {
    const aliases = order.map((_, index) => Prisma.raw(`k${index}`));
    const selected = order.map((key, index) => Prisma.sql`(${key.expression})::numeric AS ${aliases[index]!}`);
    const ordering = order.map((key, index) => Prisma.sql`${aliases[index]!} ${key.ascending ? Prisma.sql`ASC` : Prisma.sql`DESC`}`);
    const branches = cursor ? order.map((key, index) => {
        const equal = aliases.slice(0, index).map((alias, previous) => Prisma.sql`${alias} = ${cursor.keys[previous]!}::numeric`);
        return Prisma.sql`(${Prisma.join([...equal, Prisma.sql`${aliases[index]!} ${key.ascending ? Prisma.sql`>` : Prisma.sql`<`} ${cursor.keys[index]!}::numeric`], ' AND ')})`;
    }) : [];
    if (cursor) branches.push(Prisma.sql`(${Prisma.join([...aliases.map((alias, index) => Prisma.sql`${alias} = ${cursor.keys[index]!}::numeric`), Prisma.sql`id > ${cursor.id}`], ' AND ')})`);
    return Prisma.sql`WITH ordered AS (SELECT p.id, ${Prisma.join(selected)} FROM ${from} WHERE ${where})
        SELECT id, ARRAY[${Prisma.join(aliases.map(alias => Prisma.sql`${alias}::text`))}] AS keys FROM ordered
        ${cursor ? Prisma.sql`WHERE ${Prisma.join(branches, ' OR ')}` : Prisma.empty}
        ORDER BY ${Prisma.join(ordering)}, id ASC LIMIT ${limit + 1}`;
}
export function literalTokens(q: string): string[] {
    return [...new Set(q.toLocaleLowerCase('en').split(/\s+/u).filter(Boolean))];
}
export function literalMatch(haystack: Prisma.Sql, q: string): Prisma.Sql {
    const tokens = literalTokens(q);
    return tokens.length ? Prisma.sql`(${Prisma.join(tokens.map(token => Prisma.sql`strpos(lower(${haystack}), ${token}) > 0`), ' AND ')})` : Prisma.sql`false`;
}

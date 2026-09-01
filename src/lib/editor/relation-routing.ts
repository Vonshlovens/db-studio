import type { Relation, Table } from '$lib/types';
import { getColumnCenterY, getTableHeight, TABLE_WIDTH } from './table-geometry';

export type ConnectionSide = 'left' | 'right';

export interface RelationAnchor {
	x: number;
	y: number;
	side: ConnectionSide;
}

export interface RelationRoute {
	path: string;
	start: RelationAnchor;
	end: RelationAnchor;
	marks: string[];
}

const STUB = 20;
const SAME_SIDE_EXTRA = 24;
const MIN_OPPOSITE_GAP = STUB * 2;
const CROW_LENGTH = 10;
const CROW_SPREAD = 6;
const ONE_BAR_OFFSET = 8;
const ONE_BAR_SPREAD = 6;

interface TableBox {
	id: string;
	left: number;
	right: number;
	top: number;
	bottom: number;
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function getTableBox(table: Table): TableBox {
	const top = table.position.y;
	const left = table.position.x;
	return {
		id: table.id,
		left,
		right: left + TABLE_WIDTH,
		top,
		bottom: top + getTableHeight(table.columns.length)
	};
}

function columnAnchorY(table: Table, columnId: string): number {
	const index = table.columns.findIndex((column) => column.id === columnId);
	return round(table.position.y + getColumnCenterY(index < 0 ? 0 : index));
}

function isSideClear(box: TableBox, side: ConnectionSide, other: TableBox): boolean {
	if (box.id === other.id) return true;
	if (!rangesOverlap(box.top, box.bottom, other.top, other.bottom)) return true;
	const x = side === 'right' ? box.right : box.left;
	return x <= other.left || x >= other.right;
}

function chooseSides(from: TableBox, to: TableBox): { fromSide: ConnectionSide; toSide: ConnectionSide } {
	if (from.id === to.id) {
		return { fromSide: 'right', toSide: 'right' };
	}

	const gapToRight = to.left - from.right;
	const gapToLeft = from.left - to.right;

	if (gapToRight >= MIN_OPPOSITE_GAP) {
		return { fromSide: 'right', toSide: 'left' };
	}
	if (gapToLeft >= MIN_OPPOSITE_GAP) {
		return { fromSide: 'left', toSide: 'right' };
	}

	const fromRightClear = isSideClear(from, 'right', to);
	const fromLeftClear = isSideClear(from, 'left', to);
	const toRightClear = isSideClear(to, 'right', from);
	const toLeftClear = isSideClear(to, 'left', from);

	if (fromRightClear && toRightClear) return { fromSide: 'right', toSide: 'right' };
	if (fromLeftClear && toLeftClear) return { fromSide: 'left', toSide: 'left' };
	if (fromRightClear && toLeftClear) return { fromSide: 'right', toSide: 'left' };
	if (fromLeftClear && toRightClear) return { fromSide: 'left', toSide: 'right' };

	return {
		fromSide: fromRightClear || !fromLeftClear ? 'right' : 'left',
		toSide: toRightClear || !toLeftClear ? 'right' : 'left'
	};
}

function stubX(edgeX: number, side: ConnectionSide): number {
	return side === 'right' ? edgeX + STUB : edgeX - STUB;
}

function edgeX(box: TableBox, side: ConnectionSide): number {
	return side === 'right' ? box.right : box.left;
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
	return Math.min(a2, b2) - Math.max(a1, b1) > 0;
}

function buildPath(
	start: RelationAnchor,
	end: RelationAnchor,
	fromBox: TableBox,
	toBox: TableBox
): string {
	const x1 = start.x;
	const y1 = start.y;
	const x2 = end.x;
	const y2 = end.y;
	const fromStub = stubX(x1, start.side);
	const toStub = stubX(x2, end.side);

	if (start.side === end.side) {
		const bend =
			start.side === 'right'
				? Math.max(fromStub, toStub) + SAME_SIDE_EXTRA
				: Math.min(fromStub, toStub) - SAME_SIDE_EXTRA;

		const selfRelation = fromBox.id === toBox.id;
		const yOverlap = rangesOverlap(fromBox.top, fromBox.bottom, toBox.top, toBox.bottom);
		if (!yOverlap || selfRelation) {
			return `M ${x1} ${y1} H ${round(bend)} V ${y2} H ${x2}`;
		}

		const aroundY = aroundOutsideY(fromBox, toBox, y1, y2);
		return `M ${x1} ${y1} H ${round(bend)} V ${round(aroundY)} H ${round(toStub)} V ${y2} H ${x2}`;
	}

	const hasGap = start.side === 'right' ? fromStub <= toStub : fromStub >= toStub;
	if (hasGap) {
		if (y1 === y2) {
			return `M ${x1} ${y1} H ${x2}`;
		}
		const midX = round((fromStub + toStub) / 2);
		return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
	}

	const aroundY = aroundOutsideY(fromBox, toBox, y1, y2);
	return `M ${x1} ${y1} H ${round(fromStub)} V ${round(aroundY)} H ${round(toStub)} V ${y2} H ${x2}`;
}

function aroundOutsideY(fromBox: TableBox, toBox: TableBox, y1: number, y2: number): number {
	const aroundTop = Math.min(fromBox.top, toBox.top) - STUB;
	const aroundBottom = Math.max(fromBox.bottom, toBox.bottom) + STUB;
	const topCost = Math.abs(y1 - aroundTop) + Math.abs(y2 - aroundTop);
	const bottomCost = Math.abs(y1 - aroundBottom) + Math.abs(y2 - aroundBottom);
	return topCost <= bottomCost ? aroundTop : aroundBottom;
}

function crowFootPath(anchor: RelationAnchor): string {
	const dir = anchor.side === 'right' ? 1 : -1;
	const tipX = round(anchor.x + dir * CROW_LENGTH);
	const y = anchor.y;
	const x = anchor.x;
	return `M ${x} ${y - CROW_SPREAD} L ${tipX} ${y} M ${x} ${y + CROW_SPREAD} L ${tipX} ${y} M ${x} ${y} L ${tipX} ${y}`;
}

function oneBarPath(anchor: RelationAnchor): string {
	const dir = anchor.side === 'right' ? 1 : -1;
	const x = round(anchor.x + dir * ONE_BAR_OFFSET);
	return `M ${x} ${anchor.y - ONE_BAR_SPREAD} L ${x} ${anchor.y + ONE_BAR_SPREAD}`;
}

function marksForRelation(relation: Relation, start: RelationAnchor, end: RelationAnchor): string[] {
	const startMany = relation.type === 'many-to-one' || relation.type === 'many-to-many';
	const endMany = relation.type === 'one-to-many' || relation.type === 'many-to-many';

	return [
		startMany ? crowFootPath(start) : oneBarPath(start),
		endMany ? crowFootPath(end) : oneBarPath(end)
	];
}

export function getRelationRoute(
	relation: Relation,
	tables: readonly Table[]
): RelationRoute | null {
	const fromTable = tables.find((table) => table.id === relation.from.tableId);
	const toTable = tables.find((table) => table.id === relation.to.tableId);
	if (!fromTable || !toTable) return null;

	const fromBox = getTableBox(fromTable);
	const toBox = getTableBox(toTable);
	const { fromSide, toSide } = chooseSides(fromBox, toBox);

	const start: RelationAnchor = {
		x: round(edgeX(fromBox, fromSide)),
		y: columnAnchorY(fromTable, relation.from.columnId),
		side: fromSide
	};
	const end: RelationAnchor = {
		x: round(edgeX(toBox, toSide)),
		y: columnAnchorY(toTable, relation.to.columnId),
		side: toSide
	};

	return {
		path: buildPath(start, end, fromBox, toBox),
		start,
		end,
		marks: marksForRelation(relation, start, end)
	};
}

function pathPoints(path: string): Array<{ x: number; y: number }> {
	const commands = [...path.matchAll(/[MVH][\d.\s-]+/g)].map((match) => match[0].trim());
	const points: Array<{ x: number; y: number }> = [];
	let x = 0;
	let y = 0;

	for (const command of commands) {
		const kind = command[0];
		const nums = command
			.slice(1)
			.trim()
			.split(/\s+/)
			.map(Number)
			.filter((value) => Number.isFinite(value));

		if (kind === 'M' && nums.length >= 2) {
			x = nums[0];
			y = nums[1];
			points.push({ x, y });
		} else if (kind === 'H' && nums.length >= 1) {
			x = nums[0];
			points.push({ x, y });
		} else if (kind === 'V' && nums.length >= 1) {
			y = nums[0];
			points.push({ x, y });
		}
	}

	return points;
}

function segmentCutsTable(
	a: { x: number; y: number },
	b: { x: number; y: number },
	box: TableBox,
	inset: number
): boolean {
	const left = box.left + inset;
	const right = box.right - inset;
	const top = box.top + inset;
	const bottom = box.bottom - inset;

	if (a.y === b.y) {
		if (a.y <= top || a.y >= bottom) return false;
		const x1 = Math.min(a.x, b.x);
		const x2 = Math.max(a.x, b.x);
		return x1 < right && x2 > left;
	}

	if (a.x === b.x) {
		if (a.x <= left || a.x >= right) return false;
		const y1 = Math.min(a.y, b.y);
		const y2 = Math.max(a.y, b.y);
		return y1 < bottom && y2 > top;
	}

	return false;
}

/** Returns true when a connector segment runs through the interior of a table card. */
export function routeCutsThroughTable(route: RelationRoute, tables: readonly Table[]): boolean {
	const points = pathPoints(route.path);
	const inset = 1;

	for (let i = 0; i < points.length - 1; i++) {
		const hits = tables.some((table) =>
			segmentCutsTable(points[i], points[i + 1], getTableBox(table), inset)
		);
		if (hits) return true;
	}

	return false;
}

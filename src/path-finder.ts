export class PathFinder {
    width: number;
    height: number;
    isBlocked: (x: number, y: number) => boolean;

    constructor(width: number, height: number, isBlocked: (x: number, y: number) => boolean) {
        this.width = width;
        this.height = height;
        this.isBlocked = isBlocked;
    }

    find(start: { x: number; y: number }, goal: { x: number; y: number }): { x: number; y: number }[] {
        if (start.x === goal.x && start.y === goal.y) return [];

        type Node = { x: number; y: number; g: number; f: number };
        const key = (x: number, y: number) => `${x},${y}`;
        const open: Node[] = [{ x: start.x, y: start.y, g: 0, f: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y) }];
        const cameFrom = new Map<string, string>();
        const gScore: number[][] = Array.from({ length: this.height + 1 }, () => new Array<number>(this.width + 1).fill(Infinity));
        gScore[start.y][start.x] = 0;
        const closed: boolean[][] = Array.from({ length: this.height + 1 }, () => new Array<boolean>(this.width + 1).fill(false));

        while (open.length > 0) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift()!;
            if (current.x === goal.x && current.y === goal.y) {
                const path: { x: number; y: number }[] = [];
                let ck = key(goal.x, goal.y);
                while (ck !== key(start.x, start.y)) {
                    const [cx, cy] = ck.split(',').map(Number);
                    path.unshift({ x: cx, y: cy });
                    ck = cameFrom.get(ck)!;
                }
                return path;
            }
            closed[current.y][current.x] = true;
            const neighbors = [
                [0, -1], [0, 1], [-1, 0], [1, 0],
            ];
            for (const [dx, dy] of neighbors) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                if (nx < 0 || ny < 0 || nx > this.width || ny > this.height) continue;
                if (closed[ny][nx]) continue;
                if (this.isBlocked(nx, ny) && (nx !== goal.x || ny !== goal.y)) continue;
                const tentativeG = current.g + 1;
                if (tentativeG >= gScore[ny][nx]) continue;
                cameFrom.set(key(nx, ny), key(current.x, current.y));
                gScore[ny][nx] = tentativeG;
                const h = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
                const existing = open.find(n => n.x === nx && n.y === ny);
                if (existing) {
                    existing.g = tentativeG;
                    existing.f = tentativeG + h;
                } else {
                    open.push({ x: nx, y: ny, g: tentativeG, f: tentativeG + h });
                }
            }
        }

        return [];
    }
}
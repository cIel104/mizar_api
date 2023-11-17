export class Queue {
    private items: string[] = [];

    public enqueue(item: string): void {
        this.items.push(item);
    }

    public dequeue(): string | undefined{
        return this.items.shift();
    }

    public isEmpty(): boolean {
        return this.items.length === 0;
    }

    public length(): number {
        return this.items.length;
    }

    public getItems(): string[] {
        return this.items;
    }

    public getItem(item: string): number {
        return this.items.indexOf(item)
    }

    public peek(): string | undefined {
        return this.items[0]
    }

    // public peek(): string | undefined {
    //     if (this.items.length === 0) {
    //         return undefined
    //     } else {
    //         return this.items[0]
    //     }
    // }
}
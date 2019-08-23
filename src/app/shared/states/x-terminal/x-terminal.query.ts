import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { XTerminalState, XTerminalStore } from './x-terminal.store';

@Injectable({ providedIn: 'root' })
export class XTerminalQuery extends Query<XTerminalState> {

    constructor(protected store: XTerminalStore) {
        super(store);
    }

}

import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { FileChangesState, FileChangesStore } from './file-changes.store';

@Injectable({ providedIn: 'root' })
export class FileChangesQuery extends QueryEntity<FileChangesState> {

    constructor(protected store: FileChangesStore) {
        super(store);
    }

}

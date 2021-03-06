import { Injectable } from '@angular/core';
import { ActiveState, EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { RepositoryBranchSummary } from './repository-branch.model';

export interface RepositoryBranchesState extends EntityState<RepositoryBranchSummary, string>, ActiveState {
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'branches', resettable: true })
export class RepositoryBranchesStore extends EntityStore<RepositoryBranchesState, RepositoryBranchSummary> {

  constructor() {
    super();
  }

}


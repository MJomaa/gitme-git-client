import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';

export interface RepositoriesMenuState {
  is_available: boolean;
  is_repository_open: boolean;
  is_repository_clone_open: boolean;
  is_repository_addLocal_open: boolean;
  is_branch_open: boolean;
  commit_view: 'history' | 'changes';
}

export function createInitialState(): RepositoriesMenuState {
  return {
    is_available: true,
    is_repository_open: false,
    is_repository_clone_open: false,
    is_repository_addLocal_open: false,
    is_branch_open: false,
    commit_view: 'changes'
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'repositories-menu', resettable: true })
export class RepositoriesMenuStore extends Store<RepositoriesMenuState> {

  constructor() {
    super(createInitialState());
  }

}


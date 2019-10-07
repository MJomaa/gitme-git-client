import { RepositoryBranchSummary } from '../repository-branches';

export interface Repository {
    id: string;
    name: string;
    directory: string;
    credential?: RepositoryCredential;
    branches?: RepositoryBranchSummary[];

    options?: CommitOptions[];
    tags?: CommitTags[];

    timestamp?: number;

    [key: string]: any;
}

export interface RepositoryRemotes {
    id: string;
    name: string;
    fetch: string;
    push?: string;
}

export interface RepositoryCredential {
    id_credential: string;
    name?: string;
}

export interface CommitOptions {
    branch?: string;
    argument?: string;
    value?: string;
}

export interface CommitTags {
    name: string;
    tracking: string;
}
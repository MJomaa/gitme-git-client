export interface Repository {
    id: string;
    id_remote?: string;
    name?: string;
    name_local?: string;
    directory?: string;
    credential?: RepositoryCredential;
    remote?: RepositoryRemotes[];

    [key: string]: any;
}

export interface RepositoryRemotes {
    id: string;
    fetch: string;
    push?: string;
}

export interface RepositoryCredential {
    id_credential: string;
    name?: string;
}

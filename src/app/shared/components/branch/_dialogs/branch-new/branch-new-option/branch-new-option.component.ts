import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { YesNoDialogModel } from '../../../../../model/yesNoDialog.model';
import { Repository } from '../../../../../state/DATA/repositories';
import { FileStatusSummaryView, RepositoryStatusService } from '../../../../../state/DATA/repository-status';
import { RepositoryBranchesService, RepositoryBranchSummary } from '../../../../../state/DATA/repository-branches';
import { shouldNotExistInArray } from '../../../../../validate/customFormValidate';
import { SecurityService } from '../../../../../../services/system/security.service';

@Component({
    selector: 'gitme-branch-new-option',
    templateUrl: './branch-new-option.component.html',
    styleUrls: ['./branch-new-option.component.scss']
})
export class BranchNewOptionComponent implements OnInit {

    repository: Repository;
    branch: RepositoryBranchSummary;
    currentChanges: FileStatusSummaryView[];

    formBuilder: FormGroup;
    branches: string[] = [];

    constructor(
        public dialogRef: MatDialogRef<BranchNewOptionComponent>,
        private repositoryStatusService: RepositoryStatusService,
        private repositoryBranchService: RepositoryBranchesService,
        private securityService: SecurityService,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public emittedDataFromView: YesNoDialogModel
    ) {
        this.repository = emittedDataFromView.data['repository'];
        this.branch = emittedDataFromView.data['branch'];
        this.branches = this.repositoryBranchService.get().map(each => {
            const value = each.name;
            if (value.indexOf('origin/') === 0) {
                const indexFirstSlash = value.indexOf('/');
                return value.slice(indexFirstSlash + 1);
            }
            return value;
        });
        repositoryStatusService.select().subscribe(
            statusChanges => this.currentChanges = statusChanges.files
        );
    }

    get branchName() {
        return this.formBuilder.get('branchName');
    }

    get fromBranch() {
        return this.formBuilder.get('fromBranch');
    }

    ngOnInit() {
        this.formBuilder = this.fb.group({
            branchName: ['', [
                Validators.required,
                Validators.minLength(1),
                shouldNotExistInArray(this.branches, 'existing branches')
            ]],
            fromBranch: [1, [Validators.required]]
        });
    }

    cancel() {
        this.dialogRef.close(null);
    }

    checkoutFrom() {
        this.dialogRef.close({
            name: this.branchName.value,
            fromBranch: <boolean>this.fromBranch.value ? this.branch.name : null
        });
    }

    isCurrentBranchIn(whatBranch: string, arrayBranch: string[]) {
        return arrayBranch.some(branch => branch === whatBranch);
    }

    /**
     * 0 = Already on default
     * 1 = Has all
     * 2 = Has local only
     * @param defaultBranch
     * @param baseBranch
     * @param arrayAll
     */
    getSelectBaseBranchStatus(defaultBranch: string, baseBranch: string, arrayAll: string[]) {
        if (this.isCurrentBranchIn(defaultBranch, arrayAll)) {
            if (defaultBranch === baseBranch) {
                return 0;
            } else {
                return 1;
            }
        } else {
            return 2;
        }
    }
}

import { Injectable } from '@angular/core';

import 'clipboard';

import * as prism from 'prismjs';


import { Diff2Html } from 'diff2html';

import { utilNode } from '../../shared/types/types.electron';
import { DiffBlockLines, GitDiff, GitDiffBlocks } from '../../shared/model/GitDiff';
import { Grammar } from '../../shared/types/grammar.define';

@Injectable({
    providedIn: 'root'
})
export class CodeHighlightService {

    private readonly prismJS: typeof prism;

    private readonly util: typeof utilNode;

    constructor() {
        this.prismJS = prism;
        this.util = utilNode;
    }

    async getHighlighted(st: string, langType: string = 'typescript') {
        const prismLangConfig = await Grammar(langType);
        return this.prismJS.highlight(st, prismLangConfig.grammar, prismLangConfig.lang);
    }

    async getDiffHTML(diffString: string) {
        const diffJSON: GitDiff = Diff2Html.getJsonFromDiff(diffString, {
            inputFormat: 'diff',
            showFiles: true,
            matching: 'lines'
        })[0];

        const lines: DiffBlockLines[] = await this.retrieveHighlightContent(diffJSON.blocks[0].lines, diffJSON.language);

        const block: GitDiffBlocks = {
            header: diffJSON.blocks[0].header,
            lines: lines,
            newStartLine: diffJSON.blocks[0].newStartLine,
            oldStartLine: diffJSON.blocks[0].oldStartLine
        };

        const returnGitDiff: GitDiff = Object.assign({}, diffJSON, { blocks: [block] });
        return returnGitDiff;
    }

    async retrieveHighlightContent(arrLines: DiffBlockLines[], lang: string) {
        let contentParsing = '';
        let smallestSpace = -1;
        arrLines.forEach((line, index) => {
            let content = line.content;

            if (content.indexOf('+') === 0 || content.indexOf('-') === 0) {
                // Remove prefix status
                content = ' ' + content.slice(1);
            }
            const firstNonSpaceChar = content.search(/\S/);
            if (index < 2) {
                console.log(firstNonSpaceChar);
            }
            if (smallestSpace === -1) {
                smallestSpace = firstNonSpaceChar;
            }
            if (firstNonSpaceChar > -1) {
                if (smallestSpace > firstNonSpaceChar) {
                    smallestSpace = firstNonSpaceChar;
                }
            }
            contentParsing += content + '\n';
        });
        // remove last \n
        contentParsing = contentParsing.slice(0, contentParsing.length - 1);

        const strTest = await this.getHighlighted(contentParsing, lang);
        const arrSplit = strTest.split('\n').map(
            row => row.slice(smallestSpace)
        );

        const lines: DiffBlockLines[] = [];

        arrSplit.forEach((rowHighlighted, index) => {
            lines.push({
                content: rowHighlighted,
                newNumber: arrLines[index].newNumber,
                oldNumber: arrLines[index].oldNumber,
                type: arrLines[index].type,
            });
        });

        return lines;
    }
}
